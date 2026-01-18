import type { Knex } from "knex";

/**
 * Align checkpoint_sessions schema with service expectations
 *
 * Adds columns required by CheckpointSessionService that were missing
 * from the original migration.
 */

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('checkpoint_sessions', (table) => {
    // Session tracking fields
    table.jsonb('accommodations_applied').defaultTo('[]');
    table.integer('breaks_taken').defaultTo(0);
    table.integer('current_question_index').defaultTo(0);
    table.string('device_id', 255).nullable();
    table.boolean('integrity_flagged').defaultTo(false);
    table.boolean('is_offline').defaultTo(false);

    // Question tracking
    table.integer('questions_answered').defaultTo(0);
    table.integer('questions_skipped').defaultTo(0);
    table.integer('questions_total_count').defaultTo(0);

    // Time tracking
    table.integer('time_elapsed_seconds').defaultTo(0);
    table.integer('time_remaining_seconds').nullable();
    table.integer('total_break_seconds').defaultTo(0);

    // Browser/device info
    table.string('browser', 100).nullable();
    table.string('os', 100).nullable();
    table.string('device_type', 50).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('checkpoint_sessions', (table) => {
    table.dropColumn('accommodations_applied');
    table.dropColumn('breaks_taken');
    table.dropColumn('current_question_index');
    table.dropColumn('device_id');
    table.dropColumn('integrity_flagged');
    table.dropColumn('is_offline');
    table.dropColumn('questions_answered');
    table.dropColumn('questions_skipped');
    table.dropColumn('questions_total_count');
    table.dropColumn('time_elapsed_seconds');
    table.dropColumn('time_remaining_seconds');
    table.dropColumn('total_break_seconds');
    table.dropColumn('browser');
    table.dropColumn('os');
    table.dropColumn('device_type');
  });
}
