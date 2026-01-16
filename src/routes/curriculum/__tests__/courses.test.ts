import { FastifyInstance } from 'fastify';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  createTestApp,
  cleanupTestApp,
  cleanDatabase,
  createTestUser,
  cleanCurriculumDatabase,
  createTestCurriculum,
  createTestCourse,
  createTestModule,
  createTestDomain,
  createTestSubject,
} from '../../../test/helpers';

describe('Course Routes', () => {
  let app: FastifyInstance;
  let testUser: any;

  beforeEach(async () => {
    app = await createTestApp();
    await cleanDatabase();
    await cleanCurriculumDatabase();

    testUser = await createTestUser({ password: 'Password123!' });
  });

  afterEach(async () => {
    await cleanupTestApp(app);
  });

  describe('GET /api/v1/curriculum/courses', () => {
    it('should return empty list when no courses exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/curriculum/courses',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.courses).toEqual([]);
      expect(body.total).toBe(0);
    });

    it('should return published courses', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const course2 = await createTestCourse(curriculum.subject.id, testUser.id);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/curriculum/courses',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.courses).toHaveLength(2);
      expect(body.total).toBe(2);
    });

    it('should filter by subject_id', async () => {
      const curriculum1 = await createTestCurriculum(testUser.id);
      const curriculum2 = await createTestCurriculum(testUser.id);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/curriculum/courses?subject_id=${curriculum1.subject.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.courses).toHaveLength(1);
      expect(body.courses[0].subject_id).toBe(curriculum1.subject.id);
    });

    it('should filter by difficulty_level', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const advancedCourse = await createTestCourse(curriculum.subject.id, testUser.id, {
        difficulty_level: 'advanced',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/curriculum/courses?difficulty_level=advanced',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.courses).toHaveLength(1);
      expect(body.courses[0].difficulty_level).toBe('advanced');
    });

    it('should return 400 for invalid query parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/curriculum/courses?limit=invalid',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/curriculum/courses/:id', () => {
    it('should return course by id', async () => {
      const curriculum = await createTestCurriculum(testUser.id);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/curriculum/courses/${curriculum.course.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.course.id).toBe(curriculum.course.id);
    });

    it('should return course with details when include_details=true', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const module2 = await createTestModule(curriculum.course.id, testUser.id);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/curriculum/courses/${curriculum.course.id}?include_details=true`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.course.modules).toBeDefined();
      expect(body.course.modules).toHaveLength(2);
    });

    it('should not include modules when include_details=false', async () => {
      const curriculum = await createTestCurriculum(testUser.id);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/curriculum/courses/${curriculum.course.id}?include_details=false`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.course.modules).toBeUndefined();
    });

    it('should return 404 for non-existent course', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/curriculum/courses/00000000-0000-0000-0000-000000000000',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/curriculum/subjects/:subjectId/courses', () => {
    it('should return courses for a specific subject', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const course2 = await createTestCourse(curriculum.subject.id, testUser.id);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/curriculum/subjects/${curriculum.subject.id}/courses`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.courses).toHaveLength(2);
      expect(body.courses[0].subject_id).toBe(curriculum.subject.id);
    });

    it('should return empty list for subject with no courses', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const emptyDomain = await createTestDomain(testUser.id);
      const emptySubject = await createTestSubject(emptyDomain.id, testUser.id);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/curriculum/subjects/${emptySubject.id}/courses`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.courses).toEqual([]);
      expect(body.total).toBe(0);
    });
  });
});
