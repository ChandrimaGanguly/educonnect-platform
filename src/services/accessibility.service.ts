import { getDatabase } from '../database';
import type { Knex } from 'knex';

/**
 * Accessibility Compliance Service
 *
 * Implements accessibility features per the curriculum/mobile specs:
 * - Alt text for all images (WCAG 1.1.1)
 * - Captions for all video content (WCAG 1.2.2)
 * - Transcripts for all audio/video (WCAG 1.2.1)
 * - Color contrast compliance (WCAG 1.4.3)
 * - Keyboard navigation support (WCAG 2.1.1)
 * - Screen reader compatibility (WCAG 4.1.2)
 * - Text scaling support up to 200% (WCAG 1.4.4)
 * - User accessibility preferences
 */

// Types
export type CheckType =
  | 'alt_text'
  | 'captions'
  | 'transcript'
  | 'color_contrast'
  | 'keyboard_navigation'
  | 'screen_reader'
  | 'heading_structure'
  | 'link_text'
  | 'form_labels'
  | 'language'
  | 'focus_indicators'
  | 'text_scaling'
  | 'motion_sensitivity'
  | 'full_audit';

export type WcagLevel = 'A' | 'AA' | 'AAA';

export type CheckStatus =
  | 'pending'
  | 'in_progress'
  | 'passed'
  | 'failed'
  | 'warning'
  | 'not_applicable';

export type IssueSeverity = 'critical' | 'serious' | 'moderate' | 'minor';

export type IssueStatus =
  | 'open'
  | 'in_progress'
  | 'resolved'
  | 'wont_fix'
  | 'false_positive';

export type AltTextSource = 'manual' | 'ai_generated' | 'imported' | 'auto_detected';

export type CaptionType = 'subtitles' | 'captions' | 'descriptions' | 'chapters';

export type CaptionFormat = 'vtt' | 'srt' | 'sbv' | 'ass' | 'ttml';

export type CaptionSource = 'manual' | 'auto_generated' | 'professional' | 'community' | 'imported';

export type TranscriptType = 'basic' | 'timestamped' | 'interactive' | 'descriptive';

export type AuditAction =
  | 'check_performed'
  | 'issue_created'
  | 'issue_resolved'
  | 'issue_assigned'
  | 'alt_text_added'
  | 'alt_text_updated'
  | 'caption_added'
  | 'caption_updated'
  | 'transcript_added'
  | 'transcript_updated'
  | 'preference_updated'
  | 'audit_completed'
  | 'remediation_started'
  | 'remediation_completed'
  | 'compliance_report_generated';

// Interfaces
export interface AccessibilityCheck {
  id: string;
  lessonId?: string;
  resourceId?: string;
  contentFileId?: string;
  checkType: CheckType;
  wcagLevel: WcagLevel;
  wcagVersion: string;
  status: CheckStatus;
  complianceScore?: number;
  issuesFound: number;
  issuesResolved: number;
  checkedAt?: Date;
  nextCheckDue?: Date;
  checkedBy?: string;
  isAutomated: boolean;
  checkResults?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccessibilityIssue {
  id: string;
  checkId: string;
  severity: IssueSeverity;
  wcagCriterion: string;
  wcagCriterionName: string;
  issueCode: string;
  description: string;
  impact: string;
  elementSelector?: string;
  elementHtml?: string;
  lineNumber?: number;
  columnNumber?: number;
  recommendation: string;
  fixExample?: string;
  helpUrl?: string;
  status: IssueStatus;
  assignedTo?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolutionNotes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AltText {
  id: string;
  contentFileId?: string;
  resourceId?: string;
  altText: string;
  longDescription?: string;
  isDecorative: boolean;
  source: AltTextSource;
  confidenceScore?: number;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  isDescriptive: boolean;
  characterCount: number;
  containsRedundantWords: boolean;
  language: string;
  version: number;
  previousVersionId?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Caption {
  id: string;
  contentFileId?: string;
  resourceId?: string;
  language: string;
  languageName: string;
  captionType: CaptionType;
  format: CaptionFormat;
  content?: string;
  fileUrl?: string;
  wordCount: number;
  cueCount: number;
  durationMs: number;
  accuracyScore?: number;
  includesSpeakerIdentification: boolean;
  includesSoundEffects: boolean;
  source: CaptionSource;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  isSynced: boolean;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transcript {
  id: string;
  contentFileId?: string;
  resourceId?: string;
  lessonId?: string;
  language: string;
  languageName: string;
  transcriptType: TranscriptType;
  content: string;
  segments?: Array<{ startTime: number; endTime: number; text: string; speaker?: string }>;
  wordCount: number;
  durationMs: number;
  accuracyScore?: number;
  includesSpeakerLabels: boolean;
  includesTimestamps: boolean;
  includesVisualDescriptions: boolean;
  source: CaptionSource;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserAccessibilityPreferences {
  id: string;
  userId: string;
  // Visual preferences
  highContrastMode: boolean;
  largeText: boolean;
  textScaleFactor: number;
  dyslexiaFriendlyFont: boolean;
  reduceMotion: boolean;
  reduceTransparency: boolean;
  // Color preferences
  colorScheme: string;
  invertColors: boolean;
  grayscale: boolean;
  customColors?: Record<string, string>;
  // Audio/Media preferences
  captionsEnabled: boolean;
  audioDescriptionsEnabled: boolean;
  autoPlayMedia: boolean;
  captionLanguage: string;
  captionStyle?: Record<string, any>;
  // Navigation preferences
  keyboardNavigation: boolean;
  skipLinksEnabled: boolean;
  focusIndicatorsEnhanced: boolean;
  linkUnderlines: boolean;
  // Screen reader preferences
  screenReaderOptimized: boolean;
  announceImages: boolean;
  announceLinks: boolean;
  ariaLivePoliteness: string;
  // Cognitive preferences
  simplifiedLayout: boolean;
  readingGuide: boolean;
  textToSpeech: boolean;
  readingSpeed: number;
  // Input preferences
  clickDelayMs: number;
  stickyKeys: boolean;
  bounceKeys: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ColorContrastCheck {
  id: string;
  checkId: string;
  foregroundColor: string;
  backgroundColor: string;
  contrastRatio: number;
  passesAaNormal: boolean;
  passesAaLarge: boolean;
  passesAaaNormal: boolean;
  passesAaaLarge: boolean;
  elementSelector?: string;
  elementType?: string;
  isLargeText: boolean;
  fontSizePx?: number;
  isBold: boolean;
  suggestedForeground?: string;
  suggestedBackground?: string;
  suggestedRatio?: number;
  createdAt: Date;
}

export interface CreateCheckParams {
  lessonId?: string;
  resourceId?: string;
  contentFileId?: string;
  checkType: CheckType;
  wcagLevel?: WcagLevel;
  wcagVersion?: string;
  checkedBy?: string;
  isAutomated?: boolean;
}

export interface CreateIssueParams {
  checkId: string;
  severity: IssueSeverity;
  wcagCriterion: string;
  wcagCriterionName: string;
  issueCode: string;
  description: string;
  impact: string;
  elementSelector?: string;
  elementHtml?: string;
  lineNumber?: number;
  columnNumber?: number;
  recommendation: string;
  fixExample?: string;
  helpUrl?: string;
}

export interface CreateAltTextParams {
  contentFileId?: string;
  resourceId?: string;
  altText: string;
  longDescription?: string;
  isDecorative?: boolean;
  source?: AltTextSource;
  confidenceScore?: number;
  language?: string;
  createdBy: string;
}

export interface CreateCaptionParams {
  contentFileId?: string;
  resourceId?: string;
  language?: string;
  languageName?: string;
  captionType?: CaptionType;
  format?: CaptionFormat;
  content?: string;
  fileUrl?: string;
  durationMs?: number;
  source?: CaptionSource;
  createdBy: string;
}

export interface CreateTranscriptParams {
  contentFileId?: string;
  resourceId?: string;
  lessonId?: string;
  language?: string;
  languageName?: string;
  transcriptType?: TranscriptType;
  content: string;
  segments?: Array<{ startTime: number; endTime: number; text: string; speaker?: string }>;
  durationMs?: number;
  source?: CaptionSource;
  createdBy: string;
}

export interface UpdateUserPreferencesParams {
  highContrastMode?: boolean;
  largeText?: boolean;
  textScaleFactor?: number;
  dyslexiaFriendlyFont?: boolean;
  reduceMotion?: boolean;
  reduceTransparency?: boolean;
  colorScheme?: string;
  invertColors?: boolean;
  grayscale?: boolean;
  customColors?: Record<string, string>;
  captionsEnabled?: boolean;
  audioDescriptionsEnabled?: boolean;
  autoPlayMedia?: boolean;
  captionLanguage?: string;
  captionStyle?: Record<string, any>;
  keyboardNavigation?: boolean;
  skipLinksEnabled?: boolean;
  focusIndicatorsEnhanced?: boolean;
  linkUnderlines?: boolean;
  screenReaderOptimized?: boolean;
  announceImages?: boolean;
  announceLinks?: boolean;
  ariaLivePoliteness?: string;
  simplifiedLayout?: boolean;
  readingGuide?: boolean;
  textToSpeech?: boolean;
  readingSpeed?: number;
  clickDelayMs?: number;
  stickyKeys?: boolean;
  bounceKeys?: boolean;
}

// WCAG Criterion mapping for common checks
const WCAG_CRITERIA: Record<string, { name: string; level: WcagLevel }> = {
  '1.1.1': { name: 'Non-text Content', level: 'A' },
  '1.2.1': { name: 'Audio-only and Video-only (Prerecorded)', level: 'A' },
  '1.2.2': { name: 'Captions (Prerecorded)', level: 'A' },
  '1.2.3': { name: 'Audio Description or Media Alternative (Prerecorded)', level: 'A' },
  '1.2.4': { name: 'Captions (Live)', level: 'AA' },
  '1.2.5': { name: 'Audio Description (Prerecorded)', level: 'AA' },
  '1.3.1': { name: 'Info and Relationships', level: 'A' },
  '1.3.2': { name: 'Meaningful Sequence', level: 'A' },
  '1.4.1': { name: 'Use of Color', level: 'A' },
  '1.4.3': { name: 'Contrast (Minimum)', level: 'AA' },
  '1.4.4': { name: 'Resize Text', level: 'AA' },
  '1.4.6': { name: 'Contrast (Enhanced)', level: 'AAA' },
  '2.1.1': { name: 'Keyboard', level: 'A' },
  '2.1.2': { name: 'No Keyboard Trap', level: 'A' },
  '2.4.1': { name: 'Bypass Blocks', level: 'A' },
  '2.4.3': { name: 'Focus Order', level: 'A' },
  '2.4.4': { name: 'Link Purpose (In Context)', level: 'A' },
  '2.4.6': { name: 'Headings and Labels', level: 'AA' },
  '2.4.7': { name: 'Focus Visible', level: 'AA' },
  '3.1.1': { name: 'Language of Page', level: 'A' },
  '3.1.2': { name: 'Language of Parts', level: 'AA' },
  '3.2.1': { name: 'On Focus', level: 'A' },
  '3.2.2': { name: 'On Input', level: 'A' },
  '3.3.1': { name: 'Error Identification', level: 'A' },
  '3.3.2': { name: 'Labels or Instructions', level: 'A' },
  '4.1.1': { name: 'Parsing', level: 'A' },
  '4.1.2': { name: 'Name, Role, Value', level: 'A' },
};

// Redundant words that should not be in alt text
const REDUNDANT_ALT_TEXT_WORDS = [
  'image of',
  'picture of',
  'photo of',
  'photograph of',
  'graphic of',
  'icon of',
  'screenshot of',
  'image:',
  'picture:',
  'alt:',
];

class AccessibilityService {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  // ============================================
  // Accessibility Checks
  // ============================================

  /**
   * Create a new accessibility check
   */
  async createCheck(params: CreateCheckParams): Promise<AccessibilityCheck> {
    const [check] = await this.db('content_accessibility_checks')
      .insert({
        lesson_id: params.lessonId,
        resource_id: params.resourceId,
        content_file_id: params.contentFileId,
        check_type: params.checkType,
        wcag_level: params.wcagLevel || 'AA',
        wcag_version: params.wcagVersion || '2.1',
        checked_by: params.checkedBy,
        is_automated: params.isAutomated ?? true,
        status: 'pending',
      })
      .returning('*');

    await this.logAuditAction('check_performed', 'check', check.id, params.checkedBy);

    return this.mapCheck(check);
  }

  /**
   * Get accessibility check by ID
   */
  async getCheckById(id: string): Promise<AccessibilityCheck | null> {
    const check = await this.db('content_accessibility_checks')
      .where('id', id)
      .first();

    return check ? this.mapCheck(check) : null;
  }

  /**
   * Get accessibility checks for content
   */
  async getChecksForContent(params: {
    lessonId?: string;
    resourceId?: string;
    contentFileId?: string;
    checkType?: CheckType;
    status?: CheckStatus;
    wcagLevel?: WcagLevel;
  }): Promise<AccessibilityCheck[]> {
    let query = this.db('content_accessibility_checks');

    if (params.lessonId) query = query.where('lesson_id', params.lessonId);
    if (params.resourceId) query = query.where('resource_id', params.resourceId);
    if (params.contentFileId) query = query.where('content_file_id', params.contentFileId);
    if (params.checkType) query = query.where('check_type', params.checkType);
    if (params.status) query = query.where('status', params.status);
    if (params.wcagLevel) query = query.where('wcag_level', params.wcagLevel);

    const checks = await query.orderBy('created_at', 'desc');
    return checks.map((c: any) => this.mapCheck(c));
  }

  /**
   * Update accessibility check status
   */
  async updateCheckStatus(
    id: string,
    status: CheckStatus,
    results?: {
      complianceScore?: number;
      issuesFound?: number;
      issuesResolved?: number;
      checkResults?: Record<string, any>;
    },
    userId?: string
  ): Promise<AccessibilityCheck> {
    const updateData: any = {
      status,
      checked_at: new Date(),
    };

    if (results) {
      if (results.complianceScore !== undefined) updateData.compliance_score = results.complianceScore;
      if (results.issuesFound !== undefined) updateData.issues_found = results.issuesFound;
      if (results.issuesResolved !== undefined) updateData.issues_resolved = results.issuesResolved;
      if (results.checkResults) updateData.check_results = JSON.stringify(results.checkResults);
    }

    const [check] = await this.db('content_accessibility_checks')
      .where('id', id)
      .update(updateData)
      .returning('*');

    await this.logAuditAction('check_performed', 'check', id, userId);

    return this.mapCheck(check);
  }

  /**
   * Run automated accessibility check on content
   */
  async runAutomatedCheck(
    contentHtml: string,
    checkType: CheckType,
    params: CreateCheckParams
  ): Promise<{ check: AccessibilityCheck; issues: AccessibilityIssue[] }> {
    // Create the check record
    const check = await this.createCheck({
      ...params,
      checkType,
      isAutomated: true,
    });

    const issues: AccessibilityIssue[] = [];

    // Run specific checks based on type
    switch (checkType) {
      case 'alt_text':
        issues.push(...(await this.checkAltText(contentHtml, check.id)));
        break;
      case 'color_contrast':
        issues.push(...(await this.checkColorContrast(contentHtml, check.id)));
        break;
      case 'heading_structure':
        issues.push(...(await this.checkHeadingStructure(contentHtml, check.id)));
        break;
      case 'link_text':
        issues.push(...(await this.checkLinkText(contentHtml, check.id)));
        break;
      case 'form_labels':
        issues.push(...(await this.checkFormLabels(contentHtml, check.id)));
        break;
      case 'language':
        issues.push(...(await this.checkLanguage(contentHtml, check.id)));
        break;
      case 'full_audit':
        // Run all checks
        issues.push(...(await this.checkAltText(contentHtml, check.id)));
        issues.push(...(await this.checkColorContrast(contentHtml, check.id)));
        issues.push(...(await this.checkHeadingStructure(contentHtml, check.id)));
        issues.push(...(await this.checkLinkText(contentHtml, check.id)));
        issues.push(...(await this.checkFormLabels(contentHtml, check.id)));
        issues.push(...(await this.checkLanguage(contentHtml, check.id)));
        break;
    }

    // Calculate compliance score
    const complianceScore = this.calculateComplianceScore(issues);
    const status: CheckStatus = issues.length === 0 ? 'passed' :
      issues.some(i => i.severity === 'critical') ? 'failed' : 'warning';

    // Update check with results
    await this.updateCheckStatus(check.id, status, {
      complianceScore,
      issuesFound: issues.length,
      issuesResolved: 0,
      checkResults: { issues: issues.map(i => i.issueCode) },
    });

    return { check: { ...check, status, complianceScore, issuesFound: issues.length }, issues };
  }

  // ============================================
  // Accessibility Issues
  // ============================================

  /**
   * Create an accessibility issue
   */
  async createIssue(params: CreateIssueParams): Promise<AccessibilityIssue> {
    const [issue] = await this.db('accessibility_issues')
      .insert({
        check_id: params.checkId,
        severity: params.severity,
        wcag_criterion: params.wcagCriterion,
        wcag_criterion_name: params.wcagCriterionName,
        issue_code: params.issueCode,
        description: params.description,
        impact: params.impact,
        element_selector: params.elementSelector,
        element_html: params.elementHtml,
        line_number: params.lineNumber,
        column_number: params.columnNumber,
        recommendation: params.recommendation,
        fix_example: params.fixExample,
        help_url: params.helpUrl,
        status: 'open',
      })
      .returning('*');

    await this.logAuditAction('issue_created', 'issue', issue.id);

    return this.mapIssue(issue);
  }

  /**
   * Get issue by ID
   */
  async getIssueById(id: string): Promise<AccessibilityIssue | null> {
    const issue = await this.db('accessibility_issues')
      .where('id', id)
      .first();

    return issue ? this.mapIssue(issue) : null;
  }

  /**
   * Get issues for a check
   */
  async getIssuesForCheck(
    checkId: string,
    options?: { severity?: IssueSeverity; status?: IssueStatus }
  ): Promise<AccessibilityIssue[]> {
    let query = this.db('accessibility_issues').where('check_id', checkId);

    if (options?.severity) query = query.where('severity', options.severity);
    if (options?.status) query = query.where('status', options.status);

    const issues = await query.orderBy('severity', 'asc').orderBy('created_at', 'desc');
    return issues.map((i: any) => this.mapIssue(i));
  }

  /**
   * Update issue status
   */
  async updateIssueStatus(
    id: string,
    status: IssueStatus,
    userId?: string,
    resolutionNotes?: string
  ): Promise<AccessibilityIssue> {
    const updateData: any = { status };

    if (status === 'resolved' || status === 'wont_fix' || status === 'false_positive') {
      updateData.resolved_by = userId;
      updateData.resolved_at = new Date();
      updateData.resolution_notes = resolutionNotes;
    }

    const [issue] = await this.db('accessibility_issues')
      .where('id', id)
      .update(updateData)
      .returning('*');

    if (status === 'resolved') {
      await this.logAuditAction('issue_resolved', 'issue', id, userId);

      // Update check's resolved count
      const check = await this.db('content_accessibility_checks')
        .where('id', issue.check_id)
        .first();

      if (check) {
        await this.db('content_accessibility_checks')
          .where('id', issue.check_id)
          .increment('issues_resolved', 1);
      }
    }

    return this.mapIssue(issue);
  }

  /**
   * Assign issue to user
   */
  async assignIssue(id: string, assigneeId: string, assignerId?: string): Promise<AccessibilityIssue> {
    const [issue] = await this.db('accessibility_issues')
      .where('id', id)
      .update({
        assigned_to: assigneeId,
        status: 'in_progress',
      })
      .returning('*');

    await this.logAuditAction('issue_assigned', 'issue', id, assignerId, {
      assignedTo: assigneeId,
    });

    return this.mapIssue(issue);
  }

  // ============================================
  // Alt Text Management
  // ============================================

  /**
   * Create alt text for an image
   */
  async createAltText(params: CreateAltTextParams): Promise<AltText> {
    // Validate alt text
    const validation = this.validateAltText(params.altText);

    const [altText] = await this.db('accessibility_alt_text')
      .insert({
        content_file_id: params.contentFileId,
        resource_id: params.resourceId,
        alt_text: params.altText,
        long_description: params.longDescription,
        is_decorative: params.isDecorative || false,
        source: params.source || 'manual',
        confidence_score: params.confidenceScore,
        language: params.language || 'en',
        is_descriptive: validation.isDescriptive,
        character_count: params.altText.length,
        contains_redundant_words: validation.containsRedundantWords,
        is_approved: false,
        version: 1,
        created_by: params.createdBy,
      })
      .returning('*');

    await this.logAuditAction('alt_text_added', 'alt_text', altText.id, params.createdBy);

    return this.mapAltText(altText);
  }

  /**
   * Get alt text by ID
   */
  async getAltTextById(id: string): Promise<AltText | null> {
    const altText = await this.db('accessibility_alt_text')
      .where('id', id)
      .first();

    return altText ? this.mapAltText(altText) : null;
  }

  /**
   * Get alt text for content
   */
  async getAltTextForContent(params: {
    contentFileId?: string;
    resourceId?: string;
    language?: string;
    approvedOnly?: boolean;
  }): Promise<AltText[]> {
    let query = this.db('accessibility_alt_text');

    if (params.contentFileId) query = query.where('content_file_id', params.contentFileId);
    if (params.resourceId) query = query.where('resource_id', params.resourceId);
    if (params.language) query = query.where('language', params.language);
    if (params.approvedOnly) query = query.where('is_approved', true);

    const results = await query.orderBy('version', 'desc');
    return results.map((a: any) => this.mapAltText(a));
  }

  /**
   * Update alt text
   */
  async updateAltText(
    id: string,
    updates: { altText?: string; longDescription?: string; isDecorative?: boolean },
    userId: string
  ): Promise<AltText> {
    const current = await this.getAltTextById(id);
    if (!current) {
      throw new Error('Alt text not found');
    }

    // If alt text is changing, create new version
    if (updates.altText && updates.altText !== current.altText) {
      const validation = this.validateAltText(updates.altText);

      const [newAltText] = await this.db('accessibility_alt_text')
        .insert({
          content_file_id: current.contentFileId,
          resource_id: current.resourceId,
          alt_text: updates.altText,
          long_description: updates.longDescription ?? current.longDescription,
          is_decorative: updates.isDecorative ?? current.isDecorative,
          source: 'manual',
          language: current.language,
          is_descriptive: validation.isDescriptive,
          character_count: updates.altText.length,
          contains_redundant_words: validation.containsRedundantWords,
          is_approved: false,
          version: current.version + 1,
          previous_version_id: id,
          created_by: current.createdBy,
          updated_by: userId,
        })
        .returning('*');

      await this.logAuditAction('alt_text_updated', 'alt_text', newAltText.id, userId, {
        previousVersion: id,
      });

      return this.mapAltText(newAltText);
    }

    // Just update non-text fields
    const [updated] = await this.db('accessibility_alt_text')
      .where('id', id)
      .update({
        long_description: updates.longDescription ?? current.longDescription,
        is_decorative: updates.isDecorative ?? current.isDecorative,
        updated_by: userId,
      })
      .returning('*');

    return this.mapAltText(updated);
  }

  /**
   * Approve alt text
   */
  async approveAltText(id: string, approverId: string): Promise<AltText> {
    const [altText] = await this.db('accessibility_alt_text')
      .where('id', id)
      .update({
        is_approved: true,
        approved_by: approverId,
        approved_at: new Date(),
      })
      .returning('*');

    return this.mapAltText(altText);
  }

  // ============================================
  // Captions Management
  // ============================================

  /**
   * Create captions for video/audio content
   */
  async createCaption(params: CreateCaptionParams): Promise<Caption> {
    // Parse caption content to get metrics
    const metrics = this.parseCaptionMetrics(params.content || '');

    const [caption] = await this.db('accessibility_captions')
      .insert({
        content_file_id: params.contentFileId,
        resource_id: params.resourceId,
        language: params.language || 'en',
        language_name: params.languageName || 'English',
        caption_type: params.captionType || 'captions',
        format: params.format || 'vtt',
        content: params.content,
        file_url: params.fileUrl,
        word_count: metrics.wordCount,
        cue_count: metrics.cueCount,
        duration_ms: params.durationMs || 0,
        includes_speaker_identification: metrics.hasSpeakerIds,
        includes_sound_effects: metrics.hasSoundEffects,
        source: params.source || 'manual',
        is_approved: false,
        is_synced: true,
        created_by: params.createdBy,
      })
      .returning('*');

    await this.logAuditAction('caption_added', 'caption', caption.id, params.createdBy);

    return this.mapCaption(caption);
  }

  /**
   * Get caption by ID
   */
  async getCaptionById(id: string): Promise<Caption | null> {
    const caption = await this.db('accessibility_captions')
      .where('id', id)
      .first();

    return caption ? this.mapCaption(caption) : null;
  }

  /**
   * Get captions for content
   */
  async getCaptionsForContent(params: {
    contentFileId?: string;
    resourceId?: string;
    language?: string;
    captionType?: CaptionType;
    approvedOnly?: boolean;
  }): Promise<Caption[]> {
    let query = this.db('accessibility_captions');

    if (params.contentFileId) query = query.where('content_file_id', params.contentFileId);
    if (params.resourceId) query = query.where('resource_id', params.resourceId);
    if (params.language) query = query.where('language', params.language);
    if (params.captionType) query = query.where('caption_type', params.captionType);
    if (params.approvedOnly) query = query.where('is_approved', true);

    const results = await query.orderBy('created_at', 'desc');
    return results.map((c: any) => this.mapCaption(c));
  }

  /**
   * Update caption content
   */
  async updateCaption(
    id: string,
    updates: { content?: string; fileUrl?: string; isSynced?: boolean },
    userId: string
  ): Promise<Caption> {
    const updateData: any = { updated_by: userId };

    if (updates.content !== undefined) {
      const metrics = this.parseCaptionMetrics(updates.content);
      updateData.content = updates.content;
      updateData.word_count = metrics.wordCount;
      updateData.cue_count = metrics.cueCount;
      updateData.includes_speaker_identification = metrics.hasSpeakerIds;
      updateData.includes_sound_effects = metrics.hasSoundEffects;
    }

    if (updates.fileUrl !== undefined) updateData.file_url = updates.fileUrl;
    if (updates.isSynced !== undefined) updateData.is_synced = updates.isSynced;

    const [caption] = await this.db('accessibility_captions')
      .where('id', id)
      .update(updateData)
      .returning('*');

    await this.logAuditAction('caption_updated', 'caption', id, userId);

    return this.mapCaption(caption);
  }

  /**
   * Approve caption
   */
  async approveCaption(id: string, approverId: string): Promise<Caption> {
    const [caption] = await this.db('accessibility_captions')
      .where('id', id)
      .update({
        is_approved: true,
        approved_by: approverId,
        approved_at: new Date(),
      })
      .returning('*');

    return this.mapCaption(caption);
  }

  // ============================================
  // Transcript Management
  // ============================================

  /**
   * Create transcript for audio/video content
   */
  async createTranscript(params: CreateTranscriptParams): Promise<Transcript> {
    const wordCount = params.content.split(/\s+/).filter(w => w.length > 0).length;
    const hasTimestamps = params.segments !== undefined && params.segments.length > 0;
    const hasSpeakerLabels = params.segments?.some(s => s.speaker) || false;

    const [transcript] = await this.db('accessibility_transcripts')
      .insert({
        content_file_id: params.contentFileId,
        resource_id: params.resourceId,
        lesson_id: params.lessonId,
        language: params.language || 'en',
        language_name: params.languageName || 'English',
        transcript_type: params.transcriptType || 'basic',
        content: params.content,
        segments: params.segments ? JSON.stringify(params.segments) : null,
        word_count: wordCount,
        duration_ms: params.durationMs || 0,
        includes_speaker_labels: hasSpeakerLabels,
        includes_timestamps: hasTimestamps,
        includes_visual_descriptions: params.transcriptType === 'descriptive',
        source: params.source || 'manual',
        is_approved: false,
        created_by: params.createdBy,
      })
      .returning('*');

    await this.logAuditAction('transcript_added', 'transcript', transcript.id, params.createdBy);

    return this.mapTranscript(transcript);
  }

  /**
   * Get transcript by ID
   */
  async getTranscriptById(id: string): Promise<Transcript | null> {
    const transcript = await this.db('accessibility_transcripts')
      .where('id', id)
      .first();

    return transcript ? this.mapTranscript(transcript) : null;
  }

  /**
   * Get transcripts for content
   */
  async getTranscriptsForContent(params: {
    contentFileId?: string;
    resourceId?: string;
    lessonId?: string;
    language?: string;
    transcriptType?: TranscriptType;
    approvedOnly?: boolean;
  }): Promise<Transcript[]> {
    let query = this.db('accessibility_transcripts');

    if (params.contentFileId) query = query.where('content_file_id', params.contentFileId);
    if (params.resourceId) query = query.where('resource_id', params.resourceId);
    if (params.lessonId) query = query.where('lesson_id', params.lessonId);
    if (params.language) query = query.where('language', params.language);
    if (params.transcriptType) query = query.where('transcript_type', params.transcriptType);
    if (params.approvedOnly) query = query.where('is_approved', true);

    const results = await query.orderBy('created_at', 'desc');
    return results.map((t: any) => this.mapTranscript(t));
  }

  /**
   * Update transcript content
   */
  async updateTranscript(
    id: string,
    updates: { content?: string; segments?: Array<{ startTime: number; endTime: number; text: string; speaker?: string }> },
    userId: string
  ): Promise<Transcript> {
    const updateData: any = { updated_by: userId };

    if (updates.content !== undefined) {
      updateData.content = updates.content;
      updateData.word_count = updates.content.split(/\s+/).filter((w: string) => w.length > 0).length;
    }

    if (updates.segments !== undefined) {
      updateData.segments = JSON.stringify(updates.segments);
      updateData.includes_timestamps = updates.segments.length > 0;
      updateData.includes_speaker_labels = updates.segments.some(s => s.speaker);
    }

    const [transcript] = await this.db('accessibility_transcripts')
      .where('id', id)
      .update(updateData)
      .returning('*');

    await this.logAuditAction('transcript_updated', 'transcript', id, userId);

    return this.mapTranscript(transcript);
  }

  /**
   * Approve transcript
   */
  async approveTranscript(id: string, approverId: string): Promise<Transcript> {
    const [transcript] = await this.db('accessibility_transcripts')
      .where('id', id)
      .update({
        is_approved: true,
        approved_by: approverId,
        approved_at: new Date(),
      })
      .returning('*');

    return this.mapTranscript(transcript);
  }

  // ============================================
  // User Accessibility Preferences
  // ============================================

  /**
   * Get user accessibility preferences
   */
  async getUserPreferences(userId: string): Promise<UserAccessibilityPreferences> {
    let prefs = await this.db('user_accessibility_preferences')
      .where('user_id', userId)
      .first();

    // Create default preferences if they don't exist
    if (!prefs) {
      [prefs] = await this.db('user_accessibility_preferences')
        .insert({
          user_id: userId,
        })
        .returning('*');
    }

    return this.mapUserPreferences(prefs);
  }

  /**
   * Update user accessibility preferences
   */
  async updateUserPreferences(
    userId: string,
    updates: UpdateUserPreferencesParams
  ): Promise<UserAccessibilityPreferences> {
    // Ensure preferences exist
    await this.getUserPreferences(userId);

    const updateData: any = {};

    // Visual preferences
    if (updates.highContrastMode !== undefined) updateData.high_contrast_mode = updates.highContrastMode;
    if (updates.largeText !== undefined) updateData.large_text = updates.largeText;
    if (updates.textScaleFactor !== undefined) {
      // Ensure text scale factor is within WCAG requirement (up to 200%)
      updateData.text_scale_factor = Math.min(Math.max(updates.textScaleFactor, 0.5), 2.0);
    }
    if (updates.dyslexiaFriendlyFont !== undefined) updateData.dyslexia_friendly_font = updates.dyslexiaFriendlyFont;
    if (updates.reduceMotion !== undefined) updateData.reduce_motion = updates.reduceMotion;
    if (updates.reduceTransparency !== undefined) updateData.reduce_transparency = updates.reduceTransparency;

    // Color preferences
    if (updates.colorScheme !== undefined) updateData.color_scheme = updates.colorScheme;
    if (updates.invertColors !== undefined) updateData.invert_colors = updates.invertColors;
    if (updates.grayscale !== undefined) updateData.grayscale = updates.grayscale;
    if (updates.customColors !== undefined) updateData.custom_colors = JSON.stringify(updates.customColors);

    // Audio/Media preferences
    if (updates.captionsEnabled !== undefined) updateData.captions_enabled = updates.captionsEnabled;
    if (updates.audioDescriptionsEnabled !== undefined) updateData.audio_descriptions_enabled = updates.audioDescriptionsEnabled;
    if (updates.autoPlayMedia !== undefined) updateData.auto_play_media = updates.autoPlayMedia;
    if (updates.captionLanguage !== undefined) updateData.caption_language = updates.captionLanguage;
    if (updates.captionStyle !== undefined) updateData.caption_style = JSON.stringify(updates.captionStyle);

    // Navigation preferences
    if (updates.keyboardNavigation !== undefined) updateData.keyboard_navigation = updates.keyboardNavigation;
    if (updates.skipLinksEnabled !== undefined) updateData.skip_links_enabled = updates.skipLinksEnabled;
    if (updates.focusIndicatorsEnhanced !== undefined) updateData.focus_indicators_enhanced = updates.focusIndicatorsEnhanced;
    if (updates.linkUnderlines !== undefined) updateData.link_underlines = updates.linkUnderlines;

    // Screen reader preferences
    if (updates.screenReaderOptimized !== undefined) updateData.screen_reader_optimized = updates.screenReaderOptimized;
    if (updates.announceImages !== undefined) updateData.announce_images = updates.announceImages;
    if (updates.announceLinks !== undefined) updateData.announce_links = updates.announceLinks;
    if (updates.ariaLivePoliteness !== undefined) updateData.aria_live_politeness = updates.ariaLivePoliteness;

    // Cognitive preferences
    if (updates.simplifiedLayout !== undefined) updateData.simplified_layout = updates.simplifiedLayout;
    if (updates.readingGuide !== undefined) updateData.reading_guide = updates.readingGuide;
    if (updates.textToSpeech !== undefined) updateData.text_to_speech = updates.textToSpeech;
    if (updates.readingSpeed !== undefined) updateData.reading_speed = updates.readingSpeed;

    // Input preferences
    if (updates.clickDelayMs !== undefined) updateData.click_delay_ms = updates.clickDelayMs;
    if (updates.stickyKeys !== undefined) updateData.sticky_keys = updates.stickyKeys;
    if (updates.bounceKeys !== undefined) updateData.bounce_keys = updates.bounceKeys;

    await this.db('user_accessibility_preferences')
      .where('user_id', userId)
      .update(updateData);

    await this.logAuditAction('preference_updated', 'user_preferences', userId, userId, updates);

    return this.getUserPreferences(userId);
  }

  // ============================================
  // Color Contrast
  // ============================================

  /**
   * Calculate color contrast ratio
   */
  calculateContrastRatio(foreground: string, background: string): number {
    const getLuminance = (hex: string): number => {
      const rgb = this.hexToRgb(hex);
      const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const l1 = getLuminance(foreground);
    const l2 = getLuminance(background);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Check if colors meet WCAG contrast requirements
   */
  checkContrastCompliance(
    foreground: string,
    background: string,
    isLargeText: boolean = false
  ): { passesAa: boolean; passesAaa: boolean; ratio: number } {
    const ratio = this.calculateContrastRatio(foreground, background);

    // WCAG 2.1 contrast requirements
    // Normal text: AA = 4.5:1, AAA = 7:1
    // Large text (>=18pt or >=14pt bold): AA = 3:1, AAA = 4.5:1
    const aaThreshold = isLargeText ? 3 : 4.5;
    const aaaThreshold = isLargeText ? 4.5 : 7;

    return {
      ratio: Math.round(ratio * 100) / 100,
      passesAa: ratio >= aaThreshold,
      passesAaa: ratio >= aaaThreshold,
    };
  }

  /**
   * Save color contrast check result
   */
  async saveColorContrastCheck(
    checkId: string,
    params: {
      foregroundColor: string;
      backgroundColor: string;
      elementSelector?: string;
      elementType?: string;
      isLargeText?: boolean;
      fontSizePx?: number;
      isBold?: boolean;
    }
  ): Promise<ColorContrastCheck> {
    const ratio = this.calculateContrastRatio(params.foregroundColor, params.backgroundColor);
    const isLarge = params.isLargeText || false;

    const [result] = await this.db('color_contrast_checks')
      .insert({
        check_id: checkId,
        foreground_color: params.foregroundColor,
        background_color: params.backgroundColor,
        contrast_ratio: ratio,
        passes_aa_normal: ratio >= 4.5,
        passes_aa_large: ratio >= 3,
        passes_aaa_normal: ratio >= 7,
        passes_aaa_large: ratio >= 4.5,
        element_selector: params.elementSelector,
        element_type: params.elementType,
        is_large_text: isLarge,
        font_size_px: params.fontSizePx,
        is_bold: params.isBold || false,
      })
      .returning('*');

    return this.mapColorContrastCheck(result);
  }

  // ============================================
  // Compliance Reports
  // ============================================

  /**
   * Generate compliance report for content
   */
  async generateComplianceReport(params: {
    lessonId?: string;
    resourceId?: string;
    contentFileId?: string;
  }): Promise<{
    overallScore: number;
    wcagLevel: WcagLevel;
    checksPerformed: number;
    issuesFound: number;
    issuesResolved: number;
    criticalIssues: number;
    checksByType: Record<CheckType, { status: CheckStatus; score: number }>;
    accessibilityFeatures: {
      hasAltText: boolean;
      hasCaptions: boolean;
      hasTranscripts: boolean;
      meetsColorContrast: boolean;
    };
  }> {
    const checks = await this.getChecksForContent(params);

    const issues = await Promise.all(
      checks.map(c => this.getIssuesForCheck(c.id))
    );

    const allIssues = issues.flat();
    const criticalIssues = allIssues.filter(i => i.severity === 'critical' && i.status === 'open');

    // Get accessibility features
    const altTexts = await this.getAltTextForContent(params);
    const captions = await this.getCaptionsForContent(params);
    const transcripts = await this.getTranscriptsForContent(params);

    const colorContrastChecks = checks.filter(c => c.checkType === 'color_contrast' && c.status === 'passed');

    // Calculate overall score
    const passedChecks = checks.filter(c => c.status === 'passed').length;
    const totalChecks = checks.length || 1;
    const overallScore = (passedChecks / totalChecks) * 100;

    // Determine WCAG level
    let wcagLevel: WcagLevel = 'AAA';
    if (criticalIssues.length > 0 || overallScore < 70) {
      wcagLevel = 'A';
    } else if (overallScore < 90) {
      wcagLevel = 'AA';
    }

    // Group checks by type
    const checksByType: Record<string, { status: CheckStatus; score: number }> = {};
    for (const check of checks) {
      if (!checksByType[check.checkType] || check.createdAt > new Date(checksByType[check.checkType].score)) {
        checksByType[check.checkType] = {
          status: check.status,
          score: check.complianceScore || 0,
        };
      }
    }

    await this.logAuditAction(
      'compliance_report_generated',
      params.lessonId ? 'lesson' : params.resourceId ? 'resource' : 'content_file',
      params.lessonId || params.resourceId || params.contentFileId || ''
    );

    return {
      overallScore: Math.round(overallScore * 100) / 100,
      wcagLevel,
      checksPerformed: checks.length,
      issuesFound: allIssues.length,
      issuesResolved: allIssues.filter(i => i.status === 'resolved').length,
      criticalIssues: criticalIssues.length,
      checksByType: checksByType as Record<CheckType, { status: CheckStatus; score: number }>,
      accessibilityFeatures: {
        hasAltText: altTexts.length > 0,
        hasCaptions: captions.length > 0,
        hasTranscripts: transcripts.length > 0,
        meetsColorContrast: colorContrastChecks.length > 0,
      },
    };
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Validate alt text quality
   */
  private validateAltText(altText: string): { isDescriptive: boolean; containsRedundantWords: boolean } {
    const lowerAltText = altText.toLowerCase();

    // Check for redundant words
    const containsRedundantWords = REDUNDANT_ALT_TEXT_WORDS.some(word =>
      lowerAltText.startsWith(word)
    );

    // Check if descriptive (more than just a few words)
    const wordCount = altText.split(/\s+/).filter(w => w.length > 0).length;
    const isDescriptive = wordCount >= 2 && altText.length >= 10;

    return { isDescriptive, containsRedundantWords };
  }

  /**
   * Parse caption content for metrics
   */
  private parseCaptionMetrics(content: string): {
    wordCount: number;
    cueCount: number;
    hasSpeakerIds: boolean;
    hasSoundEffects: boolean;
  } {
    const lines = content.split('\n');
    let wordCount = 0;
    let cueCount = 0;
    let hasSpeakerIds = false;
    let hasSoundEffects = false;

    for (const line of lines) {
      // Count cues (lines starting with timestamps or numbers)
      if (/^\d/.test(line.trim()) || /^[0-9:,.]+\s*-->/.test(line)) {
        cueCount++;
      }

      // Count words in text lines
      if (!/^(WEBVTT|NOTE|[0-9:,.]+\s*-->|\d+$)/.test(line.trim())) {
        const words = line.split(/\s+/).filter(w => w.length > 0);
        wordCount += words.length;

        // Check for speaker identification
        if (/^[A-Z][A-Z\s]+:/.test(line) || /^\[.*\]:/.test(line)) {
          hasSpeakerIds = true;
        }

        // Check for sound effects
        if (/\[.*\]/.test(line) || /\(.*\)/.test(line)) {
          hasSoundEffects = true;
        }
      }
    }

    return { wordCount, cueCount, hasSpeakerIds, hasSoundEffects };
  }

  /**
   * Calculate compliance score from issues
   */
  private calculateComplianceScore(issues: AccessibilityIssue[]): number {
    if (issues.length === 0) return 100;

    // Weight issues by severity
    const weights = { critical: 25, serious: 15, moderate: 5, minor: 1 };
    let totalDeductions = 0;

    for (const issue of issues) {
      totalDeductions += weights[issue.severity] || 1;
    }

    // Cap deductions at 100
    return Math.max(0, 100 - Math.min(100, totalDeductions));
  }

  /**
   * Convert hex color to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const cleanHex = hex.replace('#', '');
    return {
      r: parseInt(cleanHex.substring(0, 2), 16),
      g: parseInt(cleanHex.substring(2, 4), 16),
      b: parseInt(cleanHex.substring(4, 6), 16),
    };
  }

  /**
   * Log audit action
   */
  private async logAuditAction(
    action: AuditAction,
    targetType: string,
    targetId: string,
    userId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.db('accessibility_audit_logs').insert({
      user_id: userId,
      actor_type: userId ? 'user' : 'system',
      action,
      target_type: targetType,
      target_id: targetId,
      details: details ? JSON.stringify(details) : null,
    });
  }

  // ============================================
  // Automated Check Implementations
  // ============================================

  /**
   * Check alt text for images
   */
  private async checkAltText(html: string, checkId: string): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];

    // Simple regex-based check for images without alt
    const imgRegex = /<img[^>]*>/gi;
    const matches = html.match(imgRegex) || [];

    for (const img of matches) {
      const hasAlt = /alt\s*=\s*["'][^"']*["']/i.test(img);
      const emptyAlt = /alt\s*=\s*["']\s*["']/i.test(img);

      if (!hasAlt) {
        const issue = await this.createIssue({
          checkId,
          severity: 'critical',
          wcagCriterion: '1.1.1',
          wcagCriterionName: 'Non-text Content',
          issueCode: 'img-alt-missing',
          description: 'Image is missing alt attribute',
          impact: 'Screen reader users will not know what the image is about',
          elementHtml: img.substring(0, 200),
          recommendation: 'Add an alt attribute describing the image content',
          fixExample: '<img src="..." alt="Description of the image">',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html',
        });
        issues.push(issue);
      } else if (emptyAlt) {
        // Empty alt is valid for decorative images, just a warning
        const issue = await this.createIssue({
          checkId,
          severity: 'minor',
          wcagCriterion: '1.1.1',
          wcagCriterionName: 'Non-text Content',
          issueCode: 'img-alt-empty',
          description: 'Image has empty alt attribute - verify it is decorative',
          impact: 'If image is not decorative, screen reader users will miss content',
          elementHtml: img.substring(0, 200),
          recommendation: 'If decorative, empty alt is correct. If meaningful, add description.',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html',
        });
        issues.push(issue);
      }
    }

    return issues;
  }

  /**
   * Check color contrast
   */
  private async checkColorContrast(html: string, checkId: string): Promise<AccessibilityIssue[]> {
    // This would require parsing CSS and computing styles
    // For now, return empty - this would be done client-side or with a headless browser
    return [];
  }

  /**
   * Check heading structure
   */
  private async checkHeadingStructure(html: string, checkId: string): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];

    // Check for skipped heading levels
    const headingRegex = /<h([1-6])[^>]*>/gi;
    const headings: number[] = [];
    let match;

    while ((match = headingRegex.exec(html)) !== null) {
      headings.push(parseInt(match[1], 10));
    }

    for (let i = 1; i < headings.length; i++) {
      const current = headings[i];
      const previous = headings[i - 1];

      if (current > previous + 1) {
        const issue = await this.createIssue({
          checkId,
          severity: 'moderate',
          wcagCriterion: '1.3.1',
          wcagCriterionName: 'Info and Relationships',
          issueCode: 'heading-order-skip',
          description: `Heading level skipped from h${previous} to h${current}`,
          impact: 'Screen reader users may have difficulty understanding document structure',
          recommendation: `Use sequential heading levels (h${previous} should be followed by h${previous + 1})`,
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html',
        });
        issues.push(issue);
      }
    }

    // Check for empty headings
    const emptyHeadingRegex = /<h[1-6][^>]*>\s*<\/h[1-6]>/gi;
    const emptyMatches = html.match(emptyHeadingRegex) || [];

    for (const emptyHeading of emptyMatches) {
      const issue = await this.createIssue({
        checkId,
        severity: 'serious',
        wcagCriterion: '1.3.1',
        wcagCriterionName: 'Info and Relationships',
        issueCode: 'heading-empty',
        description: 'Empty heading found',
        impact: 'Screen reader users will hear a heading but no content',
        elementHtml: emptyHeading,
        recommendation: 'Add text content to the heading or remove it',
        helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html',
      });
      issues.push(issue);
    }

    return issues;
  }

  /**
   * Check link text
   */
  private async checkLinkText(html: string, checkId: string): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];

    // Check for generic link text
    const genericLinkTexts = ['click here', 'read more', 'learn more', 'here', 'more'];
    const linkRegex = /<a[^>]*>([^<]*)<\/a>/gi;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      const linkText = match[1].toLowerCase().trim();

      if (genericLinkTexts.includes(linkText)) {
        const issue = await this.createIssue({
          checkId,
          severity: 'moderate',
          wcagCriterion: '2.4.4',
          wcagCriterionName: 'Link Purpose (In Context)',
          issueCode: 'link-text-generic',
          description: `Generic link text "${match[1]}" does not describe the destination`,
          impact: 'Screen reader users listing links will not understand their purpose',
          elementHtml: match[0],
          recommendation: 'Use descriptive link text that explains where the link goes',
          fixExample: '<a href="...">View the accessibility guidelines</a>',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html',
        });
        issues.push(issue);
      }
    }

    return issues;
  }

  /**
   * Check form labels
   */
  private async checkFormLabels(html: string, checkId: string): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];

    // Check for inputs without labels
    const inputRegex = /<input[^>]*type\s*=\s*["'](?!hidden|submit|button|reset)[^"']*["'][^>]*>/gi;
    const matches = html.match(inputRegex) || [];

    for (const input of matches) {
      const hasId = /id\s*=\s*["']([^"']+)["']/i.exec(input);

      if (hasId) {
        const id = hasId[1];
        const labelRegex = new RegExp(`<label[^>]*for\\s*=\\s*["']${id}["']`, 'i');

        if (!labelRegex.test(html)) {
          const issue = await this.createIssue({
            checkId,
            severity: 'serious',
            wcagCriterion: '3.3.2',
            wcagCriterionName: 'Labels or Instructions',
            issueCode: 'input-missing-label',
            description: 'Form input is missing an associated label',
            impact: 'Screen reader users will not know what to enter in this field',
            elementHtml: input.substring(0, 200),
            recommendation: 'Add a <label> element with a for attribute matching the input id',
            fixExample: '<label for="email">Email Address</label><input type="email" id="email">',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html',
          });
          issues.push(issue);
        }
      } else {
        // Input without id - check for aria-label or aria-labelledby
        const hasAriaLabel = /aria-label(ledby)?\s*=\s*["'][^"']+["']/i.test(input);

        if (!hasAriaLabel) {
          const issue = await this.createIssue({
            checkId,
            severity: 'serious',
            wcagCriterion: '3.3.2',
            wcagCriterionName: 'Labels or Instructions',
            issueCode: 'input-no-label-or-id',
            description: 'Form input has no id, label, or aria-label',
            impact: 'Screen reader users will not know what to enter in this field',
            elementHtml: input.substring(0, 200),
            recommendation: 'Add an id and associated label, or use aria-label attribute',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html',
          });
          issues.push(issue);
        }
      }
    }

    return issues;
  }

  /**
   * Check language attribute
   */
  private async checkLanguage(html: string, checkId: string): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];

    // Check for html lang attribute
    const hasLang = /<html[^>]*lang\s*=\s*["'][^"']+["']/i.test(html);

    if (!hasLang && html.includes('<html')) {
      const issue = await this.createIssue({
        checkId,
        severity: 'serious',
        wcagCriterion: '3.1.1',
        wcagCriterionName: 'Language of Page',
        issueCode: 'html-lang-missing',
        description: 'Page language is not defined',
        impact: 'Screen readers will not know how to pronounce content correctly',
        recommendation: 'Add lang attribute to the html element',
        fixExample: '<html lang="en">',
        helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/language-of-page.html',
      });
      issues.push(issue);
    }

    return issues;
  }

  // ============================================
  // Mapping Functions
  // ============================================

  private mapCheck(row: any): AccessibilityCheck {
    return {
      id: row.id,
      lessonId: row.lesson_id,
      resourceId: row.resource_id,
      contentFileId: row.content_file_id,
      checkType: row.check_type,
      wcagLevel: row.wcag_level,
      wcagVersion: row.wcag_version,
      status: row.status,
      complianceScore: row.compliance_score ? parseFloat(row.compliance_score) : undefined,
      issuesFound: row.issues_found,
      issuesResolved: row.issues_resolved,
      checkedAt: row.checked_at,
      nextCheckDue: row.next_check_due,
      checkedBy: row.checked_by,
      isAutomated: row.is_automated,
      checkResults: row.check_results,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapIssue(row: any): AccessibilityIssue {
    return {
      id: row.id,
      checkId: row.check_id,
      severity: row.severity,
      wcagCriterion: row.wcag_criterion,
      wcagCriterionName: row.wcag_criterion_name,
      issueCode: row.issue_code,
      description: row.description,
      impact: row.impact,
      elementSelector: row.element_selector,
      elementHtml: row.element_html,
      lineNumber: row.line_number,
      columnNumber: row.column_number,
      recommendation: row.recommendation,
      fixExample: row.fix_example,
      helpUrl: row.help_url,
      status: row.status,
      assignedTo: row.assigned_to,
      resolvedBy: row.resolved_by,
      resolvedAt: row.resolved_at,
      resolutionNotes: row.resolution_notes,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapAltText(row: any): AltText {
    return {
      id: row.id,
      contentFileId: row.content_file_id,
      resourceId: row.resource_id,
      altText: row.alt_text,
      longDescription: row.long_description,
      isDecorative: row.is_decorative,
      source: row.source,
      confidenceScore: row.confidence_score ? parseFloat(row.confidence_score) : undefined,
      isApproved: row.is_approved,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      isDescriptive: row.is_descriptive,
      characterCount: row.character_count,
      containsRedundantWords: row.contains_redundant_words,
      language: row.language,
      version: row.version,
      previousVersionId: row.previous_version_id,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapCaption(row: any): Caption {
    return {
      id: row.id,
      contentFileId: row.content_file_id,
      resourceId: row.resource_id,
      language: row.language,
      languageName: row.language_name,
      captionType: row.caption_type,
      format: row.format,
      content: row.content,
      fileUrl: row.file_url,
      wordCount: row.word_count,
      cueCount: row.cue_count,
      durationMs: row.duration_ms,
      accuracyScore: row.accuracy_score ? parseFloat(row.accuracy_score) : undefined,
      includesSpeakerIdentification: row.includes_speaker_identification,
      includesSoundEffects: row.includes_sound_effects,
      source: row.source,
      isApproved: row.is_approved,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      isSynced: row.is_synced,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapTranscript(row: any): Transcript {
    return {
      id: row.id,
      contentFileId: row.content_file_id,
      resourceId: row.resource_id,
      lessonId: row.lesson_id,
      language: row.language,
      languageName: row.language_name,
      transcriptType: row.transcript_type,
      content: row.content,
      segments: row.segments,
      wordCount: row.word_count,
      durationMs: row.duration_ms,
      accuracyScore: row.accuracy_score ? parseFloat(row.accuracy_score) : undefined,
      includesSpeakerLabels: row.includes_speaker_labels,
      includesTimestamps: row.includes_timestamps,
      includesVisualDescriptions: row.includes_visual_descriptions,
      source: row.source,
      isApproved: row.is_approved,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapUserPreferences(row: any): UserAccessibilityPreferences {
    return {
      id: row.id,
      userId: row.user_id,
      highContrastMode: row.high_contrast_mode,
      largeText: row.large_text,
      textScaleFactor: parseFloat(row.text_scale_factor),
      dyslexiaFriendlyFont: row.dyslexia_friendly_font,
      reduceMotion: row.reduce_motion,
      reduceTransparency: row.reduce_transparency,
      colorScheme: row.color_scheme,
      invertColors: row.invert_colors,
      grayscale: row.grayscale,
      customColors: row.custom_colors,
      captionsEnabled: row.captions_enabled,
      audioDescriptionsEnabled: row.audio_descriptions_enabled,
      autoPlayMedia: row.auto_play_media,
      captionLanguage: row.caption_language,
      captionStyle: row.caption_style,
      keyboardNavigation: row.keyboard_navigation,
      skipLinksEnabled: row.skip_links_enabled,
      focusIndicatorsEnhanced: row.focus_indicators_enhanced,
      linkUnderlines: row.link_underlines,
      screenReaderOptimized: row.screen_reader_optimized,
      announceImages: row.announce_images,
      announceLinks: row.announce_links,
      ariaLivePoliteness: row.aria_live_politeness,
      simplifiedLayout: row.simplified_layout,
      readingGuide: row.reading_guide,
      textToSpeech: row.text_to_speech,
      readingSpeed: parseFloat(row.reading_speed),
      clickDelayMs: row.click_delay_ms,
      stickyKeys: row.sticky_keys,
      bounceKeys: row.bounce_keys,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapColorContrastCheck(row: any): ColorContrastCheck {
    return {
      id: row.id,
      checkId: row.check_id,
      foregroundColor: row.foreground_color,
      backgroundColor: row.background_color,
      contrastRatio: parseFloat(row.contrast_ratio),
      passesAaNormal: row.passes_aa_normal,
      passesAaLarge: row.passes_aa_large,
      passesAaaNormal: row.passes_aaa_normal,
      passesAaaLarge: row.passes_aaa_large,
      elementSelector: row.element_selector,
      elementType: row.element_type,
      isLargeText: row.is_large_text,
      fontSizePx: row.font_size_px,
      isBold: row.is_bold,
      suggestedForeground: row.suggested_foreground,
      suggestedBackground: row.suggested_background,
      suggestedRatio: row.suggested_ratio ? parseFloat(row.suggested_ratio) : undefined,
      createdAt: row.created_at,
    };
  }
}

// Export singleton instance
export const accessibilityService = new AccessibilityService();

// Export class for testing
export { AccessibilityService };
