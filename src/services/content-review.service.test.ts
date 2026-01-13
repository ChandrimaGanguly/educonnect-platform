/**
 * Content Review Workflow Service Tests
 *
 * Tests for the content review workflow service that handles:
 * - Reviewer management (creation, activation, listing)
 * - Submission management (creation, submission, withdrawal)
 * - Review assignment and completion
 * - Review comments
 * - Plagiarism and accessibility checks
 * - Appeals process
 * - Workflow history
 * - Statistics and metrics
 */

import { Knex } from 'knex';
import {
  ContentReviewService,
  ContentReviewer,
  ContentReviewSubmission,
  ContentReview,
  ReviewComment,
  PlagiarismCheck,
  AccessibilityCheck,
  ReviewAppeal,
  ReviewerType,
  SubmissionStatus,
  ReviewStage,
  ReviewDecision,
} from './content-review.service';

// Mock the database connection
jest.mock('../database', () => ({
  getDatabase: jest.fn(),
}));

import { getDatabase } from '../database';

describe('ContentReviewService', () => {
  let service: ContentReviewService;
  let mockDb: jest.Mocked<Knex>;
  let mockQueryBuilder: any;

  // Test data
  const testUserId = '550e8400-e29b-41d4-a716-446655440001';
  const testCommunityId = '550e8400-e29b-41d4-a716-446655440002';
  const testReviewerId = '550e8400-e29b-41d4-a716-446655440003';
  const testSubmissionId = '550e8400-e29b-41d4-a716-446655440004';
  const testReviewId = '550e8400-e29b-41d4-a716-446655440005';
  const testContentId = '550e8400-e29b-41d4-a716-446655440006';

  const testReviewer: ContentReviewer = {
    id: testReviewerId,
    user_id: testUserId,
    community_id: testCommunityId,
    reviewer_type: 'peer_reviewer',
    expertise_domains: [],
    expertise_subjects: [],
    expertise_tags: [],
    status: 'active',
    max_active_reviews: 5,
    current_active_reviews: 0,
    available_for_assignment: true,
    total_reviews_completed: 10,
    reviews_on_time: 9,
    average_review_quality: 0.85,
    consistency_score: 0.9,
    appeal_reversal_count: 0,
    training_completed_at: new Date(),
    certification_expires_at: null,
    training_modules_completed: null,
    metadata: null,
    created_at: new Date(),
    updated_at: new Date(),
    approved_by: null,
  };

  const testSubmission: ContentReviewSubmission = {
    id: testSubmissionId,
    content_type: 'lesson',
    content_id: testContentId,
    submitted_by: testUserId,
    community_id: testCommunityId,
    title: 'Test Lesson',
    description: 'A test lesson for review',
    version: 1,
    previous_submission_id: null,
    status: 'draft',
    current_stage: 'peer_review',
    required_approvals: 3,
    current_approvals: 0,
    completed_stages: [],
    priority: 'normal',
    due_date: null,
    sla_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    plagiarism_check_completed: false,
    plagiarism_score: null,
    accessibility_check_completed: false,
    accessibility_score: null,
    auto_checks_passed: false,
    content_snapshot: {},
    content_hash: null,
    metadata: null,
    submission_notes: null,
    created_at: new Date(),
    updated_at: new Date(),
    submitted_at: null,
    completed_at: null,
  };

  const testReview: ContentReview = {
    id: testReviewId,
    submission_id: testSubmissionId,
    reviewer_id: testReviewerId,
    assigned_by: null,
    review_type: 'peer_review',
    status: 'assigned',
    decision: null,
    feedback: null,
    detailed_feedback: null,
    checklist_responses: null,
    quality_score: null,
    issue_categories: [],
    issues: null,
    assigned_at: new Date(),
    started_at: null,
    completed_at: null,
    due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    time_spent_minutes: null,
    review_quality_score: null,
    quality_reviewed_by: null,
    quality_review_notes: null,
    metadata: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    // Create mock query builder
    mockQueryBuilder = {
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      whereNot: jest.fn().mockReturnThis(),
      whereIn: jest.fn().mockReturnThis(),
      whereNotIn: jest.fn().mockReturnThis(),
      whereRaw: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(null),
      select: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue([{ count: 0 }]),
      increment: jest.fn().mockReturnThis(),
      decrement: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      orderByRaw: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
      fn: {
        now: jest.fn().mockReturnValue('NOW()'),
      },
    };

    // Create mock database
    mockDb = jest.fn().mockReturnValue(mockQueryBuilder) as any;
    mockDb.fn = {
      now: jest.fn().mockReturnValue('NOW()'),
    } as any;
    mockDb.raw = jest.fn().mockResolvedValue([]) as any;
    mockDb.transaction = jest.fn(async (callback) => await callback(mockDb)) as any;

    (getDatabase as jest.Mock).mockReturnValue(mockDb);

    service = new ContentReviewService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============ Reviewer Management Tests ============

  describe('Reviewer Management', () => {
    describe('createReviewer', () => {
      it('should create a new reviewer with default values', async () => {
        mockQueryBuilder.returning.mockResolvedValue([testReviewer]);

        const result = await service.createReviewer({
          user_id: testUserId,
          reviewer_type: 'peer_reviewer',
        });

        expect(mockDb).toHaveBeenCalledWith('content_reviewers');
        expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: testUserId,
            reviewer_type: 'peer_reviewer',
            status: 'pending',
          })
        );
        expect(result).toEqual(testReviewer);
      });

      it('should create a reviewer with custom expertise', async () => {
        const expertise = {
          expertise_domains: ['domain-1', 'domain-2'],
          expertise_subjects: ['subject-1'],
          expertise_tags: ['javascript', 'react'],
        };

        mockQueryBuilder.returning.mockResolvedValue([{ ...testReviewer, ...expertise }]);

        const result = await service.createReviewer({
          user_id: testUserId,
          reviewer_type: 'subject_expert',
          ...expertise,
        });

        expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
          expect.objectContaining(expertise)
        );
        expect(result.expertise_domains).toEqual(expertise.expertise_domains);
      });
    });

    describe('activateReviewer', () => {
      it('should activate a reviewer', async () => {
        const activatedReviewer = { ...testReviewer, status: 'active' as const };
        mockQueryBuilder.returning.mockResolvedValue([activatedReviewer]);

        const result = await service.activateReviewer(testReviewerId, 'admin-user-id');

        expect(mockDb).toHaveBeenCalledWith('content_reviewers');
        expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: testReviewerId });
        expect(mockQueryBuilder.update).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'active',
            approved_by: 'admin-user-id',
          })
        );
        expect(result.status).toBe('active');
      });
    });

    describe('getReviewerById', () => {
      it('should return reviewer when found', async () => {
        mockQueryBuilder.first.mockResolvedValue(testReviewer);

        const result = await service.getReviewerById(testReviewerId);

        expect(mockDb).toHaveBeenCalledWith('content_reviewers');
        expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: testReviewerId });
        expect(result).toEqual(testReviewer);
      });

      it('should return null when reviewer not found', async () => {
        mockQueryBuilder.first.mockResolvedValue(undefined);

        const result = await service.getReviewerById('non-existent-id');

        expect(result).toBeNull();
      });
    });

    describe('listReviewers', () => {
      it('should list reviewers with pagination', async () => {
        mockQueryBuilder.count.mockResolvedValue([{ count: 2 }]);
        mockQueryBuilder.orderBy.mockResolvedValue([testReviewer, testReviewer]);

        const result = await service.listReviewers({ limit: 10, offset: 0 });

        expect(result.reviewers).toHaveLength(2);
        expect(result.total).toBe(2);
      });

      it('should filter by reviewer type', async () => {
        mockQueryBuilder.count.mockResolvedValue([{ count: 1 }]);
        mockQueryBuilder.orderBy.mockResolvedValue([testReviewer]);

        await service.listReviewers({ reviewer_type: 'peer_reviewer' });

        expect(mockQueryBuilder.where).toHaveBeenCalledWith({ reviewer_type: 'peer_reviewer' });
      });

      it('should filter available reviewers only', async () => {
        mockQueryBuilder.count.mockResolvedValue([{ count: 1 }]);
        mockQueryBuilder.orderBy.mockResolvedValue([testReviewer]);

        await service.listReviewers({ available_only: true });

        expect(mockQueryBuilder.where).toHaveBeenCalledWith({
          available_for_assignment: true,
          status: 'active',
        });
      });
    });

    describe('findAvailableReviewers', () => {
      it('should find available reviewers for a submission', async () => {
        mockQueryBuilder.first.mockResolvedValue(testSubmission);
        mockQueryBuilder.select.mockResolvedValue([]);
        mockQueryBuilder.limit.mockResolvedValue([testReviewer]);

        const result = await service.findAvailableReviewers(testSubmissionId, 'peer_review');

        expect(result).toHaveLength(1);
      });

      it('should throw error if submission not found', async () => {
        mockQueryBuilder.first.mockResolvedValue(undefined);

        await expect(
          service.findAvailableReviewers('non-existent', 'peer_review')
        ).rejects.toThrow('Submission not found');
      });
    });
  });

  // ============ Submission Management Tests ============

  describe('Submission Management', () => {
    describe('createSubmission', () => {
      it('should create a new submission', async () => {
        mockQueryBuilder.returning.mockResolvedValue([testSubmission]);

        const result = await service.createSubmission({
          content_type: 'lesson',
          content_id: testContentId,
          submitted_by: testUserId,
          community_id: testCommunityId,
          title: 'Test Lesson',
        });

        expect(mockDb).toHaveBeenCalledWith('content_review_submissions');
        expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            content_type: 'lesson',
            content_id: testContentId,
            status: 'draft',
            current_stage: 'peer_review',
          })
        );
        expect(result).toEqual(testSubmission);
      });

      it('should calculate content hash when snapshot provided', async () => {
        const snapshot = { content: 'test content' };
        mockQueryBuilder.returning.mockResolvedValue([{ ...testSubmission, content_snapshot: snapshot }]);

        await service.createSubmission({
          content_type: 'lesson',
          content_id: testContentId,
          submitted_by: testUserId,
          community_id: testCommunityId,
          title: 'Test Lesson',
          content_snapshot: snapshot,
        });

        expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            content_snapshot: snapshot,
            content_hash: expect.any(String),
          })
        );
      });

      it('should set SLA deadline based on priority', async () => {
        mockQueryBuilder.returning.mockResolvedValue([testSubmission]);

        await service.createSubmission({
          content_type: 'lesson',
          content_id: testContentId,
          submitted_by: testUserId,
          community_id: testCommunityId,
          title: 'Test Lesson',
          priority: 'urgent',
        });

        expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            sla_deadline: expect.any(Date),
          })
        );
      });
    });

    describe('submitForReview', () => {
      it('should submit a draft for review', async () => {
        mockQueryBuilder.first.mockResolvedValue(testSubmission);
        mockQueryBuilder.returning.mockResolvedValue([{ ...testSubmission, status: 'submitted' }]);

        const result = await service.submitForReview(testSubmissionId, testUserId);

        expect(mockQueryBuilder.update).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'submitted',
          })
        );
        expect(result.status).toBe('submitted');
      });

      it('should throw error if submission not found', async () => {
        mockQueryBuilder.first.mockResolvedValue(undefined);

        await expect(
          service.submitForReview('non-existent', testUserId)
        ).rejects.toThrow('Submission not found');
      });

      it('should throw error if user is not the author', async () => {
        mockQueryBuilder.first.mockResolvedValue(testSubmission);

        await expect(
          service.submitForReview(testSubmissionId, 'different-user-id')
        ).rejects.toThrow('Only the author can submit content for review');
      });

      it('should throw error if submission is not in submittable state', async () => {
        mockQueryBuilder.first.mockResolvedValue({
          ...testSubmission,
          status: 'approved',
        });

        await expect(
          service.submitForReview(testSubmissionId, testUserId)
        ).rejects.toThrow('Submission is not in a submittable state');
      });
    });

    describe('getSubmissionById', () => {
      it('should return submission when found', async () => {
        mockQueryBuilder.first.mockResolvedValue(testSubmission);

        const result = await service.getSubmissionById(testSubmissionId);

        expect(result).toEqual(testSubmission);
      });

      it('should return null when not found', async () => {
        mockQueryBuilder.first.mockResolvedValue(undefined);

        const result = await service.getSubmissionById('non-existent');

        expect(result).toBeNull();
      });
    });

    describe('listSubmissions', () => {
      it('should list submissions with filters', async () => {
        mockQueryBuilder.count.mockResolvedValue([{ count: 5 }]);
        mockQueryBuilder.orderBy.mockResolvedValue([testSubmission]);

        const result = await service.listSubmissions({
          community_id: testCommunityId,
          status: 'draft',
          limit: 10,
        });

        expect(mockQueryBuilder.where).toHaveBeenCalledWith({ community_id: testCommunityId });
        expect(mockQueryBuilder.where).toHaveBeenCalledWith({ status: 'draft' });
        expect(result.total).toBe(5);
      });
    });

    describe('advanceToNextStage', () => {
      it('should advance submission to next review stage', async () => {
        mockQueryBuilder.first.mockResolvedValue(testSubmission);
        mockQueryBuilder.returning.mockResolvedValue([{
          ...testSubmission,
          current_stage: 'technical_accuracy',
          completed_stages: ['peer_review'],
        }]);

        const result = await service.advanceToNextStage(testSubmissionId, testUserId);

        expect(result.current_stage).toBe('technical_accuracy');
        expect(result.completed_stages).toContain('peer_review');
      });

      it('should throw error when at final stage', async () => {
        mockQueryBuilder.first.mockResolvedValue({
          ...testSubmission,
          current_stage: 'final_approval',
        });

        await expect(
          service.advanceToNextStage(testSubmissionId, testUserId)
        ).rejects.toThrow('Cannot advance beyond final stage');
      });
    });

    describe('withdrawSubmission', () => {
      it('should withdraw a submission', async () => {
        mockQueryBuilder.first
          .mockResolvedValueOnce(testSubmission)
          .mockResolvedValueOnce(testSubmission);
        mockQueryBuilder.returning.mockResolvedValue([{ ...testSubmission, status: 'withdrawn' }]);

        const result = await service.withdrawSubmission(testSubmissionId, testUserId);

        expect(result.status).toBe('withdrawn');
      });

      it('should throw error if not the author', async () => {
        mockQueryBuilder.first.mockResolvedValue(testSubmission);

        await expect(
          service.withdrawSubmission(testSubmissionId, 'different-user')
        ).rejects.toThrow('Only the author can withdraw a submission');
      });

      it('should throw error if already completed', async () => {
        mockQueryBuilder.first.mockResolvedValue({
          ...testSubmission,
          status: 'approved',
        });

        await expect(
          service.withdrawSubmission(testSubmissionId, testUserId)
        ).rejects.toThrow('Cannot withdraw a completed submission');
      });
    });
  });

  // ============ Review Management Tests ============

  describe('Review Management', () => {
    describe('assignReview', () => {
      it('should assign a review to a reviewer', async () => {
        mockQueryBuilder.first
          .mockResolvedValueOnce(testReviewer) // getReviewerById
          .mockResolvedValueOnce({ ...testSubmission, submitted_by: 'different-user' }) // getSubmissionById
          .mockResolvedValueOnce(undefined); // existing review check
        mockQueryBuilder.returning.mockResolvedValue([testReview]);
        mockQueryBuilder.increment.mockReturnThis();

        const result = await service.assignReview({
          submission_id: testSubmissionId,
          reviewer_id: testReviewerId,
          review_type: 'peer_review',
        });

        expect(result).toEqual(testReview);
        expect(mockQueryBuilder.increment).toHaveBeenCalledWith('current_active_reviews', 1);
      });

      it('should throw error if reviewer not found', async () => {
        mockQueryBuilder.first.mockResolvedValue(undefined);

        await expect(
          service.assignReview({
            submission_id: testSubmissionId,
            reviewer_id: 'non-existent',
            review_type: 'peer_review',
          })
        ).rejects.toThrow('Reviewer not found');
      });

      it('should throw error if reviewer is not active', async () => {
        mockQueryBuilder.first.mockResolvedValue({
          ...testReviewer,
          status: 'inactive',
        });

        await expect(
          service.assignReview({
            submission_id: testSubmissionId,
            reviewer_id: testReviewerId,
            review_type: 'peer_review',
          })
        ).rejects.toThrow('Reviewer is not active');
      });

      it('should throw error if reviewer at max capacity', async () => {
        mockQueryBuilder.first.mockResolvedValue({
          ...testReviewer,
          current_active_reviews: 5,
          max_active_reviews: 5,
        });

        await expect(
          service.assignReview({
            submission_id: testSubmissionId,
            reviewer_id: testReviewerId,
            review_type: 'peer_review',
          })
        ).rejects.toThrow('Reviewer has reached maximum active reviews');
      });

      it('should throw error if reviewer is the content author', async () => {
        mockQueryBuilder.first
          .mockResolvedValueOnce(testReviewer)
          .mockResolvedValueOnce({ ...testSubmission, submitted_by: testUserId });

        await expect(
          service.assignReview({
            submission_id: testSubmissionId,
            reviewer_id: testReviewerId,
            review_type: 'peer_review',
          })
        ).rejects.toThrow('Reviewer cannot review their own content');
      });
    });

    describe('startReview', () => {
      it('should start a review', async () => {
        mockQueryBuilder.first
          .mockResolvedValueOnce(testReview)
          .mockResolvedValueOnce(testReviewer);
        mockQueryBuilder.returning.mockResolvedValue([{
          ...testReview,
          status: 'in_progress',
          started_at: new Date(),
        }]);

        const result = await service.startReview(testReviewId, testUserId);

        expect(result.status).toBe('in_progress');
        expect(result.started_at).toBeDefined();
      });

      it('should throw error if review not found', async () => {
        mockQueryBuilder.first.mockResolvedValue(undefined);

        await expect(
          service.startReview('non-existent', testUserId)
        ).rejects.toThrow('Review not found');
      });

      it('should throw error if not authorized', async () => {
        mockQueryBuilder.first
          .mockResolvedValueOnce(testReview)
          .mockResolvedValueOnce({ ...testReviewer, user_id: 'different-user' });

        await expect(
          service.startReview(testReviewId, testUserId)
        ).rejects.toThrow('Not authorized to start this review');
      });
    });

    describe('submitReview', () => {
      it('should submit a completed review with approval', async () => {
        mockQueryBuilder.first
          .mockResolvedValueOnce({ ...testReview, status: 'in_progress' })
          .mockResolvedValueOnce(testReviewer)
          .mockResolvedValueOnce(testSubmission);
        mockQueryBuilder.returning.mockResolvedValue([{
          ...testReview,
          status: 'completed',
          decision: 'approve',
        }]);
        mockQueryBuilder.decrement.mockReturnThis();
        mockQueryBuilder.increment.mockReturnThis();

        const result = await service.submitReview(testReviewId, testUserId, {
          decision: 'approve',
          feedback: 'Great content!',
          quality_score: 0.9,
        });

        expect(result.status).toBe('completed');
        expect(result.decision).toBe('approve');
        expect(mockQueryBuilder.decrement).toHaveBeenCalledWith('current_active_reviews', 1);
        expect(mockQueryBuilder.increment).toHaveBeenCalledWith('total_reviews_completed', 1);
      });

      it('should submit a review requesting changes', async () => {
        mockQueryBuilder.first
          .mockResolvedValueOnce({ ...testReview, status: 'in_progress' })
          .mockResolvedValueOnce(testReviewer)
          .mockResolvedValueOnce(testSubmission)
          .mockResolvedValueOnce(testSubmission); // For getSubmissionById in updateSubmissionStatus
        mockQueryBuilder.returning
          .mockResolvedValueOnce([{
            ...testReview,
            status: 'completed',
            decision: 'request_changes',
          }])
          .mockResolvedValueOnce([{ ...testSubmission, status: 'changes_requested' }]);
        mockQueryBuilder.decrement.mockReturnThis();
        mockQueryBuilder.increment.mockReturnThis();

        const result = await service.submitReview(testReviewId, testUserId, {
          decision: 'request_changes',
          feedback: 'Please fix the typos',
        });

        expect(result.decision).toBe('request_changes');
      });
    });

    describe('declineReview', () => {
      it('should decline a review assignment', async () => {
        mockQueryBuilder.first
          .mockResolvedValueOnce(testReview)
          .mockResolvedValueOnce(testReviewer);
        mockQueryBuilder.returning.mockResolvedValue([{
          ...testReview,
          status: 'declined',
        }]);
        mockQueryBuilder.decrement.mockReturnThis();

        const result = await service.declineReview(testReviewId, testUserId, 'Too busy');

        expect(result.status).toBe('declined');
        expect(mockQueryBuilder.decrement).toHaveBeenCalledWith('current_active_reviews', 1);
      });

      it('should throw error if review is already started', async () => {
        mockQueryBuilder.first
          .mockResolvedValueOnce({ ...testReview, status: 'in_progress' })
          .mockResolvedValueOnce(testReviewer);

        await expect(
          service.declineReview(testReviewId, testUserId)
        ).rejects.toThrow('Only assigned reviews can be declined');
      });
    });
  });

  // ============ Review Comments Tests ============

  describe('Review Comments', () => {
    describe('addComment', () => {
      it('should add a comment to a review', async () => {
        const testComment: ReviewComment = {
          id: 'comment-id',
          review_id: testReviewId,
          location_type: 'paragraph',
          location_ref: 'p1',
          line_start: 10,
          line_end: 15,
          comment: 'This needs clarification',
          comment_type: 'suggestion',
          severity: 'minor',
          status: 'open',
          resolution_note: null,
          resolved_by: null,
          resolved_at: null,
          parent_comment_id: null,
          thread_depth: 0,
          metadata: null,
          created_at: new Date(),
          updated_at: new Date(),
        };

        mockQueryBuilder.first.mockResolvedValue(testReview);
        mockQueryBuilder.returning.mockResolvedValue([testComment]);

        const result = await service.addComment({
          review_id: testReviewId,
          comment: 'This needs clarification',
          comment_type: 'suggestion',
          severity: 'minor',
          location_type: 'paragraph',
          location_ref: 'p1',
          line_start: 10,
          line_end: 15,
        });

        expect(result.comment).toBe('This needs clarification');
        expect(result.comment_type).toBe('suggestion');
      });

      it('should throw error if review not found', async () => {
        mockQueryBuilder.first.mockResolvedValue(undefined);

        await expect(
          service.addComment({
            review_id: 'non-existent',
            comment: 'Test comment',
          })
        ).rejects.toThrow('Review not found');
      });
    });

    describe('resolveComment', () => {
      it('should resolve a comment', async () => {
        mockQueryBuilder.returning.mockResolvedValue([{
          id: 'comment-id',
          status: 'resolved',
          resolved_by: testUserId,
          resolved_at: new Date(),
          resolution_note: 'Fixed in revision 2',
        }]);

        const result = await service.resolveComment('comment-id', testUserId, 'Fixed in revision 2');

        expect(result.status).toBe('resolved');
        expect(result.resolved_by).toBe(testUserId);
        expect(result.resolution_note).toBe('Fixed in revision 2');
      });
    });

    describe('getReviewComments', () => {
      it('should get all comments for a review', async () => {
        const comments = [
          { id: 'comment-1', comment: 'First comment' },
          { id: 'comment-2', comment: 'Second comment' },
        ];
        mockQueryBuilder.orderBy.mockResolvedValue(comments);

        const result = await service.getReviewComments(testReviewId);

        expect(result).toHaveLength(2);
        expect(mockQueryBuilder.where).toHaveBeenCalledWith({ review_id: testReviewId });
      });
    });
  });

  // ============ Plagiarism Checks Tests ============

  describe('Plagiarism Checks', () => {
    describe('createPlagiarismCheck', () => {
      it('should create a plagiarism check', async () => {
        const testCheck: PlagiarismCheck = {
          id: 'check-id',
          submission_id: testSubmissionId,
          check_type: 'full',
          check_settings: null,
          status: 'pending',
          overall_similarity_score: null,
          highest_match_score: null,
          total_matches_found: 0,
          matches: null,
          exclusions: null,
          requires_human_review: false,
          reviewed_by: null,
          review_decision: null,
          review_notes: null,
          processing_time_ms: null,
          service_version: null,
          error_details: null,
          created_at: new Date(),
          completed_at: null,
        };

        mockQueryBuilder.returning.mockResolvedValue([testCheck]);

        const result = await service.createPlagiarismCheck(testSubmissionId);

        expect(result.status).toBe('pending');
        expect(result.check_type).toBe('full');
      });
    });

    describe('updatePlagiarismCheck', () => {
      it('should update plagiarism check with results', async () => {
        mockQueryBuilder.returning.mockResolvedValue([{
          id: 'check-id',
          submission_id: testSubmissionId,
          status: 'completed',
          overall_similarity_score: 15.5,
          requires_human_review: false,
        }]);

        const result = await service.updatePlagiarismCheck('check-id', {
          status: 'completed',
          overall_similarity_score: 15.5,
          total_matches_found: 3,
        });

        expect(result.status).toBe('completed');
        expect(result.overall_similarity_score).toBe(15.5);
      });

      it('should flag for human review if score is high', async () => {
        mockQueryBuilder.returning.mockResolvedValue([{
          id: 'check-id',
          status: 'completed',
          overall_similarity_score: 25,
          requires_human_review: true,
        }]);

        const result = await service.updatePlagiarismCheck('check-id', {
          status: 'completed',
          overall_similarity_score: 25,
        });

        expect(result.requires_human_review).toBe(true);
      });
    });

    describe('reviewPlagiarismCheck', () => {
      it('should record human review decision', async () => {
        mockQueryBuilder.returning.mockResolvedValue([{
          id: 'check-id',
          reviewed_by: testUserId,
          review_decision: 'cleared',
          review_notes: 'False positive',
          requires_human_review: false,
        }]);

        const result = await service.reviewPlagiarismCheck(
          'check-id',
          testUserId,
          'cleared',
          'False positive'
        );

        expect(result.review_decision).toBe('cleared');
        expect(result.requires_human_review).toBe(false);
      });
    });
  });

  // ============ Accessibility Checks Tests ============

  describe('Accessibility Checks', () => {
    describe('createAccessibilityCheck', () => {
      it('should create an accessibility check', async () => {
        const testCheck: AccessibilityCheck = {
          id: 'check-id',
          submission_id: testSubmissionId,
          wcag_level: 'AA',
          check_settings: null,
          status: 'pending',
          passed: false,
          compliance_score: null,
          critical_issues: 0,
          serious_issues: 0,
          moderate_issues: 0,
          minor_issues: 0,
          issues: null,
          checks_performed: null,
          checks_passed: null,
          checks_failed: null,
          processing_time_ms: null,
          service_version: null,
          error_details: null,
          created_at: new Date(),
          completed_at: null,
        };

        mockQueryBuilder.returning.mockResolvedValue([testCheck]);

        const result = await service.createAccessibilityCheck(testSubmissionId, 'AA');

        expect(result.wcag_level).toBe('AA');
        expect(result.status).toBe('pending');
      });
    });

    describe('updateAccessibilityCheck', () => {
      it('should update accessibility check with passing results', async () => {
        mockQueryBuilder.returning.mockResolvedValue([{
          id: 'check-id',
          status: 'completed',
          passed: true,
          compliance_score: 95,
          critical_issues: 0,
          serious_issues: 0,
        }]);

        const result = await service.updateAccessibilityCheck('check-id', {
          status: 'completed',
          passed: true,
          compliance_score: 95,
          critical_issues: 0,
          serious_issues: 0,
        });

        expect(result.passed).toBe(true);
        expect(result.compliance_score).toBe(95);
      });

      it('should update with failing results', async () => {
        mockQueryBuilder.returning.mockResolvedValue([{
          id: 'check-id',
          status: 'completed',
          passed: false,
          compliance_score: 60,
          critical_issues: 2,
          serious_issues: 5,
        }]);

        const result = await service.updateAccessibilityCheck('check-id', {
          status: 'completed',
          passed: false,
          compliance_score: 60,
          critical_issues: 2,
          serious_issues: 5,
        });

        expect(result.passed).toBe(false);
        expect(result.critical_issues).toBe(2);
      });
    });
  });

  // ============ Appeals Tests ============

  describe('Appeals', () => {
    describe('createAppeal', () => {
      it('should create an appeal for a rejected submission', async () => {
        mockQueryBuilder.first.mockResolvedValue({
          ...testSubmission,
          status: 'rejected',
        });

        const testAppeal: ReviewAppeal = {
          id: 'appeal-id',
          submission_id: testSubmissionId,
          original_review_id: testReviewId,
          appealed_by: testUserId,
          appeal_reason: 'The rejection was based on incorrect information',
          supporting_evidence: { documents: ['doc1.pdf'] },
          appeal_type: 'factual_error',
          status: 'submitted',
          reviewed_by: null,
          decision: null,
          decision_rationale: null,
          sla_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          sla_met: null,
          metadata: null,
          created_at: new Date(),
          updated_at: new Date(),
          decided_at: null,
        };

        mockQueryBuilder.returning.mockResolvedValue([testAppeal]);

        const result = await service.createAppeal({
          submission_id: testSubmissionId,
          original_review_id: testReviewId,
          appealed_by: testUserId,
          appeal_reason: 'The rejection was based on incorrect information',
          supporting_evidence: { documents: ['doc1.pdf'] },
          appeal_type: 'factual_error',
        });

        expect(result.appeal_type).toBe('factual_error');
        expect(result.status).toBe('submitted');
      });

      it('should throw error if submission not found', async () => {
        mockQueryBuilder.first.mockResolvedValue(undefined);

        await expect(
          service.createAppeal({
            submission_id: 'non-existent',
            appealed_by: testUserId,
            appeal_reason: 'Test reason',
            appeal_type: 'other',
          })
        ).rejects.toThrow('Submission not found');
      });

      it('should throw error if user is not the author', async () => {
        mockQueryBuilder.first.mockResolvedValue({
          ...testSubmission,
          status: 'rejected',
          submitted_by: 'different-user',
        });

        await expect(
          service.createAppeal({
            submission_id: testSubmissionId,
            appealed_by: testUserId,
            appeal_reason: 'Test reason',
            appeal_type: 'other',
          })
        ).rejects.toThrow('Only the content author can appeal');
      });

      it('should throw error if submission is not rejected', async () => {
        mockQueryBuilder.first.mockResolvedValue({
          ...testSubmission,
          status: 'approved',
        });

        await expect(
          service.createAppeal({
            submission_id: testSubmissionId,
            appealed_by: testUserId,
            appeal_reason: 'Test reason',
            appeal_type: 'other',
          })
        ).rejects.toThrow('Can only appeal rejected or changes-requested submissions');
      });
    });

    describe('decideAppeal', () => {
      it('should overturn an appeal', async () => {
        const testAppeal: ReviewAppeal = {
          id: 'appeal-id',
          submission_id: testSubmissionId,
          original_review_id: testReviewId,
          appealed_by: testUserId,
          appeal_reason: 'Test',
          supporting_evidence: null,
          appeal_type: 'factual_error',
          status: 'under_review',
          reviewed_by: null,
          decision: null,
          decision_rationale: null,
          sla_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          sla_met: null,
          metadata: null,
          created_at: new Date(),
          updated_at: new Date(),
          decided_at: null,
        };

        mockQueryBuilder.first
          .mockResolvedValueOnce(testAppeal)
          .mockResolvedValueOnce(testSubmission)
          .mockResolvedValueOnce(testReview);
        mockQueryBuilder.returning
          .mockResolvedValueOnce([{
            ...testAppeal,
            status: 'decided',
            decision: 'overturned',
            decision_rationale: 'Reviewer made an error',
          }])
          .mockResolvedValueOnce([{ ...testSubmission, status: 'in_review' }]);
        mockQueryBuilder.increment.mockReturnThis();

        const result = await service.decideAppeal(
          'appeal-id',
          'admin-user-id',
          'overturned',
          'Reviewer made an error'
        );

        expect(result.decision).toBe('overturned');
        expect(result.status).toBe('decided');
      });

      it('should uphold an appeal', async () => {
        const testAppeal = {
          id: 'appeal-id',
          submission_id: testSubmissionId,
          status: 'under_review',
          sla_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        };

        mockQueryBuilder.first.mockResolvedValue(testAppeal);
        mockQueryBuilder.returning.mockResolvedValue([{
          ...testAppeal,
          status: 'decided',
          decision: 'upheld',
        }]);

        const result = await service.decideAppeal(
          'appeal-id',
          'admin-user-id',
          'upheld',
          'Original decision was correct'
        );

        expect(result.decision).toBe('upheld');
      });

      it('should throw error if appeal already decided', async () => {
        mockQueryBuilder.first.mockResolvedValue({
          id: 'appeal-id',
          status: 'decided',
        });

        await expect(
          service.decideAppeal('appeal-id', 'admin-id', 'upheld', 'Test')
        ).rejects.toThrow('Appeal has already been decided');
      });
    });
  });

  // ============ Workflow History Tests ============

  describe('Workflow History', () => {
    describe('getWorkflowHistory', () => {
      it('should get workflow history for a submission', async () => {
        const history = [
          {
            id: 'history-1',
            action: 'submission_created',
            created_at: new Date('2024-01-01'),
          },
          {
            id: 'history-2',
            action: 'submitted_for_review',
            created_at: new Date('2024-01-02'),
          },
          {
            id: 'history-3',
            action: 'review_assigned',
            created_at: new Date('2024-01-03'),
          },
        ];

        mockQueryBuilder.orderBy.mockResolvedValue(history);

        const result = await service.getWorkflowHistory(testSubmissionId);

        expect(result).toHaveLength(3);
        expect(result[0].action).toBe('submission_created');
      });
    });
  });

  // ============ Statistics Tests ============

  describe('Statistics', () => {
    describe('getSubmissionStats', () => {
      it('should get submission statistics for a community', async () => {
        const submissions = [
          { status: 'draft', current_stage: 'peer_review', created_at: new Date(), completed_at: null },
          { status: 'approved', current_stage: 'final_approval', created_at: new Date('2024-01-01'), completed_at: new Date('2024-01-05') },
          { status: 'in_review', current_stage: 'technical_accuracy', created_at: new Date(), completed_at: null },
          { status: 'approved', current_stage: 'final_approval', created_at: new Date('2024-01-01'), completed_at: new Date('2024-01-03') },
        ];

        mockQueryBuilder.select.mockResolvedValue(submissions);

        const result = await service.getSubmissionStats(testCommunityId);

        expect(result.total).toBe(4);
        expect(result.byStatus.draft).toBe(1);
        expect(result.byStatus.approved).toBe(2);
        expect(result.byStatus.in_review).toBe(1);
        expect(result.approvalRate).toBe(1); // 2 out of 2 completed are approved
      });
    });

    describe('getReviewerStats', () => {
      it('should get reviewer performance statistics', async () => {
        mockQueryBuilder.first.mockResolvedValue(testReviewer);
        mockQueryBuilder.select.mockResolvedValue([
          { time_spent_minutes: 30, quality_score: 0.9 },
          { time_spent_minutes: 45, quality_score: 0.85 },
          { time_spent_minutes: 25, quality_score: 0.95 },
        ]);

        const result = await service.getReviewerStats(testReviewerId);

        expect(result.totalReviews).toBe(10);
        expect(result.completedReviews).toBe(3);
        expect(result.onTimeRate).toBe(0.9);
        expect(result.avgReviewTime).toBeCloseTo(33.33, 1);
        expect(result.avgQualityScore).toBe(0.9);
      });

      it('should throw error if reviewer not found', async () => {
        mockQueryBuilder.first.mockResolvedValue(undefined);

        await expect(
          service.getReviewerStats('non-existent')
        ).rejects.toThrow('Reviewer not found');
      });
    });
  });

  // ============ Automated Checks Tests ============

  describe('Automated Checks', () => {
    describe('runAutomatedChecks', () => {
      it('should run both plagiarism and accessibility checks', async () => {
        // Mock for getSubmissionById and getPlagiarismCheck/getAccessibilityCheck calls
        mockQueryBuilder.first
          .mockResolvedValueOnce(testSubmission)
          .mockResolvedValueOnce({ id: 'plag-check', submission_id: testSubmissionId })
          .mockResolvedValueOnce(testSubmission)
          .mockResolvedValueOnce({ id: 'acc-check', submission_id: testSubmissionId })
          .mockResolvedValueOnce(testSubmission)
          .mockResolvedValueOnce({ id: 'plag-check', overall_similarity_score: 10 }) // For orderBy().first()
          .mockResolvedValueOnce({ id: 'acc-check', passed: true }); // For orderBy().first()

        mockQueryBuilder.returning
          .mockResolvedValueOnce([{ id: 'plag-check', status: 'pending' }])
          .mockResolvedValueOnce([{ id: 'acc-check', status: 'pending' }])
          .mockResolvedValueOnce([{ id: 'plag-check', status: 'completed', overall_similarity_score: 10 }])
          .mockResolvedValueOnce([{ id: 'acc-check', status: 'completed', passed: true }]);

        const result = await service.runAutomatedChecks(testSubmissionId);

        expect(result).toHaveProperty('plagiarism');
        expect(result).toHaveProperty('accessibility');
      });

      it('should throw error if submission not found', async () => {
        mockQueryBuilder.first.mockResolvedValue(undefined);

        await expect(
          service.runAutomatedChecks('non-existent')
        ).rejects.toThrow('Submission not found');
      });
    });
  });
});
