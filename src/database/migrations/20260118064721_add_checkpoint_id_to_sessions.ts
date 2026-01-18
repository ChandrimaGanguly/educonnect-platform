import type { Knex } from "knex";

/**
 * Add checkpoint_id foreign key to checkpoint_sessions table
 *
 * This adds proper linking between checkpoint sessions and checkpoint definitions,
 * allowing the service to query sessions by checkpoint.
 */

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('checkpoint_sessions', (table) => {
    table.uuid('checkpoint_id')
      .nullable()
      .references('id')
      .inTable('checkpoints')
      .onDelete('CASCADE');

    // Add index for querying sessions by checkpoint
    table.index('checkpoint_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('checkpoint_sessions', (table) => {
    table.dropIndex('checkpoint_id');
    table.dropColumn('checkpoint_id');
  });
}
