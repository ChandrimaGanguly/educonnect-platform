/**
 * Multi-Format Content Types
 *
 * Implements the Content Formats and Accessibility requirements from curriculum/spec.md:
 * - Supported content types (text, video, audio, interactive, documents, code, quizzes)
 * - Low-bandwidth optimization (text-only versions, compression, progressive loading)
 * - Accessibility compliance (alt text, captions, transcripts, keyboard navigation)
 * - Multi-language support (translations, completeness tracking)
 */

// ========== Enums ==========

export type FormatCategory =
  | 'text'
  | 'video'
  | 'audio'
  | 'interactive'
  | 'document'
  | 'code'
  | 'quiz'
  | 'image';

export type ContentType =
  | 'text'
  | 'video'
  | 'audio'
  | 'interactive'
  | 'document'
  | 'code'
  | 'quiz'
  | 'image'
  | 'mixed';

export type TextFormat = 'markdown' | 'html' | 'plain';

export type ContentStatus = 'draft' | 'review' | 'published' | 'archived';

export type BandwidthIntensity = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';

export type VariantType =
  | 'original'
  | 'text_only'
  | 'low_quality'
  | 'medium_quality'
  | 'high_quality'
  | 'audio_only'
  | 'thumbnail'
  | 'preview'
  | 'compressed';

export type NetworkType = '2g' | '3g' | '4g' | '5g' | 'wifi' | 'any';

export type CaptionType =
  | 'subtitles'
  | 'closed_captions'
  | 'descriptions'
  | 'chapters'
  | 'metadata';

export type CaptionFormat = 'vtt' | 'srt' | 'ttml' | 'sbv';

export type VariantStatus = 'pending' | 'processing' | 'ready' | 'failed';

export type TranslationStatus = 'draft' | 'review' | 'published' | 'archived';

export type InteractiveElementType =
  | 'simulation'
  | 'diagram'
  | 'quiz_widget'
  | 'flashcard'
  | 'timeline'
  | 'map'
  | 'chart'
  | 'calculator'
  | 'form'
  | 'custom';

export type CodeLanguage =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'java'
  | 'csharp'
  | 'cpp'
  | 'go'
  | 'rust'
  | 'ruby'
  | 'php'
  | 'swift'
  | 'kotlin'
  | 'sql'
  | 'html'
  | 'css';

export type QualityPreference = 'auto' | 'ultra_low' | 'low' | 'medium' | 'high' | 'original';

export type AccessibilityConformanceLevel = 'A' | 'AA' | 'AAA';

export type AccessibilityReportStatus = 'pending' | 'passed' | 'failed' | 'needs_review';

// ========== Content Format Definition ==========

export interface ContentFormat {
  id: string;
  format_key: string;
  name: string;
  description?: string;
  format_category: FormatCategory;
  supported_mime_types: string[];
  file_extensions: string[];
  supports_offline: boolean;
  supports_text_alternative: boolean;
  requires_transcoding: boolean;
  supports_streaming: boolean;
  supports_captions: boolean;
  supports_transcript: boolean;
  avg_bandwidth_kb_per_minute: number;
  bandwidth_intensity: BandwidthIntensity;
  screen_reader_compatible: boolean;
  keyboard_navigable: boolean;
  is_active: boolean;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

// ========== Content Item ==========

export interface ContentItem {
  id: string;
  lesson_id?: string;
  resource_id?: string;
  community_id?: string;
  title: string;
  slug?: string;
  description?: string;
  format_id?: string;
  content_type: ContentType;
  content_text?: string;
  text_format: TextFormat;
  content_file_id?: string;
  external_url?: string;
  duration_seconds?: number;
  word_count?: number;
  page_count?: number;
  file_size_bytes?: number;
  estimated_bandwidth_kb: number;
  has_text_alternative: boolean;
  text_alternative?: string;
  has_alt_text: boolean;
  has_captions: boolean;
  has_transcript: boolean;
  has_audio_description: boolean;
  alt_text?: string;
  transcript?: string;
  accessibility_score: number;
  original_language: string;
  status: ContentStatus;
  version: number;
  previous_version_id?: string;
  quality_score: number;
  view_count: number;
  avg_rating: number;
  rating_count: number;
  created_at: Date;
  updated_at: Date;
  published_at?: Date;
  created_by: string;
  updated_by?: string;
}

// ========== Content Variant ==========

export interface ContentVariant {
  id: string;
  content_item_id: string;
  variant_type: VariantType;
  optimized_for_network: NetworkType;
  file_id?: string;
  content_text?: string;
  external_url?: string;
  mime_type?: string;
  file_size_bytes?: number;
  duration_seconds?: number;
  width?: number;
  height?: number;
  bitrate?: number;
  codec?: string;
  quality_score: number;
  bandwidth_estimate_kb?: number;
  status: VariantStatus;
  processing_error?: string;
  created_at: Date;
  updated_at: Date;
}

// ========== Content Translation ==========

export interface ContentTranslation {
  id: string;
  content_item_id: string;
  language_code: string;
  title: string;
  description?: string;
  content_text?: string;
  is_machine_translated: boolean;
  is_verified: boolean;
  verified_by?: string;
  verified_at?: Date;
  translation_completeness: number;
  missing_fields?: string[];
  alt_text?: string;
  transcript?: string;
  caption_file_id?: string;
  quality_score: number;
  review_count: number;
  status: TranslationStatus;
  created_at: Date;
  updated_at: Date;
  translated_by: string;
}

// ========== Content Caption ==========

export interface ContentCaption {
  id: string;
  content_item_id: string;
  language_code: string;
  label: string;
  caption_type: CaptionType;
  format: CaptionFormat;
  file_id?: string;
  caption_content?: string;
  is_auto_generated: boolean;
  is_verified: boolean;
  verified_by?: string;
  cue_count: number;
  is_default: boolean;
  status: VariantStatus;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
}

// ========== Code Sandbox ==========

export interface ContentCodeSandbox {
  id: string;
  content_item_id: string;
  language: string;
  runtime_version?: string;
  template?: string;
  starter_code?: string;
  solution_code?: string;
  test_code?: string;
  dependencies?: Record<string, string>;
  environment?: Record<string, string>;
  timeout_seconds: number;
  memory_limit_mb: number;
  files?: SandboxFile[];
  instructions?: string;
  hints?: string;
  auto_grade: boolean;
  passing_score: number;
  status: ContentStatus;
  created_at: Date;
  updated_at: Date;
}

export interface SandboxFile {
  name: string;
  content: string;
  language?: string;
  readonly?: boolean;
}

// ========== Interactive Element ==========

export interface ContentInteractiveElement {
  id: string;
  content_item_id: string;
  element_type: InteractiveElementType;
  title?: string;
  description?: string;
  config?: Record<string, unknown>;
  data?: Record<string, unknown>;
  renderer?: string;
  custom_html?: string;
  custom_css?: string;
  custom_js?: string;
  requires_interaction: boolean;
  tracks_progress: boolean;
  completion_criteria?: CompletionCriteria;
  alt_description?: string;
  keyboard_accessible: boolean;
  screen_reader_accessible: boolean;
  display_order: number;
  status: ContentStatus;
  created_at: Date;
  updated_at: Date;
}

export interface CompletionCriteria {
  type: 'time_spent' | 'interaction_count' | 'score' | 'custom';
  threshold?: number;
  custom_check?: string;
}

// ========== Accessibility Report ==========

export interface ContentAccessibilityReport {
  id: string;
  content_item_id: string;
  report_date: Date;
  wcag_version: string;
  conformance_level: AccessibilityConformanceLevel;
  overall_score: number;
  perceivable_score: number;
  operable_score: number;
  understandable_score: number;
  robust_score: number;
  issues?: AccessibilityIssue[];
  critical_issues: number;
  major_issues: number;
  minor_issues: number;
  has_alt_text: boolean;
  has_captions: boolean;
  has_transcript: boolean;
  color_contrast_ok: boolean;
  keyboard_accessible: boolean;
  screen_reader_tested: boolean;
  status: AccessibilityReportStatus;
  reviewed_by?: string;
  review_notes?: string;
  created_at: Date;
}

export interface AccessibilityIssue {
  id: string;
  severity: 'critical' | 'major' | 'minor';
  wcag_criterion: string;
  description: string;
  element?: string;
  suggestion?: string;
}

// ========== Bandwidth Profile ==========

export interface ContentBandwidthProfile {
  id: string;
  user_id: string;
  preferred_quality: QualityPreference;
  auto_download_enabled: boolean;
  text_only_mode: boolean;
  reduce_data_usage: boolean;
  network_preferences?: NetworkPreferences;
  monthly_data_limit_mb?: number;
  current_month_usage_mb: number;
  download_on_wifi_only: boolean;
  auto_delete_watched: boolean;
  storage_limit_mb?: number;
  created_at: Date;
  updated_at: Date;
}

export interface NetworkPreferences {
  '2g'?: QualityPreference;
  '3g'?: QualityPreference;
  '4g'?: QualityPreference;
  '5g'?: QualityPreference;
  wifi?: QualityPreference;
}

// ========== DTOs for API ==========

export interface CreateContentItemDto {
  lesson_id?: string;
  resource_id?: string;
  community_id?: string;
  title: string;
  slug?: string;
  description?: string;
  content_type: ContentType;
  content_text?: string;
  text_format?: TextFormat;
  content_file_id?: string;
  external_url?: string;
  duration_seconds?: number;
  original_language?: string;
  alt_text?: string;
  transcript?: string;
  text_alternative?: string;
}

export interface UpdateContentItemDto {
  title?: string;
  description?: string;
  content_text?: string;
  text_format?: TextFormat;
  content_file_id?: string;
  external_url?: string;
  duration_seconds?: number;
  alt_text?: string;
  transcript?: string;
  text_alternative?: string;
  status?: ContentStatus;
}

export interface CreateContentVariantDto {
  content_item_id: string;
  variant_type: VariantType;
  optimized_for_network?: NetworkType;
  file_id?: string;
  content_text?: string;
  external_url?: string;
  mime_type?: string;
  file_size_bytes?: number;
  width?: number;
  height?: number;
  bitrate?: number;
  codec?: string;
}

export interface CreateContentTranslationDto {
  content_item_id: string;
  language_code: string;
  title: string;
  description?: string;
  content_text?: string;
  is_machine_translated?: boolean;
  alt_text?: string;
  transcript?: string;
}

export interface CreateContentCaptionDto {
  content_item_id: string;
  language_code: string;
  label: string;
  caption_type?: CaptionType;
  format?: CaptionFormat;
  file_id?: string;
  caption_content?: string;
  is_auto_generated?: boolean;
  is_default?: boolean;
}

export interface CreateCodeSandboxDto {
  content_item_id: string;
  language: string;
  runtime_version?: string;
  template?: string;
  starter_code?: string;
  solution_code?: string;
  test_code?: string;
  dependencies?: Record<string, string>;
  timeout_seconds?: number;
  memory_limit_mb?: number;
  files?: SandboxFile[];
  instructions?: string;
  hints?: string;
}

export interface CreateInteractiveElementDto {
  content_item_id: string;
  element_type: InteractiveElementType;
  title?: string;
  description?: string;
  config?: Record<string, unknown>;
  data?: Record<string, unknown>;
  renderer?: string;
  custom_html?: string;
  custom_css?: string;
  custom_js?: string;
  completion_criteria?: CompletionCriteria;
  alt_description?: string;
}

export interface UpdateBandwidthProfileDto {
  preferred_quality?: QualityPreference;
  auto_download_enabled?: boolean;
  text_only_mode?: boolean;
  reduce_data_usage?: boolean;
  network_preferences?: NetworkPreferences;
  monthly_data_limit_mb?: number;
  download_on_wifi_only?: boolean;
  auto_delete_watched?: boolean;
  storage_limit_mb?: number;
}

// ========== Query Options ==========

export interface ContentQueryOptions {
  community_id?: string;
  lesson_id?: string;
  content_type?: ContentType;
  status?: ContentStatus;
  language?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sort_by?: 'created_at' | 'updated_at' | 'title' | 'quality_score' | 'view_count';
  sort_order?: 'asc' | 'desc';
}

export interface ContentDeliveryOptions {
  network_type?: NetworkType;
  preferred_quality?: QualityPreference;
  include_variants?: boolean;
  include_translations?: boolean;
  include_captions?: boolean;
  language?: string;
  text_only?: boolean;
}

// ========== Response Types ==========

export interface ContentItemWithDetails extends ContentItem {
  format?: ContentFormat;
  variants?: ContentVariant[];
  translations?: ContentTranslation[];
  captions?: ContentCaption[];
  code_sandbox?: ContentCodeSandbox;
  interactive_elements?: ContentInteractiveElement[];
  accessibility_report?: ContentAccessibilityReport;
}

export interface ContentDeliveryResponse {
  content: ContentItem;
  selected_variant?: ContentVariant;
  available_translations: Array<{ language_code: string; is_complete: boolean }>;
  available_captions: Array<{ language_code: string; caption_type: CaptionType }>;
  bandwidth_estimate_kb: number;
  text_alternative_available: boolean;
}

export interface PaginatedContentResponse {
  items: ContentItem[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}
