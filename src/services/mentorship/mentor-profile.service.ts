import { Knex } from 'knex';
import { getDatabase } from '../../database';
import {
  MentorProfile,
  MentorProfileWithDetails,
  CreateMentorProfileInput,
  UpdateMentorProfileInput,
  UpdateMentorStatusInput,
  MentorSearchOptions,
  PaginatedResponse,
  CapacityCheck,
} from '../../types/mentorship.types';

export class MentorProfileService {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * Create a mentor profile for a user
   * Sets initial status to 'available' and current_mentees to 0
   */
  async createMentorProfile(
    userId: string,
    data: CreateMentorProfileInput
  ): Promise<MentorProfile> {
    // Validate max_mentees doesn't exceed platform limit
    const maxMentees = data.max_mentees ?? 3;
    if (maxMentees > 10) {
      throw new Error('max_mentees cannot exceed 10');
    }

    // Check if mentor profile already exists
    const existing = await this.db('mentor_profiles')
      .where({ user_id: userId })
      .first();

    if (existing) {
      throw new Error('Mentor profile already exists for this user');
    }

    const [profile] = await this.db('mentor_profiles')
      .insert({
        user_id: userId,
        mentor_status: 'available',
        max_mentees: maxMentees,
        current_mentees: 0,
        subjects: data.subjects ? JSON.stringify(data.subjects) : null,
        bio: data.bio,
        preferred_session_duration: data.preferred_session_duration,
        response_time_hours: data.response_time_hours ?? 48,
        community_id: data.community_id,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        mentoring_since: this.db.fn.now(),
      })
      .returning('*');

    return this.formatMentorProfile(profile);
  }

  /**
   * Get mentor profile by user ID
   */
  async getMentorProfile(userId: string): Promise<MentorProfile | null> {
    const profile = await this.db('mentor_profiles')
      .where({ user_id: userId })
      .first();

    return profile ? this.formatMentorProfile(profile) : null;
  }

  /**
   * Get mentor profile with full user details, skills, and availability
   */
  async getMentorProfileWithDetails(userId: string): Promise<MentorProfileWithDetails | null> {
    const profile = await this.getMentorProfile(userId);
    if (!profile) {
      return null;
    }

    // Get user basic info
    const user = await this.db('users')
      .where({ id: userId })
      .select('full_name', 'avatar_url', 'trust_score')
      .first();

    if (!user) {
      return null;
    }

    // Get user skills
    const skills = await this.db('user_skills')
      .where({ user_id: userId })
      .select('skill_name', 'proficiency_level')
      .orderBy('proficiency_level', 'desc');

    // Get user availability
    const availability = await this.db('user_availability')
      .where({ user_id: userId, is_active: true })
      .select('day_of_week', 'start_time', 'end_time')
      .orderBy('day_of_week');

    return {
      ...profile,
      user: {
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        trust_score: user.trust_score,
      },
      skills: skills || [],
      availability: availability || [],
    };
  }

  /**
   * Update mentor profile (atomic ownership check)
   */
  async updateMentorProfile(
    userId: string,
    data: UpdateMentorProfileInput
  ): Promise<MentorProfile | null> {
    // Validate max_mentees if provided
    if (data.max_mentees !== undefined && data.max_mentees > 10) {
      throw new Error('max_mentees cannot exceed 10');
    }

    const updateData: any = {};

    if (data.max_mentees !== undefined) updateData.max_mentees = data.max_mentees;
    if (data.subjects !== undefined) updateData.subjects = JSON.stringify(data.subjects);
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.preferred_session_duration !== undefined) {
      updateData.preferred_session_duration = data.preferred_session_duration;
    }
    if (data.response_time_hours !== undefined) {
      updateData.response_time_hours = data.response_time_hours;
    }
    if (data.metadata !== undefined) updateData.metadata = JSON.stringify(data.metadata);

    const [profile] = await this.db('mentor_profiles')
      .where({ user_id: userId })
      .update(updateData)
      .returning('*');

    return profile ? this.formatMentorProfile(profile) : null;
  }

  /**
   * Update mentor availability status
   */
  async updateMentorStatus(
    userId: string,
    data: UpdateMentorStatusInput
  ): Promise<MentorProfile | null> {
    const [profile] = await this.db('mentor_profiles')
      .where({ user_id: userId })
      .update({ mentor_status: data.mentor_status })
      .returning('*');

    return profile ? this.formatMentorProfile(profile) : null;
  }

  /**
   * Search for mentors with filters and pagination
   */
  async searchMentors(
    options: MentorSearchOptions = {}
  ): Promise<PaginatedResponse<MentorProfileWithDetails>> {
    const {
      subject_id,
      mentor_status = 'available',
      community_id,
      limit = 20,
      offset = 0,
    } = options;

    // Build query for mentor profiles
    let query = this.db('mentor_profiles')
      .where('mentor_status', mentor_status);

    // Filter by community if specified
    if (community_id !== undefined) {
      if (community_id === null) {
        query = query.whereNull('community_id');
      } else {
        query = query.where('community_id', community_id);
      }
    }

    // Filter by subject if specified
    if (subject_id) {
      query = query.whereRaw('subjects @> ?', [JSON.stringify([subject_id])]);
    }

    // Get total count
    const countQuery = query.clone();
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count as string, 10);

    // Get mentor profiles
    const profiles = await query
      .limit(limit)
      .offset(offset)
      .orderBy('total_mentees_helped', 'desc');

    // Enrich each profile with details
    const enrichedProfiles: MentorProfileWithDetails[] = [];
    for (const profile of profiles) {
      const details = await this.getMentorProfileWithDetails(profile.user_id);
      if (details) {
        enrichedProfiles.push(details);
      }
    }

    return {
      data: enrichedProfiles,
      total,
      limit,
      offset,
    };
  }

  /**
   * Increment mentor's current mentee count (atomic operation)
   * Called when a mentorship relationship becomes active
   */
  async incrementMenteeCount(mentorId: string): Promise<void> {
    await this.db('mentor_profiles')
      .where({ user_id: mentorId })
      .increment('current_mentees', 1);
  }

  /**
   * Decrement mentor's current mentee count (atomic operation)
   * Called when a mentorship relationship ends
   */
  async decrementMenteeCount(mentorId: string): Promise<void> {
    await this.db('mentor_profiles')
      .where({ user_id: mentorId })
      .decrement('current_mentees', 1);
  }

  /**
   * Check if mentor has capacity to accept more mentees
   */
  async checkCapacity(mentorId: string): Promise<CapacityCheck> {
    const profile = await this.db('mentor_profiles')
      .where({ user_id: mentorId })
      .first();

    if (!profile) {
      throw new Error('Mentor profile not found');
    }

    const canAccept = profile.current_mentees < profile.max_mentees;
    const availableSlots = profile.max_mentees - profile.current_mentees;

    return {
      can_accept_mentees: canAccept,
      current_mentees: profile.current_mentees,
      max_mentees: profile.max_mentees,
      available_slots: Math.max(0, availableSlots),
    };
  }

  /**
   * Get mentor profile by ID (for internal use)
   */
  async getMentorProfileById(id: string): Promise<MentorProfile | null> {
    const profile = await this.db('mentor_profiles')
      .where({ id })
      .first();

    return profile ? this.formatMentorProfile(profile) : null;
  }

  /**
   * Get mentors count with optional filters
   */
  async getMentorsCount(
    mentorStatus?: MentorProfile['mentor_status'],
    communityId?: string
  ): Promise<number> {
    const query = this.db('mentor_profiles');

    if (mentorStatus) {
      query.where('mentor_status', mentorStatus);
    }

    if (communityId !== undefined) {
      if (communityId === null) {
        query.whereNull('community_id');
      } else {
        query.where('community_id', communityId);
      }
    }

    const [{ count }] = await query.count('* as count');
    return parseInt(count as string, 10);
  }

  /**
   * Format mentor profile from database row
   * Converts JSONB strings back to objects/arrays
   */
  private formatMentorProfile(row: any): MentorProfile {
    return {
      id: row.id,
      user_id: row.user_id,
      mentor_status: row.mentor_status,
      max_mentees: row.max_mentees,
      current_mentees: row.current_mentees,
      mentoring_since: row.mentoring_since,
      total_mentees_helped: row.total_mentees_helped,
      subjects: row.subjects ? (typeof row.subjects === 'string' ? JSON.parse(row.subjects) : row.subjects) : null,
      bio: row.bio,
      preferred_session_duration: row.preferred_session_duration,
      response_time_hours: row.response_time_hours,
      community_id: row.community_id,
      metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
