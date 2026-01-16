import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health';
import { authRoutes } from './auth';
import { roleRoutes } from './roles';
import { profileRoutes } from './profile';
import { profileSetupRoutes } from './profile-setup';
import { communityRoutes } from './community';
import { communityTrustRoutes } from './community-trust';
import { notificationRoutes } from './notifications';
import { accessibilityRoutes } from './accessibility';
import { contentReviewRoutes } from './content-review';
import { contentAuthoringRoutes } from './content-authoring';
import { contentRoutes } from './content';
import { checkpointScoringRoutes } from './checkpoint-scoring';
import { textModeRoutes } from './text-mode';
import { domainRoutes } from './curriculum/domains';
import { subjectRoutes } from './curriculum/subjects';
import { courseRoutes } from './curriculum/courses';
import { moduleRoutes } from './curriculum/modules';
import { lessonRoutes } from './curriculum/lessons';

export async function registerRoutes(server: FastifyInstance): Promise<void> {
  // Health check routes
  await server.register(healthRoutes, { prefix: '/health' });

  // Authentication routes
  await server.register(authRoutes, { prefix: '/api/v1/auth' });

  // Role and permission routes
  await server.register(roleRoutes, { prefix: '/api/v1' });

  // User profile routes (Phase 1 Group B)
  await server.register(profileRoutes, { prefix: '/api/v1' });

  // Profile setup wizard routes (Phase 1 Group B)
  await server.register(profileSetupRoutes, { prefix: '/api/v1/profile-setup' });

  // Community routes (Phase 1 Group B)
  await server.register(communityRoutes, { prefix: '/api/v1' });

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

  // Curriculum routes (Phase 1 Group D)
  await server.register(domainRoutes, { prefix: '/api/v1/curriculum' });
  await server.register(subjectRoutes, { prefix: '/api/v1/curriculum' });
  await server.register(courseRoutes, { prefix: '/api/v1/curriculum' });
  await server.register(moduleRoutes, { prefix: '/api/v1/curriculum' });
  await server.register(lessonRoutes, { prefix: '/api/v1/curriculum' });

  server.log.info('Routes registered successfully');
}
