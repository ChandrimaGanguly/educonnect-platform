import { Knex } from 'knex';
import { getDatabase } from '../../database';
import {
  MentorshipFeedback,
  SubmitFeedbackInput,
} from '../../types/mentorship.types';
import { MentorshipRelationshipService } from './mentorship-relationship.service';

export class MentorshipFeedbackService {
  private db: Knex;
  private relationshipService: MentorshipRelationshipService;

  constructor() {
    this.db = getDatabase();
    this.relationshipService = new MentorshipRelationshipService();
  }

  /**
   * Submit feedback for a mentorship relationship
   * Automatically updates relationship ratings
   */
  async submitFeedback(
    relationshipId: string,
    reviewerId: string,
    data: SubmitFeedbackInput
  ): Promise<MentorshipFeedback> {
    // Get relationship and validate reviewer is part of it
    const relationship = await this.relationshipService.getRelationship(relationshipId);
    if (!relationship) {
      throw new Error('Relationship not found');
    }

    // Determine reviewer role
    let reviewerRole: 'learner' | 'mentor';
    if (relationship.learner_id === reviewerId) {
      reviewerRole = 'learner';
    } else if (relationship.mentor_id === reviewerId) {
      reviewerRole = 'mentor';
    } else {
      throw new Error('You are not part of this relationship');
    }

    // Validate ratings are in range (1.0-5.0)
    this.validateRating(data.overall_rating, 'overall_rating');
    if (data.communication_rating !== undefined) {
      this.validateRating(data.communication_rating, 'communication_rating');
    }
    if (data.expertise_rating !== undefined) {
      this.validateRating(data.expertise_rating, 'expertise_rating');
    }
    if (data.availability_rating !== undefined) {
      this.validateRating(data.availability_rating, 'availability_rating');
    }

    // Check if feedback already exists from this reviewer
    const existing = await this.db('mentorship_feedback')
      .where({
        relationship_id: relationshipId,
        reviewer_id: reviewerId,
      })
      .first();

    if (existing) {
      throw new Error('You have already submitted feedback for this relationship');
    }

    // Create feedback
    const [feedback] = await this.db('mentorship_feedback')
      .insert({
        relationship_id: relationshipId,
        reviewer_id: reviewerId,
        reviewer_role: reviewerRole,
        overall_rating: data.overall_rating,
        communication_rating: data.communication_rating,
        expertise_rating: data.expertise_rating,
        availability_rating: data.availability_rating,
        feedback_text: data.feedback_text,
        would_recommend: data.would_recommend,
      })
      .returning('*');

    // Update relationship ratings
    if (reviewerRole === 'learner') {
      await this.relationshipService.updateRatings(
        relationshipId,
        data.overall_rating,
        undefined
      );
    } else {
      await this.relationshipService.updateRatings(
        relationshipId,
        undefined,
        data.overall_rating
      );
    }

    return this.formatFeedback(feedback);
  }

  /**
   * Get all feedback for a relationship
   */
  async getFeedbackForRelationship(relationshipId: string): Promise<MentorshipFeedback[]> {
    const feedback = await this.db('mentorship_feedback')
      .where({ relationship_id: relationshipId })
      .orderBy('created_at', 'desc');

    return feedback.map(this.formatFeedback);
  }

  /**
   * Get average feedback ratings for a mentor
   * Used to display mentor's overall performance
   */
  async getAverageFeedbackForMentor(mentorId: string): Promise<{
    overall_rating: number;
    communication_rating: number;
    expertise_rating: number;
    availability_rating: number;
    total_feedback_count: number;
    recommendation_percentage: number;
  }> {
    // Get all feedback for this mentor
    const feedback = await this.db('mentorship_feedback as mf')
      .join('mentorship_relationships as mr', 'mf.relationship_id', 'mr.id')
      .where('mr.mentor_id', mentorId)
      .where('mf.reviewer_role', 'learner') // Only count learner feedback
      .select(
        this.db.raw('AVG(mf.overall_rating) as avg_overall'),
        this.db.raw('AVG(mf.communication_rating) as avg_communication'),
        this.db.raw('AVG(mf.expertise_rating) as avg_expertise'),
        this.db.raw('AVG(mf.availability_rating) as avg_availability'),
        this.db.raw('COUNT(*) as total_count'),
        this.db.raw(
          'COUNT(CASE WHEN mf.would_recommend = true THEN 1 END) as recommend_count'
        )
      )
      .first();

    if (!feedback || feedback.total_count === 0) {
      return {
        overall_rating: 0,
        communication_rating: 0,
        expertise_rating: 0,
        availability_rating: 0,
        total_feedback_count: 0,
        recommendation_percentage: 0,
      };
    }

    const totalCount = parseInt(feedback.total_count, 10);
    const recommendCount = parseInt(feedback.recommend_count, 10);

    return {
      overall_rating: feedback.avg_overall ? parseFloat(feedback.avg_overall) : 0,
      communication_rating: feedback.avg_communication
        ? parseFloat(feedback.avg_communication)
        : 0,
      expertise_rating: feedback.avg_expertise ? parseFloat(feedback.avg_expertise) : 0,
      availability_rating: feedback.avg_availability
        ? parseFloat(feedback.avg_availability)
        : 0,
      total_feedback_count: totalCount,
      recommendation_percentage: totalCount > 0 ? (recommendCount / totalCount) * 100 : 0,
    };
  }

  /**
   * Get feedback submitted by a user
   */
  async getFeedbackByReviewer(reviewerId: string): Promise<MentorshipFeedback[]> {
    const feedback = await this.db('mentorship_feedback')
      .where({ reviewer_id: reviewerId })
      .orderBy('created_at', 'desc');

    return feedback.map(this.formatFeedback);
  }

  /**
   * Check if user has submitted feedback for a relationship
   */
  async hasFeedback(relationshipId: string, reviewerId: string): Promise<boolean> {
    const feedback = await this.db('mentorship_feedback')
      .where({
        relationship_id: relationshipId,
        reviewer_id: reviewerId,
      })
      .first();

    return !!feedback;
  }

  /**
   * Validate rating is in valid range (1.0-5.0)
   */
  private validateRating(rating: number, fieldName: string): void {
    if (rating < 1.0 || rating > 5.0) {
      throw new Error(`${fieldName} must be between 1.0 and 5.0`);
    }
  }

  /**
   * Format feedback from database row
   */
  private formatFeedback(row: any): MentorshipFeedback {
    return {
      id: row.id,
      relationship_id: row.relationship_id,
      reviewer_id: row.reviewer_id,
      reviewer_role: row.reviewer_role,
      overall_rating: parseFloat(row.overall_rating),
      communication_rating: row.communication_rating
        ? parseFloat(row.communication_rating)
        : null,
      expertise_rating: row.expertise_rating ? parseFloat(row.expertise_rating) : null,
      availability_rating: row.availability_rating
        ? parseFloat(row.availability_rating)
        : null,
      feedback_text: row.feedback_text,
      would_recommend: row.would_recommend,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
