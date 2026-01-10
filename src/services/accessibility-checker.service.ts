import { Knex } from 'knex';
import { getDatabase } from '../database';

/**
 * Accessibility Checker Service
 *
 * Checks content for accessibility compliance:
 * - WCAG 2.1 AA compliance checks
 * - Alt text for images
 * - Captions for video
 * - Transcripts for audio
 * - Color contrast (if applicable)
 * - Keyboard navigation support
 * - Screen reader compatibility
 */

// ========== Types ==========

export type ComplianceLevel = 'none' | 'A' | 'AA' | 'AAA';
export type IssueSeverity = 'critical' | 'major' | 'minor';
export type IssueCategory =
  | 'images'
  | 'video'
  | 'audio'
  | 'text'
  | 'structure'
  | 'navigation'
  | 'color'
  | 'interactive';

export interface AccessibilityIssue {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  wcag_criterion?: string;
  element_type: string;
  element_id?: string;
  description: string;
  suggestion: string;
  location?: {
    block_index?: number;
    block_id?: string;
    field?: string;
  };
}

export interface AccessibilityCheck {
  id: string;
  draft_id?: string;
  lesson_id?: string;
  overall_score: number;
  compliance_level: ComplianceLevel;
  passed: boolean;
  critical_issues: number;
  major_issues: number;
  minor_issues: number;
  issues: AccessibilityIssue[];
  category_scores: Record<IssueCategory, number>;
  recommendations: string[];
  checker_version: string;
  check_options: Record<string, any>;
  checked_by: string;
  checked_at: Date;
}

export interface CheckOptions {
  check_images?: boolean;
  check_video?: boolean;
  check_audio?: boolean;
  check_structure?: boolean;
  check_navigation?: boolean;
  check_color?: boolean;
  check_interactive?: boolean;
  required_compliance?: ComplianceLevel;
}

const CHECKER_VERSION = '1.0.0';

export class AccessibilityCheckerService {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  // ========== Main Check Methods ==========

  /**
   * Run accessibility check on a draft
   */
  async checkDraft(
    draftId: string,
    userId: string,
    options: CheckOptions = {}
  ): Promise<AccessibilityCheck> {
    // Get draft content
    const draft = await this.db('content_drafts')
      .where({ id: draftId })
      .first();

    if (!draft) {
      throw new Error('Draft not found');
    }

    // Get content blocks
    const blocks = await this.db('content_blocks')
      .where({ draft_id: draftId })
      .orderBy('order_index');

    // Get media embeds
    const embeds = await this.db('content_media_embeds')
      .where({ draft_id: draftId });

    // Get assessment questions
    const questions = await this.db('assessment_questions')
      .where({ draft_id: draftId });

    // Run checks
    const issues: AccessibilityIssue[] = [];
    const categoryScores: Record<IssueCategory, number> = {
      images: 100,
      video: 100,
      audio: 100,
      text: 100,
      structure: 100,
      navigation: 100,
      color: 100,
      interactive: 100,
    };

    // Check blocks
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const content = typeof block.content === 'string'
        ? JSON.parse(block.content)
        : block.content;

      const blockIssues = await this.checkBlock(block.block_type, content, i, block.id, options);
      issues.push(...blockIssues);
    }

    // Check media embeds
    for (const embed of embeds) {
      const embedIssues = this.checkMediaEmbed(embed, options);
      issues.push(...embedIssues);
    }

    // Check questions
    for (const question of questions) {
      const questionIssues = this.checkQuestion(question, options);
      issues.push(...questionIssues);
    }

    // Check document structure
    const structureIssues = this.checkStructure(blocks, options);
    issues.push(...structureIssues);

    // Check text content
    if (draft.raw_content) {
      const textIssues = this.checkTextContent(draft.raw_content, options);
      issues.push(...textIssues);
    }

    // Calculate scores
    this.updateCategoryScores(issues, categoryScores);
    const overallScore = this.calculateOverallScore(categoryScores, issues);
    const complianceLevel = this.determineComplianceLevel(overallScore, issues);

    // Count issues by severity
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const majorCount = issues.filter(i => i.severity === 'major').length;
    const minorCount = issues.filter(i => i.severity === 'minor').length;

    // Generate recommendations
    const recommendations = this.generateRecommendations(issues);

    // Save check result
    const [check] = await this.db('accessibility_checks')
      .insert({
        draft_id: draftId,
        overall_score: overallScore,
        compliance_level: complianceLevel,
        passed: overallScore >= 80 && criticalCount === 0,
        critical_issues: criticalCount,
        major_issues: majorCount,
        minor_issues: minorCount,
        issues: JSON.stringify(issues),
        category_scores: JSON.stringify(categoryScores),
        recommendations: JSON.stringify(recommendations),
        checker_version: CHECKER_VERSION,
        check_options: JSON.stringify(options),
        checked_by: userId,
      })
      .returning('*');

    // Update draft accessibility status
    await this.db('content_drafts')
      .where({ id: draftId })
      .update({
        accessibility_checked: true,
        accessibility_score: overallScore,
        accessibility_issues: JSON.stringify(issues),
      });

    return this.formatCheck(check);
  }

  /**
   * Get previous checks for content
   */
  async getCheckHistory(
    draftId?: string,
    lessonId?: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ checks: AccessibilityCheck[]; total: number }> {
    const { limit = 10, offset = 0 } = options;

    let query = this.db('accessibility_checks');
    if (draftId) {
      query = query.where({ draft_id: draftId });
    }
    if (lessonId) {
      query = query.where({ lesson_id: lessonId });
    }

    const [{ count }] = await query.clone().count('* as count');
    const checks = await query
      .limit(limit)
      .offset(offset)
      .orderBy('checked_at', 'desc');

    return {
      checks: checks.map((c: any) => this.formatCheck(c)),
      total: Number(count),
    };
  }

  // ========== Block-Level Checks ==========

  /**
   * Check a content block for accessibility issues
   */
  private async checkBlock(
    blockType: string,
    content: any,
    blockIndex: number,
    blockId: string,
    options: CheckOptions
  ): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];
    const location = { block_index: blockIndex, block_id: blockId };

    switch (blockType) {
      case 'image':
        if (options.check_images !== false) {
          issues.push(...this.checkImage(content, location));
        }
        break;

      case 'video':
        if (options.check_video !== false) {
          issues.push(...this.checkVideo(content, location));
        }
        break;

      case 'audio':
        if (options.check_audio !== false) {
          issues.push(...this.checkAudio(content, location));
        }
        break;

      case 'heading':
        issues.push(...this.checkHeading(content, location));
        break;

      case 'table':
        issues.push(...this.checkTable(content, location));
        break;

      case 'interactive':
        if (options.check_interactive !== false) {
          issues.push(...this.checkInteractive(content, location));
        }
        break;

      case 'code':
        issues.push(...this.checkCode(content, location));
        break;
    }

    return issues;
  }

  /**
   * Check image accessibility
   */
  private checkImage(content: any, location: any): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];

    // Alt text check (WCAG 1.1.1)
    if (!content.alt || content.alt.trim().length === 0) {
      issues.push({
        id: `img-alt-${location.block_id}`,
        category: 'images',
        severity: 'critical',
        wcag_criterion: '1.1.1',
        element_type: 'image',
        element_id: location.block_id,
        description: 'Image is missing alt text',
        suggestion: 'Add descriptive alt text that conveys the meaning and function of the image',
        location,
      });
    } else if (content.alt.length < 10) {
      issues.push({
        id: `img-alt-short-${location.block_id}`,
        category: 'images',
        severity: 'minor',
        wcag_criterion: '1.1.1',
        element_type: 'image',
        element_id: location.block_id,
        description: 'Alt text may be too short to be meaningful',
        suggestion: 'Consider providing more descriptive alt text',
        location,
      });
    }

    // Check for decorative images without empty alt
    if (content.decorative === true && content.alt && content.alt.length > 0) {
      issues.push({
        id: `img-decorative-${location.block_id}`,
        category: 'images',
        severity: 'minor',
        wcag_criterion: '1.1.1',
        element_type: 'image',
        element_id: location.block_id,
        description: 'Decorative image should have empty alt text',
        suggestion: 'Set alt="" for purely decorative images',
        location,
      });
    }

    // Check for complex images needing long description
    if (content.type === 'chart' || content.type === 'diagram' || content.type === 'infographic') {
      if (!content.longDescription) {
        issues.push({
          id: `img-longdesc-${location.block_id}`,
          category: 'images',
          severity: 'major',
          wcag_criterion: '1.1.1',
          element_type: 'image',
          element_id: location.block_id,
          description: 'Complex image (chart/diagram/infographic) should have a long description',
          suggestion: 'Add a detailed text description of the information conveyed by this image',
          location,
        });
      }
    }

    return issues;
  }

  /**
   * Check video accessibility
   */
  private checkVideo(content: any, location: any): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];

    // Captions check (WCAG 1.2.2)
    if (!content.has_captions && !content.captions_url) {
      issues.push({
        id: `video-captions-${location.block_id}`,
        category: 'video',
        severity: 'critical',
        wcag_criterion: '1.2.2',
        element_type: 'video',
        element_id: location.block_id,
        description: 'Video does not have captions',
        suggestion: 'Add captions to make video content accessible to deaf and hard of hearing users',
        location,
      });
    }

    // Transcript check (WCAG 1.2.3)
    if (!content.transcript) {
      issues.push({
        id: `video-transcript-${location.block_id}`,
        category: 'video',
        severity: 'major',
        wcag_criterion: '1.2.3',
        element_type: 'video',
        element_id: location.block_id,
        description: 'Video does not have a transcript',
        suggestion: 'Provide a text transcript of the video content',
        location,
      });
    }

    // Audio description check for informative videos
    if (content.has_visual_content && !content.audio_description) {
      issues.push({
        id: `video-audiodesc-${location.block_id}`,
        category: 'video',
        severity: 'minor',
        wcag_criterion: '1.2.5',
        element_type: 'video',
        element_id: location.block_id,
        description: 'Video with visual content should have audio description',
        suggestion: 'Consider adding audio description for important visual information not conveyed in dialogue',
        location,
      });
    }

    return issues;
  }

  /**
   * Check audio accessibility
   */
  private checkAudio(content: any, location: any): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];

    // Transcript check (WCAG 1.2.1)
    if (!content.transcript) {
      issues.push({
        id: `audio-transcript-${location.block_id}`,
        category: 'audio',
        severity: 'critical',
        wcag_criterion: '1.2.1',
        element_type: 'audio',
        element_id: location.block_id,
        description: 'Audio does not have a transcript',
        suggestion: 'Provide a complete text transcript of the audio content',
        location,
      });
    }

    return issues;
  }

  /**
   * Check heading structure
   */
  private checkHeading(content: any, location: any): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];

    // Check heading level is valid
    if (!content.level || content.level < 1 || content.level > 6) {
      issues.push({
        id: `heading-level-${location.block_id}`,
        category: 'structure',
        severity: 'major',
        wcag_criterion: '1.3.1',
        element_type: 'heading',
        element_id: location.block_id,
        description: 'Invalid heading level',
        suggestion: 'Use heading levels 1-6',
        location,
      });
    }

    // Check heading has text
    if (!content.text || content.text.trim().length === 0) {
      issues.push({
        id: `heading-empty-${location.block_id}`,
        category: 'structure',
        severity: 'major',
        wcag_criterion: '2.4.6',
        element_type: 'heading',
        element_id: location.block_id,
        description: 'Heading is empty',
        suggestion: 'Add meaningful text to the heading',
        location,
      });
    }

    return issues;
  }

  /**
   * Check table accessibility
   */
  private checkTable(content: any, location: any): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];

    // Check for headers (WCAG 1.3.1)
    if (!content.headers || content.headers.length === 0) {
      issues.push({
        id: `table-headers-${location.block_id}`,
        category: 'structure',
        severity: 'major',
        wcag_criterion: '1.3.1',
        element_type: 'table',
        element_id: location.block_id,
        description: 'Table does not have header cells',
        suggestion: 'Add header cells to identify row and/or column headers',
        location,
      });
    }

    // Check for caption/summary
    if (!content.caption && !content.summary) {
      issues.push({
        id: `table-caption-${location.block_id}`,
        category: 'structure',
        severity: 'minor',
        wcag_criterion: '1.3.1',
        element_type: 'table',
        element_id: location.block_id,
        description: 'Table should have a caption or summary',
        suggestion: 'Add a caption to describe the purpose of the table',
        location,
      });
    }

    return issues;
  }

  /**
   * Check interactive content accessibility
   */
  private checkInteractive(content: any, location: any): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];

    // Check keyboard accessibility
    if (!content.keyboard_accessible) {
      issues.push({
        id: `interactive-keyboard-${location.block_id}`,
        category: 'interactive',
        severity: 'critical',
        wcag_criterion: '2.1.1',
        element_type: 'interactive',
        element_id: location.block_id,
        description: 'Interactive content may not be keyboard accessible',
        suggestion: 'Ensure all functionality is available via keyboard',
        location,
      });
    }

    // Check for text alternative
    if (!content.text_alternative && !content.description) {
      issues.push({
        id: `interactive-alt-${location.block_id}`,
        category: 'interactive',
        severity: 'major',
        wcag_criterion: '1.1.1',
        element_type: 'interactive',
        element_id: location.block_id,
        description: 'Interactive content lacks text alternative',
        suggestion: 'Provide a text description or alternative for users who cannot interact with this content',
        location,
      });
    }

    return issues;
  }

  /**
   * Check code block accessibility
   */
  private checkCode(content: any, location: any): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];

    // Check for language specification (for screen readers)
    if (!content.language) {
      issues.push({
        id: `code-lang-${location.block_id}`,
        category: 'structure',
        severity: 'minor',
        element_type: 'code',
        element_id: location.block_id,
        description: 'Code block should specify programming language',
        suggestion: 'Specify the programming language for syntax highlighting and screen reader context',
        location,
      });
    }

    return issues;
  }

  // ========== Document-Level Checks ==========

  /**
   * Check document structure
   */
  private checkStructure(blocks: any[], options: CheckOptions): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];

    if (options.check_structure === false) return issues;

    // Collect headings
    const headings = blocks
      .filter((b: any) => b.block_type === 'heading')
      .map((b: any) => {
        const content = typeof b.content === 'string' ? JSON.parse(b.content) : b.content;
        return { level: content.level, index: b.order_index };
      });

    // Check heading hierarchy (WCAG 1.3.1)
    if (headings.length > 0) {
      let prevLevel = 0;
      for (const heading of headings) {
        if (prevLevel > 0 && heading.level > prevLevel + 1) {
          issues.push({
            id: `structure-heading-skip-${heading.index}`,
            category: 'structure',
            severity: 'major',
            wcag_criterion: '1.3.1',
            element_type: 'heading',
            description: `Heading level skipped from h${prevLevel} to h${heading.level}`,
            suggestion: 'Use proper heading hierarchy without skipping levels',
            location: { block_index: heading.index },
          });
        }
        prevLevel = heading.level;
      }
    }

    // Check for at least one heading
    if (headings.length === 0 && blocks.length > 3) {
      issues.push({
        id: 'structure-no-headings',
        category: 'structure',
        severity: 'minor',
        wcag_criterion: '2.4.6',
        element_type: 'document',
        description: 'Content has no headings',
        suggestion: 'Add headings to organize and structure the content',
      });
    }

    return issues;
  }

  /**
   * Check media embed accessibility
   */
  private checkMediaEmbed(embed: any, options: CheckOptions): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];

    const location = { block_id: embed.block_id };

    switch (embed.media_type) {
      case 'image':
        if (options.check_images !== false && !embed.alt_text) {
          issues.push({
            id: `embed-img-alt-${embed.id}`,
            category: 'images',
            severity: 'critical',
            wcag_criterion: '1.1.1',
            element_type: 'image',
            element_id: embed.id,
            description: 'Embedded image is missing alt text',
            suggestion: 'Add alt text to the embedded image',
            location,
          });
        }
        break;

      case 'video':
        if (options.check_video !== false) {
          if (!embed.has_captions) {
            issues.push({
              id: `embed-video-captions-${embed.id}`,
              category: 'video',
              severity: 'critical',
              wcag_criterion: '1.2.2',
              element_type: 'video',
              element_id: embed.id,
              description: 'Embedded video does not have captions',
              suggestion: 'Add captions to the embedded video',
              location,
            });
          }
          if (!embed.transcript) {
            issues.push({
              id: `embed-video-transcript-${embed.id}`,
              category: 'video',
              severity: 'major',
              wcag_criterion: '1.2.3',
              element_type: 'video',
              element_id: embed.id,
              description: 'Embedded video does not have a transcript',
              suggestion: 'Add a transcript for the embedded video',
              location,
            });
          }
        }
        break;

      case 'audio':
        if (options.check_audio !== false && !embed.transcript) {
          issues.push({
            id: `embed-audio-transcript-${embed.id}`,
            category: 'audio',
            severity: 'critical',
            wcag_criterion: '1.2.1',
            element_type: 'audio',
            element_id: embed.id,
            description: 'Embedded audio does not have a transcript',
            suggestion: 'Add a transcript for the embedded audio',
            location,
          });
        }
        break;
    }

    // Check text fallback for low bandwidth
    if (!embed.text_fallback) {
      issues.push({
        id: `embed-fallback-${embed.id}`,
        category: 'text',
        severity: 'minor',
        element_type: embed.media_type,
        element_id: embed.id,
        description: 'Media embed lacks text fallback for low-bandwidth users',
        suggestion: 'Add a text fallback for users with limited connectivity',
        location,
      });
    }

    return issues;
  }

  /**
   * Check assessment question accessibility
   */
  private checkQuestion(question: any, options: CheckOptions): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];

    // Check question text clarity
    if (question.question_text && question.question_text.length > 500) {
      issues.push({
        id: `question-length-${question.id}`,
        category: 'text',
        severity: 'minor',
        element_type: 'question',
        element_id: question.id,
        description: 'Question text may be too long for easy comprehension',
        suggestion: 'Consider breaking into smaller parts or simplifying',
      });
    }

    return issues;
  }

  /**
   * Check text content
   */
  private checkTextContent(text: string, options: CheckOptions): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];

    // Check for all-caps text (WCAG 1.4.12)
    const capsMatch = text.match(/[A-Z]{10,}/g);
    if (capsMatch && capsMatch.length > 0) {
      issues.push({
        id: 'text-allcaps',
        category: 'text',
        severity: 'minor',
        wcag_criterion: '1.4.12',
        element_type: 'text',
        description: 'Content contains extended all-caps text which can be harder to read',
        suggestion: 'Use sentence case or title case instead of all caps',
      });
    }

    return issues;
  }

  // ========== Score Calculation ==========

  /**
   * Update category scores based on issues
   */
  private updateCategoryScores(
    issues: AccessibilityIssue[],
    scores: Record<IssueCategory, number>
  ): void {
    for (const issue of issues) {
      const deduction = issue.severity === 'critical' ? 25
        : issue.severity === 'major' ? 10
          : 5;
      scores[issue.category] = Math.max(0, scores[issue.category] - deduction);
    }
  }

  /**
   * Calculate overall accessibility score
   */
  private calculateOverallScore(
    categoryScores: Record<IssueCategory, number>,
    issues: AccessibilityIssue[]
  ): number {
    const categories = Object.values(categoryScores);
    const avgScore = categories.reduce((a, b) => a + b, 0) / categories.length;

    // Critical issues have additional penalty
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const criticalPenalty = criticalCount * 5;

    return Math.max(0, Math.round(avgScore - criticalPenalty));
  }

  /**
   * Determine WCAG compliance level
   */
  private determineComplianceLevel(score: number, issues: AccessibilityIssue[]): ComplianceLevel {
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const majorIssues = issues.filter(i => i.severity === 'major');

    if (criticalIssues.length > 0) {
      return 'none';
    }

    if (majorIssues.length > 3 || score < 60) {
      return 'none';
    }

    if (majorIssues.length > 0 || score < 80) {
      return 'A';
    }

    if (score < 95) {
      return 'AA';
    }

    return 'AAA';
  }

  // ========== Recommendations ==========

  /**
   * Generate recommendations based on issues
   */
  private generateRecommendations(issues: AccessibilityIssue[]): string[] {
    const recommendations: string[] = [];

    // Group issues by category
    const byCategory = new Map<IssueCategory, AccessibilityIssue[]>();
    for (const issue of issues) {
      const list = byCategory.get(issue.category) || [];
      list.push(issue);
      byCategory.set(issue.category, list);
    }

    // Generate category-specific recommendations
    if (byCategory.has('images')) {
      const imgIssues = byCategory.get('images')!;
      const altMissing = imgIssues.filter(i => i.description.includes('missing alt'));
      if (altMissing.length > 0) {
        recommendations.push(
          `Add alt text to ${altMissing.length} image(s). Alt text should describe the content and function of images.`
        );
      }
    }

    if (byCategory.has('video')) {
      const videoIssues = byCategory.get('video')!;
      const noCaptions = videoIssues.filter(i => i.description.includes('caption'));
      if (noCaptions.length > 0) {
        recommendations.push(
          `Add captions to ${noCaptions.length} video(s). Consider using auto-captioning services as a starting point.`
        );
      }
    }

    if (byCategory.has('audio')) {
      const audioIssues = byCategory.get('audio')!;
      const noTranscript = audioIssues.filter(i => i.description.includes('transcript'));
      if (noTranscript.length > 0) {
        recommendations.push(
          `Provide transcripts for ${noTranscript.length} audio file(s). Transcripts benefit users who are deaf or prefer reading.`
        );
      }
    }

    if (byCategory.has('structure')) {
      recommendations.push(
        'Review document structure. Use proper heading hierarchy (h1 → h2 → h3) without skipping levels.'
      );
    }

    if (byCategory.has('interactive')) {
      recommendations.push(
        'Ensure all interactive elements are keyboard accessible and have text alternatives.'
      );
    }

    // General recommendations
    if (issues.length === 0) {
      recommendations.push('Content passes basic accessibility checks. Consider user testing with assistive technologies.');
    } else if (issues.filter(i => i.severity === 'critical').length > 0) {
      recommendations.push('Address critical issues first as they prevent access for some users.');
    }

    return recommendations;
  }

  // ========== Utilities ==========

  /**
   * Format check from database row
   */
  private formatCheck(row: any): AccessibilityCheck {
    return {
      ...row,
      overall_score: Number(row.overall_score),
      issues: row.issues
        ? (typeof row.issues === 'string' ? JSON.parse(row.issues) : row.issues)
        : [],
      category_scores: row.category_scores
        ? (typeof row.category_scores === 'string' ? JSON.parse(row.category_scores) : row.category_scores)
        : {},
      recommendations: row.recommendations
        ? (typeof row.recommendations === 'string' ? JSON.parse(row.recommendations) : row.recommendations)
        : [],
      check_options: row.check_options
        ? (typeof row.check_options === 'string' ? JSON.parse(row.check_options) : row.check_options)
        : {},
    };
  }
}
