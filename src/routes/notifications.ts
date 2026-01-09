import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { notificationService, NotificationCategory, NotificationPriority } from '../services/notifications';

/**
 * Notification Routes
 *
 * API endpoints for managing user notifications and preferences
 */

interface GetNotificationsQuery {
  category?: NotificationCategory;
  isRead?: boolean;
  limit?: number;
  offset?: number;
}

interface UpdatePreferencesBody {
  inAppEnabled?: boolean;
  pushEnabled?: boolean;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  categoryPreferences?: Record<string, {
    in_app?: boolean;
    push?: boolean;
    email?: boolean;
    sms?: boolean;
  }>;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
  maxDailyNotifications?: number;
  enableDigestMode?: boolean;
  digestFrequency?: 'daily' | 'weekly';
  digestTime?: string;
  isPaused?: boolean;
  pausedUntil?: string;
}

interface MarkAsReadBody {
  notificationIds?: string[];
  category?: NotificationCategory;
}

export async function notificationRoutes(server: FastifyInstance): Promise<void> {
  // Get user notifications
  server.get('/notifications', {
    schema: {
      description: 'Get notifications for the authenticated user',
      tags: ['notifications'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['learning', 'mentorship', 'community', 'system', 'achievement'] },
          isRead: { type: 'boolean' },
          limit: { type: 'integer', minimum: 1, maximum: 100 },
          offset: { type: 'integer', minimum: 0 },
        },
      },
      response: {
        200: {
          description: 'List of notifications',
          type: 'array',
          items: { type: 'object' },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: GetNotificationsQuery }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.id;

      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const notifications = await notificationService.getUserNotifications(userId, {
        category: request.query.category,
        isRead: request.query.isRead,
        limit: request.query.limit || 50,
        offset: request.query.offset || 0,
      });

      return reply.send(notifications);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch notifications' });
    }
  });

  // Get unread notification count
  server.get('/notifications/unread-count', {
    schema: {
      description: 'Get unread notification count',
      tags: ['notifications'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['learning', 'mentorship', 'community', 'system', 'achievement'] },
        },
      },
      response: {
        200: {
          description: 'Unread count',
          type: 'object',
          properties: {
            count: { type: 'integer' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: { category?: NotificationCategory } }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.id;

      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const count = await notificationService.getUnreadCount(userId, request.query.category);

      return reply.send({ count });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to get unread count' });
    }
  });

  // Mark notification(s) as read
  server.post('/notifications/mark-read', {
    schema: {
      description: 'Mark notification(s) as read',
      tags: ['notifications'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          notificationIds: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
          },
          category: { type: 'string', enum: ['learning', 'mentorship', 'community', 'system', 'achievement'] },
        },
      },
      response: {
        200: {
          description: 'Marked as read',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: MarkAsReadBody }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.id;

      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { notificationIds, category } = request.body;

      if (notificationIds && notificationIds.length > 0) {
        // Mark specific notifications as read
        await Promise.all(
          notificationIds.map(id => notificationService.markAsRead(id, userId))
        );

        return reply.send({
          success: true,
          message: `Marked ${notificationIds.length} notification(s) as read`,
        });
      } else if (category) {
        // Mark all notifications in category as read
        await notificationService.markAllAsRead(userId, category);

        return reply.send({
          success: true,
          message: `Marked all ${category} notifications as read`,
        });
      } else {
        // Mark all notifications as read
        await notificationService.markAllAsRead(userId);

        return reply.send({
          success: true,
          message: 'Marked all notifications as read',
        });
      }
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to mark notifications as read' });
    }
  });

  // Get notification preferences
  server.get('/notifications/preferences', {
    schema: {
      description: 'Get notification preferences for the authenticated user',
      tags: ['notifications'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'Notification preferences',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.id;

      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const preferences = await notificationService.getUserPreferences(userId);

      return reply.send(preferences);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch notification preferences' });
    }
  });

  // Update notification preferences
  server.patch('/notifications/preferences', {
    schema: {
      description: 'Update notification preferences',
      tags: ['notifications'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          inAppEnabled: { type: 'boolean' },
          pushEnabled: { type: 'boolean' },
          emailEnabled: { type: 'boolean' },
          smsEnabled: { type: 'boolean' },
          categoryPreferences: { type: 'object' },
          quietHoursEnabled: { type: 'boolean' },
          quietHoursStart: { type: 'string', pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$' },
          quietHoursEnd: { type: 'string', pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$' },
          timezone: { type: 'string' },
          maxDailyNotifications: { type: 'integer', minimum: 0 },
          enableDigestMode: { type: 'boolean' },
          digestFrequency: { type: 'string', enum: ['daily', 'weekly'] },
          digestTime: { type: 'string', pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$' },
          isPaused: { type: 'boolean' },
          pausedUntil: { type: 'string', format: 'date-time' },
        },
      },
      response: {
        200: {
          description: 'Updated preferences',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: UpdatePreferencesBody }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.id;

      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const updates: any = { ...request.body };

      // Convert pausedUntil to Date if provided
      if (updates.pausedUntil) {
        updates.pausedUntil = new Date(updates.pausedUntil);
      }

      const preferences = await notificationService.updateUserPreferences(userId, updates);

      return reply.send(preferences);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to update notification preferences' });
    }
  });

  // Pause notifications
  server.post('/notifications/pause', {
    schema: {
      description: 'Pause notifications for a period of time',
      tags: ['notifications'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['pausedUntil'],
        properties: {
          pausedUntil: { type: 'string', format: 'date-time' },
        },
      },
      response: {
        200: {
          description: 'Notifications paused',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            pausedUntil: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: { pausedUntil: string } }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.id;

      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const pausedUntil = new Date(request.body.pausedUntil);

      if (pausedUntil <= new Date()) {
        return reply.code(400).send({ error: 'pausedUntil must be in the future' });
      }

      await notificationService.updateUserPreferences(userId, {
        isPaused: true,
        pausedUntil,
      });

      return reply.send({
        success: true,
        pausedUntil: pausedUntil.toISOString(),
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to pause notifications' });
    }
  });

  // Resume notifications
  server.post('/notifications/resume', {
    schema: {
      description: 'Resume paused notifications',
      tags: ['notifications'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'Notifications resumed',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any)?.id;

      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      await notificationService.updateUserPreferences(userId, {
        isPaused: false,
        pausedUntil: undefined,
      });

      return reply.send({ success: true });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to resume notifications' });
    }
  });
}
