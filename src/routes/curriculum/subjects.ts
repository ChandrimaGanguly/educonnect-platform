import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { SubjectService } from '../../services/curriculum/subject.service';

// Validation schemas
const subjectQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  status: z.enum(['draft', 'published', 'archived']).optional().default('published'),
  search: z.string().optional(),
  domain_id: z.string().uuid().optional(),
  tags: z.string().transform((val) => val.split(',')).optional(),
  sort_by: z.enum(['name', 'display_order', 'created_at', 'updated_at']).optional().default('display_order'),
  sort_order: z.enum(['asc', 'desc']).optional().default('asc'),
});

// Singleton service
const subjectService = new SubjectService();

export async function subjectRoutes(server: FastifyInstance): Promise<void> {
  /**
   * GET /subjects
   * List subjects with pagination and filters
   */
  server.get('/subjects', async (request: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) => {
    try {
      const queryParams = subjectQuerySchema.parse(request.query);

      const result = await subjectService.listSubjects({
        limit: queryParams.limit,
        offset: queryParams.offset,
        status: queryParams.status,
        search: queryParams.search,
        domain_id: queryParams.domain_id,
        tags: queryParams.tags,
        sort_by: queryParams.sort_by,
        sort_order: queryParams.sort_order,
      });

      return {
        subjects: result.data,
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
      request.log.error({ error }, 'Error listing subjects');
      throw error;
    }
  });

  /**
   * GET /subjects/:id
   * Get subject by ID
   */
  server.get('/subjects/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;

    const subject = await subjectService.getSubjectById(id);

    if (!subject) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Subject not found',
      });
    }

    return { subject };
  });

  /**
   * GET /domains/:domainId/subjects
   * List subjects within a domain (nested route)
   */
  server.get('/domains/:domainId/subjects', async (
    request: FastifyRequest<{ Params: { domainId: string }; Querystring: any }>,
    reply: FastifyReply
  ) => {
    try {
      const { domainId } = request.params;
      const queryParams = subjectQuerySchema.parse(request.query);

      const result = await subjectService.listSubjectsByDomain(domainId, {
        limit: queryParams.limit,
        offset: queryParams.offset,
        status: queryParams.status,
        search: queryParams.search,
        tags: queryParams.tags,
        sort_by: queryParams.sort_by,
        sort_order: queryParams.sort_order,
      });

      return {
        subjects: result.data,
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
      request.log.error({ error, domainId: request.params.domainId }, 'Error listing subjects by domain');
      throw error;
    }
  });
}
