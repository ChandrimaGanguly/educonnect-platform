import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create domains table (top-level subject areas)
  await knex.schema.createTable('curriculum_domains', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Basic information
    table.string('name', 255).notNullable();
    table.string('slug', 100).notNullable();
    table.text('description').notNullable();
    table.string('icon_url', 500);
    table.string('color', 7).defaultTo('#3B82F6');

    // Organization
    table.integer('display_order').defaultTo(0);
    table.enum('status', ['draft', 'published', 'archived']).defaultTo('draft');

    // Community relationship
    table.uuid('community_id').references('id').inTable('communities').onDelete('CASCADE');

    // Metadata
    table.json('metadata');
    table.specificType('tags', 'varchar(50)[]').defaultTo('{}');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.uuid('updated_by').references('id').inTable('users').onDelete('SET NULL');

    // Indexes
    table.unique(['community_id', 'slug']);
    table.index('community_id');
    table.index('status');
    table.index('display_order');
  });

  // Create subjects table (specific disciplines within domains)
  await knex.schema.createTable('curriculum_subjects', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Relationship to domain
    table.uuid('domain_id').notNullable().references('id').inTable('curriculum_domains').onDelete('CASCADE');

    // Basic information
    table.string('name', 255).notNullable();
    table.string('slug', 100).notNullable();
    table.text('description').notNullable();
    table.string('icon_url', 500);

    // Organization
    table.integer('display_order').defaultTo(0);
    table.enum('status', ['draft', 'published', 'archived']).defaultTo('draft');

    // Metadata
    table.json('metadata');
    table.specificType('tags', 'varchar(50)[]').defaultTo('{}');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.uuid('updated_by').references('id').inTable('users').onDelete('SET NULL');

    // Indexes
    table.unique(['domain_id', 'slug']);
    table.index('domain_id');
    table.index('status');
    table.index('display_order');
  });

  // Create courses table (complete learning units)
  await knex.schema.createTable('curriculum_courses', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Relationship to subject
    table.uuid('subject_id').notNullable().references('id').inTable('curriculum_subjects').onDelete('CASCADE');

    // Basic information
    table.string('name', 255).notNullable();
    table.string('slug', 100).notNullable();
    table.text('description').notNullable();
    table.text('overview');
    table.string('thumbnail_url', 500);
    table.string('banner_url', 500);

    // Course details
    table.enum('difficulty_level', ['beginner', 'intermediate', 'advanced', 'expert']).defaultTo('beginner');
    table.integer('estimated_hours');
    table.integer('estimated_weeks');
    table.specificType('learning_outcomes', 'text[]').defaultTo('{}');

    // Course type and tracks
    table.enum('track_type', ['practical', 'academic', 'certification', 'self_paced']).defaultTo('practical');
    table.boolean('is_certification_eligible').defaultTo(false);
    table.boolean('requires_approval').defaultTo(false);

    // Enrollment settings
    table.integer('enrollment_count').defaultTo(0);
    table.integer('max_enrollments');
    table.boolean('is_enrollable').defaultTo(true);

    // Organization and versioning
    table.integer('display_order').defaultTo(0);
    table.enum('status', ['draft', 'published', 'archived']).defaultTo('draft');
    table.integer('version').defaultTo(1);
    table.uuid('previous_version_id').references('id').inTable('curriculum_courses').onDelete('SET NULL');

    // Standards alignment
    table.json('standards_mapping');
    table.boolean('board_approved').defaultTo(false);
    table.string('accreditation_body', 255);
    table.timestamp('accreditation_date');

    // Metadata
    table.json('metadata');
    table.specificType('tags', 'varchar(50)[]').defaultTo('{}');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('published_at');
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.uuid('updated_by').references('id').inTable('users').onDelete('SET NULL');

    // Indexes
    table.unique(['subject_id', 'slug', 'version']);
    table.index('subject_id');
    table.index('status');
    table.index('difficulty_level');
    table.index('track_type');
    table.index('is_enrollable');
    table.index('display_order');
  });

  // Create modules table (chapters/units within courses)
  await knex.schema.createTable('curriculum_modules', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Relationship to course
    table.uuid('course_id').notNullable().references('id').inTable('curriculum_courses').onDelete('CASCADE');

    // Basic information
    table.string('name', 255).notNullable();
    table.string('slug', 100).notNullable();
    table.text('description').notNullable();
    table.text('overview');

    // Module details
    table.integer('estimated_hours');
    table.specificType('learning_objectives', 'text[]').defaultTo('{}');

    // Prerequisites
    table.specificType('prerequisite_module_ids', 'uuid[]').defaultTo('{}');
    table.boolean('has_prerequisites').defaultTo(false);

    // Organization
    table.integer('display_order').notNullable();
    table.enum('status', ['draft', 'published', 'archived']).defaultTo('draft');

    // Unlocking logic
    table.enum('unlock_type', ['sequential', 'conditional', 'always']).defaultTo('sequential');
    table.json('unlock_conditions');

    // Metadata
    table.json('metadata');
    table.specificType('tags', 'varchar(50)[]').defaultTo('{}');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.uuid('updated_by').references('id').inTable('users').onDelete('SET NULL');

    // Indexes
    table.unique(['course_id', 'slug']);
    table.index('course_id');
    table.index('status');
    table.index('display_order');
  });

  // Create lessons table (individual learning sessions)
  await knex.schema.createTable('curriculum_lessons', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Relationship to module
    table.uuid('module_id').notNullable().references('id').inTable('curriculum_modules').onDelete('CASCADE');

    // Basic information
    table.string('name', 255).notNullable();
    table.string('slug', 100).notNullable();
    table.text('description');
    table.text('content');

    // Lesson details
    table.enum('lesson_type', ['text', 'video', 'audio', 'interactive', 'mixed']).defaultTo('text');
    table.integer('estimated_minutes');
    table.specificType('learning_objectives', 'text[]').defaultTo('{}');

    // Content format
    table.enum('content_format', ['markdown', 'html', 'richtext']).defaultTo('markdown');
    table.boolean('has_video').defaultTo(false);
    table.boolean('has_audio').defaultTo(false);
    table.boolean('has_interactive').defaultTo(false);

    // Prerequisites
    table.specificType('prerequisite_lesson_ids', 'uuid[]').defaultTo('{}');
    table.boolean('has_prerequisites').defaultTo(false);

    // Organization
    table.integer('display_order').notNullable();
    table.enum('status', ['draft', 'published', 'archived']).defaultTo('draft');

    // Accessibility
    table.boolean('has_transcript').defaultTo(false);
    table.boolean('has_captions').defaultTo(false);
    table.boolean('has_alt_text').defaultTo(false);
    table.text('transcript');

    // Bandwidth optimization
    table.integer('estimated_bandwidth_kb');
    table.boolean('text_only_available').defaultTo(false);

    // Metadata
    table.json('metadata');
    table.specificType('tags', 'varchar(50)[]').defaultTo('{}');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.uuid('updated_by').references('id').inTable('users').onDelete('SET NULL');

    // Indexes
    table.unique(['module_id', 'slug']);
    table.index('module_id');
    table.index('status');
    table.index('lesson_type');
    table.index('display_order');
  });

  // Create resources table (atomic content pieces)
  await knex.schema.createTable('curriculum_resources', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Relationship - can belong to lesson or be standalone
    table.uuid('lesson_id').references('id').inTable('curriculum_lessons').onDelete('CASCADE');
    table.uuid('community_id').references('id').inTable('communities').onDelete('CASCADE');

    // Basic information
    table.string('name', 255).notNullable();
    table.text('description');

    // Resource details
    table.enum('resource_type', [
      'video',
      'audio',
      'document',
      'image',
      'interactive',
      'link',
      'code',
      'quiz',
      'exercise'
    ]).notNullable();

    table.string('file_url', 500);
    table.string('external_url', 500);
    table.string('mime_type', 100);
    table.bigInteger('file_size_bytes');
    table.integer('duration_seconds');

    // Accessibility
    table.string('alt_text', 500);
    table.string('caption_url', 500);
    table.string('transcript_url', 500);

    // Licensing
    table.string('license_type', 100).defaultTo('CC-BY-SA-4.0');
    table.string('attribution', 500);
    table.boolean('is_oer').defaultTo(false);

    // Organization
    table.integer('display_order').defaultTo(0);
    table.enum('status', ['draft', 'published', 'archived']).defaultTo('draft');

    // Usage tracking
    table.integer('view_count').defaultTo(0);
    table.integer('download_count').defaultTo(0);

    // Metadata
    table.json('metadata');
    table.specificType('tags', 'varchar(50)[]').defaultTo('{}');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.uuid('updated_by').references('id').inTable('users').onDelete('SET NULL');

    // Indexes
    table.index('lesson_id');
    table.index('community_id');
    table.index('resource_type');
    table.index('status');
  });

  // Create learning paths table (alternative sequences to same outcomes)
  await knex.schema.createTable('curriculum_learning_paths', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Relationship
    table.uuid('course_id').notNullable().references('id').inTable('curriculum_courses').onDelete('CASCADE');

    // Basic information
    table.string('name', 255).notNullable();
    table.text('description').notNullable();

    // Path details
    table.enum('path_type', ['default', 'fast_track', 'comprehensive', 'custom']).defaultTo('default');
    table.integer('estimated_hours');
    table.specificType('module_sequence', 'uuid[]').notNullable();

    // Path characteristics
    table.enum('difficulty_preference', ['beginner', 'intermediate', 'advanced']).defaultTo('beginner');
    table.boolean('is_recommended').defaultTo(false);
    table.boolean('is_active').defaultTo(true);

    // Metadata
    table.json('metadata');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');

    // Indexes
    table.index('course_id');
    table.index('path_type');
    table.index('is_active');
  });

  // Create standards mapping table (alignment with education boards)
  await knex.schema.createTable('curriculum_standards', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Basic information
    table.string('standard_code', 100).notNullable();
    table.string('standard_body', 255).notNullable(); // e.g., "CBSE", "IB", "Common Core"
    table.string('grade_level', 50);
    table.string('subject_area', 100);
    table.text('description').notNullable();

    // Organization
    table.string('parent_standard_code', 100);
    table.integer('display_order').defaultTo(0);

    // Metadata
    table.json('metadata');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.unique(['standard_code', 'standard_body']);
    table.index('standard_body');
    table.index('grade_level');
    table.index('subject_area');
  });

  // Create content-to-standards mapping table
  await knex.schema.createTable('curriculum_content_standards', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Relationships - can map to any level of curriculum
    table.uuid('course_id').references('id').inTable('curriculum_courses').onDelete('CASCADE');
    table.uuid('module_id').references('id').inTable('curriculum_modules').onDelete('CASCADE');
    table.uuid('lesson_id').references('id').inTable('curriculum_lessons').onDelete('CASCADE');
    table.uuid('standard_id').notNullable().references('id').inTable('curriculum_standards').onDelete('CASCADE');

    // Mapping details
    table.enum('coverage_level', ['full', 'partial', 'supplementary']).defaultTo('full');
    table.text('notes');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');

    // Indexes
    table.index('course_id');
    table.index('module_id');
    table.index('lesson_id');
    table.index('standard_id');

    // Ensure at least one content reference
    table.check('(course_id IS NOT NULL OR module_id IS NOT NULL OR lesson_id IS NOT NULL)');
  });

  // Create triggers for updated_at
  await knex.raw(`
    CREATE TRIGGER update_curriculum_domains_updated_at
      BEFORE UPDATE ON curriculum_domains
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_curriculum_subjects_updated_at
      BEFORE UPDATE ON curriculum_subjects
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_curriculum_courses_updated_at
      BEFORE UPDATE ON curriculum_courses
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_curriculum_modules_updated_at
      BEFORE UPDATE ON curriculum_modules
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_curriculum_lessons_updated_at
      BEFORE UPDATE ON curriculum_lessons
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_curriculum_resources_updated_at
      BEFORE UPDATE ON curriculum_resources
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_curriculum_learning_paths_updated_at
      BEFORE UPDATE ON curriculum_learning_paths
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_curriculum_standards_updated_at
      BEFORE UPDATE ON curriculum_standards
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);

  // Create full-text search indexes
  await knex.raw(`
    CREATE INDEX curriculum_domains_search_idx ON curriculum_domains
    USING gin(to_tsvector('english', name || ' ' || description));

    CREATE INDEX curriculum_subjects_search_idx ON curriculum_subjects
    USING gin(to_tsvector('english', name || ' ' || description));

    CREATE INDEX curriculum_courses_search_idx ON curriculum_courses
    USING gin(to_tsvector('english', name || ' ' || description || ' ' || COALESCE(overview, '')));

    CREATE INDEX curriculum_modules_search_idx ON curriculum_modules
    USING gin(to_tsvector('english', name || ' ' || description));

    CREATE INDEX curriculum_lessons_search_idx ON curriculum_lessons
    USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(content, '')));
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop triggers
  await knex.raw(`
    DROP TRIGGER IF EXISTS update_curriculum_domains_updated_at ON curriculum_domains;
    DROP TRIGGER IF EXISTS update_curriculum_subjects_updated_at ON curriculum_subjects;
    DROP TRIGGER IF EXISTS update_curriculum_courses_updated_at ON curriculum_courses;
    DROP TRIGGER IF EXISTS update_curriculum_modules_updated_at ON curriculum_modules;
    DROP TRIGGER IF EXISTS update_curriculum_lessons_updated_at ON curriculum_lessons;
    DROP TRIGGER IF EXISTS update_curriculum_resources_updated_at ON curriculum_resources;
    DROP TRIGGER IF EXISTS update_curriculum_learning_paths_updated_at ON curriculum_learning_paths;
    DROP TRIGGER IF EXISTS update_curriculum_standards_updated_at ON curriculum_standards;
  `);

  // Drop tables in reverse dependency order
  await knex.schema.dropTableIfExists('curriculum_content_standards');
  await knex.schema.dropTableIfExists('curriculum_standards');
  await knex.schema.dropTableIfExists('curriculum_learning_paths');
  await knex.schema.dropTableIfExists('curriculum_resources');
  await knex.schema.dropTableIfExists('curriculum_lessons');
  await knex.schema.dropTableIfExists('curriculum_modules');
  await knex.schema.dropTableIfExists('curriculum_courses');
  await knex.schema.dropTableIfExists('curriculum_subjects');
  await knex.schema.dropTableIfExists('curriculum_domains');
}
