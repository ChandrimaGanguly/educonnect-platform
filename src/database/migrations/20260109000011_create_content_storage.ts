import type { Knex } from 'knex';

/**
 * Migration: Create content storage tables for CDN and file management
 *
 * This migration creates the infrastructure for:
 * - Content file storage with metadata
 * - Multiple file variants for bandwidth optimization
 * - CDN integration and caching support
 */

export async function up(knex: Knex): Promise<void> {
  // Create content_files table
  await knex.schema.createTable('content_files', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // File metadata
    table.string('original_filename', 255).notNullable();
    table.string('storage_key', 500).notNullable().unique(); // S3/storage path
    table.string('mime_type', 100).notNullable();
    table.bigInteger('file_size').notNullable(); // Size in bytes
    table.string('file_hash', 64).notNullable(); // SHA-256 for deduplication

    // File type classification
    table.enum('file_type', [
      'image',
      'video',
      'audio',
      'document',
      'interactive',
      'other'
    ]).notNullable();

    // Ownership and association
    table.uuid('uploaded_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('community_id').nullable().references('id').inTable('communities').onDelete('SET NULL');

    // Content context (what the file is used for)
    table.enum('content_context', [
      'lesson',
      'checkpoint',
      'profile',
      'community',
      'resource',
      'assessment',
      'other'
    ]).notNullable().defaultTo('resource');

    // CDN and caching
    table.string('cdn_url', 500).nullable(); // Full CDN URL
    table.boolean('is_public').notNullable().defaultTo(false);
    table.integer('cache_ttl').nullable(); // Cache TTL in seconds

    // Metadata for media files
    table.jsonb('metadata').nullable(); // Dimensions, duration, codec, etc.

    // Alt text and accessibility
    table.text('alt_text').nullable();
    table.text('description').nullable();
    table.text('transcript').nullable(); // For audio/video

    // Download and bandwidth management
    table.boolean('downloadable').notNullable().defaultTo(true);
    table.bigInteger('estimated_bandwidth').nullable(); // Estimated bytes for delivery

    // Processing status
    table.enum('processing_status', [
      'pending',
      'processing',
      'ready',
      'failed',
      'archived'
    ]).notNullable().defaultTo('pending');

    table.text('processing_error').nullable();

    // Lifecycle management
    table.timestamp('archived_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index('uploaded_by');
    table.index('community_id');
    table.index('file_type');
    table.index('file_hash'); // For deduplication
    table.index('processing_status');
    table.index('created_at');
  });

  // Create content_file_variants table for different quality levels
  await knex.schema.createTable('content_file_variants', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Reference to original file
    table.uuid('file_id').notNullable().references('id').inTable('content_files').onDelete('CASCADE');

    // Variant details
    table.enum('variant_type', [
      'original',
      'thumbnail',
      'low_quality',
      'medium_quality',
      'high_quality',
      'ultra_low',
      'audio_only',
      'text_only',
      'webp',
      'avif'
    ]).notNullable();

    table.string('storage_key', 500).notNullable().unique();
    table.string('cdn_url', 500).nullable();
    table.bigInteger('file_size').notNullable();
    table.string('mime_type', 100).notNullable();

    // Quality metadata
    table.jsonb('variant_metadata').nullable(); // Resolution, bitrate, etc.
    table.integer('quality_score').nullable(); // 1-100
    table.integer('bandwidth_estimate').nullable(); // Estimated bytes

    // Network conditions this variant is optimized for
    table.enum('optimized_for', [
      '2g',
      '3g',
      '4g',
      '5g',
      'wifi',
      'any'
    ]).notNullable().defaultTo('any');

    // Processing
    table.enum('status', [
      'pending',
      'processing',
      'ready',
      'failed'
    ]).notNullable().defaultTo('pending');

    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index('file_id');
    table.index(['file_id', 'variant_type']);
    table.index('variant_type');
    table.index('optimized_for');
    table.index('status');

    // Ensure unique variant type per file
    table.unique(['file_id', 'variant_type']);
  });

  // Create content_downloads table to track download history
  await knex.schema.createTable('content_downloads', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    table.uuid('file_id').notNullable().references('id').inTable('content_files').onDelete('CASCADE');
    table.uuid('variant_id').nullable().references('id').inTable('content_file_variants').onDelete('SET NULL');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Download context
    table.string('device_type', 50).nullable();
    table.string('connection_type', 50).nullable(); // 2g, 3g, 4g, wifi
    table.bigInteger('bytes_transferred').nullable();
    table.integer('download_duration_ms').nullable();

    // Success tracking
    table.boolean('completed').notNullable().defaultTo(false);
    table.text('error_message').nullable();

    table.timestamp('started_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('completed_at').nullable();

    // Indexes
    table.index('file_id');
    table.index('user_id');
    table.index('started_at');
    table.index(['user_id', 'file_id']); // User's download history for a file
  });

  // Create content_cache_stats table for CDN analytics
  await knex.schema.createTable('content_cache_stats', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    table.uuid('file_id').notNullable().references('id').inTable('content_files').onDelete('CASCADE');
    table.uuid('variant_id').nullable().references('id').inTable('content_file_variants').onDelete('SET NULL');

    // Geographic region
    table.string('region', 100).nullable(); // CDN edge location

    // Cache performance
    table.integer('cache_hits').notNullable().defaultTo(0);
    table.integer('cache_misses').notNullable().defaultTo(0);
    table.bigInteger('bytes_served').notNullable().defaultTo(0);

    // Time period for this stat
    table.date('stat_date').notNullable();
    table.integer('stat_hour').nullable(); // 0-23 for hourly stats

    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index('file_id');
    table.index('stat_date');
    table.index(['file_id', 'stat_date']);
    table.index(['region', 'stat_date']);

    // Ensure unique stats per file/variant/region/time
    table.unique(['file_id', 'variant_id', 'region', 'stat_date', 'stat_hour']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('content_cache_stats');
  await knex.schema.dropTableIfExists('content_downloads');
  await knex.schema.dropTableIfExists('content_file_variants');
  await knex.schema.dropTableIfExists('content_files');
}
