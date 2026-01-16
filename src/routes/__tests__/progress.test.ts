import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import {
  createTestUser,
  generateTestToken,
  cleanDatabase,
  cleanCurriculumDatabase,
  createTestCurriculum,
} from '../../test/helpers';
import { getDatabase } from '../../database';

describe('Progress Routes', () => {
  let app: FastifyInstance;
  let authToken: string;
  let userId: string;
  let curriculum: any;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase();
    await cleanCurriculumDatabase();

    // Create test user with unique email
    const user = await createTestUser();
    userId = user.id;

    // Generate auth token
    authToken = await generateTestToken(app, { userId: user.id, email: user.email });

    // Create test curriculum
    curriculum = await createTestCurriculum(userId);
  });

  describe('GET /api/v1/progress/module/:moduleId', () => {
    it('should return module progress with no completions', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/progress/module/${curriculum.module.id}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data).toMatchObject({
        module_id: curriculum.module.id,
        total_lessons: 1,
        completed_lessons: 0,
        is_unlocked: true,
        progress_percentage: 0,
      });
    });

    it('should return module progress after completing lesson', async () => {
      const db = getDatabase();

      // Complete the lesson
      await db('lesson_completions').insert({
        user_id: userId,
        lesson_id: curriculum.lesson.id,
        completed_at: new Date(),
        time_spent_seconds: 300,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/progress/module/${curriculum.module.id}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data).toMatchObject({
        module_id: curriculum.module.id,
        total_lessons: 1,
        completed_lessons: 1,
        is_unlocked: true,
        progress_percentage: 100,
      });
    });

    it('should return 401 without auth token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/progress/module/${curriculum.module.id}`,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/progress/course/:courseId', () => {
    it('should return course progress with no completions', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/progress/course/${curriculum.course.id}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data).toMatchObject({
        course_id: curriculum.course.id,
        total_modules: 1,
        completed_modules: 0,
        total_lessons: 1,
        completed_lessons: 0,
        progress_percentage: 0,
      });
    });

    it('should return course progress after completing lessons', async () => {
      const db = getDatabase();

      // Complete the lesson
      await db('lesson_completions').insert({
        user_id: userId,
        lesson_id: curriculum.lesson.id,
        completed_at: new Date(),
        time_spent_seconds: 300,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/progress/course/${curriculum.course.id}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data).toMatchObject({
        course_id: curriculum.course.id,
        total_modules: 1,
        completed_modules: 1, // Module is complete
        total_lessons: 1,
        completed_lessons: 1,
        progress_percentage: 100,
      });
    });

    it('should return 401 without auth token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/progress/course/${curriculum.course.id}`,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/progress/courses', () => {
    it('should return empty list when no courses started', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/progress/courses',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data).toEqual([]);
    });

    it('should return course progress list after completing lesson', async () => {
      const db = getDatabase();

      // Complete the lesson
      await db('lesson_completions').insert({
        user_id: userId,
        lesson_id: curriculum.lesson.id,
        completed_at: new Date(),
        time_spent_seconds: 300,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/progress/courses',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data).toHaveLength(1);
      expect(data[0]).toMatchObject({
        course_id: curriculum.course.id,
        total_modules: 1,
        completed_modules: 1,
        total_lessons: 1,
        completed_lessons: 1,
        progress_percentage: 100,
      });
    });

    it('should return 401 without auth token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/progress/courses',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/progress/dashboard', () => {
    it('should return dashboard with no progress', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/progress/dashboard',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data).toMatchObject({
        summary: {
          total_courses_in_progress: 0,
          total_lessons_completed: 0,
          total_learning_time_seconds: 0,
          total_learning_time_formatted: '0h 0m 0s',
        },
        courses: [],
        recent_activity: [],
      });
    });

    it('should return dashboard with progress data', async () => {
      const db = getDatabase();

      // Complete the lesson
      await db('lesson_completions').insert({
        user_id: userId,
        lesson_id: curriculum.lesson.id,
        completed_at: new Date(),
        time_spent_seconds: 7265, // 2h 1m 5s
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/progress/dashboard',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.summary).toMatchObject({
        total_courses_in_progress: 1,
        total_lessons_completed: 1,
        total_learning_time_seconds: 7265,
        total_learning_time_formatted: '2h 1m 5s',
      });
      expect(data.courses).toHaveLength(1);
      expect(data.recent_activity).toHaveLength(1);
      expect(data.recent_activity[0]).toMatchObject({
        lesson_id: curriculum.lesson.id,
        lesson_name: 'Test Lesson',
        module_id: curriculum.module.id,
        course_id: curriculum.course.id,
        time_spent_seconds: 7265,
      });
    });

    it('should respect recentActivityLimit query param', async () => {
      const db = getDatabase();

      // Create multiple lesson completions
      for (let i = 0; i < 15; i++) {
        await db('lesson_completions').insert({
          user_id: userId,
          lesson_id: curriculum.lesson.id,
          completed_at: new Date(Date.now() - i * 1000),
          time_spent_seconds: 100,
        });
      }

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/progress/dashboard?recentActivityLimit=5',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.recent_activity.length).toBeLessThanOrEqual(5);
    });

    it('should return 401 without auth token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/progress/dashboard',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/progress/activity', () => {
    it('should return empty array when no activity', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/progress/activity',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data).toEqual([]);
    });

    it('should return recent activity', async () => {
      const db = getDatabase();

      // Complete the lesson
      await db('lesson_completions').insert({
        user_id: userId,
        lesson_id: curriculum.lesson.id,
        completed_at: new Date(),
        time_spent_seconds: 300,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/progress/activity',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data).toHaveLength(1);
      expect(data[0]).toMatchObject({
        lesson_id: curriculum.lesson.id,
        lesson_name: 'Test Lesson',
        module_id: curriculum.module.id,
        course_id: curriculum.course.id,
        time_spent_seconds: 300,
      });
    });

    it('should respect limit query param', async () => {
      const db = getDatabase();

      // Create 5 completions (since we can only complete each lesson once, we'll just insert duplicates for testing)
      for (let i = 0; i < 5; i++) {
        await db('lesson_completions').insert({
          user_id: userId,
          lesson_id: curriculum.lesson.id,
          completed_at: new Date(Date.now() - i * 1000),
          time_spent_seconds: 100,
        });
      }

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/progress/activity?limit=3',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.length).toBeLessThanOrEqual(3);
    });

    it('should return 401 without auth token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/progress/activity',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/progress/stats', () => {
    it('should return stats with no progress', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/progress/stats',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data).toMatchObject({
        total_courses_in_progress: 0,
        total_lessons_completed: 0,
        total_learning_time_seconds: 0,
        total_learning_time_formatted: '0h 0m 0s',
        average_time_per_lesson_seconds: 0,
      });
    });

    it('should return stats with progress data', async () => {
      const db = getDatabase();

      // Complete the lesson
      await db('lesson_completions').insert({
        user_id: userId,
        lesson_id: curriculum.lesson.id,
        completed_at: new Date(),
        time_spent_seconds: 600,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/progress/stats',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data).toMatchObject({
        total_courses_in_progress: 1,
        total_lessons_completed: 1,
        total_learning_time_seconds: 600,
        total_learning_time_formatted: '0h 10m 0s',
        average_time_per_lesson_seconds: 600,
      });
    });

    it('should calculate average time correctly', async () => {
      const db = getDatabase();

      // Create additional lesson
      const [lesson2] = await db('curriculum_lessons').insert({
        module_id: curriculum.module.id,
        name: 'Test Lesson 2',
        slug: 'test-lesson-2-' + Date.now(),
        description: 'A second test lesson',
        content: 'Test lesson 2 content',
        lesson_type: 'text',
        content_format: 'markdown',
        status: 'published',
        display_order: 1,
        created_by: userId,
      }).returning('*');

      // Complete both lessons with different times
      await db('lesson_completions').insert([
        {
          user_id: userId,
          lesson_id: curriculum.lesson.id,
          completed_at: new Date(),
          time_spent_seconds: 600,
        },
        {
          user_id: userId,
          lesson_id: lesson2.id,
          completed_at: new Date(),
          time_spent_seconds: 900,
        },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/progress/stats',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.total_lessons_completed).toBe(2);
      expect(data.total_learning_time_seconds).toBe(1500);
      expect(data.average_time_per_lesson_seconds).toBe(750); // (600 + 900) / 2
    });

    it('should return 401 without auth token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/progress/stats',
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
