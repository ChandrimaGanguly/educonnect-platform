/**
 * Text-First Content Mode Types
 *
 * Implements the Text-First Content Strategy requirements from mobile/spec.md:
 * - Text alternatives for all content types (video, audio, images, interactive)
 * - Text mode display settings
 * - Page weight reduction by 90%+
 * - Selective media loading
 */

// ========== Enums ==========

export type TextAlternativeType =
  | 'full_transcript'
  | 'summary'
  | 'description'
  | 'key_points'
  | 'text_lesson'
  | 'downloadable';

export type TextAlternativeFormat = 'plain' | 'markdown' | 'html';

export type TextAlternativeStatus = 'draft' | 'review' | 'published' | 'archived';

export type ContentLoadType = 'image' | 'video' | 'audio' | 'interactive' | 'document';

export type ContentLoadReason =
  | 'user_requested'
  | 'essential_content'
  | 'always_load'
  | 'offline_cached'
  | 'auto_load';

export type NetworkType = '2g' | '3g' | '4g' | '5g' | 'wifi';

// ========== Text Mode Settings ==========

export interface TextModeSettings {
  id: string;
  user_id: string;
  enabled: boolean;
  auto_enable_on_low_bandwidth: boolean;
  auto_enable_threshold_kbps: number;
  hide_images: boolean;
  hide_videos: boolean;
  hide_audio: boolean;
  hide_interactive: boolean;
  show_media_placeholders: boolean;
  allow_selective_load: boolean;
  always_load_content_types: string[];
  high_contrast_mode: boolean;
  larger_text: boolean;
  font_size_multiplier: number;
  simplified_layout: boolean;
  compress_text: boolean;
  preload_text_alternatives: boolean;
  max_text_cache_size_mb: number;
  notify_when_enabled: boolean;
  notify_missing_alternatives: boolean;
  data_saved_bytes: number;
  times_auto_enabled: number;
  last_auto_enabled_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// ========== Text Alternatives ==========

export interface ContentTextAlternative {
  id: string;
  content_item_id: string;
  language_code: string;
  alternative_type: TextAlternativeType;
  content: string;
  word_count: number;
  reading_time_seconds: number;
  format: TextAlternativeFormat;
  is_auto_generated: boolean;
  is_verified: boolean;
  verified_by?: string;
  verified_at?: Date;
  quality_score: number;
  completeness_percentage: number;
  missing_sections?: string[];
  size_bytes: number;
  original_content_size_bytes: number;
  size_reduction_percentage: number;
  status: TextAlternativeStatus;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
}

// ========== Content Loading Tracking ==========

export interface TextModeContentLoad {
  id: string;
  user_id: string;
  content_item_id: string;
  load_type: ContentLoadType;
  was_text_mode_active: boolean;
  load_reason: ContentLoadReason;
  bytes_loaded: number;
  bytes_saved: number;
  network_type?: NetworkType;
  estimated_speed_kbps?: number;
  loaded_at: Date;
}

// ========== Data Usage Tracking ==========

export interface TextModeDataUsage {
  id: string;
  user_id: string;
  date: Date;
  bytes_consumed_in_text_mode: number;
  bytes_saved_by_text_mode: number;
  content_items_viewed: number;
  selective_loads_requested: number;
  time_in_text_mode_seconds: number;
  video_bytes_saved: number;
  audio_bytes_saved: number;
  image_bytes_saved: number;
  interactive_bytes_saved: number;
}

// ========== DTOs ==========

export interface UpdateTextModeSettingsDto {
  enabled?: boolean;
  auto_enable_on_low_bandwidth?: boolean;
  auto_enable_threshold_kbps?: number;
  hide_images?: boolean;
  hide_videos?: boolean;
  hide_audio?: boolean;
  hide_interactive?: boolean;
  show_media_placeholders?: boolean;
  allow_selective_load?: boolean;
  always_load_content_types?: string[];
  high_contrast_mode?: boolean;
  larger_text?: boolean;
  font_size_multiplier?: number;
  simplified_layout?: boolean;
  compress_text?: boolean;
  preload_text_alternatives?: boolean;
  max_text_cache_size_mb?: number;
  notify_when_enabled?: boolean;
  notify_missing_alternatives?: boolean;
}

export interface CreateTextAlternativeDto {
  content_item_id: string;
  language_code?: string;
  alternative_type: TextAlternativeType;
  content: string;
  format?: TextAlternativeFormat;
  is_auto_generated?: boolean;
  original_content_size_bytes?: number;
}

export interface UpdateTextAlternativeDto {
  content?: string;
  format?: TextAlternativeFormat;
  quality_score?: number;
  completeness_percentage?: number;
  missing_sections?: string[];
  status?: TextAlternativeStatus;
}

export interface RecordContentLoadDto {
  content_item_id: string;
  load_type: ContentLoadType;
  load_reason: ContentLoadReason;
  bytes_loaded: number;
  bytes_saved?: number;
  network_type?: NetworkType;
  estimated_speed_kbps?: number;
}

// ========== Query Options ==========

export interface TextAlternativeQueryOptions {
  content_item_id?: string;
  language_code?: string;
  alternative_type?: TextAlternativeType;
  status?: TextAlternativeStatus;
  is_verified?: boolean;
  min_quality_score?: number;
  limit?: number;
  offset?: number;
}

export interface DataUsageQueryOptions {
  start_date?: Date;
  end_date?: Date;
  limit?: number;
}

// ========== Response Types ==========

export interface TextModeContentResponse {
  content_item_id: string;
  title: string;
  text_alternative?: ContentTextAlternative;
  has_text_alternative: boolean;
  available_types: TextAlternativeType[];
  estimated_reading_time_seconds: number;
  size_bytes: number;
  original_size_bytes: number;
  size_reduction_percentage: number;
  media_placeholders?: MediaPlaceholder[];
}

export interface MediaPlaceholder {
  type: ContentLoadType;
  description: string;
  alt_text?: string;
  original_size_bytes: number;
  can_load: boolean;
  load_warning?: string;
}

export interface DataSavingsReport {
  user_id: string;
  period: 'day' | 'week' | 'month' | 'all_time';
  total_bytes_saved: number;
  total_bytes_consumed: number;
  savings_percentage: number;
  breakdown: {
    video_bytes_saved: number;
    audio_bytes_saved: number;
    image_bytes_saved: number;
    interactive_bytes_saved: number;
  };
  content_items_viewed: number;
  selective_loads: number;
  time_in_text_mode_seconds: number;
}

export interface TextModeStatus {
  enabled: boolean;
  auto_enabled: boolean;
  current_network_type?: NetworkType;
  estimated_speed_kbps?: number;
  should_auto_enable: boolean;
  total_data_saved_bytes: number;
}

export interface BulkTextAlternativeResult {
  content_item_id: string;
  success: boolean;
  text_alternative_id?: string;
  error?: string;
}

// ========== Content Delivery in Text Mode ==========

export interface TextModeDeliveryOptions {
  language_code?: string;
  preferred_type?: TextAlternativeType;
  include_media_placeholders?: boolean;
  include_available_alternatives?: boolean;
}

export interface TextModeDeliveryResponse {
  content: TextModeContentResponse;
  settings: TextModeSettings;
  network_status: TextModeStatus;
}

// ========== Pagination ==========

export interface PaginatedTextAlternatives {
  items: ContentTextAlternative[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}
