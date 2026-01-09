import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('sync_queue', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.uuid('device_id').notNullable();
    table.string('entity_type', 50).notNullable(); // e.g., 'checkpoint_response', 'progress', 'content_interaction'
    table.uuid('entity_id').notNullable();
    table.string('operation', 20).notNullable(); // 'create', 'update', 'delete'
    table.jsonb('data').notNullable(); // The actual data to sync
    table.jsonb('metadata').defaultTo('{}'); // Additional metadata
    table.integer('priority').defaultTo(5); // 1-10, lower is higher priority
    table.string('status', 20).notNullable().defaultTo('pending'); // 'pending', 'processing', 'completed', 'failed'
    table.integer('retry_count').defaultTo(0);
    table.text('error_message').nullable();
    table.timestamp('client_timestamp').notNullable(); // When the action occurred on client
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('processed_at').nullable();
    table.timestamp('completed_at').nullable();

    // Indexes for efficient queries
    table.index(['user_id', 'status', 'priority']);
    table.index(['device_id', 'status']);
    table.index(['entity_type', 'entity_id']);
    table.index('created_at');
    table.index('status');

    // Foreign key
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
  });

  // Add comment
  await knex.raw(`
    COMMENT ON TABLE sync_queue IS 'Queue for synchronizing offline actions from clients to server'
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('sync_queue');
}
