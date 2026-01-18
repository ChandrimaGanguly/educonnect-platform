/**
 * Content Authoring Service Tests
 *
 * Tests for content authoring tools including:
 * - Draft management
 * - Content block operations
 * - Version management
 * - Content validation
 */

import { getDatabase } from '../database';
import { ContentAuthoringService } from './content-authoring.service';

// Mock the database module
jest.mock('../database', () => ({
  getDatabase: jest.fn(),
}));

describe('ContentAuthoringService', () => {
  let service: ContentAuthoringService;
  let mockDb: any;
  let mockQueryBuilder: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockQueryBuilder = {
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      whereNull: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(null),
      returning: jest.fn().mockResolvedValue([]),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
      raw: jest.fn(),
      then: jest.fn((resolve) => resolve([])),
    };

    mockDb = jest.fn(() => mockQueryBuilder);
    mockDb.fn = { now: jest.fn().mockReturnValue('NOW()') };
    mockDb.raw = jest.fn((sql) => ({ toSQL: () => ({ sql }) }));
    mockDb.transaction = jest.fn(async (callback) => await callback(mockDb));

    (getDatabase as jest.Mock).mockReturnValue(mockDb);

    service = new ContentAuthoringService();
  });

  describe('Draft Management', () => {
    const mockDraftRow = {
      id: 'draft-123',
      content_type: 'lesson',
      content_id: null,
      community_id: 'comm-123',
      title: 'Test Lesson',
      description: 'A test lesson',
      slug: null,
      content_blocks: '[]',
      raw_content: null,
      content_format: 'blocks',
      status: 'editing',
      is_auto_saved: false,
      last_edited_at: new Date(),
      version: 1,
      parent_version_id: null,
      accessibility_checked: false,
      accessibility_score: null,
      accessibility_issues: '[]',
      content_validated: false,
      validation_errors: '[]',
      estimated_minutes: null,
      estimated_bandwidth_kb: null,
      word_count: 0,
      author_id: 'user-123',
      last_edited_by: 'user-123',
      created_at: new Date(),
      updated_at: new Date(),
    };

    describe('createDraft', () => {
      it('should create a new draft', async () => {
        mockQueryBuilder.returning.mockResolvedValue([mockDraftRow]);

        const result = await service.createDraft('user-123', {
          content_type: 'lesson',
          community_id: 'comm-123',
          title: 'Test Lesson',
          description: 'A test lesson',
        });

        expect(mockDb).toHaveBeenCalledWith('content_drafts');
        expect(result.id).toBe('draft-123');
        expect(result.title).toBe('Test Lesson');
        expect(result.status).toBe('editing');
      });

      it('should default to blocks format', async () => {
        mockQueryBuilder.returning.mockResolvedValue([mockDraftRow]);

        const result = await service.createDraft('user-123', {
          content_type: 'lesson',
          community_id: 'comm-123',
          title: 'Test Lesson',
        });

        expect(result.content_format).toBe('blocks');
      });
    });

    describe('getDraftById', () => {
      it('should return draft by ID', async () => {
        mockQueryBuilder.first.mockResolvedValue(mockDraftRow);

        const result = await service.getDraftById('draft-123');

        expect(mockDb).toHaveBeenCalledWith('content_drafts');
        expect(result).not.toBeNull();
        expect(result?.id).toBe('draft-123');
      });

      it('should return null for non-existent draft', async () => {
        mockQueryBuilder.first.mockResolvedValue(null);

        const result = await service.getDraftById('non-existent');

        expect(result).toBeNull();
      });
    });

    describe('getUserDrafts', () => {
      it('should return user drafts with pagination', async () => {
        mockQueryBuilder.count.mockResolvedValue([{ count: '5' }]);
        mockQueryBuilder.then = jest.fn((resolve) => resolve([mockDraftRow]));

        const result = await service.getUserDrafts('user-123', 'comm-123', {
          limit: 20,
          offset: 0,
        });

        expect(result.total).toBe(5);
        expect(result.drafts).toHaveLength(1);
      });

      it('should filter by status', async () => {
        mockQueryBuilder.count.mockResolvedValue([{ count: '2' }]);
        mockQueryBuilder.then = jest.fn((resolve) => resolve([mockDraftRow]));

        await service.getUserDrafts('user-123', 'comm-123', {
          status: 'editing',
        });

        expect(mockQueryBuilder.where).toHaveBeenCalled();
      });
    });

    describe('updateDraft', () => {
      it('should update draft content', async () => {
        const updatedDraft = {
          ...mockDraftRow,
          title: 'Updated Title',
        };
        mockQueryBuilder.returning.mockResolvedValue([updatedDraft]);

        const result = await service.updateDraft('draft-123', 'user-123', {
          title: 'Updated Title',
        });

        expect(mockDb).toHaveBeenCalledWith('content_drafts');
        expect(result.title).toBe('Updated Title');
      });

      it('should recalculate word count when content_blocks updated', async () => {
        const blocks = [
          { block_type: 'paragraph', content: { text: 'Hello world' }, order_index: 0 },
        ];
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockDraftRow,
          content_blocks: JSON.stringify(blocks),
          word_count: 2,
        }]);

        const result = await service.updateDraft('draft-123', 'user-123', {
          content_blocks: blocks as any,
        });

        expect(result.word_count).toBe(2);
      });
    });

    describe('autoSaveDraft', () => {
      it('should auto-save with is_auto_saved flag', async () => {
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockDraftRow,
          is_auto_saved: true,
        }]);

        const result = await service.autoSaveDraft('draft-123', 'user-123', []);

        expect(result.is_auto_saved).toBe(true);
      });
    });

    describe('submitForReview', () => {
      it('should update status to ready_for_review', async () => {
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockDraftRow,
          status: 'ready_for_review',
        }]);

        const result = await service.submitForReview('draft-123', 'user-123');

        expect(result.status).toBe('ready_for_review');
      });
    });

    describe('deleteDraft', () => {
      it('should delete draft', async () => {
        mockQueryBuilder.delete.mockResolvedValue(1);

        await service.deleteDraft('draft-123');

        expect(mockDb).toHaveBeenCalledWith('content_drafts');
        expect(mockQueryBuilder.delete).toHaveBeenCalled();
      });
    });
  });

  describe('Content Block Management', () => {
    const mockBlockRow = {
      id: 'block-123',
      draft_id: 'draft-123',
      block_type: 'paragraph',
      content: '{"text": "Hello world"}',
      plain_text: 'Hello world',
      attributes: '{}',
      metadata: '{}',
      order_index: 0,
      parent_block_id: null,
      has_accessibility_issues: false,
      accessibility_notes: '[]',
      created_at: new Date(),
      updated_at: new Date(),
    };

    describe('addBlock', () => {
      it('should add a new block to draft', async () => {
        mockQueryBuilder.returning.mockResolvedValue([mockBlockRow]);

        const result = await service.addBlock('draft-123', {
          block_type: 'paragraph',
          content: { text: 'Hello world' },
          order_index: 0,
        });

        expect(mockDb).toHaveBeenCalledWith('content_blocks');
        expect(result.id).toBe('block-123');
        expect(result.block_type).toBe('paragraph');
      });
    });

    describe('updateBlock', () => {
      it('should update block content', async () => {
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockBlockRow,
          content: '{"text": "Updated text"}',
        }]);

        const result = await service.updateBlock('block-123', {
          content: { text: 'Updated text' },
        });

        expect(result.content.text).toBe('Updated text');
      });
    });

    describe('deleteBlock', () => {
      it('should delete block', async () => {
        mockQueryBuilder.delete.mockResolvedValue(1);

        await service.deleteBlock('block-123');

        expect(mockDb).toHaveBeenCalledWith('content_blocks');
      });
    });

    describe('getDraftBlocks', () => {
      it('should return blocks ordered by order_index', async () => {
        mockQueryBuilder.then = jest.fn((resolve) => resolve([mockBlockRow]));

        const result = await service.getDraftBlocks('draft-123');

        expect(result).toHaveLength(1);
        expect(result[0].order_index).toBe(0);
      });
    });

    describe('reorderBlocks', () => {
      it('should reorder blocks in transaction', async () => {
        await service.reorderBlocks('draft-123', [
          { id: 'block-1', order_index: 1 },
          { id: 'block-2', order_index: 0 },
        ]);

        expect(mockDb.transaction).toHaveBeenCalled();
      });
    });
  });

  describe('Version Management', () => {
    const mockVersionRow = {
      id: 'version-123',
      lesson_id: 'lesson-123',
      module_id: null,
      course_id: null,
      version_number: 1,
      version_label: null,
      change_summary: 'Initial version',
      changes: '[]',
      content_snapshot: '{"title": "Test"}',
      blocks_snapshot: null,
      metadata_snapshot: null,
      status: 'draft',
      is_current: true,
      created_by: 'user-123',
      published_by: null,
      published_at: null,
      created_at: new Date(),
    };

    describe('createVersion', () => {
      it('should create first version', async () => {
        mockQueryBuilder.first.mockResolvedValue(null);
        mockQueryBuilder.returning.mockResolvedValue([mockVersionRow]);

        const result = await service.createVersion('user-123', {
          lesson_id: 'lesson-123',
          content_snapshot: { title: 'Test' },
          change_summary: 'Initial version',
        });

        expect(result.version_number).toBe(1);
        expect(result.is_current).toBe(true);
      });

      it('should increment version number', async () => {
        mockQueryBuilder.first.mockResolvedValue({ version_number: 1, id: 'prev-version' });
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockVersionRow,
          version_number: 2,
        }]);

        const result = await service.createVersion('user-123', {
          lesson_id: 'lesson-123',
          content_snapshot: { title: 'Updated' },
        });

        expect(result.version_number).toBe(2);
      });
    });

    describe('getVersionHistory', () => {
      it('should return version history', async () => {
        mockQueryBuilder.count.mockResolvedValue([{ count: '3' }]);
        mockQueryBuilder.then = jest.fn((resolve) => resolve([mockVersionRow]));

        const result = await service.getVersionHistory('lesson', 'lesson-123');

        expect(result.total).toBe(3);
        expect(result.versions).toHaveLength(1);
      });
    });

    describe('publishVersion', () => {
      it('should publish version', async () => {
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockVersionRow,
          status: 'published',
          published_by: 'user-123',
          published_at: new Date(),
        }]);

        const result = await service.publishVersion('version-123', 'user-123');

        expect(result.status).toBe('published');
        expect(result.published_by).toBe('user-123');
      });
    });

    describe('restoreVersion', () => {
      it('should restore a previous version', async () => {
        mockQueryBuilder.first.mockResolvedValueOnce(mockVersionRow);
        mockQueryBuilder.first.mockResolvedValueOnce(null);
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockVersionRow,
          version_number: 2,
          change_summary: 'Restored from version 1',
        }]);

        const result = await service.restoreVersion('version-123', 'user-123');

        expect(result.change_summary).toContain('Restored');
      });
    });
  });

  describe('Content Validation', () => {
    describe('validateDraft', () => {
      it('should detect missing title', async () => {
        mockQueryBuilder.first.mockResolvedValue({
          id: 'draft-123',
          title: '',
          content_format: 'blocks',
          content_blocks: '[]',
          word_count: 0,
        });
        mockQueryBuilder.returning.mockResolvedValue([{}]);

        const result = await service.validateDraft('draft-123');

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.field === 'title')).toBe(true);
      });

      it('should detect empty content', async () => {
        mockQueryBuilder.first.mockResolvedValue({
          id: 'draft-123',
          title: 'Test',
          content_format: 'blocks',
          content_blocks: '[]',
          word_count: 0,
        });
        mockQueryBuilder.returning.mockResolvedValue([{}]);

        const result = await service.validateDraft('draft-123');

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.field === 'content_blocks')).toBe(true);
      });

      it('should warn for low word count', async () => {
        mockQueryBuilder.first.mockResolvedValue({
          id: 'draft-123',
          title: 'Test',
          content_format: 'blocks',
          content_blocks: '[{"block_type": "paragraph", "content": {"text": "Short"}}]',
          word_count: 50,
        });
        mockQueryBuilder.returning.mockResolvedValue([{}]);

        const result = await service.validateDraft('draft-123');

        expect(result.errors.some(e => e.field === 'word_count' && e.severity === 'warning')).toBe(true);
      });

      it('should validate image blocks for alt text', async () => {
        mockQueryBuilder.first.mockResolvedValue({
          id: 'draft-123',
          title: 'Test',
          content_format: 'blocks',
          content_blocks: JSON.stringify([
            {
              block_type: 'image',
              content: { src: 'test.jpg' },
              order_index: 0,
            },
          ]),
          word_count: 100,
        });
        mockQueryBuilder.returning.mockResolvedValue([{}]);

        const result = await service.validateDraft('draft-123');

        expect(result.errors.some(e => e.field.includes('content.alt'))).toBe(true);
      });

      it('should pass validation for valid content', async () => {
        mockQueryBuilder.first.mockResolvedValue({
          id: 'draft-123',
          title: 'Valid Test Lesson',
          content_format: 'blocks',
          content_blocks: JSON.stringify([
            {
              block_type: 'paragraph',
              content: { text: 'This is a paragraph with enough content to pass validation checks.' },
              order_index: 0,
            },
          ]),
          word_count: 200,
        });
        mockQueryBuilder.returning.mockResolvedValue([{}]);

        const result = await service.validateDraft('draft-123');

        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Estimated Metrics', () => {
    describe('calculateEstimatedMinutes', () => {
      it('should calculate reading time from word count', () => {
        const draft = {
          word_count: 400,
          content_blocks: [],
        } as any;

        const result = service.calculateEstimatedMinutes(draft);

        expect(result).toBe(2); // 400 words / 200 wpm = 2 minutes
      });

      it('should include video duration', () => {
        const draft = {
          word_count: 200,
          content_blocks: [
            { block_type: 'video', content: { duration: 300 } }, // 5 minutes
          ],
        } as any;

        const result = service.calculateEstimatedMinutes(draft);

        expect(result).toBe(6); // 1 min reading + 5 min video
      });
    });

    describe('generateSlug', () => {
      it('should generate slug from title', () => {
        const slug = service.generateSlug('My Test Lesson');

        expect(slug).toMatch(/^my-test-lesson-[a-z0-9]+$/);
      });

      it('should handle special characters', () => {
        const slug = service.generateSlug("What's New? (2024)");

        expect(slug).toMatch(/^what-s-new-2024-[a-z0-9]+$/);
      });
    });
  });
});
