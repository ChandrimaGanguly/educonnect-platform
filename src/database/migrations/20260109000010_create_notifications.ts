import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Notification preferences table
  await knex.schema.createTable('notification_preferences', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Channel preferences (global enable/disable per channel)
    table.boolean('in_app_enabled').notNullable().defaultTo(true);
    table.boolean('push_enabled').notNullable().defaultTo(true);
    table.boolean('email_enabled').notNullable().defaultTo(true);
    table.boolean('sms_enabled').notNullable().defaultTo(false);

    // Category-specific preferences (JSON structure)
    // Format: { "learning": { "in_app": true, "push": true, "email": false, "sms": false }, ... }
    table.jsonb('category_preferences').notNullable().defaultTo('{}');

    // Quiet hours (UTC times)
    table.boolean('quiet_hours_enabled').notNullable().defaultTo(false);
    table.time('quiet_hours_start').nullable(); // e.g., "22:00:00"
    table.time('quiet_hours_end').nullable();   // e.g., "08:00:00"
    table.string('timezone', 50).nullable().defaultTo('UTC');

    // Frequency limits
    table.integer('max_daily_notifications').nullable().defaultTo(50);
    table.boolean('enable_digest_mode').notNullable().defaultTo(false);
    table.enum('digest_frequency', ['daily', 'weekly']).nullable();
    table.time('digest_time').nullable(); // Preferred time for digest delivery

    // Vacation/pause mode
    table.boolean('is_paused').notNullable().defaultTo(false);
    table.timestamp('paused_until').nullable();

    // Email-specific settings
    table.boolean('email_unsubscribed').notNullable().defaultTo(false);
    table.timestamp('email_unsubscribed_at').nullable();

    // Timestamps
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // One preference record per user
    table.unique('user_id');
    table.index('user_id');
  });

  // Notifications table
  await knex.schema.createTable('notifications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Notification type and category
    table.string('type', 100).notNullable(); // e.g., "checkpoint_reminder", "mentor_request", etc.
    table.string('category', 50).notNullable(); // learning, mentorship, community, system, achievement
    table.enum('priority', ['low', 'normal', 'high', 'urgent']).notNullable().defaultTo('normal');

    // Content
    table.string('title', 255).notNullable();
    table.text('body').notNullable();
    table.jsonb('data').nullable().comment('Additional structured data for the notification');

    // Action/Deep linking
    table.string('action_url', 500).nullable(); // Deep link for mobile or web URL
    table.string('action_label', 100).nullable(); // e.g., "View", "Reply", "Complete"

    // Delivery status
    table.enum('status', ['pending', 'queued', 'sent', 'failed', 'expired']).notNullable().defaultTo('pending');
    table.boolean('is_read').notNullable().defaultTo(false);
    table.timestamp('read_at').nullable();

    // Channel delivery tracking
    table.boolean('delivered_in_app').notNullable().defaultTo(false);
    table.boolean('delivered_push').notNullable().defaultTo(false);
    table.boolean('delivered_email').notNullable().defaultTo(false);
    table.boolean('delivered_sms').notNullable().defaultTo(false);

    table.timestamp('delivered_at').nullable();
    table.timestamp('failed_at').nullable();
    table.text('failure_reason').nullable();

    // Grouping and deduplication
    table.string('group_key', 255).nullable(); // For grouping similar notifications
    table.uuid('parent_notification_id').nullable().references('id').inTable('notifications').onDelete('SET NULL');

    // Expiry
    table.timestamp('expires_at').nullable();

    // Low-bandwidth optimization
    table.boolean('is_queued_for_batch').notNullable().defaultTo(false);
    table.timestamp('scheduled_for').nullable(); // When to deliver (for batching)

    // Timestamps
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Indexes for common queries
    table.index('user_id');
    table.index(['user_id', 'is_read']);
    table.index(['user_id', 'created_at']);
    table.index('status');
    table.index('category');
    table.index('type');
    table.index('priority');
    table.index('scheduled_for');
    table.index('group_key');
    table.index(['user_id', 'category', 'is_read']);
    table.index(['status', 'scheduled_for']); // For batch processing
  });

  // Notification statistics table (for analytics and fatigue prevention)
  await knex.schema.createTable('notification_stats', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.date('stat_date').notNullable();

    // Counts by category
    table.integer('learning_count').notNullable().defaultTo(0);
    table.integer('mentorship_count').notNullable().defaultTo(0);
    table.integer('community_count').notNullable().defaultTo(0);
    table.integer('system_count').notNullable().defaultTo(0);
    table.integer('achievement_count').notNullable().defaultTo(0);

    // Total counts
    table.integer('total_sent').notNullable().defaultTo(0);
    table.integer('total_read').notNullable().defaultTo(0);
    table.integer('total_clicked').notNullable().defaultTo(0);

    // Engagement metrics
    table.decimal('read_rate', 5, 2).nullable(); // Percentage
    table.decimal('click_rate', 5, 2).nullable(); // Percentage

    // Timestamps
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // One record per user per day
    table.unique(['user_id', 'stat_date']);
    table.index('user_id');
    table.index('stat_date');
  });

  // Add triggers for updated_at
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_notification_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    CREATE TRIGGER trg_notification_prefs_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_updated_at();
  `);

  await knex.raw(`
    CREATE TRIGGER trg_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_updated_at();
  `);

  await knex.raw(`
    CREATE TRIGGER trg_notification_stats_updated_at
    BEFORE UPDATE ON notification_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_updated_at();
  `);

  // Add table comments
  await knex.raw(`
    COMMENT ON TABLE notification_preferences IS 'User preferences for notification delivery across all channels';
  `);

  await knex.raw(`
    COMMENT ON TABLE notifications IS 'Individual notifications sent to users across multiple channels';
  `);

  await knex.raw(`
    COMMENT ON TABLE notification_stats IS 'Daily aggregated notification statistics for analytics and fatigue prevention';
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TRIGGER IF EXISTS trg_notification_stats_updated_at ON notification_stats');
  await knex.raw('DROP TRIGGER IF EXISTS trg_notifications_updated_at ON notifications');
  await knex.raw('DROP TRIGGER IF EXISTS trg_notification_prefs_updated_at ON notification_preferences');
  await knex.raw('DROP FUNCTION IF EXISTS update_notification_updated_at()');

  await knex.schema.dropTableIfExists('notification_stats');
  await knex.schema.dropTableIfExists('notifications');
  await knex.schema.dropTableIfExists('notification_preferences');
}
