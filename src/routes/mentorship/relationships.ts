import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { MentorshipRelationshipService } from '../../services/mentorship/mentorship-relationship.service';
import { MentorshipFeedbackService } from '../../services/mentorship/mentorship-feedback.service';
import { authenticate } from '../../middleware/auth';
import {
  relationshipQuerySchema,
  updateRelationshipSchema,
  terminateRelationshipSchema,
  submitFeedbackSchema,
  recordSessionSchema,
} from '../../utils/validation';

const relationshipService = new MentorshipRelationshipService();
const feedbackService = new MentorshipFeedbackService();

export async function mentorshipRelationshipRoutes(server: FastifyInstance): Promise<void> {

  /**
   * GET /api/v1/mentorship/relationships
   * Get authenticated user's relationships (both as learner and mentor)
   */
  server.get('/relationships', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;
      const query = relationshipQuerySchema.parse(request.query);

      const result = await relationshipService.getRelationshipsByUser(userId, query);
      return result;
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
   * GET /api/v1/mentorship/relationships/:id
   * Get single relationship by ID (if user is participant)
   */
  server.get('/relationships/:id', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    const { userId } = request.user!;
    const { id } = request.params;

    // Check if user is participant
    const isParticipant = await relationshipService.isRelationshipParticipant(id, userId);
    if (!isParticipant) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'You are not part of this relationship',
      });
    }

    const relationship = await relationshipService.getRelationshipWithDetails(id);

    if (!relationship) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Relationship not found',
      });
    }

    return { relationship };
  });

  /**
   * PATCH /api/v1/mentorship/relationships/:id
   * Update relationship details (goals, next session)
   */
  server.patch('/relationships/:id', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;
      const { id } = request.params;
      const data = updateRelationshipSchema.parse(request.body);

      // Check if user is participant
      const isParticipant = await relationshipService.isRelationshipParticipant(id, userId);
      if (!isParticipant) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You are not part of this relationship',
        });
      }

      const relationship = await relationshipService.updateRelationship(id, data);

      if (!relationship) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Relationship not found',
        });
      }

      return {
        message: 'Relationship updated successfully',
        relationship,
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

  /**
   * POST /api/v1/mentorship/relationships/:id/terminate
   * Terminate a relationship
   */
  server.post('/relationships/:id/terminate', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;
      const { id } = request.params;
      const { reason } = terminateRelationshipSchema.parse(request.body);

      const relationship = await relationshipService.terminateRelationship(id, userId, reason);

      return {
        message: 'Relationship terminated successfully',
        relationship,
      };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }
      if (
        error.message === 'Active relationship not found' ||
        error.message === 'You are not part of this relationship'
      ) {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message,
        });
      }
      throw error;
    }
  });

  /**
   * POST /api/v1/mentorship/relationships/:id/sessions
   * Record a completed session
   */
  server.post('/relationships/:id/sessions', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;
      const { id } = request.params;
      const data = recordSessionSchema.parse(request.body);

      // Check if user is participant
      const isParticipant = await relationshipService.isRelationshipParticipant(id, userId);
      if (!isParticipant) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You are not part of this relationship',
        });
      }

      const relationship = await relationshipService.recordSession(id, data);

      return {
        message: 'Session recorded successfully',
        relationship,
      };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }
      if (error.message === 'Relationship not found') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message,
        });
      }
      throw error;
    }
  });

  /**
   * POST /api/v1/mentorship/relationships/:id/feedback
   * Submit feedback for a relationship
   */
  server.post('/relationships/:id/feedback', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;
      const { id } = request.params;
      const parsed = submitFeedbackSchema.parse(request.body);

      if (parsed.overall_rating === undefined) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'overall_rating is required',
        });
      }

      const feedback = await feedbackService.submitFeedback(id, userId, {
        overall_rating: parsed.overall_rating,
        communication_rating: parsed.communication_rating,
        expertise_rating: parsed.expertise_rating,
        availability_rating: parsed.availability_rating,
        feedback_text: parsed.feedback_text,
        would_recommend: parsed.would_recommend,
      });

      return reply.status(201).send({
        message: 'Feedback submitted successfully',
        feedback,
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
        error.message === 'Relationship not found' ||
        error.message === 'You are not part of this relationship'
      ) {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message,
        });
      }
      if (error.message === 'You have already submitted feedback for this relationship') {
        return reply.status(409).send({
          error: 'Conflict',
          message: error.message,
        });
      }
      if (error.message.includes('must be between 1.0 and 5.0')) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.message,
        });
      }
      throw error;
    }
  });

  /**
   * GET /api/v1/mentorship/relationships/:id/feedback
   * Get all feedback for a relationship
   */
  server.get('/relationships/:id/feedback', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    const { userId } = request.user!;
    const { id } = request.params;

    // Check if user is participant
    const isParticipant = await relationshipService.isRelationshipParticipant(id, userId);
    if (!isParticipant) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'You are not part of this relationship',
      });
    }

    const feedback = await feedbackService.getFeedbackForRelationship(id);

    return { feedback };
  });
}
