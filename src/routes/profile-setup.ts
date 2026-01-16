import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from '../services/user.service';
import { UserProfileService } from '../services/user-profile.service';
import { authenticate } from '../middleware/auth';
import {
  basicProfileSchema,
  bulkSkillsSchema,
  bulkInterestsSchema,
  bulkAvailabilitySchema,
} from '../utils/validation';

// Singleton services
const userService = new UserService();
const profileService = new UserProfileService();

export async function profileSetupRoutes(server: FastifyInstance): Promise<void> {

  /**
   * GET /profile-setup/status
   * Check profile setup completion status
   */
  server.get('/profile-setup/status', {
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

    // Check if profile setup is marked as completed
    const metadata = user.metadata as any || {};
    const profileSetupCompleted = metadata.profile_setup_completed || false;

    // Check individual steps
    const [skills, interests, availability] = await Promise.all([
      profileService.getUserSkills(userId),
      profileService.getUserInterests(userId),
      profileService.getUserAvailability(userId),
    ]);

    const hasBasicInfo = !!(user.full_name && user.bio && user.timezone);
    const hasSkills = skills.length > 0;
    const hasInterests = interests.length > 0;
    const hasAvailability = availability.length > 0;

    return {
      completed: profileSetupCompleted,
      steps: {
        basic: hasBasicInfo,
        skills: hasSkills,
        interests: hasInterests,
        availability: hasAvailability,
      },
    };
  });

  /**
   * POST /profile-setup/basic
   * Step 1: Complete basic profile information
   */
  server.post('/profile-setup/basic', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;
      const data = basicProfileSchema.parse(request.body);

      const updatedUser = await userService.updateUser(userId, data);

      return {
        message: 'Basic profile information saved',
        user: {
          id: updatedUser.id,
          fullName: updatedUser.full_name,
          bio: updatedUser.bio,
          timezone: updatedUser.timezone,
          locale: updatedUser.locale,
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

  /**
   * POST /profile-setup/skills
   * Step 2: Add skills with self-assessment
   */
  server.post('/profile-setup/skills', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;
      const data = bulkSkillsSchema.parse(request.body);

      // Add all skills
      const skillPromises = data.skills.map(skill =>
        profileService.addSkill(userId, {
          skill_name: skill.skill_name,
          category: skill.category,
          proficiency_level: skill.proficiency_level,
          notes: skill.notes,
        })
      );

      const skills = await Promise.all(skillPromises);

      return {
        message: `${skills.length} skill(s) added successfully`,
        skills,
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
   * POST /profile-setup/interests
   * Step 3: Add learning interests
   */
  server.post('/profile-setup/interests', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;
      const data = bulkInterestsSchema.parse(request.body);

      // Add all interests
      const interestPromises = data.interests.map(interest =>
        profileService.addInterest(userId, {
          interest_name: interest.interest_name,
          category: interest.category,
          interest_type: interest.interest_type,
          priority: interest.priority,
        })
      );

      const interests = await Promise.all(interestPromises);

      return {
        message: `${interests.length} interest(s) added successfully`,
        interests,
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
   * POST /profile-setup/availability
   * Step 4: Add availability schedule
   */
  server.post('/profile-setup/availability', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;
      const data = bulkAvailabilitySchema.parse(request.body);

      // Add all availability slots
      const availabilityPromises = data.availability.map(slot =>
        profileService.addAvailability(userId, {
          day_of_week: slot.day_of_week,
          start_time: slot.start_time,
          end_time: slot.end_time,
        })
      );

      const availability = await Promise.all(availabilityPromises);

      return {
        message: `${availability.length} availability slot(s) added successfully`,
        availability,
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
   * POST /profile-setup/complete
   * Mark profile setup as completed
   */
  server.post('/profile-setup/complete', {
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

    // Update user metadata to mark setup as complete
    const metadata = (user.metadata as any) || {};
    const updatedMetadata = {
      ...metadata,
      profile_setup_completed: true,
      profile_setup_completed_at: new Date().toISOString(),
    };

    await userService.updateUser(userId, {
      metadata: updatedMetadata as any,
    });

    return {
      message: 'Profile setup completed successfully',
    };
  });
}
