import type { Knex } from 'knex';

/**
 * Migration: Create automated scoring tables
 *
 * This migration creates the infrastructure for checkpoint automated scoring:
 * - Checkpoint sessions for tracking assessment attempts
 * - Checkpoint submissions for storing learner responses
 * - Checkpoint results for storing scoring outcomes
 * - Feedback records for item-level feedback
 * - Scoring configurations for community-specific settings
 *
 * Implements requirements from openspec/specs/checkpoints/spec.md:
 * - Score immediately upon submission
 * - Apply partial credit where applicable
 * - Generate item-level feedback
 * - Calculate overall score and pass/fail status
 */

export async function up(knex: Knex): Promise<void> {
  // Create checkpoint_sessions table for tracking assessment attempts
  await knex.schema.createTable('checkpoint_sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // References
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('community_id').notNullable().references('id').inTable('communities').onDelete('CASCADE');
    table.uuid('lesson_id').nullable().references('id').inTable('curriculum_lessons').onDelete('SET NULL');
    table.uuid('draft_id').nullable().references('id').inTable('content_drafts').onDelete('SET NULL');

    // Session metadata
    table.string('checkpoint_title', 255).notNullable();
    table.enum('checkpoint_type', [
      'knowledge',     // MCQ, true/false, fill-blank, matching
      'practical',     // Code submissions, projects
      'oral',          // Voice recorded responses
      'mixed'          // Combination of types
    ]).notNullable().defaultTo('knowledge');

    // Session state
    table.enum('status', [
      'initialized',   // Session created but not started
      'in_progress',   // Learner is taking the checkpoint
      'submitted',     // Checkpoint submitted, awaiting scoring
      'scored',        // Automated scoring complete
      'pending_review', // Requires human/mentor review
      'completed',     // All scoring complete
      'abandoned',     // Session abandoned/timeout
      'invalidated'    // Flagged for integrity issues
    ]).defaultTo('initialized');

    // Attempt tracking
    table.integer('attempt_number').notNullable().defaultTo(1);
    table.uuid('previous_session_id').nullable().references('id').inTable('checkpoint_sessions').onDelete('SET NULL');

    // Timing
    table.timestamp('started_at').nullable();
    table.timestamp('submitted_at').nullable();
    table.timestamp('scored_at').nullable();
    table.timestamp('completed_at').nullable();
    table.integer('time_limit_seconds').nullable();
    table.integer('time_spent_seconds').nullable();
    table.integer('extended_time_seconds').nullable(); // For accessibility accommodations

    // Question configuration
    table.jsonb('question_ids').notNullable().defaultTo('[]'); // Ordered list of question IDs
    table.integer('total_questions').notNullable().defaultTo(0);
    table.decimal('total_points', 10, 2).notNullable().defaultTo(0);

    // Offline support
    table.boolean('is_offline_session').defaultTo(false);
    table.string('offline_checksum', 64).nullable(); // For integrity validation
    table.timestamp('synced_at').nullable();

    // Integrity tracking
    table.jsonb('integrity_flags').defaultTo('[]'); // Flags for suspicious activity
    table.boolean('requires_review').defaultTo(false);

    // Device info
    table.jsonb('device_info').defaultTo('{}'); // Browser, OS, device type

    // Metadata
    table.jsonb('metadata').defaultTo('{}');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('community_id');
    table.index('lesson_id');
    table.index('status');
    table.index('created_at');
    table.index(['user_id', 'lesson_id', 'attempt_number']);
  });

  // Create checkpoint_submissions table for storing individual responses
  await knex.schema.createTable('checkpoint_submissions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // References
    table.uuid('session_id').notNullable().references('id').inTable('checkpoint_sessions').onDelete('CASCADE');
    table.uuid('question_id').notNullable().references('id').inTable('assessment_questions').onDelete('CASCADE');

    // Response content
    table.jsonb('response').notNullable(); // Structure depends on question type
    table.text('response_text').nullable(); // Plain text version for search/analysis

    // For file uploads
    table.uuid('file_id').nullable().references('id').inTable('content_files').onDelete('SET NULL');
    table.string('file_url', 500).nullable();

    // Response metadata
    table.integer('display_order').notNullable(); // Order in which question was displayed
    table.integer('response_order').nullable(); // Order in which response was submitted
    table.integer('time_spent_seconds').nullable(); // Time spent on this question
    table.integer('revision_count').defaultTo(0); // Number of times answer was changed

    // Scoring state
    table.enum('scoring_status', [
      'pending',       // Not yet scored
      'auto_scored',   // Automatically scored
      'ai_scored',     // AI-assisted scoring for subjective
      'pending_review', // Needs human review
      'reviewed',      // Human reviewed
      'final'          // Final score (no more changes)
    ]).defaultTo('pending');

    // Timestamps
    table.timestamp('first_response_at').nullable();
    table.timestamp('last_response_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('session_id');
    table.index('question_id');
    table.index('scoring_status');
    table.unique(['session_id', 'question_id']); // One submission per question per session
  });

  // Create checkpoint_results table for storing scoring outcomes
  await knex.schema.createTable('checkpoint_results', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // References
    table.uuid('session_id').notNullable().references('id').inTable('checkpoint_sessions').onDelete('CASCADE');
    table.uuid('submission_id').notNullable().references('id').inTable('checkpoint_submissions').onDelete('CASCADE');
    table.uuid('question_id').notNullable().references('id').inTable('assessment_questions').onDelete('CASCADE');

    // Scoring
    table.decimal('points_earned', 10, 2).notNullable().defaultTo(0);
    table.decimal('points_possible', 10, 2).notNullable().defaultTo(0);
    table.decimal('score_percentage', 5, 2).notNullable().defaultTo(0);
    table.boolean('is_correct').notNullable().defaultTo(false);
    table.boolean('is_partial_credit').defaultTo(false);

    // Scoring method
    table.enum('scoring_method', [
      'exact_match',       // Direct comparison
      'partial_match',     // Partial credit for partial answers
      'rubric',            // Rubric-based scoring
      'ai_assisted',       // AI model scoring
      'manual'             // Human scored
    ]).notNullable();

    // AI scoring confidence (for AI-assisted)
    table.decimal('confidence_score', 5, 4).nullable(); // 0.0000-1.0000
    table.boolean('needs_human_review').defaultTo(false);

    // Scoring details
    table.jsonb('scoring_details').defaultTo('{}'); // Detailed breakdown

    // Review tracking
    table.uuid('reviewed_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('reviewed_at').nullable();
    table.text('review_notes').nullable();
    table.decimal('original_score', 10, 2).nullable(); // If score was overridden

    // Timestamps
    table.timestamp('scored_at').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('session_id');
    table.index('submission_id');
    table.index('question_id');
    table.index('is_correct');
    table.index('needs_human_review');
    table.unique(['session_id', 'question_id']); // One result per question per session
  });

  // Create checkpoint_feedback table for item-level and overall feedback
  await knex.schema.createTable('checkpoint_feedback', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // References
    table.uuid('session_id').notNullable().references('id').inTable('checkpoint_sessions').onDelete('CASCADE');
    table.uuid('result_id').nullable().references('id').inTable('checkpoint_results').onDelete('CASCADE');
    table.uuid('question_id').nullable().references('id').inTable('assessment_questions').onDelete('SET NULL');

    // Feedback type
    table.enum('feedback_type', [
      'item',              // Single question feedback
      'summary',           // Overall performance summary
      'strength',          // Identified strength
      'improvement',       // Area for improvement
      'recommendation',    // Next steps recommendation
      'encouragement'      // Motivational feedback
    ]).notNullable();

    // Content
    table.text('feedback_text').notNullable();
    table.jsonb('feedback_content').defaultTo('{}'); // Rich content with formatting

    // Categorization
    table.string('category', 100).nullable(); // e.g., 'concept', 'skill', 'application'
    table.specificType('tags', 'varchar(50)[]').defaultTo('{}');

    // Linked resources
    table.jsonb('resource_links').defaultTo('[]'); // Links to related learning content

    // Generation metadata
    table.enum('generated_by', [
      'system',            // Rule-based system generation
      'ai',                // AI-generated feedback
      'mentor',            // Mentor-provided feedback
      'template'           // Template-based feedback
    ]).defaultTo('system');

    // Display order
    table.integer('display_order').defaultTo(0);

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('session_id');
    table.index('result_id');
    table.index('feedback_type');
    table.index('category');
  });

  // Create checkpoint_session_summary table for overall session results
  await knex.schema.createTable('checkpoint_session_summary', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Reference
    table.uuid('session_id').notNullable().unique().references('id').inTable('checkpoint_sessions').onDelete('CASCADE');

    // Scoring summary
    table.decimal('total_points_earned', 10, 2).notNullable().defaultTo(0);
    table.decimal('total_points_possible', 10, 2).notNullable().defaultTo(0);
    table.decimal('score_percentage', 5, 2).notNullable().defaultTo(0);

    // Pass/fail
    table.decimal('passing_threshold', 5, 2).notNullable().defaultTo(70.00);
    table.boolean('passed').notNullable().defaultTo(false);
    table.enum('pass_tier', ['fail', 'pass', 'merit', 'distinction']).defaultTo('fail');

    // Question breakdown
    table.integer('questions_answered').notNullable().defaultTo(0);
    table.integer('questions_correct').notNullable().defaultTo(0);
    table.integer('questions_partial').notNullable().defaultTo(0);
    table.integer('questions_incorrect').notNullable().defaultTo(0);
    table.integer('questions_skipped').notNullable().defaultTo(0);

    // Difficulty breakdown
    table.jsonb('difficulty_breakdown').defaultTo('{}'); // Performance by difficulty

    // Objective mapping
    table.jsonb('objective_performance').defaultTo('{}'); // Performance by learning objective

    // Time analysis
    table.integer('avg_time_per_question_seconds').nullable();
    table.integer('fastest_question_seconds').nullable();
    table.integer('slowest_question_seconds').nullable();

    // Strengths and weaknesses
    table.jsonb('identified_strengths').defaultTo('[]');
    table.jsonb('identified_weaknesses').defaultTo('[]');
    table.jsonb('recommended_topics').defaultTo('[]');

    // Timestamps
    table.timestamp('calculated_at').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('session_id');
    table.index('passed');
    table.index('pass_tier');
    table.index('score_percentage');
  });

  // Create scoring_configurations table for community/checkpoint scoring rules
  await knex.schema.createTable('scoring_configurations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Scope
    table.uuid('community_id').nullable().references('id').inTable('communities').onDelete('CASCADE');
    table.uuid('lesson_id').nullable().references('id').inTable('curriculum_lessons').onDelete('CASCADE');
    table.uuid('draft_id').nullable().references('id').inTable('content_drafts').onDelete('CASCADE');

    // Pass/fail configuration
    table.decimal('passing_threshold', 5, 2).notNullable().defaultTo(70.00);
    table.decimal('merit_threshold', 5, 2).nullable().defaultTo(80.00);
    table.decimal('distinction_threshold', 5, 2).nullable().defaultTo(90.00);

    // Partial credit rules
    table.boolean('allow_partial_credit').defaultTo(true);
    table.decimal('min_partial_credit', 5, 2).defaultTo(0.25); // Minimum partial credit %
    table.jsonb('partial_credit_rules').defaultTo('{}'); // Type-specific rules

    // Time-based scoring
    table.boolean('time_bonus_enabled').defaultTo(false);
    table.decimal('time_bonus_percentage', 5, 2).nullable();
    table.integer('time_bonus_threshold_seconds').nullable();

    // Retry policy
    table.integer('max_attempts').nullable(); // null = unlimited
    table.integer('retry_cooldown_hours').defaultTo(24);
    table.decimal('retry_score_penalty', 5, 2).defaultTo(0); // Percentage penalty per retry

    // Question selection
    table.boolean('shuffle_questions').defaultTo(true);
    table.boolean('shuffle_options').defaultTo(true);

    // Feedback configuration
    table.boolean('show_correct_answers').defaultTo(true);
    table.boolean('show_explanations').defaultTo(true);
    table.enum('feedback_timing', ['immediate', 'after_submission', 'after_review', 'never']).defaultTo('immediate');

    // Integrity settings
    table.boolean('integrity_check_enabled').defaultTo(false);
    table.integer('max_tab_switches').nullable();
    table.integer('max_idle_seconds').nullable();

    // Status
    table.boolean('is_active').defaultTo(true);

    // Metadata
    table.jsonb('metadata').defaultTo('{}');

    // Timestamps
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.uuid('updated_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('community_id');
    table.index('lesson_id');
    table.index('draft_id');
    table.index('is_active');
  });

  // Create triggers for updated_at
  await knex.raw(`
    CREATE TRIGGER update_checkpoint_sessions_updated_at
      BEFORE UPDATE ON checkpoint_sessions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_checkpoint_submissions_updated_at
      BEFORE UPDATE ON checkpoint_submissions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_checkpoint_results_updated_at
      BEFORE UPDATE ON checkpoint_results
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_checkpoint_session_summary_updated_at
      BEFORE UPDATE ON checkpoint_session_summary
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_scoring_configurations_updated_at
      BEFORE UPDATE ON scoring_configurations
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop triggers
  await knex.raw(`
    DROP TRIGGER IF EXISTS update_checkpoint_sessions_updated_at ON checkpoint_sessions;
    DROP TRIGGER IF EXISTS update_checkpoint_submissions_updated_at ON checkpoint_submissions;
    DROP TRIGGER IF EXISTS update_checkpoint_results_updated_at ON checkpoint_results;
    DROP TRIGGER IF EXISTS update_checkpoint_session_summary_updated_at ON checkpoint_session_summary;
    DROP TRIGGER IF EXISTS update_scoring_configurations_updated_at ON scoring_configurations;
  `);

  // Drop tables in reverse dependency order
  await knex.schema.dropTableIfExists('scoring_configurations');
  await knex.schema.dropTableIfExists('checkpoint_session_summary');
  await knex.schema.dropTableIfExists('checkpoint_feedback');
  await knex.schema.dropTableIfExists('checkpoint_results');
  await knex.schema.dropTableIfExists('checkpoint_submissions');
  await knex.schema.dropTableIfExists('checkpoint_sessions');
}
