import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { CheckpointSessionService } from '../services/checkpoint-session.service';
import { CheckpointExecutionService } from '../services/checkpoint-execution.service';
import { SessionEventType } from '../types/checkpoint.types';

/**
 * Checkpoint Execution Routes
 *
 * Implements the API endpoints for checkpoint execution:
 * - Session management (create, start, pause, resume, break, submit)
 * - Question delivery
 * - Response submission
 * - Progress tracking
 * - Identity verification
 * - Event recording
 *
 * Phase 1 Group E: Checkpoint Execution (E3, E4, E5, E7)
 */

// ========== Validation Schemas ==========

const createSessionSchema = z.object({
  checkpoint_id: z.string().uuid('Invalid checkpoint ID'),
  device_id: z.string().optional(),
  device_type: z.enum(['mobile', 'tablet', 'desktop']).optional(),
  browser: z.string().optional(),
  os: z.string().optional(),
  offline_mode: z.boolean().optional(),
});

const submitResponseSchema = z.object({
  question_id: z.string().uuid('Invalid question ID'),
  response_data: z.record(z.any()).optional(),
  text_response: z.string().optional(),
  selected_options: z.array(z.string().uuid()).optional(),
  matching_pairs: z.record(z.string()).optional(),
  ordering: z.array(z.string()).optional(),
  file_submission_id: z.string().uuid().optional(),
  audio_response_url: z.string().url().optional(),
  flagged_for_review: z.boolean().optional(),
  time_spent_seconds: z.number().int().min(0).optional(),
  offline_timestamp: z.number().optional(),
});

const verifyIdentitySchema = z.object({
  method: z.enum(['password', 'biometric', 'photo', 'none']),
  credentials: z.record(z.any()).optional(),
});

const recordEventSchema = z.object({
  event_type: z.enum([
    'session_start',
    'session_end',
    'question_view',
    'question_answer',
    'question_skip',
    'question_flag',
    'question_unflag',
    'pause',
    'resume',
    'break_start',
    'break_end',
    'focus_lost',
    'focus_gained',
    'copy_attempt',
    'paste_attempt',
    'tab_switch',
    'window_resize',
    'submit',
    'timeout',
    'abandon',
    'integrity_flag',
    'offline_start',
    'offline_sync',
    'identity_verified',
    'accommodation_applied',
  ] as const),
  event_data: z.record(z.any()).optional(),
  question_id: z.string().uuid().optional(),
  client_timestamp: z.number().optional(),
});

// ========== Helper Functions ==========

/**
 * Verify that the authenticated user owns the specified session
 * SECURITY: Prevents IDOR attacks by checking session ownership
 * @returns session object if authorized, null if not found or unauthorized
 */
async function verifySessionOwnership(
  sessionService: CheckpointSessionService,
  sessionId: string,
  userId: string,
  reply: FastifyReply
): Promise<any | null> {
  const session = await sessionService.getSession(sessionId);

  if (!session) {
    reply.status(404).send({
      error: 'Not Found',
      message: 'Session not found',
    });
    return null;
  }

  if (session.user_id !== userId) {
    reply.status(403).send({
      error: 'Forbidden',
      message: 'You do not have access to this session',
    });
    return null;
  }

  return session;
}

// ========== Routes ==========

export async function checkpointExecutionRoutes(server: FastifyInstance): Promise<void> {
  // Create service instances per route registration to avoid stale database connections
  // Services are lightweight and stateless, so this is safe and prevents connection issues
  const getSessionService = () => new CheckpointSessionService();
  const getExecutionService = () => new CheckpointExecutionService();
  // ========== Session Management ==========

  /**
   * POST /api/v1/checkpoints/:checkpointId/sessions
   * Create and initialize a new checkpoint session
   */
  server.post('/checkpoints/:checkpointId/sessions', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { checkpointId: string };
    Body: unknown;
  }>, reply: FastifyReply) => {
    try {
      const data = createSessionSchema.parse(request.body);
      const session = await getSessionService().createSession(
        request.user!.userId,
        request.params.checkpointId,
        {
          checkpoint_id: data.checkpoint_id,
          device_id: data.device_id,
          device_type: data.device_type,
          browser: data.browser,
          os: data.os,
          offline_mode: data.offline_mode,
        }
      );

      return reply.status(201).send({ session });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }
      if (error.message.includes('not found') || error.message.includes('not active')) {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message,
        });
      }
      if (error.message.includes('Maximum attempts') || error.message.includes('Cooldown')) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: error.message,
        });
      }
      throw error;
    }
  });

  /**
   * POST /api/v1/checkpoint-sessions/:sessionId/start
   * Start a checkpoint session
   * SECURITY: Verifies session ownership before allowing start
   */
  server.post('/checkpoint-sessions/:sessionId/start', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { sessionId: string };
  }>, reply: FastifyReply) => {
    try {
      const sessionService = getSessionService();

      // SECURITY: Verify session ownership before allowing state change
      const verifiedSession = await verifySessionOwnership(
        sessionService,
        request.params.sessionId,
        request.user!.userId,
        reply
      );
      if (!verifiedSession) return undefined;

      const session = await sessionService.startSession(request.params.sessionId);
      return { session };
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message,
        });
      }
      if (error.message.includes('can only be started')) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: error.message,
        });
      }
      throw error;
    }
  });

  /**
   * GET /api/v1/checkpoint-sessions/:sessionId
   * Get session details
   */
  server.get('/checkpoint-sessions/:sessionId', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { sessionId: string };
  }>, reply: FastifyReply) => {
    const session = await getSessionService().getSession(request.params.sessionId);

    if (!session) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Session not found',
      });
    }

    // Check authorization
    if (session.user_id !== request.user!.userId) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'You do not have access to this session',
      });
    }

    return { session };
  });

  /**
   * POST /api/v1/checkpoint-sessions/:sessionId/pause
   * Pause an active session
   * SECURITY: Verifies session ownership before allowing pause
   */
  server.post('/checkpoint-sessions/:sessionId/pause', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { sessionId: string };
  }>, reply: FastifyReply) => {
    try {
      const sessionService = getSessionService();

      // SECURITY: Verify session ownership
      const verifiedSession = await verifySessionOwnership(
        sessionService,
        request.params.sessionId,
        request.user!.userId,
        reply
      );
      if (!verifiedSession) return undefined;

      const session = await sessionService.pauseSession(request.params.sessionId);
      return { session };
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return reply.status(404).send({ error: 'Not Found', message: error.message });
      }
      if (error.message.includes('not allowed') || error.message.includes('Can only pause')) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message });
      }
      throw error;
    }
  });

  /**
   * POST /api/v1/checkpoint-sessions/:sessionId/resume
   * Resume a paused session
   * SECURITY: Verifies session ownership before allowing resume
   */
  server.post('/checkpoint-sessions/:sessionId/resume', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { sessionId: string };
  }>, reply: FastifyReply) => {
    try {
      const sessionService = getSessionService();

      // SECURITY: Verify session ownership
      const verifiedSession = await verifySessionOwnership(
        sessionService,
        request.params.sessionId,
        request.user!.userId,
        reply
      );
      if (!verifiedSession) return undefined;

      const session = await sessionService.resumeSession(request.params.sessionId);
      return { session };
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return reply.status(404).send({ error: 'Not Found', message: error.message });
      }
      if (error.message.includes('Can only resume')) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message });
      }
      throw error;
    }
  });

  /**
   * POST /api/v1/checkpoint-sessions/:sessionId/break
   * Start a break
   * SECURITY: Verifies session ownership before allowing break
   */
  server.post('/checkpoint-sessions/:sessionId/break', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { sessionId: string };
  }>, reply: FastifyReply) => {
    try {
      const sessionService = getSessionService();

      // SECURITY: Verify session ownership
      const verifiedSession = await verifySessionOwnership(
        sessionService,
        request.params.sessionId,
        request.user!.userId,
        reply
      );
      if (!verifiedSession) return undefined;

      const session = await sessionService.startBreak(request.params.sessionId);
      return { session };
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return reply.status(404).send({ error: 'Not Found', message: error.message });
      }
      if (error.message.includes('not enabled')) {
        return reply.status(403).send({ error: 'Forbidden', message: error.message });
      }
      throw error;
    }
  });

  /**
   * POST /api/v1/checkpoint-sessions/:sessionId/end-break
   * End a break
   * SECURITY: Verifies session ownership before allowing end-break
   */
  server.post('/checkpoint-sessions/:sessionId/end-break', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { sessionId: string };
  }>, reply: FastifyReply) => {
    try {
      const sessionService = getSessionService();

      // SECURITY: Verify session ownership
      const verifiedSession = await verifySessionOwnership(
        sessionService,
        request.params.sessionId,
        request.user!.userId,
        reply
      );
      if (!verifiedSession) return undefined;

      const session = await sessionService.endBreak(request.params.sessionId);
      return { session };
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return reply.status(404).send({ error: 'Not Found', message: error.message });
      }
      if (error.message.includes('not on break')) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message });
      }
      throw error;
    }
  });

  /**
   * POST /api/v1/checkpoint-sessions/:sessionId/submit
   * Submit a checkpoint session for scoring
   */
  server.post('/checkpoint-sessions/:sessionId/submit', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { sessionId: string };
  }>, reply: FastifyReply) => {
    try {
      const session = await getSessionService().submitSession(
        request.params.sessionId,
        request.user!.userId
      );
      return { session };
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return reply.status(404).send({ error: 'Not Found', message: error.message });
      }
      if (error.message.includes('Unauthorized')) {
        return reply.status(403).send({ error: 'Forbidden', message: error.message });
      }
      if (error.message.includes('Can only submit')) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message });
      }
      throw error;
    }
  });

  /**
   * POST /api/v1/checkpoint-sessions/:sessionId/abandon
   * Abandon a session
   * SECURITY: Verifies session ownership before allowing abandon
   */
  server.post('/checkpoint-sessions/:sessionId/abandon', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { sessionId: string };
  }>, reply: FastifyReply) => {
    try {
      const sessionService = getSessionService();

      // SECURITY: Verify session ownership
      const verifiedSession = await verifySessionOwnership(
        sessionService,
        request.params.sessionId,
        request.user!.userId,
        reply
      );
      if (!verifiedSession) return undefined;

      const session = await sessionService.abandonSession(
        request.params.sessionId,
        'user'
      );
      return { session };
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return reply.status(404).send({ error: 'Not Found', message: error.message });
      }
      throw error;
    }
  });

  /**
   * GET /api/v1/checkpoint-sessions/:sessionId/progress
   * Get session progress
   */
  server.get('/checkpoint-sessions/:sessionId/progress', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { sessionId: string };
  }>, reply: FastifyReply) => {
    try {
      const progress = await getSessionService().getSessionProgress(request.params.sessionId);
      return { progress };
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return reply.status(404).send({ error: 'Not Found', message: error.message });
      }
      throw error;
    }
  });

  // ========== Identity Verification ==========

  /**
   * POST /api/v1/checkpoint-sessions/:sessionId/verify-identity
   * Verify user identity for a session
   */
  server.post('/checkpoint-sessions/:sessionId/verify-identity', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { sessionId: string };
    Body: unknown;
  }>, reply: FastifyReply) => {
    try {
      const data = verifyIdentitySchema.parse(request.body);
      const session = await getSessionService().verifyIdentity(
        {
          session_id: request.params.sessionId,
          method: data.method,
          credentials: data.credentials,
        },
        request.user!.userId
      );
      return { session };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }
      if (error.message.includes('not found')) {
        return reply.status(404).send({ error: 'Not Found', message: error.message });
      }
      if (error.message.includes('Unauthorized')) {
        return reply.status(403).send({ error: 'Forbidden', message: error.message });
      }
      throw error;
    }
  });

  // ========== Question Delivery ==========

  /**
   * GET /api/v1/checkpoint-sessions/:sessionId/questions
   * Get all questions for a session
   */
  server.get('/checkpoint-sessions/:sessionId/questions', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { sessionId: string };
  }>, reply: FastifyReply) => {
    try {
      const questions = await getExecutionService().getSessionQuestions(
        request.params.sessionId,
        request.user!.userId
      );
      return questions;
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return reply.status(404).send({ error: 'Not Found', message: error.message });
      }
      if (error.message.includes('Unauthorized')) {
        return reply.status(403).send({ error: 'Forbidden', message: error.message });
      }
      throw error;
    }
  });

  /**
   * GET /api/v1/checkpoint-sessions/:sessionId/questions/:questionId
   * Get a specific question
   */
  server.get('/checkpoint-sessions/:sessionId/questions/:questionId', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { sessionId: string; questionId: string };
  }>, reply: FastifyReply) => {
    try {
      const question = await getExecutionService().getQuestion(
        request.params.sessionId,
        request.params.questionId,
        request.user!.userId
      );

      if (!question) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Question not found',
        });
      }

      return { question };
    } catch (error: any) {
      if (error.message.includes('Unauthorized')) {
        return reply.status(403).send({ error: 'Forbidden', message: error.message });
      }
      throw error;
    }
  });

  /**
   * POST /api/v1/checkpoint-sessions/:sessionId/questions/:questionId/view
   * Mark a question as viewed
   */
  server.post('/checkpoint-sessions/:sessionId/questions/:questionId/view', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { sessionId: string; questionId: string };
  }>, reply: FastifyReply) => {
    try {
      await getExecutionService().markQuestionViewed(
        request.params.sessionId,
        request.params.questionId,
        request.user!.userId
      );
      return { success: true };
    } catch (error: any) {
      if (error.message.includes('Unauthorized')) {
        return reply.status(403).send({ error: 'Forbidden', message: error.message });
      }
      throw error;
    }
  });

  // ========== Response Submission ==========

  /**
   * POST /api/v1/checkpoint-sessions/:sessionId/responses
   * Submit a response for a question
   */
  server.post('/checkpoint-sessions/:sessionId/responses', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { sessionId: string };
    Body: unknown;
  }>, reply: FastifyReply) => {
    try {
      const data = submitResponseSchema.parse(request.body);
      const response = await getExecutionService().submitResponse(
        {
          session_id: request.params.sessionId,
          ...data,
        },
        request.user!.userId
      );
      return reply.status(201).send({ response });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }
      if (error.message.includes('not found')) {
        return reply.status(404).send({ error: 'Not Found', message: error.message });
      }
      if (error.message.includes('Unauthorized')) {
        return reply.status(403).send({ error: 'Forbidden', message: error.message });
      }
      if (error.message.includes('require')) {
        return reply.status(400).send({ error: 'Validation Error', message: error.message });
      }
      throw error;
    }
  });

  /**
   * POST /api/v1/checkpoint-sessions/:sessionId/questions/:questionId/flag
   * Flag a question for review
   */
  server.post('/checkpoint-sessions/:sessionId/questions/:questionId/flag', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { sessionId: string; questionId: string };
  }>, reply: FastifyReply) => {
    try {
      const response = await getExecutionService().flagQuestion(
        request.params.sessionId,
        request.params.questionId,
        request.user!.userId
      );
      return { response };
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return reply.status(404).send({ error: 'Not Found', message: error.message });
      }
      if (error.message.includes('Unauthorized')) {
        return reply.status(403).send({ error: 'Forbidden', message: error.message });
      }
      throw error;
    }
  });

  /**
   * POST /api/v1/checkpoint-sessions/:sessionId/questions/:questionId/unflag
   * Unflag a question
   */
  server.post('/checkpoint-sessions/:sessionId/questions/:questionId/unflag', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { sessionId: string; questionId: string };
  }>, reply: FastifyReply) => {
    try {
      const response = await getExecutionService().unflagQuestion(
        request.params.sessionId,
        request.params.questionId,
        request.user!.userId
      );
      return { response };
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return reply.status(404).send({ error: 'Not Found', message: error.message });
      }
      if (error.message.includes('Unauthorized')) {
        return reply.status(403).send({ error: 'Forbidden', message: error.message });
      }
      throw error;
    }
  });

  /**
   * POST /api/v1/checkpoint-sessions/:sessionId/questions/:questionId/skip
   * Skip a question
   */
  server.post('/checkpoint-sessions/:sessionId/questions/:questionId/skip', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { sessionId: string; questionId: string };
  }>, reply: FastifyReply) => {
    try {
      const response = await getExecutionService().skipQuestion(
        request.params.sessionId,
        request.params.questionId,
        request.user!.userId
      );
      return { response };
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return reply.status(404).send({ error: 'Not Found', message: error.message });
      }
      if (error.message.includes('Unauthorized')) {
        return reply.status(403).send({ error: 'Forbidden', message: error.message });
      }
      if (error.message.includes('Cannot skip')) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message });
      }
      throw error;
    }
  });

  /**
   * GET /api/v1/checkpoint-sessions/:sessionId/completeness
   * Check if all required questions are answered
   */
  server.get('/checkpoint-sessions/:sessionId/completeness', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { sessionId: string };
  }>, reply: FastifyReply) => {
    try {
      const completeness = await getExecutionService().checkCompleteness(
        request.params.sessionId
      );
      return { completeness };
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return reply.status(404).send({ error: 'Not Found', message: error.message });
      }
      throw error;
    }
  });

  // ========== Event Recording ==========

  /**
   * POST /api/v1/checkpoint-sessions/:sessionId/events
   * Record a session event
   */
  server.post('/checkpoint-sessions/:sessionId/events', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { sessionId: string };
    Body: unknown;
  }>, reply: FastifyReply) => {
    try {
      const data = recordEventSchema.parse(request.body);
      const event = await getSessionService().recordEvent({
        session_id: request.params.sessionId,
        event_type: data.event_type as SessionEventType,
        event_data: data.event_data,
        question_id: data.question_id,
        client_timestamp: data.client_timestamp,
      });
      return reply.status(201).send({ event });
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

  // ========== User Sessions List ==========

  /**
   * GET /api/v1/users/me/checkpoint-sessions
   * Get current user's checkpoint sessions
   */
  server.get('/users/me/checkpoint-sessions', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Querystring: {
      checkpoint_id?: string;
      status?: string;
      limit?: string;
      offset?: string;
    };
  }>, reply: FastifyReply) => {
    const { checkpoint_id, status, limit, offset } = request.query;

    const result = await getSessionService().getUserSessions(
      request.user!.userId,
      checkpoint_id,
      {
        status: status as any,
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0,
      }
    );

    return result;
  });

  server.log.info('Checkpoint execution routes registered');
}
