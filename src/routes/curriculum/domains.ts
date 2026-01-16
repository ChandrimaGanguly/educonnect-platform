import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { DomainService } from '../../services/curriculum/domain.service';

// Validation schemas
const domainQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  status: z.enum(['draft', 'published', 'archived']).optional().default('published'),
  search: z.string().optional(),
  community_id: z.string().uuid().optional(),
  tags: z.string().transform((val) => val.split(',')).optional(),
  sort_by: z.enum(['name', 'display_order', 'created_at', 'updated_at']).optional().default('display_order'),
  sort_order: z.enum(['asc', 'desc']).optional().default('asc'),
});

const domainBySlugQuerySchema = z.object({
  community_id: z.string().uuid().optional(),
});

// Singleton service
const domainService = new DomainService();

export async function domainRoutes(server: FastifyInstance): Promise<void> {
  /**
   * GET /domains
   * List domains with pagination and filters
   */
  server.get('/domains', async (request: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) => {
    try {
      const queryParams = domainQuerySchema.parse(request.query);

      const result = await domainService.listDomains({
        limit: queryParams.limit,
        offset: queryParams.offset,
        status: queryParams.status,
        search: queryParams.search,
        community_id: queryParams.community_id,
        tags: queryParams.tags,
        sort_by: queryParams.sort_by,
        sort_order: queryParams.sort_order,
      });

      return {
        domains: result.data,
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
      request.log.error({ error }, 'Error listing domains');
      throw error;
    }
  });

  /**
   * GET /domains/:id
   * Get domain by ID
   */
  server.get('/domains/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;

    const domain = await domainService.getDomainById(id);

    if (!domain) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Domain not found',
      });
    }

    return { domain };
  });

  /**
   * GET /domains/by-slug/:slug
   * Get domain by slug
   * Query params: community_id (optional)
   */
  server.get('/domains/by-slug/:slug', async (
    request: FastifyRequest<{ Params: { slug: string }; Querystring: any }>,
    reply: FastifyReply
  ) => {
    try {
      const { slug } = request.params;
      const queryParams = domainBySlugQuerySchema.parse(request.query);

      const domain = await domainService.getDomainBySlug(queryParams.community_id, slug);

      if (!domain) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Domain not found',
        });
      }

      return { domain };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }
      request.log.error({ error }, 'Error getting domain by slug');
      throw error;
    }
  });
}
