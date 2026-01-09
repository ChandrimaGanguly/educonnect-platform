import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('sync_conflicts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('sync_queue_id').notNullable();
    table.uuid('user_id').notNullable();
    table.string('entity_type', 50).notNullable();
    table.uuid('entity_id').notNullable();
    table.string('conflict_type', 50).notNullable(); // 'concurrent_update', 'stale_data', 'deleted_on_server'
    table.jsonb('client_version').notNullable(); // Client's version of the data
    table.jsonb('server_version').notNullable(); // Server's version of the data
    table.jsonb('merged_version').nullable(); // Resolution result
    table.string('resolution_strategy', 50).notNullable(); // 'server_wins', 'client_wins', 'merge', 'manual'
    table.string('status', 20).notNullable().defaultTo('detected'); // 'detected', 'resolved', 'needs_manual'
    table.uuid('resolved_by').nullable(); // User who manually resolved
    table.text('resolution_notes').nullable();
    table.timestamp('detected_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('resolved_at').nullable();

    // Indexes
    table.index(['user_id', 'status']);
    table.index(['entity_type', 'entity_id']);
    table.index('detected_at');

    // Foreign keys
    table.foreign('sync_queue_id').references('id').inTable('sync_queue').onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('resolved_by').references('id').inTable('users').onDelete('SET NULL');
  });

  await knex.raw(`
    COMMENT ON TABLE sync_conflicts IS 'Tracks and resolves synchronization conflicts between client and server'
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('sync_conflicts');
}
