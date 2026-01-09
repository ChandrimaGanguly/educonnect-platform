import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // User skills - for self-assessment and expertise tracking
  await knex.schema.createTable('user_skills', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Skill information
    table.string('skill_name', 100).notNullable();
    table.string('category', 50).notNullable(); // e.g., 'programming', 'mathematics', 'language'
    table.enum('proficiency_level', ['beginner', 'intermediate', 'advanced', 'expert']).notNullable();

    // Self-assessment vs validated
    table.boolean('is_self_assessed').defaultTo(true);
    table.boolean('is_validated').defaultTo(false);
    table.uuid('validated_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('validated_at');

    // Evidence and endorsements
    table.integer('endorsement_count').defaultTo(0);
    table.text('notes'); // User's notes about their skill

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('skill_name');
    table.index('category');
    table.index(['user_id', 'skill_name']);
  });

  // User interests - what they want to learn or teach
  await knex.schema.createTable('user_interests', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    table.string('interest_name', 100).notNullable();
    table.string('category', 50).notNullable();
    table.enum('interest_type', ['learning', 'teaching', 'both']).notNullable();
    table.integer('priority').defaultTo(1); // 1-5, where 5 is highest priority

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('category');
    table.index(['user_id', 'interest_type']);
  });

  // User education - educational background
  await knex.schema.createTable('user_education', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    table.string('institution', 255).notNullable();
    table.string('degree', 100);
    table.string('field_of_study', 100);
    table.integer('start_year');
    table.integer('end_year');
    table.boolean('is_current').defaultTo(false);
    table.text('description');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
  });

  // User availability - for mentoring and engagement
  await knex.schema.createTable('user_availability', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    table.enum('day_of_week', ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).notNullable();
    table.time('start_time').notNullable();
    table.time('end_time').notNullable();
    table.boolean('is_active').defaultTo(true);

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index(['user_id', 'day_of_week']);
    table.unique(['user_id', 'day_of_week', 'start_time', 'end_time']);
  });

  // Add triggers for updated_at
  await knex.raw(`
    CREATE TRIGGER update_user_skills_updated_at
      BEFORE UPDATE ON user_skills
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_user_interests_updated_at
      BEFORE UPDATE ON user_interests
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_user_education_updated_at
      BEFORE UPDATE ON user_education
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_user_availability_updated_at
      BEFORE UPDATE ON user_availability
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TRIGGER IF EXISTS update_user_availability_updated_at ON user_availability');
  await knex.raw('DROP TRIGGER IF EXISTS update_user_education_updated_at ON user_education');
  await knex.raw('DROP TRIGGER IF EXISTS update_user_interests_updated_at ON user_interests');
  await knex.raw('DROP TRIGGER IF EXISTS update_user_skills_updated_at ON user_skills');

  await knex.schema.dropTableIfExists('user_availability');
  await knex.schema.dropTableIfExists('user_education');
  await knex.schema.dropTableIfExists('user_interests');
  await knex.schema.dropTableIfExists('user_skills');
}
