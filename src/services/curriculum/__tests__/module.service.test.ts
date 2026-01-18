import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ModuleService } from '../module.service';
import {
  cleanDatabase,
  cleanCurriculumDatabase,
  createTestUser,
  createTestCurriculum,
  createTestModule,
  createTestLesson,
} from '../../../test/helpers';
import { getDatabase } from '../../../database';

describe('ModuleService', () => {
  let moduleService: ModuleService;
  let testUser: any;
  let db: any;

  beforeEach(async () => {
    await cleanDatabase();
    await cleanCurriculumDatabase();
    moduleService = new ModuleService();
    db = getDatabase();

    testUser = await createTestUser({ password: 'Password123!' });
  });

  afterEach(async () => {
    // Cleanup handled by next beforeEach
  });

  describe('listModules', () => {
    it('should return empty list when no modules exist', async () => {
      const result = await moduleService.listModules();

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it('should return published modules with default pagination', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const module2 = await createTestModule(curriculum.course.id, testUser.id, {
        display_order: 1,
      });

      const result = await moduleService.listModules();

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.data[0].display_order).toBe(0);
      expect(result.data[1].display_order).toBe(1);
    });

    it('should filter modules by course_id', async () => {
      const curriculum1 = await createTestCurriculum(testUser.id);
      const curriculum2 = await createTestCurriculum(testUser.id);

      const result = await moduleService.listModules({ course_id: curriculum1.course.id });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].course_id).toBe(curriculum1.course.id);
    });

    it('should filter modules by status', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const draftModule = await createTestModule(curriculum.course.id, testUser.id, {
        status: 'draft',
      });

      const result = await moduleService.listModules({ status: 'draft' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe('draft');
    });

    it('should search modules by name', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const specificModule = await createTestModule(curriculum.course.id, testUser.id, {
        name: 'Advanced TypeScript',
      });

      const result = await moduleService.listModules({ search: 'typescript' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Advanced TypeScript');
    });

    it('should search modules by description', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const specificModule = await createTestModule(curriculum.course.id, testUser.id, {
        description: 'Learn about generics and advanced patterns',
      });

      const result = await moduleService.listModules({ search: 'generics' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].description).toContain('generics');
    });

    it('should filter modules by tags', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      await db('curriculum_modules')
        .where({ id: curriculum.module.id })
        .update({ tags: ['beginner', 'fundamentals'] });

      const result = await moduleService.listModules({ tags: ['beginner'] });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].tags).toContain('beginner');
    });

    it('should respect pagination parameters', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      // Create 5 more modules
      for (let i = 0; i < 5; i++) {
        await createTestModule(curriculum.course.id, testUser.id, {
          display_order: i + 1,
        });
      }

      const result = await moduleService.listModules({ limit: 3, offset: 0 });

      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(6);
      expect(result.limit).toBe(3);
      expect(result.offset).toBe(0);
    });

    it('should sort by display_order by default', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const module2 = await createTestModule(curriculum.course.id, testUser.id, {
        display_order: 2,
        name: 'Module 2',
      });
      const module1 = await createTestModule(curriculum.course.id, testUser.id, {
        display_order: 1,
        name: 'Module 1',
      });

      const result = await moduleService.listModules();

      expect(result.data[0].display_order).toBe(0);
      expect(result.data[1].display_order).toBe(1);
      expect(result.data[2].display_order).toBe(2);
    });

    it('should sort by name when specified', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const moduleB = await createTestModule(curriculum.course.id, testUser.id, {
        name: 'Module B',
      });
      const moduleA = await createTestModule(curriculum.course.id, testUser.id, {
        name: 'Module A',
      });

      const result = await moduleService.listModules({ sort_by: 'name', sort_order: 'asc' });

      expect(result.data[0].name).toBe('Module A');
      expect(result.data[1].name).toBe('Module B');
    });
  });

  describe('listModulesByCourse', () => {
    it('should return modules for specific course ordered by display_order', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const module2 = await createTestModule(curriculum.course.id, testUser.id, {
        display_order: 1,
      });

      const result = await moduleService.listModulesByCourse(curriculum.course.id);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].display_order).toBe(0);
      expect(result.data[1].display_order).toBe(1);
    });

    it('should return empty list for course with no modules', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const otherCourse = await db('curriculum_courses')
        .insert({
          subject_id: curriculum.subject.id,
          name: 'Empty Course',
          slug: 'empty-course-' + Math.random().toString(36).substring(2, 15),
          description: 'An empty course for testing',
          status: 'published',
          created_by: testUser.id,
        })
        .returning('*');

      const result = await moduleService.listModulesByCourse(otherCourse[0].id);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getModuleById', () => {
    it('should return module by id', async () => {
      const curriculum = await createTestCurriculum(testUser.id);

      const module = await moduleService.getModuleById(curriculum.module.id);

      expect(module).toBeDefined();
      expect(module!.id).toBe(curriculum.module.id);
      expect(module!.name).toBe('Test Module');
    });

    it('should return null for non-existent module', async () => {
      const module = await moduleService.getModuleById('00000000-0000-0000-0000-000000000000');

      expect(module).toBeNull();
    });
  });

  describe('getModuleWithLessons', () => {
    it('should return module with lessons ordered by display_order', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const lesson2 = await createTestLesson(curriculum.module.id, testUser.id, {
        display_order: 1,
      });

      const result = await moduleService.getModuleWithLessons(curriculum.module.id, testUser.id);

      expect(result).toBeDefined();
      expect(result!.lessons).toHaveLength(2);
      expect(result!.lessons[0].display_order).toBe(0);
      expect(result!.lessons[1].display_order).toBe(1);
    });

    it('should return null for non-existent module', async () => {
      const result = await moduleService.getModuleWithLessons('00000000-0000-0000-0000-000000000000');

      expect(result).toBeNull();
    });

    it('should include unlock status when userId provided', async () => {
      const curriculum = await createTestCurriculum(testUser.id);

      const result = await moduleService.getModuleWithLessons(curriculum.module.id, testUser.id);

      expect(result).toBeDefined();
      expect(result!.is_unlocked).toBeDefined();
      expect(typeof result!.is_unlocked).toBe('boolean');
    });

    it('should return only published lessons', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const draftLesson = await createTestLesson(curriculum.module.id, testUser.id, {
        status: 'draft',
      });

      const result = await moduleService.getModuleWithLessons(curriculum.module.id, testUser.id);

      expect(result).toBeDefined();
      expect(result!.lessons).toHaveLength(1); // Only the published lesson
      expect(result!.lessons[0].status).toBe('published');
    });
  });

  describe('isModuleUnlocked - always unlock type', () => {
    it('should always return true for unlock_type "always"', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      await db('curriculum_modules')
        .where({ id: curriculum.module.id })
        .update({ unlock_type: 'always' });

      const isUnlocked = await moduleService.isModuleUnlocked(curriculum.module.id, testUser.id);

      expect(isUnlocked).toBe(true);
    });
  });

  describe('isModuleUnlocked - sequential unlock type', () => {
    it('should unlock first module in sequence', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      await db('curriculum_modules')
        .where({ id: curriculum.module.id })
        .update({ unlock_type: 'sequential', display_order: 0 });

      const isUnlocked = await moduleService.isModuleUnlocked(curriculum.module.id, testUser.id);

      expect(isUnlocked).toBe(true);
    });

    it('should lock second module when first not completed', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const module2 = await createTestModule(curriculum.course.id, testUser.id, {
        unlock_type: 'sequential',
        display_order: 1,
      });

      const isUnlocked = await moduleService.isModuleUnlocked(module2.id, testUser.id);

      expect(isUnlocked).toBe(false);
    });

    it('should unlock second module when first is completed', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      await db('curriculum_modules')
        .where({ id: curriculum.module.id })
        .update({ unlock_type: 'sequential', display_order: 0 });

      // Complete the first module's lesson
      await db('lesson_completions').insert({
        user_id: testUser.id,
        lesson_id: curriculum.lesson.id,
        time_spent_seconds: 120,
      });

      // Create second module
      const module2 = await createTestModule(curriculum.course.id, testUser.id, {
        unlock_type: 'sequential',
        display_order: 1,
      });

      const isUnlocked = await moduleService.isModuleUnlocked(module2.id, testUser.id);

      expect(isUnlocked).toBe(true);
    });

    it('should unlock module with empty lessons (no lessons = completed)', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const emptyModule = await createTestModule(curriculum.course.id, testUser.id, {
        unlock_type: 'sequential',
        display_order: -1, // Make it explicitly first so it's always unlocked
      });

      const isUnlocked = await moduleService.isModuleUnlocked(emptyModule.id, testUser.id);

      expect(isUnlocked).toBe(true);
    });
  });

  describe('isModuleUnlocked - conditional unlock type', () => {
    it('should unlock when has_prerequisites is false', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      await db('curriculum_modules')
        .where({ id: curriculum.module.id })
        .update({
          unlock_type: 'conditional',
          has_prerequisites: false,
        });

      const isUnlocked = await moduleService.isModuleUnlocked(curriculum.module.id, testUser.id);

      expect(isUnlocked).toBe(true);
    });

    it('should lock when prerequisite modules not completed', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const prereqModule = await createTestModule(curriculum.course.id, testUser.id, {
        display_order: 0,
      });
      const lesson1 = await createTestLesson(prereqModule.id, testUser.id);

      const targetModule = await createTestModule(curriculum.course.id, testUser.id, {
        unlock_type: 'conditional',
        has_prerequisites: true,
        prerequisite_module_ids: [prereqModule.id],
        display_order: 1,
      });

      const isUnlocked = await moduleService.isModuleUnlocked(targetModule.id, testUser.id);

      expect(isUnlocked).toBe(false);
    });

    it('should unlock when all prerequisite modules completed', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const prereqModule = await createTestModule(curriculum.course.id, testUser.id, {
        display_order: 0,
      });
      const lesson1 = await createTestLesson(prereqModule.id, testUser.id);

      // Complete prerequisite lesson
      await db('lesson_completions').insert({
        user_id: testUser.id,
        lesson_id: lesson1.id,
        time_spent_seconds: 100,
      });

      const targetModule = await createTestModule(curriculum.course.id, testUser.id, {
        unlock_type: 'conditional',
        has_prerequisites: true,
        prerequisite_module_ids: [prereqModule.id],
        display_order: 1,
      });

      const isUnlocked = await moduleService.isModuleUnlocked(targetModule.id, testUser.id);

      expect(isUnlocked).toBe(true);
    });
  });

  describe('checkPrerequisites', () => {
    it('should return unlocked for "always" unlock type', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      await db('curriculum_modules')
        .where({ id: curriculum.module.id })
        .update({ unlock_type: 'always' });

      const result = await moduleService.checkPrerequisites(curriculum.module.id, testUser.id);

      expect(result.unlocked).toBe(true);
      expect(result.missing_prerequisites).toEqual([]);
    });

    it('should return missing prerequisites for sequential unlock', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      await db('curriculum_modules')
        .where({ id: curriculum.module.id })
        .update({ unlock_type: 'sequential', display_order: 0 });

      const module2 = await createTestModule(curriculum.course.id, testUser.id, {
        unlock_type: 'sequential',
        display_order: 1,
      });

      const result = await moduleService.checkPrerequisites(module2.id, testUser.id);

      expect(result.unlocked).toBe(false);
      expect(result.missing_prerequisites).toHaveLength(1);
      expect(result.missing_prerequisites[0]).toBe(curriculum.module.id);
      expect(result.reason).toBe('Previous modules must be completed');
    });

    it('should return missing prerequisites for conditional unlock', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const prereqModule = await createTestModule(curriculum.course.id, testUser.id);
      await createTestLesson(prereqModule.id, testUser.id);

      const targetModule = await createTestModule(curriculum.course.id, testUser.id, {
        unlock_type: 'conditional',
        has_prerequisites: true,
        prerequisite_module_ids: [prereqModule.id],
      });

      const result = await moduleService.checkPrerequisites(targetModule.id, testUser.id);

      expect(result.unlocked).toBe(false);
      expect(result.missing_prerequisites).toHaveLength(1);
      expect(result.missing_prerequisites[0]).toBe(prereqModule.id);
      expect(result.reason).toBe('Prerequisite modules must be completed');
    });

    it('should return "Module not found" for non-existent module', async () => {
      const result = await moduleService.checkPrerequisites(
        '00000000-0000-0000-0000-000000000000',
        testUser.id
      );

      expect(result.unlocked).toBe(false);
      expect(result.reason).toBe('Module not found');
    });
  });

  describe('getModulesCount', () => {
    it('should return total count of all modules', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const module2 = await createTestModule(curriculum.course.id, testUser.id);

      const count = await moduleService.getModulesCount();

      expect(count).toBe(2);
    });

    it('should filter count by status', async () => {
      const curriculum = await createTestCurriculum(testUser.id);
      const draftModule = await createTestModule(curriculum.course.id, testUser.id, {
        status: 'draft',
      });

      const publishedCount = await moduleService.getModulesCount('published');
      const draftCount = await moduleService.getModulesCount('draft');

      expect(publishedCount).toBe(1);
      expect(draftCount).toBe(1);
    });

    it('should filter count by courseId', async () => {
      const curriculum1 = await createTestCurriculum(testUser.id);
      const curriculum2 = await createTestCurriculum(testUser.id);

      const count = await moduleService.getModulesCount(undefined, curriculum1.course.id);

      expect(count).toBe(1);
    });

    it('should return 0 when no modules exist', async () => {
      const count = await moduleService.getModulesCount();

      expect(count).toBe(0);
    });
  });
});
