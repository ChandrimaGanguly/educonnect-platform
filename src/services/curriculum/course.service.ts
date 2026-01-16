import { Knex } from 'knex';
import { getDatabase } from '../../database';
import {
  Course,
  CourseQueryOptions,
  CourseWithDetails,
  PaginatedResponse,
} from '../../types/curriculum.types';

export class CourseService {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * List courses with pagination and filters
   */
  async listCourses(options: CourseQueryOptions = {}): Promise<PaginatedResponse<Course>> {
    const {
      limit = 20,
      offset = 0,
      status = 'published',
      search,
      subject_id,
      difficulty,
      track_type,
      is_enrollable,
      tags,
      sort_by = 'display_order',
      sort_order = 'asc',
    } = options;

    // Build query
    const query = this.db('curriculum_courses').where('status', status);

    // Filter by subject
    if (subject_id) {
      query.where('subject_id', subject_id);
    }

    // Filter by difficulty
    if (difficulty) {
      query.where('difficulty_level', difficulty);
    }

    // Filter by track type
    if (track_type) {
      query.where('track_type', track_type);
    }

    // Filter by enrollable status
    if (is_enrollable !== undefined) {
      query.where('is_enrollable', is_enrollable);
    }

    // Full-text search
    if (search) {
      query.where((builder) => {
        builder
          .whereRaw('LOWER(name) LIKE ?', [`%${search.toLowerCase()}%`])
          .orWhereRaw('LOWER(description) LIKE ?', [`%${search.toLowerCase()}%`])
          .orWhereRaw('LOWER(overview) LIKE ?', [`%${search.toLowerCase()}%`]);
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
    const validSortFields = ['name', 'display_order', 'created_at', 'updated_at', 'published_at', 'difficulty_level'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'display_order';
    query.orderBy(sortField, sort_order);

    // If sorting by display_order, also sort by name as secondary
    if (sortField === 'display_order') {
      query.orderBy('name', 'asc');
    }

    // Apply pagination
    const courses = await query.limit(limit).offset(offset);

    return {
      data: courses,
      total,
      limit,
      offset,
    };
  }

  /**
   * List courses by subject
   */
  async listCoursesBySubject(subjectId: string, options: CourseQueryOptions = {}): Promise<PaginatedResponse<Course>> {
    return this.listCourses({ ...options, subject_id: subjectId });
  }

  /**
   * Get course by ID (basic)
   */
  async getCourseById(id: string): Promise<Course | null> {
    const course = await this.db('curriculum_courses').where({ id }).first();
    return course || null;
  }

  /**
   * Get course with related data (modules, learning_paths, standards)
   * This is the complex join query
   */
  async getCourseWithDetails(id: string): Promise<CourseWithDetails | null> {
    // Get course
    const course = await this.getCourseById(id);
    if (!course) {
      return null;
    }

    // Get subject
    const subject = await this.db('curriculum_subjects')
      .where({ id: course.subject_id })
      .first();

    // Get modules (ordered by display_order)
    const modules = await this.db('curriculum_modules')
      .where({ course_id: id, status: 'published' })
      .orderBy('display_order', 'asc');

    // Get learning paths (active only)
    const learning_paths = await this.db('curriculum_learning_paths')
      .where({ course_id: id, is_active: true })
      .orderBy('is_recommended', 'desc')
      .orderBy('path_type', 'asc');

    // Get standards mapped to this course
    const standards = await this.db('curriculum_content_standards as ccs')
      .join('curriculum_standards as cs', 'ccs.standard_id', 'cs.id')
      .where('ccs.course_id', id)
      .select(
        'cs.*',
        'ccs.coverage_level',
        'ccs.notes'
      )
      .orderBy('cs.display_order', 'asc');

    return {
      ...course,
      subject: subject || undefined,
      modules: modules || [],
      learning_paths: learning_paths || [],
      standards: standards || [],
    };
  }

  /**
   * Get course by slug within a subject
   * Supports versioning (defaults to latest version)
   */
  async getCourseBySlug(subjectId: string, slug: string, version?: number): Promise<Course | null> {
    const query = this.db('curriculum_courses')
      .where({ subject_id: subjectId, slug });

    if (version !== undefined) {
      query.where('version', version);
    } else {
      // Get latest version
      query.orderBy('version', 'desc');
    }

    const course = await query.first();
    return course || null;
  }

  /**
   * Search courses using full-text search
   */
  async searchCourses(searchQuery: string, options: CourseQueryOptions = {}): Promise<Course[]> {
    const {
      limit = 20,
      status = 'published',
      subject_id,
      difficulty,
      track_type,
    } = options;

    const query = this.db('curriculum_courses')
      .where('status', status)
      .where((builder) => {
        builder
          .whereRaw('LOWER(name) LIKE ?', [`%${searchQuery.toLowerCase()}%`])
          .orWhereRaw('LOWER(description) LIKE ?', [`%${searchQuery.toLowerCase()}%`])
          .orWhereRaw('LOWER(overview) LIKE ?', [`%${searchQuery.toLowerCase()}%`])
          .orWhereRaw('? = ANY(tags)', [searchQuery.toLowerCase()]);
      });

    // Apply filters
    if (subject_id) {
      query.where('subject_id', subject_id);
    }

    if (difficulty) {
      query.where('difficulty_level', difficulty);
    }

    if (track_type) {
      query.where('track_type', track_type);
    }

    // Order by relevance
    query.orderByRaw(
      `CASE
        WHEN LOWER(name) LIKE ? THEN 1
        WHEN LOWER(description) LIKE ? THEN 2
        ELSE 3
      END`,
      [`%${searchQuery.toLowerCase()}%`, `%${searchQuery.toLowerCase()}%`]
    );
    query.orderBy('display_order', 'asc');
    query.limit(limit);

    return await query;
  }

  /**
   * Get courses count
   */
  async getCoursesCount(
    status?: 'draft' | 'published' | 'archived',
    subjectId?: string,
    difficulty?: string
  ): Promise<number> {
    const query = this.db('curriculum_courses');

    if (status) {
      query.where('status', status);
    }

    if (subjectId) {
      query.where('subject_id', subjectId);
    }

    if (difficulty) {
      query.where('difficulty_level', difficulty);
    }

    const [{ count }] = await query.count('* as count');
    return parseInt(count as string, 10);
  }
}
