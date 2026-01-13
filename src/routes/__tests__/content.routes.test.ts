/**
 * Multi-Format Content Routes Tests
 *
 * Integration tests for the content API endpoints.
 */

import Fastify, { FastifyInstance } from 'fastify';
import { contentRoutes } from '../content';

// Mock services
jest.mock('../../services/multi-format-content.service', () => ({
  MultiFormatContentService: jest.fn().mockImplementation(() => ({
    getContentFormats: jest.fn().mockResolvedValue([
      { id: '1', format_key: 'markdown', name: 'Markdown Text' },
      { id: '2', format_key: 'video_mp4', name: 'MP4 Video' },
    ]),
    getContentFormatByKey: jest.fn().mockImplementation((key) => {
      if (key === 'markdown') {
        return Promise.resolve({ id: '1', format_key: 'markdown', name: 'Markdown Text' });
      }
      return Promise.resolve(null);
    }),
    createContentItem: jest.fn().mockResolvedValue({
      id: 'content-123',
      title: 'Test Content',
      content_type: 'text',
      status: 'draft',
    }),
    getContentItemById: jest.fn().mockImplementation((id) => {
      if (id === 'content-123') {
        return Promise.resolve({
          id: 'content-123',
          title: 'Test Content',
          content_type: 'text',
          status: 'draft',
        });
      }
      return Promise.resolve(null);
    }),
    getContentItemWithDetails: jest.fn().mockResolvedValue({
      id: 'content-123',
      title: 'Test Content',
      content_type: 'text',
      variants: [],
      translations: [],
      captions: [],
    }),
    updateContentItem: jest.fn().mockResolvedValue({
      id: 'content-123',
      title: 'Updated Content',
      content_type: 'text',
    }),
    publishContentItem: jest.fn().mockResolvedValue({
      id: 'content-123',
      status: 'published',
    }),
    archiveContentItem: jest.fn().mockResolvedValue({
      id: 'content-123',
      status: 'archived',
    }),
    deleteContentItem: jest.fn().mockResolvedValue(undefined),
    queryContentItems: jest.fn().mockResolvedValue({
      items: [
        { id: '1', title: 'Item 1' },
        { id: '2', title: 'Item 2' },
      ],
      total: 2,
      limit: 20,
      offset: 0,
      has_more: false,
    }),
    createContentVariant: jest.fn().mockResolvedValue({
      id: 'variant-123',
      variant_type: 'low_quality',
      status: 'pending',
    }),
    getContentVariants: jest.fn().mockResolvedValue([
      { id: 'v1', variant_type: 'original' },
      { id: 'v2', variant_type: 'low_quality' },
    ]),
    createContentTranslation: jest.fn().mockResolvedValue({
      id: 'translation-123',
      language_code: 'es',
      title: 'Título',
    }),
    getContentTranslations: jest.fn().mockResolvedValue([
      { id: 't1', language_code: 'es' },
      { id: 't2', language_code: 'fr' },
    ]),
    getContentTranslation: jest.fn().mockImplementation((contentId, lang) => {
      if (lang === 'es') {
        return Promise.resolve({ id: 't1', language_code: 'es', title: 'Título' });
      }
      return Promise.resolve(null);
    }),
    createContentCaption: jest.fn().mockResolvedValue({
      id: 'caption-123',
      language_code: 'en',
      label: 'English',
    }),
    getContentCaptions: jest.fn().mockResolvedValue([
      { id: 'c1', language_code: 'en' },
    ]),
    createCodeSandbox: jest.fn().mockResolvedValue({
      id: 'sandbox-123',
      language: 'javascript',
    }),
    getCodeSandbox: jest.fn().mockImplementation((contentId) => {
      if (contentId === 'content-123') {
        return Promise.resolve({ id: 'sandbox-123', language: 'javascript' });
      }
      return Promise.resolve(null);
    }),
    createInteractiveElement: jest.fn().mockResolvedValue({
      id: 'interactive-123',
      element_type: 'quiz_widget',
    }),
    getInteractiveElements: jest.fn().mockResolvedValue([
      { id: 'i1', element_type: 'quiz_widget' },
    ]),
    runAccessibilityCheck: jest.fn().mockResolvedValue({
      id: 'report-123',
      overall_score: 85,
      critical_issues: 0,
    }),
    getLatestAccessibilityReport: jest.fn().mockResolvedValue({
      id: 'report-123',
      overall_score: 85,
    }),
    getBandwidthProfile: jest.fn().mockResolvedValue({
      user_id: 'user-123',
      preferred_quality: 'auto',
      text_only_mode: false,
    }),
    updateBandwidthProfile: jest.fn().mockResolvedValue({
      user_id: 'user-123',
      preferred_quality: 'low',
      text_only_mode: true,
    }),
    getContentStatistics: jest.fn().mockResolvedValue({
      total_items: 100,
      by_type: { text: 50, video: 30, audio: 20 },
      by_status: { published: 70, draft: 30 },
    }),
    getContentForDelivery: jest.fn().mockResolvedValue({
      content: { id: 'content-123', title: 'Test' },
      selected_variant: null,
      available_translations: [],
      available_captions: [],
      bandwidth_estimate_kb: 100,
      text_alternative_available: false,
    }),
  })),
}));

jest.mock('../../services/content-transcoding.service', () => ({
  ContentTranscodingService: jest.fn().mockImplementation(() => ({
    queueTranscodingJobs: jest.fn().mockResolvedValue([
      { id: 'job-1', variant_type: 'low_quality', status: 'pending' },
      { id: 'job-2', variant_type: 'medium_quality', status: 'pending' },
    ]),
    getTranscodingStatus: jest.fn().mockResolvedValue({
      total_variants: 3,
      ready_variants: 1,
      pending_variants: 2,
      failed_variants: 0,
      variants: [],
    }),
    estimateBandwidthSavings: jest.fn().mockResolvedValue({
      original_kb: 50000,
      optimized_kb: 15000,
      savings_percent: 70,
      recommended_variant: 'low_quality',
    }),
  })),
}));

jest.mock('../../services/content-handlers/handler-factory', () => ({
  getContentHandler: jest.fn().mockReturnValue({
    validate: jest.fn().mockReturnValue({ valid: true, errors: [], warnings: [] }),
    process: jest.fn().mockImplementation((content) => Promise.resolve(content)),
    render: jest.fn().mockReturnValue({ html: '<div>Test</div>', metadata: {} }),
  }),
  ContentHandlerFactory: {
    getInstance: jest.fn().mockReturnValue({
      getHandler: jest.fn(),
    }),
  },
}));

jest.mock('../../database', () => ({
  getDatabase: jest.fn(),
}));

describe('Content Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();

    // Add mock authentication decorator
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (request) => {
      // Simulate authenticated user for most tests
      if (request.headers.authorization) {
        request.user = { userId: 'user-123', id: 'user-123' };
      }
    });

    await app.register(contentRoutes, { prefix: '/api/v1/content' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /formats', () => {
    it('should return all active formats', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/content/formats',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.formats).toHaveLength(2);
    });
  });

  describe('GET /formats/:key', () => {
    it('should return format by key', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/content/formats/markdown',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.format.format_key).toBe('markdown');
    });

    it('should return 404 for non-existent format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/content/formats/nonexistent',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /items', () => {
    it('should create content item when authenticated', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/content/items',
        headers: {
          authorization: 'Bearer test-token',
        },
        payload: {
          title: 'Test Content',
          content_type: 'text',
          content_text: 'Some content',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.content.title).toBe('Test Content');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/content/items',
        payload: {
          title: 'Test Content',
          content_type: 'text',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /items/:id', () => {
    it('should return content item', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/content/items/content-123',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.content.id).toBe('content-123');
    });

    it('should return 404 for non-existent content', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/content/items/nonexistent',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should include details when requested', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/content/items/content-123?include_details=true',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.content.variants).toBeDefined();
    });
  });

  describe('PATCH /items/:id', () => {
    it('should update content item', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/content/items/content-123',
        headers: {
          authorization: 'Bearer test-token',
        },
        payload: {
          title: 'Updated Content',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.content.title).toBe('Updated Content');
    });
  });

  describe('POST /items/:id/publish', () => {
    it('should publish content item', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/content/items/content-123/publish',
        headers: {
          authorization: 'Bearer test-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.content.status).toBe('published');
    });
  });

  describe('POST /items/:id/archive', () => {
    it('should archive content item', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/content/items/content-123/archive',
        headers: {
          authorization: 'Bearer test-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.content.status).toBe('archived');
    });
  });

  describe('DELETE /items/:id', () => {
    it('should delete content item', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/content/items/content-123',
        headers: {
          authorization: 'Bearer test-token',
        },
      });

      expect(response.statusCode).toBe(204);
    });
  });

  describe('GET /items', () => {
    it('should query content items', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/content/items?status=published&limit=10',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.items).toHaveLength(2);
      expect(body.total).toBe(2);
    });
  });

  describe('GET /items/:id/deliver', () => {
    it('should return optimized content', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/content/items/content-123/deliver?network=3g',
        headers: {
          authorization: 'Bearer test-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.content).toBeDefined();
      expect(body.bandwidth_estimate_kb).toBeDefined();
    });
  });

  describe('POST /items/:contentId/variants', () => {
    it('should create content variant', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/content/items/content-123/variants',
        payload: {
          variant_type: 'low_quality',
          optimized_for_network: '3g',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.variant.variant_type).toBe('low_quality');
    });
  });

  describe('GET /items/:contentId/variants', () => {
    it('should return content variants', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/content/items/content-123/variants',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.variants).toHaveLength(2);
    });
  });

  describe('POST /items/:contentId/transcode', () => {
    it('should queue transcoding jobs', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/content/items/content-123/transcode',
        headers: {
          authorization: 'Bearer test-token',
        },
        payload: {
          generate_text_alternative: true,
        },
      });

      expect(response.statusCode).toBe(202);
      const body = JSON.parse(response.body);
      expect(body.jobs_count).toBe(2);
    });
  });

  describe('GET /items/:contentId/transcode/status', () => {
    it('should return transcoding status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/content/items/content-123/transcode/status',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.total_variants).toBe(3);
    });
  });

  describe('POST /items/:contentId/translations', () => {
    it('should create translation', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/content/items/content-123/translations',
        headers: {
          authorization: 'Bearer test-token',
        },
        payload: {
          language_code: 'es',
          title: 'Título en español',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.translation.language_code).toBe('es');
    });
  });

  describe('GET /items/:contentId/translations', () => {
    it('should return translations', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/content/items/content-123/translations',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.translations).toHaveLength(2);
    });
  });

  describe('GET /items/:contentId/translations/:language', () => {
    it('should return specific translation', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/content/items/content-123/translations/es',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.translation.language_code).toBe('es');
    });

    it('should return 404 for non-existent translation', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/content/items/content-123/translations/de',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /items/:contentId/captions', () => {
    it('should create captions', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/content/items/content-123/captions',
        headers: {
          authorization: 'Bearer test-token',
        },
        payload: {
          language_code: 'en',
          label: 'English',
          format: 'vtt',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.caption.language_code).toBe('en');
    });
  });

  describe('POST /items/:contentId/sandbox', () => {
    it('should create code sandbox', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/content/items/content-123/sandbox',
        payload: {
          language: 'javascript',
          starter_code: 'function test() {}',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.sandbox.language).toBe('javascript');
    });
  });

  describe('GET /items/:contentId/sandbox', () => {
    it('should return code sandbox', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/content/items/content-123/sandbox',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.sandbox.language).toBe('javascript');
    });
  });

  describe('POST /items/:contentId/interactive', () => {
    it('should create interactive element', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/content/items/content-123/interactive',
        payload: {
          element_type: 'quiz_widget',
          title: 'Quick Quiz',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.element.element_type).toBe('quiz_widget');
    });
  });

  describe('POST /items/:id/accessibility/check', () => {
    it('should run accessibility check', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/content/items/content-123/accessibility/check',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.report.overall_score).toBe(85);
    });
  });

  describe('GET /bandwidth-profile', () => {
    it('should return bandwidth profile', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/content/bandwidth-profile',
        headers: {
          authorization: 'Bearer test-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.profile.preferred_quality).toBe('auto');
    });
  });

  describe('PATCH /bandwidth-profile', () => {
    it('should update bandwidth profile', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/content/bandwidth-profile',
        headers: {
          authorization: 'Bearer test-token',
        },
        payload: {
          preferred_quality: 'low',
          text_only_mode: true,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.profile.preferred_quality).toBe('low');
      expect(body.profile.text_only_mode).toBe(true);
    });
  });

  describe('GET /statistics', () => {
    it('should return content statistics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/content/statistics',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.statistics.total_items).toBe(100);
    });
  });

  describe('GET /items/:id/bandwidth-estimate', () => {
    it('should return bandwidth estimate', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/content/items/content-123/bandwidth-estimate?network=3g',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.estimate.savings_percent).toBe(70);
    });
  });
});
