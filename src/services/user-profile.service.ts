import { Knex } from 'knex';
import { getDatabase } from '../database';

export interface UserSkill {
  id: string;
  user_id: string;
  skill_name: string;
  category: string;
  proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  is_self_assessed: boolean;
  is_validated: boolean;
  validated_by?: string;
  validated_at?: Date;
  endorsement_count: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserInterest {
  id: string;
  user_id: string;
  interest_name: string;
  category: string;
  interest_type: 'learning' | 'teaching' | 'both';
  priority: number;
  created_at: Date;
  updated_at: Date;
}

export interface UserEducation {
  id: string;
  user_id: string;
  institution: string;
  degree?: string;
  field_of_study?: string;
  start_year?: number;
  end_year?: number;
  is_current: boolean;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserAvailability {
  id: string;
  user_id: string;
  day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSkillData {
  skill_name: string;
  category: string;
  proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  notes?: string;
}

export interface CreateInterestData {
  interest_name: string;
  category: string;
  interest_type: 'learning' | 'teaching' | 'both';
  priority?: number;
}

export interface CreateEducationData {
  institution: string;
  degree?: string;
  field_of_study?: string;
  start_year?: number;
  end_year?: number;
  is_current?: boolean;
  description?: string;
}

export interface CreateAvailabilityData {
  day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  start_time: string;
  end_time: string;
}

export class UserProfileService {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  // ========== Skills Management ==========

  /**
   * Add a skill to user profile
   */
  async addSkill(userId: string, data: CreateSkillData): Promise<UserSkill> {
    const [skill] = await this.db('user_skills')
      .insert({
        user_id: userId,
        skill_name: data.skill_name,
        category: data.category,
        proficiency_level: data.proficiency_level,
        notes: data.notes,
        is_self_assessed: true,
        is_validated: false,
      })
      .returning('*');

    return skill;
  }

  /**
   * Get all skills for a user
   */
  async getUserSkills(userId: string): Promise<UserSkill[]> {
    const skills = await this.db('user_skills')
      .where({ user_id: userId })
      .orderBy('category')
      .orderBy('skill_name');

    return skills;
  }

  /**
   * Get user skills by category
   */
  async getUserSkillsByCategory(userId: string, category: string): Promise<UserSkill[]> {
    const skills = await this.db('user_skills')
      .where({ user_id: userId, category })
      .orderBy('skill_name');

    return skills;
  }

  /**
   * Update a skill
   */
  async updateSkill(skillId: string, data: Partial<CreateSkillData>): Promise<UserSkill> {
    const [skill] = await this.db('user_skills')
      .where({ id: skillId })
      .update(data)
      .returning('*');

    return skill;
  }

  /**
   * Validate a skill (by another user, e.g., mentor)
   */
  async validateSkill(skillId: string, validatorId: string): Promise<UserSkill> {
    const [skill] = await this.db('user_skills')
      .where({ id: skillId })
      .update({
        is_validated: true,
        validated_by: validatorId,
        validated_at: this.db.fn.now(),
      })
      .returning('*');

    return skill;
  }

  /**
   * Endorse a skill (increment endorsement count)
   */
  async endorseSkill(skillId: string): Promise<UserSkill> {
    const [skill] = await this.db('user_skills')
      .where({ id: skillId })
      .increment('endorsement_count', 1)
      .returning('*');

    return skill;
  }

  /**
   * Delete a skill
   */
  async deleteSkill(skillId: string): Promise<void> {
    await this.db('user_skills').where({ id: skillId }).delete();
  }

  // ========== Interests Management ==========

  /**
   * Add an interest to user profile
   */
  async addInterest(userId: string, data: CreateInterestData): Promise<UserInterest> {
    const [interest] = await this.db('user_interests')
      .insert({
        user_id: userId,
        interest_name: data.interest_name,
        category: data.category,
        interest_type: data.interest_type,
        priority: data.priority || 1,
      })
      .returning('*');

    return interest;
  }

  /**
   * Get all interests for a user
   */
  async getUserInterests(userId: string): Promise<UserInterest[]> {
    const interests = await this.db('user_interests')
      .where({ user_id: userId })
      .orderBy('priority', 'desc')
      .orderBy('category')
      .orderBy('interest_name');

    return interests;
  }

  /**
   * Get user interests by type
   */
  async getUserInterestsByType(userId: string, type: 'learning' | 'teaching' | 'both'): Promise<UserInterest[]> {
    const interests = await this.db('user_interests')
      .where({ user_id: userId })
      .whereIn('interest_type', [type, 'both'])
      .orderBy('priority', 'desc');

    return interests;
  }

  /**
   * Update an interest
   */
  async updateInterest(interestId: string, data: Partial<CreateInterestData>): Promise<UserInterest> {
    const [interest] = await this.db('user_interests')
      .where({ id: interestId })
      .update(data)
      .returning('*');

    return interest;
  }

  /**
   * Delete an interest
   */
  async deleteInterest(interestId: string): Promise<void> {
    await this.db('user_interests').where({ id: interestId }).delete();
  }

  // ========== Education Management ==========

  /**
   * Add education to user profile
   */
  async addEducation(userId: string, data: CreateEducationData): Promise<UserEducation> {
    const [education] = await this.db('user_education')
      .insert({
        user_id: userId,
        ...data,
      })
      .returning('*');

    return education;
  }

  /**
   * Get all education for a user
   */
  async getUserEducation(userId: string): Promise<UserEducation[]> {
    const education = await this.db('user_education')
      .where({ user_id: userId })
      .orderBy('is_current', 'desc')
      .orderBy('end_year', 'desc');

    return education;
  }

  /**
   * Update education
   */
  async updateEducation(educationId: string, data: Partial<CreateEducationData>): Promise<UserEducation> {
    const [education] = await this.db('user_education')
      .where({ id: educationId })
      .update(data)
      .returning('*');

    return education;
  }

  /**
   * Delete education
   */
  async deleteEducation(educationId: string): Promise<void> {
    await this.db('user_education').where({ id: educationId }).delete();
  }

  // ========== Availability Management ==========

  /**
   * Add availability slot
   */
  async addAvailability(userId: string, data: CreateAvailabilityData): Promise<UserAvailability> {
    const [availability] = await this.db('user_availability')
      .insert({
        user_id: userId,
        ...data,
        is_active: true,
      })
      .returning('*');

    return availability;
  }

  /**
   * Get all availability for a user
   */
  async getUserAvailability(userId: string): Promise<UserAvailability[]> {
    const availability = await this.db('user_availability')
      .where({ user_id: userId, is_active: true })
      .orderByRaw(`
        CASE day_of_week
          WHEN 'monday' THEN 1
          WHEN 'tuesday' THEN 2
          WHEN 'wednesday' THEN 3
          WHEN 'thursday' THEN 4
          WHEN 'friday' THEN 5
          WHEN 'saturday' THEN 6
          WHEN 'sunday' THEN 7
        END
      `)
      .orderBy('start_time');

    return availability;
  }

  /**
   * Get availability for a specific day
   */
  async getUserAvailabilityByDay(userId: string, dayOfWeek: string): Promise<UserAvailability[]> {
    const availability = await this.db('user_availability')
      .where({ user_id: userId, day_of_week: dayOfWeek, is_active: true })
      .orderBy('start_time');

    return availability;
  }

  /**
   * Update availability
   */
  async updateAvailability(availabilityId: string, data: Partial<CreateAvailabilityData>): Promise<UserAvailability> {
    const [availability] = await this.db('user_availability')
      .where({ id: availabilityId })
      .update(data)
      .returning('*');

    return availability;
  }

  /**
   * Delete availability (soft delete by setting is_active to false)
   */
  async deleteAvailability(availabilityId: string): Promise<void> {
    await this.db('user_availability')
      .where({ id: availabilityId })
      .update({ is_active: false });
  }

  /**
   * Get complete user profile
   */
  async getCompleteProfile(userId: string) {
    const [skills, interests, education, availability] = await Promise.all([
      this.getUserSkills(userId),
      this.getUserInterests(userId),
      this.getUserEducation(userId),
      this.getUserAvailability(userId),
    ]);

    return {
      skills,
      interests,
      education,
      availability,
    };
  }
}
