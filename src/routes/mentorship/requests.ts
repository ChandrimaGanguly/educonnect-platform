import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { MentorshipRequestService } from '../../services/mentorship/mentorship-request.service';
import { MentorshipRelationshipService } from '../../services/mentorship/mentorship-relationship.service';
import { authenticate } from '../../middleware/auth';
import {
  createMentorshipRequestSchema,
  respondToRequestSchema,
  requestQuerySchema,
} from '../../utils/validation';

const requestService = new MentorshipRequestService();
const relationshipService = new MentorshipRelationshipService();

export async function mentorshipRequestRoutes(server: FastifyInstance): Promise<void> {

  /**
   * POST /api/v1/mentorship/requests
   * Create a mentorship request (learner role)
   */
  server.post('/requests', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;
      const parsed = createMentorshipRequestSchema.parse(request.body);

      if (!parsed.mentor_id) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'mentor_id is required',
        });
      }

      // TODO: Call matching service to calculate compatibility score
      // For now, create request without score
      const mentorshipRequest = await requestService.createRequest(userId, {
        mentor_id: parsed.mentor_id,
        subject_id: parsed.subject_id,
        message: parsed.message,
        urgency: parsed.urgency,
        community_id: parsed.community_id,
      });

      return reply.status(201).send({
        message: 'Mentorship request created successfully',
        request: mentorshipRequest,
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
        error.message === 'Mentor has reached maximum mentee capacity' ||
        error.message === 'You already have a pending request to this mentor'
      ) {
        return reply.status(409).send({
          error: 'Conflict',
          message: error.message,
        });
      }
      throw error;
    }
  });

  /**
   * GET /api/v1/mentorship/requests/outgoing
   * Get authenticated user's sent requests (as learner)
   */
  server.get('/requests/outgoing', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;
      const query = requestQuerySchema.parse(request.query);

      const result = await requestService.getRequestsByLearner(userId, query);
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
   * GET /api/v1/mentorship/requests/incoming
   * Get authenticated user's received requests (as mentor)
   */
  server.get('/requests/incoming', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;
      const query = requestQuerySchema.parse(request.query);

      const result = await requestService.getRequestsByMentor(userId, query);
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
   * GET /api/v1/mentorship/requests/:id
   * Get single request by ID (if user is participant)
   */
  server.get('/requests/:id', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    const { userId } = request.user!;
    const { id } = request.params;

    // Check if user is participant
    const isParticipant = await requestService.isRequestParticipant(id, userId);
    if (!isParticipant) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'You are not part of this request',
      });
    }

    const mentorshipRequest = await requestService.getRequestWithDetails(id);

    if (!mentorshipRequest) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Request not found',
      });
    }

    return { request: mentorshipRequest };
  });

  /**
   * POST /api/v1/mentorship/requests/:id/respond
   * Mentor responds to a request (accept or decline)
   */
  server.post('/requests/:id/respond', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;
      const { id } = request.params;
      const parsed = respondToRequestSchema.parse(request.body);

      if (!parsed.status) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'status is required',
        });
      }

      const updatedRequest = await requestService.respondToRequest(id, userId, {
        status: parsed.status,
        response_message: parsed.response_message,
      });

      // If accepted, create mentorship relationship
      if (parsed.status === 'accepted') {
        await relationshipService.createRelationship(
          updatedRequest.id,
          updatedRequest.learner_id,
          updatedRequest.mentor_id,
          updatedRequest.subject_id ?? undefined,
          updatedRequest.community_id ?? undefined
        );
      }

      return {
        message: `Request ${parsed.status} successfully`,
        request: updatedRequest,
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
        error.message === 'Request not found or already responded' ||
        error.message === 'Request has expired'
      ) {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message,
        });
      }
      if (error.message === 'You have reached your maximum mentee capacity') {
        return reply.status(409).send({
          error: 'Conflict',
          message: error.message,
        });
      }
      throw error;
    }
  });

  /**
   * DELETE /api/v1/mentorship/requests/:id
   * Learner cancels their pending request
   */
  server.delete('/requests/:id', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;
      const { id } = request.params;

      const cancelledRequest = await requestService.cancelRequest(id, userId);

      return {
        message: 'Request cancelled successfully',
        request: cancelledRequest,
      };
    } catch (error: any) {
      if (error.message === 'Request not found or already processed') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message,
        });
      }
      throw error;
    }
  });

  /**
   * GET /api/v1/mentorship/requests/incoming/count
   * Get count of pending requests for mentor (for notifications)
   */
  server.get('/requests/incoming/count', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user!;

    const count = await requestService.getPendingRequestCount(userId);

    return { count };
  });
}
