import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('bandwidth_usage', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.uuid('device_id').notNullable();
    table.string('operation_type', 50).notNullable(); // 'sync', 'download', 'upload', 'api_call'
    table.string('resource_type', 50).nullable(); // 'content', 'media', 'data'
    table.integer('bytes_sent').defaultTo(0);
    table.integer('bytes_received').defaultTo(0);
    table.integer('duration_ms').nullable();
    table.string('connection_type', 20).nullable(); // 'wifi', '4g', '3g', '2g'
    table.boolean('compressed').defaultTo(false);
    table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now());

    // Indexes for aggregation queries
    table.index(['user_id', 'timestamp']);
    table.index(['device_id', 'timestamp']);
    table.index('timestamp');
    table.index('operation_type');

    // Foreign key
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
  });

  // Create partitions by month (for future optimization)
  await knex.raw(`
    COMMENT ON TABLE bandwidth_usage IS 'Tracks data usage for bandwidth optimization and user reporting'
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('bandwidth_usage');
}
