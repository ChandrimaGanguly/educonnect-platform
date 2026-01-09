import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Trust events - records all actions that affect trust scores
  await knex.schema.createTable('trust_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Subject of the event
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.uuid('community_id').references('id').inTable('communities').onDelete('CASCADE');

    // Event details
    table.string('event_type', 100).notNullable(); // e.g., 'content_created', 'skill_validated', 'report_filed'
    table.string('event_category', 50).notNullable(); // e.g., 'contribution', 'moderation', 'violation'
    table.decimal('trust_impact', 10, 2).notNullable(); // Can be positive or negative

    // Context
    table.uuid('related_user_id').references('id').inTable('users').onDelete('SET NULL');
    table.uuid('related_community_id').references('id').inTable('communities').onDelete('SET NULL');
    table.string('related_entity_type', 50); // e.g., 'content', 'checkpoint', 'comment'
    table.uuid('related_entity_id'); // UUID of the related entity

    // Event metadata
    table.text('description');
    table.json('metadata');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('community_id');
    table.index('event_type');
    table.index('event_category');
    table.index('created_at');
    table.index(['user_id', 'created_at']);
    table.index(['community_id', 'created_at']);
  });

  // User trust relationships - trust between users
  await knex.schema.createTable('user_trust_relationships', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    table.uuid('trustor_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('trustee_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Trust level
    table.decimal('trust_level', 5, 2).notNullable().defaultTo(0); // 0-100 scale
    table.enum('trust_type', ['endorsement', 'mentorship', 'collaboration', 'general']).notNullable();

    // Context
    table.uuid('community_id').references('id').inTable('communities').onDelete('CASCADE');
    table.text('reason');

    // Status
    table.boolean('is_active').defaultTo(true);

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('last_interaction_at').defaultTo(knex.fn.now());

    // Unique constraint - one trust relationship per pair per type per community
    table.unique(['trustor_id', 'trustee_id', 'trust_type', 'community_id']);

    // Indexes
    table.index('trustor_id');
    table.index('trustee_id');
    table.index('community_id');
    table.index('trust_type');
    table.index(['trustee_id', 'is_active']);
  });

  // Community trust relationships - trust between communities
  await knex.schema.createTable('community_trust_relationships', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    table.uuid('trustor_community_id').notNullable().references('id').inTable('communities').onDelete('CASCADE');
    table.uuid('trustee_community_id').notNullable().references('id').inTable('communities').onDelete('CASCADE');

    // Trust level
    table.decimal('trust_level', 5, 2).notNullable().defaultTo(0); // 0-100 scale
    table.enum('trust_type', ['content_sharing', 'member_vouching', 'resource_sharing', 'general']).notNullable();

    // Agreement details
    table.text('agreement_terms');
    table.boolean('is_bidirectional').defaultTo(false); // If true, trust flows both ways

    // Status
    table.boolean('is_active').defaultTo(true);
    table.uuid('established_by').references('id').inTable('users').onDelete('SET NULL');

    // Timestamps
    table.timestamp('established_at').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at');

    // Unique constraint
    table.unique(['trustor_community_id', 'trustee_community_id', 'trust_type']);

    // Indexes
    table.index('trustor_community_id');
    table.index('trustee_community_id');
    table.index('trust_type');
    table.index('is_active');
  });

  // Trust-based permission rules - permissions granted based on trust score
  await knex.schema.createTable('trust_permission_rules', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Rule definition
    table.string('name', 100).notNullable();
    table.text('description');

    // Scope
    table.enum('scope', ['platform', 'community']).notNullable();
    table.uuid('community_id').references('id').inTable('communities').onDelete('CASCADE');

    // Trust requirements
    table.decimal('minimum_trust_score', 5, 2).notNullable();
    table.integer('minimum_days_active'); // Account age requirement
    table.integer('minimum_contributions'); // Activity requirement

    // Permissions granted
    table.uuid('permission_id').references('id').inTable('permissions').onDelete('CASCADE');
    table.json('granted_permissions'); // Array of permission slugs

    // Status
    table.boolean('is_active').defaultTo(true);

    // Metadata
    table.json('metadata');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('scope');
    table.index('community_id');
    table.index('minimum_trust_score');
    table.index('is_active');
  });

  // Trust score history - for tracking changes over time
  await knex.schema.createTable('trust_score_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.uuid('community_id').references('id').inTable('communities').onDelete('CASCADE');

    // Score details
    table.decimal('old_score', 5, 2).notNullable();
    table.decimal('new_score', 5, 2).notNullable();
    table.decimal('change', 5, 2).notNullable();

    // Context
    table.uuid('trust_event_id').references('id').inTable('trust_events').onDelete('SET NULL');
    table.string('reason', 255);

    // Timestamp
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('community_id');
    table.index('created_at');
    table.index(['user_id', 'created_at']);
  });

  // Add triggers
  await knex.raw(`
    CREATE TRIGGER update_user_trust_relationships_updated_at
      BEFORE UPDATE ON user_trust_relationships
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_community_trust_relationships_updated_at
      BEFORE UPDATE ON community_trust_relationships
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_trust_permission_rules_updated_at
      BEFORE UPDATE ON trust_permission_rules
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);

  // Create function to calculate user trust score
  await knex.raw(`
    CREATE OR REPLACE FUNCTION calculate_user_trust_score(p_user_id UUID)
    RETURNS DECIMAL(5, 2) AS $$
    DECLARE
      v_score DECIMAL(5, 2);
      v_base_score DECIMAL(5, 2) := 50.0; -- Starting trust score
    BEGIN
      -- Sum all trust events for the user
      SELECT COALESCE(SUM(trust_impact), 0) INTO v_score
      FROM trust_events
      WHERE user_id = p_user_id;

      -- Add base score
      v_score := v_base_score + v_score;

      -- Ensure score is within 0-100 range
      v_score := GREATEST(0, LEAST(100, v_score));

      RETURN v_score;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create function to calculate community trust score
  await knex.raw(`
    CREATE OR REPLACE FUNCTION calculate_community_trust_score(p_community_id UUID)
    RETURNS DECIMAL(5, 2) AS $$
    DECLARE
      v_score DECIMAL(5, 2);
      v_base_score DECIMAL(5, 2) := 50.0;
    BEGIN
      -- Sum all trust events for the community
      SELECT COALESCE(SUM(trust_impact), 0) INTO v_score
      FROM trust_events
      WHERE community_id = p_community_id;

      -- Add base score
      v_score := v_base_score + v_score;

      -- Ensure score is within 0-100 range
      v_score := GREATEST(0, LEAST(100, v_score));

      RETURN v_score;
    END;
    $$ LANGUAGE plpgsql;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP FUNCTION IF EXISTS calculate_community_trust_score');
  await knex.raw('DROP FUNCTION IF EXISTS calculate_user_trust_score');

  await knex.raw('DROP TRIGGER IF EXISTS update_trust_permission_rules_updated_at ON trust_permission_rules');
  await knex.raw('DROP TRIGGER IF EXISTS update_community_trust_relationships_updated_at ON community_trust_relationships');
  await knex.raw('DROP TRIGGER IF EXISTS update_user_trust_relationships_updated_at ON user_trust_relationships');

  await knex.schema.dropTableIfExists('trust_score_history');
  await knex.schema.dropTableIfExists('trust_permission_rules');
  await knex.schema.dropTableIfExists('community_trust_relationships');
  await knex.schema.dropTableIfExists('user_trust_relationships');
  await knex.schema.dropTableIfExists('trust_events');
}
