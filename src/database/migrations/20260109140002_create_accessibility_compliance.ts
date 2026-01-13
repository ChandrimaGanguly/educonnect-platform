import type { Knex } from 'knex';

/**
 * Migration: Create accessibility compliance tables
 *
 * This migration creates the infrastructure for:
 * - Accessibility checks and reports for content
 * - Accessibility issues tracking and remediation
 * - User accessibility preferences
 * - WCAG compliance auditing
 */

export async function up(knex: Knex): Promise<void> {
  // Create content_accessibility_checks table
  // Stores accessibility validation results for content items
  await knex.schema.createTable('content_accessibility_checks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Content reference - can be linked to various content types
    table.uuid('lesson_id').nullable().references('id').inTable('curriculum_lessons').onDelete('CASCADE');
    table.uuid('resource_id').nullable().references('id').inTable('curriculum_resources').onDelete('CASCADE');
    table.uuid('content_file_id').nullable().references('id').inTable('content_files').onDelete('CASCADE');

    // Check details
    table.enum('check_type', [
      'alt_text',
      'captions',
      'transcript',
      'color_contrast',
      'keyboard_navigation',
      'screen_reader',
      'heading_structure',
      'link_text',
      'form_labels',
      'language',
      'focus_indicators',
      'text_scaling',
      'motion_sensitivity',
      'full_audit'
    ]).notNullable();

    // Compliance standard
    table.enum('wcag_level', ['A', 'AA', 'AAA']).notNullable().defaultTo('AA');
    table.string('wcag_version', 10).notNullable().defaultTo('2.1');

    // Results
    table.enum('status', [
      'pending',
      'in_progress',
      'passed',
      'failed',
      'warning',
      'not_applicable'
    ]).notNullable().defaultTo('pending');

    table.decimal('compliance_score', 5, 2).nullable(); // 0.00 to 100.00
    table.integer('issues_found').notNullable().defaultTo(0);
    table.integer('issues_resolved').notNullable().defaultTo(0);

    // Timing
    table.timestamp('checked_at').nullable();
    table.timestamp('next_check_due').nullable();
    table.uuid('checked_by').nullable().references('id').inTable('users').onDelete('SET NULL');

    // Automated vs manual
    table.boolean('is_automated').notNullable().defaultTo(true);

    // Metadata
    table.jsonb('check_results').nullable(); // Detailed results from the check
    table.jsonb('metadata').nullable();

    // Timestamps
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Ensure at least one content reference
    table.check('(lesson_id IS NOT NULL OR resource_id IS NOT NULL OR content_file_id IS NOT NULL)');

    // Indexes
    table.index('lesson_id');
    table.index('resource_id');
    table.index('content_file_id');
    table.index('check_type');
    table.index('status');
    table.index('wcag_level');
    table.index('checked_at');
    table.index('next_check_due');
  });

  // Create accessibility_issues table
  // Tracks specific accessibility issues found in content
  await knex.schema.createTable('accessibility_issues', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Reference to the check that found this issue
    table.uuid('check_id').notNullable().references('id').inTable('content_accessibility_checks').onDelete('CASCADE');

    // Issue details
    table.enum('severity', ['critical', 'serious', 'moderate', 'minor']).notNullable();

    // WCAG criterion
    table.string('wcag_criterion', 20).notNullable(); // e.g., '1.1.1', '1.4.3'
    table.string('wcag_criterion_name', 255).notNullable(); // e.g., 'Non-text Content', 'Contrast (Minimum)'

    // Issue description
    table.string('issue_code', 100).notNullable(); // Machine-readable code
    table.text('description').notNullable();
    table.text('impact').notNullable(); // How this affects users

    // Location in content
    table.text('element_selector').nullable(); // CSS selector or XPath
    table.text('element_html').nullable(); // Snippet of the problematic HTML
    table.integer('line_number').nullable();
    table.integer('column_number').nullable();

    // Remediation
    table.text('recommendation').notNullable();
    table.text('fix_example').nullable(); // Example of corrected code
    table.string('help_url', 500).nullable(); // Link to documentation

    // Status tracking
    table.enum('status', [
      'open',
      'in_progress',
      'resolved',
      'wont_fix',
      'false_positive'
    ]).notNullable().defaultTo('open');

    table.uuid('assigned_to').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.uuid('resolved_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('resolved_at').nullable();
    table.text('resolution_notes').nullable();

    // Metadata
    table.jsonb('metadata').nullable();

    // Timestamps
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index('check_id');
    table.index('severity');
    table.index('wcag_criterion');
    table.index('status');
    table.index('assigned_to');
    table.index('created_at');
  });

  // Create accessibility_alt_text table
  // Stores alt text for images with history and AI suggestions
  await knex.schema.createTable('accessibility_alt_text', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Content references
    table.uuid('content_file_id').nullable().references('id').inTable('content_files').onDelete('CASCADE');
    table.uuid('resource_id').nullable().references('id').inTable('curriculum_resources').onDelete('CASCADE');

    // Alt text details
    table.text('alt_text').notNullable();
    table.text('long_description').nullable(); // Extended description for complex images
    table.boolean('is_decorative').notNullable().defaultTo(false);

    // Source
    table.enum('source', [
      'manual',
      'ai_generated',
      'imported',
      'auto_detected'
    ]).notNullable().defaultTo('manual');

    table.decimal('confidence_score', 5, 2).nullable(); // For AI-generated alt text

    // Approval
    table.boolean('is_approved').notNullable().defaultTo(false);
    table.uuid('approved_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('approved_at').nullable();

    // Quality
    table.boolean('is_descriptive').notNullable().defaultTo(true); // Passes quality check
    table.integer('character_count').notNullable();
    table.boolean('contains_redundant_words').notNullable().defaultTo(false); // "image of", "picture of"

    // Language
    table.string('language', 10).notNullable().defaultTo('en');

    // Versioning
    table.integer('version').notNullable().defaultTo(1);
    table.uuid('previous_version_id').nullable().references('id').inTable('accessibility_alt_text').onDelete('SET NULL');

    // Author
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.uuid('updated_by').nullable().references('id').inTable('users').onDelete('SET NULL');

    // Timestamps
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Ensure at least one content reference
    table.check('(content_file_id IS NOT NULL OR resource_id IS NOT NULL)');

    // Indexes
    table.index('content_file_id');
    table.index('resource_id');
    table.index('is_approved');
    table.index('source');
    table.index('language');
  });

  // Create accessibility_captions table
  // Stores video captions and subtitles
  await knex.schema.createTable('accessibility_captions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Content references
    table.uuid('content_file_id').nullable().references('id').inTable('content_files').onDelete('CASCADE');
    table.uuid('resource_id').nullable().references('id').inTable('curriculum_resources').onDelete('CASCADE');

    // Caption details
    table.string('language', 10).notNullable().defaultTo('en');
    table.string('language_name', 100).notNullable().defaultTo('English');

    table.enum('caption_type', [
      'subtitles',     // Dialogue only
      'captions',      // Includes sound effects, speaker identification
      'descriptions',  // Audio descriptions for blind users
      'chapters'       // Chapter markers
    ]).notNullable().defaultTo('captions');

    // Format
    table.enum('format', [
      'vtt',
      'srt',
      'sbv',
      'ass',
      'ttml'
    ]).notNullable().defaultTo('vtt');

    // Content - either inline or URL
    table.text('content').nullable(); // Inline caption content
    table.string('file_url', 500).nullable(); // URL to caption file

    // Quality metrics
    table.integer('word_count').notNullable().defaultTo(0);
    table.integer('cue_count').notNullable().defaultTo(0); // Number of caption cues
    table.integer('duration_ms').notNullable().defaultTo(0);
    table.decimal('accuracy_score', 5, 2).nullable(); // For auto-generated
    table.boolean('includes_speaker_identification').notNullable().defaultTo(false);
    table.boolean('includes_sound_effects').notNullable().defaultTo(false);

    // Source
    table.enum('source', [
      'manual',
      'auto_generated',
      'professional',
      'community',
      'imported'
    ]).notNullable().defaultTo('manual');

    // Approval
    table.boolean('is_approved').notNullable().defaultTo(false);
    table.uuid('approved_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('approved_at').nullable();

    // Sync status
    table.boolean('is_synced').notNullable().defaultTo(true); // Properly timed

    // Author
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.uuid('updated_by').nullable().references('id').inTable('users').onDelete('SET NULL');

    // Timestamps
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Ensure at least one content reference
    table.check('(content_file_id IS NOT NULL OR resource_id IS NOT NULL)');

    // Indexes
    table.index('content_file_id');
    table.index('resource_id');
    table.index('language');
    table.index('caption_type');
    table.index('is_approved');
    table.index('source');

    // Unique constraint per content/language/type
    table.unique(['content_file_id', 'language', 'caption_type']);
  });

  // Create accessibility_transcripts table
  // Stores audio/video transcripts
  await knex.schema.createTable('accessibility_transcripts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Content references
    table.uuid('content_file_id').nullable().references('id').inTable('content_files').onDelete('CASCADE');
    table.uuid('resource_id').nullable().references('id').inTable('curriculum_resources').onDelete('CASCADE');
    table.uuid('lesson_id').nullable().references('id').inTable('curriculum_lessons').onDelete('CASCADE');

    // Transcript details
    table.string('language', 10).notNullable().defaultTo('en');
    table.string('language_name', 100).notNullable().defaultTo('English');

    table.enum('transcript_type', [
      'basic',          // Plain text transcript
      'timestamped',    // With timestamps
      'interactive',    // Clickable timestamps
      'descriptive'     // Includes descriptions of visuals
    ]).notNullable().defaultTo('basic');

    // Content
    table.text('content').notNullable(); // The actual transcript text
    table.jsonb('segments').nullable(); // Timestamped segments for interactive transcripts

    // Quality metrics
    table.integer('word_count').notNullable().defaultTo(0);
    table.integer('duration_ms').notNullable().defaultTo(0);
    table.decimal('accuracy_score', 5, 2).nullable(); // For auto-generated
    table.boolean('includes_speaker_labels').notNullable().defaultTo(false);
    table.boolean('includes_timestamps').notNullable().defaultTo(false);
    table.boolean('includes_visual_descriptions').notNullable().defaultTo(false);

    // Source
    table.enum('source', [
      'manual',
      'auto_generated',
      'professional',
      'community',
      'imported'
    ]).notNullable().defaultTo('manual');

    // Approval
    table.boolean('is_approved').notNullable().defaultTo(false);
    table.uuid('approved_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('approved_at').nullable();

    // Author
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.uuid('updated_by').nullable().references('id').inTable('users').onDelete('SET NULL');

    // Timestamps
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Ensure at least one content reference
    table.check('(content_file_id IS NOT NULL OR resource_id IS NOT NULL OR lesson_id IS NOT NULL)');

    // Indexes
    table.index('content_file_id');
    table.index('resource_id');
    table.index('lesson_id');
    table.index('language');
    table.index('transcript_type');
    table.index('is_approved');
    table.index('source');
  });

  // Create user_accessibility_preferences table
  // Stores individual user accessibility settings
  await knex.schema.createTable('user_accessibility_preferences', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // User reference
    table.uuid('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');

    // Visual preferences
    table.boolean('high_contrast_mode').notNullable().defaultTo(false);
    table.boolean('large_text').notNullable().defaultTo(false);
    table.decimal('text_scale_factor', 3, 2).notNullable().defaultTo(1.00); // 1.0 = 100%, 2.0 = 200%
    table.boolean('dyslexia_friendly_font').notNullable().defaultTo(false);
    table.boolean('reduce_motion').notNullable().defaultTo(false);
    table.boolean('reduce_transparency').notNullable().defaultTo(false);

    // Color preferences
    table.string('color_scheme', 50).notNullable().defaultTo('default'); // default, dark, light, high-contrast
    table.boolean('invert_colors').notNullable().defaultTo(false);
    table.boolean('grayscale').notNullable().defaultTo(false);
    table.jsonb('custom_colors').nullable(); // Custom color overrides

    // Audio/Media preferences
    table.boolean('captions_enabled').notNullable().defaultTo(false);
    table.boolean('audio_descriptions_enabled').notNullable().defaultTo(false);
    table.boolean('auto_play_media').notNullable().defaultTo(false);
    table.string('caption_language', 10).notNullable().defaultTo('en');
    table.jsonb('caption_style').nullable(); // Font size, color, background

    // Navigation preferences
    table.boolean('keyboard_navigation').notNullable().defaultTo(false);
    table.boolean('skip_links_enabled').notNullable().defaultTo(true);
    table.boolean('focus_indicators_enhanced').notNullable().defaultTo(false);
    table.boolean('link_underlines').notNullable().defaultTo(true);

    // Screen reader preferences
    table.boolean('screen_reader_optimized').notNullable().defaultTo(false);
    table.boolean('announce_images').notNullable().defaultTo(true);
    table.boolean('announce_links').notNullable().defaultTo(true);
    table.string('aria_live_politeness', 20).notNullable().defaultTo('polite'); // polite, assertive, off

    // Cognitive preferences
    table.boolean('simplified_layout').notNullable().defaultTo(false);
    table.boolean('reading_guide').notNullable().defaultTo(false);
    table.boolean('text_to_speech').notNullable().defaultTo(false);
    table.decimal('reading_speed', 4, 2).notNullable().defaultTo(1.00); // Speed multiplier

    // Input preferences
    table.integer('click_delay_ms').notNullable().defaultTo(0); // Delay before click registers
    table.boolean('sticky_keys').notNullable().defaultTo(false);
    table.boolean('bounce_keys').notNullable().defaultTo(false);

    // Timestamps
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Index
    table.index('user_id');
  });

  // Create accessibility_audit_logs table
  // Tracks all accessibility-related actions for compliance auditing
  await knex.schema.createTable('accessibility_audit_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Actor
    table.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.string('actor_type', 50).notNullable().defaultTo('user'); // user, system, automated

    // Action
    table.enum('action', [
      'check_performed',
      'issue_created',
      'issue_resolved',
      'issue_assigned',
      'alt_text_added',
      'alt_text_updated',
      'caption_added',
      'caption_updated',
      'transcript_added',
      'transcript_updated',
      'preference_updated',
      'audit_completed',
      'remediation_started',
      'remediation_completed',
      'compliance_report_generated'
    ]).notNullable();

    // Target
    table.string('target_type', 50).notNullable(); // lesson, resource, content_file, etc.
    table.uuid('target_id').notNullable();

    // Details
    table.jsonb('details').nullable(); // Action-specific details
    table.jsonb('before_state').nullable(); // State before action
    table.jsonb('after_state').nullable(); // State after action

    // Context
    table.string('ip_address', 45).nullable();
    table.string('user_agent', 500).nullable();

    // Timestamp
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('action');
    table.index('target_type');
    table.index('target_id');
    table.index('created_at');
    table.index(['target_type', 'target_id']);
  });

  // Create color_contrast_checks table
  // Stores color contrast validation results
  await knex.schema.createTable('color_contrast_checks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Reference to the accessibility check
    table.uuid('check_id').notNullable().references('id').inTable('content_accessibility_checks').onDelete('CASCADE');

    // Color pair being checked
    table.string('foreground_color', 9).notNullable(); // Hex color #RRGGBB or #RRGGBBAA
    table.string('background_color', 9).notNullable();

    // Contrast ratio
    table.decimal('contrast_ratio', 6, 3).notNullable(); // e.g., 4.500

    // WCAG compliance
    table.boolean('passes_aa_normal').notNullable(); // 4.5:1 for normal text
    table.boolean('passes_aa_large').notNullable(); // 3:1 for large text
    table.boolean('passes_aaa_normal').notNullable(); // 7:1 for normal text
    table.boolean('passes_aaa_large').notNullable(); // 4.5:1 for large text

    // Context
    table.text('element_selector').nullable();
    table.string('element_type', 50).nullable(); // text, button, link, etc.
    table.boolean('is_large_text').notNullable().defaultTo(false);
    table.integer('font_size_px').nullable();
    table.boolean('is_bold').notNullable().defaultTo(false);

    // Suggested fix
    table.string('suggested_foreground', 9).nullable();
    table.string('suggested_background', 9).nullable();
    table.decimal('suggested_ratio', 6, 3).nullable();

    // Timestamp
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index('check_id');
    table.index('passes_aa_normal');
    table.index('passes_aaa_normal');
    table.index('contrast_ratio');
  });

  // Create triggers for updated_at
  await knex.raw(`
    CREATE TRIGGER update_content_accessibility_checks_updated_at
      BEFORE UPDATE ON content_accessibility_checks
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_accessibility_issues_updated_at
      BEFORE UPDATE ON accessibility_issues
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_accessibility_alt_text_updated_at
      BEFORE UPDATE ON accessibility_alt_text
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_accessibility_captions_updated_at
      BEFORE UPDATE ON accessibility_captions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_accessibility_transcripts_updated_at
      BEFORE UPDATE ON accessibility_transcripts
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_user_accessibility_preferences_updated_at
      BEFORE UPDATE ON user_accessibility_preferences
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop triggers
  await knex.raw(`
    DROP TRIGGER IF EXISTS update_content_accessibility_checks_updated_at ON content_accessibility_checks;
    DROP TRIGGER IF EXISTS update_accessibility_issues_updated_at ON accessibility_issues;
    DROP TRIGGER IF EXISTS update_accessibility_alt_text_updated_at ON accessibility_alt_text;
    DROP TRIGGER IF EXISTS update_accessibility_captions_updated_at ON accessibility_captions;
    DROP TRIGGER IF EXISTS update_accessibility_transcripts_updated_at ON accessibility_transcripts;
    DROP TRIGGER IF EXISTS update_user_accessibility_preferences_updated_at ON user_accessibility_preferences;
  `);

  // Drop tables in reverse dependency order
  await knex.schema.dropTableIfExists('color_contrast_checks');
  await knex.schema.dropTableIfExists('accessibility_audit_logs');
  await knex.schema.dropTableIfExists('user_accessibility_preferences');
  await knex.schema.dropTableIfExists('accessibility_transcripts');
  await knex.schema.dropTableIfExists('accessibility_captions');
  await knex.schema.dropTableIfExists('accessibility_alt_text');
  await knex.schema.dropTableIfExists('accessibility_issues');
  await knex.schema.dropTableIfExists('content_accessibility_checks');
}
