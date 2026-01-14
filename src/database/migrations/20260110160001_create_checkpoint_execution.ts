import type { Knex } from 'knex';

/**
 * Checkpoint Execution Engine Migration
 *
 * Creates tables for checkpoint session management, offline support,
 * integrity monitoring, and accessibility accommodations.
 *
 * Requirements from openspec/specs/checkpoints/spec.md:
 * - Checkpoint session initialization with identity verification
 * - Offline checkpoint support with sync and validation
 * - Checkpoint integrity monitoring and flagging
 * - Accessibility accommodations for learners
 */

export async function up(knex: Knex): Promise<void> {
  // NOTE: checkpoints and checkpoint_questions tables are created in migration 20260110000001_create_checkpoint_types.ts
  // This migration only creates execution-related tables

  // ========== Learner Accessibility Profiles ==========
  await knex.schema.createTable('learner_accessibility_profiles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();

    // Time accommodations
    table.boolean('extended_time_enabled').notNullable().defaultTo(false);
    table.decimal('time_multiplier', 3, 2).notNullable().defaultTo(1.00); // 1.5 = 50% extra time
    table.string('extended_time_reason', 255).nullable();
    table.uuid('extended_time_approved_by').nullable();
    table.timestamp('extended_time_approved_at').nullable();

    // Break accommodations
    table.boolean('breaks_enabled').notNullable().defaultTo(false);
    table.integer('break_frequency_minutes').nullable(); // Break every X minutes
    table.integer('break_duration_minutes').nullable();

    // Visual accommodations
    table.boolean('high_contrast').notNullable().defaultTo(false);
    table.boolean('large_text').notNullable().defaultTo(false);
    table.integer('font_size_adjustment').notNullable().defaultTo(0); // -2 to +4 scale
    table.boolean('reduce_motion').notNullable().defaultTo(false);

    // Audio accommodations
    table.boolean('screen_reader_mode').notNullable().defaultTo(false);
    table.boolean('text_to_speech').notNullable().defaultTo(false);
    table.decimal('speech_rate', 3, 2).notNullable().defaultTo(1.00);

    // Input accommodations
    table.boolean('voice_input').notNullable().defaultTo(false);
    table.boolean('alternative_keyboard').notNullable().defaultTo(false);
    table.boolean('switch_access').notNullable().defaultTo(false);

    // Format preferences
    table.specificType('preferred_formats', 'varchar(50)[]').defaultTo('{}'); // ['audio', 'video', 'text']
    table.boolean('oral_examination').notNullable().defaultTo(false);

    // Documentation
    table.text('accommodation_notes').nullable();
    table.jsonb('documentation').notNullable().defaultTo('{}'); // Links to supporting docs

    // Status
    table.enum('verification_status', ['pending', 'verified', 'expired']).notNullable().defaultTo('pending');
    table.timestamp('verified_at').nullable();
    table.timestamp('expires_at').nullable();

    // Timestamps
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.unique('user_id');
    table.index('user_id');
    table.index('verification_status');
  });

  // NOTE: checkpoint_sessions table is created in migration 20260110150001_create_automated_scoring.ts

  // ========== Session Responses ==========
  // Individual question responses within a session
  await knex.schema.createTable('checkpoint_responses', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('session_id').notNullable().references('id').inTable('checkpoint_sessions').onDelete('CASCADE');
    table.uuid('question_id').notNullable(); // References assessment_questions
    table.integer('question_order').notNullable(); // Order presented in this session

    // Response data
    table.jsonb('response_data').notNullable().defaultTo('{}'); // Flexible response format
    table.text('text_response').nullable(); // For short/long answer
    table.specificType('selected_options', 'uuid[]').defaultTo('{}'); // Selected option IDs
    table.jsonb('matching_pairs').nullable(); // For matching questions
    table.specificType('ordering', 'uuid[]').nullable(); // For ordering questions
    table.uuid('file_submission_id').nullable(); // For file uploads
    table.string('audio_response_url', 500).nullable(); // For voice responses

    // Status
    table.enum('status', [
      'not_viewed',
      'viewed',
      'in_progress',
      'answered',
      'skipped',
      'flagged'
    ]).notNullable().defaultTo('not_viewed');
    table.boolean('flagged_for_review').notNullable().defaultTo(false);

    // Timing
    table.timestamp('first_viewed_at').nullable();
    table.timestamp('answered_at').nullable();
    table.integer('time_spent_seconds').notNullable().defaultTo(0);

    // Scoring (populated after submission)
    table.decimal('points_earned', 5, 2).nullable();
    table.decimal('points_possible', 5, 2).notNullable();
    table.boolean('is_correct').nullable();
    table.decimal('partial_credit', 5, 2).nullable(); // 0.0 to 1.0
    table.text('feedback').nullable();
    table.enum('score_confidence', ['high', 'medium', 'low']).nullable(); // For AI scoring
    table.boolean('requires_human_review').notNullable().defaultTo(false);
    table.uuid('reviewed_by').nullable();
    table.timestamp('reviewed_at').nullable();

    // Offline sync
    table.boolean('synced').notNullable().defaultTo(true);
    table.timestamp('offline_answered_at').nullable();
    table.string('response_checksum', 64).nullable();

    // Timestamps
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.unique(['session_id', 'question_id']);
    table.index('session_id');
    table.index('question_id');
    table.index('status');
    table.index('requires_human_review');
    table.index(['session_id', 'question_order']);
  });

  // ========== Session Events ==========
  // Detailed event log for integrity monitoring
  await knex.schema.createTable('checkpoint_session_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('session_id').notNullable().references('id').inTable('checkpoint_sessions').onDelete('CASCADE');

    // Event type
    table.string('event_type', 50).notNullable();
    // Types: 'session_start', 'question_view', 'question_answer', 'question_skip',
    // 'pause', 'resume', 'break_start', 'break_end', 'focus_lost', 'focus_gained',
    // 'copy_attempt', 'paste_attempt', 'tab_switch', 'window_resize', 'submit',
    // 'timeout', 'abandon', 'integrity_flag', 'offline_start', 'offline_sync'

    // Event data
    table.jsonb('event_data').notNullable().defaultTo('{}');
    table.uuid('question_id').nullable(); // If event relates to a question

    // Context
    table.string('source', 50).nullable(); // 'client', 'server', 'system'
    table.string('ip_address', 45).nullable();
    table.string('user_agent', 500).nullable();

    // Integrity analysis
    table.boolean('is_suspicious').notNullable().defaultTo(false);
    table.string('suspicion_reason', 255).nullable();

    // Timestamp
    table.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now());
    table.bigInteger('client_timestamp').nullable(); // Client-side timestamp for offline

    // Indexes
    table.index('session_id');
    table.index('event_type');
    table.index(['session_id', 'event_type']);
    table.index('occurred_at');
    table.index('is_suspicious');
  });

  // ========== Offline Sync Queue ==========
  // Queue for syncing offline checkpoint data
  await knex.schema.createTable('checkpoint_sync_queue', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('session_id').notNullable().references('id').inTable('checkpoint_sessions').onDelete('CASCADE');
    table.uuid('user_id').notNullable();
    table.uuid('device_id').nullable();

    // Sync data
    table.jsonb('session_data').notNullable(); // Full session state
    table.jsonb('responses_data').notNullable(); // All responses
    table.jsonb('events_data').notNullable(); // All events

    // Validation
    table.string('data_checksum', 64).notNullable(); // SHA-256 for integrity
    table.bigInteger('client_timestamp').notNullable();
    table.integer('client_timezone_offset').nullable(); // Minutes from UTC

    // Sync status
    table.enum('status', [
      'pending',
      'processing',
      'validated',
      'invalid',
      'completed',
      'failed'
    ]).notNullable().defaultTo('pending');
    table.integer('retry_count').notNullable().defaultTo(0);
    table.text('error_message').nullable();

    // Processing
    table.timestamp('received_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('processed_at').nullable();
    table.timestamp('completed_at').nullable();

    // Indexes
    table.index('session_id');
    table.index('user_id');
    table.index('status');
    table.index(['status', 'received_at']);
  });

  // ========== Checkpoint Analytics ==========
  // Aggregated analytics for checkpoint performance
  await knex.schema.createTable('checkpoint_analytics', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('checkpoint_id').notNullable().references('id').inTable('checkpoints').onDelete('CASCADE');
    table.uuid('community_id').notNullable();
    table.date('analytics_date').notNullable();

    // Attempt counts
    table.integer('total_attempts').notNullable().defaultTo(0);
    table.integer('completed_attempts').notNullable().defaultTo(0);
    table.integer('abandoned_attempts').notNullable().defaultTo(0);
    table.integer('timed_out_attempts').notNullable().defaultTo(0);

    // Pass/fail rates
    table.integer('passed_count').notNullable().defaultTo(0);
    table.integer('failed_count').notNullable().defaultTo(0);
    table.integer('merit_count').notNullable().defaultTo(0);
    table.integer('distinction_count').notNullable().defaultTo(0);
    table.decimal('pass_rate', 5, 2).nullable();

    // Score distribution
    table.decimal('avg_score', 5, 2).nullable();
    table.decimal('min_score', 5, 2).nullable();
    table.decimal('max_score', 5, 2).nullable();
    table.decimal('median_score', 5, 2).nullable();
    table.decimal('std_dev_score', 5, 2).nullable();

    // Time statistics
    table.integer('avg_duration_seconds').nullable();
    table.integer('min_duration_seconds').nullable();
    table.integer('max_duration_seconds').nullable();

    // Integrity
    table.integer('integrity_flags_count').notNullable().defaultTo(0);
    table.integer('flagged_sessions_count').notNullable().defaultTo(0);

    // Offline stats
    table.integer('offline_attempts').notNullable().defaultTo(0);
    table.integer('offline_sync_success').notNullable().defaultTo(0);
    table.integer('offline_sync_failed').notNullable().defaultTo(0);

    // Accessibility
    table.integer('extended_time_used').notNullable().defaultTo(0);
    table.integer('breaks_used').notNullable().defaultTo(0);

    // Timestamps
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['checkpoint_id', 'analytics_date']);
    table.index('checkpoint_id');
    table.index('community_id');
    table.index('analytics_date');
  });

  // ========== Triggers ==========
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_checkpoint_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  const tables = [
    'learner_accessibility_profiles',
    'checkpoint_responses',
    'checkpoint_analytics'
  ];

  for (const tableName of tables) {
    await knex.raw(`
      CREATE TRIGGER trg_${tableName}_updated_at
      BEFORE UPDATE ON ${tableName}
      FOR EACH ROW
      EXECUTE FUNCTION update_checkpoint_updated_at();
    `);
  }

  // ========== Comments ==========
  // Only add comments for tables created in this migration
  await knex.raw(`
    COMMENT ON TABLE learner_accessibility_profiles IS 'Learner-specific accessibility accommodations and documentation';
  `);
  await knex.raw(`
    COMMENT ON TABLE checkpoint_responses IS 'Individual question responses within a checkpoint session';
  `);
  await knex.raw(`
    COMMENT ON TABLE checkpoint_session_events IS 'Detailed event log for session activity and integrity monitoring';
  `);
  await knex.raw(`
    COMMENT ON TABLE checkpoint_sync_queue IS 'Queue for processing offline checkpoint submissions';
  `);
  await knex.raw(`
    COMMENT ON TABLE checkpoint_analytics IS 'Aggregated daily analytics for checkpoint performance';
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop triggers
  const tables = [
    'learner_accessibility_profiles',
    'checkpoint_responses',
    'checkpoint_analytics'
  ];

  for (const tableName of tables) {
    await knex.raw(`DROP TRIGGER IF EXISTS trg_${tableName}_updated_at ON ${tableName}`);
  }

  await knex.raw('DROP FUNCTION IF EXISTS update_checkpoint_updated_at()');

  // Drop tables created in this migration only (in reverse order of creation, respecting foreign keys)
  await knex.schema.dropTableIfExists('checkpoint_analytics');
  await knex.schema.dropTableIfExists('checkpoint_sync_queue');
  await knex.schema.dropTableIfExists('checkpoint_session_events');
  await knex.schema.dropTableIfExists('checkpoint_responses');
  await knex.schema.dropTableIfExists('learner_accessibility_profiles');
}
