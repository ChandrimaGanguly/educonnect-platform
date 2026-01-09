import type { Knex } from 'knex';

/**
 * Add MFA backup codes column to users table
 *
 * CRITICAL FIX: Previously, backup codes were generated but never stored,
 * making MFA recovery impossible.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    // Store hashed backup codes as JSON array
    // Each code should be hashed before storage for security
    table.json('mfa_backup_codes');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('mfa_backup_codes');
  });
}
