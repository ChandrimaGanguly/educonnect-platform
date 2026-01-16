import { Knex } from 'knex';
import { getDatabase } from '../../database';
import {
  Domain,
  DomainQueryOptions,
  PaginatedResponse,
} from '../../types/curriculum.types';

export class DomainService {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * List domains with pagination and filters
   */
  async listDomains(options: DomainQueryOptions = {}): Promise<PaginatedResponse<Domain>> {
    const {
      limit = 20,
      offset = 0,
      status = 'published',
      search,
      community_id,
      tags,
      sort_by = 'display_order',
      sort_order = 'asc',
    } = options;

    // Build query
    const query = this.db('curriculum_domains').where('status', status);

    // Filter by community (null = platform-wide)
    if (community_id !== undefined) {
      if (community_id === null) {
        query.whereNull('community_id');
      } else {
        query.where('community_id', community_id);
      }
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
    const domains = await query.limit(limit).offset(offset);

    return {
      data: domains,
      total,
      limit,
      offset,
    };
  }

  /**
   * Get domain by ID
   */
  async getDomainById(id: string): Promise<Domain | null> {
    const domain = await this.db('curriculum_domains').where({ id }).first();
    return domain || null;
  }

  /**
   * Get domain by slug
   * Slug is unique within a community, so community_id is needed
   */
  async getDomainBySlug(communityId: string | null | undefined, slug: string): Promise<Domain | null> {
    const query = this.db('curriculum_domains').where({ slug });

    if (communityId === null || communityId === undefined) {
      query.whereNull('community_id');
    } else {
      query.where('community_id', communityId);
    }

    const domain = await query.first();
    return domain || null;
  }

  /**
   * Search domains using full-text search
   */
  async searchDomains(searchQuery: string, options: DomainQueryOptions = {}): Promise<Domain[]> {
    const {
      limit = 20,
      status = 'published',
      community_id,
    } = options;

    const query = this.db('curriculum_domains')
      .where('status', status)
      .where((builder) => {
        builder
          .whereRaw('LOWER(name) LIKE ?', [`%${searchQuery.toLowerCase()}%`])
          .orWhereRaw('LOWER(description) LIKE ?', [`%${searchQuery.toLowerCase()}%`])
          .orWhereRaw('? = ANY(tags)', [searchQuery.toLowerCase()]);
      });

    // Filter by community if specified
    if (community_id !== undefined) {
      if (community_id === null) {
        query.whereNull('community_id');
      } else {
        query.where('community_id', community_id);
      }
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
   * Get domains count by status
   */
  async getDomainsCount(status?: 'draft' | 'published' | 'archived', communityId?: string): Promise<number> {
    const query = this.db('curriculum_domains');

    if (status) {
      query.where('status', status);
    }

    if (communityId !== undefined) {
      if (communityId === null) {
        query.whereNull('community_id');
      } else {
        query.where('community_id', communityId);
      }
    }

    const [{ count }] = await query.count('* as count');
    return parseInt(count as string, 10);
  }
}
