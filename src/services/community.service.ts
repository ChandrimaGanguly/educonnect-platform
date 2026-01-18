import { Knex } from 'knex';
import { nanoid } from 'nanoid';
import { getDatabase } from '../database';
import {
  ContentGuidelines,
  CommunityFeatures,
  CommunitySettings,
  CommunityMetadata,
  MemberNotificationPreferences,
  MemberMetadata,
} from '../types/domain';

export interface Community {
  id: string;
  name: string;
  slug: string;
  description: string;
  welcome_message?: string;
  logo_url?: string;
  banner_url?: string;
  primary_color: string;
  accent_color: string;
  type: 'public' | 'private' | 'invite_only';
  status: 'active' | 'inactive' | 'archived';
  auto_approve_members: boolean;
  allow_member_invites: boolean;
  member_count: number;
  max_members?: number;
  allow_public_content: boolean;
  require_content_approval: boolean;
  content_guidelines?: ContentGuidelines;
  primary_language: string;
  supported_languages: string[];
  region?: string;
  country_code?: string;
  trust_score: number;
  verified: boolean;
  verified_at?: Date;
  features: CommunityFeatures;
  settings: CommunitySettings;
  created_by: string;
  primary_admin?: string;
  metadata?: CommunityMetadata;
  tags: string[];
  external_links?: string;
  created_at: Date;
  updated_at: Date;
  archived_at?: Date;
  last_activity_at: Date;
}

export interface CommunityMember {
  id: string;
  user_id: string;
  community_id: string;
  status: 'pending' | 'active' | 'inactive' | 'suspended' | 'banned';
  membership_type: 'member' | 'contributor' | 'mentor' | 'moderator' | 'admin' | 'owner';
  approved: boolean;
  approved_by?: string;
  approved_at?: Date;
  join_reason?: string;
  contribution_count: number;
  last_active_at: Date;
  notification_preferences: MemberNotificationPreferences;
  metadata?: MemberMetadata;
  joined_at: Date;
  created_at: Date;
  updated_at: Date;
  left_at?: Date;
}

export interface CommunityInvitation {
  id: string;
  community_id: string;
  inviter_id: string;
  invitee_id?: string;
  invitee_email?: string;
  message?: string;
  invitation_token: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  expires_at: Date;
  responded_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CommunityJoinRequest {
  id: string;
  community_id: string;
  user_id: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewed_by?: string;
  reviewed_at?: Date;
  review_notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCommunityData {
  name: string;
  slug?: string;
  description: string;
  welcome_message?: string;
  type?: 'public' | 'private' | 'invite_only';
  primary_language?: string;
  tags?: string[];
  features?: Partial<CommunityFeatures>;
  settings?: Partial<CommunitySettings>;
}

export interface UpdateCommunityData {
  name?: string;
  description?: string;
  welcome_message?: string;
  logo_url?: string;
  banner_url?: string;
  primary_color?: string;
  accent_color?: string;
  type?: 'public' | 'private' | 'invite_only';
  auto_approve_members?: boolean;
  allow_member_invites?: boolean;
  max_members?: number;
  allow_public_content?: boolean;
  require_content_approval?: boolean;
  content_guidelines?: Partial<ContentGuidelines>;
  tags?: string[];
  features?: Partial<CommunityFeatures>;
  settings?: Partial<CommunitySettings>;
}

export class CommunityService {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  // ========== Community CRUD ==========

  /**
   * Create a new community
   * Uses transaction to ensure community and owner membership are created atomically
   */
  async createCommunity(userId: string, data: CreateCommunityData): Promise<Community> {
    const slug = data.slug || this.generateSlug(data.name);

    return await this.db.transaction(async (trx) => {
      const [community] = await trx('communities')
        .insert({
          name: data.name,
          slug,
          description: data.description,
          welcome_message: data.welcome_message,
          type: data.type || 'public',
          primary_language: data.primary_language || 'en',
          tags: data.tags || [],
          features: data.features || {},
          settings: data.settings || {},
          created_by: userId,
          primary_admin: userId,
        })
        .returning('*');

      // Automatically add creator as owner (within same transaction)
      await trx('community_members')
        .insert({
          user_id: userId,
          community_id: community.id,
          membership_type: 'owner',
          status: 'active',
          approved: true,
          approved_at: trx.fn.now(),
        });

      return community;
    });
  }

  /**
   * Get community by ID
   */
  async getCommunityById(id: string): Promise<Community | null> {
    const community = await this.db('communities')
      .where({ id, status: 'active' })
      .first();

    return community || null;
  }

  /**
   * Get community by slug
   */
  async getCommunityBySlug(slug: string): Promise<Community | null> {
    const community = await this.db('communities')
      .where({ slug, status: 'active' })
      .first();

    return community || null;
  }

  /**
   * Update community
   */
  async updateCommunity(communityId: string, data: UpdateCommunityData): Promise<Community> {
    const [community] = await this.db('communities')
      .where({ id: communityId })
      .update(data)
      .returning('*');

    return community;
  }

  /**
   * Delete community (archive)
   */
  async archiveCommunity(communityId: string): Promise<void> {
    await this.db('communities')
      .where({ id: communityId })
      .update({
        status: 'archived',
        archived_at: this.db.fn.now(),
      });
  }

  /**
   * List communities with pagination and filters
   */
  async listCommunities(options: {
    limit?: number;
    offset?: number;
    type?: string;
    search?: string;
    tags?: string[];
  } = {}): Promise<{ communities: Community[]; total: number }> {
    const { limit = 20, offset = 0, type, search, tags } = options;

    let query = this.db('communities').where({ status: 'active' });

    if (type) {
      query = query.where({ type });
    }

    if (search) {
      query = query.whereRaw(
        `to_tsvector('english', name || ' ' || description) @@ plainto_tsquery('english', ?)`,
        [search]
      );
    }

    if (tags && tags.length > 0) {
      query = query.whereRaw('tags && ARRAY[?]::varchar[]', [tags]);
    }

    const [{ count }] = await query.clone().count('* as count');
    const communities = await query.limit(limit).offset(offset).orderBy('created_at', 'desc');

    return {
      communities,
      total: Number(count),
    };
  }

  // ========== Membership Management ==========

  /**
   * Add a member to community
   */
  async addMember(
    communityId: string,
    userId: string,
    options: {
      membership_type?: CommunityMember['membership_type'];
      join_reason?: string;
      auto_approve?: boolean;
    } = {}
  ): Promise<CommunityMember> {
    const community = await this.getCommunityById(communityId);
    if (!community) {
      throw new Error('Community not found');
    }

    const autoApprove = options.auto_approve ?? community.auto_approve_members;

    const [member] = await this.db('community_members')
      .insert({
        user_id: userId,
        community_id: communityId,
        membership_type: options.membership_type || 'member',
        join_reason: options.join_reason,
        status: autoApprove ? 'active' : 'pending',
        approved: autoApprove,
        approved_at: autoApprove ? this.db.fn.now() : null,
      })
      .returning('*');

    return member;
  }

  /**
   * Get member by user ID and community ID
   */
  async getMember(communityId: string, userId: string): Promise<CommunityMember | null> {
    const member = await this.db('community_members')
      .where({ community_id: communityId, user_id: userId })
      .first();

    return member || null;
  }

  /**
   * Get all members of a community
   */
  async getCommunityMembers(
    communityId: string,
    options: {
      status?: string;
      membership_type?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ members: CommunityMember[]; total: number }> {
    const { status, membership_type, limit = 50, offset = 0 } = options;

    let query = this.db('community_members').where({ community_id: communityId });

    if (status) {
      query = query.where({ status });
    }

    if (membership_type) {
      query = query.where({ membership_type });
    }

    const [{ count }] = await query.clone().count('* as count');
    const members = await query.limit(limit).offset(offset).orderBy('joined_at', 'desc');

    return {
      members,
      total: Number(count),
    };
  }

  /**
   * Get user's communities
   */
  async getUserCommunities(
    userId: string,
    options: { status?: string } = {}
  ): Promise<Community[]> {
    const { status = 'active' } = options;

    const communities = await this.db('communities')
      .join('community_members', 'communities.id', 'community_members.community_id')
      .where('community_members.user_id', userId)
      .where('community_members.status', status)
      .where('communities.status', 'active')
      .select('communities.*')
      .orderBy('community_members.joined_at', 'desc');

    return communities;
  }

  /**
   * Update member status
   */
  async updateMemberStatus(
    communityId: string,
    userId: string,
    status: CommunityMember['status']
  ): Promise<CommunityMember> {
    const [member] = await this.db('community_members')
      .where({ community_id: communityId, user_id: userId })
      .update({ status })
      .returning('*');

    return member;
  }

  /**
   * Update member type
   */
  async updateMemberType(
    communityId: string,
    userId: string,
    membershipType: CommunityMember['membership_type']
  ): Promise<CommunityMember> {
    const [member] = await this.db('community_members')
      .where({ community_id: communityId, user_id: userId })
      .update({ membership_type: membershipType })
      .returning('*');

    return member;
  }

  /**
   * Approve member
   */
  async approveMember(
    communityId: string,
    userId: string,
    approvedBy: string
  ): Promise<CommunityMember> {
    const [member] = await this.db('community_members')
      .where({ community_id: communityId, user_id: userId })
      .update({
        status: 'active',
        approved: true,
        approved_by: approvedBy,
        approved_at: this.db.fn.now(),
      })
      .returning('*');

    return member;
  }

  /**
   * Remove member from community
   */
  async removeMember(communityId: string, userId: string): Promise<void> {
    await this.db('community_members')
      .where({ community_id: communityId, user_id: userId })
      .update({
        status: 'inactive',
        left_at: this.db.fn.now(),
      });
  }

  /**
   * Remove member from community with atomic last-owner check
   * SECURITY: Prevents race condition where user could leave as last owner
   * Uses pessimistic locking to ensure atomicity
   *
   * @returns Object with success status and optional error message
   */
  async removeMemberIfNotLastOwner(
    communityId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    return await this.db.transaction(async (trx) => {
      // Lock the relevant rows to prevent concurrent modifications
      const member = await trx('community_members')
        .where({ community_id: communityId, user_id: userId, status: 'active' })
        .forUpdate()
        .first();

      if (!member) {
        return { success: false, error: 'You are not a member of this community' };
      }

      // If user is an owner, check if they're the last owner
      if (member.membership_type === 'owner') {
        // Select and lock all active owner rows (can't use count() with forUpdate)
        const owners = await trx('community_members')
          .select('id')
          .where({ community_id: communityId, membership_type: 'owner', status: 'active' })
          .forUpdate();  // Lock all owner rows

        if (owners.length === 1) {
          return {
            success: false,
            error: 'You cannot leave the community as the only owner. Transfer ownership first.',
          };
        }
      }

      // Safe to remove - either not owner, or there are other owners
      await trx('community_members')
        .where({ community_id: communityId, user_id: userId })
        .update({
          status: 'inactive',
          left_at: trx.fn.now(),
        });

      return { success: true };
    });
  }

  // ========== Invitations ==========

  /**
   * Create an invitation
   */
  async createInvitation(
    communityId: string,
    inviterId: string,
    inviteeEmail: string,
    options: {
      inviteeId?: string;
      message?: string;
      expiresInDays?: number;
    } = {}
  ): Promise<CommunityInvitation> {
    const { inviteeId, message, expiresInDays = 7 } = options;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const [invitation] = await this.db('community_invitations')
      .insert({
        community_id: communityId,
        inviter_id: inviterId,
        invitee_id: inviteeId,
        invitee_email: inviteeEmail,
        message,
        invitation_token: nanoid(32),
        expires_at: expiresAt,
      })
      .returning('*');

    return invitation;
  }

  /**
   * Get invitation by token
   */
  async getInvitationByToken(token: string): Promise<CommunityInvitation | null> {
    const invitation = await this.db('community_invitations')
      .where({ invitation_token: token })
      .first();

    return invitation || null;
  }

  /**
   * Accept invitation
   */
  async acceptInvitation(token: string, userId: string): Promise<CommunityMember> {
    const invitation = await this.getInvitationByToken(token);

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new Error('Invitation already responded to');
    }

    if (new Date() > invitation.expires_at) {
      throw new Error('Invitation has expired');
    }

    await this.db('community_invitations')
      .where({ id: invitation.id })
      .update({
        status: 'accepted',
        responded_at: this.db.fn.now(),
      });

    return this.addMember(invitation.community_id, userId, { auto_approve: true });
  }

  /**
   * Decline invitation
   */
  async declineInvitation(token: string): Promise<void> {
    await this.db('community_invitations')
      .where({ invitation_token: token })
      .update({
        status: 'declined',
        responded_at: this.db.fn.now(),
      });
  }

  // ========== Join Requests ==========

  /**
   * Create a join request
   */
  async createJoinRequest(
    communityId: string,
    userId: string,
    message?: string
  ): Promise<CommunityJoinRequest> {
    const [request] = await this.db('community_join_requests')
      .insert({
        community_id: communityId,
        user_id: userId,
        message,
      })
      .returning('*');

    return request;
  }

  /**
   * Get pending join requests for a community
   */
  async getPendingJoinRequests(communityId: string): Promise<CommunityJoinRequest[]> {
    const requests = await this.db('community_join_requests')
      .where({ community_id: communityId, status: 'pending' })
      .orderBy('created_at', 'asc');

    return requests;
  }

  /**
   * Approve join request
   */
  async approveJoinRequest(
    requestId: string,
    reviewerId: string,
    notes?: string
  ): Promise<CommunityMember> {
    const request = await this.db('community_join_requests')
      .where({ id: requestId })
      .first();

    if (!request) {
      throw new Error('Join request not found');
    }

    await this.db('community_join_requests')
      .where({ id: requestId })
      .update({
        status: 'approved',
        reviewed_by: reviewerId,
        reviewed_at: this.db.fn.now(),
        review_notes: notes,
      });

    return this.addMember(request.community_id, request.user_id, { auto_approve: true });
  }

  /**
   * Reject join request
   */
  async rejectJoinRequest(requestId: string, reviewerId: string, notes?: string): Promise<void> {
    await this.db('community_join_requests')
      .where({ id: requestId })
      .update({
        status: 'rejected',
        reviewed_by: reviewerId,
        reviewed_at: this.db.fn.now(),
        review_notes: notes,
      });
  }

  // ========== Utilities ==========

  /**
   * Generate slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + nanoid(6);
  }

  /**
   * Check if user is member of community
   */
  async isMember(communityId: string, userId: string): Promise<boolean> {
    const member = await this.getMember(communityId, userId);
    return member !== null && member.status === 'active';
  }

  /**
   * Check if user has specific role in community
   */
  async hasRole(
    communityId: string,
    userId: string,
    roles: CommunityMember['membership_type'][]
  ): Promise<boolean> {
    const member = await this.getMember(communityId, userId);
    return member !== null && member.status === 'active' && roles.includes(member.membership_type);
  }
}
