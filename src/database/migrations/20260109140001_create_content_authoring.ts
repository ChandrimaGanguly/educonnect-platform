import type { Knex } from 'knex';

/**
 * Migration: Create content authoring tables
 *
 * This migration creates the infrastructure for content authoring tools:
 * - Content drafts for lesson editing
 * - Content blocks for structured WYSIWYG editing
 * - Media embeddings within content
 * - Assessment questions and options
 * - Learning objectives taxonomy and tagging
 * - Content versions for revision history
 * - Accessibility checks and reports
 */

export async function up(knex: Knex): Promise<void> {
  // Create content_drafts table for in-progress content editing
  await knex.schema.createTable('content_drafts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Content type and reference
    table.enum('content_type', ['lesson', 'module', 'course', 'resource']).notNullable();
    table.uuid('content_id').nullable(); // Reference to existing content (null for new)
    table.uuid('community_id').notNullable().references('id').inTable('communities').onDelete('CASCADE');

    // Draft metadata
    table.string('title', 255).notNullable();
    table.text('description').nullable();
    table.string('slug', 100).nullable();

    // Editor content (JSON structure for WYSIWYG)
    table.jsonb('content_blocks').notNullable().defaultTo('[]');
    table.text('raw_content').nullable(); // Plain text/markdown fallback
    table.enum('content_format', ['blocks', 'markdown', 'html']).defaultTo('blocks');

    // Draft state
    table.enum('status', ['editing', 'ready_for_review', 'approved', 'rejected', 'published']).defaultTo('editing');
    table.boolean('is_auto_saved').defaultTo(false);
    table.timestamp('last_edited_at').defaultTo(knex.fn.now());

    // Version tracking
    table.integer('version').defaultTo(1);
    table.uuid('parent_version_id').nullable().references('id').inTable('content_drafts').onDelete('SET NULL');

    // Validation state
    table.boolean('accessibility_checked').defaultTo(false);
    table.decimal('accessibility_score', 5, 2).nullable();
    table.jsonb('accessibility_issues').defaultTo('[]');
    table.boolean('content_validated').defaultTo(false);
    table.jsonb('validation_errors').defaultTo('[]');

    // Estimated metrics
    table.integer('estimated_minutes').nullable();
    table.integer('estimated_bandwidth_kb').nullable();
    table.integer('word_count').defaultTo(0);

    // Ownership
    table.uuid('author_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('last_edited_by').nullable().references('id').inTable('users').onDelete('SET NULL');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('content_type');
    table.index('content_id');
    table.index('community_id');
    table.index('author_id');
    table.index('status');
    table.index('created_at');
    table.index('updated_at');
  });

  // Create content_blocks table for structured content elements
  await knex.schema.createTable('content_blocks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Parent reference
    table.uuid('draft_id').notNullable().references('id').inTable('content_drafts').onDelete('CASCADE');

    // Block type and content
    table.enum('block_type', [
      'paragraph',
      'heading',
      'list',
      'code',
      'quote',
      'image',
      'video',
      'audio',
      'embed',
      'callout',
      'divider',
      'table',
      'interactive',
      'assessment'
    ]).notNullable();

    // Block content
    table.jsonb('content').notNullable().defaultTo('{}');
    table.text('plain_text').nullable(); // For search indexing

    // Styling and attributes
    table.jsonb('attributes').defaultTo('{}'); // Classes, styles, etc.
    table.jsonb('metadata').defaultTo('{}');

    // Ordering
    table.integer('order_index').notNullable();
    table.uuid('parent_block_id').nullable().references('id').inTable('content_blocks').onDelete('CASCADE');

    // Accessibility
    table.boolean('has_accessibility_issues').defaultTo(false);
    table.jsonb('accessibility_notes').defaultTo('[]');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('draft_id');
    table.index('block_type');
    table.index('order_index');
    table.index('parent_block_id');
  });

  // Create content_media_embeds table for media references within content
  await knex.schema.createTable('content_media_embeds', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // References
    table.uuid('draft_id').notNullable().references('id').inTable('content_drafts').onDelete('CASCADE');
    table.uuid('block_id').nullable().references('id').inTable('content_blocks').onDelete('CASCADE');
    table.uuid('file_id').nullable().references('id').inTable('content_files').onDelete('SET NULL');

    // Media details
    table.enum('media_type', ['image', 'video', 'audio', 'document', 'embed', 'interactive']).notNullable();
    table.string('external_url', 1000).nullable(); // For external embeds
    table.string('embed_code', 2000).nullable(); // For iframe/widget embeds

    // Display settings
    table.jsonb('display_settings').defaultTo('{}'); // Width, height, alignment, etc.
    table.enum('alignment', ['left', 'center', 'right', 'full']).defaultTo('center');
    table.boolean('is_inline').defaultTo(false);

    // Accessibility requirements
    table.string('alt_text', 500).nullable();
    table.text('caption').nullable();
    table.text('transcript').nullable();
    table.boolean('has_captions').defaultTo(false);
    table.string('caption_file_url', 500).nullable();

    // Fallback content for low bandwidth
    table.text('text_fallback').nullable();
    table.uuid('thumbnail_file_id').nullable().references('id').inTable('content_files').onDelete('SET NULL');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('draft_id');
    table.index('block_id');
    table.index('file_id');
    table.index('media_type');
  });

  // Create learning_objectives table
  await knex.schema.createTable('learning_objectives', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Hierarchy
    table.uuid('parent_id').nullable().references('id').inTable('learning_objectives').onDelete('SET NULL');
    table.uuid('community_id').nullable().references('id').inTable('communities').onDelete('CASCADE');

    // Objective details
    table.string('code', 50).notNullable(); // e.g., "LO-1.1.1"
    table.string('title', 255).notNullable();
    table.text('description').notNullable();

    // Bloom's taxonomy level
    table.enum('cognitive_level', [
      'remember',
      'understand',
      'apply',
      'analyze',
      'evaluate',
      'create'
    ]).notNullable();

    // Classification
    table.enum('objective_type', ['knowledge', 'skill', 'attitude', 'competency']).defaultTo('knowledge');
    table.enum('status', ['draft', 'active', 'deprecated']).defaultTo('active');

    // Organization
    table.integer('display_order').defaultTo(0);
    table.specificType('tags', 'varchar(50)[]').defaultTo('{}');

    // Measurability
    table.boolean('is_measurable').defaultTo(true);
    table.jsonb('assessment_criteria').defaultTo('[]');

    // Metadata
    table.jsonb('metadata').defaultTo('{}');

    // Timestamps
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.unique(['community_id', 'code']);
    table.index('parent_id');
    table.index('community_id');
    table.index('cognitive_level');
    table.index('objective_type');
    table.index('status');
  });

  // Create content_objectives table (many-to-many relationship)
  await knex.schema.createTable('content_objectives', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // References - can link to lessons, modules, or courses
    table.uuid('lesson_id').nullable().references('id').inTable('curriculum_lessons').onDelete('CASCADE');
    table.uuid('module_id').nullable().references('id').inTable('curriculum_modules').onDelete('CASCADE');
    table.uuid('course_id').nullable().references('id').inTable('curriculum_courses').onDelete('CASCADE');
    table.uuid('draft_id').nullable().references('id').inTable('content_drafts').onDelete('CASCADE');
    table.uuid('objective_id').notNullable().references('id').inTable('learning_objectives').onDelete('CASCADE');

    // Relationship details
    table.boolean('is_primary').defaultTo(false);
    table.integer('display_order').defaultTo(0);

    // Timestamps
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('lesson_id');
    table.index('module_id');
    table.index('course_id');
    table.index('draft_id');
    table.index('objective_id');

    // Ensure at least one content reference
    table.check('(lesson_id IS NOT NULL OR module_id IS NOT NULL OR course_id IS NOT NULL OR draft_id IS NOT NULL)');
  });

  // Create assessment_questions table
  await knex.schema.createTable('assessment_questions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Parent reference
    table.uuid('draft_id').nullable().references('id').inTable('content_drafts').onDelete('CASCADE');
    table.uuid('lesson_id').nullable().references('id').inTable('curriculum_lessons').onDelete('CASCADE');
    table.uuid('community_id').notNullable().references('id').inTable('communities').onDelete('CASCADE');

    // Question content
    table.enum('question_type', [
      'multiple_choice',
      'multiple_select',
      'true_false',
      'short_answer',
      'long_answer',
      'fill_blank',
      'matching',
      'ordering',
      'code',
      'file_upload'
    ]).notNullable();

    table.text('question_text').notNullable();
    table.jsonb('question_content').defaultTo('{}'); // Rich content with formatting
    table.text('question_html').nullable(); // Rendered HTML

    // Media attachments
    table.uuid('media_file_id').nullable().references('id').inTable('content_files').onDelete('SET NULL');
    table.jsonb('media_embeds').defaultTo('[]');

    // Scoring
    table.decimal('points', 8, 2).notNullable().defaultTo(1);
    table.boolean('partial_credit_allowed').defaultTo(false);
    table.jsonb('scoring_rubric').defaultTo('{}');

    // Difficulty and time
    table.enum('difficulty', ['easy', 'medium', 'hard', 'expert']).defaultTo('medium');
    table.integer('estimated_seconds').nullable();

    // Hints and feedback
    table.specificType('hints', 'text[]').defaultTo('{}');
    table.text('explanation').nullable();
    table.text('correct_feedback').nullable();
    table.text('incorrect_feedback').nullable();

    // Organization
    table.integer('display_order').defaultTo(0);
    table.enum('status', ['draft', 'active', 'archived']).defaultTo('draft');
    table.boolean('is_required').defaultTo(true);
    table.boolean('shuffle_options').defaultTo(true);

    // Learning objective mapping
    table.specificType('objective_ids', 'uuid[]').defaultTo('{}');

    // Tags and metadata
    table.specificType('tags', 'varchar(50)[]').defaultTo('{}');
    table.jsonb('metadata').defaultTo('{}');

    // Accessibility
    table.boolean('accessibility_checked').defaultTo(false);
    table.jsonb('accessibility_issues').defaultTo('[]');

    // Timestamps
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.uuid('updated_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('draft_id');
    table.index('lesson_id');
    table.index('community_id');
    table.index('question_type');
    table.index('difficulty');
    table.index('status');
    table.index('display_order');
  });

  // Create assessment_options table for question choices
  await knex.schema.createTable('assessment_options', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Parent question
    table.uuid('question_id').notNullable().references('id').inTable('assessment_questions').onDelete('CASCADE');

    // Option content
    table.text('option_text').notNullable();
    table.jsonb('option_content').defaultTo('{}'); // Rich content
    table.text('option_html').nullable();

    // Correctness
    table.boolean('is_correct').defaultTo(false);
    table.decimal('partial_credit', 5, 2).nullable(); // 0-1 for partial credit

    // Ordering and matching
    table.integer('display_order').notNullable();
    table.string('match_key', 100).nullable(); // For matching questions
    table.integer('correct_position').nullable(); // For ordering questions

    // Feedback
    table.text('feedback').nullable();

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('question_id');
    table.index('is_correct');
    table.index('display_order');
  });

  // Create content_versions table for revision history
  await knex.schema.createTable('content_versions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Content reference
    table.uuid('lesson_id').nullable().references('id').inTable('curriculum_lessons').onDelete('CASCADE');
    table.uuid('module_id').nullable().references('id').inTable('curriculum_modules').onDelete('CASCADE');
    table.uuid('course_id').nullable().references('id').inTable('curriculum_courses').onDelete('CASCADE');

    // Version details
    table.integer('version_number').notNullable();
    table.string('version_label', 100).nullable(); // e.g., "1.0.0", "Draft", "Review"
    table.text('change_summary').nullable();
    table.jsonb('changes').defaultTo('[]'); // List of changes from previous version

    // Snapshot of content
    table.jsonb('content_snapshot').notNullable();
    table.jsonb('blocks_snapshot').nullable();
    table.jsonb('metadata_snapshot').nullable();

    // Status
    table.enum('status', ['draft', 'published', 'archived']).defaultTo('draft');
    table.boolean('is_current').defaultTo(false);

    // Authorship
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.uuid('published_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('published_at').nullable();

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('lesson_id');
    table.index('module_id');
    table.index('course_id');
    table.index('version_number');
    table.index('status');
    table.index('is_current');

    // Ensure at least one content reference
    table.check('(lesson_id IS NOT NULL OR module_id IS NOT NULL OR course_id IS NOT NULL)');
  });

  // Create accessibility_checks table
  await knex.schema.createTable('accessibility_checks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Content reference
    table.uuid('draft_id').nullable().references('id').inTable('content_drafts').onDelete('CASCADE');
    table.uuid('lesson_id').nullable().references('id').inTable('curriculum_lessons').onDelete('CASCADE');

    // Check results
    table.decimal('overall_score', 5, 2).notNullable(); // 0-100
    table.enum('compliance_level', ['none', 'A', 'AA', 'AAA']).defaultTo('none');
    table.boolean('passed').defaultTo(false);

    // Issues breakdown
    table.integer('critical_issues').defaultTo(0);
    table.integer('major_issues').defaultTo(0);
    table.integer('minor_issues').defaultTo(0);
    table.jsonb('issues').notNullable().defaultTo('[]');

    // Category scores
    table.jsonb('category_scores').defaultTo('{}');

    // Recommendations
    table.jsonb('recommendations').defaultTo('[]');

    // Metadata
    table.string('checker_version', 20).notNullable();
    table.jsonb('check_options').defaultTo('{}');

    // Timestamps
    table.uuid('checked_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('checked_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('draft_id');
    table.index('lesson_id');
    table.index('overall_score');
    table.index('compliance_level');
    table.index('passed');
    table.index('checked_at');
  });

  // Create content_previews table for preview/testing
  await knex.schema.createTable('content_previews', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Content reference
    table.uuid('draft_id').notNullable().references('id').inTable('content_drafts').onDelete('CASCADE');

    // Preview settings
    table.string('preview_token', 64).notNullable().unique();
    table.enum('preview_mode', ['desktop', 'tablet', 'mobile', 'text_only', 'low_bandwidth']).defaultTo('desktop');
    table.boolean('is_active').defaultTo(true);

    // Access control
    table.boolean('require_auth').defaultTo(false);
    table.specificType('allowed_user_ids', 'uuid[]').defaultTo('{}');

    // Expiration
    table.timestamp('expires_at').notNullable();

    // Usage tracking
    table.integer('view_count').defaultTo(0);
    table.timestamp('last_viewed_at').nullable();

    // Timestamps
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('draft_id');
    table.index('preview_token');
    table.index('is_active');
    table.index('expires_at');
  });

  // Create contributor_profiles table for tracking content creator credentials
  await knex.schema.createTable('contributor_profiles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    table.uuid('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('community_id').notNullable().references('id').inTable('communities').onDelete('CASCADE');

    // Contributor status
    table.enum('status', ['pending', 'approved', 'suspended', 'revoked']).defaultTo('pending');
    table.timestamp('approved_at').nullable();
    table.uuid('approved_by').nullable().references('id').inTable('users').onDelete('SET NULL');

    // Training and credentials
    table.boolean('training_completed').defaultTo(false);
    table.timestamp('training_completed_at').nullable();
    table.jsonb('credentials').defaultTo('{}');
    table.text('expertise_areas').nullable();

    // Mentorship
    table.uuid('mentor_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.boolean('mentorship_active').defaultTo(false);

    // Contribution scope
    table.enum('contribution_level', ['limited', 'standard', 'advanced', 'expert']).defaultTo('limited');
    table.specificType('allowed_content_types', 'varchar(50)[]').defaultTo('{}');
    table.integer('max_pending_drafts').defaultTo(5);

    // Quality metrics
    table.decimal('quality_score', 5, 2).nullable(); // 0-100
    table.integer('total_contributions').defaultTo(0);
    table.integer('approved_contributions').defaultTo(0);
    table.integer('rejected_contributions').defaultTo(0);

    // Metadata
    table.jsonb('metadata').defaultTo('{}');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('community_id');
    table.index('status');
    table.index('contribution_level');
    table.index('quality_score');
  });

  // Create triggers for updated_at
  await knex.raw(`
    CREATE TRIGGER update_content_drafts_updated_at
      BEFORE UPDATE ON content_drafts
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_content_blocks_updated_at
      BEFORE UPDATE ON content_blocks
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_content_media_embeds_updated_at
      BEFORE UPDATE ON content_media_embeds
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_learning_objectives_updated_at
      BEFORE UPDATE ON learning_objectives
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_assessment_questions_updated_at
      BEFORE UPDATE ON assessment_questions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_assessment_options_updated_at
      BEFORE UPDATE ON assessment_options
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_contributor_profiles_updated_at
      BEFORE UPDATE ON contributor_profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);

  // Create full-text search indexes
  await knex.raw(`
    CREATE INDEX content_drafts_search_idx ON content_drafts
    USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

    CREATE INDEX learning_objectives_search_idx ON learning_objectives
    USING gin(to_tsvector('english', title || ' ' || description));

    CREATE INDEX assessment_questions_search_idx ON assessment_questions
    USING gin(to_tsvector('english', question_text));
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop triggers
  await knex.raw(`
    DROP TRIGGER IF EXISTS update_content_drafts_updated_at ON content_drafts;
    DROP TRIGGER IF EXISTS update_content_blocks_updated_at ON content_blocks;
    DROP TRIGGER IF EXISTS update_content_media_embeds_updated_at ON content_media_embeds;
    DROP TRIGGER IF EXISTS update_learning_objectives_updated_at ON learning_objectives;
    DROP TRIGGER IF EXISTS update_assessment_questions_updated_at ON assessment_questions;
    DROP TRIGGER IF EXISTS update_assessment_options_updated_at ON assessment_options;
    DROP TRIGGER IF EXISTS update_contributor_profiles_updated_at ON contributor_profiles;
  `);

  // Drop tables in reverse dependency order
  await knex.schema.dropTableIfExists('contributor_profiles');
  await knex.schema.dropTableIfExists('content_previews');
  await knex.schema.dropTableIfExists('accessibility_checks');
  await knex.schema.dropTableIfExists('content_versions');
  await knex.schema.dropTableIfExists('assessment_options');
  await knex.schema.dropTableIfExists('assessment_questions');
  await knex.schema.dropTableIfExists('content_objectives');
  await knex.schema.dropTableIfExists('learning_objectives');
  await knex.schema.dropTableIfExists('content_media_embeds');
  await knex.schema.dropTableIfExists('content_blocks');
  await knex.schema.dropTableIfExists('content_drafts');
}
