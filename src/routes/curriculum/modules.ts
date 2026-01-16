import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ModuleService } from '../../services/curriculum/module.service';
import { authenticate } from '../../middleware/auth';

// Validation schemas
const moduleQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  status: z.enum(['draft', 'published', 'archived']).optional().default('published'),
  search: z.string().optional(),
  course_id: z.string().uuid().optional(),
  tags: z.string().transform((val) => val.split(',')).optional(),
  sort_by: z.enum(['name', 'display_order', 'created_at', 'updated_at']).optional().default('display_order'),
  sort_order: z.enum(['asc', 'desc']).optional().default('asc'),
});

const moduleLessonsQuerySchema = z.object({
  include_lessons: z.coerce.boolean().optional().default(false),
});

// Singleton service
const moduleService = new ModuleService();

export async function moduleRoutes(server: FastifyInstance): Promise<void> {
  /**
   * GET /modules
   * List modules with pagination and filters
   */
  server.get('/modules', async (request: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) => {
    try {
      const queryParams = moduleQuerySchema.parse(request.query);

      const result = await moduleService.listModules({
        limit: queryParams.limit,
        offset: queryParams.offset,
        status: queryParams.status,
        search: queryParams.search,
        course_id: queryParams.course_id,
        tags: queryParams.tags,
        sort_by: queryParams.sort_by,
        sort_order: queryParams.sort_order,
      });

      return {
        modules: result.data,
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
      request.log.error({ error }, 'Error listing modules');
      throw error;
    }
  });

  /**
   * GET /modules/:id
   * Get module by ID (with optional lessons)
   * Query param: include_lessons (boolean)
   */
  server.get('/modules/:id', async (
    request: FastifyRequest<{ Params: { id: string }; Querystring: any }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const queryParams = moduleLessonsQuerySchema.parse(request.query);

      // Get userId if authenticated (optional)
      const userId = request.user?.userId;

      if (queryParams.include_lessons) {
        const module = await moduleService.getModuleWithLessons(id, userId);

        if (!module) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Module not found',
          });
        }

        return { module };
      } else {
        let module: any = await moduleService.getModuleById(id);

        if (!module) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Module not found',
          });
        }

        // Remove lessons field if it exists (should not be included when include_lessons=false)
        const filteredModule = Object.keys(module).reduce((acc: any, key) => {
          if (key !== 'lessons') {
            acc[key] = module[key];
          }
          return acc;
        }, {});

        return { module: filteredModule };
      }
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }
      request.log.error({ error, moduleId: request.params.id }, 'Error getting module');
      throw error;
    }
  });

  /**
   * GET /courses/:courseId/modules
   * List modules within a course (nested route, always ordered by display_order)
   */
  server.get('/courses/:courseId/modules', async (
    request: FastifyRequest<{ Params: { courseId: string }; Querystring: any }>,
    reply: FastifyReply
  ) => {
    try {
      const { courseId } = request.params;
      const queryParams = moduleQuerySchema.parse(request.query);

      const result = await moduleService.listModulesByCourse(courseId, {
        limit: queryParams.limit,
        offset: queryParams.offset,
        status: queryParams.status,
        search: queryParams.search,
        tags: queryParams.tags,
      });

      return {
        modules: result.data,
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
      request.log.error({ error, courseId: request.params.courseId }, 'Error listing modules by course');
      throw error;
    }
  });

  /**
   * GET /modules/:id/unlock
   * Check if module is unlocked for the authenticated user
   * Requires authentication
   */
  server.get('/modules/:id/unlock', {
    preHandler: [authenticate],
  }, async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;
    const { userId } = request.user!;

    // First check if module exists
    const module = await moduleService.getModuleById(id);
    if (!module) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Module not found',
      });
    }

    const result = await moduleService.checkPrerequisites(id, userId);

    return result;
  });
}
