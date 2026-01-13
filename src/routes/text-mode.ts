/**
 * Text-First Content Mode Routes
 *
 * Implements the Text-First Content Strategy requirements from mobile/spec.md:
 * - Text alternatives for all multimedia content
 * - Text mode settings management
 * - Selective media loading
 * - Data savings tracking
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TextModeService } from '../services/text-mode.service';
import {
  UpdateTextModeSettingsDto,
  CreateTextAlternativeDto,
  UpdateTextAlternativeDto,
  RecordContentLoadDto,
  TextAlternativeQueryOptions,
  TextModeDeliveryOptions,
  TextAlternativeType,
  NetworkType,
} from '../types/text-mode.types';

const textModeService = new TextModeService();

// Schema definitions for validation
const textModeSettingsSchema = {
  type: 'object',
  properties: {
    enabled: { type: 'boolean' },
    auto_enable_on_low_bandwidth: { type: 'boolean' },
    auto_enable_threshold_kbps: { type: 'number', minimum: 0 },
    hide_images: { type: 'boolean' },
    hide_videos: { type: 'boolean' },
    hide_audio: { type: 'boolean' },
    hide_interactive: { type: 'boolean' },
    show_media_placeholders: { type: 'boolean' },
    allow_selective_load: { type: 'boolean' },
    always_load_content_types: { type: 'array', items: { type: 'string' } },
    high_contrast_mode: { type: 'boolean' },
    larger_text: { type: 'boolean' },
    font_size_multiplier: { type: 'number', minimum: 50, maximum: 300 },
    simplified_layout: { type: 'boolean' },
    compress_text: { type: 'boolean' },
    preload_text_alternatives: { type: 'boolean' },
    max_text_cache_size_mb: { type: 'number', minimum: 10, maximum: 500 },
    notify_when_enabled: { type: 'boolean' },
    notify_missing_alternatives: { type: 'boolean' },
  },
};

const createTextAlternativeSchema = {
  type: 'object',
  required: ['content_item_id', 'alternative_type', 'content'],
  properties: {
    content_item_id: { type: 'string', format: 'uuid' },
    language_code: { type: 'string', maxLength: 10 },
    alternative_type: {
      type: 'string',
      enum: ['full_transcript', 'summary', 'description', 'key_points', 'text_lesson', 'downloadable'],
    },
    content: { type: 'string', minLength: 1 },
    format: { type: 'string', enum: ['plain', 'markdown', 'html'] },
    is_auto_generated: { type: 'boolean' },
    original_content_size_bytes: { type: 'number', minimum: 0 },
  },
};

const updateTextAlternativeSchema = {
  type: 'object',
  properties: {
    content: { type: 'string', minLength: 1 },
    format: { type: 'string', enum: ['plain', 'markdown', 'html'] },
    quality_score: { type: 'number', minimum: 0, maximum: 100 },
    completeness_percentage: { type: 'number', minimum: 0, maximum: 100 },
    missing_sections: { type: 'array', items: { type: 'string' } },
    status: { type: 'string', enum: ['draft', 'review', 'published', 'archived'] },
  },
};

const recordContentLoadSchema = {
  type: 'object',
  required: ['content_item_id', 'load_type', 'load_reason', 'bytes_loaded'],
  properties: {
    content_item_id: { type: 'string', format: 'uuid' },
    load_type: { type: 'string', enum: ['image', 'video', 'audio', 'interactive', 'document'] },
    load_reason: {
      type: 'string',
      enum: ['user_requested', 'essential_content', 'always_load', 'offline_cached', 'auto_load'],
    },
    bytes_loaded: { type: 'number', minimum: 0 },
    bytes_saved: { type: 'number', minimum: 0 },
    network_type: { type: 'string', enum: ['2g', '3g', '4g', '5g', 'wifi'] },
    estimated_speed_kbps: { type: 'number', minimum: 0 },
  },
};

export async function textModeRoutes(server: FastifyInstance): Promise<void> {
  // ========== Text Mode Settings ==========

  /**
   * Get text mode settings for the current user
   */
  server.get(
    '/text-mode/settings',
    {
      schema: {
        description: 'Get text mode settings for the current user',
        tags: ['text-mode'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as unknown as { user?: { id: string } }).user?.id;
      if (!userId) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }

      const settings = await textModeService.getSettings(userId);
      return { success: true, data: settings };
    }
  );

  /**
   * Update text mode settings
   */
  server.patch(
    '/text-mode/settings',
    {
      schema: {
        description: 'Update text mode settings',
        tags: ['text-mode'],
        body: textModeSettingsSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: UpdateTextModeSettingsDto }>,
      reply: FastifyReply
    ) => {
      const userId = (request as unknown as { user?: { id: string } }).user?.id;
      if (!userId) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }

      const settings = await textModeService.updateSettings(userId, request.body);
      return { success: true, data: settings };
    }
  );

  /**
   * Enable text mode
   */
  server.post(
    '/text-mode/enable',
    {
      schema: {
        description: 'Enable text mode for the current user',
        tags: ['text-mode'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as unknown as { user?: { id: string } }).user?.id;
      if (!userId) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }

      const settings = await textModeService.enableTextMode(userId, false);
      return { success: true, data: settings };
    }
  );

  /**
   * Disable text mode
   */
  server.post(
    '/text-mode/disable',
    {
      schema: {
        description: 'Disable text mode for the current user',
        tags: ['text-mode'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as unknown as { user?: { id: string } }).user?.id;
      if (!userId) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }

      const settings = await textModeService.disableTextMode(userId);
      return { success: true, data: settings };
    }
  );

  /**
   * Get text mode status (including network assessment)
   */
  server.get(
    '/text-mode/status',
    {
      schema: {
        description: 'Get current text mode status and network assessment',
        tags: ['text-mode'],
        querystring: {
          type: 'object',
          properties: {
            network_type: { type: 'string', enum: ['2g', '3g', '4g', '5g', 'wifi'] },
            estimated_speed_kbps: { type: 'number' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: { network_type?: NetworkType; estimated_speed_kbps?: number };
      }>,
      reply: FastifyReply
    ) => {
      const userId = (request as unknown as { user?: { id: string } }).user?.id;
      if (!userId) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }

      const status = await textModeService.getStatus(
        userId,
        request.query.network_type,
        request.query.estimated_speed_kbps
      );
      return { success: true, data: status };
    }
  );

  // ========== Text Alternatives CRUD ==========

  /**
   * Create a text alternative for content
   */
  server.post(
    '/text-alternatives',
    {
      schema: {
        description: 'Create a text alternative for content',
        tags: ['text-mode'],
        body: createTextAlternativeSchema,
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: CreateTextAlternativeDto }>,
      reply: FastifyReply
    ) => {
      const userId = (request as unknown as { user?: { id: string } }).user?.id;
      if (!userId) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }

      const alternative = await textModeService.createTextAlternative(userId, request.body);
      return reply.status(201).send({ success: true, data: alternative });
    }
  );

  /**
   * Get text alternative by ID
   */
  server.get(
    '/text-alternatives/:id',
    {
      schema: {
        description: 'Get a text alternative by ID',
        tags: ['text-mode'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const alternative = await textModeService.getTextAlternativeById(request.params.id);
      if (!alternative) {
        return reply.status(404).send({ success: false, error: 'Text alternative not found' });
      }
      return { success: true, data: alternative };
    }
  );

  /**
   * Get text alternatives for a content item
   */
  server.get(
    '/content/:contentItemId/text-alternatives',
    {
      schema: {
        description: 'Get all text alternatives for a content item',
        tags: ['text-mode'],
        params: {
          type: 'object',
          properties: {
            contentItemId: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            language_code: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'array', items: { type: 'object' } },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { contentItemId: string };
        Querystring: { language_code?: string };
      }>,
      reply: FastifyReply
    ) => {
      const alternatives = await textModeService.getTextAlternatives(
        request.params.contentItemId,
        request.query.language_code
      );
      return { success: true, data: alternatives };
    }
  );

  /**
   * Get best text alternative for a content item
   */
  server.get(
    '/content/:contentItemId/text-alternative',
    {
      schema: {
        description: 'Get the best available text alternative for content',
        tags: ['text-mode'],
        params: {
          type: 'object',
          properties: {
            contentItemId: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            language_code: { type: 'string' },
            preferred_type: {
              type: 'string',
              enum: ['full_transcript', 'summary', 'description', 'key_points', 'text_lesson', 'downloadable'],
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { contentItemId: string };
        Querystring: { language_code?: string; preferred_type?: TextAlternativeType };
      }>,
      reply: FastifyReply
    ) => {
      const alternative = await textModeService.getBestTextAlternative(
        request.params.contentItemId,
        request.query.language_code || 'en',
        request.query.preferred_type
      );
      if (!alternative) {
        return reply.status(404).send({ success: false, error: 'No text alternative available' });
      }
      return { success: true, data: alternative };
    }
  );

  /**
   * Update text alternative
   */
  server.patch(
    '/text-alternatives/:id',
    {
      schema: {
        description: 'Update a text alternative',
        tags: ['text-mode'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: updateTextAlternativeSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: UpdateTextAlternativeDto;
      }>,
      reply: FastifyReply
    ) => {
      const alternative = await textModeService.updateTextAlternative(
        request.params.id,
        request.body
      );
      return { success: true, data: alternative };
    }
  );

  /**
   * Verify text alternative
   */
  server.post(
    '/text-alternatives/:id/verify',
    {
      schema: {
        description: 'Verify a text alternative',
        tags: ['text-mode'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const userId = (request as unknown as { user?: { id: string } }).user?.id;
      if (!userId) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }

      const alternative = await textModeService.verifyTextAlternative(request.params.id, userId);
      return { success: true, data: alternative };
    }
  );

  /**
   * Publish text alternative
   */
  server.post(
    '/text-alternatives/:id/publish',
    {
      schema: {
        description: 'Publish a text alternative',
        tags: ['text-mode'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const alternative = await textModeService.publishTextAlternative(request.params.id);
      return { success: true, data: alternative };
    }
  );

  /**
   * Delete text alternative
   */
  server.delete(
    '/text-alternatives/:id',
    {
      schema: {
        description: 'Delete a text alternative',
        tags: ['text-mode'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            type: 'null',
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      await textModeService.deleteTextAlternative(request.params.id);
      return reply.status(204).send();
    }
  );

  /**
   * Query text alternatives
   */
  server.get(
    '/text-alternatives',
    {
      schema: {
        description: 'Query text alternatives with filters',
        tags: ['text-mode'],
        querystring: {
          type: 'object',
          properties: {
            content_item_id: { type: 'string', format: 'uuid' },
            language_code: { type: 'string' },
            alternative_type: {
              type: 'string',
              enum: ['full_transcript', 'summary', 'description', 'key_points', 'text_lesson', 'downloadable'],
            },
            status: { type: 'string', enum: ['draft', 'review', 'published', 'archived'] },
            is_verified: { type: 'boolean' },
            min_quality_score: { type: 'number' },
            limit: { type: 'number', minimum: 1, maximum: 100 },
            offset: { type: 'number', minimum: 0 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  items: { type: 'array', items: { type: 'object' } },
                  total: { type: 'number' },
                  limit: { type: 'number' },
                  offset: { type: 'number' },
                  has_more: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: TextAlternativeQueryOptions }>,
      reply: FastifyReply
    ) => {
      const result = await textModeService.queryTextAlternatives(request.query);
      return { success: true, data: result };
    }
  );

  // ========== Content Delivery in Text Mode ==========

  /**
   * Get content optimized for text mode
   */
  server.get(
    '/text-mode/content/:contentItemId',
    {
      schema: {
        description: 'Get content optimized for text mode viewing',
        tags: ['text-mode'],
        params: {
          type: 'object',
          properties: {
            contentItemId: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            language_code: { type: 'string' },
            preferred_type: {
              type: 'string',
              enum: ['full_transcript', 'summary', 'description', 'key_points', 'text_lesson', 'downloadable'],
            },
            include_media_placeholders: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { contentItemId: string };
        Querystring: TextModeDeliveryOptions;
      }>,
      reply: FastifyReply
    ) => {
      const userId = (request as unknown as { user?: { id: string } }).user?.id;
      if (!userId) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }

      const content = await textModeService.getContentForTextMode(
        request.params.contentItemId,
        userId,
        request.query
      );
      return { success: true, data: content };
    }
  );

  /**
   * Deliver content in text mode (full response with settings and status)
   */
  server.get(
    '/text-mode/deliver/:contentItemId',
    {
      schema: {
        description: 'Deliver content in text mode with full context',
        tags: ['text-mode'],
        params: {
          type: 'object',
          properties: {
            contentItemId: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            language_code: { type: 'string' },
            preferred_type: {
              type: 'string',
              enum: ['full_transcript', 'summary', 'description', 'key_points', 'text_lesson', 'downloadable'],
            },
            network_type: { type: 'string', enum: ['2g', '3g', '4g', '5g', 'wifi'] },
            estimated_speed_kbps: { type: 'number' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { contentItemId: string };
        Querystring: TextModeDeliveryOptions & {
          network_type?: NetworkType;
          estimated_speed_kbps?: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      const userId = (request as unknown as { user?: { id: string } }).user?.id;
      if (!userId) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }

      const { network_type, estimated_speed_kbps, ...deliveryOptions } = request.query;

      const response = await textModeService.deliverContentInTextMode(
        request.params.contentItemId,
        userId,
        deliveryOptions,
        network_type,
        estimated_speed_kbps
      );
      return { success: true, data: response };
    }
  );

  // ========== Content Loading Tracking ==========

  /**
   * Record a selective content load
   */
  server.post(
    '/text-mode/content-load',
    {
      schema: {
        description: 'Record a selective content load in text mode',
        tags: ['text-mode'],
        body: recordContentLoadSchema,
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: RecordContentLoadDto }>,
      reply: FastifyReply
    ) => {
      const userId = (request as unknown as { user?: { id: string } }).user?.id;
      if (!userId) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }

      const load = await textModeService.recordContentLoad(userId, request.body);
      return reply.status(201).send({ success: true, data: load });
    }
  );

  /**
   * Record time spent in text mode
   */
  server.post(
    '/text-mode/record-time',
    {
      schema: {
        description: 'Record time spent in text mode',
        tags: ['text-mode'],
        body: {
          type: 'object',
          required: ['seconds'],
          properties: {
            seconds: { type: 'number', minimum: 0 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: { seconds: number } }>,
      reply: FastifyReply
    ) => {
      const userId = (request as unknown as { user?: { id: string } }).user?.id;
      if (!userId) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }

      await textModeService.recordTimeInTextMode(userId, request.body.seconds);
      return { success: true };
    }
  );

  // ========== Data Savings Reports ==========

  /**
   * Get data savings report
   */
  server.get(
    '/text-mode/data-savings',
    {
      schema: {
        description: 'Get data savings report for the current user',
        tags: ['text-mode'],
        querystring: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['day', 'week', 'month', 'all_time'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: { period?: 'day' | 'week' | 'month' | 'all_time' };
      }>,
      reply: FastifyReply
    ) => {
      const userId = (request as unknown as { user?: { id: string } }).user?.id;
      if (!userId) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }

      const report = await textModeService.getDataSavingsReport(
        userId,
        request.query.period || 'month'
      );
      return { success: true, data: report };
    }
  );

  /**
   * Get data usage history
   */
  server.get(
    '/text-mode/data-usage-history',
    {
      schema: {
        description: 'Get data usage history',
        tags: ['text-mode'],
        querystring: {
          type: 'object',
          properties: {
            start_date: { type: 'string', format: 'date' },
            end_date: { type: 'string', format: 'date' },
            limit: { type: 'number', minimum: 1, maximum: 365 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'array', items: { type: 'object' } },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: { start_date?: string; end_date?: string; limit?: number };
      }>,
      reply: FastifyReply
    ) => {
      const userId = (request as unknown as { user?: { id: string } }).user?.id;
      if (!userId) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }

      const history = await textModeService.getDataUsageHistory(userId, {
        start_date: request.query.start_date ? new Date(request.query.start_date) : undefined,
        end_date: request.query.end_date ? new Date(request.query.end_date) : undefined,
        limit: request.query.limit,
      });
      return { success: true, data: history };
    }
  );

  // ========== Statistics (Admin) ==========

  /**
   * Get text mode statistics (admin only)
   */
  server.get(
    '/text-mode/statistics',
    {
      schema: {
        description: 'Get text mode statistics (admin only)',
        tags: ['text-mode'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // TODO: Add admin permission check
      const stats = await textModeService.getStatistics();
      return { success: true, data: stats };
    }
  );

  // ========== Bulk Operations ==========

  /**
   * Find content missing text alternatives
   */
  server.post(
    '/text-mode/check-missing',
    {
      schema: {
        description: 'Check which content items are missing text alternatives',
        tags: ['text-mode'],
        body: {
          type: 'object',
          required: ['content_item_ids'],
          properties: {
            content_item_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
            required_type: {
              type: 'string',
              enum: ['full_transcript', 'summary', 'description', 'key_points', 'text_lesson', 'downloadable'],
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  missing: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: { content_item_ids: string[]; required_type?: TextAlternativeType };
      }>,
      reply: FastifyReply
    ) => {
      const missing = await textModeService.findContentMissingTextAlternatives(
        request.body.content_item_ids,
        request.body.required_type
      );
      return { success: true, data: { missing } };
    }
  );

  /**
   * Create bulk text alternatives
   */
  server.post(
    '/text-mode/bulk-alternatives',
    {
      schema: {
        description: 'Create text alternatives for multiple content items',
        tags: ['text-mode'],
        body: {
          type: 'object',
          required: ['alternatives'],
          properties: {
            alternatives: {
              type: 'array',
              items: createTextAlternativeSchema,
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  results: { type: 'array', items: { type: 'object' } },
                },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: { alternatives: CreateTextAlternativeDto[] } }>,
      reply: FastifyReply
    ) => {
      const userId = (request as unknown as { user?: { id: string } }).user?.id;
      if (!userId) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }

      const results = await textModeService.createBulkTextAlternatives(
        userId,
        request.body.alternatives
      );
      return { success: true, data: { results } };
    }
  );
}
