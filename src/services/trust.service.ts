import { Knex } from 'knex';
import { getDatabase } from '../database';

export interface TrustEvent {
  id: string;
  user_id?: string;
  community_id?: string;
  event_type: string;
  event_category: string;
  trust_impact: number;
  related_user_id?: string;
  related_community_id?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  description?: string;
  metadata?: any;
  created_at: Date;
}

export interface UserTrustRelationship {
  id: string;
  trustor_id: string;
  trustee_id: string;
  trust_level: number;
  trust_type: 'endorsement' | 'mentorship' | 'collaboration' | 'general';
  community_id?: string;
  reason?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  last_interaction_at: Date;
}

export interface CommunityTrustRelationship {
  id: string;
  trustor_community_id: string;
  trustee_community_id: string;
  trust_level: number;
  trust_type: 'content_sharing' | 'member_vouching' | 'resource_sharing' | 'general';
  agreement_terms?: string;
  is_bidirectional: boolean;
  is_active: boolean;
  established_by?: string;
  established_at: Date;
  created_at: Date;
  updated_at: Date;
  expires_at?: Date;
}

export interface TrustPermissionRule {
  id: string;
  name: string;
  description?: string;
  scope: 'platform' | 'community';
  community_id?: string;
  minimum_trust_score: number;
  minimum_days_active?: number;
  minimum_contributions?: number;
  permission_id?: string;
  granted_permissions?: any;
  is_active: boolean;
  metadata?: any;
  created_at: Date;
  updated_at: Date;
}

export interface TrustScoreHistory {
  id: string;
  user_id?: string;
  community_id?: string;
  old_score: number;
  new_score: number;
  change: number;
  trust_event_id?: string;
  reason?: string;
  created_at: Date;
}

export interface CreateTrustEventData {
  event_type: string;
  event_category: string;
  trust_impact: number;
  description?: string;
  related_user_id?: string;
  related_community_id?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  metadata?: any;
}

export class TrustService {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  // ========== Trust Events ==========

  /**
   * Record a trust event for a user
   */
  async recordUserTrustEvent(userId: string, data: CreateTrustEventData): Promise<TrustEvent> {
    const [event] = await this.db('trust_events')
      .insert({
        user_id: userId,
        event_type: data.event_type,
        event_category: data.event_category,
        trust_impact: data.trust_impact,
        description: data.description,
        related_user_id: data.related_user_id,
        related_community_id: data.related_community_id,
        related_entity_type: data.related_entity_type,
        related_entity_id: data.related_entity_id,
        metadata: data.metadata,
      })
      .returning('*');

    // Update user's trust score
    await this.updateUserTrustScore(userId);

    return event;
  }

  /**
   * Record a trust event for a community
   */
  async recordCommunityTrustEvent(communityId: string, data: CreateTrustEventData): Promise<TrustEvent> {
    const [event] = await this.db('trust_events')
      .insert({
        community_id: communityId,
        event_type: data.event_type,
        event_category: data.event_category,
        trust_impact: data.trust_impact,
        description: data.description,
        related_user_id: data.related_user_id,
        related_community_id: data.related_community_id,
        related_entity_type: data.related_entity_type,
        related_entity_id: data.related_entity_id,
        metadata: data.metadata,
      })
      .returning('*');

    // Update community's trust score
    await this.updateCommunityTrustScore(communityId);

    return event;
  }

  /**
   * Get trust events for a user
   */
  async getUserTrustEvents(userId: string, options: {
    limit?: number;
    offset?: number;
  } = {}): Promise<TrustEvent[]> {
    const { limit = 50, offset = 0 } = options;

    const events = await this.db('trust_events')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return events;
  }

  /**
   * Get trust events for a community
   */
  async getCommunityTrustEvents(communityId: string, options: {
    limit?: number;
    offset?: number;
  } = {}): Promise<TrustEvent[]> {
    const { limit = 50, offset = 0 } = options;

    const events = await this.db('trust_events')
      .where({ community_id: communityId })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return events;
  }

  // ========== Trust Score Calculation ==========

  /**
   * Calculate user's current trust score
   */
  async calculateUserTrustScore(userId: string): Promise<number> {
    const result = await this.db.raw('SELECT calculate_user_trust_score(?) as score', [userId]);
    return Number(result.rows[0].score);
  }

  /**
   * Calculate community's current trust score
   */
  async calculateCommunityTrustScore(communityId: string): Promise<number> {
    const result = await this.db.raw('SELECT calculate_community_trust_score(?) as score', [communityId]);
    return Number(result.rows[0].score);
  }

  /**
   * Update user's trust score in users table
   */
  async updateUserTrustScore(userId: string): Promise<number> {
    const oldScore = await this.db('users')
      .where({ id: userId })
      .select('trust_score')
      .first()
      .then(r => Number(r?.trust_score || 0));

    const newScore = await this.calculateUserTrustScore(userId);
    const change = newScore - oldScore;

    await this.db('users')
      .where({ id: userId })
      .update({ trust_score: newScore });

    // Record history
    await this.db('trust_score_history').insert({
      user_id: userId,
      old_score: oldScore,
      new_score: newScore,
      change,
      reason: 'Automatic recalculation',
    });

    return newScore;
  }

  /**
   * Update community's trust score in communities table
   */
  async updateCommunityTrustScore(communityId: string): Promise<number> {
    const oldScore = await this.db('communities')
      .where({ id: communityId })
      .select('trust_score')
      .first()
      .then(r => Number(r?.trust_score || 0));

    const newScore = await this.calculateCommunityTrustScore(communityId);
    const change = newScore - oldScore;

    await this.db('communities')
      .where({ id: communityId })
      .update({ trust_score: newScore });

    // Record history
    await this.db('trust_score_history').insert({
      community_id: communityId,
      old_score: oldScore,
      new_score: newScore,
      change,
      reason: 'Automatic recalculation',
    });

    return newScore;
  }

  /**
   * Get trust score history for a user
   */
  async getUserTrustScoreHistory(userId: string, options: {
    limit?: number;
    offset?: number;
  } = {}): Promise<TrustScoreHistory[]> {
    const { limit = 50, offset = 0 } = options;

    const history = await this.db('trust_score_history')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return history;
  }

  // ========== User Trust Relationships ==========

  /**
   * Create or update trust relationship between users
   */
  async setUserTrustRelationship(
    trustorId: string,
    trusteeId: string,
    trustLevel: number,
    trustType: UserTrustRelationship['trust_type'],
    options: {
      community_id?: string;
      reason?: string;
    } = {}
  ): Promise<UserTrustRelationship> {
    const existing = await this.db('user_trust_relationships')
      .where({
        trustor_id: trustorId,
        trustee_id: trusteeId,
        trust_type: trustType,
        community_id: options.community_id || null,
      })
      .first();

    if (existing) {
      const [relationship] = await this.db('user_trust_relationships')
        .where({ id: existing.id })
        .update({
          trust_level: trustLevel,
          last_interaction_at: this.db.fn.now(),
        })
        .returning('*');

      return relationship;
    } else {
      const [relationship] = await this.db('user_trust_relationships')
        .insert({
          trustor_id: trustorId,
          trustee_id: trusteeId,
          trust_level: trustLevel,
          trust_type: trustType,
          community_id: options.community_id,
          reason: options.reason,
          is_active: true,
        })
        .returning('*');

      return relationship;
    }
  }

  /**
   * Get trust relationships where user is the trustor
   */
  async getUserTrustRelationships(userId: string): Promise<UserTrustRelationship[]> {
    const relationships = await this.db('user_trust_relationships')
      .where({ trustor_id: userId, is_active: true })
      .orderBy('trust_level', 'desc');

    return relationships;
  }

  /**
   * Get users who trust a specific user
   */
  async getUserTrustedBy(userId: string): Promise<UserTrustRelationship[]> {
    const relationships = await this.db('user_trust_relationships')
      .where({ trustee_id: userId, is_active: true })
      .orderBy('trust_level', 'desc');

    return relationships;
  }

  /**
   * Get trust level between two users
   */
  async getUserTrustLevel(
    trustorId: string,
    trusteeId: string,
    trustType: UserTrustRelationship['trust_type']
  ): Promise<number> {
    const relationship = await this.db('user_trust_relationships')
      .where({
        trustor_id: trustorId,
        trustee_id: trusteeId,
        trust_type: trustType,
        is_active: true,
      })
      .first();

    return Number(relationship?.trust_level || 0);
  }

  // ========== Community Trust Relationships ==========

  /**
   * Create or update trust relationship between communities
   */
  async setCommunityTrustRelationship(
    trustorCommunityId: string,
    trusteeCommunityId: string,
    trustLevel: number,
    trustType: CommunityTrustRelationship['trust_type'],
    options: {
      agreement_terms?: string;
      is_bidirectional?: boolean;
      established_by?: string;
      expires_at?: Date;
    } = {}
  ): Promise<CommunityTrustRelationship> {
    const existing = await this.db('community_trust_relationships')
      .where({
        trustor_community_id: trustorCommunityId,
        trustee_community_id: trusteeCommunityId,
        trust_type: trustType,
      })
      .first();

    if (existing) {
      const [relationship] = await this.db('community_trust_relationships')
        .where({ id: existing.id })
        .update({
          trust_level: trustLevel,
          agreement_terms: options.agreement_terms,
          is_bidirectional: options.is_bidirectional,
          expires_at: options.expires_at,
        })
        .returning('*');

      return relationship;
    } else {
      const [relationship] = await this.db('community_trust_relationships')
        .insert({
          trustor_community_id: trustorCommunityId,
          trustee_community_id: trusteeCommunityId,
          trust_level: trustLevel,
          trust_type: trustType,
          agreement_terms: options.agreement_terms,
          is_bidirectional: options.is_bidirectional || false,
          established_by: options.established_by,
          expires_at: options.expires_at,
          is_active: true,
        })
        .returning('*');

      return relationship;
    }
  }

  /**
   * Get community trust relationships
   */
  async getCommunityTrustRelationships(communityId: string): Promise<CommunityTrustRelationship[]> {
    const relationships = await this.db('community_trust_relationships')
      .where({ trustor_community_id: communityId, is_active: true })
      .orderBy('trust_level', 'desc');

    return relationships;
  }

  // ========== Trust-Based Permissions ==========

  /**
   * Create a trust permission rule
   */
  async createTrustPermissionRule(data: {
    name: string;
    description?: string;
    scope: 'platform' | 'community';
    community_id?: string;
    minimum_trust_score: number;
    minimum_days_active?: number;
    minimum_contributions?: number;
    permission_id?: string;
    granted_permissions?: any;
  }): Promise<TrustPermissionRule> {
    const [rule] = await this.db('trust_permission_rules')
      .insert({
        ...data,
        is_active: true,
      })
      .returning('*');

    return rule;
  }

  /**
   * Get applicable trust permission rules for a user
   */
  async getApplicableTrustPermissions(
    userId: string,
    communityId?: string
  ): Promise<TrustPermissionRule[]> {
    // Get user's trust score
    const user = await this.db('users')
      .where({ id: userId })
      .select('trust_score', 'created_at')
      .first();

    if (!user) {
      return [];
    }

    const daysActive = Math.floor(
      (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Get user's contribution count (from community_members)
    let contributionCount = 0;
    if (communityId) {
      const member = await this.db('community_members')
        .where({ user_id: userId, community_id: communityId })
        .select('contribution_count')
        .first();

      contributionCount = member?.contribution_count || 0;
    }

    // Find applicable rules
    let query = this.db('trust_permission_rules')
      .where({ is_active: true })
      .where('minimum_trust_score', '<=', user.trust_score);

    if (communityId) {
      query = query.where(function() {
        this.where({ scope: 'community', community_id: communityId })
          .orWhere({ scope: 'platform' });
      });
    } else {
      query = query.where({ scope: 'platform' });
    }

    const rules = await query;

    // Filter rules based on additional criteria
    return rules.filter(rule => {
      if (rule.minimum_days_active && daysActive < rule.minimum_days_active) {
        return false;
      }

      if (rule.minimum_contributions && contributionCount < rule.minimum_contributions) {
        return false;
      }

      return true;
    });
  }

  /**
   * Check if user meets trust requirements for a specific action
   */
  async userMeetsTrustRequirement(
    userId: string,
    permissionSlug: string,
    communityId?: string
  ): Promise<boolean> {
    const rules = await this.getApplicableTrustPermissions(userId, communityId);

    return rules.some(rule => {
      if (rule.granted_permissions && Array.isArray(rule.granted_permissions)) {
        return rule.granted_permissions.includes(permissionSlug);
      }
      return false;
    });
  }

  // ========== Common Trust Events ==========

  /**
   * Award trust for completing content
   */
  async awardTrustForContentCompletion(userId: string, contentType: string): Promise<TrustEvent> {
    return this.recordUserTrustEvent(userId, {
      event_type: 'content_completed',
      event_category: 'contribution',
      trust_impact: 2.0,
      description: `Completed ${contentType}`,
      related_entity_type: 'content',
    });
  }

  /**
   * Award trust for skill validation
   */
  async awardTrustForSkillValidation(userId: string, validatedBy: string): Promise<TrustEvent> {
    return this.recordUserTrustEvent(userId, {
      event_type: 'skill_validated',
      event_category: 'contribution',
      trust_impact: 5.0,
      description: 'Skill validated by another user',
      related_user_id: validatedBy,
    });
  }

  /**
   * Penalize trust for policy violation
   */
  async penalizeTrustForViolation(userId: string, violationType: string, severity: number): Promise<TrustEvent> {
    return this.recordUserTrustEvent(userId, {
      event_type: 'policy_violation',
      event_category: 'violation',
      trust_impact: -severity,
      description: `${violationType} violation`,
    });
  }
}
