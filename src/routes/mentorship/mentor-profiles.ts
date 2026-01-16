import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { MentorProfileService } from '../../services/mentorship/mentor-profile.service';
import { authenticate } from '../../middleware/auth';
import {
  createMentorProfileSchema,
  updateMentorProfileSchema,
  updateMentorStatusSchema,
  mentorSearchSchema,
} from '../../utils/validation';

const mentorProfileService = new MentorProfileService();

export async function mentorProfileRoutes(server: FastifyInstance): Promise<void> {

  /**
   * POST /api/v1/mentorship/mentors
   * Create mentor profile for authenticated user
   */
  server.post('/mentors', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;
      const data = createMentorProfileSchema.parse(request.body);

      const profile = await mentorProfileService.createMentorProfile(userId, data);

      return reply.status(201).send({
        message: 'Mentor profile created successfully',
        profile,
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }
      if (error.message === 'Mentor profile already exists for this user') {
        return reply.status(409).send({
          error: 'Conflict',
          message: error.message,
        });
      }
      throw error;
    }
  });

  /**
   * GET /api/v1/mentorship/mentors/me
   * Get authenticated user's mentor profile with details
   */
  server.get('/mentors/me', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user!;

    const profile = await mentorProfileService.getMentorProfileWithDetails(userId);

    if (!profile) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Mentor profile not found',
      });
    }

    return { profile };
  });

  /**
   * PATCH /api/v1/mentorship/mentors/me
   * Update authenticated user's mentor profile
   */
  server.patch('/mentors/me', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;
      const data = updateMentorProfileSchema.parse(request.body);

      const profile = await mentorProfileService.updateMentorProfile(userId, data);

      if (!profile) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Mentor profile not found',
        });
      }

      return {
        message: 'Mentor profile updated successfully',
        profile,
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
   * PATCH /api/v1/mentorship/mentors/me/status
   * Update mentor availability status
   */
  server.patch('/mentors/me/status', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;
      const parsed = updateMentorStatusSchema.parse(request.body);

      if (!parsed.mentor_status) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'mentor_status is required',
        });
      }

      const profile = await mentorProfileService.updateMentorStatus(userId, {
        mentor_status: parsed.mentor_status,
      });

      if (!profile) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Mentor profile not found',
        });
      }

      return {
        message: 'Mentor status updated successfully',
        profile,
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
   * GET /api/v1/mentorship/mentors
   * Search for mentors with filters (public endpoint)
   */
  server.get('/mentors', {}, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = mentorSearchSchema.parse(request.query);

      const result = await mentorProfileService.searchMentors(query);

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
   * GET /api/v1/mentorship/mentors/:id
   * Get mentor profile by ID with details (public endpoint)
   */
  server.get('/mentors/:id', {}, async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    const { id } = request.params;

    // Get mentor profile by the internal profile ID
    // But we need to support looking up by user_id as well
    // For now, treat :id as user_id
    const profile = await mentorProfileService.getMentorProfileWithDetails(id);

    if (!profile) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Mentor profile not found',
      });
    }

    return { profile };
  });

  /**
   * GET /api/v1/mentorship/mentors/me/capacity
   * Check authenticated mentor's capacity
   */
  server.get('/mentors/me/capacity', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user!;

    try {
      const capacity = await mentorProfileService.checkCapacity(userId);
      return { capacity };
    } catch (error: any) {
      if (error.message === 'Mentor profile not found') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message,
        });
      }
      throw error;
    }
  });
}
