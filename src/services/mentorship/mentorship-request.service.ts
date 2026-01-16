import { Knex } from 'knex';
import { getDatabase } from '../../database';
import {
  MentorshipRequest,
  MentorshipRequestWithDetails,
  CreateMentorshipRequestInput,
  RespondToRequestInput,
  RequestQueryOptions,
  PaginatedResponse,
} from '../../types/mentorship.types';
import { MentorProfileService } from './mentor-profile.service';

export class MentorshipRequestService {
  private db: Knex;
  private mentorProfileService: MentorProfileService;

  constructor() {
    this.db = getDatabase();
    this.mentorProfileService = new MentorProfileService();
  }

  /**
   * Create a mentorship request from learner to mentor
   * Validates mentor capacity before creating request
   */
  async createRequest(
    learnerId: string,
    data: CreateMentorshipRequestInput,
    matchScore?: { compatibility_score: number; match_factors: Record<string, unknown> }
  ): Promise<MentorshipRequest> {
    // Check if mentor has capacity
    const capacity = await this.mentorProfileService.checkCapacity(data.mentor_id);
    if (!capacity.can_accept_mentees) {
      throw new Error('Mentor has reached maximum mentee capacity');
    }

    // Check if there's already a pending request
    const existingRequest = await this.db('mentorship_requests')
      .where({
        learner_id: learnerId,
        mentor_id: data.mentor_id,
        status: 'pending',
      })
      .first();

    if (existingRequest) {
      throw new Error('You already have a pending request to this mentor');
    }

    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const [request] = await this.db('mentorship_requests')
      .insert({
        learner_id: learnerId,
        mentor_id: data.mentor_id,
        subject_id: data.subject_id,
        message: data.message,
        urgency: data.urgency ?? 'normal',
        compatibility_score: matchScore?.compatibility_score,
        match_factors: matchScore?.match_factors ? JSON.stringify(matchScore.match_factors) : null,
        status: 'pending',
        expires_at: expiresAt,
        community_id: data.community_id,
      })
      .returning('*');

    return this.formatRequest(request);
  }

  /**
   * Get a single request by ID
   */
  async getRequest(requestId: string): Promise<MentorshipRequest | null> {
    const request = await this.db('mentorship_requests')
      .where({ id: requestId })
      .first();

    return request ? this.formatRequest(request) : null;
  }

  /**
   * Get request with user details
   */
  async getRequestWithDetails(requestId: string): Promise<MentorshipRequestWithDetails | null> {
    const request = await this.getRequest(requestId);
    if (!request) {
      return null;
    }

    // Get learner and mentor info
    const [learner, mentor] = await Promise.all([
      this.db('users')
        .where({ id: request.learner_id })
        .select('full_name', 'avatar_url', 'trust_score')
        .first(),
      this.db('users')
        .where({ id: request.mentor_id })
        .select('full_name', 'avatar_url', 'trust_score')
        .first(),
    ]);

    if (!learner || !mentor) {
      return null;
    }

    return {
      ...request,
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
   * Get all requests sent by a learner (paginated)
   */
  async getRequestsByLearner(
    learnerId: string,
    options: RequestQueryOptions = {}
  ): Promise<PaginatedResponse<MentorshipRequestWithDetails>> {
    const { status, limit = 20, offset = 0 } = options;

    let query = this.db('mentorship_requests')
      .where({ learner_id: learnerId });

    if (status) {
      query = query.where({ status });
    }

    // Get total count
    const countQuery = query.clone();
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count as string, 10);

    // Get requests
    const requests = await query
      .limit(limit)
      .offset(offset)
      .orderBy('created_at', 'desc');

    // Enrich with details
    const enrichedRequests: MentorshipRequestWithDetails[] = [];
    for (const request of requests) {
      const details = await this.getRequestWithDetails(request.id);
      if (details) {
        enrichedRequests.push(details);
      }
    }

    return {
      data: enrichedRequests,
      total,
      limit,
      offset,
    };
  }

  /**
   * Get all requests received by a mentor (paginated)
   */
  async getRequestsByMentor(
    mentorId: string,
    options: RequestQueryOptions = {}
  ): Promise<PaginatedResponse<MentorshipRequestWithDetails>> {
    const { status, limit = 20, offset = 0 } = options;

    let query = this.db('mentorship_requests')
      .where({ mentor_id: mentorId });

    if (status) {
      query = query.where({ status });
    }

    // Get total count
    const countQuery = query.clone();
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count as string, 10);

    // Get requests
    const requests = await query
      .limit(limit)
      .offset(offset)
      .orderBy('created_at', 'desc');

    // Enrich with details
    const enrichedRequests: MentorshipRequestWithDetails[] = [];
    for (const request of requests) {
      const details = await this.getRequestWithDetails(request.id);
      if (details) {
        enrichedRequests.push(details);
      }
    }

    return {
      data: enrichedRequests,
      total,
      limit,
      offset,
    };
  }

  /**
   * Mentor responds to a request (accept or decline)
   * If accepted, creates mentorship relationship (handled by relationship service)
   */
  async respondToRequest(
    requestId: string,
    mentorId: string,
    response: RespondToRequestInput
  ): Promise<MentorshipRequest> {
    // Verify request exists and is for this mentor
    const request = await this.db('mentorship_requests')
      .where({ id: requestId, mentor_id: mentorId, status: 'pending' })
      .first();

    if (!request) {
      throw new Error('Request not found or already responded');
    }

    // Check if request has expired
    if (request.expires_at && new Date(request.expires_at) < new Date()) {
      throw new Error('Request has expired');
    }

    // If accepting, check mentor still has capacity
    if (response.status === 'accepted') {
      const capacity = await this.mentorProfileService.checkCapacity(mentorId);
      if (!capacity.can_accept_mentees) {
        throw new Error('You have reached your maximum mentee capacity');
      }
    }

    // Update request
    const [updatedRequest] = await this.db('mentorship_requests')
      .where({ id: requestId })
      .update({
        status: response.status,
        response_message: response.response_message,
        responded_at: this.db.fn.now(),
      })
      .returning('*');

    return this.formatRequest(updatedRequest);
  }

  /**
   * Learner cancels their pending request
   */
  async cancelRequest(requestId: string, learnerId: string): Promise<MentorshipRequest> {
    const request = await this.db('mentorship_requests')
      .where({ id: requestId, learner_id: learnerId, status: 'pending' })
      .first();

    if (!request) {
      throw new Error('Request not found or already processed');
    }

    const [updatedRequest] = await this.db('mentorship_requests')
      .where({ id: requestId })
      .update({ status: 'cancelled' })
      .returning('*');

    return this.formatRequest(updatedRequest);
  }

  /**
   * Batch expire old pending requests (called by background job)
   * Returns count of expired requests
   */
  async expireOldRequests(): Promise<number> {
    const result = await this.db('mentorship_requests')
      .where({ status: 'pending' })
      .where('expires_at', '<', this.db.fn.now())
      .update({ status: 'expired' });

    return result;
  }

  /**
   * Get count of pending requests for a mentor (for notifications)
   */
  async getPendingRequestCount(mentorId: string): Promise<number> {
    const [{ count }] = await this.db('mentorship_requests')
      .where({ mentor_id: mentorId, status: 'pending' })
      .count('* as count');

    return parseInt(count as string, 10);
  }

  /**
   * Check if user owns the request (as learner or mentor)
   */
  async isRequestParticipant(requestId: string, userId: string): Promise<boolean> {
    const request = await this.db('mentorship_requests')
      .where({ id: requestId })
      .where((builder) => {
        builder.where('learner_id', userId).orWhere('mentor_id', userId);
      })
      .first();

    return !!request;
  }

  /**
   * Format request from database row
   */
  private formatRequest(row: any): MentorshipRequest {
    return {
      id: row.id,
      learner_id: row.learner_id,
      mentor_id: row.mentor_id,
      subject_id: row.subject_id,
      message: row.message,
      urgency: row.urgency,
      compatibility_score: row.compatibility_score ? parseFloat(row.compatibility_score) : null,
      match_factors: row.match_factors ? (typeof row.match_factors === 'string' ? JSON.parse(row.match_factors) : row.match_factors) : null,
      status: row.status,
      response_message: row.response_message,
      responded_at: row.responded_at,
      expires_at: row.expires_at,
      community_id: row.community_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
