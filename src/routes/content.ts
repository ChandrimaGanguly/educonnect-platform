/**
 * Multi-Format Content API Routes
 *
 * Implements API endpoints for managing multi-format educational content
 * according to curriculum/spec.md requirements.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { MultiFormatContentService } from '../services/multi-format-content.service';
import { ContentTranscodingService } from '../services/content-transcoding.service';
import {
  getContentHandler,
  ContentHandlerFactory,
} from '../services/content-handlers/handler-factory';
import {
  CreateContentItemDto,
  UpdateContentItemDto,
  CreateContentVariantDto,
  CreateContentTranslationDto,
  CreateContentCaptionDto,
  CreateCodeSandboxDto,
  CreateInteractiveElementDto,
  UpdateBandwidthProfileDto,
  ContentQueryOptions,
  ContentDeliveryOptions,
  ContentType,
  NetworkType,
  VariantType,
} from '../types/content.types';

// Request type definitions
interface IdParams {
  id: string;
}

interface ContentIdParams {
  contentId: string;
}

interface LanguageParams extends ContentIdParams {
  language: string;
}

interface VariantParams extends ContentIdParams {
  variantType: VariantType;
}

interface CreateContentBody extends CreateContentItemDto {}
interface UpdateContentBody extends UpdateContentItemDto {}
interface CreateVariantBody extends Omit<CreateContentVariantDto, 'content_item_id'> {}
interface CreateTranslationBody extends Omit<CreateContentTranslationDto, 'content_item_id'> {}
interface CreateCaptionBody extends Omit<CreateContentCaptionDto, 'content_item_id'> {}
interface CreateSandboxBody extends Omit<CreateCodeSandboxDto, 'content_item_id'> {}
interface CreateInteractiveBody extends Omit<CreateInteractiveElementDto, 'content_item_id'> {}
interface DeliveryQuery {
  network?: NetworkType;
  quality?: string;
  language?: string;
  text_only?: boolean;
}

interface QueryContentQuery extends ContentQueryOptions {}

export async function contentRoutes(fastify: FastifyInstance): Promise<void> {
  const contentService = new MultiFormatContentService();
  const transcodingService = new ContentTranscodingService();
  const handlerFactory = ContentHandlerFactory.getInstance();

  // ========== Content Format Routes ==========

  /**
   * Get all available content formats
   */
  fastify.get('/formats', {
    schema: {
      description: 'Get all available content formats',
      tags: ['Content Formats'],
      querystring: {
        type: 'object',
        properties: {
          active_only: { type: 'boolean', default: true },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            formats: { type: 'array' },
          },
        },
      },
    },
    handler: async (request: FastifyRequest<{ Querystring: { active_only?: boolean } }>, reply: FastifyReply) => {
      const activeOnly = request.query.active_only !== false;
      const formats = await contentService.getContentFormats(activeOnly);
      return reply.send({ formats });
    },
  });

  /**
   * Get format by key
   */
  fastify.get('/formats/:key', {
    schema: {
      description: 'Get content format by key',
      tags: ['Content Formats'],
      params: {
        type: 'object',
        properties: {
          key: { type: 'string' },
        },
        required: ['key'],
      },
    },
    handler: async (request: FastifyRequest<{ Params: { key: string } }>, reply: FastifyReply) => {
      const format = await contentService.getContentFormatByKey(request.params.key);
      if (!format) {
        return reply.status(404).send({ error: 'Format not found' });
      }
      return reply.send({ format });
    },
  });

  // ========== Content Item Routes ==========

  /**
   * Create new content item
   */
  fastify.post<{ Body: CreateContentBody }>('/items', {
    schema: {
      description: 'Create a new content item',
      tags: ['Content Items'],
      body: {
        type: 'object',
        required: ['title', 'content_type'],
        properties: {
          lesson_id: { type: 'string', format: 'uuid' },
          resource_id: { type: 'string', format: 'uuid' },
          community_id: { type: 'string', format: 'uuid' },
          title: { type: 'string', minLength: 1, maxLength: 255 },
          slug: { type: 'string', maxLength: 150 },
          description: { type: 'string' },
          content_type: {
            type: 'string',
            enum: ['text', 'video', 'audio', 'interactive', 'document', 'code', 'quiz', 'image', 'mixed'],
          },
          content_text: { type: 'string' },
          text_format: { type: 'string', enum: ['markdown', 'html', 'plain'] },
          content_file_id: { type: 'string', format: 'uuid' },
          external_url: { type: 'string', format: 'uri' },
          duration_seconds: { type: 'integer', minimum: 0 },
          original_language: { type: 'string', maxLength: 10 },
          alt_text: { type: 'string' },
          transcript: { type: 'string' },
          text_alternative: { type: 'string' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            content: { type: 'object' },
          },
        },
      },
    },
    preHandler: async (request, reply): Promise<void> => {
      // Authentication check
      if (!request.user) {
        reply.status(401).send({ error: 'Authentication required' });
        return;
      }
    },
    handler: async (request: FastifyRequest<{ Body: CreateContentBody }>, reply: FastifyReply) => {
      const userId = request.user?.userId;

      // Validate with handler
      const handler = getContentHandler(request.body.content_type as ContentType);
      const validation = handler.validate(request.body);

      if (!validation.valid) {
        return reply.status(400).send({
          error: 'Validation failed',
          errors: validation.errors,
          warnings: validation.warnings,
        });
      }

      const content = await contentService.createContentItem(userId, request.body);

      // Process content with handler
      const processed = await handler.process(content);

      // Return with warnings if any
      return reply.status(201).send({
        content: processed,
        warnings: validation.warnings.length > 0 ? validation.warnings : undefined,
      });
    },
  });

  /**
   * Get content item by ID
   */
  fastify.get<{ Params: IdParams }>('/items/:id', {
    schema: {
      description: 'Get content item by ID',
      tags: ['Content Items'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      querystring: {
        type: 'object',
        properties: {
          include_details: { type: 'boolean', default: false },
        },
      },
    },
    handler: async (
      request: FastifyRequest<{ Params: IdParams; Querystring: { include_details?: boolean } }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      const includeDetails = request.query.include_details;

      const content = includeDetails
        ? await contentService.getContentItemWithDetails(id)
        : await contentService.getContentItemById(id);

      if (!content) {
        return reply.status(404).send({ error: 'Content item not found' });
      }

      return reply.send({ content });
    },
  });

  /**
   * Update content item
   */
  fastify.patch<{ Params: IdParams; Body: UpdateContentBody }>('/items/:id', {
    schema: {
      description: 'Update content item',
      tags: ['Content Items'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string' },
          content_text: { type: 'string' },
          text_format: { type: 'string', enum: ['markdown', 'html', 'plain'] },
          content_file_id: { type: 'string', format: 'uuid' },
          external_url: { type: 'string', format: 'uri' },
          duration_seconds: { type: 'integer', minimum: 0 },
          alt_text: { type: 'string' },
          transcript: { type: 'string' },
          text_alternative: { type: 'string' },
          status: { type: 'string', enum: ['draft', 'review', 'published', 'archived'] },
        },
      },
    },
    preHandler: async (request, reply): Promise<void> => {
      if (!request.user) {
        reply.status(401).send({ error: 'Authentication required' });
        return;
      }
    },
    handler: async (request, reply) => {
      const userId = request.user?.userId;
      const { id } = request.params;

      const existing = await contentService.getContentItemById(id);
      if (!existing) {
        return reply.status(404).send({ error: 'Content item not found' });
      }

      const content = await contentService.updateContentItem(id, userId, request.body);
      return reply.send({ content });
    },
  });

  /**
   * Publish content item
   */
  fastify.post<{ Params: IdParams }>('/items/:id/publish', {
    schema: {
      description: 'Publish content item',
      tags: ['Content Items'],
    },
    preHandler: async (request, reply): Promise<void> => {
      if (!request.user) {
        reply.status(401).send({ error: 'Authentication required' });
        return;
      }
    },
    handler: async (request, reply) => {
      const userId = request.user?.userId;
      const { id } = request.params;

      const content = await contentService.publishContentItem(id, userId);
      return reply.send({ content, message: 'Content published successfully' });
    },
  });

  /**
   * Archive content item
   */
  fastify.post<{ Params: IdParams }>('/items/:id/archive', {
    schema: {
      description: 'Archive content item',
      tags: ['Content Items'],
    },
    preHandler: async (request, reply): Promise<void> => {
      if (!request.user) {
        reply.status(401).send({ error: 'Authentication required' });
        return;
      }
    },
    handler: async (request, reply) => {
      const userId = request.user?.userId;
      const { id } = request.params;

      const content = await contentService.archiveContentItem(id, userId);
      return reply.send({ content, message: 'Content archived successfully' });
    },
  });

  /**
   * Delete content item
   */
  fastify.delete<{ Params: IdParams }>('/items/:id', {
    schema: {
      description: 'Delete content item',
      tags: ['Content Items'],
    },
    preHandler: async (request, reply): Promise<void> => {
      if (!request.user) {
        reply.status(401).send({ error: 'Authentication required' });
        return;
      }
    },
    handler: async (request, reply) => {
      const { id } = request.params;

      const existing = await contentService.getContentItemById(id);
      if (!existing) {
        return reply.status(404).send({ error: 'Content item not found' });
      }

      await contentService.deleteContentItem(id);
      return reply.status(204).send();
    },
  });

  /**
   * Query content items
   */
  fastify.get<{ Querystring: QueryContentQuery }>('/items', {
    schema: {
      description: 'Query content items with filters',
      tags: ['Content Items'],
      querystring: {
        type: 'object',
        properties: {
          community_id: { type: 'string', format: 'uuid' },
          lesson_id: { type: 'string', format: 'uuid' },
          content_type: { type: 'string' },
          status: { type: 'string' },
          language: { type: 'string' },
          search: { type: 'string' },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          offset: { type: 'integer', minimum: 0, default: 0 },
          sort_by: { type: 'string', enum: ['created_at', 'updated_at', 'title', 'quality_score', 'view_count'] },
          sort_order: { type: 'string', enum: ['asc', 'desc'] },
        },
      },
    },
    handler: async (request, reply) => {
      const result = await contentService.queryContentItems(request.query);
      return reply.send(result);
    },
  });

  // ========== Content Delivery Routes ==========

  /**
   * Get content optimized for delivery
   */
  fastify.get<{ Params: IdParams; Querystring: DeliveryQuery }>('/items/:id/deliver', {
    schema: {
      description: 'Get content optimized for delivery based on network conditions',
      tags: ['Content Delivery'],
      querystring: {
        type: 'object',
        properties: {
          network: { type: 'string', enum: ['2g', '3g', '4g', '5g', 'wifi', 'any'] },
          quality: { type: 'string', enum: ['auto', 'ultra_low', 'low', 'medium', 'high', 'original'] },
          language: { type: 'string' },
          text_only: { type: 'boolean' },
        },
      },
    },
    preHandler: async (request, reply): Promise<void> => {
      if (!request.user) {
        reply.status(401).send({ error: 'Authentication required' });
        return;
      }
    },
    handler: async (request, reply) => {
      const userId = request.user?.userId;
      const { id } = request.params;
      const { network, quality, language, text_only } = request.query;

      const options: ContentDeliveryOptions = {
        network_type: network as NetworkType,
        preferred_quality: quality as ContentDeliveryOptions['preferred_quality'],
        language,
        text_only,
      };

      const response = await contentService.getContentForDelivery(id, userId, options);
      return reply.send(response);
    },
  });

  /**
   * Render content
   */
  fastify.get<{ Params: IdParams; Querystring: DeliveryQuery }>('/items/:id/render', {
    schema: {
      description: 'Get rendered HTML for content',
      tags: ['Content Delivery'],
    },
    handler: async (request, reply) => {
      const { id } = request.params;
      const { network, text_only, language } = request.query;

      const content = await contentService.getContentItemById(id);
      if (!content) {
        return reply.status(404).send({ error: 'Content item not found' });
      }

      const handler = getContentHandler(content.content_type);
      const rendered = handler.render(content, {
        textOnly: text_only,
        networkType: network as NetworkType,
        language,
        includeAccessibility: true,
      });

      return reply.send(rendered);
    },
  });

  // ========== Content Variant Routes ==========

  /**
   * Create content variant
   */
  fastify.post<{ Params: ContentIdParams; Body: CreateVariantBody }>('/items/:contentId/variants', {
    schema: {
      description: 'Create a content variant',
      tags: ['Content Variants'],
      body: {
        type: 'object',
        required: ['variant_type'],
        properties: {
          variant_type: {
            type: 'string',
            enum: ['original', 'text_only', 'low_quality', 'medium_quality', 'high_quality', 'audio_only', 'thumbnail', 'preview', 'compressed'],
          },
          optimized_for_network: { type: 'string', enum: ['2g', '3g', '4g', '5g', 'wifi', 'any'] },
          file_id: { type: 'string', format: 'uuid' },
          content_text: { type: 'string' },
          external_url: { type: 'string', format: 'uri' },
          mime_type: { type: 'string' },
          file_size_bytes: { type: 'integer' },
          width: { type: 'integer' },
          height: { type: 'integer' },
          bitrate: { type: 'integer' },
          codec: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const { contentId } = request.params;

      const variant = await contentService.createContentVariant({
        content_item_id: contentId,
        ...request.body,
      });

      return reply.status(201).send({ variant });
    },
  });

  /**
   * Get content variants
   */
  fastify.get<{ Params: ContentIdParams }>('/items/:contentId/variants', {
    schema: {
      description: 'Get all variants for a content item',
      tags: ['Content Variants'],
    },
    handler: async (request, reply) => {
      const { contentId } = request.params;
      const variants = await contentService.getContentVariants(contentId);
      return reply.send({ variants });
    },
  });

  /**
   * Queue transcoding jobs
   */
  fastify.post<{ Params: ContentIdParams }>('/items/:contentId/transcode', {
    schema: {
      description: 'Queue transcoding jobs for content variants',
      tags: ['Content Variants'],
      body: {
        type: 'object',
        properties: {
          target_network: { type: 'string', enum: ['2g', '3g', '4g', '5g', 'wifi'] },
          max_file_size_kb: { type: 'integer' },
          generate_text_alternative: { type: 'boolean', default: true },
          priority: { type: 'string', enum: ['low', 'normal', 'high'], default: 'normal' },
        },
      },
    },
    preHandler: async (request, reply): Promise<void> => {
      if (!request.user) {
        reply.status(401).send({ error: 'Authentication required' });
        return;
      }
    },
    handler: async (
      request: FastifyRequest<{
        Params: ContentIdParams;
        Body: {
          target_network?: NetworkType;
          max_file_size_kb?: number;
          generate_text_alternative?: boolean;
          priority?: 'low' | 'normal' | 'high';
        };
      }>,
      reply: FastifyReply
    ) => {
      const { contentId } = request.params;
      const { target_network, max_file_size_kb, generate_text_alternative, priority } = request.body;

      const jobs = await transcodingService.queueTranscodingJobs(contentId, {
        targetNetwork: target_network,
        maxFileSizeKb: max_file_size_kb,
        generateTextAlternative: generate_text_alternative,
        priorityLevel: priority,
      });

      return reply.status(202).send({
        message: 'Transcoding jobs queued',
        jobs_count: jobs.length,
        jobs,
      });
    },
  });

  /**
   * Get transcoding status
   */
  fastify.get<{ Params: ContentIdParams }>('/items/:contentId/transcode/status', {
    schema: {
      description: 'Get transcoding status for content',
      tags: ['Content Variants'],
    },
    handler: async (request, reply) => {
      const { contentId } = request.params;
      const status = await transcodingService.getTranscodingStatus(contentId);
      return reply.send(status);
    },
  });

  // ========== Translation Routes ==========

  /**
   * Create translation
   */
  fastify.post<{ Params: ContentIdParams; Body: CreateTranslationBody }>('/items/:contentId/translations', {
    schema: {
      description: 'Create a translation for content',
      tags: ['Content Translations'],
      body: {
        type: 'object',
        required: ['language_code', 'title'],
        properties: {
          language_code: { type: 'string', maxLength: 10 },
          title: { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string' },
          content_text: { type: 'string' },
          is_machine_translated: { type: 'boolean' },
          alt_text: { type: 'string' },
          transcript: { type: 'string' },
        },
      },
    },
    preHandler: async (request, reply): Promise<void> => {
      if (!request.user) {
        reply.status(401).send({ error: 'Authentication required' });
        return;
      }
    },
    handler: async (request, reply) => {
      const userId = request.user?.userId;
      const { contentId } = request.params;

      const translation = await contentService.createContentTranslation(userId, {
        content_item_id: contentId,
        ...request.body,
      });

      return reply.status(201).send({ translation });
    },
  });

  /**
   * Get translations
   */
  fastify.get<{ Params: ContentIdParams }>('/items/:contentId/translations', {
    schema: {
      description: 'Get all translations for content',
      tags: ['Content Translations'],
    },
    handler: async (request, reply) => {
      const { contentId } = request.params;
      const translations = await contentService.getContentTranslations(contentId);
      return reply.send({ translations });
    },
  });

  /**
   * Get specific translation
   */
  fastify.get<{ Params: LanguageParams }>('/items/:contentId/translations/:language', {
    schema: {
      description: 'Get translation for specific language',
      tags: ['Content Translations'],
    },
    handler: async (request, reply) => {
      const { contentId, language } = request.params;
      const translation = await contentService.getContentTranslation(contentId, language);

      if (!translation) {
        return reply.status(404).send({ error: 'Translation not found' });
      }

      return reply.send({ translation });
    },
  });

  // ========== Caption Routes ==========

  /**
   * Create caption
   */
  fastify.post<{ Params: ContentIdParams; Body: CreateCaptionBody }>('/items/:contentId/captions', {
    schema: {
      description: 'Create captions for content',
      tags: ['Content Captions'],
      body: {
        type: 'object',
        required: ['language_code', 'label'],
        properties: {
          language_code: { type: 'string', maxLength: 10 },
          label: { type: 'string', maxLength: 100 },
          caption_type: { type: 'string', enum: ['subtitles', 'closed_captions', 'descriptions', 'chapters', 'metadata'] },
          format: { type: 'string', enum: ['vtt', 'srt', 'ttml', 'sbv'] },
          file_id: { type: 'string', format: 'uuid' },
          caption_content: { type: 'string' },
          is_auto_generated: { type: 'boolean' },
          is_default: { type: 'boolean' },
        },
      },
    },
    preHandler: async (request, reply): Promise<void> => {
      if (!request.user) {
        reply.status(401).send({ error: 'Authentication required' });
        return;
      }
    },
    handler: async (request, reply) => {
      const userId = request.user?.userId;
      const { contentId } = request.params;

      const caption = await contentService.createContentCaption(userId, {
        content_item_id: contentId,
        ...request.body,
      });

      return reply.status(201).send({ caption });
    },
  });

  /**
   * Get captions
   */
  fastify.get<{ Params: ContentIdParams }>('/items/:contentId/captions', {
    schema: {
      description: 'Get all captions for content',
      tags: ['Content Captions'],
    },
    handler: async (request, reply) => {
      const { contentId } = request.params;
      const captions = await contentService.getContentCaptions(contentId);
      return reply.send({ captions });
    },
  });

  // ========== Code Sandbox Routes ==========

  /**
   * Create code sandbox
   */
  fastify.post<{ Params: ContentIdParams; Body: CreateSandboxBody }>('/items/:contentId/sandbox', {
    schema: {
      description: 'Create code sandbox for content',
      tags: ['Content Code'],
      body: {
        type: 'object',
        required: ['language'],
        properties: {
          language: { type: 'string' },
          runtime_version: { type: 'string' },
          template: { type: 'string' },
          starter_code: { type: 'string' },
          solution_code: { type: 'string' },
          test_code: { type: 'string' },
          dependencies: { type: 'object' },
          timeout_seconds: { type: 'integer', minimum: 1, maximum: 300 },
          memory_limit_mb: { type: 'integer', minimum: 64, maximum: 512 },
          files: { type: 'array' },
          instructions: { type: 'string' },
          hints: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const { contentId } = request.params;

      const sandbox = await contentService.createCodeSandbox({
        content_item_id: contentId,
        ...request.body,
      });

      return reply.status(201).send({ sandbox });
    },
  });

  /**
   * Get code sandbox
   */
  fastify.get<{ Params: ContentIdParams }>('/items/:contentId/sandbox', {
    schema: {
      description: 'Get code sandbox for content',
      tags: ['Content Code'],
    },
    handler: async (request, reply) => {
      const { contentId } = request.params;
      const sandbox = await contentService.getCodeSandbox(contentId);

      if (!sandbox) {
        return reply.status(404).send({ error: 'Code sandbox not found' });
      }

      return reply.send({ sandbox });
    },
  });

  // ========== Interactive Element Routes ==========

  /**
   * Create interactive element
   */
  fastify.post<{ Params: ContentIdParams; Body: CreateInteractiveBody }>('/items/:contentId/interactive', {
    schema: {
      description: 'Create interactive element for content',
      tags: ['Content Interactive'],
      body: {
        type: 'object',
        required: ['element_type'],
        properties: {
          element_type: {
            type: 'string',
            enum: ['simulation', 'diagram', 'quiz_widget', 'flashcard', 'timeline', 'map', 'chart', 'calculator', 'form', 'custom'],
          },
          title: { type: 'string' },
          description: { type: 'string' },
          config: { type: 'object' },
          data: { type: 'object' },
          renderer: { type: 'string' },
          custom_html: { type: 'string' },
          custom_css: { type: 'string' },
          custom_js: { type: 'string' },
          completion_criteria: { type: 'object' },
          alt_description: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const { contentId } = request.params;

      const element = await contentService.createInteractiveElement({
        content_item_id: contentId,
        ...request.body,
      });

      return reply.status(201).send({ element });
    },
  });

  /**
   * Get interactive elements
   */
  fastify.get<{ Params: ContentIdParams }>('/items/:contentId/interactive', {
    schema: {
      description: 'Get interactive elements for content',
      tags: ['Content Interactive'],
    },
    handler: async (request, reply) => {
      const { contentId } = request.params;
      const elements = await contentService.getInteractiveElements(contentId);
      return reply.send({ elements });
    },
  });

  // ========== Accessibility Routes ==========

  /**
   * Run accessibility check
   */
  fastify.post<{ Params: IdParams }>('/items/:id/accessibility/check', {
    schema: {
      description: 'Run accessibility check on content',
      tags: ['Content Accessibility'],
    },
    handler: async (request, reply) => {
      const { id } = request.params;

      const report = await contentService.runAccessibilityCheck(id);
      return reply.send({ report });
    },
  });

  /**
   * Get accessibility reports
   */
  fastify.get<{ Params: IdParams }>('/items/:id/accessibility', {
    schema: {
      description: 'Get accessibility reports for content',
      tags: ['Content Accessibility'],
    },
    handler: async (request, reply) => {
      const { id } = request.params;
      const report = await contentService.getLatestAccessibilityReport(id);
      return reply.send({ report });
    },
  });

  // ========== Bandwidth Profile Routes ==========

  /**
   * Get user bandwidth profile
   */
  fastify.get('/bandwidth-profile', {
    schema: {
      description: 'Get user bandwidth profile',
      tags: ['Bandwidth Profile'],
    },
    preHandler: async (request, reply): Promise<void> => {
      if (!request.user) {
        reply.status(401).send({ error: 'Authentication required' });
        return;
      }
    },
    handler: async (request, reply) => {
      const userId = request.user?.userId;
      const profile = await contentService.getBandwidthProfile(userId);
      return reply.send({ profile });
    },
  });

  /**
   * Update bandwidth profile
   */
  fastify.patch<{ Body: UpdateBandwidthProfileDto }>('/bandwidth-profile', {
    schema: {
      description: 'Update user bandwidth profile',
      tags: ['Bandwidth Profile'],
      body: {
        type: 'object',
        properties: {
          preferred_quality: { type: 'string', enum: ['auto', 'ultra_low', 'low', 'medium', 'high', 'original'] },
          auto_download_enabled: { type: 'boolean' },
          text_only_mode: { type: 'boolean' },
          reduce_data_usage: { type: 'boolean' },
          network_preferences: { type: 'object' },
          monthly_data_limit_mb: { type: 'integer' },
          download_on_wifi_only: { type: 'boolean' },
          auto_delete_watched: { type: 'boolean' },
          storage_limit_mb: { type: 'integer' },
        },
      },
    },
    preHandler: async (request, reply): Promise<void> => {
      if (!request.user) {
        reply.status(401).send({ error: 'Authentication required' });
        return;
      }
    },
    handler: async (request, reply) => {
      const userId = request.user?.userId;
      const profile = await contentService.updateBandwidthProfile(userId, request.body);
      return reply.send({ profile });
    },
  });

  // ========== Statistics Routes ==========

  /**
   * Get content statistics
   */
  fastify.get('/statistics', {
    schema: {
      description: 'Get content statistics',
      tags: ['Content Statistics'],
      querystring: {
        type: 'object',
        properties: {
          community_id: { type: 'string', format: 'uuid' },
        },
      },
    },
    handler: async (request: FastifyRequest<{ Querystring: { community_id?: string } }>, reply: FastifyReply) => {
      const stats = await contentService.getContentStatistics(request.query.community_id);
      return reply.send({ statistics: stats });
    },
  });

  /**
   * Estimate bandwidth savings
   */
  fastify.get<{ Params: IdParams; Querystring: { network: NetworkType } }>('/items/:id/bandwidth-estimate', {
    schema: {
      description: 'Estimate bandwidth savings for content',
      tags: ['Content Delivery'],
      querystring: {
        type: 'object',
        required: ['network'],
        properties: {
          network: { type: 'string', enum: ['2g', '3g', '4g', '5g', 'wifi', 'any'] },
        },
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params;
      const { network } = request.query;

      const estimate = await transcodingService.estimateBandwidthSavings(id, network);
      return reply.send({ estimate });
    },
  });
}
