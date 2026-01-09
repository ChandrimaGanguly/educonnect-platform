import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Roles - both platform-level and community-level
  await knex.schema.createTable('roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Role definition
    table.string('name', 100).notNullable();
    table.string('slug', 100).notNullable();
    table.text('description');

    // Role scope
    table.enum('scope', ['platform', 'community']).notNullable();
    table.uuid('community_id').references('id').inTable('communities').onDelete('CASCADE');

    // Role properties
    table.boolean('is_default').defaultTo(false); // Auto-assigned on registration/join
    table.boolean('is_system_role').defaultTo(false); // Cannot be deleted
    table.integer('priority').defaultTo(0); // Higher priority roles override lower ones

    // Metadata
    table.json('metadata');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Unique constraints
    table.unique(['slug', 'scope', 'community_id']);

    // Indexes
    table.index('scope');
    table.index('community_id');
    table.index('is_default');
    table.index(['scope', 'is_default']);
  });

  // Permissions - granular access rights
  await knex.schema.createTable('permissions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Permission definition
    table.string('name', 100).notNullable();
    table.string('slug', 100).notNullable().unique();
    table.text('description');

    // Permission categorization
    table.string('resource', 50).notNullable(); // e.g., 'user', 'content', 'community'
    table.string('action', 50).notNullable(); // e.g., 'create', 'read', 'update', 'delete'

    // Permission scope
    table.enum('scope', ['platform', 'community', 'both']).notNullable();

    // Metadata
    table.json('metadata');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('resource');
    table.index('action');
    table.index('scope');
    table.index(['resource', 'action']);
  });

  // Role permissions - many-to-many relationship
  await knex.schema.createTable('role_permissions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('role_id').notNullable().references('id').inTable('roles').onDelete('CASCADE');
    table.uuid('permission_id').notNullable().references('id').inTable('permissions').onDelete('CASCADE');

    // Constraint modifiers
    table.json('conditions'); // Optional conditions for permission (e.g., only own content)

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Unique constraint
    table.unique(['role_id', 'permission_id']);

    // Indexes
    table.index('role_id');
    table.index('permission_id');
  });

  // User roles - platform-level role assignments
  await knex.schema.createTable('user_roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('role_id').notNullable().references('id').inTable('roles').onDelete('CASCADE');

    // Assignment details
    table.uuid('assigned_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('assigned_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at'); // Optional expiration

    // Metadata
    table.text('assignment_reason');
    table.json('metadata');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Unique constraint
    table.unique(['user_id', 'role_id']);

    // Indexes
    table.index('user_id');
    table.index('role_id');
    table.index('expires_at');
  });

  // Community user roles - community-specific role assignments
  await knex.schema.createTable('community_user_roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('community_id').notNullable().references('id').inTable('communities').onDelete('CASCADE');
    table.uuid('role_id').notNullable().references('id').inTable('roles').onDelete('CASCADE');

    // Assignment details
    table.uuid('assigned_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('assigned_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at'); // Optional expiration

    // Metadata
    table.text('assignment_reason');
    table.json('metadata');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Unique constraint - one role per user per community
    table.unique(['user_id', 'community_id', 'role_id']);

    // Indexes
    table.index('user_id');
    table.index('community_id');
    table.index('role_id');
    table.index(['community_id', 'user_id']);
    table.index('expires_at');
  });

  // Add triggers for updated_at
  await knex.raw(`
    CREATE TRIGGER update_roles_updated_at
      BEFORE UPDATE ON roles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_permissions_updated_at
      BEFORE UPDATE ON permissions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_user_roles_updated_at
      BEFORE UPDATE ON user_roles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_community_user_roles_updated_at
      BEFORE UPDATE ON community_user_roles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TRIGGER IF EXISTS update_community_user_roles_updated_at ON community_user_roles');
  await knex.raw('DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_roles');
  await knex.raw('DROP TRIGGER IF EXISTS update_permissions_updated_at ON permissions');
  await knex.raw('DROP TRIGGER IF EXISTS update_roles_updated_at ON roles');

  await knex.schema.dropTableIfExists('community_user_roles');
  await knex.schema.dropTableIfExists('user_roles');
  await knex.schema.dropTableIfExists('role_permissions');
  await knex.schema.dropTableIfExists('permissions');
  await knex.schema.dropTableIfExists('roles');
}
