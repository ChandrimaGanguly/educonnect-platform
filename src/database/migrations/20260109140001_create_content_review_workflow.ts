import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create content reviewers table (qualified reviewers for content)
  await knex.schema.createTable('content_reviewers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // User and community relationship
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('community_id').references('id').inTable('communities').onDelete('CASCADE');

    // Reviewer qualifications
    table.enum('reviewer_type', [
      'peer_reviewer',
      'subject_expert',
      'pedagogy_reviewer',
      'accessibility_reviewer',
      'editorial_reviewer',
      'senior_reviewer'
    ]).notNullable();

    // Expertise areas
    table.specificType('expertise_domains', 'uuid[]').defaultTo('{}');
    table.specificType('expertise_subjects', 'uuid[]').defaultTo('{}');
    table.specificType('expertise_tags', 'varchar(50)[]').defaultTo('{}');

    // Status and capacity
    table.enum('status', ['pending', 'active', 'inactive', 'suspended']).defaultTo('pending');
    table.integer('max_active_reviews').defaultTo(5);
    table.integer('current_active_reviews').defaultTo(0);
    table.boolean('available_for_assignment').defaultTo(true);

    // Performance metrics
    table.integer('total_reviews_completed').defaultTo(0);
    table.integer('reviews_on_time').defaultTo(0);
    table.decimal('average_review_quality', 3, 2).defaultTo(0);
    table.decimal('consistency_score', 3, 2).defaultTo(0);
    table.integer('appeal_reversal_count').defaultTo(0);

    // Training and certification
    table.timestamp('training_completed_at');
    table.timestamp('certification_expires_at');
    table.json('training_modules_completed');

    // Metadata
    table.json('metadata');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.uuid('approved_by').references('id').inTable('users').onDelete('SET NULL');

    // Indexes
    table.unique(['user_id', 'community_id', 'reviewer_type']);
    table.index('user_id');
    table.index('community_id');
    table.index('reviewer_type');
    table.index('status');
    table.index('available_for_assignment');
  });

  // Create content review submissions table
  await knex.schema.createTable('content_review_submissions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Content reference (polymorphic - can be any curriculum item)
    table.enum('content_type', ['domain', 'subject', 'course', 'module', 'lesson', 'resource']).notNullable();
    table.uuid('content_id').notNullable();

    // Submitter information
    table.uuid('submitted_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.uuid('community_id').notNullable().references('id').inTable('communities').onDelete('CASCADE');

    // Submission details
    table.string('title', 255).notNullable();
    table.text('description');
    table.integer('version').defaultTo(1);
    table.uuid('previous_submission_id').references('id').inTable('content_review_submissions').onDelete('SET NULL');

    // Review workflow status
    table.enum('status', [
      'draft',
      'submitted',
      'in_review',
      'changes_requested',
      'resubmitted',
      'approved',
      'rejected',
      'withdrawn'
    ]).defaultTo('draft');

    // Review pipeline stage
    table.enum('current_stage', [
      'peer_review',
      'technical_accuracy',
      'pedagogical_quality',
      'accessibility_check',
      'plagiarism_check',
      'editorial_review',
      'final_approval'
    ]).defaultTo('peer_review');

    // Workflow tracking
    table.integer('required_approvals').defaultTo(3);
    table.integer('current_approvals').defaultTo(0);
    table.json('completed_stages').defaultTo('[]');

    // Priority and SLA
    table.enum('priority', ['low', 'normal', 'high', 'urgent']).defaultTo('normal');
    table.timestamp('due_date');
    table.timestamp('sla_deadline');

    // Automated checks
    table.boolean('plagiarism_check_completed').defaultTo(false);
    table.decimal('plagiarism_score', 5, 2);
    table.boolean('accessibility_check_completed').defaultTo(false);
    table.decimal('accessibility_score', 5, 2);
    table.boolean('auto_checks_passed').defaultTo(false);

    // Content snapshot (for version comparison)
    table.json('content_snapshot');
    table.string('content_hash', 64);

    // Metadata
    table.json('metadata');
    table.text('submission_notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('submitted_at');
    table.timestamp('completed_at');

    // Indexes
    table.index('content_type');
    table.index('content_id');
    table.index('submitted_by');
    table.index('community_id');
    table.index('status');
    table.index('current_stage');
    table.index('priority');
    table.index('created_at');
    table.index(['content_type', 'content_id']);
  });

  // Create content reviews table (individual review assignments)
  await knex.schema.createTable('content_reviews', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Submission reference
    table.uuid('submission_id').notNullable().references('id').inTable('content_review_submissions').onDelete('CASCADE');

    // Reviewer assignment
    table.uuid('reviewer_id').notNullable().references('id').inTable('content_reviewers').onDelete('RESTRICT');
    table.uuid('assigned_by').references('id').inTable('users').onDelete('SET NULL');

    // Review type and stage
    table.enum('review_type', [
      'peer_review',
      'technical_accuracy',
      'pedagogical_quality',
      'accessibility_review',
      'editorial_review',
      'final_approval',
      'appeal_review'
    ]).notNullable();

    // Review status
    table.enum('status', [
      'assigned',
      'in_progress',
      'completed',
      'declined',
      'reassigned',
      'expired'
    ]).defaultTo('assigned');

    // Decision
    table.enum('decision', [
      'approve',
      'approve_with_changes',
      'request_changes',
      'reject',
      'escalate'
    ]);

    // Review content
    table.text('feedback');
    table.json('detailed_feedback');
    table.json('checklist_responses');
    table.decimal('quality_score', 3, 2);

    // Issues found
    table.specificType('issue_categories', 'varchar(50)[]').defaultTo('{}');
    table.json('issues');

    // Time tracking
    table.timestamp('assigned_at').defaultTo(knex.fn.now());
    table.timestamp('started_at');
    table.timestamp('completed_at');
    table.timestamp('due_date');
    table.integer('time_spent_minutes');

    // Review quality (meta-review)
    table.decimal('review_quality_score', 3, 2);
    table.uuid('quality_reviewed_by').references('id').inTable('users').onDelete('SET NULL');
    table.text('quality_review_notes');

    // Metadata
    table.json('metadata');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('submission_id');
    table.index('reviewer_id');
    table.index('review_type');
    table.index('status');
    table.index('decision');
    table.index('assigned_at');
    table.index('due_date');
  });

  // Create review comments table (inline comments on content)
  await knex.schema.createTable('review_comments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Review reference
    table.uuid('review_id').notNullable().references('id').inTable('content_reviews').onDelete('CASCADE');

    // Comment location (for inline comments)
    table.string('location_type', 50); // 'section', 'paragraph', 'line', 'element'
    table.string('location_ref', 255); // Reference to specific location in content
    table.integer('line_start');
    table.integer('line_end');

    // Comment content
    table.text('comment').notNullable();
    table.enum('comment_type', [
      'suggestion',
      'issue',
      'question',
      'praise',
      'required_change',
      'optional_improvement'
    ]).defaultTo('suggestion');

    table.enum('severity', ['info', 'minor', 'major', 'critical']).defaultTo('info');

    // Resolution tracking
    table.enum('status', ['open', 'acknowledged', 'resolved', 'wont_fix', 'deferred']).defaultTo('open');
    table.text('resolution_note');
    table.uuid('resolved_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('resolved_at');

    // Threading
    table.uuid('parent_comment_id').references('id').inTable('review_comments').onDelete('CASCADE');
    table.integer('thread_depth').defaultTo(0);

    // Metadata
    table.json('metadata');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('review_id');
    table.index('comment_type');
    table.index('severity');
    table.index('status');
    table.index('parent_comment_id');
  });

  // Create plagiarism check results table
  await knex.schema.createTable('plagiarism_checks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Submission reference
    table.uuid('submission_id').notNullable().references('id').inTable('content_review_submissions').onDelete('CASCADE');

    // Check configuration
    table.enum('check_type', ['full', 'incremental', 'quick']).defaultTo('full');
    table.json('check_settings');

    // Results
    table.enum('status', ['pending', 'in_progress', 'completed', 'failed']).defaultTo('pending');
    table.decimal('overall_similarity_score', 5, 2);
    table.decimal('highest_match_score', 5, 2);
    table.integer('total_matches_found').defaultTo(0);

    // Detailed matches
    table.json('matches'); // Array of {source, similarity, matched_text, location}

    // Exclusions applied
    table.json('exclusions'); // Common phrases, quotes, citations excluded

    // Human review
    table.boolean('requires_human_review').defaultTo(false);
    table.uuid('reviewed_by').references('id').inTable('users').onDelete('SET NULL');
    table.enum('review_decision', ['cleared', 'violation', 'partial_violation']);
    table.text('review_notes');

    // Processing info
    table.integer('processing_time_ms');
    table.string('service_version', 50);
    table.json('error_details');

    // Metadata
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('completed_at');

    // Indexes
    table.index('submission_id');
    table.index('status');
    table.index('overall_similarity_score');
    table.index('requires_human_review');
  });

  // Create accessibility check results table
  await knex.schema.createTable('accessibility_checks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Submission reference
    table.uuid('submission_id').notNullable().references('id').inTable('content_review_submissions').onDelete('CASCADE');

    // Check configuration
    table.string('wcag_level', 10).defaultTo('AA'); // A, AA, AAA
    table.json('check_settings');

    // Results
    table.enum('status', ['pending', 'in_progress', 'completed', 'failed']).defaultTo('pending');
    table.boolean('passed').defaultTo(false);
    table.decimal('compliance_score', 5, 2);

    // Issue breakdown
    table.integer('critical_issues').defaultTo(0);
    table.integer('serious_issues').defaultTo(0);
    table.integer('moderate_issues').defaultTo(0);
    table.integer('minor_issues').defaultTo(0);

    // Detailed issues
    table.json('issues'); // Array of {type, element, description, wcag_criterion, severity}

    // Checks performed
    table.json('checks_performed');
    table.json('checks_passed');
    table.json('checks_failed');

    // Processing info
    table.integer('processing_time_ms');
    table.string('service_version', 50);
    table.json('error_details');

    // Metadata
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('completed_at');

    // Indexes
    table.index('submission_id');
    table.index('status');
    table.index('passed');
    table.index('compliance_score');
  });

  // Create review appeals table
  await knex.schema.createTable('review_appeals', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Original submission/review reference
    table.uuid('submission_id').notNullable().references('id').inTable('content_review_submissions').onDelete('CASCADE');
    table.uuid('original_review_id').references('id').inTable('content_reviews').onDelete('SET NULL');

    // Appellant
    table.uuid('appealed_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');

    // Appeal details
    table.text('appeal_reason').notNullable();
    table.json('supporting_evidence');
    table.enum('appeal_type', [
      'factual_error',
      'policy_misapplication',
      'bias_concern',
      'new_information',
      'procedural_issue',
      'other'
    ]).notNullable();

    // Status and processing
    table.enum('status', [
      'submitted',
      'under_review',
      'additional_info_requested',
      'decided',
      'withdrawn'
    ]).defaultTo('submitted');

    // Decision
    table.uuid('reviewed_by').references('id').inTable('users').onDelete('SET NULL');
    table.enum('decision', ['upheld', 'overturned', 'partially_overturned', 'remanded']);
    table.text('decision_rationale');

    // SLA tracking
    table.timestamp('sla_deadline');
    table.boolean('sla_met');

    // Metadata
    table.json('metadata');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('decided_at');

    // Indexes
    table.index('submission_id');
    table.index('appealed_by');
    table.index('status');
    table.index('decision');
    table.index('created_at');
  });

  // Create review workflow history table (audit trail)
  await knex.schema.createTable('review_workflow_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Submission reference
    table.uuid('submission_id').notNullable().references('id').inTable('content_review_submissions').onDelete('CASCADE');

    // Action details
    table.string('action', 100).notNullable();
    table.uuid('actor_id').references('id').inTable('users').onDelete('SET NULL');
    table.enum('actor_type', ['user', 'system', 'automated']).defaultTo('user');

    // State change
    table.string('from_status', 50);
    table.string('to_status', 50);
    table.string('from_stage', 50);
    table.string('to_stage', 50);

    // Details
    table.text('description');
    table.json('details');
    table.json('metadata');

    // Timestamp
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('submission_id');
    table.index('action');
    table.index('actor_id');
    table.index('created_at');
  });

  // Create reviewer workload stats table (for capacity management)
  await knex.schema.createTable('reviewer_workload_stats', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Reviewer reference
    table.uuid('reviewer_id').notNullable().references('id').inTable('content_reviewers').onDelete('CASCADE');

    // Time period
    table.date('stat_date').notNullable();
    table.enum('period_type', ['daily', 'weekly', 'monthly']).defaultTo('daily');

    // Metrics
    table.integer('reviews_assigned').defaultTo(0);
    table.integer('reviews_completed').defaultTo(0);
    table.integer('reviews_expired').defaultTo(0);
    table.integer('average_time_minutes');
    table.decimal('average_quality_score', 3, 2);
    table.integer('issues_flagged').defaultTo(0);
    table.integer('appeals_received').defaultTo(0);
    table.integer('appeals_overturned').defaultTo(0);

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.unique(['reviewer_id', 'stat_date', 'period_type']);
    table.index('reviewer_id');
    table.index('stat_date');
  });

  // Create triggers for updated_at
  await knex.raw(`
    CREATE TRIGGER update_content_reviewers_updated_at
      BEFORE UPDATE ON content_reviewers
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_content_review_submissions_updated_at
      BEFORE UPDATE ON content_review_submissions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_content_reviews_updated_at
      BEFORE UPDATE ON content_reviews
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_review_comments_updated_at
      BEFORE UPDATE ON review_comments
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_review_appeals_updated_at
      BEFORE UPDATE ON review_appeals
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop triggers
  await knex.raw(`
    DROP TRIGGER IF EXISTS update_content_reviewers_updated_at ON content_reviewers;
    DROP TRIGGER IF EXISTS update_content_review_submissions_updated_at ON content_review_submissions;
    DROP TRIGGER IF EXISTS update_content_reviews_updated_at ON content_reviews;
    DROP TRIGGER IF EXISTS update_review_comments_updated_at ON review_comments;
    DROP TRIGGER IF EXISTS update_review_appeals_updated_at ON review_appeals;
  `);

  // Drop tables in reverse dependency order
  await knex.schema.dropTableIfExists('reviewer_workload_stats');
  await knex.schema.dropTableIfExists('review_workflow_history');
  await knex.schema.dropTableIfExists('review_appeals');
  await knex.schema.dropTableIfExists('accessibility_checks');
  await knex.schema.dropTableIfExists('plagiarism_checks');
  await knex.schema.dropTableIfExists('review_comments');
  await knex.schema.dropTableIfExists('content_reviews');
  await knex.schema.dropTableIfExists('content_review_submissions');
  await knex.schema.dropTableIfExists('content_reviewers');
}
