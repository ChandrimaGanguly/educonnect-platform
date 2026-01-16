import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { LessonService } from '../../services/curriculum/lesson.service';
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

// Singleton service
const lessonService = new LessonService();

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
        const lesson = await lessonService.getLessonById(id);

        if (!lesson) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Lesson not found',
          });
        }

        return { lesson };
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

      // Verify lesson exists
      const lesson = await lessonService.getLessonById(id);
      if (!lesson) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Lesson not found',
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
