import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('community_trust_relationships', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // The two communities in the trust relationship
    table.uuid('from_community_id').notNullable().references('id').inTable('communities').onDelete('CASCADE');
    table.uuid('to_community_id').notNullable().references('id').inTable('communities').onDelete('CASCADE');

    // Trust level: limited, standard, full
    table.enum('trust_level', ['limited', 'standard', 'full']).notNullable().defaultTo('limited');

    // Status of the trust relationship
    table.enum('status', ['pending', 'active', 'suspended', 'revoked']).notNullable().defaultTo('pending');

    // Administrators who initiated and approved
    table.uuid('initiated_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.uuid('approved_by').nullable().references('id').inTable('users').onDelete('RESTRICT');

    // Security and compliance
    table.boolean('security_compliance_verified').notNullable().defaultTo(false);
    table.timestamp('compliance_verified_at').nullable();
    table.uuid('compliance_verified_by').nullable().references('id').inTable('users').onDelete('SET NULL');

    // Resource sharing permissions
    table.jsonb('sharing_permissions').nullable().comment('Permissions for what resources can be shared');
    // Example structure:
    // {
    //   "content": { "enabled": true, "approval_required": false },
    //   "mentors": { "enabled": true, "approval_required": true },
    //   "analytics": { "enabled": false }
    // }

    // Probationary period
    table.boolean('is_probationary').notNullable().defaultTo(true);
    table.timestamp('probation_ends_at').nullable();

    // Notes and documentation
    table.text('notes').nullable(); // Why this trust relationship was created
    table.text('revocation_reason').nullable(); // If revoked, why?

    // Timestamps
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('approved_at').nullable();
    table.timestamp('revoked_at').nullable();

    // Constraints
    // Prevent self-trust
    table.check('from_community_id != to_community_id', [], 'ck_no_self_trust');

    // Unique bidirectional trust (no duplicates regardless of direction)
    table.unique(['from_community_id', 'to_community_id'], {
      indexName: 'uq_community_trust_pair',
    });

    // Indexes
    table.index('from_community_id');
    table.index('to_community_id');
    table.index('status');
    table.index('trust_level');
    table.index(['from_community_id', 'status']);
    table.index(['to_community_id', 'status']);
  });

  // Add a trigger to update updated_at automatically
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_community_trust_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    CREATE TRIGGER trg_community_trust_updated_at
    BEFORE UPDATE ON community_trust_relationships
    FOR EACH ROW
    EXECUTE FUNCTION update_community_trust_updated_at();
  `);

  // Add table comment
  await knex.raw(`
    COMMENT ON TABLE community_trust_relationships IS 'Trust relationships between communities enabling resource sharing and cross-community collaboration';
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TRIGGER IF EXISTS trg_community_trust_updated_at ON community_trust_relationships');
  await knex.raw('DROP FUNCTION IF EXISTS update_community_trust_updated_at()');
  await knex.schema.dropTableIfExists('community_trust_relationships');
}
