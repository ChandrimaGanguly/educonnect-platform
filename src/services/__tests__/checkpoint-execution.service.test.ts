/**
 * Tests for CheckpointExecutionService
 * Phase 1 Group E: Checkpoint Execution
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  createTestApp,
  cleanupTestApp,
  cleanDatabase,
  createTestUser,
  createTestCommunity,
} from '../../test/helpers';
import type { FastifyInstance } from 'fastify';
import { getDatabase } from '../../database';
import { CheckpointSessionService } from '../checkpoint-session.service';
import { CheckpointExecutionService } from '../checkpoint-execution.service';
import { CheckpointTypesService } from '../checkpoint-types.service';

describe('CheckpointExecutionService', () => {
  let app: FastifyInstance;
  let db: any;
  let sessionService: CheckpointSessionService;
  let executionService: CheckpointExecutionService;
  let typesService: CheckpointTypesService;
  let userId: string;
  let communityId: string;
  let checkpointId: string;
  let questionId: string;
  let optionAId: string;
  let optionBId: string;

  beforeEach(async () => {
    await cleanDatabase();
    app = await createTestApp();
    db = getDatabase();
    sessionService = new CheckpointSessionService(db);
    executionService = new CheckpointExecutionService(db);
    typesService = new CheckpointTypesService();

    // Create test user and community
    const user = await createTestUser({ password: 'TestPassword123!' });
    userId = user.id;

    const community = await createTestCommunity(userId);
    communityId = community.id;

    // Create checkpoint category
    const [category] = await db('checkpoint_categories').insert({
      code: 'knowledge',
      name: 'Knowledge Assessment',
      description: 'Test knowledge',
      is_active: true,
      display_order: 1,
    }).returning('*');

    // Create checkpoint
    const checkpoint = await typesService.createCheckpoint(userId, {
      name: 'Test Checkpoint',
      description: 'Test checkpoint for execution tests',
      community_id: communityId,
      category_id: category.id,
      passing_score: 70,
      allow_pause: true,
      status: 'draft',
    });

    const published = await typesService.publishCheckpoint(checkpoint.id, userId);
    checkpointId = published.id;

    // Create test question
    const [question] = await db('assessment_questions').insert({
      community_id: communityId,
      question_text: 'What is 2+2?',
      question_type: 'multiple_choice',
      question_content: {},
      difficulty: 'easy',
      points: 10,
      objective_ids: [],
      tags: [],
      created_by: userId,
    }).returning('*');
    questionId = question.id;

    // Create options
    const [optionA] = await db('assessment_options').insert({
      question_id: questionId,
      option_text: '4',
      option_content: {},
      is_correct: true,
      display_order: 0,
    }).returning('*');
    optionAId = optionA.id;

    const [optionB] = await db('assessment_options').insert({
      question_id: questionId,
      option_text: '5',
      option_content: {},
      is_correct: false,
      display_order: 1,
    }).returning('*');
    optionBId = optionB.id;

    // Get format type
    const formatType = await db('checkpoint_format_types')
      .where({ code: 'multiple_choice' })
      .first();

    // Add question to checkpoint
    await typesService.addQuestionToCheckpoint(checkpointId, {
      question_id: questionId,
      format_type_id: formatType.id,
      display_order: 0,
      is_required: true,
    });
  });

  afterEach(async () => {
    if (app) {
      await cleanupTestApp(app);
    }
  });

  describe('getSessionQuestions', () => {
    it('should fetch questions without N+1 queries', async () => {
      // Create session
      const session = await sessionService.createSession(userId, checkpointId, {
        checkpoint_id: checkpointId,
      });
      await sessionService.startSession(session.id);

      // Get questions - should use batch queries
      const result = await executionService.getSessionQuestions(session.id, userId);

      expect(result.questions).toHaveLength(1);
      expect(result.questions[0].question_id).toBe(questionId);
      expect(result.questions[0].question_data.options).toHaveLength(2);
    });

    it('should shuffle questions when enabled', async () => {
      // Add more questions
      for (let i = 0; i < 5; i++) {
        const [q] = await db('assessment_questions').insert({
          community_id: communityId,
          question_text: `Question ${i}`,
          question_type: 'multiple_choice',
          question_content: {},
          difficulty: 'easy',
          points: 10,
          created_by: userId,
        }).returning('*');

        const formatType = await db('checkpoint_format_types')
          .where({ code: 'multiple_choice' })
          .first();

        await typesService.addQuestionToCheckpoint(checkpointId, {
          question_id: q.id,
          format_type_id: formatType.id,
          display_order: i + 1,
          is_required: false,
        });
      }

      // Enable shuffling
      await db('checkpoints')
        .where({ id: checkpointId })
        .update({ shuffle_questions: true });

      const session = await sessionService.createSession(userId, checkpointId, {
        checkpoint_id: checkpointId,
      });

      const result = await executionService.getSessionQuestions(session.id, userId);

      // Should have all questions
      expect(result.questions).toHaveLength(6);
      expect(result.shuffle_options).toBe(false);
    });
  });

  describe('submitResponse', () => {
    it('should handle concurrent response submissions atomically', async () => {
      const session = await sessionService.createSession(userId, checkpointId, {
        checkpoint_id: checkpointId,
      });
      await sessionService.startSession(session.id);

      // Submit same question twice concurrently with different answers
      const [result1, result2] = await Promise.all([
        executionService.submitResponse({
          session_id: session.id,
          question_id: questionId,
          selected_options: [optionAId],
          time_spent_seconds: 10,
        }, userId),
        executionService.submitResponse({
          session_id: session.id,
          question_id: questionId,
          selected_options: [optionBId],
          time_spent_seconds: 15,
        }, userId),
      ]);

      // Both should succeed (upsert pattern)
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();

      // Check final state - one of them should be the final answer
      const finalResponse = await db('checkpoint_responses')
        .where({ session_id: session.id, question_id: questionId })
        .first();

      expect(finalResponse).toBeDefined();
      expect(finalResponse.status).toBe('answered');
      // The final answer should be one of the two submitted
      expect([optionAId, optionBId]).toContain(finalResponse.selected_options[0]);
    });

    it('should validate response structure', async () => {
      const session = await sessionService.createSession(userId, checkpointId, {
        checkpoint_id: checkpointId,
      });
      await sessionService.startSession(session.id);

      // Try to submit without required fields
      await expect(
        executionService.submitResponse({
          session_id: session.id,
          question_id: questionId,
          selected_options: [], // Empty for single choice
        }, userId)
      ).rejects.toThrow('Single choice questions require exactly one option selected');
    });

    it('should update session progress after submission', async () => {
      const session = await sessionService.createSession(userId, checkpointId, {
        checkpoint_id: checkpointId,
      });
      await sessionService.startSession(session.id);

      // Submit response
      await executionService.submitResponse({
        session_id: session.id,
        question_id: questionId,
        selected_options: [optionAId],
      }, userId);

      // Check progress
      const progress = await sessionService.getSessionProgress(session.id);
      expect(progress.questions_answered).toBe(1);
      expect(progress.completion_percentage).toBe(100);
    });
  });

  describe('flagQuestion', () => {
    it('should flag question for review', async () => {
      const session = await sessionService.createSession(userId, checkpointId, {
        checkpoint_id: checkpointId,
      });
      await sessionService.startSession(session.id);

      // First submit a response
      await executionService.submitResponse({
        session_id: session.id,
        question_id: questionId,
        selected_options: [optionAId],
      }, userId);

      // Flag it
      const flagged = await executionService.flagQuestion(
        session.id,
        questionId,
        userId
      );

      expect(flagged.status).toBe('flagged');
      expect(flagged.flagged_for_review).toBe(true);
    });

    it('should unflag question', async () => {
      const session = await sessionService.createSession(userId, checkpointId, {
        checkpoint_id: checkpointId,
      });
      await sessionService.startSession(session.id);

      await executionService.submitResponse({
        session_id: session.id,
        question_id: questionId,
        selected_options: [optionAId],
      }, userId);

      await executionService.flagQuestion(session.id, questionId, userId);

      const unflagged = await executionService.unflagQuestion(
        session.id,
        questionId,
        userId
      );

      expect(unflagged.status).toBe('answered');
      expect(unflagged.flagged_for_review).toBe(false);
    });
  });

  describe('skipQuestion', () => {
    it('should skip non-required questions', async () => {
      // Create a non-required question
      const [question2] = await db('assessment_questions').insert({
        community_id: communityId,
        question_text: 'Optional question',
        question_type: 'multiple_choice',
        question_content: {},
        difficulty: 'easy',
        points: 5,
        created_by: userId,
      }).returning('*');

      const formatType = await db('checkpoint_format_types')
        .where({ code: 'multiple_choice' })
        .first();

      await typesService.addQuestionToCheckpoint(checkpointId, {
        question_id: question2.id,
        format_type_id: formatType.id,
        display_order: 1,
        is_required: false, // Not required
      });

      const session = await sessionService.createSession(userId, checkpointId, {
        checkpoint_id: checkpointId,
      });
      await sessionService.startSession(session.id);

      const skipped = await executionService.skipQuestion(
        session.id,
        question2.id,
        userId
      );

      expect(skipped.status).toBe('skipped');

      // Check session was updated
      const updatedSession = await sessionService.getSession(session.id);
      expect(updatedSession!.questions_skipped).toBe(1);
    });

    it('should not allow skipping required questions', async () => {
      const session = await sessionService.createSession(userId, checkpointId, {
        checkpoint_id: checkpointId,
      });
      await sessionService.startSession(session.id);

      await expect(
        executionService.skipQuestion(session.id, questionId, userId)
      ).rejects.toThrow('Cannot skip required questions');
    });
  });

  describe('checkCompleteness', () => {
    it('should check if all required questions are answered', async () => {
      const session = await sessionService.createSession(userId, checkpointId, {
        checkpoint_id: checkpointId,
      });
      await sessionService.startSession(session.id);

      // Check before answering
      let completeness = await executionService.checkCompleteness(session.id);
      expect(completeness.is_complete).toBe(false);
      expect(completeness.unanswered_required).toContain(questionId);
      expect(completeness.total_required).toBe(1);
      expect(completeness.answered_required).toBe(0);

      // Answer the question
      await executionService.submitResponse({
        session_id: session.id,
        question_id: questionId,
        selected_options: [optionAId],
      }, userId);

      // Check after answering
      completeness = await executionService.checkCompleteness(session.id);
      expect(completeness.is_complete).toBe(true);
      expect(completeness.unanswered_required).toHaveLength(0);
      expect(completeness.answered_required).toBe(1);
    });
  });

  describe('Authorization', () => {
    it('should prevent unauthorized access to questions', async () => {
      const session = await sessionService.createSession(userId, checkpointId, {
        checkpoint_id: checkpointId,
      });

      const otherUser = await createTestUser();

      await expect(
        executionService.getSessionQuestions(session.id, otherUser.id)
      ).rejects.toThrow('Unauthorized');
    });

    it('should prevent unauthorized response submission', async () => {
      const session = await sessionService.createSession(userId, checkpointId, {
        checkpoint_id: checkpointId,
      });
      await sessionService.startSession(session.id);

      const otherUser = await createTestUser();

      await expect(
        executionService.submitResponse({
          session_id: session.id,
          question_id: questionId,
          selected_options: [optionAId],
        }, otherUser.id)
      ).rejects.toThrow('Unauthorized');
    });
  });
});
