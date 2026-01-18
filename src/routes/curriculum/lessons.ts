import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { LessonService } from '../../services/curriculum/lesson.service';
import { ModuleService } from '../../services/curriculum/module.service';
import { authenticate } from '../../middleware/auth';

// Validation schemas
const lessonQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  status: z.enum(['draft', 'published', 'archived']).optional().default('published'),
  search: z.string().optional(),
  module_id: z.string().uuid().optional(),
  lesson_type: z.enum(['text', 'video', 'audio', 'interactive', 'mixed']).optional(),
  tags: z.string().transform((val) => val.split(',')).optional(),
  sort_by: z.enum(['name', 'display_order', 'created_at', 'updated_at', 'lesson_type']).optional().default('display_order'),
  sort_order: z.enum(['asc', 'desc']).optional().default('asc'),
});

const lessonResourcesQuerySchema = z.object({
  include_resources: z.coerce.boolean().optional().default(false),
});

const lessonCompleteSchema = z.object({
  time_spent_seconds: z.number().int().min(0).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Singleton services
const lessonService = new LessonService();
const moduleService = new ModuleService();

export async function lessonRoutes(server: FastifyInstance): Promise<void> {
  /**
   * GET /lessons
   * List lessons with pagination and filters
   */
  server.get('/lessons', async (request: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) => {
    try {
      const queryParams = lessonQuerySchema.parse(request.query);

      const result = await lessonService.listLessons({
        limit: queryParams.limit,
        offset: queryParams.offset,
        status: queryParams.status,
        search: queryParams.search,
        module_id: queryParams.module_id,
        lesson_type: queryParams.lesson_type,
        tags: queryParams.tags,
        sort_by: queryParams.sort_by,
        sort_order: queryParams.sort_order,
      });

      return {
        lessons: result.data,
        total: result.total,
        pagination: {
          limit: result.limit,
          offset: result.offset,
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
      request.log.error({ error }, 'Error listing lessons');
      throw error;
    }
  });

  /**
   * GET /lessons/:id
   * Get lesson by ID (with optional resources)
   * Query param: include_resources (boolean)
   */
  server.get('/lessons/:id', async (
    request: FastifyRequest<{ Params: { id: string }; Querystring: any }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const queryParams = lessonResourcesQuerySchema.parse(request.query);

      // Get userId if authenticated (optional)
      const userId = request.user?.userId;

      if (queryParams.include_resources) {
        const lesson = await lessonService.getLessonWithResources(id, userId);

        if (!lesson) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Lesson not found',
          });
        }

        return { lesson };
      } else {
        let lesson: any = await lessonService.getLessonById(id);

        if (!lesson) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Lesson not found',
          });
        }

        // Create a new object with only the fields we want (excluding resources)
        // This ensures resources is never included in the response when include_resources=false
        const filteredLesson = Object.keys(lesson).reduce((acc: any, key) => {
          if (key !== 'resources') {
            acc[key] = lesson[key];
          }
          return acc;
        }, {});

        request.log.debug({ hasResources: 'resources' in lesson, hasInFiltered: 'resources' in filteredLesson }, 'Lesson resource check');

        return { lesson: filteredLesson };
      }
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }
      request.log.error({ error, lessonId: request.params.id }, 'Error getting lesson');
      throw error;
    }
  });

  /**
   * GET /modules/:moduleId/lessons
   * List lessons within a module (nested route, always ordered by display_order)
   */
  server.get('/modules/:moduleId/lessons', async (
    request: FastifyRequest<{ Params: { moduleId: string }; Querystring: any }>,
    reply: FastifyReply
  ) => {
    try {
      const { moduleId } = request.params;
      const queryParams = lessonQuerySchema.parse(request.query);

      const result = await lessonService.listLessonsByModule(moduleId, {
        limit: queryParams.limit,
        offset: queryParams.offset,
        status: queryParams.status,
        search: queryParams.search,
        lesson_type: queryParams.lesson_type,
        tags: queryParams.tags,
      });

      return {
        lessons: result.data,
        total: result.total,
        pagination: {
          limit: result.limit,
          offset: result.offset,
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
      request.log.error({ error, moduleId: request.params.moduleId }, 'Error listing lessons by module');
      throw error;
    }
  });

  /**
   * POST /lessons/:id/complete
   * Mark lesson as complete for authenticated user
   * Idempotent: returns existing completion if already completed
   *
   * Authorization: Checks that lesson is published and module prerequisites are met
   */
  server.post('/lessons/:id/complete', {
    preHandler: [authenticate],
  }, async (
    request: FastifyRequest<{ Params: { id: string }; Body: any }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const { userId } = request.user!;
      const data = lessonCompleteSchema.parse(request.body);

      // Verify lesson exists and is published
      const lesson = await lessonService.getLessonById(id);
      if (!lesson) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Lesson not found',
        });
      }

      if (lesson.status !== 'published') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'This lesson is not available',
        });
      }

      // Check module prerequisites
      const module = await moduleService.getModuleById(lesson.module_id);
      if (!module) {
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Module not found for lesson',
        });
      }

      if (module.status !== 'published') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'This module is not available',
        });
      }

      // Check if module is unlocked for user
      const isUnlocked = await moduleService.isModuleUnlocked(lesson.module_id, userId);
      if (!isUnlocked) {
        const prerequisiteCheck = await moduleService.checkPrerequisites(lesson.module_id, userId);
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Prerequisites not met for this lesson',
          details: {
            missing_prerequisites: prerequisiteCheck.missing_prerequisites,
            reason: prerequisiteCheck.reason,
          },
        });
      }

      // Check if already completed
      const existing = await lessonService.getLessonCompletion(id, userId);
      if (existing) {
        return reply.status(200).send({
          message: 'Lesson already completed',
          completion: existing,
        });
      }

      // Mark as complete
      const completion = await lessonService.markLessonComplete(
        id,
        userId,
        data.time_spent_seconds,
        data.metadata
      );

      return reply.status(201).send({
        message: 'Lesson marked as complete',
        completion,
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }
      request.log.error({ error, lessonId: request.params.id, userId: request.user?.userId }, 'Error completing lesson');
      throw error;
    }
  });
}
