import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('device_sync_state', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.uuid('device_id').notNullable();
    table.string('device_name', 100).nullable();
    table.string('device_type', 50).nullable(); // 'mobile', 'tablet', 'desktop', 'pwa'
    table.string('platform', 50).nullable(); // 'android', 'ios', 'web'
    table.string('app_version', 20).nullable();
    table.timestamp('last_sync_at').nullable();
    table.timestamp('last_full_sync_at').nullable(); // Last complete sync
    table.jsonb('sync_cursor').defaultTo('{}'); // Entity-specific sync positions
    table.integer('pending_items').defaultTo(0);
    table.integer('storage_used_mb').defaultTo(0);
    table.integer('storage_limit_mb').defaultTo(500);
    table.boolean('wifi_only').defaultTo(true);
    table.boolean('auto_sync_enabled').defaultTo(true);
    table.string('connection_quality', 20).nullable(); // 'excellent', 'good', 'fair', 'poor', 'offline'
    table.timestamp('last_online_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Unique constraint
    table.unique(['user_id', 'device_id']);

    // Indexes
    table.index('user_id');
    table.index('last_sync_at');

    // Foreign key
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
  });

  await knex.raw(`
    COMMENT ON TABLE device_sync_state IS 'Tracks synchronization state for each user device'
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('device_sync_state');
}
