import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('audit_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Actor information
    table.uuid('actor_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.string('actor_type', 50).notNullable(); // user, system, service
    table.string('actor_ip', 45).nullable(); // IPv4 or IPv6
    table.string('actor_user_agent', 500).nullable();

    // Action details
    table.string('action', 100').notNullable(); // create, update, delete, login, etc.
    table.string('entity_type', 100').notNullable(); // user, community, content, etc.
    table.uuid('entity_id').nullable();
    table.text('entity_name').nullable(); // Human-readable name

    // Context and metadata
    table.text('description').nullable(); // Human-readable description
    table.jsonb('metadata').nullable(); // Additional context (changes, parameters, etc.)
    table.jsonb('changes').nullable(); // Before/after values for updates

    // Request context
    table.uuid('request_id').nullable(); // For tracing across services
    table.uuid('session_id').nullable();

    // Security classification
    table.string('severity', 20).notNullable().defaultTo('info'); // debug, info, warning, error, critical
    table.string('category', 50).notNullable(); // authentication, authorization, data_access, configuration, etc.

    // Compliance flags
    table.boolean('is_sensitive').notNullable().defaultTo(false);
    table.boolean('is_security_event').notNullable().defaultTo(false);
    table.boolean('requires_review').notNullable().defaultTo(false);

    // Timestamps
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Immutability - once created, logs cannot be updated or deleted
    // This is enforced at the database level and application level

    // Indexes for common queries
    table.index('actor_id');
    table.index('action');
    table.index('entity_type');
    table.index('entity_id');
    table.index('created_at');
    table.index('category');
    table.index('severity');
    table.index('is_security_event');
    table.index(['entity_type', 'entity_id']);
    table.index(['actor_id', 'created_at']);
  });

  // Create a composite index for performance
  await knex.raw(`
    CREATE INDEX idx_audit_logs_entity_time ON audit_logs(entity_type, entity_id, created_at DESC);
  `);

  // Add comment to table
  await knex.raw(`
    COMMENT ON TABLE audit_logs IS 'Immutable audit log for all security-relevant actions. Records MUST NOT be updated or deleted.';
  `);

  await knex.raw(`
    COMMENT ON COLUMN audit_logs.metadata IS 'Additional context data in JSON format';
  `);

  await knex.raw(`
    COMMENT ON COLUMN audit_logs.changes IS 'Before/after values for update operations';
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('audit_logs');
}
