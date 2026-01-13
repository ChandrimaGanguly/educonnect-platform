// @ts-nocheck
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import {
  ContentReviewService,
  ContentType,
  ReviewerType,
  ReviewType,
  ReviewDecision,
  AppealType,
  CommentType,
  CommentSeverity,
} from '../services/content-review.service';

// Validation Schemas
const createReviewerSchema = z.object({
  reviewer_type: z.enum([
    'peer_reviewer',
    'subject_expert',
    'pedagogy_reviewer',
    'accessibility_reviewer',
    'editorial_reviewer',
    'senior_reviewer',
  ] as const),
  community_id: z.string().uuid().optional(),
  expertise_domains: z.array(z.string().uuid()).optional(),
  expertise_subjects: z.array(z.string().uuid()).optional(),
  expertise_tags: z.array(z.string().max(50)).optional(),
  max_active_reviews: z.number().int().min(1).max(20).optional(),
});

const createSubmissionSchema = z.object({
  content_type: z.enum([
    'domain',
    'subject',
    'course',
    'module',
    'lesson',
    'resource',
  ] as const),
  content_id: z.string().uuid(),
  community_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  content_snapshot: z.any().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  submission_notes: z.string().max(5000).optional(),
  required_approvals: z.number().int().min(1).max(10).optional(),
});

const assignReviewSchema = z.object({
  reviewer_id: z.string().uuid(),
  review_type: z.enum([
    'peer_review',
    'technical_accuracy',
    'pedagogical_quality',
    'accessibility_review',
    'editorial_review',
    'final_approval',
    'appeal_review',
  ] as const),
  due_date: z.string().datetime().optional(),
});

const submitReviewSchema = z.object({
  decision: z.enum([
    'approve',
    'approve_with_changes',
    'request_changes',
    'reject',
    'escalate',
  ] as const),
  feedback: z.string().max(10000).optional(),
  detailed_feedback: z.any().optional(),
  checklist_responses: z.any().optional(),
  quality_score: z.number().min(0).max(1).optional(),
  issue_categories: z.array(z.string().max(50)).optional(),
  issues: z.any().optional(),
  time_spent_minutes: z.number().int().min(0).optional(),
});

const addCommentSchema = z.object({
  location_type: z.string().max(50).optional(),
  location_ref: z.string().max(255).optional(),
  line_start: z.number().int().optional(),
  line_end: z.number().int().optional(),
  comment: z.string().min(1).max(5000),
  comment_type: z
    .enum([
      'suggestion',
      'issue',
      'question',
      'praise',
      'required_change',
      'optional_improvement',
    ] as const)
    .optional(),
  severity: z.enum(['info', 'minor', 'major', 'critical'] as const).optional(),
  parent_comment_id: z.string().uuid().optional(),
});

const resolveCommentSchema = z.object({
  resolution_note: z.string().max(2000).optional(),
});

const createAppealSchema = z.object({
  original_review_id: z.string().uuid().optional(),
  appeal_reason: z.string().min(1).max(5000),
  supporting_evidence: z.any().optional(),
  appeal_type: z.enum([
    'factual_error',
    'policy_misapplication',
    'bias_concern',
    'new_information',
    'procedural_issue',
    'other',
  ] as const),
});

const decideAppealSchema = z.object({
  decision: z.enum([
    'upheld',
    'overturned',
    'partially_overturned',
    'remanded',
  ] as const),
  rationale: z.string().min(1).max(5000),
});

const listSubmissionsQuerySchema = z.object({
  community_id: z.string().uuid().optional(),
  submitted_by: z.string().uuid().optional(),
  status: z
    .enum([
      'draft',
      'submitted',
      'in_review',
      'changes_requested',
      'resubmitted',
      'approved',
      'rejected',
      'withdrawn',
    ])
    .optional(),
  current_stage: z
    .enum([
      'peer_review',
      'technical_accuracy',
      'pedagogical_quality',
      'accessibility_check',
      'plagiarism_check',
      'editorial_review',
      'final_approval',
    ])
    .optional(),
  content_type: z
    .enum(['domain', 'subject', 'course', 'module', 'lesson', 'resource'])
    .optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  order_by: z
    .enum(['created_at', 'updated_at', 'priority', 'due_date'])
    .optional(),
  order_direction: z.enum(['asc', 'desc']).optional(),
});

const listReviewersQuerySchema = z.object({
  community_id: z.string().uuid().optional(),
  reviewer_type: z
    .enum([
      'peer_reviewer',
      'subject_expert',
      'pedagogy_reviewer',
      'accessibility_reviewer',
      'editorial_reviewer',
      'senior_reviewer',
    ])
    .optional(),
  status: z.enum(['pending', 'active', 'inactive', 'suspended']).optional(),
  available_only: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
  expertise_domain: z.string().uuid().optional(),
  expertise_subject: z.string().uuid().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional(),
});

const listReviewsQuerySchema = z.object({
  submission_id: z.string().uuid().optional(),
  reviewer_id: z.string().uuid().optional(),
  review_type: z
    .enum([
      'peer_review',
      'technical_accuracy',
      'pedagogical_quality',
      'accessibility_review',
      'editorial_review',
      'final_approval',
      'appeal_review',
    ])
    .optional(),
  status: z
    .enum(['assigned', 'in_progress', 'completed', 'declined', 'reassigned', 'expired'])
    .optional(),
  decision: z
    .enum(['approve', 'approve_with_changes', 'request_changes', 'reject', 'escalate'])
    .optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional(),
});

const reviewPlagiarismSchema = z.object({
  decision: z.enum(['cleared', 'violation', 'partial_violation'] as const),
  notes: z.string().max(2000).optional(),
});

// Service instance
const contentReviewService = new ContentReviewService();

// Type augmentation for Fastify request
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      userId: string;
      email: string;
      sessionId: string;
    };
  }
}

export async function contentReviewRoutes(server: FastifyInstance): Promise<void> {
  // ============ Reviewer Endpoints ============

  /**
   * POST /reviewers
   * Create a new content reviewer application
   */
  server.post(
    '/reviewers',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const data = createReviewerSchema.parse(request.body);
        const userId = request.user!.userId;

        const reviewer = await contentReviewService.createReviewer({
          user_id: userId,
          ...data,
        });

        return reply.status(201).send({
          message: 'Reviewer application submitted successfully',
          reviewer,
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
    }
  );

  /**
   * GET /reviewers
   * List reviewers with filters
   */
  server.get(
    '/reviewers',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = listReviewersQuerySchema.parse(request.query);
        const result = await contentReviewService.listReviewers(query);

        return {
          reviewers: result.reviewers,
          total: result.total,
          limit: query.limit || 50,
          offset: query.offset || 0,
        };
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.status(400).send({
            error: 'Validation Error',
            message: error.errors[0].message,
          });
        }
        throw error;
      }
    }
  );

  /**
   * GET /reviewers/:id
   * Get reviewer by ID
   */
  server.get(
    '/reviewers/:id',
    { preHandler: [authenticate] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const reviewer = await contentReviewService.getReviewerById(request.params.id);

      if (!reviewer) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Reviewer not found',
        });
      }

      return { reviewer };
    }
  );

  /**
   * POST /reviewers/:id/activate
   * Activate a reviewer (admin only)
   */
  server.post(
    '/reviewers/:id/activate',
    { preHandler: [authenticate] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const reviewer = await contentReviewService.activateReviewer(
        request.params.id,
        request.user!.userId
      );

      return {
        message: 'Reviewer activated successfully',
        reviewer,
      };
    }
  );

  /**
   * GET /reviewers/:id/stats
   * Get reviewer performance statistics
   */
  server.get(
    '/reviewers/:id/stats',
    { preHandler: [authenticate] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const stats = await contentReviewService.getReviewerStats(request.params.id);
        return { stats };
      } catch (error: any) {
        if (error.message === 'Reviewer not found') {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Reviewer not found',
          });
        }
        throw error;
      }
    }
  );

  // ============ Submission Endpoints ============

  /**
   * POST /submissions
   * Create a new content submission for review
   */
  server.post(
    '/submissions',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const data = createSubmissionSchema.parse(request.body);
        const userId = request.user!.userId;

        const submission = await contentReviewService.createSubmission({
          ...data,
          submitted_by: userId,
        });

        return reply.status(201).send({
          message: 'Submission created successfully',
          submission,
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
    }
  );

  /**
   * GET /submissions
   * List submissions with filters
   */
  server.get(
    '/submissions',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = listSubmissionsQuerySchema.parse(request.query);
        const result = await contentReviewService.listSubmissions(query);

        return {
          submissions: result.submissions,
          total: result.total,
          limit: query.limit || 20,
          offset: query.offset || 0,
        };
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.status(400).send({
            error: 'Validation Error',
            message: error.errors[0].message,
          });
        }
        throw error;
      }
    }
  );

  /**
   * GET /submissions/:id
   * Get submission by ID
   */
  server.get(
    '/submissions/:id',
    { preHandler: [authenticate] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const submission = await contentReviewService.getSubmissionById(request.params.id);

      if (!submission) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Submission not found',
        });
      }

      return { submission };
    }
  );

  /**
   * POST /submissions/:id/submit
   * Submit content for review
   */
  server.post(
    '/submissions/:id/submit',
    { preHandler: [authenticate] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const submission = await contentReviewService.submitForReview(
          request.params.id,
          request.user!.userId
        );

        return {
          message: 'Content submitted for review',
          submission,
        };
      } catch (error: any) {
        if (error.message === 'Submission not found') {
          return reply.status(404).send({
            error: 'Not Found',
            message: error.message,
          });
        }
        if (
          error.message === 'Only the author can submit content for review' ||
          error.message === 'Submission is not in a submittable state'
        ) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: error.message,
          });
        }
        throw error;
      }
    }
  );

  /**
   * POST /submissions/:id/withdraw
   * Withdraw a submission
   */
  server.post(
    '/submissions/:id/withdraw',
    { preHandler: [authenticate] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const submission = await contentReviewService.withdrawSubmission(
          request.params.id,
          request.user!.userId
        );

        return {
          message: 'Submission withdrawn successfully',
          submission,
        };
      } catch (error: any) {
        if (error.message === 'Submission not found') {
          return reply.status(404).send({
            error: 'Not Found',
            message: error.message,
          });
        }
        if (
          error.message.includes('Only the author') ||
          error.message.includes('Cannot withdraw')
        ) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: error.message,
          });
        }
        throw error;
      }
    }
  );

  /**
   * GET /submissions/:id/history
   * Get workflow history for a submission
   */
  server.get(
    '/submissions/:id/history',
    { preHandler: [authenticate] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const submission = await contentReviewService.getSubmissionById(request.params.id);

      if (!submission) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Submission not found',
        });
      }

      const history = await contentReviewService.getWorkflowHistory(request.params.id);

      return { history };
    }
  );

  /**
   * GET /submissions/:id/available-reviewers
   * Find available reviewers for a submission
   */
  server.get(
    '/submissions/:id/available-reviewers',
    { preHandler: [authenticate] },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Querystring: { review_type: ReviewType };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const reviewType = request.query.review_type || 'peer_review';
        const reviewers = await contentReviewService.findAvailableReviewers(
          request.params.id,
          reviewType
        );

        return { reviewers };
      } catch (error: any) {
        if (error.message === 'Submission not found') {
          return reply.status(404).send({
            error: 'Not Found',
            message: error.message,
          });
        }
        throw error;
      }
    }
  );

  /**
   * POST /submissions/:id/run-checks
   * Run automated checks (plagiarism and accessibility)
   */
  server.post(
    '/submissions/:id/run-checks',
    { preHandler: [authenticate] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const results = await contentReviewService.runAutomatedChecks(request.params.id);

        return {
          message: 'Automated checks completed',
          plagiarism: results.plagiarism,
          accessibility: results.accessibility,
        };
      } catch (error: any) {
        if (error.message === 'Submission not found') {
          return reply.status(404).send({
            error: 'Not Found',
            message: error.message,
          });
        }
        throw error;
      }
    }
  );

  /**
   * GET /submissions/:id/plagiarism-check
   * Get plagiarism check results
   */
  server.get(
    '/submissions/:id/plagiarism-check',
    { preHandler: [authenticate] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const check = await contentReviewService.getPlagiarismCheck(request.params.id);

      if (!check) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Plagiarism check not found',
        });
      }

      return { check };
    }
  );

  /**
   * POST /submissions/:id/plagiarism-check/review
   * Review plagiarism check results
   */
  server.post(
    '/submissions/:id/plagiarism-check/review',
    { preHandler: [authenticate] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const data = reviewPlagiarismSchema.parse(request.body);
        const existingCheck = await contentReviewService.getPlagiarismCheck(
          request.params.id
        );

        if (!existingCheck) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Plagiarism check not found',
          });
        }

        const check = await contentReviewService.reviewPlagiarismCheck(
          existingCheck.id,
          request.user!.userId,
          data.decision,
          data.notes
        );

        return {
          message: 'Plagiarism check reviewed',
          check,
        };
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.status(400).send({
            error: 'Validation Error',
            message: error.errors[0].message,
          });
        }
        throw error;
      }
    }
  );

  /**
   * GET /submissions/:id/accessibility-check
   * Get accessibility check results
   */
  server.get(
    '/submissions/:id/accessibility-check',
    { preHandler: [authenticate] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const check = await contentReviewService.getAccessibilityCheck(request.params.id);

      if (!check) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Accessibility check not found',
        });
      }

      return { check };
    }
  );

  /**
   * GET /communities/:id/submission-stats
   * Get submission statistics for a community
   */
  server.get(
    '/communities/:id/submission-stats',
    { preHandler: [authenticate] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const stats = await contentReviewService.getSubmissionStats(request.params.id);
      return { stats };
    }
  );

  // ============ Review Endpoints ============

  /**
   * POST /submissions/:id/reviews
   * Assign a review to a submission
   */
  server.post(
    '/submissions/:id/reviews',
    { preHandler: [authenticate] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const data = assignReviewSchema.parse(request.body);

        const review = await contentReviewService.assignReview({
          submission_id: request.params.id,
          reviewer_id: data.reviewer_id,
          assigned_by: request.user!.userId,
          review_type: data.review_type,
          due_date: data.due_date ? new Date(data.due_date) : undefined,
        });

        return reply.status(201).send({
          message: 'Review assigned successfully',
          review,
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.status(400).send({
            error: 'Validation Error',
            message: error.errors[0].message,
            details: error.errors,
          });
        }
        if (
          error.message.includes('not found') ||
          error.message.includes('not active') ||
          error.message.includes('maximum active reviews') ||
          error.message.includes('cannot review their own') ||
          error.message.includes('already has an active review')
        ) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: error.message,
          });
        }
        throw error;
      }
    }
  );

  /**
   * GET /reviews
   * List reviews with filters
   */
  server.get(
    '/reviews',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = listReviewsQuerySchema.parse(request.query);
        const result = await contentReviewService.listReviews(query);

        return {
          reviews: result.reviews,
          total: result.total,
          limit: query.limit || 20,
          offset: query.offset || 0,
        };
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.status(400).send({
            error: 'Validation Error',
            message: error.errors[0].message,
          });
        }
        throw error;
      }
    }
  );

  /**
   * GET /reviews/:id
   * Get review by ID
   */
  server.get(
    '/reviews/:id',
    { preHandler: [authenticate] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const review = await contentReviewService.getReviewById(request.params.id);

      if (!review) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Review not found',
        });
      }

      return { review };
    }
  );

  /**
   * POST /reviews/:id/start
   * Start working on a review
   */
  server.post(
    '/reviews/:id/start',
    { preHandler: [authenticate] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const review = await contentReviewService.startReview(
          request.params.id,
          request.user!.userId
        );

        return {
          message: 'Review started',
          review,
        };
      } catch (error: any) {
        if (error.message === 'Review not found') {
          return reply.status(404).send({
            error: 'Not Found',
            message: error.message,
          });
        }
        if (
          error.message.includes('Not authorized') ||
          error.message.includes('not in assigned status')
        ) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: error.message,
          });
        }
        throw error;
      }
    }
  );

  /**
   * POST /reviews/:id/submit
   * Submit a completed review
   */
  server.post(
    '/reviews/:id/submit',
    { preHandler: [authenticate] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const data = submitReviewSchema.parse(request.body);

        const review = await contentReviewService.submitReview(
          request.params.id,
          request.user!.userId,
          data
        );

        return {
          message: 'Review submitted successfully',
          review,
        };
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.status(400).send({
            error: 'Validation Error',
            message: error.errors[0].message,
            details: error.errors,
          });
        }
        if (error.message === 'Review not found') {
          return reply.status(404).send({
            error: 'Not Found',
            message: error.message,
          });
        }
        if (
          error.message.includes('Not authorized') ||
          error.message.includes('cannot be submitted')
        ) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: error.message,
          });
        }
        throw error;
      }
    }
  );

  /**
   * POST /reviews/:id/decline
   * Decline a review assignment
   */
  server.post(
    '/reviews/:id/decline',
    { preHandler: [authenticate] },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { reason?: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const reason = (request.body as { reason?: string })?.reason;

        const review = await contentReviewService.declineReview(
          request.params.id,
          request.user!.userId,
          reason
        );

        return {
          message: 'Review declined',
          review,
        };
      } catch (error: any) {
        if (error.message === 'Review not found') {
          return reply.status(404).send({
            error: 'Not Found',
            message: error.message,
          });
        }
        if (
          error.message.includes('Not authorized') ||
          error.message.includes('Only assigned reviews')
        ) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: error.message,
          });
        }
        throw error;
      }
    }
  );

  // ============ Comment Endpoints ============

  /**
   * POST /reviews/:id/comments
   * Add a comment to a review
   */
  server.post(
    '/reviews/:id/comments',
    { preHandler: [authenticate] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const data = addCommentSchema.parse(request.body);

        const comment = await contentReviewService.addComment({
          review_id: request.params.id,
          ...data,
        });

        return reply.status(201).send({
          message: 'Comment added',
          comment,
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.status(400).send({
            error: 'Validation Error',
            message: error.errors[0].message,
            details: error.errors,
          });
        }
        if (error.message === 'Review not found') {
          return reply.status(404).send({
            error: 'Not Found',
            message: error.message,
          });
        }
        throw error;
      }
    }
  );

  /**
   * GET /reviews/:id/comments
   * Get comments for a review
   */
  server.get(
    '/reviews/:id/comments',
    { preHandler: [authenticate] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const review = await contentReviewService.getReviewById(request.params.id);

      if (!review) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Review not found',
        });
      }

      const comments = await contentReviewService.getReviewComments(request.params.id);

      return { comments };
    }
  );

  /**
   * POST /comments/:id/resolve
   * Resolve a review comment
   */
  server.post(
    '/comments/:id/resolve',
    { preHandler: [authenticate] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const data = resolveCommentSchema.parse(request.body);

        const comment = await contentReviewService.resolveComment(
          request.params.id,
          request.user!.userId,
          data.resolution_note
        );

        return {
          message: 'Comment resolved',
          comment,
        };
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.status(400).send({
            error: 'Validation Error',
            message: error.errors[0].message,
          });
        }
        throw error;
      }
    }
  );

  // ============ Appeal Endpoints ============

  /**
   * POST /submissions/:id/appeals
   * Create an appeal for a submission
   */
  server.post(
    '/submissions/:id/appeals',
    { preHandler: [authenticate] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const data = createAppealSchema.parse(request.body);

        const appeal = await contentReviewService.createAppeal({
          submission_id: request.params.id,
          appealed_by: request.user!.userId,
          ...data,
        });

        return reply.status(201).send({
          message: 'Appeal submitted successfully',
          appeal,
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.status(400).send({
            error: 'Validation Error',
            message: error.errors[0].message,
            details: error.errors,
          });
        }
        if (error.message === 'Submission not found') {
          return reply.status(404).send({
            error: 'Not Found',
            message: error.message,
          });
        }
        if (
          error.message.includes('Only the content author') ||
          error.message.includes('Can only appeal')
        ) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: error.message,
          });
        }
        throw error;
      }
    }
  );

  /**
   * GET /submissions/:id/appeals
   * Get appeals for a submission
   */
  server.get(
    '/submissions/:id/appeals',
    { preHandler: [authenticate] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const submission = await contentReviewService.getSubmissionById(request.params.id);

      if (!submission) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Submission not found',
        });
      }

      const appeals = await contentReviewService.getSubmissionAppeals(request.params.id);

      return { appeals };
    }
  );

  /**
   * GET /appeals/:id
   * Get appeal by ID
   */
  server.get(
    '/appeals/:id',
    { preHandler: [authenticate] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const appeal = await contentReviewService.getAppealById(request.params.id);

      if (!appeal) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Appeal not found',
        });
      }

      return { appeal };
    }
  );

  /**
   * POST /appeals/:id/decide
   * Decide on an appeal
   */
  server.post(
    '/appeals/:id/decide',
    { preHandler: [authenticate] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const data = decideAppealSchema.parse(request.body);

        const appeal = await contentReviewService.decideAppeal(
          request.params.id,
          request.user!.userId,
          data.decision,
          data.rationale
        );

        return {
          message: 'Appeal decided',
          appeal,
        };
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.status(400).send({
            error: 'Validation Error',
            message: error.errors[0].message,
            details: error.errors,
          });
        }
        if (error.message === 'Appeal not found') {
          return reply.status(404).send({
            error: 'Not Found',
            message: error.message,
          });
        }
        if (error.message.includes('already been decided')) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: error.message,
          });
        }
        throw error;
      }
    }
  );

  server.log.info('Content review routes registered');
}

export default contentReviewRoutes;
