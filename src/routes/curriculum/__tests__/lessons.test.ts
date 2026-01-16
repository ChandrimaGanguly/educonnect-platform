import { FastifyInstance } from 'fastify';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  createTestApp,
  cleanupTestApp,
  cleanDatabase,
  createTestUser,
  generateTestToken,
  cleanCurriculumDatabase,
  createTestCurriculum,
  createTestModule,
  createTestLesson,
} from '../../../test/helpers';
import { getDatabase } from '../../../database';

describe('Lesson Routes', () => {
  let app: FastifyInstance;
  let testUser: any;
  let token: string;

  beforeEach(async () => {
    app = await createTestApp();
    await cleanDatabase();
    await cleanCurriculumDatabase();

    // Create test user and token
    testUser = await createTestUser({ password: 'Password123!' });
    token = await generateTestToken(app, { userId: testUser.id, email: testUser.email });
  });

  afterEach(async () => {
    await cleanupTestApp(app);
  });

  describe('GET /api/v1/curriculum/lessons', () => {
    it('should return empty list when no lessons exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/curriculum/lessons',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.lessons).toEqual([]);
      expect(body.total).toBe(0);
      expect(body.pagination).toEqual({ limit: 20, offset: 0 });
    });

    it('should return published lessons with pagination', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const lesson2 = await createTestLesson(curriculum.module.id, testUser.id, {
        name: 'Second Lesson',
        display_order: 1,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/curriculum/lessons',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.lessons).toHaveLength(2);
      expect(body.total).toBe(2);
      expect(body.lessons[0].name).toBe('Test Lesson');
      expect(body.lessons[1].name).toBe('Second Lesson');
    });

    it('should filter lessons by module_id', async () => {
      const curriculum1 = await createTestCurriculum(testUser.id);
      const curriculum2 = await createTestCurriculum(testUser.id);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/curriculum/lessons?module_id=${curriculum1.module.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.lessons).toHaveLength(1);
      expect(body.lessons[0].module_id).toBe(curriculum1.module.id);
    });

    it('should filter lessons by lesson_type', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const videoLesson = await createTestLesson(curriculum.module.id, testUser.id, {
        lesson_type: 'video',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/curriculum/lessons?lesson_type=video',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.lessons).toHaveLength(1);
      expect(body.lessons[0].lesson_type).toBe('video');
    });

    it('should filter lessons by status', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const draftLesson = await createTestLesson(curriculum.module.id, testUser.id, {
        status: 'draft',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/curriculum/lessons?status=draft',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.lessons).toHaveLength(1);
      expect(body.lessons[0].status).toBe('draft');
    });

    it('should search lessons by name', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const specificLesson = await createTestLesson(curriculum.module.id, testUser.id, {
        name: 'TypeScript Fundamentals',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/curriculum/lessons?search=typescript',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.lessons).toHaveLength(1);
      expect(body.lessons[0].name).toBe('TypeScript Fundamentals');
    });

    it('should respect pagination limits', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      // Create 5 more lessons
      for (let i = 0; i < 5; i++) {
        await createTestLesson(curriculum.module.id, testUser.id, {
          display_order: i + 1,
        });
      }

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/curriculum/lessons?limit=3&offset=0',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.lessons).toHaveLength(3);
      expect(body.total).toBe(6); // 1 from curriculum + 5 created
      expect(body.pagination.limit).toBe(3);
      expect(body.pagination.offset).toBe(0);
    });

    it('should return 400 for invalid query parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/curriculum/lessons?limit=invalid',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Validation Error');
    });
  });

  describe('GET /api/v1/curriculum/lessons/:id', () => {
    it('should return lesson by id', async () => {
      const curriculum = await createTestCurriculum(testUser.id);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/curriculum/lessons/${curriculum.lesson.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.lesson).toBeDefined();
      expect(body.lesson.id).toBe(curriculum.lesson.id);
      expect(body.lesson.name).toBe('Test Lesson');
    });

    it('should return 404 for non-existent lesson', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/curriculum/lessons/00000000-0000-0000-0000-000000000000',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Not Found');
      expect(body.message).toBe('Lesson not found');
    });

    it('should return lesson with resources when include_resources=true', async () => {
      const curriculum = await createTestCurriculum(testUser.id);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/curriculum/lessons/${curriculum.lesson.id}?include_resources=true`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.lesson).toBeDefined();
      expect(body.lesson.resources).toBeDefined();
      expect(Array.isArray(body.lesson.resources)).toBe(true);
    });

    it('should not include resources when include_resources=false', async () => {
      const curriculum = await createTestCurriculum(testUser.id);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/curriculum/lessons/${curriculum.lesson.id}?include_resources=false`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.lesson).toBeDefined();
      // When include_resources=false, resources should either be undefined or an empty array
      expect(body.lesson.resources === undefined || (Array.isArray(body.lesson.resources) && body.lesson.resources.length === 0)).toBe(true);
    });
  });

  describe('GET /api/v1/curriculum/modules/:moduleId/lessons', () => {
    it('should return lessons for a specific module', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const lesson2 = await createTestLesson(curriculum.module.id, testUser.id, {
        name: 'Second Lesson',
        display_order: 1,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/curriculum/modules/${curriculum.module.id}/lessons`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.lessons).toHaveLength(2);
      expect(body.lessons[0].module_id).toBe(curriculum.module.id);
      expect(body.lessons[1].module_id).toBe(curriculum.module.id);
    });

    it('should return empty list for module with no lessons', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const emptyModule = await createTestModule(curriculum.course.id, testUser.id);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/curriculum/modules/${emptyModule.id}/lessons`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.lessons).toEqual([]);
      expect(body.total).toBe(0);
    });

    it('should order lessons by display_order', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const lesson2 = await createTestLesson(curriculum.module.id, testUser.id, {
        name: 'Second Lesson',
        display_order: 1,
      });
      const lesson3 = await createTestLesson(curriculum.module.id, testUser.id, {
        name: 'Third Lesson',
        display_order: 2,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/curriculum/modules/${curriculum.module.id}/lessons`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.lessons).toHaveLength(3);
      expect(body.lessons[0].display_order).toBe(0);
      expect(body.lessons[1].display_order).toBe(1);
      expect(body.lessons[2].display_order).toBe(2);
    });
  });

  describe('POST /api/v1/curriculum/lessons/:id/complete', () => {
    it('should require authentication', async () => {
      const curriculum = await createTestCurriculum(testUser.id);

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/curriculum/lessons/${curriculum.lesson.id}/complete`,
        payload: {
          time_spent_seconds: 120,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 404 when lesson does not exist', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/curriculum/lessons/00000000-0000-0000-0000-000000000000/complete',
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          time_spent_seconds: 120,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Not Found');
      expect(body.message).toBe('Lesson not found');
    });

    it('should return 403 when lesson is not published', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const db = getDatabase();

      // Update lesson to draft status
      await db('curriculum_lessons')
        .where({ id: curriculum.lesson.id })
        .update({ status: 'draft' });

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/curriculum/lessons/${curriculum.lesson.id}/complete`,
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          time_spent_seconds: 120,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Forbidden');
      expect(body.message).toBe('This lesson is not available');
    });

    it('should return 403 when module is not published', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const db = getDatabase();

      // Update module to draft status
      await db('curriculum_modules')
        .where({ id: curriculum.module.id })
        .update({ status: 'draft' });

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/curriculum/lessons/${curriculum.lesson.id}/complete`,
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          time_spent_seconds: 120,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Forbidden');
      expect(body.message).toBe('This module is not available');
    });

    it('should return 403 when prerequisites are not met (sequential unlock)', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const db = getDatabase();

      // Create a second module with sequential unlock
      const module2 = await createTestModule(curriculum.course.id, testUser.id, {
        unlock_type: 'sequential',
        display_order: 1,
      });
      const lesson2 = await createTestLesson(module2.id, testUser.id);

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/curriculum/lessons/${lesson2.id}/complete`,
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          time_spent_seconds: 120,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Forbidden');
      expect(body.message).toBe('Prerequisites not met for this lesson');
      expect(body.details).toBeDefined();
      expect(body.details.missing_prerequisites).toBeDefined();
      expect(Array.isArray(body.details.missing_prerequisites)).toBe(true);
    });

    it('should successfully complete lesson when all checks pass', async () => {
      const curriculum = await createTestCurriculum(testUser.id);

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/curriculum/lessons/${curriculum.lesson.id}/complete`,
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          time_spent_seconds: 120,
          metadata: { device: 'mobile' },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Lesson marked as complete');
      expect(body.completion).toBeDefined();
      expect(body.completion.lesson_id).toBe(curriculum.lesson.id);
      expect(body.completion.user_id).toBe(testUser.id);
      expect(body.completion.time_spent_seconds).toBe(120);
    });

    it('should be idempotent - return 200 when already completed', async () => {
      const curriculum = await createTestCurriculum(testUser.id);

      // First completion
      await app.inject({
        method: 'POST',
        url: `/api/v1/curriculum/lessons/${curriculum.lesson.id}/complete`,
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          time_spent_seconds: 120,
        },
      });

      // Second completion (should be idempotent)
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/curriculum/lessons/${curriculum.lesson.id}/complete`,
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          time_spent_seconds: 150,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Lesson already completed');
      expect(body.completion).toBeDefined();
      expect(body.completion.time_spent_seconds).toBe(120); // Original time, not updated
    });

    it('should complete lesson with optional time_spent_seconds', async () => {
      const curriculum = await createTestCurriculum(testUser.id);

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/curriculum/lessons/${curriculum.lesson.id}/complete`,
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.completion).toBeDefined();
      expect(body.completion.time_spent_seconds).toBeNull();
    });

    it('should complete lesson with optional metadata', async () => {
      const curriculum = await createTestCurriculum(testUser.id);

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/curriculum/lessons/${curriculum.lesson.id}/complete`,
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          time_spent_seconds: 100,
          metadata: {
            browser: 'Chrome',
            platform: 'Android',
          },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.completion.metadata).toEqual({
        browser: 'Chrome',
        platform: 'Android',
      });
    });

    it('should return 400 for invalid payload', async () => {
      const curriculum = await createTestCurriculum(testUser.id);

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/curriculum/lessons/${curriculum.lesson.id}/complete`,
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          time_spent_seconds: -10, // Invalid negative value
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Validation Error');
    });

    it('should allow completion when module unlock_type is "always"', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const db = getDatabase();

      // Ensure module has 'always' unlock type
      await db('curriculum_modules')
        .where({ id: curriculum.module.id })
        .update({ unlock_type: 'always' });

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/curriculum/lessons/${curriculum.lesson.id}/complete`,
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          time_spent_seconds: 120,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Lesson marked as complete');
    });
  });
});
