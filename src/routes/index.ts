import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health';
import { authRoutes } from './auth';

export async function registerRoutes(server: FastifyInstance): Promise<void> {
  // Health check routes
  await server.register(healthRoutes, { prefix: '/health' });

  // Authentication routes
  await server.register(authRoutes, { prefix: '/api/v1/auth' });

  server.log.info('Routes registered successfully');
}
