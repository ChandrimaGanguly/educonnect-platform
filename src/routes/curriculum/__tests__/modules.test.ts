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

describe('Module Routes', () => {
  let app: FastifyInstance;
  let testUser: any;
  let token: string;

  beforeEach(async () => {
    app = await createTestApp();
    await cleanDatabase();
    await cleanCurriculumDatabase();

    testUser = await createTestUser({ password: 'Password123!' });
    token = await generateTestToken(app, { userId: testUser.id, email: testUser.email });
  });

  afterEach(async () => {
    await cleanupTestApp(app);
  });

  describe('GET /api/v1/curriculum/modules', () => {
    it('should return empty list when no modules exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/curriculum/modules',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.modules).toEqual([]);
      expect(body.total).toBe(0);
    });

    it('should return published modules', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const module2 = await createTestModule(curriculum.course.id, testUser.id);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/curriculum/modules',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.modules).toHaveLength(2);
      expect(body.total).toBe(2);
    });

    it('should filter by course_id', async () => {
      const curriculum1 = await createTestCurriculum(testUser.id);
      const curriculum2 = await createTestCurriculum(testUser.id);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/curriculum/modules?course_id=${curriculum1.course.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.modules).toHaveLength(1);
      expect(body.modules[0].course_id).toBe(curriculum1.course.id);
    });

    it('should return 400 for invalid query parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/curriculum/modules?limit=invalid',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/curriculum/modules/:id', () => {
    it('should return module by id', async () => {
      const curriculum = await createTestCurriculum(testUser.id);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/curriculum/modules/${curriculum.module.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.module.id).toBe(curriculum.module.id);
    });

    it('should return module with lessons when include_lessons=true', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const lesson2 = await createTestLesson(curriculum.module.id, testUser.id);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/curriculum/modules/${curriculum.module.id}?include_lessons=true`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.module.lessons).toBeDefined();
      expect(body.module.lessons).toHaveLength(2);
    });

    it('should not include lessons when include_lessons=false', async () => {
      const curriculum = await createTestCurriculum(testUser.id);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/curriculum/modules/${curriculum.module.id}?include_lessons=false`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      // When include_lessons=false, lessons should either be undefined or an empty array
      expect(body.module.lessons === undefined || (Array.isArray(body.module.lessons) && body.module.lessons.length === 0)).toBe(true);
    });

    it('should return 404 for non-existent module', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/curriculum/modules/00000000-0000-0000-0000-000000000000',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/curriculum/courses/:courseId/modules', () => {
    it('should return modules for a specific course', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const module2 = await createTestModule(curriculum.course.id, testUser.id);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/curriculum/courses/${curriculum.course.id}/modules`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.modules).toHaveLength(2);
      expect(body.modules[0].course_id).toBe(curriculum.course.id);
    });

    it('should return empty list for course with no modules', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const db = getDatabase();

      // Delete modules
      await db('curriculum_lessons').where({ module_id: curriculum.module.id }).del();
      await db('curriculum_modules').where({ course_id: curriculum.course.id }).del();

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/curriculum/courses/${curriculum.course.id}/modules`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.modules).toEqual([]);
      expect(body.total).toBe(0);
    });

    it('should order modules by display_order', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const module2 = await createTestModule(curriculum.course.id, testUser.id, {
        display_order: 1,
      });
      const module3 = await createTestModule(curriculum.course.id, testUser.id, {
        display_order: 2,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/curriculum/courses/${curriculum.course.id}/modules`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.modules).toHaveLength(3);
      expect(body.modules[0].display_order).toBe(0);
      expect(body.modules[1].display_order).toBe(1);
      expect(body.modules[2].display_order).toBe(2);
    });
  });

  describe('GET /api/v1/curriculum/modules/:id/unlock', () => {
    it('should require authentication', async () => {
      const curriculum = await createTestCurriculum(testUser.id);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/curriculum/modules/${curriculum.module.id}/unlock`,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return unlocked=true for "always" unlock type', async () => {
      const curriculum = await createTestCurriculum(testUser.id);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/curriculum/modules/${curriculum.module.id}/unlock`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.unlocked).toBe(true);
      expect(body.missing_prerequisites).toEqual([]);
    });

    it('should return unlocked=false with missing prerequisites for sequential unlock', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const db = getDatabase();

      // Set first module to sequential
      await db('curriculum_modules')
        .where({ id: curriculum.module.id })
        .update({ unlock_type: 'sequential', display_order: 0 });

      // Create second module with sequential unlock
      const module2 = await createTestModule(curriculum.course.id, testUser.id, {
        unlock_type: 'sequential',
        display_order: 1,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/curriculum/modules/${module2.id}/unlock`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.unlocked).toBe(false);
      expect(body.missing_prerequisites).toHaveLength(1);
      expect(body.missing_prerequisites[0]).toBe(curriculum.module.id);
    });

    it('should return 404 for non-existent module', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/curriculum/modules/00000000-0000-0000-0000-000000000000/unlock',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
