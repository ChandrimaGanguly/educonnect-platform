import { Knex } from 'knex';
import { getDatabase } from '../database';
import { nanoid } from 'nanoid';

/**
 * Content Authoring Service
 *
 * Provides tools for creating and managing educational content:
 * - WYSIWYG lesson editor
 * - Content draft management
 * - Version control for content
 * - Content validation
 */

// ========== Types ==========

export type ContentType = 'lesson' | 'module' | 'course' | 'resource';
export type ContentFormat = 'blocks' | 'markdown' | 'html';
export type DraftStatus = 'editing' | 'ready_for_review' | 'approved' | 'rejected' | 'published';
export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'list'
  | 'code'
  | 'quote'
  | 'image'
  | 'video'
  | 'audio'
  | 'embed'
  | 'callout'
  | 'divider'
  | 'table'
  | 'interactive'
  | 'assessment';

export interface ContentBlock {
  id: string;
  block_type: BlockType;
  content: Record<string, any>;
  plain_text?: string;
  attributes: Record<string, any>;
  metadata: Record<string, any>;
  order_index: number;
  parent_block_id?: string;
  has_accessibility_issues: boolean;
  accessibility_notes: string[];
}

export interface ContentDraft {
  id: string;
  content_type: ContentType;
  content_id?: string;
  community_id: string;
  title: string;
  description?: string;
  slug?: string;
  content_blocks: ContentBlock[];
  raw_content?: string;
  content_format: ContentFormat;
  status: DraftStatus;
  is_auto_saved: boolean;
  last_edited_at: Date;
  version: number;
  parent_version_id?: string;
  accessibility_checked: boolean;
  accessibility_score?: number;
  accessibility_issues: any[];
  content_validated: boolean;
  validation_errors: any[];
  estimated_minutes?: number;
  estimated_bandwidth_kb?: number;
  word_count: number;
  author_id: string;
  last_edited_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateDraftData {
  content_type: ContentType;
  content_id?: string;
  community_id: string;
  title: string;
  description?: string;
  content_format?: ContentFormat;
}

export interface UpdateDraftData {
  title?: string;
  description?: string;
  slug?: string;
  content_blocks?: ContentBlock[];
  raw_content?: string;
  content_format?: ContentFormat;
  status?: DraftStatus;
  estimated_minutes?: number;
}

export interface ContentBlockData {
  block_type: BlockType;
  content: Record<string, any>;
  plain_text?: string;
  attributes?: Record<string, any>;
  metadata?: Record<string, any>;
  order_index: number;
  parent_block_id?: string;
}

export interface ContentVersion {
  id: string;
  lesson_id?: string;
  module_id?: string;
  course_id?: string;
  version_number: number;
  version_label?: string;
  change_summary?: string;
  changes: any[];
  content_snapshot: Record<string, any>;
  blocks_snapshot?: Record<string, any>;
  metadata_snapshot?: Record<string, any>;
  status: 'draft' | 'published' | 'archived';
  is_current: boolean;
  created_by: string;
  published_by?: string;
  published_at?: Date;
  created_at: Date;
}

export class ContentAuthoringService {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  // ========== Draft Management ==========

  /**
   * Create a new content draft
   */
  async createDraft(userId: string, data: CreateDraftData): Promise<ContentDraft> {
    const [draft] = await this.db('content_drafts')
      .insert({
        content_type: data.content_type,
        content_id: data.content_id,
        community_id: data.community_id,
        title: data.title,
        description: data.description,
        content_format: data.content_format || 'blocks',
        author_id: userId,
        last_edited_by: userId,
        content_blocks: JSON.stringify([]),
        status: 'editing',
      })
      .returning('*');

    return this.formatDraft(draft);
  }

  /**
   * Get draft by ID
   */
  async getDraftById(draftId: string): Promise<ContentDraft | null> {
    const draft = await this.db('content_drafts')
      .where({ id: draftId })
      .first();

    if (!draft) return null;
    return this.formatDraft(draft);
  }

  /**
   * Get all drafts for a user in a community
   */
  async getUserDrafts(
    userId: string,
    communityId: string,
    options: {
      status?: DraftStatus;
      content_type?: ContentType;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ drafts: ContentDraft[]; total: number }> {
    const { status, content_type, limit = 20, offset = 0 } = options;

    let query = this.db('content_drafts')
      .where({ author_id: userId, community_id: communityId });

    if (status) {
      query = query.where({ status });
    }

    if (content_type) {
      query = query.where({ content_type });
    }

    const [{ count }] = await query.clone().count('* as count');
    const drafts = await query
      .limit(limit)
      .offset(offset)
      .orderBy('updated_at', 'desc');

    return {
      drafts: drafts.map((d: any) => this.formatDraft(d)),
      total: Number(count),
    };
  }

  /**
   * Update draft content
   */
  async updateDraft(
    draftId: string,
    userId: string,
    data: UpdateDraftData
  ): Promise<ContentDraft> {
    const updateData: Record<string, any> = {
      last_edited_by: userId,
      last_edited_at: this.db.fn.now(),
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.content_format !== undefined) updateData.content_format = data.content_format;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.estimated_minutes !== undefined) updateData.estimated_minutes = data.estimated_minutes;

    if (data.content_blocks !== undefined) {
      updateData.content_blocks = JSON.stringify(data.content_blocks);
      // Calculate word count from blocks
      updateData.word_count = this.calculateWordCount(data.content_blocks);
      // Reset validation since content changed
      updateData.content_validated = false;
      updateData.accessibility_checked = false;
    }

    if (data.raw_content !== undefined) {
      updateData.raw_content = data.raw_content;
      // Calculate word count from raw content
      if (!data.content_blocks) {
        updateData.word_count = this.countWords(data.raw_content);
      }
    }

    const [draft] = await this.db('content_drafts')
      .where({ id: draftId })
      .update(updateData)
      .returning('*');

    return this.formatDraft(draft);
  }

  /**
   * Auto-save draft (frequent saves during editing)
   */
  async autoSaveDraft(
    draftId: string,
    userId: string,
    contentBlocks: ContentBlock[]
  ): Promise<ContentDraft> {
    const [draft] = await this.db('content_drafts')
      .where({ id: draftId })
      .update({
        content_blocks: JSON.stringify(contentBlocks),
        word_count: this.calculateWordCount(contentBlocks),
        is_auto_saved: true,
        last_edited_by: userId,
        last_edited_at: this.db.fn.now(),
      })
      .returning('*');

    return this.formatDraft(draft);
  }

  /**
   * Delete a draft
   */
  async deleteDraft(draftId: string): Promise<void> {
    await this.db('content_drafts')
      .where({ id: draftId })
      .delete();
  }

  /**
   * Submit draft for review
   */
  async submitForReview(draftId: string, userId: string): Promise<ContentDraft> {
    const [draft] = await this.db('content_drafts')
      .where({ id: draftId })
      .update({
        status: 'ready_for_review',
        last_edited_by: userId,
        last_edited_at: this.db.fn.now(),
      })
      .returning('*');

    return this.formatDraft(draft);
  }

  // ========== Content Block Management ==========

  /**
   * Add a block to a draft
   */
  async addBlock(
    draftId: string,
    blockData: ContentBlockData
  ): Promise<ContentBlock> {
    const [block] = await this.db('content_blocks')
      .insert({
        draft_id: draftId,
        block_type: blockData.block_type,
        content: JSON.stringify(blockData.content),
        plain_text: blockData.plain_text,
        attributes: JSON.stringify(blockData.attributes || {}),
        metadata: JSON.stringify(blockData.metadata || {}),
        order_index: blockData.order_index,
        parent_block_id: blockData.parent_block_id,
      })
      .returning('*');

    return this.formatBlock(block);
  }

  /**
   * Update a block
   */
  async updateBlock(
    blockId: string,
    data: Partial<ContentBlockData>
  ): Promise<ContentBlock> {
    const updateData: Record<string, any> = {};

    if (data.block_type !== undefined) updateData.block_type = data.block_type;
    if (data.content !== undefined) updateData.content = JSON.stringify(data.content);
    if (data.plain_text !== undefined) updateData.plain_text = data.plain_text;
    if (data.attributes !== undefined) updateData.attributes = JSON.stringify(data.attributes);
    if (data.metadata !== undefined) updateData.metadata = JSON.stringify(data.metadata);
    if (data.order_index !== undefined) updateData.order_index = data.order_index;
    if (data.parent_block_id !== undefined) updateData.parent_block_id = data.parent_block_id;

    const [block] = await this.db('content_blocks')
      .where({ id: blockId })
      .update(updateData)
      .returning('*');

    return this.formatBlock(block);
  }

  /**
   * Delete a block
   */
  async deleteBlock(blockId: string): Promise<void> {
    await this.db('content_blocks')
      .where({ id: blockId })
      .delete();
  }

  /**
   * Reorder blocks in a draft
   */
  async reorderBlocks(
    draftId: string,
    blockOrder: { id: string; order_index: number }[]
  ): Promise<void> {
    await this.db.transaction(async (trx) => {
      for (const item of blockOrder) {
        await trx('content_blocks')
          .where({ id: item.id, draft_id: draftId })
          .update({ order_index: item.order_index });
      }
    });
  }

  /**
   * Get all blocks for a draft
   */
  async getDraftBlocks(draftId: string): Promise<ContentBlock[]> {
    const blocks = await this.db('content_blocks')
      .where({ draft_id: draftId })
      .orderBy('order_index', 'asc');

    return blocks.map((b: any) => this.formatBlock(b));
  }

  // ========== Version Management ==========

  /**
   * Create a new version of content
   */
  async createVersion(
    userId: string,
    data: {
      lesson_id?: string;
      module_id?: string;
      course_id?: string;
      content_snapshot: Record<string, any>;
      blocks_snapshot?: Record<string, any>;
      metadata_snapshot?: Record<string, any>;
      change_summary?: string;
    }
  ): Promise<ContentVersion> {
    // Get current version number
    let query = this.db('content_versions');
    if (data.lesson_id) {
      query = query.where({ lesson_id: data.lesson_id });
    } else if (data.module_id) {
      query = query.where({ module_id: data.module_id });
    } else if (data.course_id) {
      query = query.where({ course_id: data.course_id });
    }

    const lastVersion = await query.orderBy('version_number', 'desc').first();
    const newVersionNumber = lastVersion ? lastVersion.version_number + 1 : 1;

    // Mark previous version as not current
    if (lastVersion) {
      await this.db('content_versions')
        .where({ id: lastVersion.id })
        .update({ is_current: false });
    }

    const [version] = await this.db('content_versions')
      .insert({
        lesson_id: data.lesson_id,
        module_id: data.module_id,
        course_id: data.course_id,
        version_number: newVersionNumber,
        change_summary: data.change_summary,
        content_snapshot: JSON.stringify(data.content_snapshot),
        blocks_snapshot: data.blocks_snapshot ? JSON.stringify(data.blocks_snapshot) : null,
        metadata_snapshot: data.metadata_snapshot ? JSON.stringify(data.metadata_snapshot) : null,
        created_by: userId,
        is_current: true,
        status: 'draft',
      })
      .returning('*');

    return this.formatVersion(version);
  }

  /**
   * Get version history for content
   */
  async getVersionHistory(
    contentType: 'lesson' | 'module' | 'course',
    contentId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ versions: ContentVersion[]; total: number }> {
    const { limit = 20, offset = 0 } = options;

    const idField = `${contentType}_id`;
    let query = this.db('content_versions').where({ [idField]: contentId });

    const [{ count }] = await query.clone().count('* as count');
    const versions = await query
      .limit(limit)
      .offset(offset)
      .orderBy('version_number', 'desc');

    return {
      versions: versions.map((v: any) => this.formatVersion(v)),
      total: Number(count),
    };
  }

  /**
   * Get a specific version
   */
  async getVersion(versionId: string): Promise<ContentVersion | null> {
    const version = await this.db('content_versions')
      .where({ id: versionId })
      .first();

    if (!version) return null;
    return this.formatVersion(version);
  }

  /**
   * Publish a version
   */
  async publishVersion(versionId: string, userId: string): Promise<ContentVersion> {
    const [version] = await this.db('content_versions')
      .where({ id: versionId })
      .update({
        status: 'published',
        published_by: userId,
        published_at: this.db.fn.now(),
      })
      .returning('*');

    return this.formatVersion(version);
  }

  /**
   * Restore a previous version
   */
  async restoreVersion(versionId: string, userId: string): Promise<ContentVersion> {
    const oldVersion = await this.getVersion(versionId);
    if (!oldVersion) {
      throw new Error('Version not found');
    }

    // Create a new version based on the old one
    const newVersion = await this.createVersion(userId, {
      lesson_id: oldVersion.lesson_id,
      module_id: oldVersion.module_id,
      course_id: oldVersion.course_id,
      content_snapshot: oldVersion.content_snapshot,
      blocks_snapshot: oldVersion.blocks_snapshot || undefined,
      metadata_snapshot: oldVersion.metadata_snapshot || undefined,
      change_summary: `Restored from version ${oldVersion.version_number}`,
    });

    return newVersion;
  }

  // ========== Content Validation ==========

  /**
   * Validate draft content
   */
  async validateDraft(draftId: string): Promise<{
    valid: boolean;
    errors: { field: string; message: string; severity: 'error' | 'warning' }[];
  }> {
    const draft = await this.getDraftById(draftId);
    if (!draft) {
      throw new Error('Draft not found');
    }

    const errors: { field: string; message: string; severity: 'error' | 'warning' }[] = [];

    // Required field validation
    if (!draft.title || draft.title.trim().length === 0) {
      errors.push({ field: 'title', message: 'Title is required', severity: 'error' });
    } else if (draft.title.length > 255) {
      errors.push({ field: 'title', message: 'Title must be 255 characters or less', severity: 'error' });
    }

    // Content validation
    if (draft.content_format === 'blocks') {
      if (!draft.content_blocks || draft.content_blocks.length === 0) {
        errors.push({ field: 'content_blocks', message: 'Content is empty', severity: 'error' });
      } else {
        // Validate each block
        for (let i = 0; i < draft.content_blocks.length; i++) {
          const block = draft.content_blocks[i];
          const blockErrors = this.validateBlock(block, i);
          errors.push(...blockErrors);
        }
      }
    } else if (!draft.raw_content || draft.raw_content.trim().length === 0) {
      errors.push({ field: 'raw_content', message: 'Content is empty', severity: 'error' });
    }

    // Word count recommendation
    if (draft.word_count < 100) {
      errors.push({
        field: 'word_count',
        message: 'Content may be too short. Consider adding more detail.',
        severity: 'warning',
      });
    }

    // Update validation status
    const valid = !errors.some(e => e.severity === 'error');
    await this.db('content_drafts')
      .where({ id: draftId })
      .update({
        content_validated: true,
        validation_errors: JSON.stringify(errors),
      });

    return { valid, errors };
  }

  /**
   * Validate a single content block
   */
  private validateBlock(
    block: ContentBlock,
    index: number
  ): { field: string; message: string; severity: 'error' | 'warning' }[] {
    const errors: { field: string; message: string; severity: 'error' | 'warning' }[] = [];
    const prefix = `content_blocks[${index}]`;

    // Check block type is valid
    const validTypes: BlockType[] = [
      'paragraph', 'heading', 'list', 'code', 'quote', 'image',
      'video', 'audio', 'embed', 'callout', 'divider', 'table',
      'interactive', 'assessment'
    ];
    if (!validTypes.includes(block.block_type)) {
      errors.push({
        field: `${prefix}.block_type`,
        message: `Invalid block type: ${block.block_type}`,
        severity: 'error',
      });
    }

    // Type-specific validation
    switch (block.block_type) {
      case 'heading':
        if (!block.content?.text) {
          errors.push({
            field: `${prefix}.content.text`,
            message: 'Heading text is required',
            severity: 'error',
          });
        }
        if (!block.content?.level || block.content.level < 1 || block.content.level > 6) {
          errors.push({
            field: `${prefix}.content.level`,
            message: 'Heading level must be between 1 and 6',
            severity: 'warning',
          });
        }
        break;

      case 'image':
        if (!block.content?.src && !block.content?.file_id) {
          errors.push({
            field: `${prefix}.content.src`,
            message: 'Image source is required',
            severity: 'error',
          });
        }
        if (!block.content?.alt) {
          errors.push({
            field: `${prefix}.content.alt`,
            message: 'Image alt text is required for accessibility',
            severity: 'error',
          });
        }
        break;

      case 'video':
        if (!block.content?.src && !block.content?.file_id && !block.content?.embed_url) {
          errors.push({
            field: `${prefix}.content.src`,
            message: 'Video source is required',
            severity: 'error',
          });
        }
        break;

      case 'audio':
        if (!block.content?.src && !block.content?.file_id) {
          errors.push({
            field: `${prefix}.content.src`,
            message: 'Audio source is required',
            severity: 'error',
          });
        }
        break;

      case 'list':
        if (!block.content?.items || !Array.isArray(block.content.items) || block.content.items.length === 0) {
          errors.push({
            field: `${prefix}.content.items`,
            message: 'List must have at least one item',
            severity: 'error',
          });
        }
        break;

      case 'table':
        if (!block.content?.rows || !Array.isArray(block.content.rows)) {
          errors.push({
            field: `${prefix}.content.rows`,
            message: 'Table must have rows defined',
            severity: 'error',
          });
        }
        break;

      case 'code':
        if (!block.content?.code && block.content?.code !== '') {
          errors.push({
            field: `${prefix}.content.code`,
            message: 'Code content is required',
            severity: 'error',
          });
        }
        break;

      case 'paragraph':
      case 'quote':
      case 'callout':
        if (!block.content?.text && !block.content?.html) {
          errors.push({
            field: `${prefix}.content`,
            message: 'Text content is required',
            severity: 'error',
          });
        }
        break;
    }

    return errors;
  }

  // ========== Estimated Metrics ==========

  /**
   * Calculate estimated reading time
   */
  calculateEstimatedMinutes(draft: ContentDraft): number {
    // Average reading speed: 200 words per minute
    const readingTime = Math.ceil(draft.word_count / 200);

    // Add time for media content
    let mediaTime = 0;
    if (draft.content_blocks) {
      for (const block of draft.content_blocks) {
        if (block.block_type === 'video') {
          mediaTime += block.content?.duration || 0; // seconds
        } else if (block.block_type === 'audio') {
          mediaTime += block.content?.duration || 0;
        } else if (block.block_type === 'interactive') {
          mediaTime += 5 * 60; // Assume 5 minutes for interactive content
        }
      }
    }

    return readingTime + Math.ceil(mediaTime / 60);
  }

  /**
   * Estimate bandwidth usage
   */
  async estimateBandwidth(draftId: string): Promise<number> {
    const draft = await this.getDraftById(draftId);
    if (!draft) return 0;

    let bandwidthKb = 0;

    // Text content (roughly 1 byte per character)
    const textContent = draft.raw_content || '';
    bandwidthKb += Math.ceil(textContent.length / 1024);

    // Content blocks
    if (draft.content_blocks) {
      for (const block of draft.content_blocks) {
        // Text-based blocks
        bandwidthKb += Math.ceil(JSON.stringify(block.content).length / 1024);

        // Media blocks - get file sizes from content_files
        if (['image', 'video', 'audio'].includes(block.block_type) && block.content?.file_id) {
          const file = await this.db('content_files')
            .where({ id: block.content.file_id })
            .first();
          if (file) {
            bandwidthKb += Math.ceil(Number(file.file_size) / 1024);
          }
        }
      }
    }

    // Update the draft with estimated bandwidth
    await this.db('content_drafts')
      .where({ id: draftId })
      .update({ estimated_bandwidth_kb: bandwidthKb });

    return bandwidthKb;
  }

  // ========== Utilities ==========

  /**
   * Calculate word count from content blocks
   */
  private calculateWordCount(blocks: ContentBlock[]): number {
    let count = 0;
    for (const block of blocks) {
      if (block.plain_text) {
        count += this.countWords(block.plain_text);
      } else if (block.content?.text) {
        count += this.countWords(block.content.text);
      } else if (block.content?.html) {
        // Strip HTML tags and count words
        const text = block.content.html.replace(/<[^>]*>/g, ' ');
        count += this.countWords(text);
      }
    }
    return count;
  }

  /**
   * Count words in a string
   */
  private countWords(text: string): number {
    if (!text) return 0;
    return text
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0).length;
  }

  /**
   * Generate a unique slug for content
   */
  generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + nanoid(6);
  }

  /**
   * Format draft from database row
   */
  private formatDraft(row: any): ContentDraft {
    return {
      ...row,
      content_blocks: typeof row.content_blocks === 'string'
        ? JSON.parse(row.content_blocks)
        : row.content_blocks || [],
      accessibility_issues: typeof row.accessibility_issues === 'string'
        ? JSON.parse(row.accessibility_issues)
        : row.accessibility_issues || [],
      validation_errors: typeof row.validation_errors === 'string'
        ? JSON.parse(row.validation_errors)
        : row.validation_errors || [],
    };
  }

  /**
   * Format content block from database row
   */
  private formatBlock(row: any): ContentBlock {
    return {
      ...row,
      content: typeof row.content === 'string'
        ? JSON.parse(row.content)
        : row.content || {},
      attributes: typeof row.attributes === 'string'
        ? JSON.parse(row.attributes)
        : row.attributes || {},
      metadata: typeof row.metadata === 'string'
        ? JSON.parse(row.metadata)
        : row.metadata || {},
      accessibility_notes: typeof row.accessibility_notes === 'string'
        ? JSON.parse(row.accessibility_notes)
        : row.accessibility_notes || [],
    };
  }

  /**
   * Format content version from database row
   */
  private formatVersion(row: any): ContentVersion {
    return {
      ...row,
      content_snapshot: typeof row.content_snapshot === 'string'
        ? JSON.parse(row.content_snapshot)
        : row.content_snapshot || {},
      blocks_snapshot: row.blocks_snapshot
        ? (typeof row.blocks_snapshot === 'string'
          ? JSON.parse(row.blocks_snapshot)
          : row.blocks_snapshot)
        : null,
      metadata_snapshot: row.metadata_snapshot
        ? (typeof row.metadata_snapshot === 'string'
          ? JSON.parse(row.metadata_snapshot)
          : row.metadata_snapshot)
        : null,
      changes: typeof row.changes === 'string'
        ? JSON.parse(row.changes)
        : row.changes || [],
    };
  }
}
