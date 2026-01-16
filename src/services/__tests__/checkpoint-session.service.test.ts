/**
 * Tests for CheckpointSessionService
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
import { CheckpointTypesService } from '../checkpoint-types.service';

describe('CheckpointSessionService', () => {
  let app: FastifyInstance;
  let db: any;
  let sessionService: CheckpointSessionService;
  let typesService: CheckpointTypesService;
  let userId: string;
  let communityId: string;
  let checkpointId: string;
  let categoryId: string;

  beforeEach(async () => {
    await cleanDatabase();
    app = await createTestApp();
    db = getDatabase();
    sessionService = new CheckpointSessionService(db);
    typesService = new CheckpointTypesService();

    // Create test user and community
    const user = await createTestUser({ password: 'TestPassword123!' });
    userId = user.id;

    const community = await createTestCommunity(userId);
    communityId = community.id;

    // Create checkpoint category
    [{ id: categoryId }] = await db('checkpoint_categories').insert({
      code: 'knowledge',
      name: 'Knowledge Assessment',
      description: 'Test knowledge',
      is_active: true,
      display_order: 1,
    }).returning('id');

    // Create a test checkpoint
    const checkpoint = await typesService.createCheckpoint(userId, {
      name: 'Test Checkpoint',
      description: 'Test checkpoint for session tests',
      community_id: communityId,
      category_id: categoryId,
      passing_score: 70,
      allow_pause: true,
      status: 'draft',
    });

    // Publish the checkpoint
    const published = await typesService.publishCheckpoint(checkpoint.id, userId);
    checkpointId = published.id;

    // Add a test question
    const [questionId] = await db('assessment_questions').insert({
      community_id: communityId,
      question_text: 'Test question',
      question_type: 'multiple_choice',
      question_content: {},
      difficulty: 'easy',
      points: 10,
      objective_ids: [],
      tags: [],
      created_by: userId,
    }).returning('id');

    // Get format type
    const formatType = await db('checkpoint_format_types')
      .where({ code: 'multiple_choice' })
      .first();

    // Add question to checkpoint
    await typesService.addQuestionToCheckpoint(checkpointId, {
      question_id: questionId.id,
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

  describe('createSession', () => {
    it('should create a new checkpoint session', async () => {
      const session = await sessionService.createSession(userId, checkpointId, {
        checkpoint_id: checkpointId,
        device_type: 'desktop',
        browser: 'Chrome',
        os: 'macOS',
      });

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.user_id).toBe(userId);
      expect(session.checkpoint_id).toBe(checkpointId);
      expect(session.status).toBe('initializing');
      expect(session.attempt_number).toBe(1);
      expect(session.questions_total).toBe(1);
    });

    it('should increment attempt number for subsequent sessions', async () => {
      // Create first session
      const session1 = await sessionService.createSession(userId, checkpointId, {
        checkpoint_id: checkpointId,
      });
      expect(session1.attempt_number).toBe(1);

      // Create second session
      const session2 = await sessionService.createSession(userId, checkpointId, {
        checkpoint_id: checkpointId,
      });
      expect(session2.attempt_number).toBe(2);
    });

    it('should throw error for inactive checkpoint', async () => {
      // Archive the checkpoint
      await db('checkpoints')
        .where({ id: checkpointId })
        .update({ status: 'closed' });

      await expect(
        sessionService.createSession(userId, checkpointId, {
          checkpoint_id: checkpointId,
        })
      ).rejects.toThrow('Checkpoint is not active');
    });
  });

  describe('startSession', () => {
    it('should start an initialized session', async () => {
      const session = await sessionService.createSession(userId, checkpointId, {
        checkpoint_id: checkpointId,
      });

      const started = await sessionService.startSession(session.id);

      expect(started.status).toBe('in_progress');
      expect(started.started_at).toBeDefined();
    });

    it('should throw error if session not in initializing state', async () => {
      const session = await sessionService.createSession(userId, checkpointId, {
        checkpoint_id: checkpointId,
      });
      await sessionService.startSession(session.id);

      // Try to start again
      await expect(
        sessionService.startSession(session.id)
      ).rejects.toThrow('can only be started from initializing state');
    });
  });

  describe('pauseSession', () => {
    it('should pause an in-progress session', async () => {
      const session = await sessionService.createSession(userId, checkpointId, {
        checkpoint_id: checkpointId,
      });
      const started = await sessionService.startSession(session.id);

      const paused = await sessionService.pauseSession(started.id);

      expect(paused.status).toBe('paused');
      expect(paused.time_elapsed_seconds).toBeGreaterThanOrEqual(0);
    });

    it('should throw error if pausing is not allowed', async () => {
      // Update checkpoint to disallow pause
      await db('checkpoints')
        .where({ id: checkpointId })
        .update({ allow_pause: false });

      const session = await sessionService.createSession(userId, checkpointId, {
        checkpoint_id: checkpointId,
      });
      const started = await sessionService.startSession(session.id);

      await expect(
        sessionService.pauseSession(started.id)
      ).rejects.toThrow('Pausing is not allowed');
    });
  });

  describe('resumeSession', () => {
    it('should resume a paused session', async () => {
      const session = await sessionService.createSession(userId, checkpointId, {
        checkpoint_id: checkpointId,
      });
      const started = await sessionService.startSession(session.id);
      const paused = await sessionService.pauseSession(started.id);

      const resumed = await sessionService.resumeSession(paused.id);

      expect(resumed.status).toBe('in_progress');
    });

    it('should throw error if session is not paused', async () => {
      const session = await sessionService.createSession(userId, checkpointId, {
        checkpoint_id: checkpointId,
      });
      const started = await sessionService.startSession(session.id);

      await expect(
        sessionService.resumeSession(started.id)
      ).rejects.toThrow('Can only resume paused sessions');
    });
  });

  describe('submitSession', () => {
    it('should submit an in-progress session', async () => {
      const session = await sessionService.createSession(userId, checkpointId, {
        checkpoint_id: checkpointId,
      });
      const started = await sessionService.startSession(session.id);

      const submitted = await sessionService.submitSession(started.id, userId);

      expect(submitted.status).toBe('submitted');
      expect(submitted.ended_at).toBeDefined();
    });

    it('should throw error if user unauthorized', async () => {
      const session = await sessionService.createSession(userId, checkpointId, {
        checkpoint_id: checkpointId,
      });
      const started = await sessionService.startSession(session.id);

      const otherUser = await createTestUser();

      await expect(
        sessionService.submitSession(started.id, otherUser.id)
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('getSession', () => {
    it('should retrieve a session by ID', async () => {
      const session = await sessionService.createSession(userId, checkpointId, {
        checkpoint_id: checkpointId,
      });

      const retrieved = await sessionService.getSession(session.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(session.id);
      expect(retrieved!.user_id).toBe(userId);
    });

    it('should return null for non-existent session', async () => {
      const retrieved = await sessionService.getSession('00000000-0000-0000-0000-000000000000');

      expect(retrieved).toBeNull();
    });
  });

  describe('getSessionProgress', () => {
    it('should return session progress', async () => {
      const session = await sessionService.createSession(userId, checkpointId, {
        checkpoint_id: checkpointId,
      });

      const progress = await sessionService.getSessionProgress(session.id);

      expect(progress.session_id).toBe(session.id);
      expect(progress.status).toBe('initializing');
      expect(progress.questions_total).toBe(1);
      expect(progress.questions_answered).toBe(0);
      expect(progress.completion_percentage).toBe(0);
    });
  });

  describe('recordEvent', () => {
    it('should record a session event', async () => {
      const session = await sessionService.createSession(userId, checkpointId, {
        checkpoint_id: checkpointId,
      });

      const event = await sessionService.recordEvent({
        session_id: session.id,
        event_type: 'question_view',
        event_data: { test: 'data' },
      });

      expect(event).toBeDefined();
      expect(event.session_id).toBe(session.id);
      expect(event.event_type).toBe('question_view');
      expect(event.is_suspicious).toBe(false);
    });

    it('should flag suspicious events', async () => {
      const session = await sessionService.createSession(userId, checkpointId, {
        checkpoint_id: checkpointId,
      });

      const event = await sessionService.recordEvent({
        session_id: session.id,
        event_type: 'tab_switch',
        event_data: {},
      });

      expect(event.is_suspicious).toBe(true);
      expect(event.suspicion_reason).toBeDefined();

      // Check session is flagged
      const updatedSession = await sessionService.getSession(session.id);
      expect(updatedSession!.integrity_flagged).toBe(true);
    });
  });
});
