import { Knex } from 'knex';
import { getDatabase } from '../../database';
import {
  Subject,
  SubjectQueryOptions,
  PaginatedResponse,
} from '../../types/curriculum.types';

export class SubjectService {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * List subjects with pagination and filters
   */
  async listSubjects(options: SubjectQueryOptions = {}): Promise<PaginatedResponse<Subject>> {
    const {
      limit = 20,
      offset = 0,
      status = 'published',
      search,
      domain_id,
      tags,
      sort_by = 'display_order',
      sort_order = 'asc',
    } = options;

    // Build query
    const query = this.db('curriculum_subjects').where('status', status);

    // Filter by domain
    if (domain_id) {
      query.where('domain_id', domain_id);
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

    // If sorting by display_order, also sort by name as secondary
    if (sortField === 'display_order') {
      query.orderBy('name', 'asc');
    }

    // Apply pagination
    const subjects = await query.limit(limit).offset(offset);

    return {
      data: subjects,
      total,
      limit,
      offset,
    };
  }

  /**
   * List subjects by domain
   */
  async listSubjectsByDomain(domainId: string, options: SubjectQueryOptions = {}): Promise<PaginatedResponse<Subject>> {
    return this.listSubjects({ ...options, domain_id: domainId });
  }

  /**
   * Get subject by ID
   */
  async getSubjectById(id: string): Promise<Subject | null> {
    const subject = await this.db('curriculum_subjects').where({ id }).first();
    return subject || null;
  }

  /**
   * Get subject by slug within a domain
   */
  async getSubjectBySlug(domainId: string, slug: string): Promise<Subject | null> {
    const subject = await this.db('curriculum_subjects')
      .where({ domain_id: domainId, slug })
      .first();
    return subject || null;
  }

  /**
   * Search subjects using full-text search
   */
  async searchSubjects(searchQuery: string, options: SubjectQueryOptions = {}): Promise<Subject[]> {
    const {
      limit = 20,
      status = 'published',
      domain_id,
    } = options;

    const query = this.db('curriculum_subjects')
      .where('status', status)
      .where((builder) => {
        builder
          .whereRaw('LOWER(name) LIKE ?', [`%${searchQuery.toLowerCase()}%`])
          .orWhereRaw('LOWER(description) LIKE ?', [`%${searchQuery.toLowerCase()}%`])
          .orWhereRaw('? = ANY(tags)', [searchQuery.toLowerCase()]);
      });

    // Filter by domain if specified
    if (domain_id) {
      query.where('domain_id', domain_id);
    }

    // Order by relevance (name match first, then description, then display_order)
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
   * Get subjects count
   */
  async getSubjectsCount(status?: 'draft' | 'published' | 'archived', domainId?: string): Promise<number> {
    const query = this.db('curriculum_subjects');

    if (status) {
      query.where('status', status);
    }

    if (domainId) {
      query.where('domain_id', domainId);
    }

    const [{ count }] = await query.count('* as count');
    return parseInt(count as string, 10);
  }
}
