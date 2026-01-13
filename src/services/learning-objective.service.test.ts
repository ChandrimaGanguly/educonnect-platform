/**
 * Learning Objective Service Tests
 *
 * Tests for learning objective management including:
 * - Objective CRUD operations
 * - Objective hierarchy (tree structure)
 * - Content-objective mapping
 * - Bloom's taxonomy helpers
 */

import { LearningObjectiveService } from './learning-objective.service';
import { getDatabase } from '../database';

jest.mock('../database', () => ({
  getDatabase: jest.fn(),
}));

describe('LearningObjectiveService', () => {
  let service: LearningObjectiveService;
  let mockDb: any;
  let mockQueryBuilder: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockQueryBuilder = {
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      whereNull: jest.fn().mockReturnThis(),
      whereRaw: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(null),
      returning: jest.fn().mockResolvedValue([]),
      orderBy: jest.fn().mockReturnThis(),
      orderByRaw: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      count: jest.fn().mockResolvedValue([{ count: 0 }]),
      clone: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
    };

    mockDb = jest.fn(() => mockQueryBuilder);
    mockDb.fn = { now: jest.fn().mockReturnValue('NOW()') };
    mockDb.raw = jest.fn((sql) => ({ toSQL: () => ({ sql }) }));
    mockDb.transaction = jest.fn(async (callback) => await callback(mockDb));

    (getDatabase as jest.Mock).mockReturnValue(mockDb);

    service = new LearningObjectiveService();
  });

  describe('Objective Management', () => {
    const mockObjectiveRow = {
      id: 'obj-123',
      parent_id: null,
      community_id: 'comm-123',
      code: 'LO-1',
      title: 'Understand basic concepts',
      description: 'Learners will understand basic programming concepts',
      cognitive_level: 'understand',
      objective_type: 'knowledge',
      status: 'active',
      display_order: 0,
      tags: ['programming', 'basics'],
      is_measurable: true,
      assessment_criteria: '[]',
      metadata: '{}',
      created_by: 'user-123',
      created_at: new Date(),
      updated_at: new Date(),
    };

    describe('createObjective', () => {
      it('should create a new objective', async () => {
        mockQueryBuilder.first.mockResolvedValueOnce(null); // No existing with code
        mockQueryBuilder.first.mockResolvedValueOnce(null); // No previous for order
        mockQueryBuilder.returning.mockResolvedValue([mockObjectiveRow]);

        const result = await service.createObjective('user-123', {
          community_id: 'comm-123',
          code: 'LO-1',
          title: 'Understand basic concepts',
          description: 'Learners will understand basic programming concepts',
          cognitive_level: 'understand',
        });

        expect(mockDb).toHaveBeenCalledWith('learning_objectives');
        expect(result.id).toBe('obj-123');
        expect(result.cognitive_level).toBe('understand');
      });

      it('should throw error for duplicate code', async () => {
        mockQueryBuilder.first.mockResolvedValue(mockObjectiveRow);

        await expect(
          service.createObjective('user-123', {
            community_id: 'comm-123',
            code: 'LO-1',
            title: 'Duplicate',
            description: 'Test',
            cognitive_level: 'understand',
          })
        ).rejects.toThrow('already exists');
      });

      it('should set default objective_type to knowledge', async () => {
        mockQueryBuilder.first.mockResolvedValue(null);
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockObjectiveRow,
          objective_type: 'knowledge',
        }]);

        const result = await service.createObjective('user-123', {
          community_id: 'comm-123',
          code: 'LO-2',
          title: 'Test',
          description: 'Test description',
          cognitive_level: 'apply',
        });

        expect(result.objective_type).toBe('knowledge');
      });
    });

    describe('getObjective', () => {
      it('should return objective by ID', async () => {
        mockQueryBuilder.first.mockResolvedValue(mockObjectiveRow);

        const result = await service.getObjective('obj-123');

        expect(result).not.toBeNull();
        expect(result?.id).toBe('obj-123');
      });

      it('should return null for non-existent objective', async () => {
        mockQueryBuilder.first.mockResolvedValue(null);

        const result = await service.getObjective('non-existent');

        expect(result).toBeNull();
      });
    });

    describe('getObjectiveByCode', () => {
      it('should return objective by community and code', async () => {
        mockQueryBuilder.first.mockResolvedValue(mockObjectiveRow);

        const result = await service.getObjectiveByCode('comm-123', 'LO-1');

        expect(result).not.toBeNull();
        expect(result?.code).toBe('LO-1');
      });
    });

    describe('updateObjective', () => {
      it('should update objective title', async () => {
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockObjectiveRow,
          title: 'Updated title',
        }]);

        const result = await service.updateObjective('obj-123', {
          title: 'Updated title',
        });

        expect(result.title).toBe('Updated title');
      });

      it('should update cognitive level', async () => {
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockObjectiveRow,
          cognitive_level: 'apply',
        }]);

        const result = await service.updateObjective('obj-123', {
          cognitive_level: 'apply',
        });

        expect(result.cognitive_level).toBe('apply');
      });

      it('should deprecate objective', async () => {
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockObjectiveRow,
          status: 'deprecated',
        }]);

        const result = await service.updateObjective('obj-123', {
          status: 'deprecated',
        });

        expect(result.status).toBe('deprecated');
      });
    });

    describe('deleteObjective', () => {
      it('should delete objective without children', async () => {
        mockQueryBuilder.count.mockResolvedValue([{ count: '0' }]);
        mockQueryBuilder.delete.mockResolvedValue(1);

        await service.deleteObjective('obj-123');

        expect(mockDb).toHaveBeenCalledWith('learning_objectives');
      });

      it('should throw error for objective with children', async () => {
        mockQueryBuilder.count.mockResolvedValueOnce([{ count: '2' }]);

        await expect(service.deleteObjective('obj-123'))
          .rejects.toThrow('child objectives');
      });

      it('should deprecate instead of delete if in use', async () => {
        mockQueryBuilder.count.mockResolvedValueOnce([{ count: '0' }]); // No children
        mockQueryBuilder.count.mockResolvedValueOnce([{ count: '3' }]); // Has associations
        mockQueryBuilder.update.mockResolvedValue(1);

        await service.deleteObjective('obj-123');

        expect(mockQueryBuilder.update).toHaveBeenCalled();
      });
    });
  });

  describe('Objective Hierarchy', () => {
    describe('getObjectiveTree', () => {
      it('should return hierarchical tree structure', async () => {
        mockQueryBuilder.orderBy.mockResolvedValue([
          {
            id: 'obj-1',
            parent_id: null,
            code: 'LO-1',
            title: 'Root',
            description: 'Root objective',
            cognitive_level: 'understand',
            objective_type: 'knowledge',
            status: 'active',
            display_order: 0,
            tags: [],
            is_measurable: true,
            assessment_criteria: '[]',
            metadata: '{}',
          },
          {
            id: 'obj-2',
            parent_id: 'obj-1',
            code: 'LO-1.1',
            title: 'Child',
            description: 'Child objective',
            cognitive_level: 'apply',
            objective_type: 'skill',
            status: 'active',
            display_order: 0,
            tags: [],
            is_measurable: true,
            assessment_criteria: '[]',
            metadata: '{}',
          },
        ]);

        const result = await service.getObjectiveTree('comm-123');

        expect(result).toHaveLength(1);
        expect(result[0].children).toHaveLength(1);
        expect(result[0].children[0].id).toBe('obj-2');
      });
    });

    describe('getObjectives', () => {
      it('should filter by parent_id', async () => {
        mockQueryBuilder.count.mockResolvedValue([{ count: '2' }]);
        mockQueryBuilder.offset.mockResolvedValue([]);

        await service.getObjectives({
          community_id: 'comm-123',
          parent_id: 'obj-1',
        });

        expect(mockQueryBuilder.where).toHaveBeenCalled();
      });

      it('should return root objectives when parent_id is null', async () => {
        mockQueryBuilder.count.mockResolvedValue([{ count: '1' }]);
        mockQueryBuilder.offset.mockResolvedValue([]);

        await service.getObjectives({
          community_id: 'comm-123',
          parent_id: null,
        });

        expect(mockQueryBuilder.whereNull).toHaveBeenCalled();
      });

      it('should filter by cognitive level', async () => {
        mockQueryBuilder.count.mockResolvedValue([{ count: '1' }]);
        mockQueryBuilder.offset.mockResolvedValue([]);

        await service.getObjectives({
          community_id: 'comm-123',
          cognitive_level: 'apply',
        });

        expect(mockQueryBuilder.where).toHaveBeenCalled();
      });

      it('should search in title and description', async () => {
        mockQueryBuilder.count.mockResolvedValue([{ count: '1' }]);
        mockQueryBuilder.offset.mockResolvedValue([]);

        await service.getObjectives({
          community_id: 'comm-123',
          search: 'programming',
        });

        expect(mockQueryBuilder.whereRaw).toHaveBeenCalled();
      });
    });
  });

  describe('Content-Objective Mapping', () => {
    const mockLinkRow = {
      id: 'link-123',
      lesson_id: 'lesson-123',
      module_id: null,
      course_id: null,
      draft_id: null,
      objective_id: 'obj-123',
      is_primary: true,
      display_order: 0,
      created_by: 'user-123',
      created_at: new Date(),
    };

    describe('linkObjective', () => {
      it('should link objective to lesson', async () => {
        mockQueryBuilder.first.mockResolvedValue(null);
        mockQueryBuilder.returning.mockResolvedValue([mockLinkRow]);

        const result = await service.linkObjective('user-123', {
          objective_id: 'obj-123',
          lesson_id: 'lesson-123',
        });

        expect(mockDb).toHaveBeenCalledWith('content_objectives');
        expect(result.id).toBe('link-123');
      });

      it('should throw error for duplicate link', async () => {
        mockQueryBuilder.first.mockResolvedValue(mockLinkRow);

        await expect(
          service.linkObjective('user-123', {
            objective_id: 'obj-123',
            lesson_id: 'lesson-123',
          })
        ).rejects.toThrow('already linked');
      });

      it('should set is_primary flag', async () => {
        mockQueryBuilder.first.mockResolvedValue(null);
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockLinkRow,
          is_primary: true,
        }]);

        const result = await service.linkObjective('user-123', {
          objective_id: 'obj-123',
          draft_id: 'draft-123',
          is_primary: true,
        });

        expect(result.is_primary).toBe(true);
      });
    });

    describe('unlinkObjective', () => {
      it('should unlink objective', async () => {
        mockQueryBuilder.delete.mockResolvedValue(1);

        await service.unlinkObjective('link-123');

        expect(mockDb).toHaveBeenCalledWith('content_objectives');
      });
    });

    describe('getContentObjectives', () => {
      it('should return objectives linked to lesson', async () => {
        mockQueryBuilder.orderBy.mockResolvedValue([{
          ...mockLinkRow,
          code: 'LO-1',
          title: 'Test Objective',
          description: 'Description',
          cognitive_level: 'understand',
          objective_type: 'knowledge',
          status: 'active',
        }]);

        const result = await service.getContentObjectives('lesson', 'lesson-123');

        expect(result).toHaveLength(1);
        expect(result[0].objective.code).toBe('LO-1');
      });
    });

    describe('getObjectiveContent', () => {
      it('should return content linked to objective', async () => {
        mockQueryBuilder.where.mockResolvedValue([
          { lesson_id: 'lesson-1', module_id: null, course_id: null, draft_id: null },
          { lesson_id: null, module_id: 'module-1', course_id: null, draft_id: null },
        ]);

        const result = await service.getObjectiveContent('obj-123');

        expect(result.lessons).toHaveLength(1);
        expect(result.modules).toHaveLength(1);
      });
    });

    describe('setPrimaryObjective', () => {
      it('should clear existing primary and set new', async () => {
        await service.setPrimaryObjective('lesson', 'lesson-123', 'obj-456');

        expect(mockDb.transaction).toHaveBeenCalled();
      });
    });

    describe('bulkLinkObjectives', () => {
      it('should link multiple objectives', async () => {
        mockQueryBuilder.select.mockResolvedValue([]);
        mockQueryBuilder.returning.mockResolvedValue([]);
        mockQueryBuilder.orderBy.mockResolvedValue([]);

        await service.bulkLinkObjectives(
          'user-123',
          'draft',
          'draft-123',
          ['obj-1', 'obj-2']
        );

        expect(mockDb.transaction).toHaveBeenCalled();
      });

      it('should skip already linked objectives', async () => {
        mockQueryBuilder.select.mockResolvedValue([{ objective_id: 'obj-1' }]);
        mockQueryBuilder.orderBy.mockResolvedValue([]);

        await service.bulkLinkObjectives(
          'user-123',
          'draft',
          'draft-123',
          ['obj-1', 'obj-2']
        );

        expect(mockDb.transaction).toHaveBeenCalled();
      });
    });
  });

  describe("Bloom's Taxonomy Helpers", () => {
    describe('getCognitiveLevelDescription', () => {
      it('should return description for each level', () => {
        expect(service.getCognitiveLevelDescription('remember')).toContain('Recall');
        expect(service.getCognitiveLevelDescription('understand')).toContain('Explain');
        expect(service.getCognitiveLevelDescription('apply')).toContain('Use');
        expect(service.getCognitiveLevelDescription('analyze')).toContain('connections');
        expect(service.getCognitiveLevelDescription('evaluate')).toContain('Justify');
        expect(service.getCognitiveLevelDescription('create')).toContain('Produce');
      });
    });

    describe('getCognitiveLevelVerbs', () => {
      it('should return action verbs for each level', () => {
        expect(service.getCognitiveLevelVerbs('remember')).toContain('define');
        expect(service.getCognitiveLevelVerbs('understand')).toContain('explain');
        expect(service.getCognitiveLevelVerbs('apply')).toContain('demonstrate');
        expect(service.getCognitiveLevelVerbs('analyze')).toContain('analyze');
        expect(service.getCognitiveLevelVerbs('evaluate')).toContain('evaluate');
        expect(service.getCognitiveLevelVerbs('create')).toContain('design');
      });
    });

    describe('suggestCognitiveLevel', () => {
      it('should suggest "remember" for recall verbs', () => {
        const result = service.suggestCognitiveLevel('Define the term photosynthesis');
        expect(result).toBe('remember');
      });

      it('should suggest "understand" for explanation verbs', () => {
        const result = service.suggestCognitiveLevel('Explain how plants grow');
        expect(result).toBe('understand');
      });

      it('should suggest "apply" for application verbs', () => {
        const result = service.suggestCognitiveLevel('Demonstrate the technique');
        expect(result).toBe('apply');
      });

      it('should suggest "analyze" for analysis verbs', () => {
        const result = service.suggestCognitiveLevel('Analyze the data');
        expect(result).toBe('analyze');
      });

      it('should suggest "evaluate" for evaluation verbs', () => {
        const result = service.suggestCognitiveLevel('Evaluate the effectiveness');
        expect(result).toBe('evaluate');
      });

      it('should suggest "create" for creation verbs', () => {
        const result = service.suggestCognitiveLevel('Design a new solution');
        expect(result).toBe('create');
      });

      it('should default to "understand" if no verb found', () => {
        const result = service.suggestCognitiveLevel('Complete the task');
        expect(result).toBe('understand');
      });
    });
  });
});
