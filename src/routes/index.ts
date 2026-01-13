import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health';
import { authRoutes } from './auth';
import { communityTrustRoutes } from './community-trust';
import { notificationRoutes } from './notifications';
import { accessibilityRoutes } from './accessibility';
import { contentReviewRoutes } from './content-review';
import { contentAuthoringRoutes } from './content-authoring';
import { contentRoutes } from './content';
import { checkpointScoringRoutes } from './checkpoint-scoring';
import { textModeRoutes } from './text-mode';

export async function registerRoutes(server: FastifyInstance): Promise<void> {
  // Health check routes
  await server.register(healthRoutes, { prefix: '/health' });

  // Authentication routes
  await server.register(authRoutes, { prefix: '/api/v1/auth' });

  // Community trust routes
  await server.register(communityTrustRoutes, { prefix: '/api/v1' });

  // Notification routes
  await server.register(notificationRoutes, { prefix: '/api/v1' });

  // Accessibility routes
  await server.register(accessibilityRoutes, { prefix: '/api/v1' });

  // Content review routes
  await server.register(contentReviewRoutes, { prefix: '/api/v1/content-review' });

  // Content authoring routes
  await server.register(contentAuthoringRoutes, { prefix: '/api/v1/content' });

  // Multi-format content routes
  await server.register(contentRoutes, { prefix: '/api/v1/multi-format-content' });

  // Checkpoint scoring routes
  await server.register(checkpointScoringRoutes, { prefix: '/api/v1/checkpoints' });

  // Text-first content mode routes
  await server.register(textModeRoutes, { prefix: '/api/v1' });

  server.log.info('Routes registered successfully');
}
