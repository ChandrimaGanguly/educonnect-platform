import type { Knex } from 'knex';

/**
 * Migration: Create multi-format content support tables
 *
 * Implements the Content Formats and Accessibility requirements from curriculum/spec.md:
 * - Supported content types (text, video, audio, interactive, documents, code, quizzes)
 * - Low-bandwidth optimization (text-only versions, compression, progressive loading)
 * - Accessibility compliance (alt text, captions, transcripts, keyboard navigation)
 * - Multi-language support (translations, completeness tracking)
 */

export async function up(knex: Knex): Promise<void> {
  // Create content_formats table - defines available content formats
  await knex.schema.createTable('content_formats', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Format identification
    table.string('format_key', 50).notNullable().unique();
    table.string('name', 100).notNullable();
    table.text('description');

    // Format type category
    table.enum('format_category', [
      'text',
      'video',
      'audio',
      'interactive',
      'document',
      'code',
      'quiz',
      'image'
    ]).notNullable();

    // MIME types supported by this format
    table.specificType('supported_mime_types', 'varchar(100)[]').notNullable().defaultTo('{}');

    // File extensions
    table.specificType('file_extensions', 'varchar(20)[]').defaultTo('{}');

    // Capabilities
    table.boolean('supports_offline').defaultTo(true);
    table.boolean('supports_text_alternative').defaultTo(false);
    table.boolean('requires_transcoding').defaultTo(false);
    table.boolean('supports_streaming').defaultTo(false);
    table.boolean('supports_captions').defaultTo(false);
    table.boolean('supports_transcript').defaultTo(false);

    // Bandwidth characteristics
    table.integer('avg_bandwidth_kb_per_minute').defaultTo(0);
    table.enum('bandwidth_intensity', ['very_low', 'low', 'medium', 'high', 'very_high']).defaultTo('medium');

    // Accessibility features
    table.boolean('screen_reader_compatible').defaultTo(false);
    table.boolean('keyboard_navigable').defaultTo(true);

    // Status
    table.boolean('is_active').defaultTo(true);
    table.integer('display_order').defaultTo(0);

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('format_category');
    table.index('is_active');
  });

  // Create content_items table - actual content pieces with format information
  await knex.schema.createTable('content_items', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Relationship to curriculum (optional - can be standalone)
    table.uuid('lesson_id').references('id').inTable('curriculum_lessons').onDelete('SET NULL');
    table.uuid('resource_id').references('id').inTable('curriculum_resources').onDelete('SET NULL');
    table.uuid('community_id').references('id').inTable('communities').onDelete('CASCADE');

    // Content identification
    table.string('title', 255).notNullable();
    table.string('slug', 150);
    table.text('description');

    // Primary format
    table.uuid('format_id').references('id').inTable('content_formats').onDelete('SET NULL');
    table.enum('content_type', [
      'text',
      'video',
      'audio',
      'interactive',
      'document',
      'code',
      'quiz',
      'image',
      'mixed'
    ]).notNullable().defaultTo('text');

    // Content storage
    table.text('content_text'); // For text content (markdown/html)
    table.enum('text_format', ['markdown', 'html', 'plain']).defaultTo('markdown');
    table.uuid('content_file_id').references('id').inTable('content_files').onDelete('SET NULL');
    table.string('external_url', 500); // For linked content

    // Metadata
    table.integer('duration_seconds'); // For video/audio
    table.integer('word_count'); // For text content
    table.integer('page_count'); // For documents
    table.integer('file_size_bytes');

    // Bandwidth optimization
    table.integer('estimated_bandwidth_kb').notNullable().defaultTo(0);
    table.boolean('has_text_alternative').defaultTo(false);
    table.text('text_alternative'); // Text-only version for low bandwidth

    // Accessibility
    table.boolean('has_alt_text').defaultTo(false);
    table.boolean('has_captions').defaultTo(false);
    table.boolean('has_transcript').defaultTo(false);
    table.boolean('has_audio_description').defaultTo(false);
    table.text('alt_text');
    table.text('transcript');
    table.float('accessibility_score').defaultTo(0); // 0-100 accessibility rating

    // Original language
    table.string('original_language', 10).notNullable().defaultTo('en');

    // Status and versioning
    table.enum('status', ['draft', 'review', 'published', 'archived']).defaultTo('draft');
    table.integer('version').defaultTo(1);
    table.uuid('previous_version_id').references('id').inTable('content_items').onDelete('SET NULL');

    // Quality metrics
    table.float('quality_score').defaultTo(0); // 0-100
    table.integer('view_count').defaultTo(0);
    table.float('avg_rating').defaultTo(0);
    table.integer('rating_count').defaultTo(0);

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('published_at');
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.uuid('updated_by').references('id').inTable('users').onDelete('SET NULL');

    // Indexes
    table.index('lesson_id');
    table.index('resource_id');
    table.index('community_id');
    table.index('content_type');
    table.index('status');
    table.index('original_language');
    table.index('created_by');
  });

  // Create content_variants table - alternative versions of content (quality levels, formats)
  await knex.schema.createTable('content_variants', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Reference to parent content
    table.uuid('content_item_id').notNullable().references('id').inTable('content_items').onDelete('CASCADE');

    // Variant type
    table.enum('variant_type', [
      'original',
      'text_only',
      'low_quality',
      'medium_quality',
      'high_quality',
      'audio_only',
      'thumbnail',
      'preview',
      'compressed'
    ]).notNullable();

    // Network optimization target
    table.enum('optimized_for_network', ['2g', '3g', '4g', '5g', 'wifi', 'any']).defaultTo('any');

    // Storage
    table.uuid('file_id').references('id').inTable('content_files').onDelete('SET NULL');
    table.text('content_text'); // For text variants
    table.string('external_url', 500);

    // Technical details
    table.string('mime_type', 100);
    table.integer('file_size_bytes');
    table.integer('duration_seconds');
    table.integer('width'); // For video/images
    table.integer('height');
    table.integer('bitrate'); // For video/audio
    table.string('codec', 50);

    // Quality metadata
    table.integer('quality_score').defaultTo(0); // 0-100
    table.integer('bandwidth_estimate_kb');

    // Status
    table.enum('status', ['pending', 'processing', 'ready', 'failed']).defaultTo('pending');
    table.text('processing_error');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('content_item_id');
    table.index('variant_type');
    table.index('optimized_for_network');
    table.index('status');

    // Ensure unique variant type per content item per network
    table.unique(['content_item_id', 'variant_type', 'optimized_for_network']);
  });

  // Create content_translations table - multi-language support
  await knex.schema.createTable('content_translations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Reference to original content
    table.uuid('content_item_id').notNullable().references('id').inTable('content_items').onDelete('CASCADE');

    // Translation details
    table.string('language_code', 10).notNullable();
    table.string('title', 255).notNullable();
    table.text('description');
    table.text('content_text');

    // Translation metadata
    table.boolean('is_machine_translated').defaultTo(false);
    table.boolean('is_verified').defaultTo(false);
    table.uuid('verified_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('verified_at');

    // Completeness tracking
    table.float('translation_completeness').defaultTo(0); // 0-100 percentage
    table.json('missing_fields'); // List of fields not yet translated

    // Accessibility translations
    table.text('alt_text');
    table.text('transcript');
    table.uuid('caption_file_id').references('id').inTable('content_files').onDelete('SET NULL');

    // Quality
    table.float('quality_score').defaultTo(0);
    table.integer('review_count').defaultTo(0);

    // Status
    table.enum('status', ['draft', 'review', 'published', 'archived']).defaultTo('draft');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.uuid('translated_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');

    // Indexes
    table.index('content_item_id');
    table.index('language_code');
    table.index('status');
    table.index('is_verified');

    // Ensure unique language per content item
    table.unique(['content_item_id', 'language_code']);
  });

  // Create content_captions table - video/audio captions
  await knex.schema.createTable('content_captions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Reference to content
    table.uuid('content_item_id').notNullable().references('id').inTable('content_items').onDelete('CASCADE');

    // Caption details
    table.string('language_code', 10).notNullable();
    table.string('label', 100).notNullable(); // e.g., "English (auto-generated)"

    // Caption type
    table.enum('caption_type', [
      'subtitles',
      'closed_captions',
      'descriptions', // Audio descriptions for visually impaired
      'chapters',
      'metadata'
    ]).defaultTo('subtitles');

    // Caption format
    table.enum('format', ['vtt', 'srt', 'ttml', 'sbv']).defaultTo('vtt');

    // Storage
    table.uuid('file_id').references('id').inTable('content_files').onDelete('SET NULL');
    table.text('caption_content'); // Raw caption content

    // Metadata
    table.boolean('is_auto_generated').defaultTo(false);
    table.boolean('is_verified').defaultTo(false);
    table.uuid('verified_by').references('id').inTable('users').onDelete('SET NULL');
    table.integer('cue_count').defaultTo(0); // Number of caption cues

    // Default flag
    table.boolean('is_default').defaultTo(false);

    // Status
    table.enum('status', ['processing', 'ready', 'failed']).defaultTo('processing');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');

    // Indexes
    table.index('content_item_id');
    table.index('language_code');
    table.index('caption_type');
    table.index('status');

    // Ensure unique language per content item per type
    table.unique(['content_item_id', 'language_code', 'caption_type']);
  });

  // Create content_code_sandboxes table - interactive code exercises
  await knex.schema.createTable('content_code_sandboxes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Reference to content
    table.uuid('content_item_id').notNullable().references('id').inTable('content_items').onDelete('CASCADE');

    // Sandbox configuration
    table.string('language', 50).notNullable(); // e.g., 'javascript', 'python'
    table.string('runtime_version', 20); // e.g., 'node18', 'python3.11'
    table.string('template', 100); // Predefined template name

    // Code content
    table.text('starter_code'); // Initial code shown to user
    table.text('solution_code'); // Reference solution
    table.text('test_code'); // Test cases to validate solution

    // Configuration
    table.json('dependencies'); // Required packages/libraries
    table.json('environment'); // Environment variables
    table.integer('timeout_seconds').defaultTo(30);
    table.integer('memory_limit_mb').defaultTo(128);

    // Files
    table.json('files'); // Multiple files for complex exercises

    // Instructions
    table.text('instructions'); // Markdown instructions
    table.text('hints'); // Progressive hints

    // Grading
    table.boolean('auto_grade').defaultTo(true);
    table.float('passing_score').defaultTo(100);

    // Status
    table.enum('status', ['draft', 'published', 'archived']).defaultTo('draft');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('content_item_id');
    table.index('language');
    table.index('status');
  });

  // Create content_interactive_elements table - interactive simulations and widgets
  await knex.schema.createTable('content_interactive_elements', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Reference to content
    table.uuid('content_item_id').notNullable().references('id').inTable('content_items').onDelete('CASCADE');

    // Element type
    table.enum('element_type', [
      'simulation',
      'diagram',
      'quiz_widget',
      'flashcard',
      'timeline',
      'map',
      'chart',
      'calculator',
      'form',
      'custom'
    ]).notNullable();

    // Element configuration
    table.string('title', 255);
    table.text('description');
    table.json('config'); // Element-specific configuration
    table.json('data'); // Data for the element (e.g., chart data)

    // Rendering
    table.string('renderer', 100); // Component/library to use
    table.text('custom_html'); // For custom elements
    table.text('custom_css');
    table.text('custom_js');

    // Behavior
    table.boolean('requires_interaction').defaultTo(true);
    table.boolean('tracks_progress').defaultTo(true);
    table.json('completion_criteria');

    // Accessibility
    table.text('alt_description'); // Text alternative
    table.boolean('keyboard_accessible').defaultTo(true);
    table.boolean('screen_reader_accessible').defaultTo(true);

    // Position in content
    table.integer('display_order').defaultTo(0);

    // Status
    table.enum('status', ['draft', 'published', 'archived']).defaultTo('draft');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('content_item_id');
    table.index('element_type');
    table.index('status');
  });

  // Create content_accessibility_reports table - track accessibility compliance
  await knex.schema.createTable('content_accessibility_reports', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Reference to content
    table.uuid('content_item_id').notNullable().references('id').inTable('content_items').onDelete('CASCADE');

    // Report details
    table.timestamp('report_date').notNullable().defaultTo(knex.fn.now());
    table.string('wcag_version', 20).defaultTo('2.1');
    table.enum('conformance_level', ['A', 'AA', 'AAA']).defaultTo('AA');

    // Scores
    table.float('overall_score').defaultTo(0); // 0-100
    table.float('perceivable_score').defaultTo(0);
    table.float('operable_score').defaultTo(0);
    table.float('understandable_score').defaultTo(0);
    table.float('robust_score').defaultTo(0);

    // Issues found
    table.json('issues'); // Array of accessibility issues
    table.integer('critical_issues').defaultTo(0);
    table.integer('major_issues').defaultTo(0);
    table.integer('minor_issues').defaultTo(0);

    // Checklist completion
    table.boolean('has_alt_text').defaultTo(false);
    table.boolean('has_captions').defaultTo(false);
    table.boolean('has_transcript').defaultTo(false);
    table.boolean('color_contrast_ok').defaultTo(false);
    table.boolean('keyboard_accessible').defaultTo(false);
    table.boolean('screen_reader_tested').defaultTo(false);

    // Review status
    table.enum('status', ['pending', 'passed', 'failed', 'needs_review']).defaultTo('pending');
    table.uuid('reviewed_by').references('id').inTable('users').onDelete('SET NULL');
    table.text('review_notes');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('content_item_id');
    table.index('report_date');
    table.index('status');
    table.index('overall_score');
  });

  // Create content_bandwidth_profiles table - user bandwidth preferences
  await knex.schema.createTable('content_bandwidth_profiles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // User reference
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Profile settings
    table.enum('preferred_quality', ['auto', 'ultra_low', 'low', 'medium', 'high', 'original']).defaultTo('auto');
    table.boolean('auto_download_enabled').defaultTo(false);
    table.boolean('text_only_mode').defaultTo(false);
    table.boolean('reduce_data_usage').defaultTo(false);

    // Network-specific settings
    table.json('network_preferences'); // { '3g': 'low', '4g': 'medium', 'wifi': 'high' }

    // Limits
    table.integer('monthly_data_limit_mb'); // Optional data cap
    table.integer('current_month_usage_mb').defaultTo(0);

    // Download preferences
    table.boolean('download_on_wifi_only').defaultTo(true);
    table.boolean('auto_delete_watched').defaultTo(false);
    table.integer('storage_limit_mb');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Unique per user
    table.unique('user_id');
  });

  // Seed default content formats
  await knex('content_formats').insert([
    {
      format_key: 'markdown',
      name: 'Markdown Text',
      description: 'Rich text content in Markdown format',
      format_category: 'text',
      supported_mime_types: ['text/markdown', 'text/plain'],
      file_extensions: ['.md', '.markdown', '.txt'],
      supports_offline: true,
      supports_text_alternative: true,
      requires_transcoding: false,
      bandwidth_intensity: 'very_low',
      screen_reader_compatible: true,
      keyboard_navigable: true,
      display_order: 1,
    },
    {
      format_key: 'html',
      name: 'HTML Content',
      description: 'Rich HTML content with styling',
      format_category: 'text',
      supported_mime_types: ['text/html'],
      file_extensions: ['.html', '.htm'],
      supports_offline: true,
      supports_text_alternative: true,
      requires_transcoding: false,
      bandwidth_intensity: 'low',
      screen_reader_compatible: true,
      keyboard_navigable: true,
      display_order: 2,
    },
    {
      format_key: 'video_mp4',
      name: 'MP4 Video',
      description: 'Standard MP4 video format',
      format_category: 'video',
      supported_mime_types: ['video/mp4'],
      file_extensions: ['.mp4', '.m4v'],
      supports_offline: true,
      supports_text_alternative: true,
      requires_transcoding: true,
      supports_streaming: true,
      supports_captions: true,
      supports_transcript: true,
      avg_bandwidth_kb_per_minute: 15000,
      bandwidth_intensity: 'high',
      screen_reader_compatible: false,
      keyboard_navigable: true,
      display_order: 3,
    },
    {
      format_key: 'video_webm',
      name: 'WebM Video',
      description: 'WebM video format for web delivery',
      format_category: 'video',
      supported_mime_types: ['video/webm'],
      file_extensions: ['.webm'],
      supports_offline: true,
      supports_text_alternative: true,
      requires_transcoding: true,
      supports_streaming: true,
      supports_captions: true,
      supports_transcript: true,
      avg_bandwidth_kb_per_minute: 12000,
      bandwidth_intensity: 'high',
      screen_reader_compatible: false,
      keyboard_navigable: true,
      display_order: 4,
    },
    {
      format_key: 'audio_mp3',
      name: 'MP3 Audio',
      description: 'Standard MP3 audio format',
      format_category: 'audio',
      supported_mime_types: ['audio/mpeg', 'audio/mp3'],
      file_extensions: ['.mp3'],
      supports_offline: true,
      supports_text_alternative: true,
      requires_transcoding: false,
      supports_streaming: true,
      supports_transcript: true,
      avg_bandwidth_kb_per_minute: 1500,
      bandwidth_intensity: 'medium',
      screen_reader_compatible: false,
      keyboard_navigable: true,
      display_order: 5,
    },
    {
      format_key: 'audio_ogg',
      name: 'OGG Audio',
      description: 'OGG Vorbis audio format',
      format_category: 'audio',
      supported_mime_types: ['audio/ogg'],
      file_extensions: ['.ogg', '.oga'],
      supports_offline: true,
      supports_text_alternative: true,
      requires_transcoding: false,
      supports_streaming: true,
      supports_transcript: true,
      avg_bandwidth_kb_per_minute: 1200,
      bandwidth_intensity: 'medium',
      screen_reader_compatible: false,
      keyboard_navigable: true,
      display_order: 6,
    },
    {
      format_key: 'pdf',
      name: 'PDF Document',
      description: 'Portable Document Format',
      format_category: 'document',
      supported_mime_types: ['application/pdf'],
      file_extensions: ['.pdf'],
      supports_offline: true,
      supports_text_alternative: true,
      requires_transcoding: false,
      bandwidth_intensity: 'medium',
      screen_reader_compatible: true,
      keyboard_navigable: true,
      display_order: 7,
    },
    {
      format_key: 'epub',
      name: 'EPUB eBook',
      description: 'Electronic publication format',
      format_category: 'document',
      supported_mime_types: ['application/epub+zip'],
      file_extensions: ['.epub'],
      supports_offline: true,
      supports_text_alternative: true,
      requires_transcoding: false,
      bandwidth_intensity: 'low',
      screen_reader_compatible: true,
      keyboard_navigable: true,
      display_order: 8,
    },
    {
      format_key: 'code_exercise',
      name: 'Code Exercise',
      description: 'Interactive coding exercise with sandbox',
      format_category: 'code',
      supported_mime_types: ['application/json'],
      file_extensions: ['.json'],
      supports_offline: false,
      supports_text_alternative: true,
      requires_transcoding: false,
      bandwidth_intensity: 'low',
      screen_reader_compatible: true,
      keyboard_navigable: true,
      display_order: 9,
    },
    {
      format_key: 'quiz',
      name: 'Quiz',
      description: 'Interactive quiz with questions',
      format_category: 'quiz',
      supported_mime_types: ['application/json'],
      file_extensions: ['.json'],
      supports_offline: true,
      supports_text_alternative: true,
      requires_transcoding: false,
      bandwidth_intensity: 'very_low',
      screen_reader_compatible: true,
      keyboard_navigable: true,
      display_order: 10,
    },
    {
      format_key: 'interactive_simulation',
      name: 'Interactive Simulation',
      description: 'Interactive learning simulation',
      format_category: 'interactive',
      supported_mime_types: ['text/html', 'application/json'],
      file_extensions: ['.html', '.json'],
      supports_offline: false,
      supports_text_alternative: true,
      requires_transcoding: false,
      bandwidth_intensity: 'medium',
      screen_reader_compatible: false,
      keyboard_navigable: true,
      display_order: 11,
    },
    {
      format_key: 'image_jpeg',
      name: 'JPEG Image',
      description: 'JPEG image format',
      format_category: 'image',
      supported_mime_types: ['image/jpeg'],
      file_extensions: ['.jpg', '.jpeg'],
      supports_offline: true,
      supports_text_alternative: true,
      requires_transcoding: false,
      bandwidth_intensity: 'low',
      screen_reader_compatible: false,
      keyboard_navigable: false,
      display_order: 12,
    },
    {
      format_key: 'image_png',
      name: 'PNG Image',
      description: 'PNG image format',
      format_category: 'image',
      supported_mime_types: ['image/png'],
      file_extensions: ['.png'],
      supports_offline: true,
      supports_text_alternative: true,
      requires_transcoding: false,
      bandwidth_intensity: 'low',
      screen_reader_compatible: false,
      keyboard_navigable: false,
      display_order: 13,
    },
    {
      format_key: 'image_webp',
      name: 'WebP Image',
      description: 'WebP image format for web',
      format_category: 'image',
      supported_mime_types: ['image/webp'],
      file_extensions: ['.webp'],
      supports_offline: true,
      supports_text_alternative: true,
      requires_transcoding: false,
      bandwidth_intensity: 'very_low',
      screen_reader_compatible: false,
      keyboard_navigable: false,
      display_order: 14,
    },
  ]);

  // Create triggers for updated_at
  await knex.raw(`
    CREATE TRIGGER update_content_formats_updated_at
      BEFORE UPDATE ON content_formats
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_content_items_updated_at
      BEFORE UPDATE ON content_items
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_content_variants_updated_at
      BEFORE UPDATE ON content_variants
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_content_translations_updated_at
      BEFORE UPDATE ON content_translations
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_content_captions_updated_at
      BEFORE UPDATE ON content_captions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_content_code_sandboxes_updated_at
      BEFORE UPDATE ON content_code_sandboxes
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_content_interactive_elements_updated_at
      BEFORE UPDATE ON content_interactive_elements
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_content_bandwidth_profiles_updated_at
      BEFORE UPDATE ON content_bandwidth_profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);

  // Create full-text search indexes
  await knex.raw(`
    CREATE INDEX content_items_search_idx ON content_items
    USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

    CREATE INDEX content_translations_search_idx ON content_translations
    USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop triggers
  await knex.raw(`
    DROP TRIGGER IF EXISTS update_content_formats_updated_at ON content_formats;
    DROP TRIGGER IF EXISTS update_content_items_updated_at ON content_items;
    DROP TRIGGER IF EXISTS update_content_variants_updated_at ON content_variants;
    DROP TRIGGER IF EXISTS update_content_translations_updated_at ON content_translations;
    DROP TRIGGER IF EXISTS update_content_captions_updated_at ON content_captions;
    DROP TRIGGER IF EXISTS update_content_code_sandboxes_updated_at ON content_code_sandboxes;
    DROP TRIGGER IF EXISTS update_content_interactive_elements_updated_at ON content_interactive_elements;
    DROP TRIGGER IF EXISTS update_content_bandwidth_profiles_updated_at ON content_bandwidth_profiles;
  `);

  // Drop tables in reverse dependency order
  await knex.schema.dropTableIfExists('content_bandwidth_profiles');
  await knex.schema.dropTableIfExists('content_accessibility_reports');
  await knex.schema.dropTableIfExists('content_interactive_elements');
  await knex.schema.dropTableIfExists('content_code_sandboxes');
  await knex.schema.dropTableIfExists('content_captions');
  await knex.schema.dropTableIfExists('content_translations');
  await knex.schema.dropTableIfExists('content_variants');
  await knex.schema.dropTableIfExists('content_items');
  await knex.schema.dropTableIfExists('content_formats');
}
