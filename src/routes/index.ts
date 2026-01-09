import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health';
import { authRoutes } from './auth';
import { communityTrustRoutes } from './community-trust';
import { notificationRoutes } from './notifications';

export async function registerRoutes(server: FastifyInstance): Promise<void> {
  // Health check routes
  await server.register(healthRoutes, { prefix: '/health' });

  // Authentication routes
  await server.register(authRoutes, { prefix: '/api/v1/auth' });

  // Community trust routes
  await server.register(communityTrustRoutes, { prefix: '/api/v1' });

  // Notification routes
  await server.register(notificationRoutes, { prefix: '/api/v1' });

  server.log.info('Routes registered successfully');
}
