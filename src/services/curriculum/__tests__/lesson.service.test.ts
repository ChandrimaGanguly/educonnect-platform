import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { LessonService } from '../lesson.service';
import {
  cleanDatabase,
  cleanCurriculumDatabase,
  createTestUser,
  createTestCurriculum,
  createTestLesson,
} from '../../../test/helpers';
import { getDatabase } from '../../../database';

describe('LessonService', () => {
  let lessonService: LessonService;
  let testUser: any;
  let db: any;

  beforeEach(async () => {
    await cleanDatabase();
    await cleanCurriculumDatabase();
    lessonService = new LessonService();
    db = getDatabase();

    testUser = await createTestUser({ password: 'Password123!' });
  });

  afterEach(async () => {
    // Cleanup handled by next beforeEach
  });

  describe('listLessons', () => {
    it('should return empty list when no lessons exist', async () => {
      const result = await lessonService.listLessons();

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it('should return published lessons with default pagination', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const lesson2 = await createTestLesson(curriculum.module.id, testUser.id, {
        display_order: 1,
      });

      const result = await lessonService.listLessons();

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.data[0].display_order).toBe(0);
      expect(result.data[1].display_order).toBe(1);
    });

    it('should filter lessons by module_id', async () => {
      const curriculum1 = await createTestCurriculum(testUser.id);
      const curriculum2 = await createTestCurriculum(testUser.id);

      const result = await lessonService.listLessons({ module_id: curriculum1.module.id });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].module_id).toBe(curriculum1.module.id);
    });

    it('should filter lessons by status', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const draftLesson = await createTestLesson(curriculum.module.id, testUser.id, {
        status: 'draft',
      });

      const result = await lessonService.listLessons({ status: 'draft' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe('draft');
    });

    it('should filter lessons by lesson_type', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const videoLesson = await createTestLesson(curriculum.module.id, testUser.id, {
        lesson_type: 'video',
      });

      const result = await lessonService.listLessons({ lesson_type: 'video' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].lesson_type).toBe('video');
    });

    it('should search lessons by name', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const specificLesson = await createTestLesson(curriculum.module.id, testUser.id, {
        name: 'Introduction to Async Programming',
      });

      const result = await lessonService.listLessons({ search: 'async' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Introduction to Async Programming');
    });

    it('should search lessons by description', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const specificLesson = await createTestLesson(curriculum.module.id, testUser.id, {
        description: 'Learn about promises and async/await patterns',
      });

      const result = await lessonService.listLessons({ search: 'promises' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].description).toContain('promises');
    });

    it('should filter lessons by tags', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      await db('curriculum_lessons')
        .where({ id: curriculum.lesson.id })
        .update({ tags: ['beginner', 'javascript'] });

      const result = await lessonService.listLessons({ tags: ['beginner'] });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].tags).toContain('beginner');
    });

    it('should respect pagination parameters', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      // Create 5 more lessons
      for (let i = 0; i < 5; i++) {
        await createTestLesson(curriculum.module.id, testUser.id, {
          display_order: i + 1,
        });
      }

      const result = await lessonService.listLessons({ limit: 3, offset: 0 });

      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(6);
      expect(result.limit).toBe(3);
      expect(result.offset).toBe(0);
    });

    it('should sort by display_order by default', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const lesson2 = await createTestLesson(curriculum.module.id, testUser.id, {
        display_order: 2,
      });
      const lesson1 = await createTestLesson(curriculum.module.id, testUser.id, {
        display_order: 1,
      });

      const result = await lessonService.listLessons();

      expect(result.data[0].display_order).toBe(0);
      expect(result.data[1].display_order).toBe(1);
      expect(result.data[2].display_order).toBe(2);
    });

    it('should sort by name when specified', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const lessonB = await createTestLesson(curriculum.module.id, testUser.id, {
        name: 'Lesson B',
      });
      const lessonA = await createTestLesson(curriculum.module.id, testUser.id, {
        name: 'Lesson A',
      });

      const result = await lessonService.listLessons({ sort_by: 'name', sort_order: 'asc' });

      expect(result.data[0].name).toBe('Lesson A');
      expect(result.data[1].name).toBe('Lesson B');
    });
  });

  describe('listLessonsByModule', () => {
    it('should return lessons for specific module ordered by display_order', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const lesson2 = await createTestLesson(curriculum.module.id, testUser.id, {
        display_order: 1,
      });

      const result = await lessonService.listLessonsByModule(curriculum.module.id);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].display_order).toBe(0);
      expect(result.data[1].display_order).toBe(1);
    });

    it('should return empty list for module with no lessons', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const emptyModule = await db('curriculum_modules')
        .insert({
          course_id: curriculum.course.id,
          name: 'Empty Module',
          slug: 'empty-module-' + Math.random().toString(36).substring(2, 15),
          status: 'published',
          created_by: testUser.id,
        })
        .returning('*');

      const result = await lessonService.listLessonsByModule(emptyModule[0].id);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should only return published lessons', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const draftLesson = await createTestLesson(curriculum.module.id, testUser.id, {
        status: 'draft',
      });

      const result = await lessonService.listLessonsByModule(curriculum.module.id);

      expect(result.data).toHaveLength(1); // Only published
      expect(result.data[0].status).toBe('published');
    });
  });

  describe('getLessonById', () => {
    it('should return lesson by id', async () => {
      const curriculum = await createTestCurriculum(testUser.id);

      const lesson = await lessonService.getLessonById(curriculum.lesson.id);

      expect(lesson).toBeDefined();
      expect(lesson!.id).toBe(curriculum.lesson.id);
      expect(lesson!.name).toBe('Test Lesson');
    });

    it('should return null for non-existent lesson', async () => {
      const lesson = await lessonService.getLessonById('00000000-0000-0000-0000-000000000000');

      expect(lesson).toBeNull();
    });
  });

  describe('getLessonWithResources', () => {
    it('should return lesson with empty resources array', async () => {
      const curriculum = await createTestCurriculum(testUser.id);

      const result = await lessonService.getLessonWithResources(curriculum.lesson.id);

      expect(result).toBeDefined();
      expect(result!.resources).toBeDefined();
      expect(Array.isArray(result!.resources)).toBe(true);
      expect(result!.resources).toHaveLength(0);
    });

    it('should return null for non-existent lesson', async () => {
      const result = await lessonService.getLessonWithResources('00000000-0000-0000-0000-000000000000');

      expect(result).toBeNull();
    });

    it('should include completion status when userId provided', async () => {
      const curriculum = await createTestCurriculum(testUser.id);

      const result = await lessonService.getLessonWithResources(curriculum.lesson.id, testUser.id);

      expect(result).toBeDefined();
      expect(result!.is_completed).toBe(false);
    });

    it('should show is_completed=true when lesson completed', async () => {
      const curriculum = await createTestCurriculum(testUser.id);

      // Mark lesson as complete
      await db('lesson_completions').insert({
        user_id: testUser.id,
        lesson_id: curriculum.lesson.id,
        time_spent_seconds: 120,
      });

      const result = await lessonService.getLessonWithResources(curriculum.lesson.id, testUser.id);

      expect(result).toBeDefined();
      expect(result!.is_completed).toBe(true);
    });

    it('should return lesson with resources ordered by display_order', async () => {
      const curriculum = await createTestCurriculum(testUser.id);

      // Add resources
      await db('curriculum_resources').insert([
        {
          lesson_id: curriculum.lesson.id,
          name: 'Resource 1',
          resource_type: 'document',
          file_url: 'https://example.com/doc1.pdf',
          display_order: 0,
        },
        {
          lesson_id: curriculum.lesson.id,
          name: 'Resource 2',
          resource_type: 'video',
          file_url: 'https://example.com/video.mp4',
          display_order: 1,
        },
      ]);

      const result = await lessonService.getLessonWithResources(curriculum.lesson.id);

      expect(result).toBeDefined();
      expect(result!.resources).toHaveLength(2);
      expect(result!.resources[0].display_order).toBe(0);
      expect(result!.resources[1].display_order).toBe(1);
    });
  });

  describe('markLessonComplete', () => {
    it('should create lesson completion record', async () => {
      const curriculum = await createTestCurriculum(testUser.id);

      const completion = await lessonService.markLessonComplete(
        curriculum.lesson.id,
        testUser.id,
        120
      );

      expect(completion).toBeDefined();
      expect(completion.lesson_id).toBe(curriculum.lesson.id);
      expect(completion.user_id).toBe(testUser.id);
      expect(completion.time_spent_seconds).toBe(120);
      expect(completion.completed_at).toBeDefined();
    });

    it('should create completion without time_spent_seconds', async () => {
      const curriculum = await createTestCurriculum(testUser.id);

      const completion = await lessonService.markLessonComplete(
        curriculum.lesson.id,
        testUser.id
      );

      expect(completion).toBeDefined();
      expect(completion.time_spent_seconds).toBeNull();
    });

    it('should create completion with metadata', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const metadata = { device: 'mobile', platform: 'android' };

      const completion = await lessonService.markLessonComplete(
        curriculum.lesson.id,
        testUser.id,
        100,
        metadata
      );

      expect(completion).toBeDefined();
      expect(completion.metadata).toEqual(metadata);
    });

    it('should handle duplicate completion (unique constraint)', async () => {
      const curriculum = await createTestCurriculum(testUser.id);

      // First completion
      await lessonService.markLessonComplete(curriculum.lesson.id, testUser.id, 120);

      // Second completion should throw or handle gracefully
      await expect(
        lessonService.markLessonComplete(curriculum.lesson.id, testUser.id, 150)
      ).rejects.toThrow();
    });
  });

  describe('getLessonCompletion', () => {
    it('should return null when lesson not completed', async () => {
      const curriculum = await createTestCurriculum(testUser.id);

      const completion = await lessonService.getLessonCompletion(curriculum.lesson.id, testUser.id);

      expect(completion).toBeNull();
    });

    it('should return completion record when lesson completed', async () => {
      const curriculum = await createTestCurriculum(testUser.id);

      // Mark as complete
      await lessonService.markLessonComplete(curriculum.lesson.id, testUser.id, 120);

      const completion = await lessonService.getLessonCompletion(curriculum.lesson.id, testUser.id);

      expect(completion).toBeDefined();
      expect(completion!.lesson_id).toBe(curriculum.lesson.id);
      expect(completion!.user_id).toBe(testUser.id);
      expect(completion!.time_spent_seconds).toBe(120);
    });

    it('should return null for different user', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const otherUser = await createTestUser({ email: 'other@example.com', username: 'otheruser' });

      // Mark as complete for testUser
      await lessonService.markLessonComplete(curriculum.lesson.id, testUser.id, 120);

      // Check for otherUser
      const completion = await lessonService.getLessonCompletion(curriculum.lesson.id, otherUser.id);

      expect(completion).toBeNull();
    });
  });

  describe('getLessonsCount', () => {
    it('should return total count of all lessons', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const lesson2 = await createTestLesson(curriculum.module.id, testUser.id);

      const count = await lessonService.getLessonsCount();

      expect(count).toBe(2);
    });

    it('should filter count by status', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const draftLesson = await createTestLesson(curriculum.module.id, testUser.id, {
        status: 'draft',
      });

      const publishedCount = await lessonService.getLessonsCount('published');
      const draftCount = await lessonService.getLessonsCount('draft');

      expect(publishedCount).toBe(1);
      expect(draftCount).toBe(1);
    });

    it('should filter count by moduleId', async () => {
      const curriculum1 = await createTestCurriculum(testUser.id);
      const curriculum2 = await createTestCurriculum(testUser.id);

      const count = await lessonService.getLessonsCount(undefined, curriculum1.module.id);

      expect(count).toBe(1);
    });

    it('should return 0 when no lessons exist', async () => {
      const count = await lessonService.getLessonsCount();

      expect(count).toBe(0);
    });
  });
});
