/**
 * Accessibility Checker Service Tests
 *
 * Tests for WCAG 2.1 accessibility compliance checking:
 * - Image accessibility (alt text)
 * - Video accessibility (captions, transcripts)
 * - Audio accessibility (transcripts)
 * - Document structure (headings)
 * - Score calculation
 * - Recommendations generation
 */

import { AccessibilityCheckerService } from './accessibility-checker.service';
import { getDatabase } from '../database';

jest.mock('../database', () => ({
  getDatabase: jest.fn(),
}));

describe('AccessibilityCheckerService', () => {
  let service: AccessibilityCheckerService;
  let mockDb: any;
  let mockQueryBuilder: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockQueryBuilder = {
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(null),
      returning: jest.fn().mockResolvedValue([]),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
      then: jest.fn((resolve) => resolve([])),
    };

    mockDb = jest.fn(() => mockQueryBuilder);
    mockDb.fn = { now: jest.fn().mockReturnValue('NOW()') };
    mockDb.raw = jest.fn((sql) => ({ toSQL: () => ({ sql }) }));
    mockDb.transaction = jest.fn(async (callback) => await callback(mockDb));

    (getDatabase as jest.Mock).mockReturnValue(mockDb);

    service = new AccessibilityCheckerService();
  });

  describe('checkDraft', () => {
    const mockDraft = {
      id: 'draft-123',
      title: 'Test Lesson',
      raw_content: 'Some content here',
    };

    it('should check draft with no issues', async () => {
      let thenCallCount = 0;
      mockQueryBuilder.first.mockResolvedValue(mockDraft);
      mockQueryBuilder.orderBy.mockResolvedValue([]); // blocks
      mockQueryBuilder.then = jest.fn((resolve) => {
        const results = [[], [], []]; // embeds, questions, and default
        return resolve(results[thenCallCount++] || []);
      });
      mockQueryBuilder.returning.mockResolvedValue([{
        id: 'check-123',
        draft_id: 'draft-123',
        overall_score: 100,
        compliance_level: 'AAA',
        passed: true,
        critical_issues: 0,
        major_issues: 0,
        minor_issues: 0,
        issues: '[]',
        category_scores: '{}',
        recommendations: '[]',
        checker_version: '1.0.0',
        check_options: '{}',
        checked_by: 'user-123',
        checked_at: new Date(),
      }]);
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await service.checkDraft('draft-123', 'user-123');

      expect(result.passed).toBe(true);
      expect(result.overall_score).toBe(100);
    });

    it('should throw error for non-existent draft', async () => {
      mockQueryBuilder.first.mockResolvedValue(null);

      await expect(service.checkDraft('non-existent', 'user-123'))
        .rejects.toThrow('Draft not found');
    });

    it('should detect image without alt text', async () => {
      mockQueryBuilder.first.mockResolvedValue(mockDraft);
      mockQueryBuilder.orderBy.mockResolvedValue([
        {
          id: 'block-1',
          block_type: 'image',
          content: JSON.stringify({ src: '/image.jpg' }),
          order_index: 0,
        },
      ]);
      mockQueryBuilder.returning.mockResolvedValue([{
        id: 'check-123',
        draft_id: 'draft-123',
        overall_score: 75,
        compliance_level: 'none',
        passed: false,
        critical_issues: 1,
        major_issues: 0,
        minor_issues: 0,
        issues: JSON.stringify([{
          id: 'img-alt-block-1',
          category: 'images',
          severity: 'critical',
          description: 'Image is missing alt text',
        }]),
        category_scores: '{}',
        recommendations: '[]',
        checker_version: '1.0.0',
        check_options: '{}',
        checked_by: 'user-123',
        checked_at: new Date(),
      }]);
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await service.checkDraft('draft-123', 'user-123');

      expect(result.critical_issues).toBe(1);
      expect(result.passed).toBe(false);
    });

    it('should detect video without captions', async () => {
      mockQueryBuilder.first.mockResolvedValue(mockDraft);
      mockQueryBuilder.orderBy.mockResolvedValue([
        {
          id: 'block-1',
          block_type: 'video',
          content: JSON.stringify({ src: '/video.mp4' }),
          order_index: 0,
        },
      ]);
      mockQueryBuilder.returning.mockResolvedValue([{
        id: 'check-123',
        draft_id: 'draft-123',
        overall_score: 65,
        compliance_level: 'none',
        passed: false,
        critical_issues: 1,
        major_issues: 1,
        minor_issues: 0,
        issues: JSON.stringify([
          { category: 'video', severity: 'critical', description: 'Video does not have captions' },
          { category: 'video', severity: 'major', description: 'Video does not have a transcript' },
        ]),
        category_scores: '{}',
        recommendations: '[]',
        checker_version: '1.0.0',
        check_options: '{}',
        checked_by: 'user-123',
        checked_at: new Date(),
      }]);
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await service.checkDraft('draft-123', 'user-123');

      expect(result.critical_issues).toBe(1);
      expect(result.major_issues).toBe(1);
    });

    it('should detect audio without transcript', async () => {
      mockQueryBuilder.first.mockResolvedValue(mockDraft);
      mockQueryBuilder.orderBy.mockResolvedValue([
        {
          id: 'block-1',
          block_type: 'audio',
          content: JSON.stringify({ src: '/audio.mp3' }),
          order_index: 0,
        },
      ]);
      mockQueryBuilder.returning.mockResolvedValue([{
        id: 'check-123',
        draft_id: 'draft-123',
        overall_score: 75,
        compliance_level: 'none',
        passed: false,
        critical_issues: 1,
        major_issues: 0,
        minor_issues: 0,
        issues: JSON.stringify([
          { category: 'audio', severity: 'critical', description: 'Audio does not have a transcript' },
        ]),
        category_scores: '{}',
        recommendations: '[]',
        checker_version: '1.0.0',
        check_options: '{}',
        checked_by: 'user-123',
        checked_at: new Date(),
      }]);
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await service.checkDraft('draft-123', 'user-123');

      expect(result.critical_issues).toBe(1);
    });

    it('should detect heading hierarchy issues', async () => {
      mockQueryBuilder.first.mockResolvedValue(mockDraft);
      mockQueryBuilder.orderBy.mockResolvedValue([
        {
          id: 'block-1',
          block_type: 'heading',
          content: JSON.stringify({ level: 1, text: 'Title' }),
          order_index: 0,
        },
        {
          id: 'block-2',
          block_type: 'heading',
          content: JSON.stringify({ level: 4, text: 'Skipped' }), // Skipped h2, h3
          order_index: 1,
        },
      ]);
      mockQueryBuilder.returning.mockResolvedValue([{
        id: 'check-123',
        draft_id: 'draft-123',
        overall_score: 85,
        compliance_level: 'A',
        passed: false,
        critical_issues: 0,
        major_issues: 1,
        minor_issues: 0,
        issues: JSON.stringify([
          { category: 'structure', severity: 'major', description: 'Heading level skipped from h1 to h4' },
        ]),
        category_scores: '{}',
        recommendations: '[]',
        checker_version: '1.0.0',
        check_options: '{}',
        checked_by: 'user-123',
        checked_at: new Date(),
      }]);
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await service.checkDraft('draft-123', 'user-123');

      expect(result.major_issues).toBe(1);
    });

    it('should skip disabled checks', async () => {
      mockQueryBuilder.first.mockResolvedValue(mockDraft);
      mockQueryBuilder.orderBy.mockResolvedValue([
        {
          id: 'block-1',
          block_type: 'image',
          content: JSON.stringify({ src: '/image.jpg' }),
          order_index: 0,
        },
      ]);
      mockQueryBuilder.returning.mockResolvedValue([{
        id: 'check-123',
        draft_id: 'draft-123',
        overall_score: 100,
        compliance_level: 'AAA',
        passed: true,
        critical_issues: 0,
        major_issues: 0,
        minor_issues: 0,
        issues: '[]',
        category_scores: '{}',
        recommendations: '[]',
        checker_version: '1.0.0',
        check_options: JSON.stringify({ check_images: false }),
        checked_by: 'user-123',
        checked_at: new Date(),
      }]);
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await service.checkDraft('draft-123', 'user-123', {
        check_images: false,
      });

      expect(result.critical_issues).toBe(0);
    });
  });

  describe('getCheckHistory', () => {
    it('should return check history for draft', async () => {
      const mockChecks = [
        {
          id: 'check-1',
          draft_id: 'draft-123',
          overall_score: 85,
          compliance_level: 'AA',
          passed: true,
          critical_issues: 0,
          major_issues: 1,
          minor_issues: 2,
          issues: '[]',
          category_scores: '{}',
          recommendations: '[]',
          checker_version: '1.0.0',
          check_options: '{}',
          checked_by: 'user-123',
          checked_at: new Date(),
        },
      ];

      mockQueryBuilder.count.mockResolvedValue([{ count: '1' }]);
      mockQueryBuilder.orderBy.mockResolvedValue(mockChecks);
      mockQueryBuilder.clone.mockReturnThis();

      const result = await service.getCheckHistory('draft-123');

      expect(result.total).toBe(1);
      expect(result.checks).toHaveLength(1);
    });

    it('should support pagination', async () => {
      mockQueryBuilder.count.mockResolvedValue([{ count: '25' }]);
      mockQueryBuilder.orderBy.mockResolvedValue([]);
      mockQueryBuilder.clone.mockReturnThis();

      const result = await service.getCheckHistory('draft-123', undefined, {
        limit: 10,
        offset: 10,
      });

      expect(result.total).toBe(25);
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(10);
    });
  });

  describe('Image Checks', () => {
    it('should pass image with alt text', async () => {
      mockQueryBuilder.first.mockResolvedValue({ id: 'draft-123', title: 'Test' });
      mockQueryBuilder.orderBy.mockResolvedValue([
        {
          id: 'block-1',
          block_type: 'image',
          content: JSON.stringify({ src: '/image.jpg', alt: 'A descriptive alt text for the image' }),
          order_index: 0,
        },
      ]);
      mockQueryBuilder.returning.mockResolvedValue([{
        id: 'check-123',
        overall_score: 100,
        compliance_level: 'AAA',
        passed: true,
        critical_issues: 0,
        major_issues: 0,
        minor_issues: 0,
        issues: '[]',
        category_scores: '{}',
        recommendations: '[]',
        checker_version: '1.0.0',
        check_options: '{}',
        checked_by: 'user-123',
        checked_at: new Date(),
      }]);
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await service.checkDraft('draft-123', 'user-123');

      expect(result.critical_issues).toBe(0);
    });

    it('should warn about short alt text', async () => {
      mockQueryBuilder.first.mockResolvedValue({ id: 'draft-123', title: 'Test' });
      mockQueryBuilder.orderBy.mockResolvedValue([
        {
          id: 'block-1',
          block_type: 'image',
          content: JSON.stringify({ src: '/image.jpg', alt: 'img' }),
          order_index: 0,
        },
      ]);
      mockQueryBuilder.returning.mockResolvedValue([{
        id: 'check-123',
        overall_score: 95,
        compliance_level: 'AA',
        passed: true,
        critical_issues: 0,
        major_issues: 0,
        minor_issues: 1,
        issues: JSON.stringify([{
          category: 'images',
          severity: 'minor',
          description: 'Alt text may be too short to be meaningful',
        }]),
        category_scores: '{}',
        recommendations: '[]',
        checker_version: '1.0.0',
        check_options: '{}',
        checked_by: 'user-123',
        checked_at: new Date(),
      }]);
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await service.checkDraft('draft-123', 'user-123');

      expect(result.minor_issues).toBe(1);
    });

    it('should require long description for complex images', async () => {
      mockQueryBuilder.first.mockResolvedValue({ id: 'draft-123', title: 'Test' });
      mockQueryBuilder.orderBy.mockResolvedValue([
        {
          id: 'block-1',
          block_type: 'image',
          content: JSON.stringify({
            src: '/chart.png',
            alt: 'Sales chart',
            type: 'chart',
          }),
          order_index: 0,
        },
      ]);
      mockQueryBuilder.returning.mockResolvedValue([{
        id: 'check-123',
        overall_score: 85,
        compliance_level: 'A',
        passed: false,
        critical_issues: 0,
        major_issues: 1,
        minor_issues: 0,
        issues: JSON.stringify([{
          category: 'images',
          severity: 'major',
          description: 'Complex image (chart/diagram/infographic) should have a long description',
        }]),
        category_scores: '{}',
        recommendations: '[]',
        checker_version: '1.0.0',
        check_options: '{}',
        checked_by: 'user-123',
        checked_at: new Date(),
      }]);
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await service.checkDraft('draft-123', 'user-123');

      expect(result.major_issues).toBe(1);
    });
  });

  describe('Video Checks', () => {
    it('should pass video with captions and transcript', async () => {
      mockQueryBuilder.first.mockResolvedValue({ id: 'draft-123', title: 'Test' });
      mockQueryBuilder.orderBy.mockResolvedValue([
        {
          id: 'block-1',
          block_type: 'video',
          content: JSON.stringify({
            src: '/video.mp4',
            has_captions: true,
            transcript: 'Full transcript here',
          }),
          order_index: 0,
        },
      ]);
      mockQueryBuilder.returning.mockResolvedValue([{
        id: 'check-123',
        overall_score: 100,
        compliance_level: 'AAA',
        passed: true,
        critical_issues: 0,
        major_issues: 0,
        minor_issues: 0,
        issues: '[]',
        category_scores: '{}',
        recommendations: '[]',
        checker_version: '1.0.0',
        check_options: '{}',
        checked_by: 'user-123',
        checked_at: new Date(),
      }]);
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await service.checkDraft('draft-123', 'user-123');

      expect(result.passed).toBe(true);
      expect(result.critical_issues).toBe(0);
    });
  });

  describe('Table Checks', () => {
    it('should detect table without headers', async () => {
      mockQueryBuilder.first.mockResolvedValue({ id: 'draft-123', title: 'Test' });
      mockQueryBuilder.orderBy.mockResolvedValue([
        {
          id: 'block-1',
          block_type: 'table',
          content: JSON.stringify({
            rows: [['a', 'b'], ['c', 'd']],
          }),
          order_index: 0,
        },
      ]);
      mockQueryBuilder.returning.mockResolvedValue([{
        id: 'check-123',
        overall_score: 85,
        compliance_level: 'A',
        passed: false,
        critical_issues: 0,
        major_issues: 1,
        minor_issues: 1,
        issues: JSON.stringify([
          { category: 'structure', severity: 'major', description: 'Table does not have header cells' },
          { category: 'structure', severity: 'minor', description: 'Table should have a caption or summary' },
        ]),
        category_scores: '{}',
        recommendations: '[]',
        checker_version: '1.0.0',
        check_options: '{}',
        checked_by: 'user-123',
        checked_at: new Date(),
      }]);
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await service.checkDraft('draft-123', 'user-123');

      expect(result.major_issues).toBe(1);
    });
  });

  describe('Interactive Content Checks', () => {
    it('should detect non-keyboard accessible content', async () => {
      mockQueryBuilder.first.mockResolvedValue({ id: 'draft-123', title: 'Test' });
      mockQueryBuilder.orderBy.mockResolvedValue([
        {
          id: 'block-1',
          block_type: 'interactive',
          content: JSON.stringify({
            type: 'quiz',
            keyboard_accessible: false,
          }),
          order_index: 0,
        },
      ]);
      mockQueryBuilder.returning.mockResolvedValue([{
        id: 'check-123',
        overall_score: 70,
        compliance_level: 'none',
        passed: false,
        critical_issues: 1,
        major_issues: 1,
        minor_issues: 0,
        issues: JSON.stringify([
          { category: 'interactive', severity: 'critical', description: 'Interactive content may not be keyboard accessible' },
          { category: 'interactive', severity: 'major', description: 'Interactive content lacks text alternative' },
        ]),
        category_scores: '{}',
        recommendations: '[]',
        checker_version: '1.0.0',
        check_options: '{}',
        checked_by: 'user-123',
        checked_at: new Date(),
      }]);
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await service.checkDraft('draft-123', 'user-123');

      expect(result.critical_issues).toBe(1);
    });
  });

  describe('Media Embed Checks', () => {
    it('should check embedded media accessibility', async () => {
      mockQueryBuilder.first.mockResolvedValue({ id: 'draft-123', title: 'Test' });
      mockQueryBuilder.orderBy.mockResolvedValue([]);
            id: 'embed-1',
            media_type: 'video',
            has_captions: false,
            transcript: null,
            text_fallback: null,
          },
        ])
        .mockResolvedValueOnce([]);
      mockQueryBuilder.returning.mockResolvedValue([{
        id: 'check-123',
        overall_score: 60,
        compliance_level: 'none',
        passed: false,
        critical_issues: 1,
        major_issues: 1,
        minor_issues: 1,
        issues: JSON.stringify([
          { category: 'video', severity: 'critical', description: 'Embedded video does not have captions' },
          { category: 'video', severity: 'major', description: 'Embedded video does not have a transcript' },
          { category: 'text', severity: 'minor', description: 'Media embed lacks text fallback' },
        ]),
        category_scores: '{}',
        recommendations: '[]',
        checker_version: '1.0.0',
        check_options: '{}',
        checked_by: 'user-123',
        checked_at: new Date(),
      }]);
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await service.checkDraft('draft-123', 'user-123');

      expect(result.critical_issues).toBe(1);
    });
  });

  describe('Compliance Level', () => {
    it('should return AAA for perfect score', async () => {
      mockQueryBuilder.first.mockResolvedValue({ id: 'draft-123', title: 'Test' });
      mockQueryBuilder.orderBy.mockResolvedValue([]);
      mockQueryBuilder.returning.mockResolvedValue([{
        id: 'check-123',
        overall_score: 100,
        compliance_level: 'AAA',
        passed: true,
        critical_issues: 0,
        major_issues: 0,
        minor_issues: 0,
        issues: '[]',
        category_scores: '{}',
        recommendations: '[]',
        checker_version: '1.0.0',
        check_options: '{}',
        checked_by: 'user-123',
        checked_at: new Date(),
      }]);
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await service.checkDraft('draft-123', 'user-123');

      expect(result.compliance_level).toBe('AAA');
    });

    it('should return none for critical issues', async () => {
      mockQueryBuilder.first.mockResolvedValue({ id: 'draft-123', title: 'Test' });
      mockQueryBuilder.orderBy.mockResolvedValue([
        {
          id: 'block-1',
          block_type: 'image',
          content: JSON.stringify({ src: '/image.jpg' }),
          order_index: 0,
        },
      ]);
      mockQueryBuilder.returning.mockResolvedValue([{
        id: 'check-123',
        overall_score: 75,
        compliance_level: 'none',
        passed: false,
        critical_issues: 1,
        major_issues: 0,
        minor_issues: 0,
        issues: '[]',
        category_scores: '{}',
        recommendations: '[]',
        checker_version: '1.0.0',
        check_options: '{}',
        checked_by: 'user-123',
        checked_at: new Date(),
      }]);
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await service.checkDraft('draft-123', 'user-123');

      expect(result.compliance_level).toBe('none');
    });
  });
});
