/**
 * Content Preview Service Tests
 *
 * Tests for content preview and testing capabilities:
 * - Preview link management
 * - Preview access validation
 * - Content rendering for different modes
 * - Content structure testing
 * - Assessment question testing
 */

import { ContentPreviewService } from './content-preview.service';
import { getDatabase } from '../database';

jest.mock('../database', () => ({
  getDatabase: jest.fn(),
}));

describe('ContentPreviewService', () => {
  let service: ContentPreviewService;
  let mockDb: any;
  let mockQueryBuilder: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockQueryBuilder = {
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      whereIn: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(null),
      returning: jest.fn().mockResolvedValue([]),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      then: jest.fn((resolve) => resolve([])),
    };

    mockDb = jest.fn(() => mockQueryBuilder);
    mockDb.fn = { now: jest.fn().mockReturnValue('NOW()') };
    mockDb.raw = jest.fn((sql) => ({ toSQL: () => ({ sql }) }));
    mockDb.transaction = jest.fn(async (callback) => await callback(mockDb));

    (getDatabase as jest.Mock).mockReturnValue(mockDb);

    service = new ContentPreviewService();
  });

  describe('Preview Link Management', () => {
    const mockPreviewRow = {
      id: 'preview-123',
      draft_id: 'draft-123',
      preview_token: 'abc123token',
      preview_mode: 'desktop',
      is_active: true,
      require_auth: false,
      allowed_user_ids: [],
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      view_count: 0,
      last_viewed_at: null,
      created_by: 'user-123',
      created_at: new Date(),
    };

    describe('createPreview', () => {
      it('should create a preview link with default settings', async () => {
        mockQueryBuilder.returning.mockResolvedValue([mockPreviewRow]);

        const result = await service.createPreview('user-123', {
          draft_id: 'draft-123',
        });

        expect(mockDb).toHaveBeenCalledWith('content_previews');
        expect(result.id).toBe('preview-123');
        expect(result.preview_mode).toBe('desktop');
        expect(result.is_active).toBe(true);
      });

      it('should create a preview with custom mode', async () => {
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockPreviewRow,
          preview_mode: 'mobile',
        }]);

        const result = await service.createPreview('user-123', {
          draft_id: 'draft-123',
          preview_mode: 'mobile',
        });

        expect(result.preview_mode).toBe('mobile');
      });

      it('should create a preview with auth requirement', async () => {
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockPreviewRow,
          require_auth: true,
        }]);

        const result = await service.createPreview('user-123', {
          draft_id: 'draft-123',
          require_auth: true,
        });

        expect(result.require_auth).toBe(true);
      });

      it('should create a preview with allowed users', async () => {
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockPreviewRow,
          allowed_user_ids: ['user-1', 'user-2'],
        }]);

        const result = await service.createPreview('user-123', {
          draft_id: 'draft-123',
          allowed_user_ids: ['user-1', 'user-2'],
        });

        expect(result.allowed_user_ids).toEqual(['user-1', 'user-2']);
      });

      it('should set custom expiration time', async () => {
        const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockPreviewRow,
          expires_at: futureDate,
        }]);

        const result = await service.createPreview('user-123', {
          draft_id: 'draft-123',
          expires_in_hours: 48,
        });

        expect(result.expires_at.getTime()).toBeGreaterThan(Date.now());
      });
    });

    describe('getPreview', () => {
      it('should return preview by ID', async () => {
        mockQueryBuilder.first.mockResolvedValue(mockPreviewRow);

        const result = await service.getPreview('preview-123');

        expect(result).not.toBeNull();
        expect(result?.id).toBe('preview-123');
      });

      it('should return null for non-existent preview', async () => {
        mockQueryBuilder.first.mockResolvedValue(null);

        const result = await service.getPreview('non-existent');

        expect(result).toBeNull();
      });
    });

    describe('getPreviewByToken', () => {
      it('should return preview by token', async () => {
        mockQueryBuilder.first.mockResolvedValue(mockPreviewRow);

        const result = await service.getPreviewByToken('abc123token');

        expect(result).not.toBeNull();
        expect(result?.preview_token).toBe('abc123token');
      });
    });

    describe('getDraftPreviews', () => {
      it('should return all previews for a draft', async () => {
        mockQueryBuilder.orderBy.mockResolvedValue([
          mockPreviewRow,
          { ...mockPreviewRow, id: 'preview-456', preview_mode: 'mobile' },
        ]);

        const result = await service.getDraftPreviews('draft-123');

        expect(result).toHaveLength(2);
      });
    });

    describe('updatePreview', () => {
      it('should update preview mode', async () => {
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockPreviewRow,
          preview_mode: 'tablet',
        }]);

        const result = await service.updatePreview('preview-123', {
          preview_mode: 'tablet',
        });

        expect(result.preview_mode).toBe('tablet');
      });

      it('should deactivate preview', async () => {
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockPreviewRow,
          is_active: false,
        }]);

        const result = await service.updatePreview('preview-123', {
          is_active: false,
        });

        expect(result.is_active).toBe(false);
      });
    });

    describe('deactivatePreview', () => {
      it('should deactivate a preview', async () => {
        mockQueryBuilder.update.mockResolvedValue(1);

        await service.deactivatePreview('preview-123');

        expect(mockQueryBuilder.update).toHaveBeenCalledWith({ is_active: false });
      });
    });

    describe('deletePreview', () => {
      it('should delete a preview', async () => {
        mockQueryBuilder.delete.mockResolvedValue(1);

        await service.deletePreview('preview-123');

        expect(mockDb).toHaveBeenCalledWith('content_previews');
      });
    });

    describe('cleanupExpiredPreviews', () => {
      it('should delete expired previews', async () => {
        mockQueryBuilder.delete.mockResolvedValue(5);

        const result = await service.cleanupExpiredPreviews();

        expect(result).toBe(5);
      });
    });
  });

  describe('Preview Access', () => {
    const mockActivePreview = {
      id: 'preview-123',
      draft_id: 'draft-123',
      preview_token: 'valid-token',
      preview_mode: 'desktop',
      is_active: true,
      require_auth: false,
      allowed_user_ids: [],
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      view_count: 0,
      created_by: 'user-123',
      created_at: new Date(),
    };

    describe('validatePreviewAccess', () => {
      it('should validate active preview', async () => {
        mockQueryBuilder.first.mockResolvedValue(mockActivePreview);

        const result = await service.validatePreviewAccess('valid-token');

        expect(result.valid).toBe(true);
        expect(result.preview).toBeDefined();
      });

      it('should reject non-existent preview', async () => {
        mockQueryBuilder.first.mockResolvedValue(null);

        const result = await service.validatePreviewAccess('invalid-token');

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Preview not found');
      });

      it('should reject inactive preview', async () => {
        mockQueryBuilder.first.mockResolvedValue({
          ...mockActivePreview,
          is_active: false,
        });

        const result = await service.validatePreviewAccess('valid-token');

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Preview is inactive');
      });

      it('should reject expired preview', async () => {
        mockQueryBuilder.first.mockResolvedValue({
          ...mockActivePreview,
          expires_at: new Date(Date.now() - 1000),
        });

        const result = await service.validatePreviewAccess('valid-token');

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Preview has expired');
      });

      it('should reject when auth required but no user', async () => {
        mockQueryBuilder.first.mockResolvedValue({
          ...mockActivePreview,
          require_auth: true,
        });

        const result = await service.validatePreviewAccess('valid-token');

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Authentication required');
      });

      it('should accept when auth required and user provided', async () => {
        mockQueryBuilder.first.mockResolvedValue({
          ...mockActivePreview,
          require_auth: true,
        });

        const result = await service.validatePreviewAccess('valid-token', 'user-123');

        expect(result.valid).toBe(true);
      });

      it('should reject unauthorized user', async () => {
        mockQueryBuilder.first.mockResolvedValue({
          ...mockActivePreview,
          allowed_user_ids: ['user-456', 'user-789'],
        });

        const result = await service.validatePreviewAccess('valid-token', 'user-123');

        expect(result.valid).toBe(false);
        expect(result.error).toBe('User not authorized for this preview');
      });

      it('should accept authorized user', async () => {
        mockQueryBuilder.first.mockResolvedValue({
          ...mockActivePreview,
          allowed_user_ids: ['user-123', 'user-456'],
        });

        const result = await service.validatePreviewAccess('valid-token', 'user-123');

        expect(result.valid).toBe(true);
      });
    });

    describe('recordView', () => {
      it('should increment view count', async () => {
        mockQueryBuilder.update.mockResolvedValue(1);

        await service.recordView('preview-123');

        expect(mockQueryBuilder.update).toHaveBeenCalled();
      });
    });
  });

  describe('Preview Rendering', () => {
    const mockDraft = {
      id: 'draft-123',
      title: 'Test Lesson',
      description: 'Test description',
      raw_content: 'Some content',
      content_format: 'blocks',
      word_count: 100,
      estimated_minutes: 5,
      estimated_bandwidth_kb: 50,
      accessibility_checked: true,
      accessibility_score: 85,
      accessibility_issues: '[]',
    };

    const mockBlocks = [
      {
        id: 'block-1',
        draft_id: 'draft-123',
        block_type: 'paragraph',
        content: JSON.stringify({ text: 'Hello world' }),
        order_index: 0,
        attributes: '{}',
      },
      {
        id: 'block-2',
        draft_id: 'draft-123',
        block_type: 'image',
        content: JSON.stringify({ src: '/image.jpg', alt: 'Test image' }),
        order_index: 1,
        attributes: '{}',
      },
    ];

    describe('renderPreview', () => {
      it('should render preview content', async () => {
        // Mock validatePreviewAccess
        mockQueryBuilder.first
          .mockResolvedValueOnce({
            id: 'preview-123',
            draft_id: 'draft-123',
            preview_token: 'valid-token',
            preview_mode: 'desktop',
            is_active: true,
            require_auth: false,
            allowed_user_ids: [],
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
            view_count: 0,
            created_by: 'user-123',
            created_at: new Date(),
          })
          .mockResolvedValueOnce(mockDraft); // getDraft

        mockQueryBuilder.update.mockResolvedValue(1); // recordView
        mockQueryBuilder.orderBy.mockResolvedValue(mockBlocks); // getBlocks

        const result = await service.renderPreview('valid-token');

        expect(result.content.title).toBe('Test Lesson');
        expect(result.content.blocks).toHaveLength(2);
        expect(result.mode).toBe('desktop');
      });

      it('should throw error for invalid preview', async () => {
        mockQueryBuilder.first.mockResolvedValue(null);

        await expect(service.renderPreview('invalid-token'))
          .rejects.toThrow('Preview not found');
      });

      it('should throw error when draft not found', async () => {
        mockQueryBuilder.first
          .mockResolvedValueOnce({
            id: 'preview-123',
            draft_id: 'draft-123',
            preview_token: 'valid-token',
            preview_mode: 'desktop',
            is_active: true,
            require_auth: false,
            allowed_user_ids: [],
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
            view_count: 0,
          })
          .mockResolvedValueOnce(null);

        mockQueryBuilder.update.mockResolvedValue(1);

        await expect(service.renderPreview('valid-token'))
          .rejects.toThrow('Draft not found');
      });
    });
  });

  describe('Content Testing', () => {
    describe('testContentStructure', () => {
      it('should pass all tests for valid content', async () => {
        const mockDraft = {
          id: 'draft-123',
          title: 'Test Lesson',
          raw_content: 'Some content here',
          word_count: 100,
        };

        mockQueryBuilder.first.mockResolvedValue(mockDraft);
        mockQueryBuilder.count
          .mockResolvedValueOnce([{ count: '5' }]) // blocks count
          .mockResolvedValueOnce([{ count: '2' }]); // objectives count

        let thenCallCount = 0;
        mockQueryBuilder.then = jest.fn((resolve) => {
          const results = [
            [{ order_index: 0 }, { order_index: 1 }, { order_index: 2 }], // orderBy result for order check
            [], // whereIn result for objective check
          ];
          return resolve(results[thenCallCount++] || []);
        });

        const result = await service.testContentStructure('draft-123');

        expect(result.tests.find(t => t.name === 'Title exists')?.passed).toBe(true);
        expect(result.tests.find(t => t.name === 'Has content')?.passed).toBe(true);
      });

      it('should fail for missing title', async () => {
        const mockDraft = {
          id: 'draft-123',
          title: '',
          raw_content: '',
          word_count: 0,
        };

        mockQueryBuilder.first.mockResolvedValue(mockDraft);
        mockQueryBuilder.count
          .mockResolvedValueOnce([{ count: '0' }])
          .mockResolvedValueOnce([{ count: '0' }]);

        const result = await service.testContentStructure('draft-123');

        expect(result.tests.find(t => t.name === 'Title exists')?.passed).toBe(false);
      });

      it('should throw error for non-existent draft', async () => {
        mockQueryBuilder.first.mockResolvedValue(null);

        await expect(service.testContentStructure('non-existent'))
          .rejects.toThrow('Draft not found');
      });
    });

    describe('testAssessmentQuestions', () => {
      it('should return success when no questions', async () => {
        mockQueryBuilder.where.mockResolvedValue([]);

        const result = await service.testAssessmentQuestions('draft-123');

        expect(result.valid).toBe(true);
        expect(result.tests[0].name).toBe('No questions');
      });

      it('should test questions have text', async () => {
        const mockQuestions = [
          { id: 'q1', question_text: 'What is 2+2?', question_type: 'multiple_choice', points: 10 },
          { id: 'q2', question_text: 'True or false?', question_type: 'true_false', points: 5 },
        ];

        mockQueryBuilder.where.mockResolvedValueOnce(mockQuestions);
        mockQueryBuilder.where.mockResolvedValue([
          { is_correct: true },
          { is_correct: false },
        ]);

        const result = await service.testAssessmentQuestions('draft-123');

        const textTest = result.tests.find(t => t.name === 'Questions have text');
        expect(textTest?.passed).toBe(true);
      });

      it('should test questions have correct answers', async () => {
        const mockQuestions = [
          { id: 'q1', question_text: 'What is 2+2?', question_type: 'multiple_choice', points: 10 },
        ];

        mockQueryBuilder.where
          .mockResolvedValueOnce(mockQuestions) // questions
          .mockResolvedValueOnce([{ is_correct: true }]); // options with correct answer

        const result = await service.testAssessmentQuestions('draft-123');

        const correctTest = result.tests.find(t => t.name === 'Questions have correct answers');
        expect(correctTest?.passed).toBe(true);
      });
    });
  });

  describe('Utilities', () => {
    describe('getPreviewUrl', () => {
      it('should generate preview URL', () => {
        const url = service.getPreviewUrl('abc123token');

        expect(url).toContain('/preview/abc123token');
      });
    });
  });
});
