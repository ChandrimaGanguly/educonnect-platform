import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { AutomatedScoringService } from '../services/automated-scoring.service';

/**
 * Checkpoint Scoring Routes
 *
 * Implements the API endpoints for automated checkpoint scoring:
 * - Score checkpoint sessions
 * - Get scoring results
 * - Get session feedback
 * - Configure scoring settings
 *
 * Performance requirement: Automated scoring SHALL complete within 3 seconds
 */

// ========== Validation Schemas ==========

const scoreSessionSchema = z.object({
  session_id: z.string().uuid(),
  scoring_config: z.object({
    passing_threshold: z.number().min(0).max(100).optional(),
    merit_threshold: z.number().min(0).max(100).optional(),
    distinction_threshold: z.number().min(0).max(100).optional(),
    allow_partial_credit: z.boolean().optional(),
    min_partial_credit: z.number().min(0).max(1).optional(),
    show_correct_answers: z.boolean().optional(),
    show_explanations: z.boolean().optional(),
    feedback_timing: z.enum(['immediate', 'after_submission', 'after_review', 'never']).optional(),
  }).optional(),
});

const createScoringConfigSchema = z.object({
  community_id: z.string().uuid(),
  lesson_id: z.string().uuid().optional(),
  draft_id: z.string().uuid().optional(),
  passing_threshold: z.number().min(0).max(100).optional(),
  merit_threshold: z.number().min(0).max(100).optional(),
  distinction_threshold: z.number().min(0).max(100).optional(),
  allow_partial_credit: z.boolean().optional(),
  min_partial_credit: z.number().min(0).max(1).optional(),
  partial_credit_rules: z.record(z.any()).optional(),
  time_bonus_enabled: z.boolean().optional(),
  time_bonus_percentage: z.number().min(0).max(100).optional(),
  time_bonus_threshold_seconds: z.number().int().positive().optional(),
  max_attempts: z.number().int().positive().optional(),
  retry_cooldown_hours: z.number().int().min(0).optional(),
  retry_score_penalty: z.number().min(0).max(100).optional(),
  shuffle_questions: z.boolean().optional(),
  shuffle_options: z.boolean().optional(),
  show_correct_answers: z.boolean().optional(),
  show_explanations: z.boolean().optional(),
  feedback_timing: z.enum(['immediate', 'after_submission', 'after_review', 'never']).optional(),
  integrity_check_enabled: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

const createSessionSchema = z.object({
  user_id: z.string().uuid(),
  community_id: z.string().uuid(),
  lesson_id: z.string().uuid().optional(),
  draft_id: z.string().uuid().optional(),
  checkpoint_title: z.string().min(1).max(255),
  checkpoint_type: z.enum(['knowledge', 'practical', 'oral', 'mixed']).optional(),
  question_ids: z.array(z.string().uuid()),
  time_limit_seconds: z.number().int().positive().optional(),
  extended_time_seconds: z.number().int().positive().optional(),
  is_offline_session: z.boolean().optional(),
});

const submitResponseSchema = z.object({
  session_id: z.string().uuid(),
  question_id: z.string().uuid(),
  response: z.any(),
  response_text: z.string().optional(),
  time_spent_seconds: z.number().int().min(0).optional(),
});

// ========== Service Instance ==========

const scoringService = new AutomatedScoringService();

// ========== Routes ==========

export async function checkpointScoringRoutes(server: FastifyInstance): Promise<void> {
  // ========== Session Management ==========

  /**
   * POST /sessions
   * Create a new checkpoint session
   */
  server.post('/sessions', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = createSessionSchema.parse(request.body);
      const db = (scoringService as any).db;

      // Calculate total points from questions
      const questions = await db('assessment_questions')
        .whereIn('id', data.question_ids)
        .select('id', 'points');

      const totalPoints = questions.reduce(
        (sum: number, q: any) => sum + Number(q.points),
        0
      );

      const [session] = await db('checkpoint_sessions')
        .insert({
          user_id: data.user_id,
          community_id: data.community_id,
          lesson_id: data.lesson_id,
          draft_id: data.draft_id,
          checkpoint_title: data.checkpoint_title,
          checkpoint_type: data.checkpoint_type || 'knowledge',
          question_ids: JSON.stringify(data.question_ids),
          total_questions: data.question_ids.length,
          total_points: totalPoints,
          time_limit_seconds: data.time_limit_seconds,
          extended_time_seconds: data.extended_time_seconds,
          is_offline_session: data.is_offline_session || false,
          status: 'initialized',
        })
        .returning('*');

      return reply.status(201).send({
        session: {
          ...session,
          question_ids: data.question_ids,
        },
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }
      throw error;
    }
  });

  /**
   * POST /sessions/:sessionId/start
   * Start a checkpoint session
   */
  server.post('/sessions/:sessionId/start', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) => {
    const db = (scoringService as any).db;

    const [session] = await db('checkpoint_sessions')
      .where({ id: request.params.sessionId })
      .update({
        status: 'in_progress',
        started_at: new Date(),
      })
      .returning('*');

    if (!session) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Session not found',
      });
    }

    return { session };
  });

  /**
   * GET /sessions/:sessionId
   * Get session details
   */
  server.get('/sessions/:sessionId', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) => {
    const session = await scoringService.getSession(request.params.sessionId);

    if (!session) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Session not found',
      });
    }

    return {
      session: {
        ...session,
        question_ids: typeof session.question_ids === 'string'
          ? JSON.parse(session.question_ids)
          : session.question_ids,
      },
    };
  });

  // ========== Submission Endpoints ==========

  /**
   * POST /submissions
   * Submit a response for a question
   */
  server.post('/submissions', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = submitResponseSchema.parse(request.body);
      const db = (scoringService as any).db;

      // Check if submission already exists
      const existing = await db('checkpoint_submissions')
        .where({
          session_id: data.session_id,
          question_id: data.question_id,
        })
        .first();

      let submission;
      const now = new Date();

      if (existing) {
        // Update existing submission
        [submission] = await db('checkpoint_submissions')
          .where({ id: existing.id })
          .update({
            response: JSON.stringify(data.response),
            response_text: data.response_text,
            time_spent_seconds: data.time_spent_seconds,
            last_response_at: now,
            revision_count: existing.revision_count + 1,
          })
          .returning('*');
      } else {
        // Get display order from session
        const session = await scoringService.getSession(data.session_id);
        const questionIds = typeof session.question_ids === 'string'
          ? JSON.parse(session.question_ids)
          : session.question_ids;
        const displayOrder = questionIds.indexOf(data.question_id);

        // Get current response order
        const responseCount = await db('checkpoint_submissions')
          .where({ session_id: data.session_id })
          .count('* as count')
          .first();

        [submission] = await db('checkpoint_submissions')
          .insert({
            session_id: data.session_id,
            question_id: data.question_id,
            response: JSON.stringify(data.response),
            response_text: data.response_text,
            display_order: displayOrder >= 0 ? displayOrder : 0,
            response_order: Number(responseCount?.count || 0),
            time_spent_seconds: data.time_spent_seconds,
            first_response_at: now,
            last_response_at: now,
            scoring_status: 'pending',
          })
          .returning('*');
      }

      return reply.status(201).send({
        submission: {
          ...submission,
          response: typeof submission.response === 'string'
            ? JSON.parse(submission.response)
            : submission.response,
        },
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }
      throw error;
    }
  });

  /**
   * POST /sessions/:sessionId/submit
   * Submit the entire session for scoring
   */
  server.post('/sessions/:sessionId/submit', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) => {
    const db = (scoringService as any).db;

    // Update session status
    const [session] = await db('checkpoint_sessions')
      .where({ id: request.params.sessionId })
      .update({
        status: 'submitted',
        submitted_at: new Date(),
      })
      .returning('*');

    if (!session) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Session not found',
      });
    }

    // Calculate time spent
    if (session.started_at) {
      const timeSpent = Math.floor(
        (new Date().getTime() - new Date(session.started_at).getTime()) / 1000
      );
      await db('checkpoint_sessions')
        .where({ id: session.id })
        .update({ time_spent_seconds: timeSpent });
    }

    return { session };
  });

  // ========== Scoring Endpoints ==========

  /**
   * POST /sessions/:sessionId/score
   * Score a checkpoint session
   *
   * Performance: SHALL complete within 3 seconds
   */
  server.post('/sessions/:sessionId/score', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { sessionId: string };
    Body: { scoring_config?: Record<string, any> };
  }>, reply: FastifyReply) => {
    const startTime = Date.now();

    try {
      const { scoring_config } = request.body || {};

      const result = await scoringService.scoreCheckpointSession({
        session_id: request.params.sessionId,
        scoring_config,
      });

      // Log performance
      const duration = Date.now() - startTime;
      if (duration > 3000) {
        server.log.warn({
          msg: 'Scoring exceeded 3 second threshold',
          session_id: request.params.sessionId,
          duration_ms: duration,
        });
      }

      return {
        results: result.results,
        summary: result.summary,
        feedback: result.feedback,
        performance: {
          duration_ms: duration,
        },
      };
    } catch (error: any) {
      server.log.error({
        msg: 'Scoring failed',
        session_id: request.params.sessionId,
        error: error.message,
      });
      throw error;
    }
  });

  /**
   * POST /score
   * Score a session (alternative endpoint)
   */
  server.post('/score', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = scoreSessionSchema.parse(request.body);

      const result = await scoringService.scoreCheckpointSession({
        session_id: data.session_id,
        scoring_config: data.scoring_config,
      });

      return {
        results: result.results,
        summary: result.summary,
        feedback: result.feedback,
      };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }
      throw error;
    }
  });

  // ========== Results Endpoints ==========

  /**
   * GET /sessions/:sessionId/results
   * Get scoring results for a session
   */
  server.get('/sessions/:sessionId/results', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) => {
    const results = await scoringService.getSessionResults(request.params.sessionId);
    return { results };
  });

  /**
   * GET /sessions/:sessionId/summary
   * Get session summary
   */
  server.get('/sessions/:sessionId/summary', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) => {
    const summary = await scoringService.getSessionSummary(request.params.sessionId);

    if (!summary) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Summary not found. The session may not have been scored yet.',
      });
    }

    return { summary };
  });

  /**
   * GET /sessions/:sessionId/feedback
   * Get feedback for a session
   */
  server.get('/sessions/:sessionId/feedback', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { sessionId: string };
    Querystring: { type?: string };
  }>, reply: FastifyReply) => {
    let feedback = await scoringService.getSessionFeedback(request.params.sessionId);

    // Filter by type if specified
    if (request.query.type) {
      feedback = feedback.filter((f) => f.feedback_type === request.query.type);
    }

    return { feedback };
  });

  // ========== Configuration Endpoints ==========

  /**
   * POST /config
   * Create or update scoring configuration
   */
  server.post('/config', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = createScoringConfigSchema.parse(request.body);

      const config = await scoringService.upsertScoringConfiguration(
        request.user!.userId,
        data as any
      );

      return reply.status(201).send({ config });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }
      throw error;
    }
  });

  /**
   * GET /config
   * Get scoring configuration
   */
  server.get('/config', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Querystring: {
      community_id: string;
      lesson_id?: string;
      draft_id?: string;
    };
  }>, reply: FastifyReply) => {
    const { community_id, lesson_id, draft_id } = request.query;

    const config = await scoringService.getEffectiveScoringConfig(
      community_id,
      lesson_id,
      draft_id
    );

    return { config };
  });

  // ========== Review Endpoints ==========

  /**
   * GET /pending-review
   * Get submissions pending human review
   */
  server.get('/pending-review', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Querystring: {
      community_id?: string;
      limit?: string;
      offset?: string;
    };
  }>, reply: FastifyReply) => {
    const { community_id, limit, offset } = request.query;
    const db = (scoringService as any).db;

    let query = db('checkpoint_results')
      .join('checkpoint_sessions', 'checkpoint_results.session_id', 'checkpoint_sessions.id')
      .where('checkpoint_results.needs_human_review', true)
      .whereNull('checkpoint_results.reviewed_by');

    if (community_id) {
      query = query.where('checkpoint_sessions.community_id', community_id);
    }

    const total = await query.clone().count('checkpoint_results.id as count').first();

    const results = await query
      .select(
        'checkpoint_results.*',
        'checkpoint_sessions.user_id',
        'checkpoint_sessions.community_id',
        'checkpoint_sessions.checkpoint_title'
      )
      .orderBy('checkpoint_results.created_at', 'asc')
      .limit(limit ? parseInt(limit) : 50)
      .offset(offset ? parseInt(offset) : 0);

    return {
      results: results.map((r: any) => ({
        ...r,
        scoring_details: typeof r.scoring_details === 'string'
          ? JSON.parse(r.scoring_details)
          : r.scoring_details,
      })),
      total: Number(total?.count || 0),
    };
  });

  /**
   * POST /results/:resultId/review
   * Submit human review for a result
   */
  server.post('/results/:resultId/review', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { resultId: string };
    Body: {
      points_earned: number;
      review_notes?: string;
    };
  }>, reply: FastifyReply) => {
    const { points_earned, review_notes } = request.body;
    const db = (scoringService as any).db;

    // Get current result
    const currentResult = await db('checkpoint_results')
      .where({ id: request.params.resultId })
      .first();

    if (!currentResult) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Result not found',
      });
    }

    // Update result with review
    const [result] = await db('checkpoint_results')
      .where({ id: request.params.resultId })
      .update({
        points_earned,
        original_score: currentResult.points_earned,
        is_correct: points_earned >= currentResult.points_possible,
        is_partial_credit: points_earned > 0 && points_earned < currentResult.points_possible,
        score_percentage: currentResult.points_possible > 0
          ? Number(((points_earned / currentResult.points_possible) * 100).toFixed(2))
          : 0,
        scoring_method: 'manual',
        needs_human_review: false,
        reviewed_by: request.user!.userId,
        reviewed_at: new Date(),
        review_notes,
      })
      .returning('*');

    // Update submission status
    await db('checkpoint_submissions')
      .where({ id: currentResult.submission_id })
      .update({ scoring_status: 'reviewed' });

    // Recalculate session summary if all reviews are complete
    const pendingReviews = await db('checkpoint_results')
      .where({ session_id: currentResult.session_id })
      .where('needs_human_review', true)
      .whereNull('reviewed_by')
      .count('* as count')
      .first();

    if (Number(pendingReviews?.count || 0) === 0) {
      // All reviews complete, recalculate summary
      const allResults = await scoringService.getSessionResults(currentResult.session_id);
      const config = await scoringService.getEffectiveScoringConfig(
        currentResult.community_id,
        currentResult.lesson_id
      );
      const summary = await scoringService.calculateSessionSummary(
        currentResult.session_id,
        allResults,
        config
      );
      await scoringService.saveSessionSummary(summary);

      // Update session status
      await db('checkpoint_sessions')
        .where({ id: currentResult.session_id })
        .update({ status: 'completed', completed_at: new Date() });
    }

    return { result };
  });

  server.log.info('Checkpoint scoring routes registered');
}
