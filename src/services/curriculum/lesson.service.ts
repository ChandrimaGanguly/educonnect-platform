import { Knex } from 'knex';
import { getDatabase } from '../../database';
import {
  Lesson,
  LessonQueryOptions,
  LessonWithResources,
  LessonCompletion,
  PaginatedResponse,
} from '../../types/curriculum.types';

export class LessonService {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * List lessons with pagination and filters
   */
  async listLessons(options: LessonQueryOptions = {}): Promise<PaginatedResponse<Lesson>> {
    const {
      limit = 20,
      offset = 0,
      status = 'published',
      search,
      module_id,
      lesson_type,
      tags,
      sort_by = 'display_order',
      sort_order = 'asc',
    } = options;

    // Build query
    const query = this.db('curriculum_lessons').where('status', status);

    // Filter by module
    if (module_id) {
      query.where('module_id', module_id);
    }

    // Filter by lesson type
    if (lesson_type) {
      query.where('lesson_type', lesson_type);
    }

    // Full-text search
    if (search) {
      query.where((builder) => {
        builder
          .whereRaw('LOWER(name) LIKE ?', [`%${search.toLowerCase()}%`])
          .orWhereRaw('LOWER(description) LIKE ?', [`%${search.toLowerCase()}%`]);
      });
    }

    // Filter by tags
    if (tags && tags.length > 0) {
      query.whereRaw('tags && ?', [tags]);
    }

    // Get total count
    const countQuery = query.clone();
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count as string, 10);

    // Apply sorting
    const validSortFields = ['name', 'display_order', 'created_at', 'updated_at', 'lesson_type'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'display_order';
    query.orderBy(sortField, sort_order);

    // Apply pagination
    const lessons = await query.limit(limit).offset(offset);

    return {
      data: lessons,
      total,
      limit,
      offset,
    };
  }

  /**
   * List lessons by module (always ordered by display_order)
   */
  async listLessonsByModule(moduleId: string, options: LessonQueryOptions = {}): Promise<PaginatedResponse<Lesson>> {
    return this.listLessons({ ...options, module_id: moduleId, sort_by: 'display_order', sort_order: 'asc' });
  }

  /**
   * Get lesson by ID
   */
  async getLessonById(id: string): Promise<Lesson | null> {
    const lesson = await this.db('curriculum_lessons').where({ id }).first();
    return lesson || null;
  }

  /**
   * Get lesson with resources and completion status
   */
  async getLessonWithResources(id: string, userId?: string): Promise<LessonWithResources | null> {
    const lesson = await this.getLessonById(id);
    if (!lesson) {
      return null;
    }

    // Get resources (ordered by display_order)
    const resources = await this.db('curriculum_resources')
      .where({ lesson_id: id, status: 'published' })
      .orderBy('display_order', 'asc');

    // Check completion status if user is provided
    let is_completed = false;
    if (userId) {
      is_completed = await this.isLessonCompleted(id, userId);
    }

    return {
      ...lesson,
      resources: resources || [],
      is_completed,
    };
  }

  /**
   * Mark lesson as complete for a user
   * Idempotent: returns existing completion if already completed
   */
  async markLessonComplete(
    lessonId: string,
    userId: string,
    timeSpentSeconds?: number,
    metadata?: Record<string, unknown>
  ): Promise<LessonCompletion> {
    // Check if already completed
    const existing = await this.db('lesson_completions')
      .where({ lesson_id: lessonId, user_id: userId })
      .first();

    if (existing) {
      return existing;
    }

    // Insert new completion record
    const [completion] = await this.db('lesson_completions')
      .insert({
        user_id: userId,
        lesson_id: lessonId,
        time_spent_seconds: timeSpentSeconds,
        metadata: metadata ? JSON.stringify(metadata) : null,
      })
      .returning('*');

    return completion;
  }

  /**
   * Check if lesson is completed by user
   */
  async isLessonCompleted(lessonId: string, userId: string): Promise<boolean> {
    const completion = await this.db('lesson_completions')
      .where({ lesson_id: lessonId, user_id: userId })
      .first();

    return !!completion;
  }

  /**
   * Get lesson completion for user
   */
  async getLessonCompletion(lessonId: string, userId: string): Promise<LessonCompletion | null> {
    const completion = await this.db('lesson_completions')
      .where({ lesson_id: lessonId, user_id: userId })
      .first();

    return completion || null;
  }

  /**
   * Get lesson completion rate (percentage of users who completed)
   */
  async getLessonCompletionRate(lessonId: string): Promise<number> {
    // This is a simple implementation
    // In production, you might want to cache this or use analytics service
    const [{ count: totalCompletions }] = await this.db('lesson_completions')
      .where({ lesson_id: lessonId })
      .count('* as count');

    const completions = parseInt(totalCompletions as string, 10);

    // Return raw count for now
    // In a real system, you'd divide by total enrolled users
    return completions;
  }

  /**
   * Get all completions for a user in a module
   */
  async getModuleCompletions(moduleId: string, userId: string): Promise<LessonCompletion[]> {
    const completions = await this.db('lesson_completions as lc')
      .join('curriculum_lessons as cl', 'lc.lesson_id', 'cl.id')
      .where({ 'cl.module_id': moduleId, 'lc.user_id': userId })
      .select('lc.*');

    return completions;
  }

  /**
   * Get lessons count
   */
  async getLessonsCount(
    status?: 'draft' | 'published' | 'archived',
    moduleId?: string,
    lessonType?: string
  ): Promise<number> {
    const query = this.db('curriculum_lessons');

    if (status) {
      query.where('status', status);
    }

    if (moduleId) {
      query.where('module_id', moduleId);
    }

    if (lessonType) {
      query.where('lesson_type', lessonType);
    }

    const [{ count }] = await query.count('* as count');
    return parseInt(count as string, 10);
  }
}
