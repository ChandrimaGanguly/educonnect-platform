/**
 * Multi-Format Content Service
 *
 * Implements the Content Formats and Accessibility requirements from curriculum/spec.md:
 * - CRUD operations for content items in various formats
 * - Content variants for bandwidth optimization
 * - Multi-language translations
 * - Captions and transcripts
 * - Code sandboxes and interactive elements
 * - Accessibility compliance tracking
 * - Bandwidth profile management
 */

import { Knex } from 'knex';
import { getDatabase } from '../database';
import { nanoid } from 'nanoid';
import {
  ContentItem,
  ContentFormat,
  ContentVariant,
  ContentTranslation,
  ContentCaption,
  ContentCodeSandbox,
  ContentInteractiveElement,
  ContentAccessibilityReport,
  ContentBandwidthProfile,
  CreateContentItemDto,
  UpdateContentItemDto,
  CreateContentVariantDto,
  CreateContentTranslationDto,
  CreateContentCaptionDto,
  CreateCodeSandboxDto,
  CreateInteractiveElementDto,
  UpdateBandwidthProfileDto,
  ContentQueryOptions,
  ContentDeliveryOptions,
  ContentItemWithDetails,
  ContentDeliveryResponse,
  PaginatedContentResponse,
  ContentType,
  ContentStatus,
  VariantType,
  NetworkType,
  QualityPreference,
  AccessibilityIssue,
} from '../types/content.types';

export class MultiFormatContentService {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  // ========== Content Format Operations ==========

  /**
   * Get all available content formats
   */
  async getContentFormats(activeOnly = true): Promise<ContentFormat[]> {
    let query = this.db('content_formats');
    if (activeOnly) {
      query = query.where({ is_active: true });
    }
    return query.orderBy('display_order', 'asc');
  }

  /**
   * Get content format by key
   */
  async getContentFormatByKey(formatKey: string): Promise<ContentFormat | null> {
    const format = await this.db('content_formats')
      .where({ format_key: formatKey })
      .first();
    return format || null;
  }

  /**
   * Get content format by ID
   */
  async getContentFormatById(id: string): Promise<ContentFormat | null> {
    const format = await this.db('content_formats')
      .where({ id })
      .first();
    return format || null;
  }

  /**
   * Get formats supporting specific capability
   */
  async getFormatsByCapability(capability: keyof ContentFormat): Promise<ContentFormat[]> {
    return this.db('content_formats')
      .where({ [capability]: true, is_active: true })
      .orderBy('display_order', 'asc');
  }

  // ========== Content Item CRUD ==========

  /**
   * Create a new content item
   */
  async createContentItem(userId: string, data: CreateContentItemDto): Promise<ContentItem> {
    const slug = data.slug || this.generateSlug(data.title);

    // Calculate estimated bandwidth based on content type
    const estimatedBandwidth = this.estimateBandwidth(data);

    // Determine format_id based on content_type
    let formatId: string | undefined;
    if (data.content_type === 'text' && data.text_format) {
      const format = await this.getContentFormatByKey(data.text_format);
      formatId = format?.id;
    }

    // Calculate word count for text content
    const wordCount = data.content_text
      ? this.calculateWordCount(data.content_text)
      : undefined;

    const [contentItem] = await this.db('content_items')
      .insert({
        lesson_id: data.lesson_id,
        resource_id: data.resource_id,
        community_id: data.community_id,
        title: data.title,
        slug,
        description: data.description,
        format_id: formatId,
        content_type: data.content_type,
        content_text: data.content_text,
        text_format: data.text_format || 'markdown',
        content_file_id: data.content_file_id,
        external_url: data.external_url,
        duration_seconds: data.duration_seconds,
        word_count: wordCount,
        estimated_bandwidth_kb: estimatedBandwidth,
        has_text_alternative: !!data.text_alternative,
        text_alternative: data.text_alternative,
        has_alt_text: !!data.alt_text,
        has_transcript: !!data.transcript,
        alt_text: data.alt_text,
        transcript: data.transcript,
        original_language: data.original_language || 'en',
        created_by: userId,
        status: 'draft',
      })
      .returning('*');

    return contentItem;
  }

  /**
   * Get content item by ID
   */
  async getContentItemById(id: string): Promise<ContentItem | null> {
    const item = await this.db('content_items')
      .where({ id })
      .first();
    return item || null;
  }

  /**
   * Get content item with all related data
   */
  async getContentItemWithDetails(id: string): Promise<ContentItemWithDetails | null> {
    const item = await this.getContentItemById(id);
    if (!item) return null;

    const [format, variants, translations, captions, codeSandbox, interactiveElements, accessibilityReport] =
      await Promise.all([
        item.format_id ? this.getContentFormatById(item.format_id) : Promise.resolve(undefined),
        this.getContentVariants(id),
        this.getContentTranslations(id),
        this.getContentCaptions(id),
        this.getCodeSandbox(id),
        this.getInteractiveElements(id),
        this.getLatestAccessibilityReport(id),
      ]);

    return {
      ...item,
      format: format || undefined,
      variants,
      translations,
      captions,
      code_sandbox: codeSandbox || undefined,
      interactive_elements: interactiveElements,
      accessibility_report: accessibilityReport || undefined,
    };
  }

  /**
   * Update content item
   */
  async updateContentItem(
    id: string,
    userId: string,
    data: UpdateContentItemDto
  ): Promise<ContentItem> {
    const updates: Partial<ContentItem> & { updated_by: string } = {
      ...data,
      updated_by: userId,
    };

    // Recalculate word count if text changed
    if (data.content_text !== undefined) {
      updates.word_count = data.content_text
        ? this.calculateWordCount(data.content_text)
        : 0;
    }

    // Update accessibility flags
    if (data.alt_text !== undefined) {
      updates.has_alt_text = !!data.alt_text;
    }
    if (data.transcript !== undefined) {
      updates.has_transcript = !!data.transcript;
    }
    if (data.text_alternative !== undefined) {
      updates.has_text_alternative = !!data.text_alternative;
    }

    const [item] = await this.db('content_items')
      .where({ id })
      .update(updates)
      .returning('*');

    return item;
  }

  /**
   * Publish content item
   */
  async publishContentItem(id: string, userId: string): Promise<ContentItem> {
    const [item] = await this.db('content_items')
      .where({ id })
      .update({
        status: 'published',
        published_at: this.db.fn.now(),
        updated_by: userId,
      })
      .returning('*');

    return item;
  }

  /**
   * Archive content item
   */
  async archiveContentItem(id: string, userId: string): Promise<ContentItem> {
    const [item] = await this.db('content_items')
      .where({ id })
      .update({
        status: 'archived',
        updated_by: userId,
      })
      .returning('*');

    return item;
  }

  /**
   * Create new version of content item
   */
  async createContentVersion(
    originalId: string,
    userId: string,
    changes: UpdateContentItemDto
  ): Promise<ContentItem> {
    const original = await this.getContentItemById(originalId);
    if (!original) {
      throw new Error('Content item not found');
    }

    const newVersion = original.version + 1;

    const [newItem] = await this.db('content_items')
      .insert({
        lesson_id: original.lesson_id,
        resource_id: original.resource_id,
        community_id: original.community_id,
        title: changes.title || original.title,
        slug: `${original.slug}-v${newVersion}`,
        description: changes.description || original.description,
        format_id: original.format_id,
        content_type: original.content_type,
        content_text: changes.content_text || original.content_text,
        text_format: changes.text_format || original.text_format,
        content_file_id: changes.content_file_id || original.content_file_id,
        external_url: changes.external_url || original.external_url,
        duration_seconds: changes.duration_seconds || original.duration_seconds,
        original_language: original.original_language,
        version: newVersion,
        previous_version_id: originalId,
        created_by: userId,
        status: 'draft',
      })
      .returning('*');

    return newItem;
  }

  /**
   * Delete content item
   */
  async deleteContentItem(id: string): Promise<void> {
    await this.db('content_items').where({ id }).delete();
  }

  /**
   * Query content items with filters
   */
  async queryContentItems(options: ContentQueryOptions): Promise<PaginatedContentResponse> {
    const {
      community_id,
      lesson_id,
      content_type,
      status,
      language,
      search,
      limit = 20,
      offset = 0,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = options;

    let query = this.db('content_items');

    if (community_id) {
      query = query.where({ community_id });
    }
    if (lesson_id) {
      query = query.where({ lesson_id });
    }
    if (content_type) {
      query = query.where({ content_type });
    }
    if (status) {
      query = query.where({ status });
    }
    if (language) {
      query = query.where({ original_language: language });
    }
    if (search) {
      query = query.whereRaw(
        `to_tsvector('english', title || ' ' || COALESCE(description, '')) @@ plainto_tsquery('english', ?)`,
        [search]
      );
    }

    const countQuery = query.clone();
    const [{ count }] = await countQuery.count('* as count');
    const total = Number(count);

    const items = await query
      .orderBy(sort_by, sort_order)
      .limit(limit)
      .offset(offset);

    return {
      items,
      total,
      limit,
      offset,
      has_more: offset + items.length < total,
    };
  }

  // ========== Content Variant Operations ==========

  /**
   * Create content variant
   */
  async createContentVariant(data: CreateContentVariantDto): Promise<ContentVariant> {
    const [variant] = await this.db('content_variants')
      .insert({
        content_item_id: data.content_item_id,
        variant_type: data.variant_type,
        optimized_for_network: data.optimized_for_network || 'any',
        file_id: data.file_id,
        content_text: data.content_text,
        external_url: data.external_url,
        mime_type: data.mime_type,
        file_size_bytes: data.file_size_bytes,
        width: data.width,
        height: data.height,
        bitrate: data.bitrate,
        codec: data.codec,
        bandwidth_estimate_kb: data.file_size_bytes
          ? Math.ceil(data.file_size_bytes / 1024)
          : undefined,
        status: 'pending',
      })
      .returning('*');

    return variant;
  }

  /**
   * Get content variants
   */
  async getContentVariants(contentItemId: string): Promise<ContentVariant[]> {
    return this.db('content_variants')
      .where({ content_item_id: contentItemId })
      .orderBy('variant_type', 'asc');
  }

  /**
   * Get specific variant
   */
  async getContentVariant(
    contentItemId: string,
    variantType: VariantType,
    networkType: NetworkType = 'any'
  ): Promise<ContentVariant | null> {
    const variant = await this.db('content_variants')
      .where({
        content_item_id: contentItemId,
        variant_type: variantType,
        optimized_for_network: networkType,
        status: 'ready',
      })
      .first();

    return variant || null;
  }

  /**
   * Update variant status
   */
  async updateVariantStatus(
    id: string,
    status: ContentVariant['status'],
    error?: string
  ): Promise<ContentVariant> {
    const [variant] = await this.db('content_variants')
      .where({ id })
      .update({
        status,
        processing_error: error,
      })
      .returning('*');

    return variant;
  }

  /**
   * Delete content variant
   */
  async deleteContentVariant(id: string): Promise<void> {
    await this.db('content_variants').where({ id }).delete();
  }

  /**
   * Get optimal variant for network conditions
   */
  async getOptimalVariant(
    contentItemId: string,
    networkType: NetworkType,
    preferredQuality: QualityPreference = 'auto'
  ): Promise<ContentVariant | null> {
    // Priority order based on quality preference
    const qualityOrder = this.getQualityOrder(preferredQuality, networkType);

    for (const variantType of qualityOrder) {
      // Try network-specific first
      let variant = await this.db('content_variants')
        .where({
          content_item_id: contentItemId,
          variant_type: variantType,
          optimized_for_network: networkType,
          status: 'ready',
        })
        .first();

      if (variant) return variant;

      // Fall back to 'any' network
      variant = await this.db('content_variants')
        .where({
          content_item_id: contentItemId,
          variant_type: variantType,
          optimized_for_network: 'any',
          status: 'ready',
        })
        .first();

      if (variant) return variant;
    }

    return null;
  }

  // ========== Translation Operations ==========

  /**
   * Create content translation
   */
  async createContentTranslation(
    userId: string,
    data: CreateContentTranslationDto
  ): Promise<ContentTranslation> {
    // Calculate translation completeness
    const completeness = this.calculateTranslationCompleteness(data);
    const missingFields = this.getMissingTranslationFields(data);

    const [translation] = await this.db('content_translations')
      .insert({
        content_item_id: data.content_item_id,
        language_code: data.language_code,
        title: data.title,
        description: data.description,
        content_text: data.content_text,
        is_machine_translated: data.is_machine_translated || false,
        translation_completeness: completeness,
        missing_fields: JSON.stringify(missingFields),
        alt_text: data.alt_text,
        transcript: data.transcript,
        translated_by: userId,
        status: 'draft',
      })
      .returning('*');

    return translation;
  }

  /**
   * Get content translations
   */
  async getContentTranslations(contentItemId: string): Promise<ContentTranslation[]> {
    return this.db('content_translations')
      .where({ content_item_id: contentItemId })
      .orderBy('language_code', 'asc');
  }

  /**
   * Get specific translation
   */
  async getContentTranslation(
    contentItemId: string,
    languageCode: string
  ): Promise<ContentTranslation | null> {
    const translation = await this.db('content_translations')
      .where({
        content_item_id: contentItemId,
        language_code: languageCode,
      })
      .first();

    return translation || null;
  }

  /**
   * Update translation
   */
  async updateContentTranslation(
    id: string,
    data: Partial<CreateContentTranslationDto>
  ): Promise<ContentTranslation> {
    const completeness = this.calculateTranslationCompleteness(data as CreateContentTranslationDto);

    const [translation] = await this.db('content_translations')
      .where({ id })
      .update({
        ...data,
        translation_completeness: completeness,
      })
      .returning('*');

    return translation;
  }

  /**
   * Verify translation
   */
  async verifyTranslation(id: string, verifierId: string): Promise<ContentTranslation> {
    const [translation] = await this.db('content_translations')
      .where({ id })
      .update({
        is_verified: true,
        verified_by: verifierId,
        verified_at: this.db.fn.now(),
      })
      .returning('*');

    return translation;
  }

  /**
   * Delete translation
   */
  async deleteContentTranslation(id: string): Promise<void> {
    await this.db('content_translations').where({ id }).delete();
  }

  // ========== Caption Operations ==========

  /**
   * Create content caption
   */
  async createContentCaption(
    userId: string,
    data: CreateContentCaptionDto
  ): Promise<ContentCaption> {
    // Count cues if caption content provided
    const cueCount = data.caption_content
      ? this.countCaptionCues(data.caption_content, data.format || 'vtt')
      : 0;

    const [caption] = await this.db('content_captions')
      .insert({
        content_item_id: data.content_item_id,
        language_code: data.language_code,
        label: data.label,
        caption_type: data.caption_type || 'subtitles',
        format: data.format || 'vtt',
        file_id: data.file_id,
        caption_content: data.caption_content,
        is_auto_generated: data.is_auto_generated || false,
        is_default: data.is_default || false,
        cue_count: cueCount,
        created_by: userId,
        status: 'ready',
      })
      .returning('*');

    // Update content item caption flag
    await this.db('content_items')
      .where({ id: data.content_item_id })
      .update({ has_captions: true });

    return caption;
  }

  /**
   * Get content captions
   */
  async getContentCaptions(contentItemId: string): Promise<ContentCaption[]> {
    return this.db('content_captions')
      .where({ content_item_id: contentItemId })
      .orderBy('language_code', 'asc');
  }

  /**
   * Get caption by language
   */
  async getContentCaption(
    contentItemId: string,
    languageCode: string,
    captionType = 'subtitles'
  ): Promise<ContentCaption | null> {
    const caption = await this.db('content_captions')
      .where({
        content_item_id: contentItemId,
        language_code: languageCode,
        caption_type: captionType,
      })
      .first();

    return caption || null;
  }

  /**
   * Update caption
   */
  async updateContentCaption(
    id: string,
    data: Partial<CreateContentCaptionDto>
  ): Promise<ContentCaption> {
    const updates: Record<string, unknown> = { ...data };

    if (data.caption_content) {
      updates.cue_count = this.countCaptionCues(
        data.caption_content,
        data.format || 'vtt'
      );
    }

    const [caption] = await this.db('content_captions')
      .where({ id })
      .update(updates)
      .returning('*');

    return caption;
  }

  /**
   * Verify caption
   */
  async verifyCaption(id: string, verifierId: string): Promise<ContentCaption> {
    const [caption] = await this.db('content_captions')
      .where({ id })
      .update({
        is_verified: true,
        verified_by: verifierId,
      })
      .returning('*');

    return caption;
  }

  /**
   * Delete caption
   */
  async deleteContentCaption(id: string): Promise<void> {
    await this.db('content_captions').where({ id }).delete();
  }

  // ========== Code Sandbox Operations ==========

  /**
   * Create code sandbox
   */
  async createCodeSandbox(data: CreateCodeSandboxDto): Promise<ContentCodeSandbox> {
    const [sandbox] = await this.db('content_code_sandboxes')
      .insert({
        content_item_id: data.content_item_id,
        language: data.language,
        runtime_version: data.runtime_version,
        template: data.template,
        starter_code: data.starter_code,
        solution_code: data.solution_code,
        test_code: data.test_code,
        dependencies: JSON.stringify(data.dependencies || {}),
        timeout_seconds: data.timeout_seconds || 30,
        memory_limit_mb: data.memory_limit_mb || 128,
        files: JSON.stringify(data.files || []),
        instructions: data.instructions,
        hints: data.hints,
        status: 'draft',
      })
      .returning('*');

    return sandbox;
  }

  /**
   * Get code sandbox
   */
  async getCodeSandbox(contentItemId: string): Promise<ContentCodeSandbox | null> {
    const sandbox = await this.db('content_code_sandboxes')
      .where({ content_item_id: contentItemId })
      .first();

    return sandbox || null;
  }

  /**
   * Update code sandbox
   */
  async updateCodeSandbox(
    id: string,
    data: Partial<CreateCodeSandboxDto>
  ): Promise<ContentCodeSandbox> {
    const updates: Record<string, unknown> = { ...data };

    if (data.dependencies) {
      updates.dependencies = JSON.stringify(data.dependencies);
    }
    if (data.files) {
      updates.files = JSON.stringify(data.files);
    }

    const [sandbox] = await this.db('content_code_sandboxes')
      .where({ id })
      .update(updates)
      .returning('*');

    return sandbox;
  }

  /**
   * Delete code sandbox
   */
  async deleteCodeSandbox(id: string): Promise<void> {
    await this.db('content_code_sandboxes').where({ id }).delete();
  }

  // ========== Interactive Element Operations ==========

  /**
   * Create interactive element
   */
  async createInteractiveElement(
    data: CreateInteractiveElementDto
  ): Promise<ContentInteractiveElement> {
    // Get max display order
    const [{ max_order }] = await this.db('content_interactive_elements')
      .where({ content_item_id: data.content_item_id })
      .max('display_order as max_order');

    const [element] = await this.db('content_interactive_elements')
      .insert({
        content_item_id: data.content_item_id,
        element_type: data.element_type,
        title: data.title,
        description: data.description,
        config: JSON.stringify(data.config || {}),
        data: JSON.stringify(data.data || {}),
        renderer: data.renderer,
        custom_html: data.custom_html,
        custom_css: data.custom_css,
        custom_js: data.custom_js,
        completion_criteria: JSON.stringify(data.completion_criteria || {}),
        alt_description: data.alt_description,
        display_order: (max_order || 0) + 1,
        status: 'draft',
      })
      .returning('*');

    return element;
  }

  /**
   * Get interactive elements for content
   */
  async getInteractiveElements(contentItemId: string): Promise<ContentInteractiveElement[]> {
    return this.db('content_interactive_elements')
      .where({ content_item_id: contentItemId })
      .orderBy('display_order', 'asc');
  }

  /**
   * Update interactive element
   */
  async updateInteractiveElement(
    id: string,
    data: Partial<CreateInteractiveElementDto>
  ): Promise<ContentInteractiveElement> {
    const updates: Record<string, unknown> = { ...data };

    if (data.config) {
      updates.config = JSON.stringify(data.config);
    }
    if (data.data) {
      updates.data = JSON.stringify(data.data);
    }
    if (data.completion_criteria) {
      updates.completion_criteria = JSON.stringify(data.completion_criteria);
    }

    const [element] = await this.db('content_interactive_elements')
      .where({ id })
      .update(updates)
      .returning('*');

    return element;
  }

  /**
   * Delete interactive element
   */
  async deleteInteractiveElement(id: string): Promise<void> {
    await this.db('content_interactive_elements').where({ id }).delete();
  }

  /**
   * Reorder interactive elements
   */
  async reorderInteractiveElements(
    contentItemId: string,
    elementOrder: string[]
  ): Promise<void> {
    await this.db.transaction(async (trx) => {
      for (let i = 0; i < elementOrder.length; i++) {
        await trx('content_interactive_elements')
          .where({ id: elementOrder[i], content_item_id: contentItemId })
          .update({ display_order: i + 1 });
      }
    });
  }

  // ========== Accessibility Report Operations ==========

  /**
   * Create accessibility report
   */
  async createAccessibilityReport(
    contentItemId: string,
    data: Partial<ContentAccessibilityReport>
  ): Promise<ContentAccessibilityReport> {
    const [report] = await this.db('content_accessibility_reports')
      .insert({
        content_item_id: contentItemId,
        wcag_version: data.wcag_version || '2.1',
        conformance_level: data.conformance_level || 'AA',
        overall_score: data.overall_score || 0,
        perceivable_score: data.perceivable_score || 0,
        operable_score: data.operable_score || 0,
        understandable_score: data.understandable_score || 0,
        robust_score: data.robust_score || 0,
        issues: JSON.stringify(data.issues || []),
        critical_issues: data.critical_issues || 0,
        major_issues: data.major_issues || 0,
        minor_issues: data.minor_issues || 0,
        has_alt_text: data.has_alt_text || false,
        has_captions: data.has_captions || false,
        has_transcript: data.has_transcript || false,
        color_contrast_ok: data.color_contrast_ok || false,
        keyboard_accessible: data.keyboard_accessible || false,
        screen_reader_tested: data.screen_reader_tested || false,
        status: 'pending',
      })
      .returning('*');

    // Update content item accessibility score
    await this.db('content_items')
      .where({ id: contentItemId })
      .update({ accessibility_score: data.overall_score || 0 });

    return report;
  }

  /**
   * Get latest accessibility report
   */
  async getLatestAccessibilityReport(
    contentItemId: string
  ): Promise<ContentAccessibilityReport | null> {
    const report = await this.db('content_accessibility_reports')
      .where({ content_item_id: contentItemId })
      .orderBy('report_date', 'desc')
      .first();

    return report || null;
  }

  /**
   * Get all accessibility reports for content
   */
  async getAccessibilityReports(
    contentItemId: string
  ): Promise<ContentAccessibilityReport[]> {
    return this.db('content_accessibility_reports')
      .where({ content_item_id: contentItemId })
      .orderBy('report_date', 'desc');
  }

  /**
   * Run basic accessibility check
   */
  async runAccessibilityCheck(contentItemId: string): Promise<ContentAccessibilityReport> {
    const content = await this.getContentItemWithDetails(contentItemId);
    if (!content) {
      throw new Error('Content item not found');
    }

    const issues: AccessibilityIssue[] = [];
    let perceivableScore = 100;
    let operableScore = 100;
    let understandableScore = 100;
    let robustScore = 100;

    // Check for alt text
    const hasAltText = !!content.alt_text;
    if (!hasAltText && ['image', 'video', 'mixed'].includes(content.content_type)) {
      issues.push({
        id: nanoid(),
        severity: 'critical',
        wcag_criterion: '1.1.1',
        description: 'Missing alt text for non-text content',
        suggestion: 'Add descriptive alt text for all images and media',
      });
      perceivableScore -= 25;
    }

    // Check for captions
    const hasCaptions = content.has_captions;
    if (!hasCaptions && ['video', 'audio', 'mixed'].includes(content.content_type)) {
      issues.push({
        id: nanoid(),
        severity: 'critical',
        wcag_criterion: '1.2.2',
        description: 'Missing captions for media content',
        suggestion: 'Add captions for all video and audio content',
      });
      perceivableScore -= 25;
    }

    // Check for transcript
    const hasTranscript = content.has_transcript;
    if (!hasTranscript && ['video', 'audio'].includes(content.content_type)) {
      issues.push({
        id: nanoid(),
        severity: 'major',
        wcag_criterion: '1.2.3',
        description: 'Missing transcript for media content',
        suggestion: 'Add text transcript for all media content',
      });
      perceivableScore -= 15;
    }

    // Check interactive elements for accessibility
    if (content.interactive_elements && content.interactive_elements.length > 0) {
      for (const element of content.interactive_elements) {
        if (!element.keyboard_accessible) {
          issues.push({
            id: nanoid(),
            severity: 'critical',
            wcag_criterion: '2.1.1',
            description: `Interactive element "${element.title || element.element_type}" not keyboard accessible`,
            suggestion: 'Ensure all interactive elements can be operated via keyboard',
          });
          operableScore -= 10;
        }
        if (!element.alt_description) {
          issues.push({
            id: nanoid(),
            severity: 'major',
            wcag_criterion: '1.1.1',
            description: `Interactive element "${element.title || element.element_type}" missing alt description`,
            suggestion: 'Add text alternative for interactive elements',
          });
          perceivableScore -= 10;
        }
      }
    }

    // Calculate overall score
    const overallScore = Math.max(
      0,
      Math.round((perceivableScore + operableScore + understandableScore + robustScore) / 4)
    );

    const criticalIssues = issues.filter((i) => i.severity === 'critical').length;
    const majorIssues = issues.filter((i) => i.severity === 'major').length;
    const minorIssues = issues.filter((i) => i.severity === 'minor').length;

    return this.createAccessibilityReport(contentItemId, {
      overall_score: overallScore,
      perceivable_score: Math.max(0, perceivableScore),
      operable_score: Math.max(0, operableScore),
      understandable_score: Math.max(0, understandableScore),
      robust_score: Math.max(0, robustScore),
      issues,
      critical_issues: criticalIssues,
      major_issues: majorIssues,
      minor_issues: minorIssues,
      has_alt_text: hasAltText,
      has_captions: hasCaptions,
      has_transcript: hasTranscript,
      color_contrast_ok: true, // Would need actual analysis
      keyboard_accessible: true, // Would need actual testing
      screen_reader_tested: false,
    });
  }

  // ========== Bandwidth Profile Operations ==========

  /**
   * Get or create user bandwidth profile
   */
  async getBandwidthProfile(userId: string): Promise<ContentBandwidthProfile> {
    let profile = await this.db('content_bandwidth_profiles')
      .where({ user_id: userId })
      .first();

    if (!profile) {
      [profile] = await this.db('content_bandwidth_profiles')
        .insert({
          user_id: userId,
          preferred_quality: 'auto',
          auto_download_enabled: false,
          text_only_mode: false,
          reduce_data_usage: false,
          download_on_wifi_only: true,
        })
        .returning('*');
    }

    return profile;
  }

  /**
   * Update bandwidth profile
   */
  async updateBandwidthProfile(
    userId: string,
    data: UpdateBandwidthProfileDto
  ): Promise<ContentBandwidthProfile> {
    const updates: Record<string, unknown> = { ...data };

    if (data.network_preferences) {
      updates.network_preferences = JSON.stringify(data.network_preferences);
    }

    const [profile] = await this.db('content_bandwidth_profiles')
      .where({ user_id: userId })
      .update(updates)
      .returning('*');

    return profile;
  }

  /**
   * Record data usage
   */
  async recordDataUsage(userId: string, bytesUsed: number): Promise<void> {
    await this.db('content_bandwidth_profiles')
      .where({ user_id: userId })
      .increment('current_month_usage_mb', Math.ceil(bytesUsed / (1024 * 1024)));
  }

  /**
   * Reset monthly data usage (call at start of month)
   */
  async resetMonthlyDataUsage(): Promise<void> {
    await this.db('content_bandwidth_profiles').update({ current_month_usage_mb: 0 });
  }

  // ========== Content Delivery ==========

  /**
   * Get content optimized for delivery based on user settings and network
   */
  async getContentForDelivery(
    contentItemId: string,
    userId: string,
    options: ContentDeliveryOptions = {}
  ): Promise<ContentDeliveryResponse> {
    const content = await this.getContentItemById(contentItemId);
    if (!content) {
      throw new Error('Content item not found');
    }

    // Get user bandwidth profile
    const profile = await this.getBandwidthProfile(userId);

    // Determine effective quality preference
    const networkType = options.network_type || '4g';
    const preferredQuality = options.preferred_quality ||
      (profile.network_preferences as Record<string, QualityPreference>)?.[networkType] ||
      profile.preferred_quality ||
      'auto';

    // Get optimal variant
    let selectedVariant: ContentVariant | null = null;

    if (profile.text_only_mode || options.text_only) {
      // Get text-only variant
      selectedVariant = await this.getContentVariant(contentItemId, 'text_only');
    } else {
      selectedVariant = await this.getOptimalVariant(contentItemId, networkType, preferredQuality);
    }

    // Get available translations
    const translations = await this.getContentTranslations(contentItemId);
    const availableTranslations = translations.map((t) => ({
      language_code: t.language_code,
      is_complete: t.translation_completeness >= 100,
    }));

    // Get available captions
    const captions = await this.getContentCaptions(contentItemId);
    const availableCaptions = captions.map((c) => ({
      language_code: c.language_code,
      caption_type: c.caption_type,
    }));

    // Calculate bandwidth estimate
    const bandwidthEstimate = selectedVariant?.bandwidth_estimate_kb || content.estimated_bandwidth_kb;

    // Increment view count
    await this.db('content_items')
      .where({ id: contentItemId })
      .increment('view_count', 1);

    return {
      content,
      selected_variant: selectedVariant || undefined,
      available_translations: availableTranslations,
      available_captions: availableCaptions,
      bandwidth_estimate_kb: bandwidthEstimate,
      text_alternative_available: content.has_text_alternative,
    };
  }

  // ========== Statistics ==========

  /**
   * Get content statistics
   */
  async getContentStatistics(communityId?: string): Promise<{
    total_items: number;
    by_type: Record<ContentType, number>;
    by_status: Record<ContentStatus, number>;
    with_accessibility: number;
    with_translations: number;
    avg_quality_score: number;
  }> {
    let query = this.db('content_items');
    if (communityId) {
      query = query.where({ community_id: communityId });
    }

    const [stats] = await query
      .select(
        this.db.raw('COUNT(*) as total_items'),
        this.db.raw('AVG(quality_score) as avg_quality_score'),
        this.db.raw('COUNT(CASE WHEN accessibility_score >= 80 THEN 1 END) as with_accessibility')
      );

    const typeStats = await query.clone()
      .select('content_type')
      .count('* as count')
      .groupBy('content_type');

    const statusStats = await query.clone()
      .select('status')
      .count('* as count')
      .groupBy('status');

    const [translationStats] = await this.db('content_translations')
      .countDistinct('content_item_id as with_translations');

    const byType: Record<string, number> = {};
    typeStats.forEach((row: { content_type: string; count: string }) => {
      byType[row.content_type] = Number(row.count);
    });

    const byStatus: Record<string, number> = {};
    statusStats.forEach((row: { status: string; count: string }) => {
      byStatus[row.status] = Number(row.count);
    });

    return {
      total_items: Number(stats.total_items),
      by_type: byType as Record<ContentType, number>,
      by_status: byStatus as Record<ContentStatus, number>,
      with_accessibility: Number(stats.with_accessibility),
      with_translations: Number(translationStats.with_translations),
      avg_quality_score: Number(stats.avg_quality_score) || 0,
    };
  }

  // ========== Helper Methods ==========

  private generateSlug(title: string): string {
    return (
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') +
      '-' +
      nanoid(6)
    );
  }

  private calculateWordCount(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  private estimateBandwidth(data: CreateContentItemDto): number {
    // Base estimation in KB
    let estimate = 0;

    switch (data.content_type) {
      case 'text':
        // ~1KB per 1000 characters
        estimate = data.content_text ? Math.ceil(data.content_text.length / 1000) : 5;
        break;
      case 'video':
        // ~15MB per minute of video (compressed)
        estimate = (data.duration_seconds || 300) * 250; // 250KB/s
        break;
      case 'audio':
        // ~1.5MB per minute
        estimate = (data.duration_seconds || 300) * 25; // 25KB/s
        break;
      case 'image':
        estimate = 500; // Average compressed image
        break;
      case 'interactive':
        estimate = 200; // Base interactive content
        break;
      case 'document':
        estimate = 1000; // Average document
        break;
      case 'code':
        estimate = 50; // Code exercises are lightweight
        break;
      case 'quiz':
        estimate = 20; // Quizzes are very lightweight
        break;
      case 'mixed':
        estimate = 2000; // Mixed content is heavier
        break;
      default:
        estimate = 100;
    }

    return estimate;
  }

  private calculateTranslationCompleteness(data: CreateContentTranslationDto): number {
    const fields = ['title', 'description', 'content_text', 'alt_text', 'transcript'];
    let completed = 0;
    let total = 0;

    fields.forEach((field) => {
      if (data[field as keyof CreateContentTranslationDto] !== undefined) {
        total++;
        if (data[field as keyof CreateContentTranslationDto]) {
          completed++;
        }
      }
    });

    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }

  private getMissingTranslationFields(data: CreateContentTranslationDto): string[] {
    const fields = ['title', 'description', 'content_text', 'alt_text', 'transcript'];
    return fields.filter(
      (field) => !data[field as keyof CreateContentTranslationDto]
    );
  }

  private countCaptionCues(content: string, format: string): number {
    switch (format) {
      case 'vtt':
      case 'srt':
        // Count timestamp lines (rough approximation)
        return (content.match(/\d{2}:\d{2}:\d{2}/g) || []).length / 2;
      case 'ttml':
        // Count <p> elements
        return (content.match(/<p\s/g) || []).length;
      default:
        return 0;
    }
  }

  private getQualityOrder(
    preference: QualityPreference,
    network: NetworkType
  ): VariantType[] {
    // Define quality orders based on preference
    const orders: Record<QualityPreference, VariantType[]> = {
      ultra_low: ['text_only', 'compressed', 'low_quality', 'thumbnail'],
      low: ['low_quality', 'compressed', 'medium_quality', 'text_only'],
      medium: ['medium_quality', 'low_quality', 'high_quality', 'original'],
      high: ['high_quality', 'medium_quality', 'original'],
      original: ['original', 'high_quality', 'medium_quality'],
      auto: this.getAutoQualityOrder(network),
    };

    return orders[preference] || orders.auto;
  }

  private getAutoQualityOrder(network: NetworkType): VariantType[] {
    switch (network) {
      case '2g':
        return ['text_only', 'compressed', 'low_quality', 'thumbnail'];
      case '3g':
        return ['low_quality', 'compressed', 'medium_quality', 'text_only'];
      case '4g':
        return ['medium_quality', 'high_quality', 'low_quality', 'original'];
      case '5g':
      case 'wifi':
        return ['high_quality', 'original', 'medium_quality'];
      default:
        return ['medium_quality', 'low_quality', 'high_quality', 'original'];
    }
  }
}
