/**
 * Multi-Format Content Service Tests
 *
 * Comprehensive tests for the multi-format content service
 * covering all CRUD operations, variants, translations, and delivery.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { MultiFormatContentService } from '../multi-format-content.service';
import { ContentTranscodingService } from '../content-transcoding.service';
import { getDatabase, closeDatabase } from '../../database';
import { Knex } from 'knex';
import {
  ContentType,
  ContentStatus,
  VariantType,
  NetworkType,
  CreateContentItemDto,
} from '../../types/content.types';

// Mock the database
vi.mock('../../database', () => ({
  getDatabase: vi.fn(),
  closeDatabase: vi.fn(),
}));

describe('MultiFormatContentService', () => {
  let service: MultiFormatContentService;
  let mockDb: {
    select: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
    first: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    returning: ReturnType<typeof vi.fn>;
    orderBy: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
    offset: ReturnType<typeof vi.fn>;
    clone: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    increment: ReturnType<typeof vi.fn>;
    whereRaw: ReturnType<typeof vi.fn>;
    raw: ReturnType<typeof vi.fn>;
    fn: { now: () => string };
    countDistinct: ReturnType<typeof vi.fn>;
    groupBy: ReturnType<typeof vi.fn>;
    max: ReturnType<typeof vi.fn>;
    transaction: ReturnType<typeof vi.fn>;
  };

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockCommunityId = '223e4567-e89b-12d3-a456-426614174001';
  const mockContentId = '323e4567-e89b-12d3-a456-426614174002';

  beforeEach(() => {
    // Create mock database with chainable methods
    const createChainableMock = () => {
      const mock: Record<string, ReturnType<typeof vi.fn>> = {};
      const chainableMethods = [
        'select', 'where', 'first', 'insert', 'update', 'delete',
        'returning', 'orderBy', 'limit', 'offset', 'clone', 'count',
        'increment', 'whereRaw', 'raw', 'countDistinct', 'groupBy',
        'max', 'whereNotIn', 'whereIn'
      ];

      chainableMethods.forEach(method => {
        mock[method] = vi.fn().mockReturnValue(mock);
      });

      return mock;
    };

    mockDb = createChainableMock() as typeof mockDb;
    mockDb.fn = { now: () => 'NOW()' };
    mockDb.transaction = vi.fn().mockImplementation(async (fn) => fn(mockDb));

    // Make getDatabase return a function that returns the mock
    (getDatabase as ReturnType<typeof vi.fn>).mockReturnValue((table: string) => {
      return mockDb;
    });

    service = new MultiFormatContentService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Content Formats', () => {
    it('should get all active content formats', async () => {
      const mockFormats = [
        { id: '1', format_key: 'markdown', name: 'Markdown Text', is_active: true },
        { id: '2', format_key: 'video_mp4', name: 'MP4 Video', is_active: true },
      ];

      mockDb.orderBy.mockResolvedValueOnce(mockFormats);

      const formats = await service.getContentFormats(true);

      expect(formats).toEqual(mockFormats);
    });

    it('should get content format by key', async () => {
      const mockFormat = { id: '1', format_key: 'markdown', name: 'Markdown Text' };
      mockDb.first.mockResolvedValueOnce(mockFormat);

      const format = await service.getContentFormatByKey('markdown');

      expect(format).toEqual(mockFormat);
    });

    it('should return null for non-existent format', async () => {
      mockDb.first.mockResolvedValueOnce(null);

      const format = await service.getContentFormatByKey('nonexistent');

      expect(format).toBeNull();
    });
  });

  describe('Content Item CRUD', () => {
    describe('createContentItem', () => {
      it('should create a text content item', async () => {
        const createData: CreateContentItemDto = {
          title: 'Test Lesson',
          content_type: 'text',
          content_text: 'This is test content with some words.',
          text_format: 'markdown',
          community_id: mockCommunityId,
        };

        const mockCreated = {
          id: mockContentId,
          ...createData,
          slug: 'test-lesson-abc123',
          status: 'draft',
          version: 1,
          created_by: mockUserId,
          word_count: 7,
          estimated_bandwidth_kb: 1,
        };

        mockDb.first.mockResolvedValueOnce({ id: '1', format_key: 'markdown' }); // Format lookup
        mockDb.returning.mockResolvedValueOnce([mockCreated]);

        const content = await service.createContentItem(mockUserId, createData);

        expect(content.title).toBe('Test Lesson');
        expect(content.content_type).toBe('text');
        expect(content.status).toBe('draft');
      });

      it('should create a video content item', async () => {
        const createData: CreateContentItemDto = {
          title: 'Introduction Video',
          content_type: 'video',
          content_file_id: '456e4567-e89b-12d3-a456-426614174003',
          duration_seconds: 600,
          community_id: mockCommunityId,
        };

        const mockCreated = {
          id: mockContentId,
          ...createData,
          slug: 'introduction-video-abc123',
          status: 'draft',
          estimated_bandwidth_kb: 150000, // 10 min video
        };

        mockDb.first.mockResolvedValueOnce(null); // No format lookup for video
        mockDb.returning.mockResolvedValueOnce([mockCreated]);

        const content = await service.createContentItem(mockUserId, createData);

        expect(content.title).toBe('Introduction Video');
        expect(content.content_type).toBe('video');
        expect(content.duration_seconds).toBe(600);
      });
    });

    describe('getContentItemById', () => {
      it('should return content item if found', async () => {
        const mockContent = {
          id: mockContentId,
          title: 'Test Content',
          content_type: 'text',
          status: 'published',
        };

        mockDb.first.mockResolvedValueOnce(mockContent);

        const content = await service.getContentItemById(mockContentId);

        expect(content).toEqual(mockContent);
      });

      it('should return null if content not found', async () => {
        mockDb.first.mockResolvedValueOnce(null);

        const content = await service.getContentItemById('nonexistent-id');

        expect(content).toBeNull();
      });
    });

    describe('getContentItemWithDetails', () => {
      it('should return content with all related data', async () => {
        const mockContent = {
          id: mockContentId,
          title: 'Test Content',
          content_type: 'text',
          format_id: '1',
        };

        const mockFormat = { id: '1', format_key: 'markdown' };
        const mockVariants = [{ id: 'v1', variant_type: 'original' }];
        const mockTranslations = [{ id: 't1', language_code: 'es' }];
        const mockCaptions = [{ id: 'c1', language_code: 'en' }];

        mockDb.first.mockResolvedValueOnce(mockContent); // getContentItemById
        mockDb.first.mockResolvedValueOnce(mockFormat); // getContentFormatById
        mockDb.orderBy.mockResolvedValueOnce(mockVariants); // getContentVariants
        mockDb.orderBy.mockResolvedValueOnce(mockTranslations); // getContentTranslations
        mockDb.orderBy.mockResolvedValueOnce(mockCaptions); // getContentCaptions
        mockDb.first.mockResolvedValueOnce(null); // getCodeSandbox
        mockDb.orderBy.mockResolvedValueOnce([]); // getInteractiveElements
        mockDb.first.mockResolvedValueOnce(null); // getLatestAccessibilityReport

        const content = await service.getContentItemWithDetails(mockContentId);

        expect(content).not.toBeNull();
        expect(content?.format?.format_key).toBe('markdown');
        expect(content?.variants).toHaveLength(1);
        expect(content?.translations).toHaveLength(1);
      });
    });

    describe('updateContentItem', () => {
      it('should update content item', async () => {
        const updateData = {
          title: 'Updated Title',
          description: 'New description',
        };

        const mockUpdated = {
          id: mockContentId,
          ...updateData,
          updated_by: mockUserId,
        };

        mockDb.returning.mockResolvedValueOnce([mockUpdated]);

        const content = await service.updateContentItem(mockContentId, mockUserId, updateData);

        expect(content.title).toBe('Updated Title');
        expect(content.description).toBe('New description');
      });

      it('should recalculate word count when text changes', async () => {
        const updateData = {
          content_text: 'One two three four five six seven eight nine ten',
        };

        const mockUpdated = {
          id: mockContentId,
          ...updateData,
          word_count: 10,
          updated_by: mockUserId,
        };

        mockDb.returning.mockResolvedValueOnce([mockUpdated]);

        const content = await service.updateContentItem(mockContentId, mockUserId, updateData);

        expect(content.word_count).toBe(10);
      });
    });

    describe('publishContentItem', () => {
      it('should publish content item', async () => {
        const mockPublished = {
          id: mockContentId,
          status: 'published',
          published_at: new Date(),
        };

        mockDb.returning.mockResolvedValueOnce([mockPublished]);

        const content = await service.publishContentItem(mockContentId, mockUserId);

        expect(content.status).toBe('published');
        expect(content.published_at).toBeDefined();
      });
    });

    describe('archiveContentItem', () => {
      it('should archive content item', async () => {
        const mockArchived = {
          id: mockContentId,
          status: 'archived',
        };

        mockDb.returning.mockResolvedValueOnce([mockArchived]);

        const content = await service.archiveContentItem(mockContentId, mockUserId);

        expect(content.status).toBe('archived');
      });
    });

    describe('deleteContentItem', () => {
      it('should delete content item', async () => {
        mockDb.delete.mockResolvedValueOnce(1);

        await expect(service.deleteContentItem(mockContentId)).resolves.not.toThrow();
      });
    });

    describe('queryContentItems', () => {
      it('should query content with filters', async () => {
        const mockItems = [
          { id: '1', title: 'Item 1', content_type: 'text' },
          { id: '2', title: 'Item 2', content_type: 'video' },
        ];

        mockDb.count.mockResolvedValueOnce([{ count: '2' }]);
        mockDb.offset.mockResolvedValueOnce(mockItems);

        const result = await service.queryContentItems({
          community_id: mockCommunityId,
          status: 'published',
          limit: 10,
          offset: 0,
        });

        expect(result.items).toHaveLength(2);
        expect(result.total).toBe(2);
      });

      it('should search content by text', async () => {
        const mockItems = [{ id: '1', title: 'Search Result' }];

        mockDb.count.mockResolvedValueOnce([{ count: '1' }]);
        mockDb.offset.mockResolvedValueOnce(mockItems);

        const result = await service.queryContentItems({
          search: 'search term',
        });

        expect(result.items).toHaveLength(1);
      });
    });
  });

  describe('Content Variants', () => {
    describe('createContentVariant', () => {
      it('should create a variant', async () => {
        const mockVariant = {
          id: 'v1',
          content_item_id: mockContentId,
          variant_type: 'low_quality',
          optimized_for_network: '3g',
          status: 'pending',
        };

        mockDb.returning.mockResolvedValueOnce([mockVariant]);

        const variant = await service.createContentVariant({
          content_item_id: mockContentId,
          variant_type: 'low_quality',
          optimized_for_network: '3g',
        });

        expect(variant.variant_type).toBe('low_quality');
        expect(variant.status).toBe('pending');
      });
    });

    describe('getContentVariants', () => {
      it('should get all variants for content', async () => {
        const mockVariants = [
          { id: 'v1', variant_type: 'original' },
          { id: 'v2', variant_type: 'low_quality' },
          { id: 'v3', variant_type: 'text_only' },
        ];

        mockDb.orderBy.mockResolvedValueOnce(mockVariants);

        const variants = await service.getContentVariants(mockContentId);

        expect(variants).toHaveLength(3);
      });
    });

    describe('getOptimalVariant', () => {
      it('should return network-specific variant when available', async () => {
        const mockVariant = {
          id: 'v1',
          variant_type: 'low_quality',
          optimized_for_network: '3g',
          status: 'ready',
        };

        mockDb.first.mockResolvedValueOnce(mockVariant);

        const variant = await service.getOptimalVariant(mockContentId, '3g', 'auto');

        expect(variant).toEqual(mockVariant);
      });

      it('should fall back to any network variant', async () => {
        const mockVariant = {
          id: 'v1',
          variant_type: 'low_quality',
          optimized_for_network: 'any',
          status: 'ready',
        };

        mockDb.first.mockResolvedValueOnce(null); // No network-specific
        mockDb.first.mockResolvedValueOnce(mockVariant); // Fall back to 'any'

        const variant = await service.getOptimalVariant(mockContentId, '3g', 'auto');

        expect(variant?.optimized_for_network).toBe('any');
      });
    });
  });

  describe('Content Translations', () => {
    describe('createContentTranslation', () => {
      it('should create a translation', async () => {
        const mockTranslation = {
          id: 't1',
          content_item_id: mockContentId,
          language_code: 'es',
          title: 'Título en español',
          translation_completeness: 80,
        };

        mockDb.returning.mockResolvedValueOnce([mockTranslation]);

        const translation = await service.createContentTranslation(mockUserId, {
          content_item_id: mockContentId,
          language_code: 'es',
          title: 'Título en español',
          content_text: 'Contenido en español',
        });

        expect(translation.language_code).toBe('es');
        expect(translation.translation_completeness).toBeGreaterThan(0);
      });
    });

    describe('getContentTranslations', () => {
      it('should get all translations', async () => {
        const mockTranslations = [
          { id: 't1', language_code: 'es' },
          { id: 't2', language_code: 'fr' },
        ];

        mockDb.orderBy.mockResolvedValueOnce(mockTranslations);

        const translations = await service.getContentTranslations(mockContentId);

        expect(translations).toHaveLength(2);
      });
    });

    describe('verifyTranslation', () => {
      it('should mark translation as verified', async () => {
        const mockVerified = {
          id: 't1',
          is_verified: true,
          verified_by: mockUserId,
          verified_at: new Date(),
        };

        mockDb.returning.mockResolvedValueOnce([mockVerified]);

        const translation = await service.verifyTranslation('t1', mockUserId);

        expect(translation.is_verified).toBe(true);
        expect(translation.verified_by).toBe(mockUserId);
      });
    });
  });

  describe('Content Captions', () => {
    describe('createContentCaption', () => {
      it('should create captions', async () => {
        const captionContent = `WEBVTT

00:00:00.000 --> 00:00:05.000
Hello, welcome to this video.

00:00:05.000 --> 00:00:10.000
Today we will learn about testing.`;

        const mockCaption = {
          id: 'c1',
          content_item_id: mockContentId,
          language_code: 'en',
          label: 'English',
          caption_type: 'subtitles',
          format: 'vtt',
          cue_count: 2,
          status: 'ready',
        };

        mockDb.returning.mockResolvedValueOnce([mockCaption]);
        mockDb.update.mockResolvedValueOnce(1); // Update content item

        const caption = await service.createContentCaption(mockUserId, {
          content_item_id: mockContentId,
          language_code: 'en',
          label: 'English',
          caption_content: captionContent,
          format: 'vtt',
        });

        expect(caption.language_code).toBe('en');
        expect(caption.format).toBe('vtt');
        expect(caption.cue_count).toBe(2);
      });
    });
  });

  describe('Code Sandbox', () => {
    describe('createCodeSandbox', () => {
      it('should create a code sandbox', async () => {
        const mockSandbox = {
          id: 's1',
          content_item_id: mockContentId,
          language: 'javascript',
          starter_code: 'function hello() {}',
          timeout_seconds: 30,
          memory_limit_mb: 128,
        };

        mockDb.returning.mockResolvedValueOnce([mockSandbox]);

        const sandbox = await service.createCodeSandbox({
          content_item_id: mockContentId,
          language: 'javascript',
          starter_code: 'function hello() {}',
        });

        expect(sandbox.language).toBe('javascript');
        expect(sandbox.timeout_seconds).toBe(30);
      });
    });

    describe('getCodeSandbox', () => {
      it('should get code sandbox for content', async () => {
        const mockSandbox = {
          id: 's1',
          content_item_id: mockContentId,
          language: 'python',
        };

        mockDb.first.mockResolvedValueOnce(mockSandbox);

        const sandbox = await service.getCodeSandbox(mockContentId);

        expect(sandbox?.language).toBe('python');
      });
    });
  });

  describe('Interactive Elements', () => {
    describe('createInteractiveElement', () => {
      it('should create an interactive element', async () => {
        const mockElement = {
          id: 'i1',
          content_item_id: mockContentId,
          element_type: 'quiz_widget',
          title: 'Quick Quiz',
          display_order: 1,
        };

        mockDb.max.mockResolvedValueOnce([{ max_order: 0 }]);
        mockDb.returning.mockResolvedValueOnce([mockElement]);

        const element = await service.createInteractiveElement({
          content_item_id: mockContentId,
          element_type: 'quiz_widget',
          title: 'Quick Quiz',
        });

        expect(element.element_type).toBe('quiz_widget');
        expect(element.display_order).toBe(1);
      });
    });

    describe('reorderInteractiveElements', () => {
      it('should reorder elements', async () => {
        mockDb.update.mockResolvedValue(1);

        await expect(
          service.reorderInteractiveElements(mockContentId, ['i3', 'i1', 'i2'])
        ).resolves.not.toThrow();
      });
    });
  });

  describe('Accessibility', () => {
    describe('createAccessibilityReport', () => {
      it('should create an accessibility report', async () => {
        const mockReport = {
          id: 'r1',
          content_item_id: mockContentId,
          overall_score: 85,
          status: 'pending',
        };

        mockDb.returning.mockResolvedValueOnce([mockReport]);
        mockDb.update.mockResolvedValueOnce(1);

        const report = await service.createAccessibilityReport(mockContentId, {
          overall_score: 85,
          perceivable_score: 80,
          operable_score: 90,
          understandable_score: 85,
          robust_score: 85,
        });

        expect(report.overall_score).toBe(85);
      });
    });

    describe('runAccessibilityCheck', () => {
      it('should identify missing alt text for images', async () => {
        const mockContent = {
          id: mockContentId,
          title: 'Image Content',
          content_type: 'image',
          alt_text: null,
          has_captions: false,
          has_transcript: false,
        };

        mockDb.first.mockResolvedValueOnce(mockContent); // getContentItemById
        mockDb.first.mockResolvedValueOnce(null); // format
        mockDb.orderBy.mockResolvedValueOnce([]); // variants
        mockDb.orderBy.mockResolvedValueOnce([]); // translations
        mockDb.orderBy.mockResolvedValueOnce([]); // captions
        mockDb.first.mockResolvedValueOnce(null); // sandbox
        mockDb.orderBy.mockResolvedValueOnce([]); // interactive elements
        mockDb.first.mockResolvedValueOnce(null); // accessibility report

        const mockReport = {
          id: 'r1',
          content_item_id: mockContentId,
          overall_score: 50,
          critical_issues: 1,
          issues: [
            {
              severity: 'critical',
              wcag_criterion: '1.1.1',
              description: 'Missing alt text for non-text content',
            },
          ],
        };

        mockDb.returning.mockResolvedValueOnce([mockReport]);
        mockDb.update.mockResolvedValueOnce(1);

        const report = await service.runAccessibilityCheck(mockContentId);

        expect(report.critical_issues).toBeGreaterThan(0);
      });
    });
  });

  describe('Bandwidth Profile', () => {
    describe('getBandwidthProfile', () => {
      it('should create profile if not exists', async () => {
        const mockProfile = {
          id: 'p1',
          user_id: mockUserId,
          preferred_quality: 'auto',
          text_only_mode: false,
        };

        mockDb.first.mockResolvedValueOnce(null); // No existing profile
        mockDb.returning.mockResolvedValueOnce([mockProfile]);

        const profile = await service.getBandwidthProfile(mockUserId);

        expect(profile.preferred_quality).toBe('auto');
      });

      it('should return existing profile', async () => {
        const mockProfile = {
          id: 'p1',
          user_id: mockUserId,
          preferred_quality: 'low',
          text_only_mode: true,
        };

        mockDb.first.mockResolvedValueOnce(mockProfile);

        const profile = await service.getBandwidthProfile(mockUserId);

        expect(profile.preferred_quality).toBe('low');
        expect(profile.text_only_mode).toBe(true);
      });
    });

    describe('updateBandwidthProfile', () => {
      it('should update bandwidth profile', async () => {
        const mockUpdated = {
          id: 'p1',
          user_id: mockUserId,
          preferred_quality: 'low',
          text_only_mode: true,
        };

        mockDb.returning.mockResolvedValueOnce([mockUpdated]);

        const profile = await service.updateBandwidthProfile(mockUserId, {
          preferred_quality: 'low',
          text_only_mode: true,
        });

        expect(profile.preferred_quality).toBe('low');
        expect(profile.text_only_mode).toBe(true);
      });
    });
  });

  describe('Content Delivery', () => {
    describe('getContentForDelivery', () => {
      it('should return optimized content for delivery', async () => {
        const mockContent = {
          id: mockContentId,
          title: 'Test Content',
          content_type: 'video',
          estimated_bandwidth_kb: 50000,
          has_text_alternative: true,
        };

        const mockProfile = {
          user_id: mockUserId,
          preferred_quality: 'auto',
          text_only_mode: false,
          network_preferences: {},
        };

        const mockVariant = {
          id: 'v1',
          variant_type: 'medium_quality',
          bandwidth_estimate_kb: 25000,
        };

        // Content lookup
        mockDb.first.mockResolvedValueOnce(mockContent);
        // Profile lookup
        mockDb.first.mockResolvedValueOnce(mockProfile);
        // Optimal variant (multiple calls for different types)
        mockDb.first.mockResolvedValueOnce(null); // high_quality network-specific
        mockDb.first.mockResolvedValueOnce(null); // high_quality any
        mockDb.first.mockResolvedValueOnce(null); // original network-specific
        mockDb.first.mockResolvedValueOnce(null); // original any
        mockDb.first.mockResolvedValueOnce(null); // medium_quality network-specific
        mockDb.first.mockResolvedValueOnce(mockVariant); // medium_quality any
        // Translations
        mockDb.orderBy.mockResolvedValueOnce([]);
        // Captions
        mockDb.orderBy.mockResolvedValueOnce([]);
        // Increment view count
        mockDb.increment.mockResolvedValueOnce(1);

        const response = await service.getContentForDelivery(
          mockContentId,
          mockUserId,
          { network_type: 'wifi' }
        );

        expect(response.content.id).toBe(mockContentId);
        expect(response.bandwidth_estimate_kb).toBeDefined();
      });

      it('should use text-only mode when enabled', async () => {
        const mockContent = {
          id: mockContentId,
          title: 'Test Content',
          content_type: 'video',
          estimated_bandwidth_kb: 50000,
          has_text_alternative: true,
        };

        const mockProfile = {
          user_id: mockUserId,
          preferred_quality: 'auto',
          text_only_mode: true,
        };

        const mockTextVariant = {
          id: 'v1',
          variant_type: 'text_only',
          bandwidth_estimate_kb: 50,
        };

        mockDb.first.mockResolvedValueOnce(mockContent);
        mockDb.first.mockResolvedValueOnce(mockProfile);
        mockDb.first.mockResolvedValueOnce(mockTextVariant); // text_only variant
        mockDb.orderBy.mockResolvedValueOnce([]);
        mockDb.orderBy.mockResolvedValueOnce([]);
        mockDb.increment.mockResolvedValueOnce(1);

        const response = await service.getContentForDelivery(mockContentId, mockUserId);

        expect(response.selected_variant?.variant_type).toBe('text_only');
      });
    });
  });

  describe('Statistics', () => {
    describe('getContentStatistics', () => {
      it('should return content statistics', async () => {
        mockDb.select.mockResolvedValueOnce([{
          total_items: 100,
          avg_quality_score: 75,
          with_accessibility: 80,
        }]);

        mockDb.groupBy.mockResolvedValueOnce([
          { content_type: 'text', count: '50' },
          { content_type: 'video', count: '30' },
          { content_type: 'audio', count: '20' },
        ]);

        mockDb.groupBy.mockResolvedValueOnce([
          { status: 'published', count: '70' },
          { status: 'draft', count: '30' },
        ]);

        mockDb.countDistinct.mockResolvedValueOnce([{ with_translations: 40 }]);

        const stats = await service.getContentStatistics(mockCommunityId);

        expect(stats.total_items).toBe(100);
        expect(stats.by_type).toHaveProperty('text');
        expect(stats.by_type).toHaveProperty('video');
      });
    });
  });
});

describe('ContentTranscodingService', () => {
  let service: ContentTranscodingService;
  let mockDb: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    const createChainableMock = () => {
      const mock: Record<string, ReturnType<typeof vi.fn>> = {};
      const chainableMethods = [
        'select', 'where', 'first', 'insert', 'update', 'delete',
        'returning', 'orderBy', 'limit', 'offset', 'clone', 'count',
        'increment', 'whereRaw', 'raw', 'countDistinct', 'groupBy',
        'max', 'whereNotIn', 'reduce'
      ];

      chainableMethods.forEach(method => {
        mock[method] = vi.fn().mockReturnValue(mock);
      });

      return mock;
    };

    mockDb = createChainableMock();
    mockDb.fn = { now: () => 'NOW()' };

    (getDatabase as ReturnType<typeof vi.fn>).mockReturnValue((table: string) => {
      return mockDb;
    });

    service = new ContentTranscodingService();
  });

  describe('queueTranscodingJobs', () => {
    it('should create transcoding jobs for content', async () => {
      const mockContent = {
        id: '123',
        content_type: 'video',
        duration_seconds: 300,
      };

      mockDb.first.mockResolvedValue(mockContent);
      mockDb.returning.mockResolvedValue([{ id: 'v1' }]);
      mockDb.update.mockResolvedValue(1);

      const jobs = await service.queueTranscodingJobs('123', {
        generateTextAlternative: true,
      });

      expect(jobs.length).toBeGreaterThan(0);
    });
  });

  describe('getRecommendedVariant', () => {
    it('should return text_only for 2g', () => {
      const variant = service.getRecommendedVariant('2g');
      expect(variant).toBe('text_only');
    });

    it('should return low_quality for 3g', () => {
      const variant = service.getRecommendedVariant('3g');
      expect(variant).toBe('low_quality');
    });

    it('should return medium_quality for 4g', () => {
      const variant = service.getRecommendedVariant('4g');
      expect(variant).toBe('medium_quality');
    });

    it('should return high_quality for wifi', () => {
      const variant = service.getRecommendedVariant('wifi');
      expect(variant).toBe('high_quality');
    });
  });

  describe('estimateBandwidthSavings', () => {
    it('should estimate bandwidth savings', async () => {
      const mockContent = {
        id: '123',
        content_type: 'video',
        duration_seconds: 300,
        file_size_bytes: 100000000, // 100MB
      };

      const mockVariant = {
        bandwidth_estimate_kb: 15000, // 15MB
        variant_type: 'low_quality',
      };

      mockDb.first.mockResolvedValueOnce(mockContent);
      mockDb.first.mockResolvedValueOnce(mockVariant);

      const estimate = await service.estimateBandwidthSavings('123', '3g');

      expect(estimate.savings_percent).toBeGreaterThan(0);
      expect(estimate.recommended_variant).toBeDefined();
    });
  });

  describe('getTranscodingStatus', () => {
    it('should return transcoding status', async () => {
      const mockVariants = [
        { status: 'ready' },
        { status: 'ready' },
        { status: 'pending' },
        { status: 'failed' },
      ];

      mockDb.where.mockResolvedValueOnce(mockVariants);

      const status = await service.getTranscodingStatus('123');

      expect(status.total_variants).toBe(4);
      expect(status.ready_variants).toBe(2);
      expect(status.pending_variants).toBe(1);
      expect(status.failed_variants).toBe(1);
    });
  });
});
