import { Knex } from 'knex';
import { getDatabase } from '../database';

/**
 * Learning Objective Service
 *
 * Manages learning objectives and their associations with content:
 * - Bloom's taxonomy levels
 * - Objective hierarchy (parent-child relationships)
 * - Content-to-objective mapping
 * - Measurability and assessment criteria
 */

// ========== Types ==========

export type CognitiveLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
export type ObjectiveType = 'knowledge' | 'skill' | 'attitude' | 'competency';
export type ObjectiveStatus = 'draft' | 'active' | 'deprecated';

export interface LearningObjective {
  id: string;
  parent_id?: string;
  community_id?: string;
  code: string;
  title: string;
  description: string;
  cognitive_level: CognitiveLevel;
  objective_type: ObjectiveType;
  status: ObjectiveStatus;
  display_order: number;
  tags: string[];
  is_measurable: boolean;
  assessment_criteria: any[];
  metadata: Record<string, any>;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface ContentObjective {
  id: string;
  lesson_id?: string;
  module_id?: string;
  course_id?: string;
  draft_id?: string;
  objective_id: string;
  is_primary: boolean;
  display_order: number;
  created_by: string;
  created_at: Date;
}

export interface CreateObjectiveData {
  parent_id?: string;
  community_id?: string;
  code: string;
  title: string;
  description: string;
  cognitive_level: CognitiveLevel;
  objective_type?: ObjectiveType;
  tags?: string[];
  is_measurable?: boolean;
  assessment_criteria?: any[];
}

export interface UpdateObjectiveData {
  title?: string;
  description?: string;
  cognitive_level?: CognitiveLevel;
  objective_type?: ObjectiveType;
  status?: ObjectiveStatus;
  display_order?: number;
  tags?: string[];
  is_measurable?: boolean;
  assessment_criteria?: any[];
}

export interface LinkObjectiveData {
  objective_id: string;
  lesson_id?: string;
  module_id?: string;
  course_id?: string;
  draft_id?: string;
  is_primary?: boolean;
}

export class LearningObjectiveService {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  // ========== Objective Management ==========

  /**
   * Create a new learning objective
   */
  async createObjective(userId: string, data: CreateObjectiveData): Promise<LearningObjective> {
    // Check for duplicate code within community
    const existing = await this.db('learning_objectives')
      .where({ community_id: data.community_id, code: data.code })
      .first();

    if (existing) {
      throw new Error(`Objective with code "${data.code}" already exists in this community`);
    }

    // Get next display order for same parent
    const lastObjective = await this.db('learning_objectives')
      .where({ community_id: data.community_id, parent_id: data.parent_id || null })
      .orderBy('display_order', 'desc')
      .first();
    const displayOrder = lastObjective ? lastObjective.display_order + 1 : 0;

    const [objective] = await this.db('learning_objectives')
      .insert({
        parent_id: data.parent_id,
        community_id: data.community_id,
        code: data.code,
        title: data.title,
        description: data.description,
        cognitive_level: data.cognitive_level,
        objective_type: data.objective_type || 'knowledge',
        tags: data.tags || [],
        is_measurable: data.is_measurable ?? true,
        assessment_criteria: JSON.stringify(data.assessment_criteria || []),
        display_order: displayOrder,
        created_by: userId,
        status: 'active',
        metadata: JSON.stringify({}),
      })
      .returning('*');

    return this.formatObjective(objective);
  }

  /**
   * Get objective by ID
   */
  async getObjective(objectiveId: string): Promise<LearningObjective | null> {
    const objective = await this.db('learning_objectives')
      .where({ id: objectiveId })
      .first();

    if (!objective) return null;
    return this.formatObjective(objective);
  }

  /**
   * Get objective by code
   */
  async getObjectiveByCode(communityId: string, code: string): Promise<LearningObjective | null> {
    const objective = await this.db('learning_objectives')
      .where({ community_id: communityId, code })
      .first();

    if (!objective) return null;
    return this.formatObjective(objective);
  }

  /**
   * Get objectives with filtering
   */
  async getObjectives(
    options: {
      community_id?: string;
      parent_id?: string | null;
      cognitive_level?: CognitiveLevel;
      objective_type?: ObjectiveType;
      status?: ObjectiveStatus;
      tags?: string[];
      search?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ objectives: LearningObjective[]; total: number }> {
    const { limit = 50, offset = 0, search, tags, parent_id, ...filters } = options;

    let query = this.db('learning_objectives');

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined) {
        query = query.where({ [key]: value });
      }
    }

    // Handle parent_id filter (including null for root objectives)
    if (parent_id !== undefined) {
      if (parent_id === null) {
        query = query.whereNull('parent_id');
      } else {
        query = query.where({ parent_id });
      }
    }

    if (tags && tags.length > 0) {
      query = query.whereRaw('tags && ARRAY[?]::varchar[]', [tags]);
    }

    if (search) {
      query = query.whereRaw(
        `to_tsvector('english', title || ' ' || description) @@ plainto_tsquery('english', ?)`,
        [search]
      );
    }

    const [{ count }] = await query.clone().count('* as count');
    const objectives = await query
      .limit(limit)
      .offset(offset)
      .orderBy('display_order', 'asc');

    return {
      objectives: objectives.map((o: any) => this.formatObjective(o)),
      total: Number(count),
    };
  }

  /**
   * Get objective hierarchy (tree structure)
   */
  async getObjectiveTree(communityId: string): Promise<(LearningObjective & { children: any[] })[]> {
    const objectives = await this.db('learning_objectives')
      .where({ community_id: communityId, status: 'active' })
      .orderBy('display_order', 'asc');

    const formattedObjectives = objectives.map((o: any) => ({
      ...this.formatObjective(o),
      children: [] as any[],
    }));

    // Build tree structure
    const objectiveMap = new Map<string, any>();
    const roots: any[] = [];

    for (const obj of formattedObjectives) {
      objectiveMap.set(obj.id, obj);
    }

    for (const obj of formattedObjectives) {
      if (obj.parent_id && objectiveMap.has(obj.parent_id)) {
        objectiveMap.get(obj.parent_id)!.children.push(obj);
      } else {
        roots.push(obj);
      }
    }

    return roots;
  }

  /**
   * Update an objective
   */
  async updateObjective(objectiveId: string, data: UpdateObjectiveData): Promise<LearningObjective> {
    const updateData: Record<string, any> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.cognitive_level !== undefined) updateData.cognitive_level = data.cognitive_level;
    if (data.objective_type !== undefined) updateData.objective_type = data.objective_type;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.display_order !== undefined) updateData.display_order = data.display_order;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.is_measurable !== undefined) updateData.is_measurable = data.is_measurable;
    if (data.assessment_criteria !== undefined) {
      updateData.assessment_criteria = JSON.stringify(data.assessment_criteria);
    }

    const [objective] = await this.db('learning_objectives')
      .where({ id: objectiveId })
      .update(updateData)
      .returning('*');

    return this.formatObjective(objective);
  }

  /**
   * Delete an objective
   */
  async deleteObjective(objectiveId: string): Promise<void> {
    // Check for child objectives
    const children = await this.db('learning_objectives')
      .where({ parent_id: objectiveId })
      .count('* as count');

    if (Number(children[0].count) > 0) {
      throw new Error('Cannot delete objective with child objectives');
    }

    // Check for content associations
    const associations = await this.db('content_objectives')
      .where({ objective_id: objectiveId })
      .count('* as count');

    if (Number(associations[0].count) > 0) {
      // Deprecate instead of delete if in use
      await this.db('learning_objectives')
        .where({ id: objectiveId })
        .update({ status: 'deprecated' });
    } else {
      await this.db('learning_objectives')
        .where({ id: objectiveId })
        .delete();
    }
  }

  /**
   * Reorder objectives
   */
  async reorderObjectives(
    objectives: { id: string; display_order: number }[]
  ): Promise<void> {
    await this.db.transaction(async (trx) => {
      for (const item of objectives) {
        await trx('learning_objectives')
          .where({ id: item.id })
          .update({ display_order: item.display_order });
      }
    });
  }

  // ========== Content-Objective Mapping ==========

  /**
   * Link objective to content
   */
  async linkObjective(userId: string, data: LinkObjectiveData): Promise<ContentObjective> {
    // Get next display order
    let query = this.db('content_objectives').where({ objective_id: data.objective_id });
    if (data.lesson_id) query = query.where({ lesson_id: data.lesson_id });
    if (data.module_id) query = query.where({ module_id: data.module_id });
    if (data.course_id) query = query.where({ course_id: data.course_id });
    if (data.draft_id) query = query.where({ draft_id: data.draft_id });

    const existing = await query.first();
    if (existing) {
      throw new Error('Objective is already linked to this content');
    }

    const lastLink = await this.db('content_objectives')
      .where(
        data.lesson_id ? { lesson_id: data.lesson_id }
          : data.module_id ? { module_id: data.module_id }
            : data.course_id ? { course_id: data.course_id }
              : { draft_id: data.draft_id }
      )
      .orderBy('display_order', 'desc')
      .first();
    const displayOrder = lastLink ? lastLink.display_order + 1 : 0;

    const [link] = await this.db('content_objectives')
      .insert({
        objective_id: data.objective_id,
        lesson_id: data.lesson_id,
        module_id: data.module_id,
        course_id: data.course_id,
        draft_id: data.draft_id,
        is_primary: data.is_primary || false,
        display_order: displayOrder,
        created_by: userId,
      })
      .returning('*');

    return link;
  }

  /**
   * Unlink objective from content
   */
  async unlinkObjective(linkId: string): Promise<void> {
    await this.db('content_objectives')
      .where({ id: linkId })
      .delete();
  }

  /**
   * Get objectives for content
   */
  async getContentObjectives(
    contentType: 'lesson' | 'module' | 'course' | 'draft',
    contentId: string
  ): Promise<(ContentObjective & { objective: LearningObjective })[]> {
    const idField = `${contentType}_id`;

    const links = await this.db('content_objectives')
      .join('learning_objectives', 'content_objectives.objective_id', 'learning_objectives.id')
      .where({ [idField]: contentId })
      .select('content_objectives.*', 'learning_objectives.code', 'learning_objectives.title',
        'learning_objectives.description', 'learning_objectives.cognitive_level',
        'learning_objectives.objective_type', 'learning_objectives.status')
      .orderBy('content_objectives.display_order', 'asc');

    return links.map((link: any) => ({
      id: link.id,
      lesson_id: link.lesson_id,
      module_id: link.module_id,
      course_id: link.course_id,
      draft_id: link.draft_id,
      objective_id: link.objective_id,
      is_primary: link.is_primary,
      display_order: link.display_order,
      created_by: link.created_by,
      created_at: link.created_at,
      objective: {
        id: link.objective_id,
        code: link.code,
        title: link.title,
        description: link.description,
        cognitive_level: link.cognitive_level,
        objective_type: link.objective_type,
        status: link.status,
      } as any,
    }));
  }

  /**
   * Get content for objective
   */
  async getObjectiveContent(objectiveId: string): Promise<{
    lessons: string[];
    modules: string[];
    courses: string[];
    drafts: string[];
  }> {
    const links = await this.db('content_objectives')
      .where({ objective_id: objectiveId });

    return {
      lessons: links.filter((l: any) => l.lesson_id).map((l: any) => l.lesson_id),
      modules: links.filter((l: any) => l.module_id).map((l: any) => l.module_id),
      courses: links.filter((l: any) => l.course_id).map((l: any) => l.course_id),
      drafts: links.filter((l: any) => l.draft_id).map((l: any) => l.draft_id),
    };
  }

  /**
   * Set primary objective for content
   */
  async setPrimaryObjective(
    contentType: 'lesson' | 'module' | 'course' | 'draft',
    contentId: string,
    objectiveId: string
  ): Promise<void> {
    const idField = `${contentType}_id`;

    await this.db.transaction(async (trx) => {
      // Clear existing primary
      await trx('content_objectives')
        .where({ [idField]: contentId })
        .update({ is_primary: false });

      // Set new primary
      await trx('content_objectives')
        .where({ [idField]: contentId, objective_id: objectiveId })
        .update({ is_primary: true });
    });
  }

  /**
   * Bulk link objectives to content
   */
  async bulkLinkObjectives(
    userId: string,
    contentType: 'lesson' | 'module' | 'course' | 'draft',
    contentId: string,
    objectiveIds: string[],
    options: { replaceMasking?: boolean } = {}
  ): Promise<ContentObjective[]> {
    const idField = `${contentType}_id`;

    await this.db.transaction(async (trx) => {
      if (options.replaceMasking) {
        // Remove existing links
        await trx('content_objectives')
          .where({ [idField]: contentId })
          .delete();
      }

      // Get existing linked objectives
      const existing = await trx('content_objectives')
        .where({ [idField]: contentId })
        .select('objective_id');
      const existingIds = new Set(existing.map((e: any) => e.objective_id));

      // Filter out already linked objectives
      const newObjectiveIds = objectiveIds.filter(id => !existingIds.has(id));

      if (newObjectiveIds.length > 0) {
        const insertData = newObjectiveIds.map((objId, index) => ({
          objective_id: objId,
          [idField]: contentId,
          is_primary: index === 0 && existingIds.size === 0,
          display_order: existingIds.size + index,
          created_by: userId,
        }));

        await trx('content_objectives').insert(insertData);
      }
    });

    return this.getContentObjectives(contentType, contentId) as any;
  }

  // ========== Bloom's Taxonomy Helpers ==========

  /**
   * Get cognitive level description
   */
  getCognitiveLevelDescription(level: CognitiveLevel): string {
    const descriptions: Record<CognitiveLevel, string> = {
      remember: 'Recall facts and basic concepts',
      understand: 'Explain ideas or concepts',
      apply: 'Use information in new situations',
      analyze: 'Draw connections among ideas',
      evaluate: 'Justify a stand or decision',
      create: 'Produce new or original work',
    };
    return descriptions[level];
  }

  /**
   * Get action verbs for cognitive level
   */
  getCognitiveLevelVerbs(level: CognitiveLevel): string[] {
    const verbs: Record<CognitiveLevel, string[]> = {
      remember: ['define', 'list', 'recognize', 'recall', 'identify', 'label', 'name', 'state'],
      understand: ['describe', 'explain', 'summarize', 'interpret', 'classify', 'compare', 'discuss'],
      apply: ['use', 'demonstrate', 'implement', 'solve', 'execute', 'apply', 'illustrate'],
      analyze: ['analyze', 'differentiate', 'organize', 'compare', 'contrast', 'examine', 'deconstruct'],
      evaluate: ['evaluate', 'assess', 'judge', 'critique', 'justify', 'defend', 'argue'],
      create: ['create', 'design', 'develop', 'formulate', 'construct', 'produce', 'compose'],
    };
    return verbs[level];
  }

  /**
   * Suggest cognitive level based on objective text
   */
  suggestCognitiveLevel(text: string): CognitiveLevel {
    const lowerText = text.toLowerCase();

    // Check each level's verbs
    const levels: CognitiveLevel[] = ['create', 'evaluate', 'analyze', 'apply', 'understand', 'remember'];

    for (const level of levels) {
      const verbs = this.getCognitiveLevelVerbs(level);
      for (const verb of verbs) {
        if (lowerText.includes(verb)) {
          return level;
        }
      }
    }

    return 'understand'; // Default
  }

  // ========== Utilities ==========

  /**
   * Generate objective code
   */
  generateObjectiveCode(communityId: string, parentCode?: string): Promise<string> {
    return this.db.transaction(async (trx) => {
      const prefix = parentCode ? `${parentCode}.` : 'LO-';

      // Find highest existing code with this prefix
      const existing = await trx('learning_objectives')
        .where({ community_id: communityId })
        .whereRaw('code LIKE ?', [`${prefix}%`])
        .orderByRaw("CAST(SUBSTRING(code FROM '([0-9]+)$') AS INTEGER) DESC")
        .first();

      let nextNum = 1;
      if (existing) {
        const match = existing.code.match(/(\d+)$/);
        if (match) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }

      return `${prefix}${nextNum}`;
    });
  }

  /**
   * Format objective from database row
   */
  private formatObjective(row: any): LearningObjective {
    return {
      ...row,
      assessment_criteria: row.assessment_criteria
        ? (typeof row.assessment_criteria === 'string' ? JSON.parse(row.assessment_criteria) : row.assessment_criteria)
        : [],
      metadata: row.metadata
        ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata)
        : {},
      tags: row.tags || [],
    };
  }
}
