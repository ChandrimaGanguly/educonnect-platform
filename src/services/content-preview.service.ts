import crypto from 'crypto';
import { Knex } from 'knex';
import { getDatabase } from '../database';

/**
 * Content Preview Service
 *
 * Provides preview and testing capabilities for content:
 * - Generate shareable preview links
 * - Multiple preview modes (desktop, mobile, low-bandwidth)
 * - Preview access control
 * - View tracking for previews
 */

// ========== Types ==========

export type PreviewMode = 'desktop' | 'tablet' | 'mobile' | 'text_only' | 'low_bandwidth';

export interface ContentPreview {
  id: string;
  draft_id: string;
  preview_token: string;
  preview_mode: PreviewMode;
  is_active: boolean;
  require_auth: boolean;
  allowed_user_ids: string[];
  expires_at: Date;
  view_count: number;
  last_viewed_at?: Date;
  created_by: string;
  created_at: Date;
}

export interface CreatePreviewData {
  draft_id: string;
  preview_mode?: PreviewMode;
  require_auth?: boolean;
  allowed_user_ids?: string[];
  expires_in_hours?: number;
}

export interface UpdatePreviewData {
  preview_mode?: PreviewMode;
  is_active?: boolean;
  require_auth?: boolean;
  allowed_user_ids?: string[];
  expires_at?: Date;
}

export interface PreviewRenderResult {
  content: {
    title: string;
    description?: string;
    blocks: any[];
    raw_content?: string;
    format: string;
  };
  metadata: {
    word_count: number;
    estimated_minutes: number;
    estimated_bandwidth_kb?: number;
  };
  mode: PreviewMode;
  accessibility: {
    score?: number;
    issues: any[];
    passed: boolean;
  };
}

export class ContentPreviewService {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  // ========== Preview Link Management ==========

  /**
   * Create a preview link
   */
  async createPreview(userId: string, data: CreatePreviewData): Promise<ContentPreview> {
    const expiresInHours = data.expires_in_hours || 24;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    const previewToken = this.generatePreviewToken();

    const [preview] = await this.db('content_previews')
      .insert({
        draft_id: data.draft_id,
        preview_token: previewToken,
        preview_mode: data.preview_mode || 'desktop',
        require_auth: data.require_auth || false,
        allowed_user_ids: data.allowed_user_ids || [],
        expires_at: expiresAt,
        created_by: userId,
        is_active: true,
      })
      .returning('*');

    return this.formatPreview(preview);
  }

  /**
   * Get preview by ID
   */
  async getPreview(previewId: string): Promise<ContentPreview | null> {
    const preview = await this.db('content_previews')
      .where({ id: previewId })
      .first();

    if (!preview) return null;
    return this.formatPreview(preview);
  }

  /**
   * Get preview by token
   */
  async getPreviewByToken(token: string): Promise<ContentPreview | null> {
    const preview = await this.db('content_previews')
      .where({ preview_token: token })
      .first();

    if (!preview) return null;
    return this.formatPreview(preview);
  }

  /**
   * Get all previews for a draft
   */
  async getDraftPreviews(draftId: string): Promise<ContentPreview[]> {
    const previews = await this.db('content_previews')
      .where({ draft_id: draftId })
      .orderBy('created_at', 'desc');

    return previews.map((p: any) => this.formatPreview(p));
  }

  /**
   * Update a preview
   */
  async updatePreview(previewId: string, data: UpdatePreviewData): Promise<ContentPreview> {
    const updateData: Record<string, any> = {};

    if (data.preview_mode !== undefined) updateData.preview_mode = data.preview_mode;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    if (data.require_auth !== undefined) updateData.require_auth = data.require_auth;
    if (data.allowed_user_ids !== undefined) updateData.allowed_user_ids = data.allowed_user_ids;
    if (data.expires_at !== undefined) updateData.expires_at = data.expires_at;

    const [preview] = await this.db('content_previews')
      .where({ id: previewId })
      .update(updateData)
      .returning('*');

    return this.formatPreview(preview);
  }

  /**
   * Deactivate a preview
   */
  async deactivatePreview(previewId: string): Promise<void> {
    await this.db('content_previews')
      .where({ id: previewId })
      .update({ is_active: false });
  }

  /**
   * Delete a preview
   */
  async deletePreview(previewId: string): Promise<void> {
    await this.db('content_previews')
      .where({ id: previewId })
      .delete();
  }

  /**
   * Clean up expired previews
   */
  async cleanupExpiredPreviews(): Promise<number> {
    const result = await this.db('content_previews')
      .where('expires_at', '<', new Date())
      .delete();

    return result;
  }

  // ========== Preview Access ==========

  /**
   * Validate preview access
   */
  async validatePreviewAccess(
    token: string,
    userId?: string
  ): Promise<{ valid: boolean; preview?: ContentPreview; error?: string }> {
    const preview = await this.getPreviewByToken(token);

    if (!preview) {
      return { valid: false, error: 'Preview not found' };
    }

    if (!preview.is_active) {
      return { valid: false, error: 'Preview is inactive' };
    }

    if (new Date() > preview.expires_at) {
      return { valid: false, error: 'Preview has expired' };
    }

    if (preview.require_auth && !userId) {
      return { valid: false, error: 'Authentication required' };
    }

    if (preview.allowed_user_ids.length > 0 && userId) {
      if (!preview.allowed_user_ids.includes(userId)) {
        return { valid: false, error: 'User not authorized for this preview' };
      }
    }

    return { valid: true, preview };
  }

  /**
   * Record preview view
   */
  async recordView(previewId: string): Promise<void> {
    await this.db('content_previews')
      .where({ id: previewId })
      .update({
        view_count: this.db.raw('view_count + 1'),
        last_viewed_at: this.db.fn.now(),
      });
  }

  // ========== Preview Rendering ==========

  /**
   * Render preview content
   */
  async renderPreview(
    token: string,
    userId?: string,
    options: { mode?: PreviewMode } = {}
  ): Promise<PreviewRenderResult> {
    const validation = await this.validatePreviewAccess(token, userId);

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const preview = validation.preview!;

    // Record view
    await this.recordView(preview.id);

    // Get draft content
    const draft = await this.db('content_drafts')
      .where({ id: preview.draft_id })
      .first();

    if (!draft) {
      throw new Error('Draft not found');
    }

    const mode = options.mode || preview.preview_mode;

    // Get blocks
    const blocks = await this.db('content_blocks')
      .where({ draft_id: draft.id })
      .orderBy('order_index', 'asc');

    // Process content based on mode
    const processedBlocks = await this.processBlocksForMode(blocks, mode);

    return {
      content: {
        title: draft.title,
        description: draft.description,
        blocks: processedBlocks,
        raw_content: draft.raw_content,
        format: draft.content_format,
      },
      metadata: {
        word_count: draft.word_count,
        estimated_minutes: draft.estimated_minutes || Math.ceil(draft.word_count / 200),
        estimated_bandwidth_kb: draft.estimated_bandwidth_kb,
      },
      mode,
      accessibility: {
        score: draft.accessibility_score,
        issues: draft.accessibility_issues
          ? (typeof draft.accessibility_issues === 'string'
            ? JSON.parse(draft.accessibility_issues)
            : draft.accessibility_issues)
          : [],
        passed: draft.accessibility_checked && draft.accessibility_score >= 80,
      },
    };
  }

  /**
   * Process blocks for specific preview mode
   */
  private async processBlocksForMode(blocks: any[], mode: PreviewMode): Promise<any[]> {
    const processedBlocks: any[] = [];

    for (const block of blocks) {
      const content = typeof block.content === 'string'
        ? JSON.parse(block.content)
        : block.content;

      const processedBlock = {
        id: block.id,
        type: block.block_type,
        order: block.order_index,
        content: { ...content },
        attributes: typeof block.attributes === 'string'
          ? JSON.parse(block.attributes)
          : block.attributes || {},
      };

      // Mode-specific processing
      switch (mode) {
        case 'text_only':
          processedBlock.content = await this.convertToTextOnly(block.block_type, content);
          break;

        case 'low_bandwidth':
          processedBlock.content = await this.optimizeForLowBandwidth(block.block_type, content);
          break;

        case 'mobile':
          processedBlock.attributes = {
            ...processedBlock.attributes,
            responsive: true,
            fullWidth: true,
          };
          break;

        case 'tablet':
          processedBlock.attributes = {
            ...processedBlock.attributes,
            responsive: true,
          };
          break;

        // Desktop mode uses content as-is
      }

      processedBlocks.push(processedBlock);
    }

    return processedBlocks;
  }

  /**
   * Convert block to text-only version
   */
  private async convertToTextOnly(
    blockType: string,
    content: any
  ): Promise<any> {
    switch (blockType) {
      case 'image':
        return {
          text: content.alt || '[Image]',
          caption: content.caption,
        };

      case 'video':
        return {
          text: content.transcript || '[Video content]',
          title: content.title,
        };

      case 'audio':
        return {
          text: content.transcript || '[Audio content]',
          title: content.title,
        };

      case 'embed':
        return {
          text: content.text_fallback || '[Embedded content]',
        };

      case 'interactive':
        return {
          text: content.description || '[Interactive content - view in full mode]',
        };

      default:
        return content;
    }
  }

  /**
   * Optimize block for low bandwidth
   */
  private async optimizeForLowBandwidth(
    blockType: string,
    content: any
  ): Promise<any> {
    switch (blockType) {
      case 'image':
        return {
          ...content,
          src: content.thumbnail_src || content.src,
          quality: 'low',
          lazyLoad: true,
        };

      case 'video':
        return {
          ...content,
          autoplay: false,
          preload: 'none',
          poster: content.thumbnail,
          quality: 'low',
          showPlayButton: true,
          audioOnlyOption: true,
        };

      case 'audio':
        return {
          ...content,
          preload: 'none',
          quality: 'low',
        };

      default:
        return content;
    }
  }

  // ========== Content Testing ==========

  /**
   * Test content structure
   */
  async testContentStructure(draftId: string): Promise<{
    valid: boolean;
    tests: { name: string; passed: boolean; message: string }[];
  }> {
    const draft = await this.db('content_drafts')
      .where({ id: draftId })
      .first();

    if (!draft) {
      throw new Error('Draft not found');
    }

    const tests: { name: string; passed: boolean; message: string }[] = [];

    // Test 1: Title exists
    tests.push({
      name: 'Title exists',
      passed: !!draft.title && draft.title.trim().length > 0,
      message: draft.title ? 'Title is present' : 'Missing title',
    });

    // Test 2: Has content
    const blocks = await this.db('content_blocks')
      .where({ draft_id: draftId })
      .count('* as count');
    const hasBlocks = Number(blocks[0].count) > 0;
    const hasRawContent = draft.raw_content && draft.raw_content.trim().length > 0;

    tests.push({
      name: 'Has content',
      passed: hasBlocks || hasRawContent,
      message: hasBlocks ? `${blocks[0].count} content blocks` : (hasRawContent ? 'Has raw content' : 'No content'),
    });

    // Test 3: Word count minimum
    tests.push({
      name: 'Minimum word count',
      passed: draft.word_count >= 50,
      message: `${draft.word_count} words (minimum 50)`,
    });

    // Test 4: Content blocks order
    if (hasBlocks) {
      const orderCheck = await this.db('content_blocks')
        .where({ draft_id: draftId })
        .orderBy('order_index')
        .select('order_index');
      const orderIndices = orderCheck.map((b: any) => b.order_index);
      const hasGaps = orderIndices.some((val: number, i: number) => i > 0 && val !== orderIndices[i - 1] + 1);

      tests.push({
        name: 'Block ordering',
        passed: !hasGaps,
        message: hasGaps ? 'Block order has gaps' : 'Block order is sequential',
      });
    }

    // Test 5: Media has accessibility metadata
    const mediaBlocks = await this.db('content_blocks')
      .where({ draft_id: draftId })
      .whereIn('block_type', ['image', 'video', 'audio']);

    if (mediaBlocks.length > 0) {
      let mediaWithAlt = 0;
      for (const block of mediaBlocks) {
        const content = typeof block.content === 'string' ? JSON.parse(block.content) : block.content;
        if (content.alt || content.transcript || content.caption) {
          mediaWithAlt++;
        }
      }

      tests.push({
        name: 'Media accessibility',
        passed: mediaWithAlt === mediaBlocks.length,
        message: `${mediaWithAlt}/${mediaBlocks.length} media blocks have accessibility metadata`,
      });
    }

    // Test 6: Learning objectives linked
    const objectives = await this.db('content_objectives')
      .where({ draft_id: draftId })
      .count('* as count');

    tests.push({
      name: 'Learning objectives',
      passed: Number(objectives[0].count) > 0,
      message: Number(objectives[0].count) > 0
        ? `${objectives[0].count} objectives linked`
        : 'No learning objectives linked',
    });

    return {
      valid: tests.every(t => t.passed),
      tests,
    };
  }

  /**
   * Test assessment questions
   */
  async testAssessmentQuestions(draftId: string): Promise<{
    valid: boolean;
    tests: { name: string; passed: boolean; message: string }[];
  }> {
    const tests: { name: string; passed: boolean; message: string }[] = [];

    const questions = await this.db('assessment_questions')
      .where({ draft_id: draftId });

    if (questions.length === 0) {
      return {
        valid: true,
        tests: [{
          name: 'No questions',
          passed: true,
          message: 'No assessment questions to test',
        }],
      };
    }

    // Test 1: Questions have text
    const questionsWithText = questions.filter((q: any) => q.question_text && q.question_text.trim().length > 0);
    tests.push({
      name: 'Questions have text',
      passed: questionsWithText.length === questions.length,
      message: `${questionsWithText.length}/${questions.length} questions have text`,
    });

    // Test 2: Choice questions have options
    const choiceQuestions = questions.filter((q: any) =>
      ['multiple_choice', 'multiple_select', 'true_false', 'matching', 'ordering'].includes(q.question_type)
    );

    if (choiceQuestions.length > 0) {
      let questionsWithOptions = 0;
      let questionsWithCorrectAnswer = 0;

      for (const q of choiceQuestions) {
        const options = await this.db('assessment_options')
          .where({ question_id: q.id });

        if (options.length > 0) questionsWithOptions++;
        if (options.some((o: any) => o.is_correct)) questionsWithCorrectAnswer++;
      }

      tests.push({
        name: 'Choice questions have options',
        passed: questionsWithOptions === choiceQuestions.length,
        message: `${questionsWithOptions}/${choiceQuestions.length} choice questions have options`,
      });

      tests.push({
        name: 'Questions have correct answers',
        passed: questionsWithCorrectAnswer === choiceQuestions.length,
        message: `${questionsWithCorrectAnswer}/${choiceQuestions.length} questions have correct answers`,
      });
    }

    // Test 3: Points are assigned
    const questionsWithPoints = questions.filter((q: any) => Number(q.points) > 0);
    tests.push({
      name: 'Points assigned',
      passed: questionsWithPoints.length === questions.length,
      message: `${questionsWithPoints.length}/${questions.length} questions have points assigned`,
    });

    // Test 4: Total points reasonable
    const totalPoints = questions.reduce((sum: number, q: any) => sum + Number(q.points), 0);
    tests.push({
      name: 'Total points',
      passed: totalPoints > 0,
      message: `Total points: ${totalPoints}`,
    });

    return {
      valid: tests.every(t => t.passed),
      tests,
    };
  }

  // ========== Utilities ==========

  /**
   * Generate secure preview token
   */
  private generatePreviewToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get preview URL
   */
  getPreviewUrl(token: string): string {
    // This would be configured based on the deployment
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    return `${baseUrl}/preview/${token}`;
  }

  /**
   * Format preview from database row
   */
  private formatPreview(row: any): ContentPreview {
    return {
      ...row,
      allowed_user_ids: row.allowed_user_ids || [],
    };
  }
}
