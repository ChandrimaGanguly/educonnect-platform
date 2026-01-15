import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Change related_entity_id from UUID to text to support external entity IDs
  await knex.schema.alterTable('trust_events', (table) => {
    table.text('related_entity_id').alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  // Revert to UUID (note: this will fail if non-UUID values exist)
  await knex.schema.alterTable('trust_events', (table) => {
    table.uuid('related_entity_id').alter();
  });
}

