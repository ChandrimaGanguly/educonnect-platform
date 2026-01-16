import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create lesson_completions table for tracking user lesson completions
  await knex.schema.createTable('lesson_completions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Relationships
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('lesson_id').notNullable().references('id').inTable('curriculum_lessons').onDelete('CASCADE');

    // Completion tracking
    table.integer('time_spent_seconds');
    table.timestamp('completed_at').defaultTo(knex.fn.now());

    // Metadata for additional tracking information
    table.json('metadata');

    // Unique constraint: one completion record per user per lesson
    table.unique(['user_id', 'lesson_id']);

    // Indexes for efficient queries
    table.index('user_id');
    table.index('lesson_id');
    table.index('completed_at');
  });

  // Create updated_at trigger for lesson_completions
  await knex.raw(`
    CREATE TRIGGER update_lesson_completions_updated_at
    BEFORE UPDATE ON lesson_completions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop trigger first
  await knex.raw('DROP TRIGGER IF EXISTS update_lesson_completions_updated_at ON lesson_completions');

  // Drop table
  await knex.schema.dropTableIfExists('lesson_completions');
}
