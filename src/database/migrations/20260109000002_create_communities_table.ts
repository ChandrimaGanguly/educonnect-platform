import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('communities', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Basic information
    table.string('name', 255).notNullable();
    table.string('slug', 100).notNullable().unique();
    table.text('description').notNullable();
    table.text('welcome_message');

    // Branding
    table.string('logo_url', 500);
    table.string('banner_url', 500);
    table.string('primary_color', 7).defaultTo('#3B82F6');
    table.string('accent_color', 7).defaultTo('#10B981');

    // Community type and settings
    table.enum('type', ['public', 'private', 'invite_only']).defaultTo('public');
    table.enum('status', ['active', 'inactive', 'archived']).defaultTo('active');

    // Membership settings
    table.boolean('auto_approve_members').defaultTo(true);
    table.boolean('allow_member_invites').defaultTo(true);
    table.integer('member_count').defaultTo(0);
    table.integer('max_members');

    // Content settings
    table.boolean('allow_public_content').defaultTo(true);
    table.boolean('require_content_approval').defaultTo(false);
    table.json('content_guidelines');

    // Geographic and language settings
    table.string('primary_language', 10).defaultTo('en');
    table.specificType('supported_languages', 'varchar(10)[]').defaultTo('{"en"}');
    table.string('region', 100);
    table.string('country_code', 2);

    // Trust and safety
    table.decimal('trust_score', 5, 2).defaultTo(0);
    table.boolean('verified').defaultTo(false);
    table.timestamp('verified_at');

    // Configuration
    table.json('features').defaultTo(JSON.stringify({
      enable_mentoring: true,
      enable_checkpoints: true,
      enable_certificates: true,
      enable_discussions: true,
    }));

    table.json('settings').defaultTo(JSON.stringify({
      moderation_level: 'standard',
      content_rating: 'general',
      data_retention_days: 365,
    }));

    // Relationships
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.uuid('primary_admin').references('id').inTable('users').onDelete('SET NULL');

    // Metadata
    table.json('metadata');
    table.specificType('tags', 'varchar(50)[]').defaultTo('{}');
    table.text('external_links');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('archived_at');
    table.timestamp('last_activity_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('slug');
    table.index('type');
    table.index('status');
    table.index('created_by');
    table.index('trust_score');
    table.index('created_at');
    table.index(['status', 'type']);
  });

  // Create trigger to automatically update updated_at
  await knex.raw(`
    CREATE TRIGGER update_communities_updated_at
      BEFORE UPDATE ON communities
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);

  // Create full-text search index for community discovery
  await knex.raw(`
    CREATE INDEX communities_search_idx ON communities
    USING gin(to_tsvector('english', name || ' ' || description));
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TRIGGER IF EXISTS update_communities_updated_at ON communities');
  await knex.schema.dropTableIfExists('communities');
}
