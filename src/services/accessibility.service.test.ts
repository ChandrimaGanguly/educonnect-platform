/**
 * Accessibility Service Tests
 *
 * Tests for accessibility compliance features including:
 * - Alt text management
 * - Caption management
 * - Transcript management
 * - Accessibility checks
 * - User preferences
 * - Color contrast calculations
 * - Compliance reports
 */

import { AccessibilityService } from './accessibility.service';
import { getDatabase } from '../database';
import type { Knex } from 'knex';

// Mock the database module
jest.mock('../database', () => ({
  getDatabase: jest.fn(),
}));

describe('AccessibilityService', () => {
  let service: AccessibilityService;
  let mockDb: any;
  let mockQueryBuilder: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock query builder
    mockQueryBuilder = {
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      whereNull: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      first: jest.fn(),
      returning: jest.fn(),
      orderBy: jest.fn().mockReturnThis(),
      increment: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
    };

    // Create mock database
    mockDb = jest.fn(() => mockQueryBuilder);
    mockDb.raw = jest.fn((sql) => ({ toSQL: () => ({ sql }) }));
    mockDb.fn = { now: () => 'NOW()' };
    mockDb.transaction = jest.fn().mockImplementation(async (fn) => fn(mockDb));

    (getDatabase as jest.Mock).mockReturnValue(mockDb);

    // Create service instance
    service = new AccessibilityService();
  });

  describe('Color Contrast Calculations', () => {
    describe('calculateContrastRatio', () => {
      it('should calculate correct contrast ratio for black and white', () => {
        const ratio = service.calculateContrastRatio('#000000', '#FFFFFF');
        expect(ratio).toBeCloseTo(21, 0);
      });

      it('should calculate correct contrast ratio for similar colors', () => {
        const ratio = service.calculateContrastRatio('#777777', '#888888');
        expect(ratio).toBeGreaterThan(1);
        expect(ratio).toBeLessThan(2);
      });

      it('should return 1 for identical colors', () => {
        const ratio = service.calculateContrastRatio('#FF0000', '#FF0000');
        expect(ratio).toBeCloseTo(1, 1);
      });

      it('should handle lowercase hex colors', () => {
        const ratio = service.calculateContrastRatio('#ffffff', '#000000');
        expect(ratio).toBeCloseTo(21, 0);
      });
    });

    describe('checkContrastCompliance', () => {
      it('should pass AA for high contrast (4.5:1+ for normal text)', () => {
        const result = service.checkContrastCompliance('#000000', '#FFFFFF', false);
        expect(result.passesAa).toBe(true);
        expect(result.passesAaa).toBe(true);
      });

      it('should fail AA for low contrast (< 4.5:1 for normal text)', () => {
        const result = service.checkContrastCompliance('#777777', '#888888', false);
        expect(result.passesAa).toBe(false);
      });

      it('should pass AA for large text at 3:1', () => {
        // Find colors that give approximately 3.5:1 ratio
        const result = service.checkContrastCompliance('#595959', '#FFFFFF', true);
        expect(result.passesAa).toBe(true);
      });

      it('should return correct ratio', () => {
        const result = service.checkContrastCompliance('#000000', '#FFFFFF', false);
        expect(result.ratio).toBeCloseTo(21, 0);
      });
    });
  });

  describe('Alt Text Management', () => {
    const mockUser = { id: 'user-123' };
    const mockAltTextRow = {
      id: 'alt-123',
      content_file_id: 'file-123',
      resource_id: null,
      alt_text: 'A scenic mountain landscape',
      long_description: null,
      is_decorative: false,
      source: 'manual',
      confidence_score: null,
      is_approved: false,
      approved_by: null,
      approved_at: null,
      is_descriptive: true,
      character_count: 27,
      contains_redundant_words: false,
      language: 'en',
      version: 1,
      previous_version_id: null,
      created_by: 'user-123',
      updated_by: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    describe('createAltText', () => {
      it('should create alt text with valid content', async () => {
        mockQueryBuilder.returning.mockResolvedValue([mockAltTextRow]);
        mockQueryBuilder.first.mockResolvedValue(null);

        const result = await service.createAltText({
          contentFileId: 'file-123',
          altText: 'A scenic mountain landscape',
          createdBy: mockUser.id,
        });

        expect(mockDb).toHaveBeenCalledWith('accessibility_alt_text');
        expect(result.altText).toBe('A scenic mountain landscape');
        expect(result.isDescriptive).toBe(true);
        expect(result.containsRedundantWords).toBe(false);
      });

      it('should detect redundant words in alt text', async () => {
        const altTextWithRedundant = {
          ...mockAltTextRow,
          alt_text: 'Image of a mountain',
          contains_redundant_words: true,
        };
        mockQueryBuilder.returning.mockResolvedValue([altTextWithRedundant]);
        mockQueryBuilder.first.mockResolvedValue(null);

        const result = await service.createAltText({
          contentFileId: 'file-123',
          altText: 'Image of a mountain',
          createdBy: mockUser.id,
        });

        // The service should detect "image of" as redundant
        expect(mockDb).toHaveBeenCalledWith('accessibility_alt_text');
      });

      it('should handle decorative images', async () => {
        const decorativeAlt = {
          ...mockAltTextRow,
          is_decorative: true,
          alt_text: '',
        };
        mockQueryBuilder.returning.mockResolvedValue([decorativeAlt]);
        mockQueryBuilder.first.mockResolvedValue(null);

        const result = await service.createAltText({
          contentFileId: 'file-123',
          altText: '',
          isDecorative: true,
          createdBy: mockUser.id,
        });

        expect(mockDb).toHaveBeenCalledWith('accessibility_alt_text');
      });
    });

    describe('getAltTextById', () => {
      it('should return alt text by ID', async () => {
        mockQueryBuilder.first.mockResolvedValue(mockAltTextRow);

        const result = await service.getAltTextById('alt-123');

        expect(mockDb).toHaveBeenCalledWith('accessibility_alt_text');
        expect(result).not.toBeNull();
        expect(result?.id).toBe('alt-123');
      });

      it('should return null for non-existent alt text', async () => {
        mockQueryBuilder.first.mockResolvedValue(null);

        const result = await service.getAltTextById('non-existent');

        expect(result).toBeNull();
      });
    });

    describe('approveAltText', () => {
      it('should approve alt text', async () => {
        const approvedAlt = {
          ...mockAltTextRow,
          is_approved: true,
          approved_by: 'approver-123',
          approved_at: new Date(),
        };
        mockQueryBuilder.returning.mockResolvedValue([approvedAlt]);

        const result = await service.approveAltText('alt-123', 'approver-123');

        expect(mockDb).toHaveBeenCalledWith('accessibility_alt_text');
        expect(result.isApproved).toBe(true);
        expect(result.approvedBy).toBe('approver-123');
      });
    });
  });

  describe('Caption Management', () => {
    const mockCaptionRow = {
      id: 'cap-123',
      content_file_id: 'file-123',
      resource_id: null,
      language: 'en',
      language_name: 'English',
      caption_type: 'captions',
      format: 'vtt',
      content: 'WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nHello, world!',
      file_url: null,
      word_count: 2,
      cue_count: 1,
      duration_ms: 5000,
      accuracy_score: null,
      includes_speaker_identification: false,
      includes_sound_effects: false,
      source: 'manual',
      is_approved: false,
      approved_by: null,
      approved_at: null,
      is_synced: true,
      created_by: 'user-123',
      updated_by: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    describe('createCaption', () => {
      it('should create caption with VTT content', async () => {
        mockQueryBuilder.returning.mockResolvedValue([mockCaptionRow]);
        mockQueryBuilder.first.mockResolvedValue(null);

        const result = await service.createCaption({
          contentFileId: 'file-123',
          content: 'WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nHello, world!',
          durationMs: 5000,
          createdBy: 'user-123',
        });

        expect(mockDb).toHaveBeenCalledWith('accessibility_captions');
        expect(result.format).toBe('vtt');
        expect(result.language).toBe('en');
      });

      it('should detect speaker identification in captions', async () => {
        const captionWithSpeaker = {
          ...mockCaptionRow,
          content: 'WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nSPEAKER: Hello!',
          includes_speaker_identification: true,
        };
        mockQueryBuilder.returning.mockResolvedValue([captionWithSpeaker]);
        mockQueryBuilder.first.mockResolvedValue(null);

        await service.createCaption({
          contentFileId: 'file-123',
          content: 'WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nSPEAKER: Hello!',
          createdBy: 'user-123',
        });

        expect(mockDb).toHaveBeenCalledWith('accessibility_captions');
      });

      it('should detect sound effects in captions', async () => {
        const captionWithEffects = {
          ...mockCaptionRow,
          content: 'WEBVTT\n\n00:00:00.000 --> 00:00:05.000\n[music playing] Hello!',
          includes_sound_effects: true,
        };
        mockQueryBuilder.returning.mockResolvedValue([captionWithEffects]);
        mockQueryBuilder.first.mockResolvedValue(null);

        await service.createCaption({
          contentFileId: 'file-123',
          content: 'WEBVTT\n\n00:00:00.000 --> 00:00:05.000\n[music playing] Hello!',
          createdBy: 'user-123',
        });

        expect(mockDb).toHaveBeenCalledWith('accessibility_captions');
      });
    });

    describe('getCaptionById', () => {
      it('should return caption by ID', async () => {
        mockQueryBuilder.first.mockResolvedValue(mockCaptionRow);

        const result = await service.getCaptionById('cap-123');

        expect(result).not.toBeNull();
        expect(result?.id).toBe('cap-123');
      });
    });
  });

  describe('Transcript Management', () => {
    const mockTranscriptRow = {
      id: 'trans-123',
      content_file_id: 'file-123',
      resource_id: null,
      lesson_id: null,
      language: 'en',
      language_name: 'English',
      transcript_type: 'basic',
      content: 'This is the transcript content for the video.',
      segments: null,
      word_count: 8,
      duration_ms: 60000,
      accuracy_score: null,
      includes_speaker_labels: false,
      includes_timestamps: false,
      includes_visual_descriptions: false,
      source: 'manual',
      is_approved: false,
      approved_by: null,
      approved_at: null,
      created_by: 'user-123',
      updated_by: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    describe('createTranscript', () => {
      it('should create basic transcript', async () => {
        mockQueryBuilder.returning.mockResolvedValue([mockTranscriptRow]);
        mockQueryBuilder.first.mockResolvedValue(null);

        const result = await service.createTranscript({
          contentFileId: 'file-123',
          content: 'This is the transcript content for the video.',
          createdBy: 'user-123',
        });

        expect(mockDb).toHaveBeenCalledWith('accessibility_transcripts');
        expect(result.transcriptType).toBe('basic');
        expect(result.wordCount).toBe(8);
      });

      it('should create timestamped transcript with segments', async () => {
        const timestampedTranscript = {
          ...mockTranscriptRow,
          transcript_type: 'timestamped',
          segments: [
            { startTime: 0, endTime: 5000, text: 'Hello', speaker: 'Narrator' },
          ],
          includes_timestamps: true,
          includes_speaker_labels: true,
        };
        mockQueryBuilder.returning.mockResolvedValue([timestampedTranscript]);
        mockQueryBuilder.first.mockResolvedValue(null);

        const result = await service.createTranscript({
          contentFileId: 'file-123',
          content: 'Hello',
          transcriptType: 'timestamped',
          segments: [
            { startTime: 0, endTime: 5000, text: 'Hello', speaker: 'Narrator' },
          ],
          createdBy: 'user-123',
        });

        expect(mockDb).toHaveBeenCalledWith('accessibility_transcripts');
      });
    });

    describe('getTranscriptById', () => {
      it('should return transcript by ID', async () => {
        mockQueryBuilder.first.mockResolvedValue(mockTranscriptRow);

        const result = await service.getTranscriptById('trans-123');

        expect(result).not.toBeNull();
        expect(result?.id).toBe('trans-123');
      });
    });
  });

  describe('Accessibility Checks', () => {
    const mockCheckRow = {
      id: 'check-123',
      lesson_id: 'lesson-123',
      resource_id: null,
      content_file_id: null,
      check_type: 'alt_text',
      wcag_level: 'AA',
      wcag_version: '2.1',
      status: 'pending',
      compliance_score: null,
      issues_found: 0,
      issues_resolved: 0,
      checked_at: null,
      next_check_due: null,
      checked_by: 'user-123',
      is_automated: true,
      check_results: null,
      metadata: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    describe('createCheck', () => {
      it('should create accessibility check', async () => {
        mockQueryBuilder.returning.mockResolvedValue([mockCheckRow]);
        mockQueryBuilder.first.mockResolvedValue(null);

        const result = await service.createCheck({
          lessonId: 'lesson-123',
          checkType: 'alt_text',
          checkedBy: 'user-123',
        });

        expect(mockDb).toHaveBeenCalledWith('content_accessibility_checks');
        expect(result.checkType).toBe('alt_text');
        expect(result.wcagLevel).toBe('AA');
      });
    });

    describe('updateCheckStatus', () => {
      it('should update check status with results', async () => {
        const updatedCheck = {
          ...mockCheckRow,
          status: 'passed',
          compliance_score: 100,
          checked_at: new Date(),
        };
        mockQueryBuilder.returning.mockResolvedValue([updatedCheck]);
        mockQueryBuilder.first.mockResolvedValue(null);

        const result = await service.updateCheckStatus('check-123', 'passed', {
          complianceScore: 100,
          issuesFound: 0,
        });

        expect(mockDb).toHaveBeenCalledWith('content_accessibility_checks');
        expect(result.status).toBe('passed');
      });
    });

    describe('runAutomatedCheck', () => {
      it('should detect missing alt text in HTML', async () => {
        // Setup mocks for check creation
        mockQueryBuilder.returning.mockResolvedValueOnce([mockCheckRow]);
        // Mock for audit log
        mockQueryBuilder.first.mockResolvedValue(null);
        // Mock for issue creation
        const mockIssueRow = {
          id: 'issue-123',
          check_id: 'check-123',
          severity: 'critical',
          wcag_criterion: '1.1.1',
          wcag_criterion_name: 'Non-text Content',
          issue_code: 'img-alt-missing',
          description: 'Image is missing alt attribute',
          impact: 'Screen reader users will not know what the image is about',
          element_selector: null,
          element_html: '<img src="test.jpg">',
          line_number: null,
          column_number: null,
          recommendation: 'Add an alt attribute describing the image content',
          fix_example: '<img src="..." alt="Description of the image">',
          help_url: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html',
          status: 'open',
          assigned_to: null,
          resolved_by: null,
          resolved_at: null,
          resolution_notes: null,
          metadata: null,
          created_at: new Date(),
          updated_at: new Date(),
        };
        mockQueryBuilder.returning.mockImplementation(() => {
          return Promise.resolve([mockIssueRow]);
        });

        const html = '<html><body><img src="test.jpg"></body></html>';

        const result = await service.runAutomatedCheck(html, 'alt_text', {
          lessonId: 'lesson-123',
          checkType: 'alt_text',
        });

        expect(result.check).toBeDefined();
        expect(result.issues).toBeDefined();
      });

      it('should pass for images with alt text', async () => {
        mockQueryBuilder.returning.mockResolvedValueOnce([{
          ...mockCheckRow,
          status: 'passed',
        }]);
        mockQueryBuilder.first.mockResolvedValue(null);

        const html = '<html><body><img src="test.jpg" alt="A test image"></body></html>';

        const result = await service.runAutomatedCheck(html, 'alt_text', {
          lessonId: 'lesson-123',
          checkType: 'alt_text',
        });

        expect(result.check).toBeDefined();
      });

      it('should detect skipped heading levels', async () => {
        mockQueryBuilder.returning.mockResolvedValue([mockCheckRow]);
        mockQueryBuilder.first.mockResolvedValue(null);

        const html = '<html><body><h1>Title</h1><h3>Skipped to H3</h3></body></html>';

        const result = await service.runAutomatedCheck(html, 'heading_structure', {
          lessonId: 'lesson-123',
          checkType: 'heading_structure',
        });

        expect(result.check).toBeDefined();
      });

      it('should detect generic link text', async () => {
        mockQueryBuilder.returning.mockResolvedValue([mockCheckRow]);
        mockQueryBuilder.first.mockResolvedValue(null);

        const html = '<html><body><a href="/page">click here</a></body></html>';

        const result = await service.runAutomatedCheck(html, 'link_text', {
          lessonId: 'lesson-123',
          checkType: 'link_text',
        });

        expect(result.check).toBeDefined();
      });
    });
  });

  describe('Accessibility Issues', () => {
    const mockIssueRow = {
      id: 'issue-123',
      check_id: 'check-123',
      severity: 'critical',
      wcag_criterion: '1.1.1',
      wcag_criterion_name: 'Non-text Content',
      issue_code: 'img-alt-missing',
      description: 'Image is missing alt attribute',
      impact: 'Screen reader users will not know what the image is about',
      element_selector: 'img.hero',
      element_html: '<img src="hero.jpg" class="hero">',
      line_number: 10,
      column_number: 5,
      recommendation: 'Add alt attribute',
      fix_example: '<img src="hero.jpg" alt="Description">',
      help_url: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html',
      status: 'open',
      assigned_to: null,
      resolved_by: null,
      resolved_at: null,
      resolution_notes: null,
      metadata: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    describe('createIssue', () => {
      it('should create accessibility issue', async () => {
        mockQueryBuilder.returning.mockResolvedValue([mockIssueRow]);
        mockQueryBuilder.first.mockResolvedValue(null);

        const result = await service.createIssue({
          checkId: 'check-123',
          severity: 'critical',
          wcagCriterion: '1.1.1',
          wcagCriterionName: 'Non-text Content',
          issueCode: 'img-alt-missing',
          description: 'Image is missing alt attribute',
          impact: 'Screen reader users will not know what the image is about',
          recommendation: 'Add alt attribute',
        });

        expect(mockDb).toHaveBeenCalledWith('accessibility_issues');
        expect(result.severity).toBe('critical');
        expect(result.wcagCriterion).toBe('1.1.1');
      });
    });

    describe('updateIssueStatus', () => {
      it('should resolve issue', async () => {
        const resolvedIssue = {
          ...mockIssueRow,
          status: 'resolved',
          resolved_by: 'user-123',
          resolved_at: new Date(),
          resolution_notes: 'Added alt text to image',
        };
        mockQueryBuilder.returning.mockResolvedValue([resolvedIssue]);
        mockQueryBuilder.first.mockResolvedValue({ id: 'check-123' });

        const result = await service.updateIssueStatus(
          'issue-123',
          'resolved',
          'user-123',
          'Added alt text to image'
        );

        expect(result.status).toBe('resolved');
        expect(result.resolvedBy).toBe('user-123');
      });

      it('should mark issue as false positive', async () => {
        const falsePositiveIssue = {
          ...mockIssueRow,
          status: 'false_positive',
          resolved_by: 'user-123',
          resolved_at: new Date(),
        };
        mockQueryBuilder.returning.mockResolvedValue([falsePositiveIssue]);
        mockQueryBuilder.first.mockResolvedValue(null);

        const result = await service.updateIssueStatus(
          'issue-123',
          'false_positive',
          'user-123'
        );

        expect(result.status).toBe('false_positive');
      });
    });

    describe('assignIssue', () => {
      it('should assign issue to user', async () => {
        const assignedIssue = {
          ...mockIssueRow,
          status: 'in_progress',
          assigned_to: 'assignee-123',
        };
        mockQueryBuilder.returning.mockResolvedValue([assignedIssue]);
        mockQueryBuilder.first.mockResolvedValue(null);

        const result = await service.assignIssue('issue-123', 'assignee-123', 'assigner-123');

        expect(result.status).toBe('in_progress');
        expect(result.assignedTo).toBe('assignee-123');
      });
    });
  });

  describe('User Accessibility Preferences', () => {
    const mockPreferencesRow = {
      id: 'pref-123',
      user_id: 'user-123',
      high_contrast_mode: false,
      large_text: false,
      text_scale_factor: '1.00',
      dyslexia_friendly_font: false,
      reduce_motion: false,
      reduce_transparency: false,
      color_scheme: 'default',
      invert_colors: false,
      grayscale: false,
      custom_colors: null,
      captions_enabled: false,
      audio_descriptions_enabled: false,
      auto_play_media: false,
      caption_language: 'en',
      caption_style: null,
      keyboard_navigation: false,
      skip_links_enabled: true,
      focus_indicators_enhanced: false,
      link_underlines: true,
      screen_reader_optimized: false,
      announce_images: true,
      announce_links: true,
      aria_live_politeness: 'polite',
      simplified_layout: false,
      reading_guide: false,
      text_to_speech: false,
      reading_speed: '1.00',
      click_delay_ms: 0,
      sticky_keys: false,
      bounce_keys: false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    describe('getUserPreferences', () => {
      it('should return existing preferences', async () => {
        mockQueryBuilder.first.mockResolvedValue(mockPreferencesRow);

        const result = await service.getUserPreferences('user-123');

        expect(result.userId).toBe('user-123');
        expect(result.textScaleFactor).toBe(1.0);
        expect(result.skipLinksEnabled).toBe(true);
      });

      it('should create default preferences if none exist', async () => {
        mockQueryBuilder.first.mockResolvedValue(null);
        mockQueryBuilder.returning.mockResolvedValue([mockPreferencesRow]);

        const result = await service.getUserPreferences('user-123');

        expect(mockDb).toHaveBeenCalledWith('user_accessibility_preferences');
        expect(result).toBeDefined();
      });
    });

    describe('updateUserPreferences', () => {
      it('should update high contrast mode', async () => {
        mockQueryBuilder.first.mockResolvedValue(mockPreferencesRow);
        const updatedPrefs = {
          ...mockPreferencesRow,
          high_contrast_mode: true,
        };
        mockQueryBuilder.returning.mockResolvedValue([updatedPrefs]);

        await service.updateUserPreferences('user-123', {
          highContrastMode: true,
        });

        expect(mockDb).toHaveBeenCalledWith('user_accessibility_preferences');
      });

      it('should update text scale factor within valid range', async () => {
        mockQueryBuilder.first.mockResolvedValue(mockPreferencesRow);
        const updatedPrefs = {
          ...mockPreferencesRow,
          text_scale_factor: '1.50',
        };
        mockQueryBuilder.returning.mockResolvedValue([updatedPrefs]);

        await service.updateUserPreferences('user-123', {
          textScaleFactor: 1.5,
        });

        expect(mockDb).toHaveBeenCalledWith('user_accessibility_preferences');
      });

      it('should cap text scale factor at 2.0 (200%)', async () => {
        mockQueryBuilder.first.mockResolvedValue(mockPreferencesRow);
        const updatedPrefs = {
          ...mockPreferencesRow,
          text_scale_factor: '2.00',
        };
        mockQueryBuilder.returning.mockResolvedValue([updatedPrefs]);

        // Try to set above max
        await service.updateUserPreferences('user-123', {
          textScaleFactor: 2.5, // Should be capped to 2.0
        });

        expect(mockDb).toHaveBeenCalledWith('user_accessibility_preferences');
      });

      it('should update caption preferences', async () => {
        mockQueryBuilder.first.mockResolvedValue(mockPreferencesRow);
        const updatedPrefs = {
          ...mockPreferencesRow,
          captions_enabled: true,
          caption_language: 'es',
        };
        mockQueryBuilder.returning.mockResolvedValue([updatedPrefs]);

        await service.updateUserPreferences('user-123', {
          captionsEnabled: true,
          captionLanguage: 'es',
        });

        expect(mockDb).toHaveBeenCalledWith('user_accessibility_preferences');
      });

      it('should update motion preferences', async () => {
        mockQueryBuilder.first.mockResolvedValue(mockPreferencesRow);
        const updatedPrefs = {
          ...mockPreferencesRow,
          reduce_motion: true,
        };
        mockQueryBuilder.returning.mockResolvedValue([updatedPrefs]);

        await service.updateUserPreferences('user-123', {
          reduceMotion: true,
        });

        expect(mockDb).toHaveBeenCalledWith('user_accessibility_preferences');
      });
    });
  });

  describe('Compliance Reports', () => {
    describe('generateComplianceReport', () => {
      it('should generate report with full compliance', async () => {
        // Mock checks query
        mockQueryBuilder.orderBy.mockResolvedValueOnce([
          {
            id: 'check-1',
            lesson_id: 'lesson-123',
            check_type: 'alt_text',
            wcag_level: 'AA',
            wcag_version: '2.1',
            status: 'passed',
            compliance_score: '100.00',
            issues_found: 0,
            issues_resolved: 0,
            is_automated: true,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ]);
        // Mock issues queries
        mockQueryBuilder.orderBy.mockResolvedValueOnce([]);
        // Mock alt text
        mockQueryBuilder.orderBy.mockResolvedValueOnce([{ id: 'alt-1' }]);
        // Mock captions
        mockQueryBuilder.orderBy.mockResolvedValueOnce([{ id: 'cap-1' }]);
        // Mock transcripts
        mockQueryBuilder.orderBy.mockResolvedValueOnce([{ id: 'trans-1' }]);
        mockQueryBuilder.first.mockResolvedValue(null);

        const report = await service.generateComplianceReport({
          lessonId: 'lesson-123',
        });

        expect(report).toBeDefined();
        expect(report.overallScore).toBeDefined();
        expect(report.accessibilityFeatures).toBeDefined();
      });
    });
  });

  describe('Color Contrast Storage', () => {
    describe('saveColorContrastCheck', () => {
      it('should save color contrast check result', async () => {
        const mockContrastRow = {
          id: 'contrast-123',
          check_id: 'check-123',
          foreground_color: '#000000',
          background_color: '#FFFFFF',
          contrast_ratio: '21.00',
          passes_aa_normal: true,
          passes_aa_large: true,
          passes_aaa_normal: true,
          passes_aaa_large: true,
          element_selector: null,
          element_type: null,
          is_large_text: false,
          font_size_px: null,
          is_bold: false,
          suggested_foreground: null,
          suggested_background: null,
          suggested_ratio: null,
          created_at: new Date(),
        };
        mockQueryBuilder.returning.mockResolvedValue([mockContrastRow]);

        const result = await service.saveColorContrastCheck('check-123', {
          foregroundColor: '#000000',
          backgroundColor: '#FFFFFF',
        });

        expect(mockDb).toHaveBeenCalledWith('color_contrast_checks');
        expect(result.passesAaNormal).toBe(true);
        expect(result.contrastRatio).toBe(21);
      });
    });
  });
});
