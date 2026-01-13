/**
 * Text-First Content Mode Service
 *
 * Implements the Text-First Content Strategy requirements from mobile/spec.md:
 * - Text alternatives for all multimedia content (SHALL)
 * - Text mode display with only text content (SHALL)
 * - Page weight reduction by 90%+ (SHALL)
 * - Full functionality maintenance (SHALL)
 * - Selective media loading (SHALL)
 */

import { Knex } from 'knex';
import { getDatabase } from '../database';
import {
  TextModeSettings,
  ContentTextAlternative,
  TextModeContentLoad,
  TextModeDataUsage,
  UpdateTextModeSettingsDto,
  CreateTextAlternativeDto,
  UpdateTextAlternativeDto,
  RecordContentLoadDto,
  TextAlternativeQueryOptions,
  DataUsageQueryOptions,
  TextModeContentResponse,
  MediaPlaceholder,
  DataSavingsReport,
  TextModeStatus,
  BulkTextAlternativeResult,
  TextModeDeliveryOptions,
  TextModeDeliveryResponse,
  PaginatedTextAlternatives,
  TextAlternativeType,
  ContentLoadType,
  NetworkType,
} from '../types/text-mode.types';
import { ContentItem } from '../types/content.types';

export class TextModeService {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  // ========== Text Mode Settings Operations ==========

  /**
   * Get or create text mode settings for a user
   */
  async getSettings(userId: string): Promise<TextModeSettings> {
    let settings = await this.db('text_mode_settings')
      .where({ user_id: userId })
      .first();

    if (!settings) {
      [settings] = await this.db('text_mode_settings')
        .insert({
          user_id: userId,
          enabled: false,
          auto_enable_on_low_bandwidth: true,
          auto_enable_threshold_kbps: 200,
          hide_images: true,
          hide_videos: true,
          hide_audio: true,
          hide_interactive: true,
          show_media_placeholders: true,
          allow_selective_load: true,
          always_load_content_types: [],
          high_contrast_mode: false,
          larger_text: false,
          font_size_multiplier: 100,
          simplified_layout: true,
          compress_text: true,
          preload_text_alternatives: false,
          max_text_cache_size_mb: 50,
          notify_when_enabled: true,
          notify_missing_alternatives: true,
        })
        .returning('*');
    }

    return settings;
  }

  /**
   * Update text mode settings
   */
  async updateSettings(
    userId: string,
    data: UpdateTextModeSettingsDto
  ): Promise<TextModeSettings> {
    const updates: Record<string, unknown> = { ...data };

    // Handle array field
    if (data.always_load_content_types) {
      updates.always_load_content_types = data.always_load_content_types;
    }

    const [settings] = await this.db('text_mode_settings')
      .where({ user_id: userId })
      .update(updates)
      .returning('*');

    return settings;
  }

  /**
   * Enable text mode for a user
   */
  async enableTextMode(userId: string, autoEnabled = false): Promise<TextModeSettings> {
    const updateData: Partial<TextModeSettings> = {
      enabled: true,
    };

    if (autoEnabled) {
      updateData.times_auto_enabled = this.db.raw('times_auto_enabled + 1') as unknown as number;
      updateData.last_auto_enabled_at = new Date();
    }

    const [settings] = await this.db('text_mode_settings')
      .where({ user_id: userId })
      .update(updateData)
      .returning('*');

    return settings;
  }

  /**
   * Disable text mode for a user
   */
  async disableTextMode(userId: string): Promise<TextModeSettings> {
    const [settings] = await this.db('text_mode_settings')
      .where({ user_id: userId })
      .update({ enabled: false })
      .returning('*');

    return settings;
  }

  /**
   * Check if text mode should be auto-enabled based on network conditions
   */
  async shouldAutoEnable(userId: string, estimatedSpeedKbps: number): Promise<boolean> {
    const settings = await this.getSettings(userId);

    if (!settings.auto_enable_on_low_bandwidth) {
      return false;
    }

    return estimatedSpeedKbps < settings.auto_enable_threshold_kbps;
  }

  /**
   * Get current text mode status including network assessment
   */
  async getStatus(
    userId: string,
    networkType?: NetworkType,
    estimatedSpeedKbps?: number
  ): Promise<TextModeStatus> {
    const settings = await this.getSettings(userId);

    let shouldAutoEnable = false;
    if (estimatedSpeedKbps !== undefined) {
      shouldAutoEnable = await this.shouldAutoEnable(userId, estimatedSpeedKbps);
    }

    return {
      enabled: settings.enabled,
      auto_enabled: settings.last_auto_enabled_at !== undefined,
      current_network_type: networkType,
      estimated_speed_kbps: estimatedSpeedKbps,
      should_auto_enable: shouldAutoEnable,
      total_data_saved_bytes: Number(settings.data_saved_bytes),
    };
  }

  // ========== Text Alternative CRUD Operations ==========

  /**
   * Create a text alternative for content
   */
  async createTextAlternative(
    userId: string,
    data: CreateTextAlternativeDto
  ): Promise<ContentTextAlternative> {
    const [alternative] = await this.db('content_text_alternatives')
      .insert({
        content_item_id: data.content_item_id,
        language_code: data.language_code || 'en',
        alternative_type: data.alternative_type,
        content: data.content,
        format: data.format || 'markdown',
        is_auto_generated: data.is_auto_generated || false,
        original_content_size_bytes: data.original_content_size_bytes || 0,
        created_by: userId,
        status: 'draft',
      })
      .returning('*');

    return alternative;
  }

  /**
   * Get text alternative by ID
   */
  async getTextAlternativeById(id: string): Promise<ContentTextAlternative | null> {
    const alternative = await this.db('content_text_alternatives')
      .where({ id })
      .first();

    return alternative || null;
  }

  /**
   * Get text alternatives for a content item
   */
  async getTextAlternatives(
    contentItemId: string,
    languageCode?: string
  ): Promise<ContentTextAlternative[]> {
    let query = this.db('content_text_alternatives')
      .where({ content_item_id: contentItemId, status: 'published' });

    if (languageCode) {
      query = query.where({ language_code: languageCode });
    }

    return query.orderBy('alternative_type', 'asc');
  }

  /**
   * Get specific text alternative
   */
  async getTextAlternative(
    contentItemId: string,
    alternativeType: TextAlternativeType,
    languageCode = 'en'
  ): Promise<ContentTextAlternative | null> {
    const alternative = await this.db('content_text_alternatives')
      .where({
        content_item_id: contentItemId,
        alternative_type: alternativeType,
        language_code: languageCode,
        status: 'published',
      })
      .first();

    return alternative || null;
  }

  /**
   * Get best available text alternative for content
   */
  async getBestTextAlternative(
    contentItemId: string,
    languageCode = 'en',
    preferredType?: TextAlternativeType
  ): Promise<ContentTextAlternative | null> {
    // Priority order for text alternatives
    const typePriority: TextAlternativeType[] = preferredType
      ? [preferredType, 'full_transcript', 'text_lesson', 'summary', 'key_points', 'description']
      : ['full_transcript', 'text_lesson', 'summary', 'key_points', 'description'];

    for (const type of typePriority) {
      const alternative = await this.getTextAlternative(contentItemId, type, languageCode);
      if (alternative) {
        return alternative;
      }
    }

    // Fall back to any language if none found in preferred language
    if (languageCode !== 'en') {
      return this.getBestTextAlternative(contentItemId, 'en', preferredType);
    }

    return null;
  }

  /**
   * Update text alternative
   */
  async updateTextAlternative(
    id: string,
    data: UpdateTextAlternativeDto
  ): Promise<ContentTextAlternative> {
    const updates: Record<string, unknown> = { ...data };

    if (data.missing_sections) {
      updates.missing_sections = JSON.stringify(data.missing_sections);
    }

    const [alternative] = await this.db('content_text_alternatives')
      .where({ id })
      .update(updates)
      .returning('*');

    return alternative;
  }

  /**
   * Verify a text alternative
   */
  async verifyTextAlternative(id: string, verifierId: string): Promise<ContentTextAlternative> {
    const [alternative] = await this.db('content_text_alternatives')
      .where({ id })
      .update({
        is_verified: true,
        verified_by: verifierId,
        verified_at: this.db.fn.now(),
        status: 'published',
      })
      .returning('*');

    return alternative;
  }

  /**
   * Publish text alternative
   */
  async publishTextAlternative(id: string): Promise<ContentTextAlternative> {
    const [alternative] = await this.db('content_text_alternatives')
      .where({ id })
      .update({ status: 'published' })
      .returning('*');

    return alternative;
  }

  /**
   * Delete text alternative
   */
  async deleteTextAlternative(id: string): Promise<void> {
    await this.db('content_text_alternatives').where({ id }).delete();
  }

  /**
   * Query text alternatives with filters
   */
  async queryTextAlternatives(
    options: TextAlternativeQueryOptions
  ): Promise<PaginatedTextAlternatives> {
    const {
      content_item_id,
      language_code,
      alternative_type,
      status,
      is_verified,
      min_quality_score,
      limit = 20,
      offset = 0,
    } = options;

    let query = this.db('content_text_alternatives');

    if (content_item_id) {
      query = query.where({ content_item_id });
    }
    if (language_code) {
      query = query.where({ language_code });
    }
    if (alternative_type) {
      query = query.where({ alternative_type });
    }
    if (status) {
      query = query.where({ status });
    }
    if (is_verified !== undefined) {
      query = query.where({ is_verified });
    }
    if (min_quality_score !== undefined) {
      query = query.where('quality_score', '>=', min_quality_score);
    }

    const countQuery = query.clone();
    const [{ count }] = await countQuery.count('* as count');
    const total = Number(count);

    const items = await query
      .orderBy('created_at', 'desc')
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

  // ========== Bulk Operations ==========

  /**
   * Create text alternatives for multiple content items
   */
  async createBulkTextAlternatives(
    userId: string,
    alternatives: CreateTextAlternativeDto[]
  ): Promise<BulkTextAlternativeResult[]> {
    const results: BulkTextAlternativeResult[] = [];

    for (const alt of alternatives) {
      try {
        const created = await this.createTextAlternative(userId, alt);
        results.push({
          content_item_id: alt.content_item_id,
          success: true,
          text_alternative_id: created.id,
        });
      } catch (error) {
        results.push({
          content_item_id: alt.content_item_id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Check which content items are missing text alternatives
   */
  async findContentMissingTextAlternatives(
    contentItemIds: string[],
    requiredType: TextAlternativeType = 'full_transcript'
  ): Promise<string[]> {
    const existing = await this.db('content_text_alternatives')
      .whereIn('content_item_id', contentItemIds)
      .where({ alternative_type: requiredType, status: 'published' })
      .select('content_item_id');

    const existingIds = new Set(existing.map((e) => e.content_item_id));

    return contentItemIds.filter((id) => !existingIds.has(id));
  }

  // ========== Content Delivery ==========

  /**
   * Get content optimized for text mode
   */
  async getContentForTextMode(
    contentItemId: string,
    userId: string,
    options: TextModeDeliveryOptions = {}
  ): Promise<TextModeContentResponse> {
    const { language_code = 'en', preferred_type, include_media_placeholders = true } = options;

    // Get the content item
    const content = await this.db('content_items')
      .where({ id: contentItemId })
      .first<ContentItem>();

    if (!content) {
      throw new Error('Content item not found');
    }

    // Get text alternative
    const textAlternative = await this.getBestTextAlternative(
      contentItemId,
      language_code,
      preferred_type
    );

    // Get available alternative types
    const availableTypes = await this.db('content_text_alternatives')
      .where({ content_item_id: contentItemId, status: 'published' })
      .select('alternative_type')
      .then((rows) => rows.map((r) => r.alternative_type as TextAlternativeType));

    // Build media placeholders if needed
    let mediaPlaceholders: MediaPlaceholder[] | undefined;
    if (include_media_placeholders && ['video', 'audio', 'image', 'mixed'].includes(content.content_type)) {
      const settings = await this.getSettings(userId);
      mediaPlaceholders = this.buildMediaPlaceholders(content, settings);
    }

    // Calculate sizes
    const textSize = textAlternative?.size_bytes || 0;
    const originalSize = content.file_size_bytes || content.estimated_bandwidth_kb * 1024 || 0;
    const sizeReduction = originalSize > 0 ? ((originalSize - textSize) / originalSize) * 100 : 0;

    return {
      content_item_id: contentItemId,
      title: content.title,
      text_alternative: textAlternative || undefined,
      has_text_alternative: textAlternative !== null,
      available_types: availableTypes,
      estimated_reading_time_seconds: textAlternative?.reading_time_seconds || 0,
      size_bytes: textSize,
      original_size_bytes: originalSize,
      size_reduction_percentage: Math.round(sizeReduction * 10) / 10,
      media_placeholders: mediaPlaceholders,
    };
  }

  /**
   * Get full text mode delivery response
   */
  async deliverContentInTextMode(
    contentItemId: string,
    userId: string,
    options: TextModeDeliveryOptions = {},
    networkType?: NetworkType,
    estimatedSpeedKbps?: number
  ): Promise<TextModeDeliveryResponse> {
    const settings = await this.getSettings(userId);
    const status = await this.getStatus(userId, networkType, estimatedSpeedKbps);
    const content = await this.getContentForTextMode(contentItemId, userId, options);

    return {
      content,
      settings,
      network_status: status,
    };
  }

  // ========== Content Loading Tracking ==========

  /**
   * Record when a user loads media content in text mode
   */
  async recordContentLoad(
    userId: string,
    data: RecordContentLoadDto
  ): Promise<TextModeContentLoad> {
    const settings = await this.getSettings(userId);

    const [load] = await this.db('text_mode_content_loads')
      .insert({
        user_id: userId,
        content_item_id: data.content_item_id,
        load_type: data.load_type,
        was_text_mode_active: settings.enabled,
        load_reason: data.load_reason,
        bytes_loaded: data.bytes_loaded,
        bytes_saved: data.bytes_saved || 0,
        network_type: data.network_type,
        estimated_speed_kbps: data.estimated_speed_kbps,
      })
      .returning('*');

    // Update daily data usage
    await this.updateDataUsage(userId, data.bytes_loaded, data.bytes_saved || 0, data.load_type);

    return load;
  }

  /**
   * Update data usage statistics
   */
  private async updateDataUsage(
    userId: string,
    bytesConsumed: number,
    bytesSaved: number,
    loadType: ContentLoadType
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    // Upsert daily usage record
    await this.db.raw(`
      INSERT INTO text_mode_data_usage (
        user_id, date, bytes_consumed_in_text_mode, bytes_saved_by_text_mode,
        selective_loads_requested,
        ${loadType === 'video' ? 'video_bytes_saved' : loadType === 'audio' ? 'audio_bytes_saved' : loadType === 'image' ? 'image_bytes_saved' : 'interactive_bytes_saved'}
      )
      VALUES (?, ?, ?, ?, 1, ?)
      ON CONFLICT (user_id, date)
      DO UPDATE SET
        bytes_consumed_in_text_mode = text_mode_data_usage.bytes_consumed_in_text_mode + EXCLUDED.bytes_consumed_in_text_mode,
        bytes_saved_by_text_mode = text_mode_data_usage.bytes_saved_by_text_mode + EXCLUDED.bytes_saved_by_text_mode,
        selective_loads_requested = text_mode_data_usage.selective_loads_requested + 1,
        ${loadType}_bytes_saved = text_mode_data_usage.${loadType}_bytes_saved + EXCLUDED.${loadType}_bytes_saved
    `, [userId, today, bytesConsumed, bytesSaved, bytesSaved]);

    // Update total data saved in settings
    await this.db('text_mode_settings')
      .where({ user_id: userId })
      .increment('data_saved_bytes', bytesSaved);
  }

  /**
   * Record content view in text mode
   */
  async recordContentView(
    userId: string,
    contentItemId: string,
    bytesSaved: number
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    await this.db.raw(`
      INSERT INTO text_mode_data_usage (user_id, date, content_items_viewed, bytes_saved_by_text_mode)
      VALUES (?, ?, 1, ?)
      ON CONFLICT (user_id, date)
      DO UPDATE SET
        content_items_viewed = text_mode_data_usage.content_items_viewed + 1,
        bytes_saved_by_text_mode = text_mode_data_usage.bytes_saved_by_text_mode + EXCLUDED.bytes_saved_by_text_mode
    `, [userId, today, bytesSaved]);

    await this.db('text_mode_settings')
      .where({ user_id: userId })
      .increment('data_saved_bytes', bytesSaved);
  }

  /**
   * Record time spent in text mode
   */
  async recordTimeInTextMode(userId: string, seconds: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    await this.db.raw(`
      INSERT INTO text_mode_data_usage (user_id, date, time_in_text_mode_seconds)
      VALUES (?, ?, ?)
      ON CONFLICT (user_id, date)
      DO UPDATE SET
        time_in_text_mode_seconds = text_mode_data_usage.time_in_text_mode_seconds + EXCLUDED.time_in_text_mode_seconds
    `, [userId, today, seconds]);
  }

  // ========== Data Savings Reports ==========

  /**
   * Get data savings report for a user
   */
  async getDataSavingsReport(
    userId: string,
    period: 'day' | 'week' | 'month' | 'all_time'
  ): Promise<DataSavingsReport> {
    let startDate: Date;
    const now = new Date();

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'all_time':
        startDate = new Date(0);
        break;
    }

    const [stats] = await this.db('text_mode_data_usage')
      .where({ user_id: userId })
      .where('date', '>=', startDate.toISOString().split('T')[0])
      .select(
        this.db.raw('COALESCE(SUM(bytes_consumed_in_text_mode), 0)::bigint as total_consumed'),
        this.db.raw('COALESCE(SUM(bytes_saved_by_text_mode), 0)::bigint as total_saved'),
        this.db.raw('COALESCE(SUM(content_items_viewed), 0)::int as items_viewed'),
        this.db.raw('COALESCE(SUM(selective_loads_requested), 0)::int as selective_loads'),
        this.db.raw('COALESCE(SUM(time_in_text_mode_seconds), 0)::int as time_seconds'),
        this.db.raw('COALESCE(SUM(video_bytes_saved), 0)::bigint as video_saved'),
        this.db.raw('COALESCE(SUM(audio_bytes_saved), 0)::bigint as audio_saved'),
        this.db.raw('COALESCE(SUM(image_bytes_saved), 0)::bigint as image_saved'),
        this.db.raw('COALESCE(SUM(interactive_bytes_saved), 0)::bigint as interactive_saved')
      );

    const totalConsumed = Number(stats?.total_consumed || 0);
    const totalSaved = Number(stats?.total_saved || 0);
    const totalPotential = totalConsumed + totalSaved;
    const savingsPercentage = totalPotential > 0 ? (totalSaved / totalPotential) * 100 : 0;

    return {
      user_id: userId,
      period,
      total_bytes_saved: totalSaved,
      total_bytes_consumed: totalConsumed,
      savings_percentage: Math.round(savingsPercentage * 10) / 10,
      breakdown: {
        video_bytes_saved: Number(stats?.video_saved || 0),
        audio_bytes_saved: Number(stats?.audio_saved || 0),
        image_bytes_saved: Number(stats?.image_saved || 0),
        interactive_bytes_saved: Number(stats?.interactive_saved || 0),
      },
      content_items_viewed: Number(stats?.items_viewed || 0),
      selective_loads: Number(stats?.selective_loads || 0),
      time_in_text_mode_seconds: Number(stats?.time_seconds || 0),
    };
  }

  /**
   * Get data usage history
   */
  async getDataUsageHistory(
    userId: string,
    options: DataUsageQueryOptions = {}
  ): Promise<TextModeDataUsage[]> {
    const { start_date, end_date, limit = 30 } = options;

    let query = this.db('text_mode_data_usage')
      .where({ user_id: userId });

    if (start_date) {
      query = query.where('date', '>=', start_date.toISOString().split('T')[0]);
    }
    if (end_date) {
      query = query.where('date', '<=', end_date.toISOString().split('T')[0]);
    }

    return query.orderBy('date', 'desc').limit(limit);
  }

  // ========== Auto-generation Helpers ==========

  /**
   * Generate a basic text alternative from content
   * (In production, this would use AI/ML services)
   */
  async generateTextAlternative(
    contentItemId: string,
    alternativeType: TextAlternativeType
  ): Promise<string> {
    const content = await this.db('content_items')
      .where({ id: contentItemId })
      .first<ContentItem>();

    if (!content) {
      throw new Error('Content item not found');
    }

    // If content already has text, use it as basis
    if (content.content_text) {
      switch (alternativeType) {
        case 'full_transcript':
          return content.content_text;
        case 'summary':
          return this.generateSummary(content.content_text);
        case 'key_points':
          return this.extractKeyPoints(content.content_text);
        case 'description':
          return content.description || `Content: ${content.title}`;
        default:
          return content.content_text;
      }
    }

    // For media content without text, generate placeholder
    if (content.transcript) {
      return content.transcript;
    }

    // Generate basic description from available metadata
    return this.generateBasicDescription(content);
  }

  /**
   * Generate a summary from text content
   */
  private generateSummary(text: string): string {
    // Simple extraction of first paragraph(s) up to 500 chars
    const paragraphs = text.split(/\n\n+/);
    let summary = '';

    for (const p of paragraphs) {
      if (summary.length + p.length > 500) break;
      summary += (summary ? '\n\n' : '') + p;
    }

    return summary || text.substring(0, 500) + '...';
  }

  /**
   * Extract key points from text content
   */
  private extractKeyPoints(text: string): string {
    // Simple extraction of lines starting with bullets or numbers
    const lines = text.split('\n');
    const keyPoints = lines.filter((line) => {
      const trimmed = line.trim();
      return (
        trimmed.startsWith('- ') ||
        trimmed.startsWith('* ') ||
        trimmed.startsWith('• ') ||
        /^\d+\.\s/.test(trimmed)
      );
    });

    if (keyPoints.length > 0) {
      return keyPoints.join('\n');
    }

    // If no bullet points, extract sentences
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    return sentences.slice(0, 5).join('\n- ');
  }

  /**
   * Generate basic description from content metadata
   */
  private generateBasicDescription(content: ContentItem): string {
    const parts = [`Title: ${content.title}`];

    if (content.description) {
      parts.push(`Description: ${content.description}`);
    }

    if (content.duration_seconds) {
      const minutes = Math.floor(content.duration_seconds / 60);
      const seconds = content.duration_seconds % 60;
      parts.push(`Duration: ${minutes}:${seconds.toString().padStart(2, '0')}`);
    }

    if (content.content_type) {
      parts.push(`Type: ${content.content_type}`);
    }

    parts.push('\n[Text alternative not yet available for this content]');

    return parts.join('\n');
  }

  /**
   * Build media placeholders for text mode
   */
  private buildMediaPlaceholders(
    content: ContentItem,
    settings: TextModeSettings
  ): MediaPlaceholder[] {
    const placeholders: MediaPlaceholder[] = [];

    const getLoadType = (type: string): ContentLoadType => {
      switch (type) {
        case 'video':
          return 'video';
        case 'audio':
          return 'audio';
        case 'image':
          return 'image';
        case 'interactive':
          return 'interactive';
        default:
          return 'document';
      }
    };

    const loadType = getLoadType(content.content_type);
    const shouldHide = this.shouldHideContentType(loadType, settings);

    if (shouldHide) {
      placeholders.push({
        type: loadType,
        description: this.getPlaceholderDescription(content),
        alt_text: content.alt_text || undefined,
        original_size_bytes: content.file_size_bytes || content.estimated_bandwidth_kb * 1024,
        can_load: settings.allow_selective_load,
        load_warning: this.getLoadWarning(loadType, content.estimated_bandwidth_kb),
      });
    }

    return placeholders;
  }

  /**
   * Check if content type should be hidden based on settings
   */
  private shouldHideContentType(type: ContentLoadType, settings: TextModeSettings): boolean {
    if (settings.always_load_content_types?.includes(type)) {
      return false;
    }

    switch (type) {
      case 'image':
        return settings.hide_images;
      case 'video':
        return settings.hide_videos;
      case 'audio':
        return settings.hide_audio;
      case 'interactive':
        return settings.hide_interactive;
      default:
        return true;
    }
  }

  /**
   * Get placeholder description for hidden content
   */
  private getPlaceholderDescription(content: ContentItem): string {
    const typeDescriptions: Record<string, string> = {
      video: 'Video content',
      audio: 'Audio content',
      image: 'Image',
      interactive: 'Interactive element',
    };

    const type = typeDescriptions[content.content_type] || 'Media content';
    let description = `[${type}] ${content.title}`;

    if (content.duration_seconds) {
      const minutes = Math.floor(content.duration_seconds / 60);
      const seconds = content.duration_seconds % 60;
      description += ` (${minutes}:${seconds.toString().padStart(2, '0')})`;
    }

    return description;
  }

  /**
   * Get warning message about loading content
   */
  private getLoadWarning(type: ContentLoadType, estimatedKb: number): string {
    if (estimatedKb > 10000) {
      return `Loading this ${type} will use approximately ${Math.round(estimatedKb / 1024)}MB of data`;
    } else if (estimatedKb > 1000) {
      return `Loading this ${type} will use approximately ${estimatedKb}KB of data`;
    }
    return '';
  }

  // ========== Statistics ==========

  /**
   * Get text mode statistics for admin/analytics
   */
  async getStatistics(): Promise<{
    total_users_with_text_mode: number;
    active_text_mode_users: number;
    total_text_alternatives: number;
    verified_alternatives: number;
    total_data_saved_bytes: number;
    avg_size_reduction_percentage: number;
  }> {
    const [userStats] = await this.db('text_mode_settings')
      .select(
        this.db.raw('COUNT(*) as total_users'),
        this.db.raw('COUNT(*) FILTER (WHERE enabled = true) as active_users'),
        this.db.raw('COALESCE(SUM(data_saved_bytes), 0)::bigint as total_saved')
      );

    const [altStats] = await this.db('content_text_alternatives')
      .select(
        this.db.raw('COUNT(*) as total_alternatives'),
        this.db.raw('COUNT(*) FILTER (WHERE is_verified = true) as verified'),
        this.db.raw('COALESCE(AVG(size_reduction_percentage), 0) as avg_reduction')
      );

    return {
      total_users_with_text_mode: Number(userStats?.total_users || 0),
      active_text_mode_users: Number(userStats?.active_users || 0),
      total_text_alternatives: Number(altStats?.total_alternatives || 0),
      verified_alternatives: Number(altStats?.verified || 0),
      total_data_saved_bytes: Number(userStats?.total_saved || 0),
      avg_size_reduction_percentage: Number(altStats?.avg_reduction || 0),
    };
  }
}
