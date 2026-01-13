import type { Knex } from 'knex';

/**
 * Migration: Create text mode settings and text alternatives infrastructure
 *
 * Implements the Text-First Content Strategy requirements from mobile/spec.md:
 * - Text alternatives for all content types (SHALL)
 * - Text mode display settings (SHALL)
 * - Page weight reduction by 90%+ (SHALL)
 * - Selective media loading (SHALL)
 * - SMS fallback support (MAY)
 */

export async function up(knex: Knex): Promise<void> {
  // Create text_mode_settings table - comprehensive user text mode preferences
  await knex.schema.createTable('text_mode_settings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // User reference
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Core text mode settings
    table.boolean('enabled').notNullable().defaultTo(false);
    table.boolean('auto_enable_on_low_bandwidth').defaultTo(true);

    // Bandwidth threshold for auto-enable (in kbps)
    table.integer('auto_enable_threshold_kbps').defaultTo(200);

    // Content visibility preferences
    table.boolean('hide_images').defaultTo(true);
    table.boolean('hide_videos').defaultTo(true);
    table.boolean('hide_audio').defaultTo(true);
    table.boolean('hide_interactive').defaultTo(true);
    table.boolean('show_media_placeholders').defaultTo(true);

    // Selective loading preferences
    table.boolean('allow_selective_load').defaultTo(true);
    table.specificType('always_load_content_types', 'varchar(50)[]').defaultTo('{}');

    // Display preferences
    table.boolean('high_contrast_mode').defaultTo(false);
    table.boolean('larger_text').defaultTo(false);
    table.integer('font_size_multiplier').defaultTo(100); // percentage
    table.boolean('simplified_layout').defaultTo(true);

    // Data savings settings
    table.boolean('compress_text').defaultTo(true);
    table.boolean('preload_text_alternatives').defaultTo(false);
    table.integer('max_text_cache_size_mb').defaultTo(50);

    // Notification preferences for text mode
    table.boolean('notify_when_enabled').defaultTo(true);
    table.boolean('notify_missing_alternatives').defaultTo(true);

    // Statistics
    table.bigInteger('data_saved_bytes').defaultTo(0);
    table.integer('times_auto_enabled').defaultTo(0);
    table.timestamp('last_auto_enabled_at');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Unique per user
    table.unique('user_id');
  });

  // Create content_text_alternatives table - text alternatives for all content
  await knex.schema.createTable('content_text_alternatives', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Content reference
    table.uuid('content_item_id').notNullable().references('id').inTable('content_items').onDelete('CASCADE');

    // Language
    table.string('language_code', 10).notNullable().defaultTo('en');

    // Text alternative types
    table.enum('alternative_type', [
      'full_transcript',     // Complete text version of content
      'summary',             // Brief summary
      'description',         // Descriptive text for media
      'key_points',          // Bullet points of main concepts
      'text_lesson',         // Text version of video/audio lesson
      'downloadable'         // Downloadable text file version
    ]).notNullable();

    // Content
    table.text('content').notNullable();
    table.integer('word_count').defaultTo(0);
    table.integer('reading_time_seconds').defaultTo(0);

    // Formatting
    table.enum('format', ['plain', 'markdown', 'html']).defaultTo('markdown');

    // Quality and metadata
    table.boolean('is_auto_generated').defaultTo(false);
    table.boolean('is_verified').defaultTo(false);
    table.uuid('verified_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('verified_at');
    table.float('quality_score').defaultTo(0); // 0-100

    // Completeness tracking
    table.float('completeness_percentage').defaultTo(100);
    table.json('missing_sections'); // List of sections without text alternatives

    // Size metrics
    table.integer('size_bytes').defaultTo(0);
    table.integer('original_content_size_bytes').defaultTo(0);
    table.float('size_reduction_percentage').defaultTo(0);

    // Status
    table.enum('status', ['draft', 'review', 'published', 'archived']).defaultTo('draft');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');

    // Indexes
    table.index('content_item_id');
    table.index('language_code');
    table.index('alternative_type');
    table.index('status');

    // Unique constraint per content item, language, and type
    table.unique(['content_item_id', 'language_code', 'alternative_type']);
  });

  // Create text_mode_content_loads table - track selective media loading in text mode
  await knex.schema.createTable('text_mode_content_loads', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // User and content references
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('content_item_id').notNullable().references('id').inTable('content_items').onDelete('CASCADE');

    // Load details
    table.enum('load_type', ['image', 'video', 'audio', 'interactive', 'document']).notNullable();
    table.boolean('was_text_mode_active').defaultTo(true);
    table.enum('load_reason', [
      'user_requested',      // User clicked to load
      'essential_content',   // Marked as essential
      'always_load',         // In user's always-load list
      'offline_cached',      // Already cached
      'auto_load'            // Auto-loaded for some reason
    ]).notNullable();

    // Data usage
    table.integer('bytes_loaded').defaultTo(0);
    table.integer('bytes_saved').defaultTo(0); // What would have been loaded without text mode

    // Network context
    table.string('network_type', 20); // '2g', '3g', '4g', 'wifi'
    table.integer('estimated_speed_kbps');

    // Timestamp
    table.timestamp('loaded_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('content_item_id');
    table.index('loaded_at');
  });

  // Create text_mode_data_usage table - track data savings from text mode
  await knex.schema.createTable('text_mode_data_usage', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // User reference
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Period
    table.date('date').notNullable();

    // Usage statistics
    table.bigInteger('bytes_consumed_in_text_mode').defaultTo(0);
    table.bigInteger('bytes_saved_by_text_mode').defaultTo(0);
    table.integer('content_items_viewed').defaultTo(0);
    table.integer('selective_loads_requested').defaultTo(0);
    table.integer('time_in_text_mode_seconds').defaultTo(0);

    // Breakdown by content type
    table.bigInteger('video_bytes_saved').defaultTo(0);
    table.bigInteger('audio_bytes_saved').defaultTo(0);
    table.bigInteger('image_bytes_saved').defaultTo(0);
    table.bigInteger('interactive_bytes_saved').defaultTo(0);

    // Unique per user per day
    table.unique(['user_id', 'date']);

    // Indexes
    table.index('user_id');
    table.index('date');
  });

  // Create triggers for updated_at
  await knex.raw(`
    CREATE TRIGGER update_text_mode_settings_updated_at
      BEFORE UPDATE ON text_mode_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_content_text_alternatives_updated_at
      BEFORE UPDATE ON content_text_alternatives
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);

  // Create function to calculate reading time from word count
  await knex.raw(`
    CREATE OR REPLACE FUNCTION calculate_reading_time(word_count INTEGER)
    RETURNS INTEGER AS $$
    BEGIN
      -- Average reading speed: 200 words per minute
      RETURN GREATEST(1, CEIL(word_count / 200.0) * 60);
    END;
    $$ LANGUAGE plpgsql IMMUTABLE;
  `);

  // Create trigger to auto-calculate reading time on text alternatives
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_text_alternative_metrics()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Calculate word count
      NEW.word_count := array_length(regexp_split_to_array(trim(NEW.content), '\s+'), 1);

      -- Calculate reading time in seconds (200 words per minute)
      NEW.reading_time_seconds := GREATEST(1, CEIL(NEW.word_count / 200.0) * 60);

      -- Calculate size in bytes
      NEW.size_bytes := octet_length(NEW.content);

      -- Calculate size reduction percentage if original size is known
      IF NEW.original_content_size_bytes > 0 THEN
        NEW.size_reduction_percentage :=
          GREATEST(0, (1 - (NEW.size_bytes::float / NEW.original_content_size_bytes)) * 100);
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER update_text_alternative_metrics_trigger
      BEFORE INSERT OR UPDATE OF content ON content_text_alternatives
      FOR EACH ROW
      EXECUTE FUNCTION update_text_alternative_metrics();
  `);

  // Create full-text search index on content_text_alternatives
  await knex.raw(`
    CREATE INDEX content_text_alternatives_search_idx ON content_text_alternatives
    USING gin(to_tsvector('english', content));
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop triggers
  await knex.raw(`
    DROP TRIGGER IF EXISTS update_text_mode_settings_updated_at ON text_mode_settings;
    DROP TRIGGER IF EXISTS update_content_text_alternatives_updated_at ON content_text_alternatives;
    DROP TRIGGER IF EXISTS update_text_alternative_metrics_trigger ON content_text_alternatives;
  `);

  // Drop functions
  await knex.raw(`
    DROP FUNCTION IF EXISTS update_text_alternative_metrics();
    DROP FUNCTION IF EXISTS calculate_reading_time(INTEGER);
  `);

  // Drop tables in reverse dependency order
  await knex.schema.dropTableIfExists('text_mode_data_usage');
  await knex.schema.dropTableIfExists('text_mode_content_loads');
  await knex.schema.dropTableIfExists('content_text_alternatives');
  await knex.schema.dropTableIfExists('text_mode_settings');
}
