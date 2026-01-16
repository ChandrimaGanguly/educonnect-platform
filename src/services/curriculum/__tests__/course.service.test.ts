import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { CourseService } from '../course.service';
import {
  cleanDatabase,
  cleanCurriculumDatabase,
  createTestUser,
  createTestCurriculum,
  createTestCourse,
  createTestModule,
} from '../../../test/helpers';
import { getDatabase } from '../../../database';

describe('CourseService', () => {
  let courseService: CourseService;
  let testUser: any;
  let db: any;

  beforeEach(async () => {
    await cleanDatabase();
    await cleanCurriculumDatabase();
    courseService = new CourseService();
    db = getDatabase();

    testUser = await createTestUser({ password: 'Password123!' });
  });

  afterEach(async () => {
    // Cleanup handled by next beforeEach
  });

  describe('listCourses', () => {
    it('should return empty list when no courses exist', async () => {
      const result = await courseService.listCourses();

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it('should return published courses with default pagination', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const course2 = await createTestCourse(curriculum.subject.id, testUser.id, {
        display_order: 1,
      });

      const result = await courseService.listCourses();

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter courses by subject_id', async () => {
      const curriculum1 = await createTestCurriculum(testUser.id);
      const curriculum2 = await createTestCurriculum(testUser.id);

      const result = await courseService.listCourses({ subject_id: curriculum1.subject.id });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].subject_id).toBe(curriculum1.subject.id);
    });

    it('should filter courses by status', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const draftCourse = await createTestCourse(curriculum.subject.id, testUser.id, {
        status: 'draft',
      });

      const result = await courseService.listCourses({ status: 'draft' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe('draft');
    });

    it('should filter courses by difficulty', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const advancedCourse = await createTestCourse(curriculum.subject.id, testUser.id, {
        difficulty_level: 'advanced',
      });

      const result = await courseService.listCourses({ difficulty: 'advanced' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].difficulty_level).toBe('advanced');
    });

    it('should filter courses by track_type', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const academicCourse = await createTestCourse(curriculum.subject.id, testUser.id, {
        track_type: 'academic',
      });

      const result = await courseService.listCourses({ track_type: 'academic' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].track_type).toBe('academic');
    });

    it('should filter courses by is_enrollable', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      await db('curriculum_courses')
        .where({ id: curriculum.course.id })
        .update({ is_enrollable: false });

      const result = await courseService.listCourses({ is_enrollable: false });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].is_enrollable).toBe(false);
    });

    it('should search courses by name', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const specificCourse = await createTestCourse(curriculum.subject.id, testUser.id, {
        name: 'Advanced JavaScript',
      });

      const result = await courseService.listCourses({ search: 'javascript' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Advanced JavaScript');
    });

    it('should filter courses by tags', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      await db('curriculum_courses')
        .where({ id: curriculum.course.id })
        .update({ tags: ['programming', 'web'] });

      const result = await courseService.listCourses({ tags: ['programming'] });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].tags).toContain('programming');
    });

    it('should sort by display_order by default', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const course2 = await createTestCourse(curriculum.subject.id, testUser.id, {
        display_order: 2,
      });
      const course1 = await createTestCourse(curriculum.subject.id, testUser.id, {
        display_order: 1,
      });

      const result = await courseService.listCourses();

      expect(result.data[0].display_order).toBe(0);
      expect(result.data[1].display_order).toBe(1);
      expect(result.data[2].display_order).toBe(2);
    });
  });

  describe('listCoursesBySubject', () => {
    it('should return courses for specific subject ordered by display_order', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const course2 = await createTestCourse(curriculum.subject.id, testUser.id, {
        display_order: 1,
      });

      const result = await courseService.listCoursesBySubject(curriculum.subject.id);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].display_order).toBe(0);
      expect(result.data[1].display_order).toBe(1);
    });

    it('should return empty list for subject with no courses', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const emptySubject = await db('curriculum_subjects')
        .insert({
          domain_id: curriculum.domain.id,
          name: 'Empty Subject',
          slug: 'empty-subject-' + Math.random().toString(36).substring(2, 15),
          description: 'An empty subject for testing',
          status: 'published',
          created_by: testUser.id,
        })
        .returning('*');

      const result = await courseService.listCoursesBySubject(emptySubject[0].id);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getCourseById', () => {
    it('should return course by id', async () => {
      const curriculum = await createTestCurriculum(testUser.id);

      const result = await courseService.getCourseById(curriculum.course.id);

      expect(result).toBeDefined();
      expect(result!.id).toBe(curriculum.course.id);
      expect(result!.name).toBe('Test Course');
    });

    it('should return null for non-existent course', async () => {
      const result = await courseService.getCourseById('00000000-0000-0000-0000-000000000000');

      expect(result).toBeNull();
    });
  });

  describe('getCourseWithDetails', () => {
    it('should return course with modules', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const module2 = await createTestModule(curriculum.course.id, testUser.id, {
        display_order: 1,
      });

      const result = await courseService.getCourseWithDetails(curriculum.course.id);

      expect(result).toBeDefined();
      expect(result!.modules).toBeDefined();
      expect(result!.modules).toHaveLength(2);
      expect(result!.modules[0].display_order).toBe(0);
      expect(result!.modules[1].display_order).toBe(1);
    });

    it('should return course with empty modules array if no modules', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      // Delete the module
      await db('curriculum_lessons').where({ module_id: curriculum.module.id }).del();
      await db('curriculum_modules').where({ id: curriculum.module.id }).del();

      const result = await courseService.getCourseWithDetails(curriculum.course.id);

      expect(result).toBeDefined();
      expect(result!.modules).toEqual([]);
    });

    it('should return null for non-existent course', async () => {
      const result = await courseService.getCourseWithDetails(
        '00000000-0000-0000-0000-000000000000'
      );

      expect(result).toBeNull();
    });
  });

  describe('getCourseBySlug', () => {
    it('should return course by slug', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      await db('curriculum_courses')
        .where({ id: curriculum.course.id })
        .update({ slug: 'intro-to-programming' });

      const result = await courseService.getCourseBySlug(
        curriculum.subject.id,
        'intro-to-programming'
      );

      expect(result).toBeDefined();
      expect(result!.slug).toBe('intro-to-programming');
      expect(result!.subject_id).toBe(curriculum.subject.id);
    });

    it('should return null for non-existent slug', async () => {
      const curriculum = await createTestCurriculum(testUser.id);

      const result = await courseService.getCourseBySlug(curriculum.subject.id, 'non-existent');

      expect(result).toBeNull();
    });

    it('should return null when slug exists but subject_id does not match', async () => {
      const curriculum1 = await createTestCurriculum(testUser.id);
      const curriculum2 = await createTestCurriculum(testUser.id);
      await db('curriculum_courses')
        .where({ id: curriculum1.course.id })
        .update({ slug: 'programming-101' });

      const result = await courseService.getCourseBySlug(
        curriculum2.subject.id,
        'programming-101'
      );

      expect(result).toBeNull();
    });

    it('should filter by version when provided', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      await db('curriculum_courses')
        .where({ id: curriculum.course.id })
        .update({ slug: 'programming-101', version: 2 });

      const result = await courseService.getCourseBySlug(
        curriculum.subject.id,
        'programming-101',
        2
      );

      expect(result).toBeDefined();
      expect(result!.version).toBe(2);
    });

    it('should return null when version does not match', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      await db('curriculum_courses')
        .where({ id: curriculum.course.id })
        .update({ slug: 'programming-101', version: 1 });

      const result = await courseService.getCourseBySlug(
        curriculum.subject.id,
        'programming-101',
        2
      );

      expect(result).toBeNull();
    });
  });

  describe('getCoursesCount', () => {
    it('should return total count of all courses', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const course2 = await createTestCourse(curriculum.subject.id, testUser.id);

      const count = await courseService.getCoursesCount();

      expect(count).toBe(2);
    });

    it('should filter count by status', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const draftCourse = await createTestCourse(curriculum.subject.id, testUser.id, {
        status: 'draft',
      });

      const publishedCount = await courseService.getCoursesCount('published');
      const draftCount = await courseService.getCoursesCount('draft');

      expect(publishedCount).toBe(1);
      expect(draftCount).toBe(1);
    });

    it('should filter count by subjectId', async () => {
      const curriculum1 = await createTestCurriculum(testUser.id);
      const curriculum2 = await createTestCurriculum(testUser.id);

      const count = await courseService.getCoursesCount(undefined, curriculum1.subject.id);

      expect(count).toBe(1);
    });

    it('should return 0 when no courses exist', async () => {
      const count = await courseService.getCoursesCount();

      expect(count).toBe(0);
    });
  });
});
