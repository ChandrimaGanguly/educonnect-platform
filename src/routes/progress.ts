import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { LearningProgressService } from '../services/curriculum/learning-progress.service';
import { authenticate } from '../middleware/auth';

/**
 * Learning Progress Routes
 *
 * API endpoints for tracking and viewing user learning progress
 *
 * Features:
 * - Module progress tracking
 * - Course progress tracking
 * - Overall progress dashboard
 * - Recent activity feed
 */

const progressService = new LearningProgressService();

export async function progressRoutes(server: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/progress/module/:moduleId
   * Get progress for a specific module
   */
  server.get('/progress/module/:moduleId', {
    preHandler: [authenticate],
    schema: {
      description: 'Get learning progress for a specific module',
      tags: ['progress'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['moduleId'],
        properties: {
          moduleId: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          description: 'Module progress',
          type: 'object',
          properties: {
            module_id: { type: 'string' },
            total_lessons: { type: 'integer' },
            completed_lessons: { type: 'integer' },
            is_unlocked: { type: 'boolean' },
            progress_percentage: { type: 'integer' },
          },
        },
        401: {
          description: 'Unauthorized',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        404: {
          description: 'Module not found',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { moduleId: string } }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.userId;

      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { moduleId } = request.params;
      const progress = await progressService.getModuleProgress(moduleId, userId);

      return reply.send(progress);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch module progress' });
    }
  });

  /**
   * GET /api/v1/progress/course/:courseId
   * Get progress for a specific course
   */
  server.get('/progress/course/:courseId', {
    preHandler: [authenticate],
    schema: {
      description: 'Get learning progress for a specific course',
      tags: ['progress'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['courseId'],
        properties: {
          courseId: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          description: 'Course progress',
          type: 'object',
          properties: {
            course_id: { type: 'string' },
            total_modules: { type: 'integer' },
            completed_modules: { type: 'integer' },
            total_lessons: { type: 'integer' },
            completed_lessons: { type: 'integer' },
            progress_percentage: { type: 'integer' },
          },
        },
        401: {
          description: 'Unauthorized',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        404: {
          description: 'Course not found',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { courseId: string } }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.userId;

      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { courseId } = request.params;
      const progress = await progressService.getCourseProgress(courseId, userId);

      return reply.send(progress);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch course progress' });
    }
  });

  /**
   * GET /api/v1/progress/courses
   * Get progress for all courses the user has started
   */
  server.get('/progress/courses', {
    preHandler: [authenticate],
    schema: {
      description: 'Get learning progress for all courses user is working on',
      tags: ['progress'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'List of course progress',
          type: 'array',
          items: {
            type: 'object',
            properties: {
              course_id: { type: 'string' },
              total_modules: { type: 'integer' },
              completed_modules: { type: 'integer' },
              total_lessons: { type: 'integer' },
              completed_lessons: { type: 'integer' },
              progress_percentage: { type: 'integer' },
            },
          },
        },
        401: {
          description: 'Unauthorized',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.userId;

      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const progressList = await progressService.getUserCourseProgressList(userId);

      return reply.send(progressList);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch course progress list' });
    }
  });

  /**
   * GET /api/v1/progress/dashboard
   * Get comprehensive learning progress dashboard
   */
  server.get('/progress/dashboard', {
    preHandler: [authenticate],
    schema: {
      description: 'Get comprehensive learning progress dashboard for the user',
      tags: ['progress'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          recentActivityLimit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
        },
      },
      response: {
        200: {
          description: 'Learning progress dashboard',
          type: 'object',
          properties: {
            summary: {
              type: 'object',
              properties: {
                total_courses_in_progress: { type: 'integer' },
                total_lessons_completed: { type: 'integer' },
                total_learning_time_seconds: { type: 'integer' },
                total_learning_time_formatted: { type: 'string' },
              },
            },
            courses: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  course_id: { type: 'string' },
                  total_modules: { type: 'integer' },
                  completed_modules: { type: 'integer' },
                  total_lessons: { type: 'integer' },
                  completed_lessons: { type: 'integer' },
                  progress_percentage: { type: 'integer' },
                },
              },
            },
            recent_activity: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  completed_at: { type: 'string' },
                  time_spent_seconds: { type: 'integer' },
                  lesson_id: { type: 'string' },
                  lesson_name: { type: 'string' },
                  module_id: { type: 'string' },
                  module_name: { type: 'string' },
                  course_id: { type: 'string' },
                  course_name: { type: 'string' },
                },
              },
            },
          },
        },
        401: {
          description: 'Unauthorized',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: { recentActivityLimit?: number } }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.userId;

      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const recentActivityLimit = request.query.recentActivityLimit || 10;

      // Fetch all dashboard data in parallel for better performance
      const [courseProgressList, recentActivity, totalLearningTime] = await Promise.all([
        progressService.getUserCourseProgressList(userId),
        progressService.getRecentActivity(userId, recentActivityLimit),
        progressService.getTotalLearningTime(userId),
      ]);

      // Calculate total lessons completed across all courses
      const totalLessonsCompleted = courseProgressList.reduce(
        (sum, course) => sum + course.completed_lessons,
        0
      );

      // Format learning time as hours:minutes:seconds
      const hours = Math.floor(totalLearningTime / 3600);
      const minutes = Math.floor((totalLearningTime % 3600) / 60);
      const seconds = totalLearningTime % 60;
      const formattedTime = `${hours}h ${minutes}m ${seconds}s`;

      const dashboard = {
        summary: {
          total_courses_in_progress: courseProgressList.length,
          total_lessons_completed: totalLessonsCompleted,
          total_learning_time_seconds: totalLearningTime,
          total_learning_time_formatted: formattedTime,
        },
        courses: courseProgressList,
        recent_activity: recentActivity,
      };

      return reply.send(dashboard);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch progress dashboard' });
    }
  });

  /**
   * GET /api/v1/progress/activity
   * Get recent learning activity
   */
  server.get('/progress/activity', {
    preHandler: [authenticate],
    schema: {
      description: 'Get recent learning activity for the user',
      tags: ['progress'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
        },
      },
      response: {
        200: {
          description: 'Recent learning activity',
          type: 'array',
          items: {
            type: 'object',
            properties: {
              completed_at: { type: 'string' },
              time_spent_seconds: { type: 'integer' },
              lesson_id: { type: 'string' },
              lesson_name: { type: 'string' },
              module_id: { type: 'string' },
              module_name: { type: 'string' },
              course_id: { type: 'string' },
              course_name: { type: 'string' },
            },
          },
        },
        401: {
          description: 'Unauthorized',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: { limit?: number } }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.userId;

      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const limit = request.query.limit || 10;
      const activity = await progressService.getRecentActivity(userId, limit);

      return reply.send(activity);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch recent activity' });
    }
  });

  /**
   * GET /api/v1/progress/stats
   * Get overall learning statistics
   */
  server.get('/progress/stats', {
    preHandler: [authenticate],
    schema: {
      description: 'Get overall learning statistics for the user',
      tags: ['progress'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'Learning statistics',
          type: 'object',
          properties: {
            total_courses_in_progress: { type: 'integer' },
            total_lessons_completed: { type: 'integer' },
            total_learning_time_seconds: { type: 'integer' },
            total_learning_time_formatted: { type: 'string' },
            average_time_per_lesson_seconds: { type: 'number' },
          },
        },
        401: {
          description: 'Unauthorized',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.userId;

      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const [courseProgressList, totalLearningTime] = await Promise.all([
        progressService.getUserCourseProgressList(userId),
        progressService.getTotalLearningTime(userId),
      ]);

      const totalLessonsCompleted = courseProgressList.reduce(
        (sum, course) => sum + course.completed_lessons,
        0
      );

      const averageTimePerLesson = totalLessonsCompleted > 0
        ? totalLearningTime / totalLessonsCompleted
        : 0;

      // Format learning time as hours:minutes:seconds
      const hours = Math.floor(totalLearningTime / 3600);
      const minutes = Math.floor((totalLearningTime % 3600) / 60);
      const seconds = totalLearningTime % 60;
      const formattedTime = `${hours}h ${minutes}m ${seconds}s`;

      const stats = {
        total_courses_in_progress: courseProgressList.length,
        total_lessons_completed: totalLessonsCompleted,
        total_learning_time_seconds: totalLearningTime,
        total_learning_time_formatted: formattedTime,
        average_time_per_lesson_seconds: Math.round(averageTimePerLesson),
      };

      return reply.send(stats);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch learning statistics' });
    }
  });
}
