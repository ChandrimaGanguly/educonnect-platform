import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Mentor profiles - extends user profiles with mentor-specific data
  await knex.schema.createTable('mentor_profiles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');

    // Status and capacity
    table.enum('mentor_status', ['available', 'busy', 'inactive', 'on_break']).defaultTo('inactive');
    table.integer('max_mentees').notNullable().defaultTo(3);
    table.integer('current_mentees').notNullable().defaultTo(0);

    // Experience and subjects
    table.date('mentoring_since');
    table.integer('total_mentees_helped').defaultTo(0);
    table.json('subjects'); // Array of subject IDs they can mentor
    table.text('bio');

    // Preferences
    table.integer('preferred_session_duration'); // minutes
    table.integer('response_time_hours').defaultTo(48);

    // Community scoping
    table.uuid('community_id').references('id').inTable('communities').onDelete('CASCADE');

    // Metadata
    table.json('metadata');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('mentor_status');
    table.index('community_id');
    table.index(['mentor_status', 'community_id']);

    // Check constraint: current_mentees <= max_mentees
    table.check('current_mentees <= max_mentees', {}, 'mentor_capacity_check');
  });

  // Mentorship requests - workflow for learner requesting mentor
  await knex.schema.createTable('mentorship_requests', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('learner_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('mentor_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Request details
    table.uuid('subject_id'); // Which subject they need help with
    table.text('message');
    table.enum('urgency', ['low', 'normal', 'high', 'urgent']).defaultTo('normal');

    // Matching metadata
    table.decimal('compatibility_score', 5, 2);
    table.json('match_factors'); // Store score breakdown

    // Status workflow
    table.enum('status', ['pending', 'accepted', 'declined', 'expired', 'cancelled', 'withdrawn']).defaultTo('pending');

    // Response tracking
    table.text('response_message');
    table.timestamp('responded_at');
    table.timestamp('expires_at');

    // Community context
    table.uuid('community_id').references('id').inTable('communities').onDelete('CASCADE');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('learner_id');
    table.index('mentor_id');
    table.index('status');
    table.index('community_id');
    table.index(['mentor_id', 'status']);
    table.index(['learner_id', 'status']);
    table.index('expires_at');
  });

  // Add unique constraint for pending requests using raw SQL
  await knex.raw(`
    CREATE UNIQUE INDEX mentorship_requests_unique_pending
    ON mentorship_requests(learner_id, mentor_id, status)
    WHERE status = 'pending'
  `);

  // Mentorship relationships - active mentorship connections
  await knex.schema.createTable('mentorship_relationships', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('learner_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('mentor_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('request_id').references('id').inTable('mentorship_requests').onDelete('SET NULL');

    // Relationship details
    table.uuid('subject_id'); // Primary subject focus
    table.text('goals');

    // Status
    table.enum('status', ['active', 'paused', 'completed', 'terminated']).defaultTo('active');

    // Session tracking
    table.integer('scheduled_sessions_count').defaultTo(0);
    table.integer('completed_sessions_count').defaultTo(0);
    table.timestamp('last_session_at');
    table.timestamp('next_session_at');

    // Feedback
    table.decimal('learner_satisfaction_rating', 2, 1); // 1-5 scale
    table.decimal('mentor_satisfaction_rating', 2, 1);

    // Community context
    table.uuid('community_id').references('id').inTable('communities').onDelete('CASCADE');

    // Timestamps
    table.timestamp('started_at').defaultTo(knex.fn.now());
    table.timestamp('ended_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('learner_id');
    table.index('mentor_id');
    table.index('status');
    table.index('community_id');
    table.index(['mentor_id', 'status']);
    table.index(['learner_id', 'status']);
  });

  // Add unique constraint for active relationships using raw SQL
  await knex.raw(`
    CREATE UNIQUE INDEX mentorship_relationships_unique_active
    ON mentorship_relationships(learner_id, mentor_id, status)
    WHERE status = 'active'
  `);

  // Mentorship feedback - ratings and feedback collection
  await knex.schema.createTable('mentorship_feedback', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('relationship_id').notNullable().references('id').inTable('mentorship_relationships').onDelete('CASCADE');
    table.uuid('reviewer_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('reviewer_role', ['learner', 'mentor']).notNullable();

    // Ratings (1-5 scale)
    table.decimal('overall_rating', 2, 1).notNullable();
    table.decimal('communication_rating', 2, 1);
    table.decimal('expertise_rating', 2, 1);
    table.decimal('availability_rating', 2, 1);

    // Feedback
    table.text('feedback_text');
    table.boolean('would_recommend');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('relationship_id');
    table.index('reviewer_id');
    table.index(['relationship_id', 'reviewer_role']);

    // Check constraint: ratings must be between 1.0 and 5.0
    table.check('overall_rating >= 1.0 AND overall_rating <= 5.0', {}, 'overall_rating_range');
  });

  // Add triggers for updated_at
  await knex.raw(`
    CREATE TRIGGER update_mentor_profiles_updated_at
      BEFORE UPDATE ON mentor_profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_mentorship_requests_updated_at
      BEFORE UPDATE ON mentorship_requests
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_mentorship_relationships_updated_at
      BEFORE UPDATE ON mentorship_relationships
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_mentorship_feedback_updated_at
      BEFORE UPDATE ON mentorship_feedback
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);

  // Create trigger to update mentor current_mentees count
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_mentor_mentee_count()
    RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
        UPDATE mentor_profiles
        SET current_mentees = current_mentees + 1
        WHERE user_id = NEW.mentor_id;
      ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != 'active' AND NEW.status = 'active' THEN
          UPDATE mentor_profiles
          SET current_mentees = current_mentees + 1
          WHERE user_id = NEW.mentor_id;
        ELSIF OLD.status = 'active' AND NEW.status != 'active' THEN
          UPDATE mentor_profiles
          SET current_mentees = current_mentees - 1
          WHERE user_id = NEW.mentor_id;
        END IF;
      ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
        UPDATE mentor_profiles
        SET current_mentees = current_mentees - 1
        WHERE user_id = OLD.mentor_id;
      END IF;
      RETURN COALESCE(NEW, OLD);
    END;
    $$ language 'plpgsql';

    CREATE TRIGGER update_mentor_mentee_count_trigger
      AFTER INSERT OR UPDATE OR DELETE ON mentorship_relationships
      FOR EACH ROW
      EXECUTE FUNCTION update_mentor_mentee_count();
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop triggers
  await knex.raw('DROP TRIGGER IF EXISTS update_mentor_mentee_count_trigger ON mentorship_relationships');
  await knex.raw('DROP FUNCTION IF EXISTS update_mentor_mentee_count');

  await knex.raw('DROP TRIGGER IF EXISTS update_mentorship_feedback_updated_at ON mentorship_feedback');
  await knex.raw('DROP TRIGGER IF EXISTS update_mentorship_relationships_updated_at ON mentorship_relationships');
  await knex.raw('DROP TRIGGER IF EXISTS update_mentorship_requests_updated_at ON mentorship_requests');
  await knex.raw('DROP TRIGGER IF EXISTS update_mentor_profiles_updated_at ON mentor_profiles');

  // Drop unique indexes
  await knex.raw('DROP INDEX IF EXISTS mentorship_relationships_unique_active');
  await knex.raw('DROP INDEX IF EXISTS mentorship_requests_unique_pending');

  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('mentorship_feedback');
  await knex.schema.dropTableIfExists('mentorship_relationships');
  await knex.schema.dropTableIfExists('mentorship_requests');
  await knex.schema.dropTableIfExists('mentor_profiles');
}
