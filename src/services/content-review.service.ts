import { Knex } from 'knex';
import { getDatabase } from '../database';
import crypto from 'crypto';

// ============ Type Definitions ============

export type ReviewerType =
  | 'peer_reviewer'
  | 'subject_expert'
  | 'pedagogy_reviewer'
  | 'accessibility_reviewer'
  | 'editorial_reviewer'
  | 'senior_reviewer';

export type ReviewerStatus = 'pending' | 'active' | 'inactive' | 'suspended';

export type SubmissionStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'changes_requested'
  | 'resubmitted'
  | 'approved'
  | 'rejected'
  | 'withdrawn';

export type ReviewStage =
  | 'peer_review'
  | 'technical_accuracy'
  | 'pedagogical_quality'
  | 'accessibility_check'
  | 'plagiarism_check'
  | 'editorial_review'
  | 'final_approval';

export type ReviewType =
  | 'peer_review'
  | 'technical_accuracy'
  | 'pedagogical_quality'
  | 'accessibility_review'
  | 'editorial_review'
  | 'final_approval'
  | 'appeal_review';

export type ReviewStatus =
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'declined'
  | 'reassigned'
  | 'expired';

export type ReviewDecision =
  | 'approve'
  | 'approve_with_changes'
  | 'request_changes'
  | 'reject'
  | 'escalate';

export type ContentType = 'domain' | 'subject' | 'course' | 'module' | 'lesson' | 'resource';

export type CommentType =
  | 'suggestion'
  | 'issue'
  | 'question'
  | 'praise'
  | 'required_change'
  | 'optional_improvement';

export type CommentSeverity = 'info' | 'minor' | 'major' | 'critical';

export type CommentStatus = 'open' | 'acknowledged' | 'resolved' | 'wont_fix' | 'deferred';

export type AppealType =
  | 'factual_error'
  | 'policy_misapplication'
  | 'bias_concern'
  | 'new_information'
  | 'procedural_issue'
  | 'other';

export type AppealStatus =
  | 'submitted'
  | 'under_review'
  | 'additional_info_requested'
  | 'decided'
  | 'withdrawn';

export type AppealDecision = 'upheld' | 'overturned' | 'partially_overturned' | 'remanded';

export interface ContentReviewer {
  id: string;
  user_id: string;
  community_id: string | null;
  reviewer_type: ReviewerType;
  expertise_domains: string[];
  expertise_subjects: string[];
  expertise_tags: string[];
  status: ReviewerStatus;
  max_active_reviews: number;
  current_active_reviews: number;
  available_for_assignment: boolean;
  total_reviews_completed: number;
  reviews_on_time: number;
  average_review_quality: number;
  consistency_score: number;
  appeal_reversal_count: number;
  training_completed_at: Date | null;
  certification_expires_at: Date | null;
  training_modules_completed: any;
  metadata: any;
  created_at: Date;
  updated_at: Date;
  approved_by: string | null;
}

export interface ContentReviewSubmission {
  id: string;
  content_type: ContentType;
  content_id: string;
  submitted_by: string;
  community_id: string;
  title: string;
  description: string | null;
  version: number;
  previous_submission_id: string | null;
  status: SubmissionStatus;
  current_stage: ReviewStage;
  required_approvals: number;
  current_approvals: number;
  completed_stages: ReviewStage[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  due_date: Date | null;
  sla_deadline: Date | null;
  plagiarism_check_completed: boolean;
  plagiarism_score: number | null;
  accessibility_check_completed: boolean;
  accessibility_score: number | null;
  auto_checks_passed: boolean;
  content_snapshot: any;
  content_hash: string | null;
  metadata: any;
  submission_notes: string | null;
  created_at: Date;
  updated_at: Date;
  submitted_at: Date | null;
  completed_at: Date | null;
}

export interface ContentReview {
  id: string;
  submission_id: string;
  reviewer_id: string;
  assigned_by: string | null;
  review_type: ReviewType;
  status: ReviewStatus;
  decision: ReviewDecision | null;
  feedback: string | null;
  detailed_feedback: any;
  checklist_responses: any;
  quality_score: number | null;
  issue_categories: string[];
  issues: any;
  assigned_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
  due_date: Date | null;
  time_spent_minutes: number | null;
  review_quality_score: number | null;
  quality_reviewed_by: string | null;
  quality_review_notes: string | null;
  metadata: any;
  created_at: Date;
  updated_at: Date;
}

export interface ReviewComment {
  id: string;
  review_id: string;
  location_type: string | null;
  location_ref: string | null;
  line_start: number | null;
  line_end: number | null;
  comment: string;
  comment_type: CommentType;
  severity: CommentSeverity;
  status: CommentStatus;
  resolution_note: string | null;
  resolved_by: string | null;
  resolved_at: Date | null;
  parent_comment_id: string | null;
  thread_depth: number;
  metadata: any;
  created_at: Date;
  updated_at: Date;
}

export interface PlagiarismCheck {
  id: string;
  submission_id: string;
  check_type: 'full' | 'incremental' | 'quick';
  check_settings: any;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  overall_similarity_score: number | null;
  highest_match_score: number | null;
  total_matches_found: number;
  matches: any;
  exclusions: any;
  requires_human_review: boolean;
  reviewed_by: string | null;
  review_decision: 'cleared' | 'violation' | 'partial_violation' | null;
  review_notes: string | null;
  processing_time_ms: number | null;
  service_version: string | null;
  error_details: any;
  created_at: Date;
  completed_at: Date | null;
}

export interface AccessibilityCheck {
  id: string;
  submission_id: string;
  wcag_level: string;
  check_settings: any;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  passed: boolean;
  compliance_score: number | null;
  critical_issues: number;
  serious_issues: number;
  moderate_issues: number;
  minor_issues: number;
  issues: any;
  checks_performed: any;
  checks_passed: any;
  checks_failed: any;
  processing_time_ms: number | null;
  service_version: string | null;
  error_details: any;
  created_at: Date;
  completed_at: Date | null;
}

export interface ReviewAppeal {
  id: string;
  submission_id: string;
  original_review_id: string | null;
  appealed_by: string;
  appeal_reason: string;
  supporting_evidence: any;
  appeal_type: AppealType;
  status: AppealStatus;
  reviewed_by: string | null;
  decision: AppealDecision | null;
  decision_rationale: string | null;
  sla_deadline: Date | null;
  sla_met: boolean | null;
  metadata: any;
  created_at: Date;
  updated_at: Date;
  decided_at: Date | null;
}

export interface ReviewWorkflowHistory {
  id: string;
  submission_id: string;
  action: string;
  actor_id: string | null;
  actor_type: 'user' | 'system' | 'automated';
  from_status: string | null;
  to_status: string | null;
  from_stage: string | null;
  to_stage: string | null;
  description: string | null;
  details: any;
  metadata: any;
  created_at: Date;
}

// ============ Input Types ============

export interface CreateReviewerInput {
  user_id: string;
  community_id?: string;
  reviewer_type: ReviewerType;
  expertise_domains?: string[];
  expertise_subjects?: string[];
  expertise_tags?: string[];
  max_active_reviews?: number;
}

export interface CreateSubmissionInput {
  content_type: ContentType;
  content_id: string;
  submitted_by: string;
  community_id: string;
  title: string;
  description?: string;
  content_snapshot?: any;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  submission_notes?: string;
  required_approvals?: number;
}

export interface CreateReviewInput {
  submission_id: string;
  reviewer_id: string;
  assigned_by?: string;
  review_type: ReviewType;
  due_date?: Date;
}

export interface SubmitReviewInput {
  decision: ReviewDecision;
  feedback?: string;
  detailed_feedback?: any;
  checklist_responses?: any;
  quality_score?: number;
  issue_categories?: string[];
  issues?: any;
  time_spent_minutes?: number;
}

export interface CreateCommentInput {
  review_id: string;
  location_type?: string;
  location_ref?: string;
  line_start?: number;
  line_end?: number;
  comment: string;
  comment_type?: CommentType;
  severity?: CommentSeverity;
  parent_comment_id?: string;
}

export interface CreateAppealInput {
  submission_id: string;
  original_review_id?: string;
  appealed_by: string;
  appeal_reason: string;
  supporting_evidence?: any;
  appeal_type: AppealType;
}

// ============ Query Options ============

export interface ListSubmissionsOptions {
  community_id?: string;
  submitted_by?: string;
  status?: SubmissionStatus;
  current_stage?: ReviewStage;
  content_type?: ContentType;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  limit?: number;
  offset?: number;
  order_by?: 'created_at' | 'updated_at' | 'priority' | 'due_date';
  order_direction?: 'asc' | 'desc';
}

export interface ListReviewsOptions {
  submission_id?: string;
  reviewer_id?: string;
  review_type?: ReviewType;
  status?: ReviewStatus;
  decision?: ReviewDecision;
  limit?: number;
  offset?: number;
}

export interface ListReviewersOptions {
  community_id?: string;
  reviewer_type?: ReviewerType;
  status?: ReviewerStatus;
  available_only?: boolean;
  expertise_domain?: string;
  expertise_subject?: string;
  limit?: number;
  offset?: number;
}

// ============ Service Class ============

export class ContentReviewService {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  // ============ Reviewer Management ============

  /**
   * Create a new content reviewer
   */
  async createReviewer(input: CreateReviewerInput): Promise<ContentReviewer> {
    const [reviewer] = await this.db('content_reviewers')
      .insert({
        user_id: input.user_id,
        community_id: input.community_id || null,
        reviewer_type: input.reviewer_type,
        expertise_domains: input.expertise_domains || [],
        expertise_subjects: input.expertise_subjects || [],
        expertise_tags: input.expertise_tags || [],
        max_active_reviews: input.max_active_reviews || 5,
        status: 'pending',
      })
      .returning('*');

    return reviewer;
  }

  /**
   * Activate a reviewer (after training completion)
   */
  async activateReviewer(
    reviewerId: string,
    approvedBy: string
  ): Promise<ContentReviewer> {
    const [reviewer] = await this.db('content_reviewers')
      .where({ id: reviewerId })
      .update({
        status: 'active',
        approved_by: approvedBy,
        training_completed_at: this.db.fn.now(),
      })
      .returning('*');

    return reviewer;
  }

  /**
   * Update reviewer status
   */
  async updateReviewerStatus(
    reviewerId: string,
    status: ReviewerStatus
  ): Promise<ContentReviewer> {
    const [reviewer] = await this.db('content_reviewers')
      .where({ id: reviewerId })
      .update({ status })
      .returning('*');

    return reviewer;
  }

  /**
   * Get reviewer by ID
   */
  async getReviewerById(id: string): Promise<ContentReviewer | null> {
    const reviewer = await this.db('content_reviewers').where({ id }).first();
    return reviewer || null;
  }

  /**
   * Get reviewer by user ID and optional community
   */
  async getReviewerByUserId(
    userId: string,
    communityId?: string
  ): Promise<ContentReviewer | null> {
    let query = this.db('content_reviewers').where({ user_id: userId });
    if (communityId) {
      query = query.where({ community_id: communityId });
    }
    const reviewer = await query.first();
    return reviewer || null;
  }

  /**
   * List reviewers with filters
   */
  async listReviewers(
    options: ListReviewersOptions = {}
  ): Promise<{ reviewers: ContentReviewer[]; total: number }> {
    const {
      community_id,
      reviewer_type,
      status,
      available_only,
      expertise_domain,
      expertise_subject,
      limit = 50,
      offset = 0,
    } = options;

    let query = this.db('content_reviewers');

    if (community_id) {
      query = query.where({ community_id });
    }
    if (reviewer_type) {
      query = query.where({ reviewer_type });
    }
    if (status) {
      query = query.where({ status });
    }
    if (available_only) {
      query = query
        .where({ available_for_assignment: true, status: 'active' })
        .whereRaw('current_active_reviews < max_active_reviews');
    }
    if (expertise_domain) {
      query = query.whereRaw('? = ANY(expertise_domains)', [expertise_domain]);
    }
    if (expertise_subject) {
      query = query.whereRaw('? = ANY(expertise_subjects)', [expertise_subject]);
    }

    const [{ count }] = await query.clone().count('* as count');
    const reviewers = await query
      .limit(limit)
      .offset(offset)
      .orderBy('total_reviews_completed', 'desc');

    return {
      reviewers,
      total: Number(count),
    };
  }

  /**
   * Find available reviewers for a submission
   */
  async findAvailableReviewers(
    submissionId: string,
    reviewType: ReviewType
  ): Promise<ContentReviewer[]> {
    const submission = await this.getSubmissionById(submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }

    // Map review type to reviewer type
    const reviewerTypeMap: Record<ReviewType, ReviewerType> = {
      peer_review: 'peer_reviewer',
      technical_accuracy: 'subject_expert',
      pedagogical_quality: 'pedagogy_reviewer',
      accessibility_review: 'accessibility_reviewer',
      editorial_review: 'editorial_reviewer',
      final_approval: 'senior_reviewer',
      appeal_review: 'senior_reviewer',
    };

    const targetReviewerType = reviewerTypeMap[reviewType];

    // Get reviewers who haven't already reviewed this submission
    const existingReviewers = await this.db('content_reviews')
      .where({ submission_id: submissionId })
      .select('reviewer_id');
    const excludeIds = existingReviewers.map((r) => r.reviewer_id);

    let query = this.db('content_reviewers')
      .where({
        status: 'active',
        available_for_assignment: true,
        reviewer_type: targetReviewerType,
      })
      .whereRaw('current_active_reviews < max_active_reviews');

    // Exclude the content author
    query = query.whereNot({ user_id: submission.submitted_by });

    // Exclude existing reviewers
    if (excludeIds.length > 0) {
      query = query.whereNotIn('id', excludeIds);
    }

    const reviewers = await query
      .orderByRaw('total_reviews_completed DESC, average_review_quality DESC')
      .limit(10);

    return reviewers;
  }

  // ============ Submission Management ============

  /**
   * Create a new review submission
   */
  async createSubmission(input: CreateSubmissionInput): Promise<ContentReviewSubmission> {
    const contentHash = input.content_snapshot
      ? crypto
          .createHash('sha256')
          .update(JSON.stringify(input.content_snapshot))
          .digest('hex')
      : null;

    // Calculate SLA deadline based on priority (default: 7 days)
    const slaDeadline = new Date();
    const slaDays = {
      urgent: 2,
      high: 3,
      normal: 7,
      low: 14,
    };
    slaDeadline.setDate(slaDeadline.getDate() + slaDays[input.priority || 'normal']);

    const [submission] = await this.db('content_review_submissions')
      .insert({
        content_type: input.content_type,
        content_id: input.content_id,
        submitted_by: input.submitted_by,
        community_id: input.community_id,
        title: input.title,
        description: input.description || null,
        content_snapshot: input.content_snapshot || null,
        content_hash: contentHash,
        priority: input.priority || 'normal',
        submission_notes: input.submission_notes || null,
        required_approvals: input.required_approvals || 3,
        sla_deadline: slaDeadline,
        status: 'draft',
        current_stage: 'peer_review',
        completed_stages: [],
      })
      .returning('*');

    // Record in workflow history
    await this.addWorkflowHistory(submission.id, {
      action: 'submission_created',
      actor_id: input.submitted_by,
      actor_type: 'user',
      to_status: 'draft',
      to_stage: 'peer_review',
      description: 'Content submission created',
    });

    return submission;
  }

  /**
   * Submit content for review
   */
  async submitForReview(submissionId: string, userId: string): Promise<ContentReviewSubmission> {
    const submission = await this.getSubmissionById(submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }
    if (submission.submitted_by !== userId) {
      throw new Error('Only the author can submit content for review');
    }
    if (submission.status !== 'draft' && submission.status !== 'changes_requested') {
      throw new Error('Submission is not in a submittable state');
    }

    const previousStatus = submission.status;
    const newStatus = previousStatus === 'changes_requested' ? 'resubmitted' : 'submitted';

    const [updated] = await this.db('content_review_submissions')
      .where({ id: submissionId })
      .update({
        status: newStatus,
        submitted_at: this.db.fn.now(),
      })
      .returning('*');

    await this.addWorkflowHistory(submissionId, {
      action: 'submitted_for_review',
      actor_id: userId,
      actor_type: 'user',
      from_status: previousStatus,
      to_status: newStatus,
      description: `Content ${newStatus === 'resubmitted' ? 're' : ''}submitted for review`,
    });

    return updated;
  }

  /**
   * Get submission by ID
   */
  async getSubmissionById(id: string): Promise<ContentReviewSubmission | null> {
    const submission = await this.db('content_review_submissions').where({ id }).first();
    return submission || null;
  }

  /**
   * List submissions with filters
   */
  async listSubmissions(
    options: ListSubmissionsOptions = {}
  ): Promise<{ submissions: ContentReviewSubmission[]; total: number }> {
    const {
      community_id,
      submitted_by,
      status,
      current_stage,
      content_type,
      priority,
      limit = 20,
      offset = 0,
      order_by = 'created_at',
      order_direction = 'desc',
    } = options;

    let query = this.db('content_review_submissions');

    if (community_id) {
      query = query.where({ community_id });
    }
    if (submitted_by) {
      query = query.where({ submitted_by });
    }
    if (status) {
      query = query.where({ status });
    }
    if (current_stage) {
      query = query.where({ current_stage });
    }
    if (content_type) {
      query = query.where({ content_type });
    }
    if (priority) {
      query = query.where({ priority });
    }

    const [{ count }] = await query.clone().count('* as count');
    const submissions = await query
      .limit(limit)
      .offset(offset)
      .orderBy(order_by, order_direction);

    return {
      submissions,
      total: Number(count),
    };
  }

  /**
   * Update submission status
   */
  async updateSubmissionStatus(
    submissionId: string,
    status: SubmissionStatus,
    actorId: string,
    actorType: 'user' | 'system' | 'automated' = 'user'
  ): Promise<ContentReviewSubmission> {
    const submission = await this.getSubmissionById(submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }

    const [updated] = await this.db('content_review_submissions')
      .where({ id: submissionId })
      .update({
        status,
        completed_at: ['approved', 'rejected', 'withdrawn'].includes(status)
          ? this.db.fn.now()
          : null,
      })
      .returning('*');

    await this.addWorkflowHistory(submissionId, {
      action: 'status_changed',
      actor_id: actorId,
      actor_type: actorType,
      from_status: submission.status,
      to_status: status,
      description: `Status changed from ${submission.status} to ${status}`,
    });

    return updated;
  }

  /**
   * Advance submission to next stage
   */
  async advanceToNextStage(
    submissionId: string,
    actorId: string
  ): Promise<ContentReviewSubmission> {
    const submission = await this.getSubmissionById(submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }

    const stageOrder: ReviewStage[] = [
      'peer_review',
      'technical_accuracy',
      'pedagogical_quality',
      'accessibility_check',
      'plagiarism_check',
      'editorial_review',
      'final_approval',
    ];

    const currentIndex = stageOrder.indexOf(submission.current_stage);
    if (currentIndex === -1 || currentIndex >= stageOrder.length - 1) {
      throw new Error('Cannot advance beyond final stage');
    }

    const nextStage = stageOrder[currentIndex + 1];
    const completedStages = [...(submission.completed_stages || []), submission.current_stage];

    const [updated] = await this.db('content_review_submissions')
      .where({ id: submissionId })
      .update({
        current_stage: nextStage,
        completed_stages: completedStages,
        status: 'in_review',
      })
      .returning('*');

    await this.addWorkflowHistory(submissionId, {
      action: 'stage_advanced',
      actor_id: actorId,
      actor_type: 'system',
      from_stage: submission.current_stage,
      to_stage: nextStage,
      description: `Advanced from ${submission.current_stage} to ${nextStage}`,
    });

    return updated;
  }

  /**
   * Withdraw a submission
   */
  async withdrawSubmission(submissionId: string, userId: string): Promise<ContentReviewSubmission> {
    const submission = await this.getSubmissionById(submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }
    if (submission.submitted_by !== userId) {
      throw new Error('Only the author can withdraw a submission');
    }
    if (['approved', 'rejected', 'withdrawn'].includes(submission.status)) {
      throw new Error('Cannot withdraw a completed submission');
    }

    return this.updateSubmissionStatus(submissionId, 'withdrawn', userId);
  }

  // ============ Review Management ============

  /**
   * Assign a review to a reviewer
   */
  async assignReview(input: CreateReviewInput): Promise<ContentReview> {
    const reviewer = await this.getReviewerById(input.reviewer_id);
    if (!reviewer) {
      throw new Error('Reviewer not found');
    }
    if (reviewer.status !== 'active') {
      throw new Error('Reviewer is not active');
    }
    if (reviewer.current_active_reviews >= reviewer.max_active_reviews) {
      throw new Error('Reviewer has reached maximum active reviews');
    }

    const submission = await this.getSubmissionById(input.submission_id);
    if (!submission) {
      throw new Error('Submission not found');
    }
    if (reviewer.user_id === submission.submitted_by) {
      throw new Error('Reviewer cannot review their own content');
    }

    // Check for existing review assignment
    const existingReview = await this.db('content_reviews')
      .where({
        submission_id: input.submission_id,
        reviewer_id: input.reviewer_id,
        review_type: input.review_type,
      })
      .whereIn('status', ['assigned', 'in_progress'])
      .first();

    if (existingReview) {
      throw new Error('Reviewer already has an active review for this submission');
    }

    // Calculate due date (default: 3 days for normal priority)
    const dueDate = input.due_date || new Date();
    if (!input.due_date) {
      const dueDays = {
        urgent: 1,
        high: 2,
        normal: 3,
        low: 5,
      };
      dueDate.setDate(dueDate.getDate() + dueDays[submission.priority]);
    }

    const [review] = await this.db('content_reviews')
      .insert({
        submission_id: input.submission_id,
        reviewer_id: input.reviewer_id,
        assigned_by: input.assigned_by || null,
        review_type: input.review_type,
        status: 'assigned',
        due_date: dueDate,
      })
      .returning('*');

    // Increment reviewer's active review count
    await this.db('content_reviewers')
      .where({ id: input.reviewer_id })
      .increment('current_active_reviews', 1);

    // Update submission status to in_review if it was submitted
    if (submission.status === 'submitted' || submission.status === 'resubmitted') {
      await this.updateSubmissionStatus(
        input.submission_id,
        'in_review',
        input.assigned_by || 'system',
        input.assigned_by ? 'user' : 'system'
      );
    }

    await this.addWorkflowHistory(input.submission_id, {
      action: 'review_assigned',
      actor_id: input.assigned_by || null,
      actor_type: input.assigned_by ? 'user' : 'system',
      description: `Review assigned to reviewer for ${input.review_type}`,
      details: { review_id: review.id, reviewer_id: input.reviewer_id },
    });

    return review;
  }

  /**
   * Start working on a review
   */
  async startReview(reviewId: string, reviewerId: string): Promise<ContentReview> {
    const review = await this.getReviewById(reviewId);
    if (!review) {
      throw new Error('Review not found');
    }

    const reviewer = await this.getReviewerById(review.reviewer_id);
    if (!reviewer || reviewer.user_id !== reviewerId) {
      throw new Error('Not authorized to start this review');
    }

    if (review.status !== 'assigned') {
      throw new Error('Review is not in assigned status');
    }

    const [updated] = await this.db('content_reviews')
      .where({ id: reviewId })
      .update({
        status: 'in_progress',
        started_at: this.db.fn.now(),
      })
      .returning('*');

    return updated;
  }

  /**
   * Submit a completed review
   */
  async submitReview(
    reviewId: string,
    reviewerId: string,
    input: SubmitReviewInput
  ): Promise<ContentReview> {
    const review = await this.getReviewById(reviewId);
    if (!review) {
      throw new Error('Review not found');
    }

    const reviewer = await this.getReviewerById(review.reviewer_id);
    if (!reviewer || reviewer.user_id !== reviewerId) {
      throw new Error('Not authorized to submit this review');
    }

    if (!['assigned', 'in_progress'].includes(review.status)) {
      throw new Error('Review cannot be submitted in current status');
    }

    const startTime = review.started_at || review.assigned_at;
    const timeSpentMinutes =
      input.time_spent_minutes ||
      Math.round((Date.now() - new Date(startTime).getTime()) / 60000);

    const [updated] = await this.db('content_reviews')
      .where({ id: reviewId })
      .update({
        status: 'completed',
        decision: input.decision,
        feedback: input.feedback || null,
        detailed_feedback: input.detailed_feedback || null,
        checklist_responses: input.checklist_responses || null,
        quality_score: input.quality_score || null,
        issue_categories: input.issue_categories || [],
        issues: input.issues || null,
        time_spent_minutes: timeSpentMinutes,
        completed_at: this.db.fn.now(),
      })
      .returning('*');

    // Decrement reviewer's active review count and update stats
    const isOnTime = review.due_date ? new Date() <= new Date(review.due_date) : true;
    await this.db('content_reviewers')
      .where({ id: review.reviewer_id })
      .decrement('current_active_reviews', 1)
      .increment('total_reviews_completed', 1)
      .increment('reviews_on_time', isOnTime ? 1 : 0);

    // Handle the review decision
    await this.handleReviewDecision(updated);

    return updated;
  }

  /**
   * Handle the outcome of a review decision
   */
  private async handleReviewDecision(review: ContentReview): Promise<void> {
    const submission = await this.getSubmissionById(review.submission_id);
    if (!submission) return;

    const decision = review.decision;

    switch (decision) {
      case 'approve':
      case 'approve_with_changes':
        // Increment approval count
        const newApprovalCount = submission.current_approvals + 1;
        await this.db('content_review_submissions')
          .where({ id: submission.id })
          .update({ current_approvals: newApprovalCount });

        // Check if we have enough approvals for current stage
        if (newApprovalCount >= submission.required_approvals) {
          // If this is final approval, mark as approved
          if (submission.current_stage === 'final_approval') {
            await this.updateSubmissionStatus(
              submission.id,
              'approved',
              'system',
              'system'
            );
          } else {
            // Advance to next stage
            await this.advanceToNextStage(submission.id, 'system');
            // Reset approval count for new stage
            await this.db('content_review_submissions')
              .where({ id: submission.id })
              .update({ current_approvals: 0 });
          }
        }

        await this.addWorkflowHistory(submission.id, {
          action: 'review_completed',
          actor_id: null,
          actor_type: 'system',
          description: `Review completed with decision: ${decision}`,
          details: { review_id: review.id, decision },
        });
        break;

      case 'request_changes':
        await this.updateSubmissionStatus(
          submission.id,
          'changes_requested',
          'system',
          'system'
        );

        await this.addWorkflowHistory(submission.id, {
          action: 'changes_requested',
          actor_id: null,
          actor_type: 'system',
          description: 'Changes requested by reviewer',
          details: { review_id: review.id },
        });
        break;

      case 'reject':
        await this.updateSubmissionStatus(
          submission.id,
          'rejected',
          'system',
          'system'
        );

        await this.addWorkflowHistory(submission.id, {
          action: 'submission_rejected',
          actor_id: null,
          actor_type: 'system',
          description: 'Submission rejected by reviewer',
          details: { review_id: review.id },
        });
        break;

      case 'escalate':
        // Assign to senior reviewer
        await this.addWorkflowHistory(submission.id, {
          action: 'review_escalated',
          actor_id: null,
          actor_type: 'system',
          description: 'Review escalated to senior reviewer',
          details: { review_id: review.id },
        });
        break;
    }
  }

  /**
   * Get review by ID
   */
  async getReviewById(id: string): Promise<ContentReview | null> {
    const review = await this.db('content_reviews').where({ id }).first();
    return review || null;
  }

  /**
   * List reviews for a submission
   */
  async listReviews(
    options: ListReviewsOptions = {}
  ): Promise<{ reviews: ContentReview[]; total: number }> {
    const {
      submission_id,
      reviewer_id,
      review_type,
      status,
      decision,
      limit = 20,
      offset = 0,
    } = options;

    let query = this.db('content_reviews');

    if (submission_id) {
      query = query.where({ submission_id });
    }
    if (reviewer_id) {
      query = query.where({ reviewer_id });
    }
    if (review_type) {
      query = query.where({ review_type });
    }
    if (status) {
      query = query.where({ status });
    }
    if (decision) {
      query = query.where({ decision });
    }

    const [{ count }] = await query.clone().count('* as count');
    const reviews = await query
      .limit(limit)
      .offset(offset)
      .orderBy('assigned_at', 'desc');

    return {
      reviews,
      total: Number(count),
    };
  }

  /**
   * Decline a review assignment
   */
  async declineReview(
    reviewId: string,
    reviewerId: string,
    reason?: string
  ): Promise<ContentReview> {
    const review = await this.getReviewById(reviewId);
    if (!review) {
      throw new Error('Review not found');
    }

    const reviewer = await this.getReviewerById(review.reviewer_id);
    if (!reviewer || reviewer.user_id !== reviewerId) {
      throw new Error('Not authorized to decline this review');
    }

    if (review.status !== 'assigned') {
      throw new Error('Only assigned reviews can be declined');
    }

    const [updated] = await this.db('content_reviews')
      .where({ id: reviewId })
      .update({
        status: 'declined',
        metadata: { decline_reason: reason },
      })
      .returning('*');

    // Decrement reviewer's active review count
    await this.db('content_reviewers')
      .where({ id: review.reviewer_id })
      .decrement('current_active_reviews', 1);

    return updated;
  }

  // ============ Review Comments ============

  /**
   * Add a comment to a review
   */
  async addComment(input: CreateCommentInput): Promise<ReviewComment> {
    const review = await this.getReviewById(input.review_id);
    if (!review) {
      throw new Error('Review not found');
    }

    const threadDepth = input.parent_comment_id
      ? await this.getCommentDepth(input.parent_comment_id)
      : 0;

    const [comment] = await this.db('review_comments')
      .insert({
        review_id: input.review_id,
        location_type: input.location_type || null,
        location_ref: input.location_ref || null,
        line_start: input.line_start || null,
        line_end: input.line_end || null,
        comment: input.comment,
        comment_type: input.comment_type || 'suggestion',
        severity: input.severity || 'info',
        parent_comment_id: input.parent_comment_id || null,
        thread_depth: threadDepth,
      })
      .returning('*');

    return comment;
  }

  /**
   * Get comment thread depth
   */
  private async getCommentDepth(parentId: string): Promise<number> {
    const parent = await this.db('review_comments')
      .where({ id: parentId })
      .select('thread_depth')
      .first();
    return parent ? parent.thread_depth + 1 : 0;
  }

  /**
   * Resolve a comment
   */
  async resolveComment(
    commentId: string,
    userId: string,
    resolutionNote?: string
  ): Promise<ReviewComment> {
    const [comment] = await this.db('review_comments')
      .where({ id: commentId })
      .update({
        status: 'resolved',
        resolved_by: userId,
        resolved_at: this.db.fn.now(),
        resolution_note: resolutionNote || null,
      })
      .returning('*');

    return comment;
  }

  /**
   * Get comments for a review
   */
  async getReviewComments(reviewId: string): Promise<ReviewComment[]> {
    return this.db('review_comments')
      .where({ review_id: reviewId })
      .orderBy('created_at', 'asc');
  }

  // ============ Plagiarism Checks ============

  /**
   * Create a plagiarism check
   */
  async createPlagiarismCheck(
    submissionId: string,
    checkType: 'full' | 'incremental' | 'quick' = 'full'
  ): Promise<PlagiarismCheck> {
    const [check] = await this.db('plagiarism_checks')
      .insert({
        submission_id: submissionId,
        check_type: checkType,
        status: 'pending',
      })
      .returning('*');

    return check;
  }

  /**
   * Update plagiarism check results
   */
  async updatePlagiarismCheck(
    checkId: string,
    results: {
      status: 'in_progress' | 'completed' | 'failed';
      overall_similarity_score?: number;
      highest_match_score?: number;
      total_matches_found?: number;
      matches?: any;
      exclusions?: any;
      requires_human_review?: boolean;
      processing_time_ms?: number;
      service_version?: string;
      error_details?: any;
    }
  ): Promise<PlagiarismCheck> {
    const updateData: any = { status: results.status };

    if (results.status === 'completed') {
      updateData.overall_similarity_score = results.overall_similarity_score || 0;
      updateData.highest_match_score = results.highest_match_score || 0;
      updateData.total_matches_found = results.total_matches_found || 0;
      updateData.matches = results.matches || [];
      updateData.exclusions = results.exclusions || [];
      updateData.requires_human_review =
        results.requires_human_review ||
        (results.overall_similarity_score && results.overall_similarity_score > 20);
      updateData.completed_at = this.db.fn.now();
    }

    if (results.processing_time_ms) {
      updateData.processing_time_ms = results.processing_time_ms;
    }
    if (results.service_version) {
      updateData.service_version = results.service_version;
    }
    if (results.error_details) {
      updateData.error_details = results.error_details;
    }

    const [check] = await this.db('plagiarism_checks')
      .where({ id: checkId })
      .update(updateData)
      .returning('*');

    // Update submission plagiarism status
    if (results.status === 'completed') {
      await this.db('content_review_submissions')
        .where({ id: check.submission_id })
        .update({
          plagiarism_check_completed: true,
          plagiarism_score: results.overall_similarity_score || 0,
        });
    }

    return check;
  }

  /**
   * Get plagiarism check for a submission
   */
  async getPlagiarismCheck(submissionId: string): Promise<PlagiarismCheck | null> {
    const check = await this.db('plagiarism_checks')
      .where({ submission_id: submissionId })
      .orderBy('created_at', 'desc')
      .first();
    return check || null;
  }

  /**
   * Review plagiarism check results
   */
  async reviewPlagiarismCheck(
    checkId: string,
    reviewerId: string,
    decision: 'cleared' | 'violation' | 'partial_violation',
    notes?: string
  ): Promise<PlagiarismCheck> {
    const [check] = await this.db('plagiarism_checks')
      .where({ id: checkId })
      .update({
        reviewed_by: reviewerId,
        review_decision: decision,
        review_notes: notes || null,
        requires_human_review: false,
      })
      .returning('*');

    return check;
  }

  // ============ Accessibility Checks ============

  /**
   * Create an accessibility check
   */
  async createAccessibilityCheck(
    submissionId: string,
    wcagLevel: string = 'AA'
  ): Promise<AccessibilityCheck> {
    const [check] = await this.db('accessibility_checks')
      .insert({
        submission_id: submissionId,
        wcag_level: wcagLevel,
        status: 'pending',
      })
      .returning('*');

    return check;
  }

  /**
   * Update accessibility check results
   */
  async updateAccessibilityCheck(
    checkId: string,
    results: {
      status: 'in_progress' | 'completed' | 'failed';
      passed?: boolean;
      compliance_score?: number;
      critical_issues?: number;
      serious_issues?: number;
      moderate_issues?: number;
      minor_issues?: number;
      issues?: any;
      checks_performed?: any;
      checks_passed?: any;
      checks_failed?: any;
      processing_time_ms?: number;
      service_version?: string;
      error_details?: any;
    }
  ): Promise<AccessibilityCheck> {
    const updateData: any = { status: results.status };

    if (results.status === 'completed') {
      updateData.passed = results.passed || false;
      updateData.compliance_score = results.compliance_score || 0;
      updateData.critical_issues = results.critical_issues || 0;
      updateData.serious_issues = results.serious_issues || 0;
      updateData.moderate_issues = results.moderate_issues || 0;
      updateData.minor_issues = results.minor_issues || 0;
      updateData.issues = results.issues || [];
      updateData.checks_performed = results.checks_performed || [];
      updateData.checks_passed = results.checks_passed || [];
      updateData.checks_failed = results.checks_failed || [];
      updateData.completed_at = this.db.fn.now();
    }

    if (results.processing_time_ms) {
      updateData.processing_time_ms = results.processing_time_ms;
    }
    if (results.service_version) {
      updateData.service_version = results.service_version;
    }
    if (results.error_details) {
      updateData.error_details = results.error_details;
    }

    const [check] = await this.db('accessibility_checks')
      .where({ id: checkId })
      .update(updateData)
      .returning('*');

    // Update submission accessibility status
    if (results.status === 'completed') {
      await this.db('content_review_submissions')
        .where({ id: check.submission_id })
        .update({
          accessibility_check_completed: true,
          accessibility_score: results.compliance_score || 0,
        });
    }

    return check;
  }

  /**
   * Get accessibility check for a submission
   */
  async getAccessibilityCheck(submissionId: string): Promise<AccessibilityCheck | null> {
    const check = await this.db('accessibility_checks')
      .where({ submission_id: submissionId })
      .orderBy('created_at', 'desc')
      .first();
    return check || null;
  }

  // ============ Appeals ============

  /**
   * Create an appeal
   */
  async createAppeal(input: CreateAppealInput): Promise<ReviewAppeal> {
    const submission = await this.getSubmissionById(input.submission_id);
    if (!submission) {
      throw new Error('Submission not found');
    }
    if (submission.submitted_by !== input.appealed_by) {
      throw new Error('Only the content author can appeal');
    }
    if (submission.status !== 'rejected' && submission.status !== 'changes_requested') {
      throw new Error('Can only appeal rejected or changes-requested submissions');
    }

    // Calculate SLA deadline (5 business days)
    const slaDeadline = new Date();
    slaDeadline.setDate(slaDeadline.getDate() + 7);

    const [appeal] = await this.db('review_appeals')
      .insert({
        submission_id: input.submission_id,
        original_review_id: input.original_review_id || null,
        appealed_by: input.appealed_by,
        appeal_reason: input.appeal_reason,
        supporting_evidence: input.supporting_evidence || null,
        appeal_type: input.appeal_type,
        sla_deadline: slaDeadline,
      })
      .returning('*');

    await this.addWorkflowHistory(input.submission_id, {
      action: 'appeal_submitted',
      actor_id: input.appealed_by,
      actor_type: 'user',
      description: `Appeal submitted: ${input.appeal_type}`,
      details: { appeal_id: appeal.id },
    });

    return appeal;
  }

  /**
   * Get appeal by ID
   */
  async getAppealById(id: string): Promise<ReviewAppeal | null> {
    const appeal = await this.db('review_appeals').where({ id }).first();
    return appeal || null;
  }

  /**
   * List appeals for a submission
   */
  async getSubmissionAppeals(submissionId: string): Promise<ReviewAppeal[]> {
    return this.db('review_appeals')
      .where({ submission_id: submissionId })
      .orderBy('created_at', 'desc');
  }

  /**
   * Decide on an appeal
   */
  async decideAppeal(
    appealId: string,
    reviewerId: string,
    decision: AppealDecision,
    rationale: string
  ): Promise<ReviewAppeal> {
    const appeal = await this.getAppealById(appealId);
    if (!appeal) {
      throw new Error('Appeal not found');
    }
    if (appeal.status === 'decided') {
      throw new Error('Appeal has already been decided');
    }

    const slaDeadline = appeal.sla_deadline
      ? new Date(appeal.sla_deadline)
      : new Date();
    const slaMet = new Date() <= slaDeadline;

    const [updated] = await this.db('review_appeals')
      .where({ id: appealId })
      .update({
        status: 'decided',
        reviewed_by: reviewerId,
        decision,
        decision_rationale: rationale,
        decided_at: this.db.fn.now(),
        sla_met: slaMet,
      })
      .returning('*');

    // Handle appeal decision
    if (decision === 'overturned') {
      // Re-open the submission for further review
      await this.updateSubmissionStatus(
        appeal.submission_id,
        'in_review',
        reviewerId
      );

      // Update original reviewer's reversal count
      if (appeal.original_review_id) {
        const originalReview = await this.getReviewById(appeal.original_review_id);
        if (originalReview) {
          await this.db('content_reviewers')
            .where({ id: originalReview.reviewer_id })
            .increment('appeal_reversal_count', 1);
        }
      }
    } else if (decision === 'remanded') {
      // Send back for re-review
      await this.updateSubmissionStatus(
        appeal.submission_id,
        'in_review',
        reviewerId
      );
    }

    await this.addWorkflowHistory(appeal.submission_id, {
      action: 'appeal_decided',
      actor_id: reviewerId,
      actor_type: 'user',
      description: `Appeal decision: ${decision}`,
      details: { appeal_id: appealId, decision },
    });

    return updated;
  }

  // ============ Workflow History ============

  /**
   * Add entry to workflow history
   */
  private async addWorkflowHistory(
    submissionId: string,
    entry: {
      action: string;
      actor_id: string | null;
      actor_type: 'user' | 'system' | 'automated';
      from_status?: string;
      to_status?: string;
      from_stage?: string;
      to_stage?: string;
      description?: string;
      details?: any;
      metadata?: any;
    }
  ): Promise<ReviewWorkflowHistory> {
    const [history] = await this.db('review_workflow_history')
      .insert({
        submission_id: submissionId,
        action: entry.action,
        actor_id: entry.actor_id,
        actor_type: entry.actor_type,
        from_status: entry.from_status || null,
        to_status: entry.to_status || null,
        from_stage: entry.from_stage || null,
        to_stage: entry.to_stage || null,
        description: entry.description || null,
        details: entry.details || null,
        metadata: entry.metadata || null,
      })
      .returning('*');

    return history;
  }

  /**
   * Get workflow history for a submission
   */
  async getWorkflowHistory(submissionId: string): Promise<ReviewWorkflowHistory[]> {
    return this.db('review_workflow_history')
      .where({ submission_id: submissionId })
      .orderBy('created_at', 'asc');
  }

  // ============ Statistics and Metrics ============

  /**
   * Get submission statistics for a community
   */
  async getSubmissionStats(communityId: string): Promise<{
    total: number;
    byStatus: Record<SubmissionStatus, number>;
    byStage: Record<ReviewStage, number>;
    avgReviewTime: number;
    approvalRate: number;
  }> {
    const submissions = await this.db('content_review_submissions')
      .where({ community_id: communityId })
      .select('status', 'current_stage', 'created_at', 'completed_at');

    const statusCounts: Record<string, number> = {};
    const stageCounts: Record<string, number> = {};
    let totalReviewTime = 0;
    let completedCount = 0;
    let approvedCount = 0;

    for (const sub of submissions) {
      statusCounts[sub.status] = (statusCounts[sub.status] || 0) + 1;
      stageCounts[sub.current_stage] = (stageCounts[sub.current_stage] || 0) + 1;

      if (sub.completed_at && sub.created_at) {
        totalReviewTime +=
          new Date(sub.completed_at).getTime() - new Date(sub.created_at).getTime();
        completedCount++;
      }

      if (sub.status === 'approved') {
        approvedCount++;
      }
    }

    return {
      total: submissions.length,
      byStatus: statusCounts as Record<SubmissionStatus, number>,
      byStage: stageCounts as Record<ReviewStage, number>,
      avgReviewTime: completedCount > 0 ? totalReviewTime / completedCount : 0,
      approvalRate: completedCount > 0 ? approvedCount / completedCount : 0,
    };
  }

  /**
   * Get reviewer performance statistics
   */
  async getReviewerStats(reviewerId: string): Promise<{
    totalReviews: number;
    completedReviews: number;
    onTimeRate: number;
    avgReviewTime: number;
    avgQualityScore: number;
    appealReversalRate: number;
  }> {
    const reviewer = await this.getReviewerById(reviewerId);
    if (!reviewer) {
      throw new Error('Reviewer not found');
    }

    const reviews = await this.db('content_reviews')
      .where({ reviewer_id: reviewerId, status: 'completed' })
      .select('time_spent_minutes', 'quality_score', 'assigned_at', 'completed_at', 'due_date');

    let totalTime = 0;
    let totalQuality = 0;
    let qualityCount = 0;

    for (const review of reviews) {
      if (review.time_spent_minutes) {
        totalTime += review.time_spent_minutes;
      }
      if (review.quality_score) {
        totalQuality += Number(review.quality_score);
        qualityCount++;
      }
    }

    return {
      totalReviews: reviewer.total_reviews_completed,
      completedReviews: reviews.length,
      onTimeRate:
        reviewer.total_reviews_completed > 0
          ? reviewer.reviews_on_time / reviewer.total_reviews_completed
          : 0,
      avgReviewTime: reviews.length > 0 ? totalTime / reviews.length : 0,
      avgQualityScore: qualityCount > 0 ? totalQuality / qualityCount : 0,
      appealReversalRate:
        reviewer.total_reviews_completed > 0
          ? reviewer.appeal_reversal_count / reviewer.total_reviews_completed
          : 0,
    };
  }

  /**
   * Run automated checks for a submission
   */
  async runAutomatedChecks(submissionId: string): Promise<{
    plagiarism: PlagiarismCheck;
    accessibility: AccessibilityCheck;
  }> {
    const submission = await this.getSubmissionById(submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }

    // Create plagiarism check
    const plagiarismCheck = await this.createPlagiarismCheck(submissionId);

    // Create accessibility check
    const accessibilityCheck = await this.createAccessibilityCheck(submissionId);

    // In a real implementation, these would trigger async jobs
    // For now, we'll simulate quick checks
    await this.simulatePlagiarismCheck(plagiarismCheck.id);
    await this.simulateAccessibilityCheck(accessibilityCheck.id);

    // Refresh the checks
    const updatedPlagiarism = await this.getPlagiarismCheck(submissionId);
    const updatedAccessibility = await this.getAccessibilityCheck(submissionId);

    // Update auto_checks_passed flag
    const autoChecksPassed =
      (updatedPlagiarism?.overall_similarity_score || 0) < 20 &&
      (updatedAccessibility?.passed || false);

    await this.db('content_review_submissions')
      .where({ id: submissionId })
      .update({ auto_checks_passed: autoChecksPassed });

    return {
      plagiarism: updatedPlagiarism!,
      accessibility: updatedAccessibility!,
    };
  }

  /**
   * Simulate plagiarism check (for development/testing)
   */
  private async simulatePlagiarismCheck(checkId: string): Promise<void> {
    const check = await this.db('plagiarism_checks').where({ id: checkId }).first();
    if (!check) return;

    const submission = await this.getSubmissionById(check.submission_id);
    if (!submission) return;

    // Simulate a plagiarism check result
    const similarityScore = Math.random() * 25; // 0-25% similarity

    await this.updatePlagiarismCheck(checkId, {
      status: 'completed',
      overall_similarity_score: similarityScore,
      highest_match_score: similarityScore * 0.8,
      total_matches_found: Math.floor(similarityScore / 5),
      matches: [],
      exclusions: ['common_phrases', 'citations'],
      requires_human_review: similarityScore > 20,
      processing_time_ms: 1500,
      service_version: '1.0.0',
    });
  }

  /**
   * Simulate accessibility check (for development/testing)
   */
  private async simulateAccessibilityCheck(checkId: string): Promise<void> {
    const check = await this.db('accessibility_checks').where({ id: checkId }).first();
    if (!check) return;

    // Simulate an accessibility check result
    const complianceScore = 70 + Math.random() * 30; // 70-100%
    const criticalIssues = Math.floor(Math.random() * 2);
    const seriousIssues = Math.floor(Math.random() * 3);
    const passed = criticalIssues === 0 && seriousIssues <= 1;

    await this.updateAccessibilityCheck(checkId, {
      status: 'completed',
      passed,
      compliance_score: complianceScore,
      critical_issues: criticalIssues,
      serious_issues: seriousIssues,
      moderate_issues: Math.floor(Math.random() * 5),
      minor_issues: Math.floor(Math.random() * 10),
      issues: [],
      checks_performed: ['alt_text', 'color_contrast', 'keyboard_nav', 'aria_labels'],
      checks_passed: passed ? ['alt_text', 'color_contrast', 'keyboard_nav', 'aria_labels'] : [],
      checks_failed: passed ? [] : ['color_contrast'],
      processing_time_ms: 800,
      service_version: '1.0.0',
    });
  }
}

export default ContentReviewService;
