import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { healthCheck as dbHealthCheck } from '../database';

export async function healthRoutes(server: FastifyInstance): Promise<void> {
  // Basic health check
  server.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  // Detailed health check
  server.get('/detailed', async (request: FastifyRequest, reply: FastifyReply) => {
    const dbHealth = await dbHealthCheck();

    let redisHealth = false;
    try {
      await server.redis.ping();
      redisHealth = true;
    } catch (error) {
      server.log.error(error, 'Redis health check failed');
    }

    const overall = dbHealth && redisHealth;

    return {
      status: overall ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: dbHealth ? 'healthy' : 'unhealthy',
        redis: redisHealth ? 'healthy' : 'unhealthy',
      },
    };
  });

  // Readiness probe (for Kubernetes)
  server.get('/ready', async (request: FastifyRequest, reply: FastifyReply) => {
    const dbHealth = await dbHealthCheck();

    if (!dbHealth) {
      return reply.code(503).send({
        status: 'not ready',
        reason: 'database connection failed',
      });
    }

    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  });

  // Liveness probe (for Kubernetes)
  server.get('/live', async (request: FastifyRequest, reply: FastifyReply) => {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  });
}
