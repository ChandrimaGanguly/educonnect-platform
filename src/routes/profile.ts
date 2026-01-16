import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from '../services/user.service';
import { UserProfileService } from '../services/user-profile.service';
import { authenticate } from '../middleware/auth';
import {
  profileUpdateSchema,
  skillSchema,
  skillUpdateSchema,
  interestSchema,
  interestUpdateSchema,
  educationSchema,
  educationUpdateSchema,
  availabilitySchema,
  availabilityUpdateSchema,
} from '../utils/validation';

// Singleton services
const userService = new UserService();
const profileService = new UserProfileService();

export async function profileRoutes(server: FastifyInstance): Promise<void> {

  // ========== Profile Management ==========

  /**
   * GET /users/me/profile
   * Get current user's complete profile
   */
  server.get('/users/me/profile', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user!;

    const user = await userService.findById(userId);

    if (!user) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    const profileData = await profileService.getCompleteProfile(userId);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.full_name,
        bio: user.bio,
        avatarUrl: user.avatar_url,
        locale: user.locale,
        timezone: user.timezone,
        phoneNumber: user.phone_number,
        emailVerified: user.email_verified,
        trustScore: parseFloat(user.trust_score.toString()),
        reputationPoints: user.reputation_points,
        createdAt: user.created_at,
      },
      ...profileData,
    };
  });

  /**
   * PATCH /users/me/profile
   * Update basic profile information
   */
  server.patch('/users/me/profile', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;
      const data = profileUpdateSchema.parse(request.body);

      const updatedUser = await userService.updateUser(userId, data);

      return {
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          username: updatedUser.username,
          fullName: updatedUser.full_name,
          bio: updatedUser.bio,
          avatarUrl: updatedUser.avatar_url,
          locale: updatedUser.locale,
          timezone: updatedUser.timezone,
          phoneNumber: updatedUser.phone_number,
        },
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

  // ========== Skills Management ==========

  /**
   * GET /users/me/skills
   * Get user's skills with optional category filter
   */
  server.get('/users/me/skills', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Querystring: { category?: string } }>, reply: FastifyReply) => {
    const { userId } = request.user!;
    const { category } = request.query;

    let skills;
    if (category) {
      skills = await profileService.getUserSkillsByCategory(userId, category);
    } else {
      skills = await profileService.getUserSkills(userId);
    }

    return { skills };
  });

  /**
   * POST /users/me/skills
   * Add a new skill to user profile
   */
  server.post('/users/me/skills', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;
      const data = skillSchema.parse(request.body);

      const skill = await profileService.addSkill(userId, {
        skill_name: data.skill_name,
        category: data.category,
        proficiency_level: data.proficiency_level,
        notes: data.notes,
      });

      return reply.status(201).send({
        message: 'Skill added successfully',
        skill,
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
   * PATCH /users/me/skills/:skillId
   * Update an existing skill
   * SECURITY: Uses atomic ownership verification to prevent IDOR
   */
  server.patch('/users/me/skills/:skillId', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { skillId: string } }>, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;
      const { skillId } = request.params;
      const data = skillUpdateSchema.parse(request.body);

      // SECURITY FIX: Atomic ownership check and update in single query
      const updatedSkill = await profileService.updateSkill(skillId, userId, {
        skill_name: data.skill_name,
        category: data.category,
        proficiency_level: data.proficiency_level,
        notes: data.notes,
      });

      if (!updatedSkill) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Resource not found',
        });
      }

      return {
        message: 'Skill updated successfully',
        skill: updatedSkill,
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
   * DELETE /users/me/skills/:skillId
   * Remove a skill from user profile
   * SECURITY: Uses atomic ownership verification to prevent IDOR
   */
  server.delete('/users/me/skills/:skillId', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { skillId: string } }>, reply: FastifyReply) => {
    const { userId } = request.user!;
    const { skillId } = request.params;

    // SECURITY FIX: Atomic ownership check and delete in single query
    const deleted = await profileService.deleteSkill(skillId, userId);

    if (!deleted) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Resource not found',
      });
    }

    return {
      message: 'Skill deleted successfully',
    };
  });

  // ========== Interests Management ==========

  /**
   * GET /users/me/interests
   * Get user's interests with optional type filter
   */
  server.get('/users/me/interests', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Querystring: { type?: 'learning' | 'teaching' | 'both' } }>, reply: FastifyReply) => {
    const { userId } = request.user!;
    const { type } = request.query;

    let interests;
    if (type) {
      interests = await profileService.getUserInterestsByType(userId, type);
    } else {
      interests = await profileService.getUserInterests(userId);
    }

    return { interests };
  });

  /**
   * POST /users/me/interests
   * Add a new interest to user profile
   */
  server.post('/users/me/interests', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;
      const data = interestSchema.parse(request.body);

      const interest = await profileService.addInterest(userId, {
        interest_name: data.interest_name,
        category: data.category,
        interest_type: data.interest_type,
        priority: data.priority,
      });

      return reply.status(201).send({
        message: 'Interest added successfully',
        interest,
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
   * PATCH /users/me/interests/:interestId
   * Update an existing interest
   * SECURITY: Uses atomic ownership verification to prevent IDOR
   */
  server.patch('/users/me/interests/:interestId', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { interestId: string } }>, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;
      const { interestId } = request.params;
      const data = interestUpdateSchema.parse(request.body);

      // SECURITY FIX: Atomic ownership check and update in single query
      const updatedInterest = await profileService.updateInterest(interestId, userId, {
        interest_name: data.interest_name,
        category: data.category,
        interest_type: data.interest_type,
        priority: data.priority,
      });

      if (!updatedInterest) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Resource not found',
        });
      }

      return {
        message: 'Interest updated successfully',
        interest: updatedInterest,
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
   * DELETE /users/me/interests/:interestId
   * Remove an interest from user profile
   * SECURITY: Uses atomic ownership verification to prevent IDOR
   */
  server.delete('/users/me/interests/:interestId', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { interestId: string } }>, reply: FastifyReply) => {
    const { userId } = request.user!;
    const { interestId } = request.params;

    // SECURITY FIX: Atomic ownership check and delete in single query
    const deleted = await profileService.deleteInterest(interestId, userId);

    if (!deleted) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Resource not found',
      });
    }

    return {
      message: 'Interest deleted successfully',
    };
  });

  // ========== Education Management ==========

  /**
   * GET /users/me/education
   * Get user's education history
   */
  server.get('/users/me/education', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user!;

    const education = await profileService.getUserEducation(userId);

    return { education };
  });

  /**
   * POST /users/me/education
   * Add education entry to user profile
   */
  server.post('/users/me/education', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;
      const data = educationSchema.parse(request.body);

      const education = await profileService.addEducation(userId, {
        institution: data.institution,
        degree: data.degree,
        field_of_study: data.field_of_study,
        start_year: data.start_year,
        end_year: data.end_year,
        is_current: data.is_current,
        description: data.description,
      });

      return reply.status(201).send({
        message: 'Education added successfully',
        education,
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
   * PATCH /users/me/education/:educationId
   * Update an education entry
   * SECURITY: Uses atomic ownership verification to prevent IDOR
   */
  server.patch('/users/me/education/:educationId', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { educationId: string } }>, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;
      const { educationId } = request.params;
      const data = educationUpdateSchema.parse(request.body);

      // SECURITY FIX: Atomic ownership check and update in single query
      const updatedEducation = await profileService.updateEducation(educationId, userId, {
        institution: data.institution,
        degree: data.degree,
        field_of_study: data.field_of_study,
        start_year: data.start_year,
        end_year: data.end_year,
        is_current: data.is_current,
        description: data.description,
      });

      if (!updatedEducation) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Resource not found',
        });
      }

      return {
        message: 'Education updated successfully',
        education: updatedEducation,
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
   * DELETE /users/me/education/:educationId
   * Remove an education entry from user profile
   * SECURITY: Uses atomic ownership verification to prevent IDOR
   */
  server.delete('/users/me/education/:educationId', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { educationId: string } }>, reply: FastifyReply) => {
    const { userId } = request.user!;
    const { educationId } = request.params;

    // SECURITY FIX: Atomic ownership check and delete in single query
    const deleted = await profileService.deleteEducation(educationId, userId);

    if (!deleted) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Resource not found',
      });
    }

    return {
      message: 'Education deleted successfully',
    };
  });

  // ========== Availability Management ==========

  /**
   * GET /users/me/availability
   * Get user's availability schedule
   */
  server.get('/users/me/availability', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Querystring: { day?: string } }>, reply: FastifyReply) => {
    const { userId } = request.user!;
    const { day } = request.query;

    let availability;
    if (day) {
      availability = await profileService.getUserAvailabilityByDay(userId, day as any);
    } else {
      availability = await profileService.getUserAvailability(userId);
    }

    return { availability };
  });

  /**
   * POST /users/me/availability
   * Add availability slot to user profile
   */
  server.post('/users/me/availability', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;
      const data = availabilitySchema.parse(request.body);

      const availability = await profileService.addAvailability(userId, {
        day_of_week: data.day_of_week,
        start_time: data.start_time,
        end_time: data.end_time,
      });

      return reply.status(201).send({
        message: 'Availability slot added successfully',
        availability,
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
   * PATCH /users/me/availability/:availabilityId
   * Update an availability slot
   */
  server.patch('/users/me/availability/:availabilityId', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { availabilityId: string } }>, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;
      const { availabilityId } = request.params;
      const data = availabilityUpdateSchema.parse(request.body);

      // SECURITY: Atomic ownership verification and update in single query
      const updatedAvailability = await profileService.updateAvailability(availabilityId, userId, {
        day_of_week: data.day_of_week,
        start_time: data.start_time,
        end_time: data.end_time,
      });

      if (!updatedAvailability) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Availability slot not found or access denied',
        });
      }

      return {
        message: 'Availability slot updated successfully',
        availability: updatedAvailability,
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
   * DELETE /users/me/availability/:availabilityId
   * Remove an availability slot (soft delete)
   */
  server.delete('/users/me/availability/:availabilityId', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { availabilityId: string } }>, reply: FastifyReply) => {
    const { userId } = request.user!;
    const { availabilityId } = request.params;

    // SECURITY: Atomic ownership verification and delete in single query
    const deleted = await profileService.deleteAvailability(availabilityId, userId);

    if (!deleted) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Availability slot not found or access denied',
      });
    }

    return {
      message: 'Availability slot deleted successfully',
    };
  });
}
