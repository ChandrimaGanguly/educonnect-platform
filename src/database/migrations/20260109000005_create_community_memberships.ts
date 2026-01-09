import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Community memberships - many-to-many relationship between users and communities
  await knex.schema.createTable('community_members', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('community_id').notNullable().references('id').inTable('communities').onDelete('CASCADE');

    // Membership status
    table.enum('status', ['pending', 'active', 'inactive', 'suspended', 'banned']).defaultTo('pending');
    table.enum('membership_type', ['member', 'contributor', 'mentor', 'moderator', 'admin', 'owner']).defaultTo('member');

    // Approval workflow
    table.boolean('approved').defaultTo(false);
    table.uuid('approved_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('approved_at');
    table.text('join_reason'); // Why they want to join

    // Activity tracking
    table.integer('contribution_count').defaultTo(0);
    table.timestamp('last_active_at').defaultTo(knex.fn.now());

    // Preferences
    table.json('notification_preferences').defaultTo(JSON.stringify({
      content_updates: true,
      community_announcements: true,
      direct_messages: true,
    }));

    // Metadata
    table.json('metadata');

    // Timestamps
    table.timestamp('joined_at').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('left_at');

    // Unique constraint - a user can only have one active membership per community
    table.unique(['user_id', 'community_id']);

    // Indexes
    table.index('user_id');
    table.index('community_id');
    table.index('status');
    table.index('membership_type');
    table.index(['community_id', 'status']);
    table.index(['user_id', 'status']);
  });

  // Community invitations
  await knex.schema.createTable('community_invitations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('community_id').notNullable().references('id').inTable('communities').onDelete('CASCADE');
    table.uuid('inviter_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('invitee_id').references('id').inTable('users').onDelete('CASCADE'); // null if inviting by email
    table.string('invitee_email', 255); // for inviting non-members

    // Invitation details
    table.text('message');
    table.string('invitation_token', 255).unique();
    table.enum('status', ['pending', 'accepted', 'declined', 'expired', 'cancelled']).defaultTo('pending');

    // Expiration
    table.timestamp('expires_at').notNullable();
    table.timestamp('responded_at');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('community_id');
    table.index('inviter_id');
    table.index('invitee_id');
    table.index('invitee_email');
    table.index('invitation_token');
    table.index('status');
    table.index('expires_at');
  });

  // Community join requests (for private/invite-only communities)
  await knex.schema.createTable('community_join_requests', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('community_id').notNullable().references('id').inTable('communities').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Request details
    table.text('message'); // Why they want to join
    table.enum('status', ['pending', 'approved', 'rejected', 'cancelled']).defaultTo('pending');

    // Review
    table.uuid('reviewed_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('reviewed_at');
    table.text('review_notes');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Unique constraint - one active request per user per community
    table.unique(['user_id', 'community_id', 'status']);

    // Indexes
    table.index('community_id');
    table.index('user_id');
    table.index('status');
    table.index(['community_id', 'status']);
  });

  // Add triggers for updated_at
  await knex.raw(`
    CREATE TRIGGER update_community_members_updated_at
      BEFORE UPDATE ON community_members
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_community_invitations_updated_at
      BEFORE UPDATE ON community_invitations
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_community_join_requests_updated_at
      BEFORE UPDATE ON community_join_requests
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);

  // Create trigger to update community member_count
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_community_member_count()
    RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
        UPDATE communities
        SET member_count = member_count + 1
        WHERE id = NEW.community_id;
      ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != 'active' AND NEW.status = 'active' THEN
          UPDATE communities
          SET member_count = member_count + 1
          WHERE id = NEW.community_id;
        ELSIF OLD.status = 'active' AND NEW.status != 'active' THEN
          UPDATE communities
          SET member_count = member_count - 1
          WHERE id = NEW.community_id;
        END IF;
      ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
        UPDATE communities
        SET member_count = member_count - 1
        WHERE id = OLD.community_id;
      END IF;
      RETURN COALESCE(NEW, OLD);
    END;
    $$ language 'plpgsql';

    CREATE TRIGGER update_community_member_count_trigger
      AFTER INSERT OR UPDATE OR DELETE ON community_members
      FOR EACH ROW
      EXECUTE FUNCTION update_community_member_count();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TRIGGER IF EXISTS update_community_member_count_trigger ON community_members');
  await knex.raw('DROP FUNCTION IF EXISTS update_community_member_count');

  await knex.raw('DROP TRIGGER IF EXISTS update_community_join_requests_updated_at ON community_join_requests');
  await knex.raw('DROP TRIGGER IF EXISTS update_community_invitations_updated_at ON community_invitations');
  await knex.raw('DROP TRIGGER IF EXISTS update_community_members_updated_at ON community_members');

  await knex.schema.dropTableIfExists('community_join_requests');
  await knex.schema.dropTableIfExists('community_invitations');
  await knex.schema.dropTableIfExists('community_members');
}
