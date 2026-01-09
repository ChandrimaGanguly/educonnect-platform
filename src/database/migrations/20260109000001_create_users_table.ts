import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Authentication
    table.string('email', 255).notNullable().unique();
    table.string('username', 50).notNullable().unique();
    table.string('password_hash', 255).notNullable();

    // Profile information
    table.string('full_name', 255).notNullable();
    table.text('bio');
    table.string('avatar_url', 500);
    table.string('locale', 10).defaultTo('en');
    table.string('timezone', 50).defaultTo('UTC');

    // Contact information
    table.string('phone_number', 20);
    table.boolean('phone_verified').defaultTo(false);
    table.boolean('email_verified').defaultTo(false);

    // Account status
    table.enum('status', ['active', 'inactive', 'suspended', 'deleted']).defaultTo('active');
    table.boolean('is_verified').defaultTo(false);
    table.timestamp('verified_at');

    // Multi-factor authentication
    table.boolean('mfa_enabled').defaultTo(false);
    table.string('mfa_secret', 255);

    // Trust and reputation
    table.decimal('trust_score', 5, 2).defaultTo(0);
    table.integer('reputation_points').defaultTo(0);

    // Privacy settings
    table.json('privacy_settings').defaultTo(JSON.stringify({
      profile_visibility: 'public',
      show_email: false,
      show_phone: false,
      allow_messages: true,
    }));

    // Preferences
    table.json('notification_preferences').defaultTo(JSON.stringify({
      email_notifications: true,
      push_notifications: true,
      sms_notifications: false,
    }));

    // Metadata
    table.json('metadata');

    // Timestamps
    table.timestamp('last_login_at');
    table.timestamp('password_changed_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at');

    // Indexes for performance
    table.index('email');
    table.index('username');
    table.index('status');
    table.index('trust_score');
    table.index('created_at');
  });

  // Create trigger to automatically update updated_at
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';

    CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TRIGGER IF EXISTS update_users_updated_at ON users');
  await knex.raw('DROP FUNCTION IF EXISTS update_updated_at_column');
  await knex.schema.dropTableIfExists('users');
}
