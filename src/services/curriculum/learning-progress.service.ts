import { Knex } from 'knex';
import { getDatabase } from '../../database';
import {
  ModuleProgress,
  CourseProgress,
} from '../../types/curriculum.types';

export class LearningProgressService {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * Get progress for a module
   */
  async getModuleProgress(moduleId: string, userId: string): Promise<ModuleProgress> {
    // Get total lessons in module
    const [{ count: totalCount }] = await this.db('curriculum_lessons')
      .where({ module_id: moduleId, status: 'published' })
      .count('* as count');

    const total_lessons = parseInt(totalCount as string, 10);

    // Get completed lessons count
    const [{ count: completedCount }] = await this.db('curriculum_lessons as cl')
      .leftJoin('lesson_completions as lc', function(this: any) {
        this.on('cl.id', '=', 'lc.lesson_id')
          .andOn('lc.user_id', '=', this.client.raw('?', [userId]));
      })
      .where({ 'cl.module_id': moduleId, 'cl.status': 'published' })
      .whereNotNull('lc.id')
      .count('cl.id as count');

    const completed_lessons = parseInt(completedCount as string, 10);

    // Check if module is unlocked (simplified - assumes always unlocked for this version)
    const is_unlocked = true; // Could call ModuleService.isModuleUnlocked here

    // Calculate progress percentage
    const progress_percentage = this.calculateProgressPercentage(completed_lessons, total_lessons);

    return {
      module_id: moduleId,
      total_lessons,
      completed_lessons,
      is_unlocked,
      progress_percentage,
    };
  }

  /**
   * Get progress for a course
   */
  async getCourseProgress(courseId: string, userId: string): Promise<CourseProgress> {
    // Get all modules in course
    const modules = await this.db('curriculum_modules')
      .where({ course_id: courseId, status: 'published' })
      .select('id');

    const total_modules = modules.length;
    let completed_modules = 0;
    let total_lessons = 0;
    let completed_lessons = 0;

    // Calculate progress for each module
    for (const module of modules) {
      const moduleProgress = await this.getModuleProgress(module.id, userId);
      total_lessons += moduleProgress.total_lessons;
      completed_lessons += moduleProgress.completed_lessons;

      // Module is considered completed if all lessons are done
      if (moduleProgress.completed_lessons === moduleProgress.total_lessons && moduleProgress.total_lessons > 0) {
        completed_modules++;
      }
    }

    // Calculate overall progress percentage
    const progress_percentage = this.calculateProgressPercentage(completed_lessons, total_lessons);

    return {
      course_id: courseId,
      total_modules,
      completed_modules,
      total_lessons,
      completed_lessons,
      progress_percentage,
    };
  }

  /**
   * Get progress for all courses user is working on
   */
  async getUserCourseProgressList(userId: string): Promise<CourseProgress[]> {
    // Get all courses where user has completed at least one lesson
    const coursesWithProgress = await this.db('lesson_completions as lc')
      .join('curriculum_lessons as cl', 'lc.lesson_id', 'cl.id')
      .join('curriculum_modules as cm', 'cl.module_id', 'cm.id')
      .join('curriculum_courses as cc', 'cm.course_id', 'cc.id')
      .where('lc.user_id', userId)
      .where('cc.status', 'published')
      .distinct('cc.id')
      .select('cc.id as course_id');

    // Calculate progress for each course
    const progressList: CourseProgress[] = [];
    for (const row of coursesWithProgress) {
      const progress = await this.getCourseProgress(row.course_id, userId);
      progressList.push(progress);
    }

    return progressList;
  }

  /**
   * Calculate progress percentage
   */
  calculateProgressPercentage(completedCount: number, totalCount: number): number {
    if (totalCount === 0) {
      return 0;
    }
    return Math.round((completedCount / totalCount) * 100);
  }

  /**
   * Get user's recent activity (last N completed lessons)
   */
  async getRecentActivity(userId: string, limit: number = 10): Promise<any[]> {
    const recentCompletions = await this.db('lesson_completions as lc')
      .join('curriculum_lessons as cl', 'lc.lesson_id', 'cl.id')
      .join('curriculum_modules as cm', 'cl.module_id', 'cm.id')
      .join('curriculum_courses as cc', 'cm.course_id', 'cc.id')
      .where('lc.user_id', userId)
      .orderBy('lc.completed_at', 'desc')
      .limit(limit)
      .select(
        'lc.completed_at',
        'lc.time_spent_seconds',
        'cl.id as lesson_id',
        'cl.name as lesson_name',
        'cm.id as module_id',
        'cm.name as module_name',
        'cc.id as course_id',
        'cc.name as course_name'
      );

    return recentCompletions;
  }

  /**
   * Get user's total learning time
   */
  async getTotalLearningTime(userId: string): Promise<number> {
    const [{ total }] = await this.db('lesson_completions')
      .where('user_id', userId)
      .sum('time_spent_seconds as total');

    return parseInt(total as string, 10) || 0;
  }
}
