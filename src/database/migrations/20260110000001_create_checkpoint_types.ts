import type { Knex } from 'knex';

/**
 * Checkpoint Types Migration
 *
 * Creates database tables for the checkpoint system including:
 * - Checkpoint types (knowledge, practical, oral)
 * - Checkpoint templates (reusable checkpoint configurations)
 * - Checkpoints (individual checkpoint instances)
 * - Checkpoint questions (questions within checkpoints)
 * - Checkpoint accessibility accommodations
 * - Checkpoint format preferences
 */

export async function up(knex: Knex): Promise<void> {
  // Create checkpoint categories/types lookup table
  await knex.schema.createTable('checkpoint_categories', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('code', 50).notNullable().unique();
    table.string('name', 100).notNullable();
    table.text('description');
    table.boolean('is_active').defaultTo(true);
    table.integer('display_order').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Seed checkpoint categories
  await knex('checkpoint_categories').insert([
    {
      code: 'knowledge',
      name: 'Knowledge Assessment',
      description: 'Assessments that evaluate understanding of concepts and theoretical knowledge',
      display_order: 1,
    },
    {
      code: 'practical',
      name: 'Practical Skills',
      description: 'Assessments that evaluate hands-on abilities and practical application',
      display_order: 2,
    },
    {
      code: 'oral',
      name: 'Oral Assessment',
      description: 'Voice-based assessments for learners with limited literacy or visual impairments',
      display_order: 3,
    },
  ]);

  // Create checkpoint format types lookup table
  await knex.schema.createTable('checkpoint_format_types', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('category_id').notNullable()
      .references('id').inTable('checkpoint_categories').onDelete('CASCADE');
    table.string('code', 50).notNullable();
    table.string('name', 100).notNullable();
    table.text('description');

    // Format characteristics
    table.boolean('supports_auto_scoring').defaultTo(false);
    table.boolean('requires_manual_review').defaultTo(false);
    table.boolean('supports_partial_credit').defaultTo(false);
    table.boolean('supports_offline').defaultTo(true);
    table.boolean('supports_time_limit').defaultTo(true);
    table.boolean('is_accessible').defaultTo(true);

    // Configuration schema (JSON Schema for format-specific settings)
    table.json('config_schema');

    // Scoring configuration
    table.enum('scoring_method', ['auto', 'manual', 'ai_assisted', 'peer', 'hybrid']).defaultTo('auto');
    table.integer('default_points').defaultTo(1);

    table.boolean('is_active').defaultTo(true);
    table.integer('display_order').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Unique constraint on category + code
    table.unique(['category_id', 'code']);
  });

  // Seed knowledge assessment formats
  const [knowledgeCategory] = await knex('checkpoint_categories').where({ code: 'knowledge' }).select('id');
  const [practicalCategory] = await knex('checkpoint_categories').where({ code: 'practical' }).select('id');
  const [oralCategory] = await knex('checkpoint_categories').where({ code: 'oral' }).select('id');

  await knex('checkpoint_format_types').insert([
    // Knowledge Assessment Formats
    {
      category_id: knowledgeCategory.id,
      code: 'multiple_choice',
      name: 'Multiple Choice Questions',
      description: 'Select the correct answer from multiple options',
      supports_auto_scoring: true,
      requires_manual_review: false,
      supports_partial_credit: false,
      supports_offline: true,
      supports_time_limit: true,
      is_accessible: true,
      scoring_method: 'auto',
      default_points: 1,
      display_order: 1,
      config_schema: JSON.stringify({
        type: 'object',
        properties: {
          shuffle_options: { type: 'boolean', default: true },
          show_correct_after: { type: 'boolean', default: true },
          max_options: { type: 'integer', default: 6, minimum: 2 },
        },
      }),
    },
    {
      category_id: knowledgeCategory.id,
      code: 'true_false',
      name: 'True/False Questions',
      description: 'Determine if a statement is true or false',
      supports_auto_scoring: true,
      requires_manual_review: false,
      supports_partial_credit: false,
      supports_offline: true,
      supports_time_limit: true,
      is_accessible: true,
      scoring_method: 'auto',
      default_points: 1,
      display_order: 2,
      config_schema: JSON.stringify({
        type: 'object',
        properties: {
          show_correct_after: { type: 'boolean', default: true },
        },
      }),
    },
    {
      category_id: knowledgeCategory.id,
      code: 'fill_blank',
      name: 'Fill in the Blank',
      description: 'Complete sentences or phrases with missing words',
      supports_auto_scoring: true,
      requires_manual_review: false,
      supports_partial_credit: true,
      supports_offline: true,
      supports_time_limit: true,
      is_accessible: true,
      scoring_method: 'auto',
      default_points: 1,
      display_order: 3,
      config_schema: JSON.stringify({
        type: 'object',
        properties: {
          case_sensitive: { type: 'boolean', default: false },
          allow_synonyms: { type: 'boolean', default: true },
          spelling_tolerance: { type: 'number', default: 0.9 },
        },
      }),
    },
    {
      category_id: knowledgeCategory.id,
      code: 'matching',
      name: 'Matching Exercises',
      description: 'Match items from two columns correctly',
      supports_auto_scoring: true,
      requires_manual_review: false,
      supports_partial_credit: true,
      supports_offline: true,
      supports_time_limit: true,
      is_accessible: true,
      scoring_method: 'auto',
      default_points: 2,
      display_order: 4,
      config_schema: JSON.stringify({
        type: 'object',
        properties: {
          shuffle_items: { type: 'boolean', default: true },
          allow_multiple_matches: { type: 'boolean', default: false },
          partial_credit_per_match: { type: 'boolean', default: true },
        },
      }),
    },
    {
      category_id: knowledgeCategory.id,
      code: 'short_answer',
      name: 'Short Answer Responses',
      description: 'Provide brief written responses to questions',
      supports_auto_scoring: true,
      requires_manual_review: false,
      supports_partial_credit: true,
      supports_offline: true,
      supports_time_limit: true,
      is_accessible: true,
      scoring_method: 'ai_assisted',
      default_points: 2,
      display_order: 5,
      config_schema: JSON.stringify({
        type: 'object',
        properties: {
          min_words: { type: 'integer', default: 10 },
          max_words: { type: 'integer', default: 100 },
          keyword_matching: { type: 'boolean', default: true },
          semantic_matching: { type: 'boolean', default: true },
        },
      }),
    },
    {
      category_id: knowledgeCategory.id,
      code: 'essay',
      name: 'Essay Questions',
      description: 'Extended written responses reviewed by mentor or AI',
      supports_auto_scoring: false,
      requires_manual_review: true,
      supports_partial_credit: true,
      supports_offline: true,
      supports_time_limit: true,
      is_accessible: true,
      scoring_method: 'hybrid',
      default_points: 10,
      display_order: 6,
      config_schema: JSON.stringify({
        type: 'object',
        properties: {
          min_words: { type: 'integer', default: 200 },
          max_words: { type: 'integer', default: 2000 },
          rubric_based: { type: 'boolean', default: true },
          ai_pre_screening: { type: 'boolean', default: true },
        },
      }),
    },

    // Practical Skills Formats
    {
      category_id: practicalCategory.id,
      code: 'project_submission',
      name: 'Project Submissions',
      description: 'Submit completed projects with rubric-based evaluation',
      supports_auto_scoring: false,
      requires_manual_review: true,
      supports_partial_credit: true,
      supports_offline: true,
      supports_time_limit: false,
      is_accessible: true,
      scoring_method: 'manual',
      default_points: 20,
      display_order: 1,
      config_schema: JSON.stringify({
        type: 'object',
        properties: {
          allowed_file_types: { type: 'array', items: { type: 'string' }, default: ['pdf', 'doc', 'docx', 'zip'] },
          max_file_size_mb: { type: 'integer', default: 50 },
          require_description: { type: 'boolean', default: true },
          rubric_id: { type: 'string' },
        },
      }),
    },
    {
      category_id: practicalCategory.id,
      code: 'code_submission',
      name: 'Code Submissions',
      description: 'Submit code with automated testing and review',
      supports_auto_scoring: true,
      requires_manual_review: false,
      supports_partial_credit: true,
      supports_offline: false,
      supports_time_limit: true,
      is_accessible: true,
      scoring_method: 'auto',
      default_points: 15,
      display_order: 2,
      config_schema: JSON.stringify({
        type: 'object',
        properties: {
          programming_language: { type: 'string', default: 'python' },
          test_cases: { type: 'array', items: { type: 'object' } },
          time_limit_seconds: { type: 'integer', default: 30 },
          memory_limit_mb: { type: 'integer', default: 256 },
          allow_multiple_files: { type: 'boolean', default: false },
        },
      }),
    },
    {
      category_id: practicalCategory.id,
      code: 'video_demonstration',
      name: 'Video Demonstrations',
      description: 'Record or upload video demonstrating skills',
      supports_auto_scoring: false,
      requires_manual_review: true,
      supports_partial_credit: true,
      supports_offline: true,
      supports_time_limit: false,
      is_accessible: false,
      scoring_method: 'manual',
      default_points: 15,
      display_order: 3,
      config_schema: JSON.stringify({
        type: 'object',
        properties: {
          max_duration_minutes: { type: 'integer', default: 10 },
          allowed_formats: { type: 'array', items: { type: 'string' }, default: ['mp4', 'webm', 'mov'] },
          require_caption: { type: 'boolean', default: true },
          rubric_id: { type: 'string' },
        },
      }),
    },
    {
      category_id: practicalCategory.id,
      code: 'portfolio_artifact',
      name: 'Portfolio Artifacts',
      description: 'Submit work samples for portfolio assessment',
      supports_auto_scoring: false,
      requires_manual_review: true,
      supports_partial_credit: true,
      supports_offline: true,
      supports_time_limit: false,
      is_accessible: true,
      scoring_method: 'manual',
      default_points: 10,
      display_order: 4,
      config_schema: JSON.stringify({
        type: 'object',
        properties: {
          artifact_types: { type: 'array', items: { type: 'string' }, default: ['document', 'image', 'presentation'] },
          require_reflection: { type: 'boolean', default: true },
          max_artifacts: { type: 'integer', default: 5 },
        },
      }),
    },
    {
      category_id: practicalCategory.id,
      code: 'peer_review',
      name: 'Peer Review Assignments',
      description: 'Review and be reviewed by peers',
      supports_auto_scoring: false,
      requires_manual_review: true,
      supports_partial_credit: true,
      supports_offline: false,
      supports_time_limit: false,
      is_accessible: true,
      scoring_method: 'peer',
      default_points: 10,
      display_order: 5,
      config_schema: JSON.stringify({
        type: 'object',
        properties: {
          min_reviews_required: { type: 'integer', default: 2 },
          anonymous_reviews: { type: 'boolean', default: true },
          rubric_based: { type: 'boolean', default: true },
          allow_self_assessment: { type: 'boolean', default: false },
        },
      }),
    },
    {
      category_id: practicalCategory.id,
      code: 'mentor_observation',
      name: 'Mentor Observation Checklists',
      description: 'Evaluated by mentor using observation checklist',
      supports_auto_scoring: false,
      requires_manual_review: true,
      supports_partial_credit: true,
      supports_offline: true,
      supports_time_limit: false,
      is_accessible: true,
      scoring_method: 'manual',
      default_points: 15,
      display_order: 6,
      config_schema: JSON.stringify({
        type: 'object',
        properties: {
          checklist_items: { type: 'array', items: { type: 'object' } },
          require_all_items: { type: 'boolean', default: false },
          allow_partial_observation: { type: 'boolean', default: true },
        },
      }),
    },

    // Oral Assessment Formats
    {
      category_id: oralCategory.id,
      code: 'voice_recorded',
      name: 'Voice-Recorded Responses',
      description: 'Record audio responses to questions',
      supports_auto_scoring: false,
      requires_manual_review: true,
      supports_partial_credit: true,
      supports_offline: true,
      supports_time_limit: true,
      is_accessible: true,
      scoring_method: 'hybrid',
      default_points: 5,
      display_order: 1,
      config_schema: JSON.stringify({
        type: 'object',
        properties: {
          max_recording_minutes: { type: 'integer', default: 5 },
          transcription_enabled: { type: 'boolean', default: true },
          allow_re_record: { type: 'boolean', default: true },
          max_attempts: { type: 'integer', default: 3 },
        },
      }),
    },
    {
      category_id: oralCategory.id,
      code: 'live_oral_exam',
      name: 'Live Oral Examination',
      description: 'Real-time oral examination with mentor',
      supports_auto_scoring: false,
      requires_manual_review: true,
      supports_partial_credit: true,
      supports_offline: false,
      supports_time_limit: true,
      is_accessible: true,
      scoring_method: 'manual',
      default_points: 20,
      display_order: 2,
      config_schema: JSON.stringify({
        type: 'object',
        properties: {
          duration_minutes: { type: 'integer', default: 30 },
          require_scheduling: { type: 'boolean', default: true },
          allow_video: { type: 'boolean', default: true },
          record_session: { type: 'boolean', default: true },
        },
      }),
    },
    {
      category_id: oralCategory.id,
      code: 'audio_question',
      name: 'Audio-Based Questions',
      description: 'Listen to questions and provide responses',
      supports_auto_scoring: false,
      requires_manual_review: true,
      supports_partial_credit: true,
      supports_offline: true,
      supports_time_limit: true,
      is_accessible: true,
      scoring_method: 'hybrid',
      default_points: 5,
      display_order: 3,
      config_schema: JSON.stringify({
        type: 'object',
        properties: {
          replay_allowed: { type: 'boolean', default: true },
          max_replays: { type: 'integer', default: 3 },
          response_type: { type: 'string', enum: ['audio', 'text', 'both'], default: 'audio' },
          playback_speed_control: { type: 'boolean', default: true },
        },
      }),
    },
    {
      category_id: oralCategory.id,
      code: 'speech_to_text',
      name: 'Speech-to-Text Transcription',
      description: 'Voice responses with automatic transcription for review',
      supports_auto_scoring: true,
      requires_manual_review: false,
      supports_partial_credit: true,
      supports_offline: false,
      supports_time_limit: true,
      is_accessible: true,
      scoring_method: 'ai_assisted',
      default_points: 5,
      display_order: 4,
      config_schema: JSON.stringify({
        type: 'object',
        properties: {
          language: { type: 'string', default: 'en' },
          confidence_threshold: { type: 'number', default: 0.8 },
          keyword_matching: { type: 'boolean', default: true },
          semantic_matching: { type: 'boolean', default: true },
        },
      }),
    },
  ]);

  // Create checkpoint templates table
  await knex.schema.createTable('checkpoint_templates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Basic information
    table.string('name', 255).notNullable();
    table.string('slug', 100).notNullable();
    table.text('description');
    table.text('instructions');

    // Relationships
    table.uuid('community_id').references('id').inTable('communities').onDelete('CASCADE');
    table.uuid('category_id').notNullable()
      .references('id').inTable('checkpoint_categories').onDelete('RESTRICT');

    // Template configuration
    table.enum('status', ['draft', 'published', 'archived']).defaultTo('draft');
    table.boolean('is_public').defaultTo(false);
    table.integer('version').defaultTo(1);

    // Scoring configuration
    table.integer('passing_score').defaultTo(70);
    table.specificType('passing_tiers', 'jsonb').defaultTo('[]');
    table.boolean('allow_partial_credit').defaultTo(true);
    table.integer('total_points').defaultTo(0);

    // Time and attempt settings
    table.integer('time_limit_minutes');
    table.integer('max_attempts');
    table.integer('cooldown_hours');
    table.boolean('show_timer').defaultTo(true);
    table.boolean('allow_pause').defaultTo(false);

    // Question settings
    table.integer('question_count');
    table.boolean('shuffle_questions').defaultTo(false);
    table.boolean('shuffle_options').defaultTo(true);
    table.boolean('show_correct_answers').defaultTo(true);
    table.enum('show_answers_when', ['immediately', 'after_submission', 'after_deadline', 'never']).defaultTo('after_submission');

    // Feedback settings
    table.boolean('show_score_immediately').defaultTo(true);
    table.boolean('show_feedback_immediately').defaultTo(true);
    table.text('completion_message');

    // Allowed formats (array of format type codes)
    table.specificType('allowed_formats', 'varchar(50)[]').defaultTo('{}');

    // Accessibility settings
    table.specificType('accessibility_features', 'varchar(50)[]').defaultTo('{}');
    table.boolean('allow_accommodations').defaultTo(true);

    // Metadata
    table.json('metadata');
    table.specificType('tags', 'varchar(50)[]').defaultTo('{}');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.uuid('updated_by').references('id').inTable('users').onDelete('SET NULL');

    // Indexes
    table.unique(['community_id', 'slug', 'version']);
    table.index('community_id');
    table.index('category_id');
    table.index('status');
    table.index('is_public');
  });

  // Create checkpoints table (instances of checkpoint templates or standalone)
  await knex.schema.createTable('checkpoints', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Basic information
    table.string('name', 255).notNullable();
    table.text('description');
    table.text('instructions');

    // Relationships
    table.uuid('template_id').references('id').inTable('checkpoint_templates').onDelete('SET NULL');
    table.uuid('community_id').notNullable()
      .references('id').inTable('communities').onDelete('CASCADE');
    table.uuid('category_id').notNullable()
      .references('id').inTable('checkpoint_categories').onDelete('RESTRICT');

    // Curriculum relationships
    table.uuid('course_id').references('id').inTable('curriculum_courses').onDelete('CASCADE');
    table.uuid('module_id').references('id').inTable('curriculum_modules').onDelete('CASCADE');
    table.uuid('lesson_id').references('id').inTable('curriculum_lessons').onDelete('CASCADE');

    // Status
    table.enum('status', ['draft', 'scheduled', 'active', 'closed', 'archived']).defaultTo('draft');
    table.timestamp('scheduled_at');
    table.timestamp('opens_at');
    table.timestamp('closes_at');

    // Scoring configuration
    table.integer('passing_score').defaultTo(70);
    table.specificType('passing_tiers', 'jsonb').defaultTo('[{"name": "Pass", "min_score": 70}, {"name": "Merit", "min_score": 85}, {"name": "Distinction", "min_score": 95}]');
    table.boolean('allow_partial_credit').defaultTo(true);
    table.integer('total_points').defaultTo(0);

    // Time and attempt settings
    table.integer('time_limit_minutes');
    table.integer('max_attempts');
    table.integer('cooldown_hours');
    table.boolean('show_timer').defaultTo(true);
    table.boolean('allow_pause').defaultTo(false);

    // Question settings
    table.integer('question_count');
    table.boolean('shuffle_questions').defaultTo(false);
    table.boolean('shuffle_options').defaultTo(true);
    table.boolean('show_correct_answers').defaultTo(true);
    table.enum('show_answers_when', ['immediately', 'after_submission', 'after_deadline', 'never']).defaultTo('after_submission');

    // Feedback settings
    table.boolean('show_score_immediately').defaultTo(true);
    table.boolean('show_feedback_immediately').defaultTo(true);
    table.text('completion_message');

    // Format restrictions
    table.specificType('allowed_formats', 'varchar(50)[]').defaultTo('{}');

    // Accessibility
    table.specificType('accessibility_features', 'varchar(50)[]').defaultTo('{}');
    table.boolean('allow_accommodations').defaultTo(true);

    // Integrity settings
    table.boolean('require_identity_verification').defaultTo(false);
    table.boolean('detect_collaboration').defaultTo(false);
    table.boolean('log_session_events').defaultTo(true);

    // Analytics
    table.integer('attempt_count').defaultTo(0);
    table.decimal('average_score', 5, 2);
    table.decimal('pass_rate', 5, 2);
    table.integer('average_duration_seconds');

    // Metadata
    table.json('metadata');
    table.specificType('tags', 'varchar(50)[]').defaultTo('{}');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('published_at');
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.uuid('updated_by').references('id').inTable('users').onDelete('SET NULL');

    // Indexes
    table.index('template_id');
    table.index('community_id');
    table.index('category_id');
    table.index('course_id');
    table.index('module_id');
    table.index('lesson_id');
    table.index('status');
    table.index(['opens_at', 'closes_at']);
  });

  // Create checkpoint questions junction table
  await knex.schema.createTable('checkpoint_questions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    table.uuid('checkpoint_id').notNullable()
      .references('id').inTable('checkpoints').onDelete('CASCADE');
    table.uuid('question_id').notNullable()
      .references('id').inTable('assessment_questions').onDelete('CASCADE');
    table.uuid('format_type_id').notNullable()
      .references('id').inTable('checkpoint_format_types').onDelete('RESTRICT');

    // Question configuration in this checkpoint
    table.integer('display_order').notNullable();
    table.integer('points_override');
    table.boolean('is_required').defaultTo(true);
    table.boolean('is_bonus').defaultTo(false);

    // Format-specific configuration
    table.json('format_config');

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Unique constraint
    table.unique(['checkpoint_id', 'question_id']);
    table.index('checkpoint_id');
    table.index('question_id');
    table.index('format_type_id');
  });

  // Create learner accessibility accommodations table
  await knex.schema.createTable('checkpoint_accommodations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    table.uuid('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.uuid('community_id').notNullable()
      .references('id').inTable('communities').onDelete('CASCADE');

    // Accommodation types
    table.boolean('extended_time').defaultTo(false);
    table.decimal('time_multiplier', 3, 2).defaultTo(1.0);
    table.boolean('screen_reader_support').defaultTo(false);
    table.boolean('high_contrast_mode').defaultTo(false);
    table.boolean('large_text').defaultTo(false);
    table.integer('font_size_percentage').defaultTo(100);
    table.boolean('break_allowances').defaultTo(false);
    table.integer('break_frequency_minutes');
    table.integer('break_duration_minutes');
    table.boolean('alternative_input').defaultTo(false);
    table.specificType('alternative_input_methods', 'varchar(50)[]').defaultTo('{}');
    table.boolean('audio_descriptions').defaultTo(false);
    table.boolean('sign_language_support').defaultTo(false);
    table.boolean('text_to_speech').defaultTo(false);
    table.boolean('speech_to_text').defaultTo(false);

    // Preferred formats
    table.specificType('preferred_formats', 'varchar(50)[]').defaultTo('{}');
    table.specificType('excluded_formats', 'varchar(50)[]').defaultTo('{}');

    // Documentation
    table.text('documentation_notes');
    table.string('documentation_file_url', 500);
    table.date('valid_from');
    table.date('valid_until');

    // Approval
    table.boolean('is_approved').defaultTo(false);
    table.uuid('approved_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('approved_at');

    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');

    // Unique constraint per user per community
    table.unique(['user_id', 'community_id']);
    table.index('user_id');
    table.index('community_id');
    table.index('is_active');
  });

  // Create learner format preferences table
  await knex.schema.createTable('checkpoint_format_preferences', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    table.uuid('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');

    // Format preferences
    table.specificType('preferred_formats', 'varchar(50)[]').defaultTo('{}');
    table.specificType('preferred_categories', 'varchar(50)[]').defaultTo('{}');

    // Ranking preferences
    table.json('format_rankings');

    // Override settings
    table.boolean('allow_format_override').defaultTo(true);
    table.text('override_justification');

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.unique('user_id');
  });

  // Create triggers for updated_at
  await knex.raw(`
    CREATE TRIGGER update_checkpoint_categories_updated_at
      BEFORE UPDATE ON checkpoint_categories
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_checkpoint_format_types_updated_at
      BEFORE UPDATE ON checkpoint_format_types
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_checkpoint_templates_updated_at
      BEFORE UPDATE ON checkpoint_templates
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_checkpoints_updated_at
      BEFORE UPDATE ON checkpoints
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_checkpoint_questions_updated_at
      BEFORE UPDATE ON checkpoint_questions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_checkpoint_accommodations_updated_at
      BEFORE UPDATE ON checkpoint_accommodations
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_checkpoint_format_preferences_updated_at
      BEFORE UPDATE ON checkpoint_format_preferences
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);

  // Create full-text search indexes
  await knex.raw(`
    CREATE INDEX checkpoint_templates_search_idx ON checkpoint_templates
    USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

    CREATE INDEX checkpoints_search_idx ON checkpoints
    USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop triggers
  await knex.raw(`
    DROP TRIGGER IF EXISTS update_checkpoint_categories_updated_at ON checkpoint_categories;
    DROP TRIGGER IF EXISTS update_checkpoint_format_types_updated_at ON checkpoint_format_types;
    DROP TRIGGER IF EXISTS update_checkpoint_templates_updated_at ON checkpoint_templates;
    DROP TRIGGER IF EXISTS update_checkpoints_updated_at ON checkpoints;
    DROP TRIGGER IF EXISTS update_checkpoint_questions_updated_at ON checkpoint_questions;
    DROP TRIGGER IF EXISTS update_checkpoint_accommodations_updated_at ON checkpoint_accommodations;
    DROP TRIGGER IF EXISTS update_checkpoint_format_preferences_updated_at ON checkpoint_format_preferences;
  `);

  // Drop tables in reverse dependency order
  await knex.schema.dropTableIfExists('checkpoint_format_preferences');
  await knex.schema.dropTableIfExists('checkpoint_accommodations');
  await knex.schema.dropTableIfExists('checkpoint_questions');
  await knex.schema.dropTableIfExists('checkpoints');
  await knex.schema.dropTableIfExists('checkpoint_templates');
  await knex.schema.dropTableIfExists('checkpoint_format_types');
  await knex.schema.dropTableIfExists('checkpoint_categories');
}
