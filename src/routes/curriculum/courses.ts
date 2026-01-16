import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { CourseService } from '../../services/curriculum/course.service';

// Validation schemas
const courseQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  status: z.enum(['draft', 'published', 'archived']).optional().default('published'),
  search: z.string().optional(),
  subject_id: z.string().uuid().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
  track_type: z.enum(['practical', 'academic', 'certification', 'self_paced']).optional(),
  is_enrollable: z.coerce.boolean().optional(),
  tags: z.string().transform((val) => val.split(',')).optional(),
  sort_by: z.enum(['name', 'display_order', 'created_at', 'updated_at', 'published_at', 'difficulty_level']).optional().default('display_order'),
  sort_order: z.enum(['asc', 'desc']).optional().default('asc'),
});

const courseDetailsQuerySchema = z.object({
  include_details: z.coerce.boolean().optional().default(false),
});

// Singleton service
const courseService = new CourseService();

export async function courseRoutes(server: FastifyInstance): Promise<void> {
  /**
   * GET /courses
   * List courses with pagination and filters
   */
  server.get('/courses', async (request: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) => {
    try {
      const queryParams = courseQuerySchema.parse(request.query);

      const result = await courseService.listCourses({
        limit: queryParams.limit,
        offset: queryParams.offset,
        status: queryParams.status,
        search: queryParams.search,
        subject_id: queryParams.subject_id,
        difficulty: queryParams.difficulty,
        track_type: queryParams.track_type,
        is_enrollable: queryParams.is_enrollable,
        tags: queryParams.tags,
        sort_by: queryParams.sort_by,
        sort_order: queryParams.sort_order,
      });

      return {
        courses: result.data,
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
      request.log.error({ error }, 'Error listing courses');
      throw error;
    }
  });

  /**
   * GET /courses/:id
   * Get course by ID (with optional details)
   * Query param: include_details (boolean) - includes modules, learning_paths, standards
   */
  server.get('/courses/:id', async (
    request: FastifyRequest<{ Params: { id: string }; Querystring: any }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const queryParams = courseDetailsQuerySchema.parse(request.query);

      if (queryParams.include_details) {
        const course = await courseService.getCourseWithDetails(id);

        if (!course) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Course not found',
          });
        }

        return { course };
      } else {
        const course = await courseService.getCourseById(id);

        if (!course) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Course not found',
          });
        }

        return { course };
      }
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }
      request.log.error({ error, courseId: request.params.id }, 'Error getting course');
      throw error;
    }
  });

  /**
   * GET /subjects/:subjectId/courses
   * List courses within a subject (nested route)
   */
  server.get('/subjects/:subjectId/courses', async (
    request: FastifyRequest<{ Params: { subjectId: string }; Querystring: any }>,
    reply: FastifyReply
  ) => {
    try {
      const { subjectId } = request.params;
      const queryParams = courseQuerySchema.parse(request.query);

      const result = await courseService.listCoursesBySubject(subjectId, {
        limit: queryParams.limit,
        offset: queryParams.offset,
        status: queryParams.status,
        search: queryParams.search,
        difficulty: queryParams.difficulty,
        track_type: queryParams.track_type,
        is_enrollable: queryParams.is_enrollable,
        tags: queryParams.tags,
        sort_by: queryParams.sort_by,
        sort_order: queryParams.sort_order,
      });

      return {
        courses: result.data,
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
      request.log.error({ error, subjectId: request.params.subjectId }, 'Error listing courses by subject');
      throw error;
    }
  });
}
