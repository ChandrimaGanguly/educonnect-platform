import { Knex } from 'knex';
import { getDatabase } from '../../database';
import {
  MentorshipRelationship,
  MentorshipRelationshipWithDetails,
  UpdateRelationshipInput,
  TerminateRelationshipInput,
  RecordSessionInput,
  RelationshipQueryOptions,
  PaginatedResponse,
} from '../../types/mentorship.types';

export class MentorshipRelationshipService {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * Create a mentorship relationship from an accepted request
   * Called after request is accepted
   * Note: Mentor count is automatically updated by database trigger
   */
  async createRelationship(
    requestId: string,
    learnerId: string,
    mentorId: string,
    subjectId?: string,
    communityId?: string
  ): Promise<MentorshipRelationship> {
    // Check if active relationship already exists
    const existing = await this.db('mentorship_relationships')
      .where({
        learner_id: learnerId,
        mentor_id: mentorId,
        status: 'active',
      })
      .first();

    if (existing) {
      throw new Error('Active relationship already exists between this learner and mentor');
    }

    const [relationship] = await this.db('mentorship_relationships')
      .insert({
        learner_id: learnerId,
        mentor_id: mentorId,
        request_id: requestId,
        subject_id: subjectId,
        status: 'active',
        community_id: communityId,
        started_at: this.db.fn.now(),
      })
      .returning('*');

    return this.formatRelationship(relationship);
  }

  /**
   * Get relationship by ID
   */
  async getRelationship(relationshipId: string): Promise<MentorshipRelationship | null> {
    const relationship = await this.db('mentorship_relationships')
      .where({ id: relationshipId })
      .first();

    return relationship ? this.formatRelationship(relationship) : null;
  }

  /**
   * Get relationship with user details
   */
  async getRelationshipWithDetails(
    relationshipId: string
  ): Promise<MentorshipRelationshipWithDetails | null> {
    const relationship = await this.getRelationship(relationshipId);
    if (!relationship) {
      return null;
    }

    // Get learner and mentor info
    const [learner, mentor] = await Promise.all([
      this.db('users')
        .where({ id: relationship.learner_id })
        .select('full_name', 'avatar_url', 'trust_score')
        .first(),
      this.db('users')
        .where({ id: relationship.mentor_id })
        .select('full_name', 'avatar_url', 'trust_score')
        .first(),
    ]);

    if (!learner || !mentor) {
      return null;
    }

    return {
      ...relationship,
      learner: {
        full_name: learner.full_name,
        avatar_url: learner.avatar_url,
        trust_score: learner.trust_score,
      },
      mentor: {
        full_name: mentor.full_name,
        avatar_url: mentor.avatar_url,
        trust_score: mentor.trust_score,
      },
    };
  }

  /**
   * Get relationships for a learner (paginated)
   */
  async getRelationshipsByLearner(
    learnerId: string,
    options: RelationshipQueryOptions = {}
  ): Promise<PaginatedResponse<MentorshipRelationshipWithDetails>> {
    const { status, limit = 20, offset = 0 } = options;

    let query = this.db('mentorship_relationships')
      .where({ learner_id: learnerId });

    if (status) {
      query = query.where({ status });
    }

    // Get total count
    const countQuery = query.clone();
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count as string, 10);

    // Get relationships
    const relationships = await query
      .limit(limit)
      .offset(offset)
      .orderBy('started_at', 'desc');

    // Enrich with details
    const enriched: MentorshipRelationshipWithDetails[] = [];
    for (const rel of relationships) {
      const details = await this.getRelationshipWithDetails(rel.id);
      if (details) {
        enriched.push(details);
      }
    }

    return {
      data: enriched,
      total,
      limit,
      offset,
    };
  }

  /**
   * Get relationships for a mentor (paginated)
   */
  async getRelationshipsByMentor(
    mentorId: string,
    options: RelationshipQueryOptions = {}
  ): Promise<PaginatedResponse<MentorshipRelationshipWithDetails>> {
    const { status, limit = 20, offset = 0 } = options;

    let query = this.db('mentorship_relationships')
      .where({ mentor_id: mentorId });

    if (status) {
      query = query.where({ status });
    }

    // Get total count
    const countQuery = query.clone();
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count as string, 10);

    // Get relationships
    const relationships = await query
      .limit(limit)
      .offset(offset)
      .orderBy('started_at', 'desc');

    // Enrich with details
    const enriched: MentorshipRelationshipWithDetails[] = [];
    for (const rel of relationships) {
      const details = await this.getRelationshipWithDetails(rel.id);
      if (details) {
        enriched.push(details);
      }
    }

    return {
      data: enriched,
      total,
      limit,
      offset,
    };
  }

  /**
   * Get all relationships for a user (both as learner and mentor)
   */
  async getRelationshipsByUser(
    userId: string,
    options: RelationshipQueryOptions = {}
  ): Promise<PaginatedResponse<MentorshipRelationshipWithDetails>> {
    const { status, as_role, limit = 20, offset = 0 } = options;

    let query = this.db('mentorship_relationships')
      .where((builder) => {
        if (as_role === 'learner') {
          builder.where('learner_id', userId);
        } else if (as_role === 'mentor') {
          builder.where('mentor_id', userId);
        } else {
          builder.where('learner_id', userId).orWhere('mentor_id', userId);
        }
      });

    if (status) {
      query = query.where({ status });
    }

    // Get total count
    const countQuery = query.clone();
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count as string, 10);

    // Get relationships
    const relationships = await query
      .limit(limit)
      .offset(offset)
      .orderBy('started_at', 'desc');

    // Enrich with details
    const enriched: MentorshipRelationshipWithDetails[] = [];
    for (const rel of relationships) {
      const details = await this.getRelationshipWithDetails(rel.id);
      if (details) {
        enriched.push(details);
      }
    }

    return {
      data: enriched,
      total,
      limit,
      offset,
    };
  }

  /**
   * Update relationship details (goals, next session)
   */
  async updateRelationship(
    relationshipId: string,
    data: UpdateRelationshipInput
  ): Promise<MentorshipRelationship | null> {
    const updateData: any = {};

    if (data.goals !== undefined) updateData.goals = data.goals;
    if (data.next_session_at !== undefined) updateData.next_session_at = data.next_session_at;

    const [relationship] = await this.db('mentorship_relationships')
      .where({ id: relationshipId })
      .update(updateData)
      .returning('*');

    return relationship ? this.formatRelationship(relationship) : null;
  }

  /**
   * Terminate a relationship
   * Note: Mentor count is automatically decremented by database trigger
   */
  async terminateRelationship(
    relationshipId: string,
    initiatorId: string,
    reason: string
  ): Promise<MentorshipRelationship> {
    const relationship = await this.db('mentorship_relationships')
      .where({ id: relationshipId, status: 'active' })
      .first();

    if (!relationship) {
      throw new Error('Active relationship not found');
    }

    // Verify initiator is part of relationship
    if (
      relationship.learner_id !== initiatorId &&
      relationship.mentor_id !== initiatorId
    ) {
      throw new Error('You are not part of this relationship');
    }

    const [terminated] = await this.db('mentorship_relationships')
      .where({ id: relationshipId })
      .update({
        status: 'completed',
        ended_at: this.db.fn.now(),
        goals: relationship.goals
          ? `${relationship.goals}\n\n[Terminated by ${initiatorId === relationship.learner_id ? 'learner' : 'mentor'}]: ${reason}`
          : `[Terminated]: ${reason}`,
      })
      .returning('*');

    return this.formatRelationship(terminated);
  }

  /**
   * Get active relationship between learner and mentor
   */
  async getActiveRelationship(
    learnerId: string,
    mentorId: string
  ): Promise<MentorshipRelationship | null> {
    const relationship = await this.db('mentorship_relationships')
      .where({
        learner_id: learnerId,
        mentor_id: mentorId,
        status: 'active',
      })
      .first();

    return relationship ? this.formatRelationship(relationship) : null;
  }

  /**
   * Record a session (increment session counts)
   */
  async recordSession(
    relationshipId: string,
    data: RecordSessionInput
  ): Promise<MentorshipRelationship> {
    const relationship = await this.db('mentorship_relationships')
      .where({ id: relationshipId })
      .first();

    if (!relationship) {
      throw new Error('Relationship not found');
    }

    const updates: any = {
      completed_sessions_count: relationship.completed_sessions_count + 1,
      last_session_at: data.session_date ?? this.db.fn.now(),
    };

    if (data.scheduled) {
      updates.scheduled_sessions_count = relationship.scheduled_sessions_count + 1;
    }

    const [updated] = await this.db('mentorship_relationships')
      .where({ id: relationshipId })
      .update(updates)
      .returning('*');

    return this.formatRelationship(updated);
  }

  /**
   * Update relationship satisfaction ratings
   */
  async updateRatings(
    relationshipId: string,
    learnerRating?: number,
    mentorRating?: number
  ): Promise<void> {
    const updates: any = {};

    if (learnerRating !== undefined) {
      updates.learner_satisfaction_rating = learnerRating;
    }
    if (mentorRating !== undefined) {
      updates.mentor_satisfaction_rating = mentorRating;
    }

    await this.db('mentorship_relationships')
      .where({ id: relationshipId })
      .update(updates);
  }

  /**
   * Check if user is participant in relationship
   */
  async isRelationshipParticipant(relationshipId: string, userId: string): Promise<boolean> {
    const relationship = await this.db('mentorship_relationships')
      .where({ id: relationshipId })
      .where((builder) => {
        builder.where('learner_id', userId).orWhere('mentor_id', userId);
      })
      .first();

    return !!relationship;
  }

  /**
   * Format relationship from database row
   */
  private formatRelationship(row: any): MentorshipRelationship {
    return {
      id: row.id,
      learner_id: row.learner_id,
      mentor_id: row.mentor_id,
      request_id: row.request_id,
      subject_id: row.subject_id,
      goals: row.goals,
      status: row.status,
      scheduled_sessions_count: row.scheduled_sessions_count,
      completed_sessions_count: row.completed_sessions_count,
      last_session_at: row.last_session_at,
      next_session_at: row.next_session_at,
      learner_satisfaction_rating: row.learner_satisfaction_rating
        ? parseFloat(row.learner_satisfaction_rating)
        : null,
      mentor_satisfaction_rating: row.mentor_satisfaction_rating
        ? parseFloat(row.mentor_satisfaction_rating)
        : null,
      community_id: row.community_id,
      started_at: row.started_at,
      ended_at: row.ended_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
