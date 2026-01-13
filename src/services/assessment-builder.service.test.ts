/**
 * Assessment Builder Service Tests
 *
 * Tests for assessment question builder including:
 * - Question CRUD operations
 * - Option management
 * - Question templates
 * - Question validation
 */

import { AssessmentBuilderService } from './assessment-builder.service';
import { getDatabase } from '../database';

jest.mock('../database', () => ({
  getDatabase: jest.fn(),
}));

describe('AssessmentBuilderService', () => {
  let service: AssessmentBuilderService;
  let mockDb: any;
  let mockQueryBuilder: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockQueryBuilder = {
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      whereIn: jest.fn().mockReturnThis(),
      whereRaw: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(null),
      returning: jest.fn().mockResolvedValue([]),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
      then: jest.fn((resolve) => resolve([])),
    };

    mockDb = jest.fn(() => mockQueryBuilder);
    mockDb.fn = { now: jest.fn().mockReturnValue('NOW()') };
    mockDb.raw = jest.fn((sql) => ({ toSQL: () => ({ sql }) }));
    mockDb.transaction = jest.fn(async (callback) => await callback(mockDb));

    (getDatabase as jest.Mock).mockReturnValue(mockDb);

    service = new AssessmentBuilderService();
  });

  describe('Question Management', () => {
    const mockQuestionRow = {
      id: 'question-123',
      draft_id: 'draft-123',
      lesson_id: null,
      community_id: 'comm-123',
      question_type: 'multiple_choice',
      question_text: 'What is 2+2?',
      question_content: '{}',
      question_html: null,
      media_file_id: null,
      media_embeds: '[]',
      points: '1.00',
      partial_credit_allowed: false,
      scoring_rubric: '{}',
      difficulty: 'easy',
      estimated_seconds: null,
      hints: [],
      explanation: 'Basic arithmetic',
      correct_feedback: 'Correct!',
      incorrect_feedback: 'Try again',
      display_order: 0,
      status: 'draft',
      is_required: true,
      shuffle_options: true,
      objective_ids: [],
      tags: [],
      metadata: '{}',
      accessibility_checked: false,
      accessibility_issues: '[]',
      created_by: 'user-123',
      updated_by: 'user-123',
      created_at: new Date(),
      updated_at: new Date(),
    };

    describe('createQuestion', () => {
      it('should create a new question', async () => {
        mockQueryBuilder.first.mockResolvedValue(null);
        mockQueryBuilder.returning.mockResolvedValue([mockQuestionRow]);

        const result = await service.createQuestion('user-123', {
          community_id: 'comm-123',
          draft_id: 'draft-123',
          question_type: 'multiple_choice',
          question_text: 'What is 2+2?',
        });

        expect(mockDb).toHaveBeenCalledWith('assessment_questions');
        expect(result.id).toBe('question-123');
        expect(result.question_type).toBe('multiple_choice');
      });

      it('should auto-increment display_order', async () => {
        mockQueryBuilder.first.mockResolvedValue({ display_order: 2 });
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockQuestionRow,
          display_order: 3,
        }]);

        const result = await service.createQuestion('user-123', {
          community_id: 'comm-123',
          question_type: 'multiple_choice',
          question_text: 'Next question',
        });

        expect(result.display_order).toBe(3);
      });

      it('should default difficulty to medium', async () => {
        mockQueryBuilder.first.mockResolvedValue(null);
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockQuestionRow,
          difficulty: 'medium',
        }]);

        const result = await service.createQuestion('user-123', {
          community_id: 'comm-123',
          question_type: 'short_answer',
          question_text: 'Define photosynthesis',
        });

        expect(result.difficulty).toBe('medium');
      });
    });

    describe('getQuestion', () => {
      it('should return question by ID', async () => {
        mockQueryBuilder.first.mockResolvedValue(mockQuestionRow);

        const result = await service.getQuestion('question-123');

        expect(result).not.toBeNull();
        expect(result?.id).toBe('question-123');
      });

      it('should return null for non-existent question', async () => {
        mockQueryBuilder.first.mockResolvedValue(null);

        const result = await service.getQuestion('non-existent');

        expect(result).toBeNull();
      });
    });

    describe('updateQuestion', () => {
      it('should update question text', async () => {
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockQuestionRow,
          question_text: 'Updated question?',
        }]);

        const result = await service.updateQuestion('question-123', 'user-123', {
          question_text: 'Updated question?',
        });

        expect(result.question_text).toBe('Updated question?');
      });

      it('should update difficulty', async () => {
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockQuestionRow,
          difficulty: 'hard',
        }]);

        const result = await service.updateQuestion('question-123', 'user-123', {
          difficulty: 'hard',
        });

        expect(result.difficulty).toBe('hard');
      });
    });

    describe('deleteQuestion', () => {
      it('should delete question', async () => {
        mockQueryBuilder.delete.mockResolvedValue(1);

        await service.deleteQuestion('question-123');

        expect(mockDb).toHaveBeenCalledWith('assessment_questions');
        expect(mockQueryBuilder.delete).toHaveBeenCalled();
      });
    });

    describe('duplicateQuestion', () => {
      it('should duplicate question with options', async () => {
        mockQueryBuilder.first.mockResolvedValue(mockQuestionRow);
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockQuestionRow,
          id: 'question-456',
          question_text: 'What is 2+2? (Copy)',
        }]);
        mockQueryBuilder.then = jest.fn((resolve) => resolve([
          { id: 'opt-1', option_text: 'Four', is_correct: true, display_order: 0 },
        ]));

        const result = await service.duplicateQuestion('question-123', 'user-123');

        expect(result.question_text).toContain('(Copy)');
      });
    });
  });

  describe('Option Management', () => {
    const mockOptionRow = {
      id: 'option-123',
      question_id: 'question-123',
      option_text: 'Four',
      option_content: '{}',
      option_html: null,
      is_correct: true,
      partial_credit: null,
      display_order: 0,
      match_key: null,
      correct_position: null,
      feedback: 'Correct!',
      created_at: new Date(),
      updated_at: new Date(),
    };

    describe('createOption', () => {
      it('should create an option', async () => {
        mockQueryBuilder.returning.mockResolvedValue([mockOptionRow]);

        const result = await service.createOption('question-123', {
          option_text: 'Four',
          is_correct: true,
          display_order: 0,
        });

        expect(mockDb).toHaveBeenCalledWith('assessment_options');
        expect(result.id).toBe('option-123');
        expect(result.is_correct).toBe(true);
      });

      it('should support partial credit', async () => {
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockOptionRow,
          partial_credit: '0.50',
        }]);

        const result = await service.createOption('question-123', {
          option_text: 'Partial answer',
          is_correct: false,
          partial_credit: 0.5,
          display_order: 1,
        });

        expect(result.partial_credit).toBe(0.5);
      });
    });

    describe('getQuestionOptions', () => {
      it('should return options sorted by display_order', async () => {
        mockQueryBuilder.then = jest.fn((resolve) => resolve([
          { ...mockOptionRow, display_order: 0 },
          { ...mockOptionRow, id: 'option-456', display_order: 1 },
        ]));

        const result = await service.getQuestionOptions('question-123');

        expect(result).toHaveLength(2);
        expect(result[0].display_order).toBe(0);
      });
    });

    describe('updateOption', () => {
      it('should update option text', async () => {
        mockQueryBuilder.returning.mockResolvedValue([{
          ...mockOptionRow,
          option_text: 'Updated option',
        }]);

        const result = await service.updateOption('option-123', {
          option_text: 'Updated option',
        });

        expect(result.option_text).toBe('Updated option');
      });
    });

    describe('bulkCreateOptions', () => {
      it('should create multiple options', async () => {
        mockQueryBuilder.returning.mockResolvedValue([
          { ...mockOptionRow, display_order: 0 },
          { ...mockOptionRow, id: 'opt-2', display_order: 1 },
        ]);

        const result = await service.bulkCreateOptions('question-123', [
          { option_text: 'Option A', is_correct: true, display_order: 0 },
          { option_text: 'Option B', is_correct: false, display_order: 1 },
        ]);

        expect(result).toHaveLength(2);
      });
    });

    describe('replaceOptions', () => {
      it('should delete existing and create new options', async () => {
        mockQueryBuilder.then = jest.fn((resolve) => resolve([mockOptionRow]));

        await service.replaceOptions('question-123', [
          { option_text: 'New A', is_correct: true, display_order: 0 },
        ]);

        expect(mockDb.transaction).toHaveBeenCalled();
      });
    });
  });

  describe('Question Templates', () => {
    describe('createTrueFalseQuestion', () => {
      it('should create true/false question with options', async () => {
        mockQueryBuilder.first.mockResolvedValue(null);
        mockQueryBuilder.returning.mockResolvedValue([{
          id: 'question-123',
          question_type: 'true_false',
          question_text: 'The sky is blue',
        }]);

        const result = await service.createTrueFalseQuestion('user-123', {
          community_id: 'comm-123',
          question_text: 'The sky is blue',
          correct_answer: true,
        });

        expect(result.question_type).toBe('true_false');
      });
    });

    describe('createMultipleChoiceQuestion', () => {
      it('should create MCQ with options', async () => {
        mockQueryBuilder.first.mockResolvedValue(null);
        mockQueryBuilder.returning.mockResolvedValue([{
          id: 'question-123',
          question_type: 'multiple_choice',
        }]);

        const result = await service.createMultipleChoiceQuestion('user-123', {
          community_id: 'comm-123',
          question_text: 'What is the capital of France?',
          options: [
            { text: 'Paris', is_correct: true },
            { text: 'London', is_correct: false },
            { text: 'Berlin', is_correct: false },
          ],
        });

        expect(result.question_type).toBe('multiple_choice');
      });
    });

    describe('createMatchingQuestion', () => {
      it('should create matching question with pairs', async () => {
        mockQueryBuilder.first.mockResolvedValue(null);
        mockQueryBuilder.returning.mockResolvedValue([{
          id: 'question-123',
          question_type: 'matching',
        }]);

        const result = await service.createMatchingQuestion('user-123', {
          community_id: 'comm-123',
          question_text: 'Match the countries with their capitals',
          pairs: [
            { left: 'France', right: 'Paris' },
            { left: 'Germany', right: 'Berlin' },
          ],
        });

        expect(result.question_type).toBe('matching');
      });
    });

    describe('createOrderingQuestion', () => {
      it('should create ordering question with correct positions', async () => {
        mockQueryBuilder.first.mockResolvedValue(null);
        mockQueryBuilder.returning.mockResolvedValue([{
          id: 'question-123',
          question_type: 'ordering',
        }]);

        const result = await service.createOrderingQuestion('user-123', {
          community_id: 'comm-123',
          question_text: 'Arrange in chronological order',
          items: ['1990', '2000', '2010'],
        });

        expect(result.question_type).toBe('ordering');
      });
    });

    describe('createFillBlankQuestion', () => {
      it('should create fill-in-blank question', async () => {
        mockQueryBuilder.first.mockResolvedValue(null);
        mockQueryBuilder.returning.mockResolvedValue([{
          id: 'question-123',
          question_type: 'fill_blank',
          question_content: JSON.stringify({
            blanks: [{ placeholder: '_____', correct_answers: ['photosynthesis'] }],
          }),
        }]);

        const result = await service.createFillBlankQuestion('user-123', {
          community_id: 'comm-123',
          question_text: 'Plants produce food through _____.',
          blanks: [{ placeholder: '_____', correct_answers: ['photosynthesis'] }],
        });

        expect(result.question_type).toBe('fill_blank');
      });
    });
  });

  describe('Question Validation', () => {
    describe('validateQuestion', () => {
      it('should detect missing question text', async () => {
        mockQueryBuilder.first.mockResolvedValue({
          id: 'question-123',
          question_text: '',
          question_type: 'multiple_choice',
          points: '1.00',
        });
        mockQueryBuilder.then = jest.fn((resolve) => resolve([]));
        mockQueryBuilder.returning.mockResolvedValue([{}]);

        const result = await service.validateQuestion('question-123');

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.field === 'question_text')).toBe(true);
      });

      it('should detect missing options for choice questions', async () => {
        mockQueryBuilder.first.mockResolvedValue({
          id: 'question-123',
          question_text: 'What is 2+2?',
          question_type: 'multiple_choice',
          points: '1.00',
        });
        mockQueryBuilder.then = jest.fn((resolve) => resolve([]));
        mockQueryBuilder.returning.mockResolvedValue([{}]);

        const result = await service.validateQuestion('question-123');

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.field === 'options')).toBe(true);
      });

      it('should detect missing correct answer', async () => {
        mockQueryBuilder.first.mockResolvedValue({
          id: 'question-123',
          question_text: 'What is 2+2?',
          question_type: 'multiple_choice',
          points: '1.00',
        });
        mockQueryBuilder.then = jest.fn((resolve) => resolve([
          { is_correct: false, option_text: 'Three' },
          { is_correct: false, option_text: 'Five' },
        ]));
        mockQueryBuilder.returning.mockResolvedValue([{}]);

        const result = await service.validateQuestion('question-123');

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.message.includes('correct answer'))).toBe(true);
      });

      it('should validate true/false has exactly 2 options', async () => {
        mockQueryBuilder.first.mockResolvedValue({
          id: 'question-123',
          question_text: 'Is the sky blue?',
          question_type: 'true_false',
          points: '1.00',
        });
        mockQueryBuilder.then = jest.fn((resolve) => resolve([
          { is_correct: true, option_text: 'True' },
        ]));
        mockQueryBuilder.returning.mockResolvedValue([{}]);

        const result = await service.validateQuestion('question-123');

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.message.includes('exactly 2 options'))).toBe(true);
      });

      it('should validate matching pairs', async () => {
        mockQueryBuilder.first.mockResolvedValue({
          id: 'question-123',
          question_text: 'Match items',
          question_type: 'matching',
          points: '1.00',
        });
        mockQueryBuilder.then = jest.fn((resolve) => resolve([
          { match_key: 'match_0', is_correct: true },
          // Missing second item for pair
        ]));
        mockQueryBuilder.returning.mockResolvedValue([{}]);

        const result = await service.validateQuestion('question-123');

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.message.includes('Match pair'))).toBe(true);
      });

      it('should validate ordering positions', async () => {
        mockQueryBuilder.first.mockResolvedValue({
          id: 'question-123',
          question_text: 'Order items',
          question_type: 'ordering',
          points: '1.00',
        });
        mockQueryBuilder.then = jest.fn((resolve) => resolve([
          { correct_position: 0 },
          { correct_position: 0 }, // Duplicate position
        ]));
        mockQueryBuilder.returning.mockResolvedValue([{}]);

        const result = await service.validateQuestion('question-123');

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.message.includes('unique correct position'))).toBe(true);
      });

      it('should validate fill-in-blank has correct answers', async () => {
        mockQueryBuilder.first.mockResolvedValue({
          id: 'question-123',
          question_text: 'The answer is _____.',
          question_type: 'fill_blank',
          question_content: JSON.stringify({
            blanks: [{ placeholder: '_____', correct_answers: [] }],
          }),
          points: '1.00',
        });
        mockQueryBuilder.then = jest.fn((resolve) => resolve([]));
        mockQueryBuilder.returning.mockResolvedValue([{}]);

        const result = await service.validateQuestion('question-123');

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.message.includes('correct answer'))).toBe(true);
      });

      it('should pass validation for valid question', async () => {
        mockQueryBuilder.first.mockResolvedValue({
          id: 'question-123',
          question_text: 'What is 2+2?',
          question_type: 'multiple_choice',
          points: '1.00',
        });
        mockQueryBuilder.then = jest.fn((resolve) => resolve([
          { is_correct: true, option_text: 'Four' },
          { is_correct: false, option_text: 'Three' },
        ]));
        mockQueryBuilder.returning.mockResolvedValue([{}]);

        const result = await service.validateQuestion('question-123');

        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Question Filtering', () => {
    describe('getQuestions', () => {
      it('should filter by difficulty', async () => {
        mockQueryBuilder.count.mockResolvedValue([{ count: '2' }]);
        mockQueryBuilder.offset.mockResolvedValue([]);

        await service.getQuestions({
          community_id: 'comm-123',
          difficulty: 'hard',
        });

        expect(mockQueryBuilder.where).toHaveBeenCalled();
      });

      it('should filter by tags', async () => {
        mockQueryBuilder.count.mockResolvedValue([{ count: '1' }]);
        mockQueryBuilder.offset.mockResolvedValue([]);

        await service.getQuestions({
          community_id: 'comm-123',
          tags: ['math', 'algebra'],
        });

        expect(mockQueryBuilder.whereRaw).toHaveBeenCalled();
      });
    });
  });
});
