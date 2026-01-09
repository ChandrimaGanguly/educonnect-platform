import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('offline_content_cache', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.uuid('device_id').notNullable();
    table.string('content_type', 50).notNullable(); // 'lesson', 'checkpoint', 'resource', 'profile'
    table.uuid('content_id').notNullable();
    table.jsonb('content_data').notNullable(); // Cached content
    table.string('cache_version', 20).notNullable(); // Version for cache invalidation
    table.integer('size_bytes').notNullable();
    table.integer('priority').defaultTo(5); // 1-10, for eviction policy
    table.boolean('pinned').defaultTo(false); // User pinned, never auto-evict
    table.timestamp('last_accessed_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('expires_at').nullable(); // Optional expiration
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Unique constraint
    table.unique(['user_id', 'device_id', 'content_type', 'content_id']);

    // Indexes
    table.index(['user_id', 'device_id']);
    table.index(['content_type', 'content_id']);
    table.index('last_accessed_at');
    table.index('priority');

    // Foreign key
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
  });

  await knex.raw(`
    COMMENT ON TABLE offline_content_cache IS 'Tracks what content is cached on each device for offline access'
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('offline_content_cache');
}
