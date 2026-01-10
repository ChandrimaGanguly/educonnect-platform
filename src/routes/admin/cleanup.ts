/**
 * Cleanup Admin Routes
 *
 * Admin endpoints for managing data cleanup tasks.
 * These should only be accessible to platform administrators.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { cleanupService } from '../../services/cleanup.service';
import { authenticate } from '../../middleware/auth';

export async function cleanupRoutes(server: FastifyInstance): Promise<void> {
  /**
   * GET /admin/cleanup/stats
   * Get cleanup statistics (what would be cleaned up)
   */
  server.get('/admin/cleanup/stats', {
    preHandler: [authenticate],
    schema: {
      description: 'Get statistics on data that needs cleanup',
      tags: ['admin', 'cleanup'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'Cleanup statistics',
          type: 'object',
          properties: {
            expiredSessions: { type: 'number' },
            expiredInvitations: { type: 'number' },
            expiredNotifications: { type: 'number' },
            completedSyncItems: { type: 'number' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // TODO: Verify user has admin role
      const stats = await cleanupService.getCleanupStats();
      return reply.send(stats);
    } catch (error: unknown) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to get cleanup stats' });
    }
  });

  /**
   * POST /admin/cleanup/run
   * Manually trigger cleanup tasks
   */
  server.post('/admin/cleanup/run', {
    preHandler: [authenticate],
    schema: {
      description: 'Run cleanup tasks manually',
      tags: ['admin', 'cleanup'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          tasks: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['sessions', 'invitations', 'notifications', 'sync', 'all'],
            },
          },
        },
      },
      response: {
        200: {
          description: 'Cleanup results',
          type: 'object',
          properties: {
            startedAt: { type: 'string' },
            completedAt: { type: 'string' },
            totalDeleted: { type: 'number' },
            errors: { type: 'number' },
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  entity: { type: 'string' },
                  deletedCount: { type: 'number' },
                  error: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: { tasks?: string[] } }>, reply: FastifyReply) => {
    try {
      // TODO: Verify user has admin role
      const { tasks = ['all'] } = request.body || {};

      if (tasks.includes('all')) {
        const summary = await cleanupService.runAllCleanupTasks();
        return reply.send(summary);
      }

      // Run specific tasks
      const results = [];

      if (tasks.includes('sessions')) {
        results.push(await cleanupService.cleanupExpiredSessions());
      }
      if (tasks.includes('invitations')) {
        results.push(await cleanupService.cleanupExpiredInvitations());
      }
      if (tasks.includes('notifications')) {
        results.push(await cleanupService.cleanupExpiredNotifications());
      }
      if (tasks.includes('sync')) {
        results.push(await cleanupService.cleanupCompletedSyncItems());
      }

      const totalDeleted = results.reduce((sum, r) => sum + r.deletedCount, 0);
      const errors = results.filter((r) => r.error).length;

      return reply.send({
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        totalDeleted,
        errors,
        results,
      });
    } catch (error: unknown) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to run cleanup' });
    }
  });

  /**
   * POST /admin/cleanup/sessions
   * Clean up expired sessions only
   */
  server.post('/admin/cleanup/sessions', {
    preHandler: [authenticate],
    schema: {
      description: 'Clean up expired sessions',
      tags: ['admin', 'cleanup'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          deleteOlderThanDays: { type: 'number', minimum: 1, default: 30 },
        },
      },
      response: {
        200: {
          description: 'Cleanup result',
          type: 'object',
          properties: {
            entity: { type: 'string' },
            deletedCount: { type: 'number' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: { deleteOlderThanDays?: number } }>, reply: FastifyReply) => {
    try {
      const { deleteOlderThanDays = 30 } = request.body || {};
      const result = await cleanupService.cleanupExpiredSessions(deleteOlderThanDays);
      return reply.send(result);
    } catch (error: unknown) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to clean up sessions' });
    }
  });

  /**
   * POST /admin/cleanup/invitations
   * Clean up expired invitations only
   */
  server.post('/admin/cleanup/invitations', {
    preHandler: [authenticate],
    schema: {
      description: 'Clean up expired community invitations',
      tags: ['admin', 'cleanup'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          deleteOlderThanDays: { type: 'number', minimum: 1, default: 30 },
        },
      },
      response: {
        200: {
          description: 'Cleanup result',
          type: 'object',
          properties: {
            entity: { type: 'string' },
            deletedCount: { type: 'number' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: { deleteOlderThanDays?: number } }>, reply: FastifyReply) => {
    try {
      const { deleteOlderThanDays = 30 } = request.body || {};
      const result = await cleanupService.cleanupExpiredInvitations(deleteOlderThanDays);
      return reply.send(result);
    } catch (error: unknown) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to clean up invitations' });
    }
  });
}
