import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('sessions', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // User reference
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Session data
    table.string('session_token', 500).notNullable().unique();
    table.string('refresh_token', 500).unique();
    table.text('device_info');
    table.string('ip_address', 45);
    table.string('user_agent', 500);

    // Expiration
    table.timestamp('expires_at').notNullable();
    table.timestamp('refresh_expires_at');

    // Session status
    table.boolean('is_active').defaultTo(true);
    table.timestamp('revoked_at');
    table.string('revocation_reason', 255);

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('last_activity_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('session_token');
    table.index('refresh_token');
    table.index('expires_at');
    table.index(['user_id', 'is_active']);
  });

  // Create index for cleanup of expired sessions
  await knex.raw(`
    CREATE INDEX sessions_cleanup_idx ON sessions (expires_at)
    WHERE is_active = true;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('sessions');
}
