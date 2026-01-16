import { Knex } from 'knex';
import { getDatabase } from '../../database';
import {
  Module,
  ModuleQueryOptions,
  ModuleWithLessons,
  PrerequisiteCheck,
  PaginatedResponse,
} from '../../types/curriculum.types';

export class ModuleService {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * List modules with pagination and filters
   */
  async listModules(options: ModuleQueryOptions = {}): Promise<PaginatedResponse<Module>> {
    const {
      limit = 20,
      offset = 0,
      status = 'published',
      search,
      course_id,
      tags,
      sort_by = 'display_order',
      sort_order = 'asc',
    } = options;

    // Build query
    const query = this.db('curriculum_modules').where('status', status);

    // Filter by course
    if (course_id) {
      query.where('course_id', course_id);
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
    const validSortFields = ['name', 'display_order', 'created_at', 'updated_at'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'display_order';
    query.orderBy(sortField, sort_order);

    // Apply pagination
    const modules = await query.limit(limit).offset(offset);

    return {
      data: modules,
      total,
      limit,
      offset,
    };
  }

  /**
   * List modules by course (always ordered by display_order)
   */
  async listModulesByCourse(courseId: string, options: ModuleQueryOptions = {}): Promise<PaginatedResponse<Module>> {
    return this.listModules({ ...options, course_id: courseId, sort_by: 'display_order', sort_order: 'asc' });
  }

  /**
   * Get module by ID
   */
  async getModuleById(id: string): Promise<Module | null> {
    const module = await this.db('curriculum_modules').where({ id }).first();
    return module || null;
  }

  /**
   * Get module with lessons and unlock status for a user
   */
  async getModuleWithLessons(id: string, userId?: string): Promise<ModuleWithLessons | null> {
    const module = await this.getModuleById(id);
    if (!module) {
      return null;
    }

    // Get lessons (ordered by display_order)
    const lessons = await this.db('curriculum_lessons')
      .where({ module_id: id, status: 'published' })
      .orderBy('display_order', 'asc');

    // Check unlock status if user is provided
    let is_unlocked = true;
    if (userId) {
      is_unlocked = await this.isModuleUnlocked(id, userId);
    }

    return {
      ...module,
      lessons: lessons || [],
      is_unlocked,
    };
  }

  /**
   * Check if module is unlocked for a user
   * Implements three unlock types: sequential, conditional, always
   */
  async isModuleUnlocked(moduleId: string, userId: string): Promise<boolean> {
    const module = await this.getModuleById(moduleId);
    if (!module) {
      return false;
    }

    // Always unlock type
    if (module.unlock_type === 'always') {
      return true;
    }

    // Sequential unlock type: check all previous modules completed
    if (module.unlock_type === 'sequential') {
      const result = await this.checkSequentialPrerequisites(module, userId);
      return result.unlocked;
    }

    // Conditional unlock type: evaluate unlock_conditions JSON
    if (module.unlock_type === 'conditional') {
      const result = await this.checkConditionalPrerequisites(module, userId);
      return result.unlocked;
    }

    // Default to locked if unknown unlock type
    return false;
  }

  /**
   * Check prerequisites and return detailed result
   */
  async checkPrerequisites(moduleId: string, userId: string): Promise<PrerequisiteCheck> {
    const module = await this.getModuleById(moduleId);
    if (!module) {
      return {
        unlocked: false,
        missing_prerequisites: [],
        reason: 'Module not found',
      };
    }

    // Always unlock
    if (module.unlock_type === 'always') {
      return {
        unlocked: true,
        missing_prerequisites: [],
      };
    }

    // Sequential unlock
    if (module.unlock_type === 'sequential') {
      return this.checkSequentialPrerequisites(module, userId);
    }

    // Conditional unlock
    if (module.unlock_type === 'conditional') {
      return this.checkConditionalPrerequisites(module, userId);
    }

    return {
      unlocked: false,
      missing_prerequisites: [],
      reason: 'Unknown unlock type',
    };
  }

  /**
   * Check sequential prerequisites: all previous modules must be completed
   */
  private async checkSequentialPrerequisites(module: Module, userId: string): Promise<PrerequisiteCheck> {
    // Get all modules in the course ordered by display_order
    const allModules = await this.db('curriculum_modules')
      .where({ course_id: module.course_id, status: 'published' })
      .orderBy('display_order', 'asc');

    // Find current module's position
    const currentIndex = allModules.findIndex(m => m.id === module.id);
    if (currentIndex === -1) {
      return {
        unlocked: false,
        missing_prerequisites: [],
        reason: 'Module not found in course',
      };
    }

    // First module is always unlocked
    if (currentIndex === 0) {
      return {
        unlocked: true,
        missing_prerequisites: [],
      };
    }

    // Get all previous modules
    const previousModules = allModules.slice(0, currentIndex);
    const missing: string[] = [];

    // Check if each previous module has all lessons completed
    for (const prevModule of previousModules) {
      const isComplete = await this.isModuleCompleted(prevModule.id, userId);
      if (!isComplete) {
        missing.push(prevModule.id);
      }
    }

    return {
      unlocked: missing.length === 0,
      missing_prerequisites: missing,
      reason: missing.length > 0 ? 'Previous modules must be completed' : undefined,
    };
  }

  /**
   * Check conditional prerequisites: evaluate unlock_conditions JSON
   */
  private async checkConditionalPrerequisites(module: Module, userId: string): Promise<PrerequisiteCheck> {
    if (!module.has_prerequisites || !module.prerequisite_module_ids || module.prerequisite_module_ids.length === 0) {
      return {
        unlocked: true,
        missing_prerequisites: [],
      };
    }

    const missing: string[] = [];

    // Check each prerequisite module
    for (const prereqId of module.prerequisite_module_ids) {
      const isComplete = await this.isModuleCompleted(prereqId, userId);
      if (!isComplete) {
        missing.push(prereqId);
      }
    }

    return {
      unlocked: missing.length === 0,
      missing_prerequisites: missing,
      reason: missing.length > 0 ? 'Prerequisite modules must be completed' : undefined,
    };
  }

  /**
   * Check if a module is completed by user (all lessons completed)
   */
  private async isModuleCompleted(moduleId: string, userId: string): Promise<boolean> {
    // Get total lessons in module
    const [{ count: totalCount }] = await this.db('curriculum_lessons')
      .where({ module_id: moduleId, status: 'published' })
      .count('* as count');

    const total = parseInt(totalCount as string, 10);

    if (total === 0) {
      return true; // Empty modules are considered complete
    }

    // Get completed lessons count
    const [{ count: completedCount }] = await this.db('curriculum_lessons as cl')
      .leftJoin('lesson_completions as lc', function(this: any) {
        this.on('cl.id', '=', 'lc.lesson_id')
          .andOn('lc.user_id', '=', this.client.raw('?', [userId]));
      })
      .where({ 'cl.module_id': moduleId, 'cl.status': 'published' })
      .whereNotNull('lc.id')
      .count('cl.id as count');

    const completed = parseInt(completedCount as string, 10);

    return completed === total;
  }

  /**
   * Get modules count
   */
  async getModulesCount(status?: 'draft' | 'published' | 'archived', courseId?: string): Promise<number> {
    const query = this.db('curriculum_modules');

    if (status) {
      query.where('status', status);
    }

    if (courseId) {
      query.where('course_id', courseId);
    }

    const [{ count }] = await query.count('* as count');
    return parseInt(count as string, 10);
  }
}
