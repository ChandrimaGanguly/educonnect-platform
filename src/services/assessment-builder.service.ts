import { Knex } from 'knex';
import { getDatabase } from '../database';

/**
 * Assessment Question Builder Service
 *
 * Provides tools for creating and managing assessment questions:
 * - Multiple question types (MCQ, short answer, etc.)
 * - Question options with partial credit support
 * - Hints, explanations, and feedback
 * - Difficulty levels and scoring rubrics
 */

// ========== Types ==========

export type QuestionType =
  | 'multiple_choice'
  | 'multiple_select'
  | 'true_false'
  | 'short_answer'
  | 'long_answer'
  | 'fill_blank'
  | 'matching'
  | 'ordering'
  | 'code'
  | 'file_upload';

export type QuestionDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type QuestionStatus = 'draft' | 'active' | 'archived';

export interface AssessmentQuestion {
  id: string;
  draft_id?: string;
  lesson_id?: string;
  community_id: string;
  question_type: QuestionType;
  question_text: string;
  question_content: Record<string, any>;
  question_html?: string;
  media_file_id?: string;
  media_embeds: any[];
  points: number;
  partial_credit_allowed: boolean;
  scoring_rubric: Record<string, any>;
  difficulty: QuestionDifficulty;
  estimated_seconds?: number;
  hints: string[];
  explanation?: string;
  correct_feedback?: string;
  incorrect_feedback?: string;
  display_order: number;
  status: QuestionStatus;
  is_required: boolean;
  shuffle_options: boolean;
  objective_ids: string[];
  tags: string[];
  metadata: Record<string, any>;
  accessibility_checked: boolean;
  accessibility_issues: any[];
  created_by: string;
  updated_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface AssessmentOption {
  id: string;
  question_id: string;
  option_text: string;
  option_content: Record<string, any>;
  option_html?: string;
  is_correct: boolean;
  partial_credit?: number;
  display_order: number;
  match_key?: string;
  correct_position?: number;
  feedback?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateQuestionData {
  draft_id?: string;
  lesson_id?: string;
  community_id: string;
  question_type: QuestionType;
  question_text: string;
  question_content?: Record<string, any>;
  points?: number;
  difficulty?: QuestionDifficulty;
  hints?: string[];
  explanation?: string;
  correct_feedback?: string;
  incorrect_feedback?: string;
  tags?: string[];
  objective_ids?: string[];
}

export interface UpdateQuestionData {
  question_type?: QuestionType;
  question_text?: string;
  question_content?: Record<string, any>;
  media_file_id?: string;
  points?: number;
  partial_credit_allowed?: boolean;
  scoring_rubric?: Record<string, any>;
  difficulty?: QuestionDifficulty;
  estimated_seconds?: number;
  hints?: string[];
  explanation?: string;
  correct_feedback?: string;
  incorrect_feedback?: string;
  is_required?: boolean;
  shuffle_options?: boolean;
  tags?: string[];
  objective_ids?: string[];
  status?: QuestionStatus;
}

export interface CreateOptionData {
  option_text: string;
  option_content?: Record<string, any>;
  is_correct: boolean;
  partial_credit?: number;
  display_order: number;
  match_key?: string;
  correct_position?: number;
  feedback?: string;
}

export interface UpdateOptionData {
  option_text?: string;
  option_content?: Record<string, any>;
  is_correct?: boolean;
  partial_credit?: number;
  display_order?: number;
  match_key?: string;
  correct_position?: number;
  feedback?: string;
}

export class AssessmentBuilderService {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  // ========== Question Management ==========

  /**
   * Create a new assessment question
   */
  async createQuestion(userId: string, data: CreateQuestionData): Promise<AssessmentQuestion> {
    // Get next display order
    let query = this.db('assessment_questions').where({ community_id: data.community_id });
    if (data.draft_id) {
      query = query.where({ draft_id: data.draft_id });
    } else if (data.lesson_id) {
      query = query.where({ lesson_id: data.lesson_id });
    }
    const lastQuestion = await query.orderBy('display_order', 'desc').first();
    const displayOrder = lastQuestion ? lastQuestion.display_order + 1 : 0;

    const [question] = await this.db('assessment_questions')
      .insert({
        draft_id: data.draft_id,
        lesson_id: data.lesson_id,
        community_id: data.community_id,
        question_type: data.question_type,
        question_text: data.question_text,
        question_content: JSON.stringify(data.question_content || {}),
        points: data.points || 1,
        difficulty: data.difficulty || 'medium',
        hints: data.hints || [],
        explanation: data.explanation,
        correct_feedback: data.correct_feedback,
        incorrect_feedback: data.incorrect_feedback,
        tags: data.tags || [],
        objective_ids: data.objective_ids || [],
        display_order: displayOrder,
        created_by: userId,
        updated_by: userId,
        status: 'draft',
        media_embeds: JSON.stringify([]),
        scoring_rubric: JSON.stringify({}),
        accessibility_issues: JSON.stringify([]),
        metadata: JSON.stringify({}),
      })
      .returning('*');

    return this.formatQuestion(question);
  }

  /**
   * Get question by ID
   */
  async getQuestion(questionId: string): Promise<AssessmentQuestion | null> {
    const question = await this.db('assessment_questions')
      .where({ id: questionId })
      .first();

    if (!question) return null;
    return this.formatQuestion(question);
  }

  /**
   * Get questions for a draft or lesson
   */
  async getQuestions(
    options: {
      draft_id?: string;
      lesson_id?: string;
      community_id?: string;
      status?: QuestionStatus;
      difficulty?: QuestionDifficulty;
      question_type?: QuestionType;
      tags?: string[];
      limit?: number;
      offset?: number;
    }
  ): Promise<{ questions: AssessmentQuestion[]; total: number }> {
    const { limit = 50, offset = 0, tags, ...filters } = options;

    let query = this.db('assessment_questions');

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined) {
        query = query.where({ [key]: value });
      }
    }

    if (tags && tags.length > 0) {
      query = query.whereRaw('tags && ARRAY[?]::varchar[]', [tags]);
    }

    const [{ count }] = await query.clone().count('* as count');
    const questions = await query
      .limit(limit)
      .offset(offset)
      .orderBy('display_order', 'asc');

    return {
      questions: questions.map((q: any) => this.formatQuestion(q)),
      total: Number(count),
    };
  }

  /**
   * Update a question
   */
  async updateQuestion(
    questionId: string,
    userId: string,
    data: UpdateQuestionData
  ): Promise<AssessmentQuestion> {
    const updateData: Record<string, any> = { updated_by: userId };

    if (data.question_type !== undefined) updateData.question_type = data.question_type;
    if (data.question_text !== undefined) updateData.question_text = data.question_text;
    if (data.question_content !== undefined) {
      updateData.question_content = JSON.stringify(data.question_content);
    }
    if (data.media_file_id !== undefined) updateData.media_file_id = data.media_file_id;
    if (data.points !== undefined) updateData.points = data.points;
    if (data.partial_credit_allowed !== undefined) {
      updateData.partial_credit_allowed = data.partial_credit_allowed;
    }
    if (data.scoring_rubric !== undefined) {
      updateData.scoring_rubric = JSON.stringify(data.scoring_rubric);
    }
    if (data.difficulty !== undefined) updateData.difficulty = data.difficulty;
    if (data.estimated_seconds !== undefined) updateData.estimated_seconds = data.estimated_seconds;
    if (data.hints !== undefined) updateData.hints = data.hints;
    if (data.explanation !== undefined) updateData.explanation = data.explanation;
    if (data.correct_feedback !== undefined) updateData.correct_feedback = data.correct_feedback;
    if (data.incorrect_feedback !== undefined) updateData.incorrect_feedback = data.incorrect_feedback;
    if (data.is_required !== undefined) updateData.is_required = data.is_required;
    if (data.shuffle_options !== undefined) updateData.shuffle_options = data.shuffle_options;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.objective_ids !== undefined) updateData.objective_ids = data.objective_ids;
    if (data.status !== undefined) updateData.status = data.status;

    const [question] = await this.db('assessment_questions')
      .where({ id: questionId })
      .update(updateData)
      .returning('*');

    return this.formatQuestion(question);
  }

  /**
   * Delete a question
   */
  async deleteQuestion(questionId: string): Promise<void> {
    await this.db('assessment_questions')
      .where({ id: questionId })
      .delete();
  }

  /**
   * Duplicate a question
   */
  async duplicateQuestion(questionId: string, userId: string): Promise<AssessmentQuestion> {
    const original = await this.getQuestion(questionId);
    if (!original) {
      throw new Error('Question not found');
    }

    // Create new question
    const newQuestion = await this.createQuestion(userId, {
      draft_id: original.draft_id,
      lesson_id: original.lesson_id,
      community_id: original.community_id,
      question_type: original.question_type,
      question_text: `${original.question_text} (Copy)`,
      question_content: original.question_content,
      points: original.points,
      difficulty: original.difficulty,
      hints: original.hints,
      explanation: original.explanation,
      correct_feedback: original.correct_feedback,
      incorrect_feedback: original.incorrect_feedback,
      tags: original.tags,
      objective_ids: original.objective_ids,
    });

    // Copy options
    const options = await this.getQuestionOptions(questionId);
    for (const option of options) {
      await this.createOption(newQuestion.id, {
        option_text: option.option_text,
        option_content: option.option_content,
        is_correct: option.is_correct,
        partial_credit: option.partial_credit,
        display_order: option.display_order,
        match_key: option.match_key,
        correct_position: option.correct_position,
        feedback: option.feedback,
      });
    }

    return newQuestion;
  }

  /**
   * Reorder questions
   */
  async reorderQuestions(
    questionOrders: { id: string; display_order: number }[]
  ): Promise<void> {
    await this.db.transaction(async (trx) => {
      for (const item of questionOrders) {
        await trx('assessment_questions')
          .where({ id: item.id })
          .update({ display_order: item.display_order });
      }
    });
  }

  // ========== Option Management ==========

  /**
   * Create an option for a question
   */
  async createOption(questionId: string, data: CreateOptionData): Promise<AssessmentOption> {
    const [option] = await this.db('assessment_options')
      .insert({
        question_id: questionId,
        option_text: data.option_text,
        option_content: JSON.stringify(data.option_content || {}),
        is_correct: data.is_correct,
        partial_credit: data.partial_credit,
        display_order: data.display_order,
        match_key: data.match_key,
        correct_position: data.correct_position,
        feedback: data.feedback,
      })
      .returning('*');

    return this.formatOption(option);
  }

  /**
   * Get options for a question
   */
  async getQuestionOptions(questionId: string): Promise<AssessmentOption[]> {
    const options = await this.db('assessment_options')
      .where({ question_id: questionId })
      .orderBy('display_order', 'asc');

    return options.map((o: any) => this.formatOption(o));
  }

  /**
   * Update an option
   */
  async updateOption(optionId: string, data: UpdateOptionData): Promise<AssessmentOption> {
    const updateData: Record<string, any> = {};

    if (data.option_text !== undefined) updateData.option_text = data.option_text;
    if (data.option_content !== undefined) {
      updateData.option_content = JSON.stringify(data.option_content);
    }
    if (data.is_correct !== undefined) updateData.is_correct = data.is_correct;
    if (data.partial_credit !== undefined) updateData.partial_credit = data.partial_credit;
    if (data.display_order !== undefined) updateData.display_order = data.display_order;
    if (data.match_key !== undefined) updateData.match_key = data.match_key;
    if (data.correct_position !== undefined) updateData.correct_position = data.correct_position;
    if (data.feedback !== undefined) updateData.feedback = data.feedback;

    const [option] = await this.db('assessment_options')
      .where({ id: optionId })
      .update(updateData)
      .returning('*');

    return this.formatOption(option);
  }

  /**
   * Delete an option
   */
  async deleteOption(optionId: string): Promise<void> {
    await this.db('assessment_options')
      .where({ id: optionId })
      .delete();
  }

  /**
   * Bulk create options for a question
   */
  async bulkCreateOptions(
    questionId: string,
    options: CreateOptionData[]
  ): Promise<AssessmentOption[]> {
    const insertData = options.map((opt, index) => ({
      question_id: questionId,
      option_text: opt.option_text,
      option_content: JSON.stringify(opt.option_content || {}),
      is_correct: opt.is_correct,
      partial_credit: opt.partial_credit,
      display_order: opt.display_order ?? index,
      match_key: opt.match_key,
      correct_position: opt.correct_position,
      feedback: opt.feedback,
    }));

    const created = await this.db('assessment_options')
      .insert(insertData)
      .returning('*');

    return created.map((o: any) => this.formatOption(o));
  }

  /**
   * Replace all options for a question
   */
  async replaceOptions(
    questionId: string,
    options: CreateOptionData[]
  ): Promise<AssessmentOption[]> {
    await this.db.transaction(async (trx) => {
      // Delete existing options
      await trx('assessment_options')
        .where({ question_id: questionId })
        .delete();

      // Create new options
      const insertData = options.map((opt, index) => ({
        question_id: questionId,
        option_text: opt.option_text,
        option_content: JSON.stringify(opt.option_content || {}),
        is_correct: opt.is_correct,
        partial_credit: opt.partial_credit,
        display_order: opt.display_order ?? index,
        match_key: opt.match_key,
        correct_position: opt.correct_position,
        feedback: opt.feedback,
      }));

      if (insertData.length > 0) {
        await trx('assessment_options').insert(insertData);
      }
    });

    return this.getQuestionOptions(questionId);
  }

  // ========== Question Templates ==========

  /**
   * Create a true/false question with default options
   */
  async createTrueFalseQuestion(
    userId: string,
    data: Omit<CreateQuestionData, 'question_type'> & { correct_answer: boolean }
  ): Promise<AssessmentQuestion> {
    const question = await this.createQuestion(userId, {
      ...data,
      question_type: 'true_false',
    });

    await this.bulkCreateOptions(question.id, [
      { option_text: 'True', is_correct: data.correct_answer === true, display_order: 0 },
      { option_text: 'False', is_correct: data.correct_answer === false, display_order: 1 },
    ]);

    return question;
  }

  /**
   * Create a multiple choice question with options
   */
  async createMultipleChoiceQuestion(
    userId: string,
    data: Omit<CreateQuestionData, 'question_type'> & {
      options: { text: string; is_correct: boolean; feedback?: string }[];
    }
  ): Promise<AssessmentQuestion> {
    const question = await this.createQuestion(userId, {
      ...data,
      question_type: 'multiple_choice',
    });

    await this.bulkCreateOptions(
      question.id,
      data.options.map((opt, index) => ({
        option_text: opt.text,
        is_correct: opt.is_correct,
        feedback: opt.feedback,
        display_order: index,
      }))
    );

    return question;
  }

  /**
   * Create a fill-in-the-blank question
   */
  async createFillBlankQuestion(
    userId: string,
    data: Omit<CreateQuestionData, 'question_type'> & {
      blanks: { placeholder: string; correct_answers: string[] }[];
    }
  ): Promise<AssessmentQuestion> {
    const questionContent = {
      ...data.question_content,
      blanks: data.blanks,
    };

    const question = await this.createQuestion(userId, {
      ...data,
      question_type: 'fill_blank',
      question_content: questionContent,
    });

    return question;
  }

  /**
   * Create a matching question
   */
  async createMatchingQuestion(
    userId: string,
    data: Omit<CreateQuestionData, 'question_type'> & {
      pairs: { left: string; right: string }[];
    }
  ): Promise<AssessmentQuestion> {
    const question = await this.createQuestion(userId, {
      ...data,
      question_type: 'matching',
    });

    // Create options with match keys
    const optionData: CreateOptionData[] = [];
    data.pairs.forEach((pair, index) => {
      const matchKey = `match_${index}`;
      optionData.push({
        option_text: pair.left,
        match_key: matchKey,
        is_correct: true,
        display_order: index * 2,
      });
      optionData.push({
        option_text: pair.right,
        match_key: matchKey,
        is_correct: true,
        display_order: index * 2 + 1,
      });
    });

    await this.bulkCreateOptions(question.id, optionData);
    return question;
  }

  /**
   * Create an ordering question
   */
  async createOrderingQuestion(
    userId: string,
    data: Omit<CreateQuestionData, 'question_type'> & {
      items: string[];
    }
  ): Promise<AssessmentQuestion> {
    const question = await this.createQuestion(userId, {
      ...data,
      question_type: 'ordering',
    });

    await this.bulkCreateOptions(
      question.id,
      data.items.map((item, index) => ({
        option_text: item,
        is_correct: true,
        correct_position: index,
        display_order: index,
      }))
    );

    return question;
  }

  // ========== Validation ==========

  /**
   * Validate a question
   */
  async validateQuestion(questionId: string): Promise<{
    valid: boolean;
    errors: { field: string; message: string; severity: 'error' | 'warning' }[];
  }> {
    const question = await this.getQuestion(questionId);
    if (!question) {
      throw new Error('Question not found');
    }

    const errors: { field: string; message: string; severity: 'error' | 'warning' }[] = [];

    // Question text validation
    if (!question.question_text || question.question_text.trim().length === 0) {
      errors.push({ field: 'question_text', message: 'Question text is required', severity: 'error' });
    }

    // Points validation
    if (question.points <= 0) {
      errors.push({ field: 'points', message: 'Points must be greater than 0', severity: 'error' });
    }

    // Options validation for choice-based questions
    const choiceTypes: QuestionType[] = ['multiple_choice', 'multiple_select', 'true_false', 'matching', 'ordering'];
    if (choiceTypes.includes(question.question_type)) {
      const options = await this.getQuestionOptions(questionId);

      if (options.length === 0) {
        errors.push({ field: 'options', message: 'Question must have at least one option', severity: 'error' });
      }

      if (question.question_type === 'multiple_choice' || question.question_type === 'true_false') {
        const correctCount = options.filter(o => o.is_correct).length;
        if (correctCount === 0) {
          errors.push({ field: 'options', message: 'Question must have at least one correct answer', severity: 'error' });
        }
        if (correctCount > 1 && question.question_type === 'multiple_choice') {
          errors.push({ field: 'options', message: 'Multiple choice should have exactly one correct answer. Use multiple select for multiple correct answers.', severity: 'warning' });
        }
      }

      if (question.question_type === 'true_false' && options.length !== 2) {
        errors.push({ field: 'options', message: 'True/False question must have exactly 2 options', severity: 'error' });
      }

      if (question.question_type === 'matching') {
        // Validate matching pairs
        const matchKeys = new Set(options.filter(o => o.match_key).map(o => o.match_key));
        for (const key of matchKeys) {
          const matchingOptions = options.filter(o => o.match_key === key);
          if (matchingOptions.length !== 2) {
            errors.push({ field: 'options', message: `Match pair ${key} must have exactly 2 items`, severity: 'error' });
          }
        }
      }

      if (question.question_type === 'ordering') {
        // Validate ordering positions
        const positions = options.map(o => o.correct_position).filter(p => p !== null && p !== undefined);
        const uniquePositions = new Set(positions);
        if (positions.length !== options.length || uniquePositions.size !== options.length) {
          errors.push({ field: 'options', message: 'Each option must have a unique correct position', severity: 'error' });
        }
      }
    }

    // Fill-in-the-blank validation
    if (question.question_type === 'fill_blank') {
      const blanks = question.question_content?.blanks;
      if (!blanks || !Array.isArray(blanks) || blanks.length === 0) {
        errors.push({ field: 'question_content.blanks', message: 'Fill-in-the-blank question must define blanks', severity: 'error' });
      } else {
        for (let i = 0; i < blanks.length; i++) {
          const blank = blanks[i];
          if (!blank.correct_answers || blank.correct_answers.length === 0) {
            errors.push({ field: `question_content.blanks[${i}]`, message: `Blank ${i + 1} must have at least one correct answer`, severity: 'error' });
          }
        }
      }
    }

    // Update accessibility check status
    const valid = !errors.some(e => e.severity === 'error');
    await this.db('assessment_questions')
      .where({ id: questionId })
      .update({
        accessibility_checked: true,
        accessibility_issues: JSON.stringify(errors),
      });

    return { valid, errors };
  }

  // ========== Utilities ==========

  /**
   * Format question from database row
   */
  private formatQuestion(row: any): AssessmentQuestion {
    return {
      ...row,
      points: Number(row.points),
      question_content: row.question_content
        ? (typeof row.question_content === 'string' ? JSON.parse(row.question_content) : row.question_content)
        : {},
      media_embeds: row.media_embeds
        ? (typeof row.media_embeds === 'string' ? JSON.parse(row.media_embeds) : row.media_embeds)
        : [],
      scoring_rubric: row.scoring_rubric
        ? (typeof row.scoring_rubric === 'string' ? JSON.parse(row.scoring_rubric) : row.scoring_rubric)
        : {},
      accessibility_issues: row.accessibility_issues
        ? (typeof row.accessibility_issues === 'string' ? JSON.parse(row.accessibility_issues) : row.accessibility_issues)
        : [],
      metadata: row.metadata
        ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata)
        : {},
      hints: row.hints || [],
      tags: row.tags || [],
      objective_ids: row.objective_ids || [],
    };
  }

  /**
   * Format option from database row
   */
  private formatOption(row: any): AssessmentOption {
    return {
      ...row,
      partial_credit: row.partial_credit ? Number(row.partial_credit) : undefined,
      option_content: row.option_content
        ? (typeof row.option_content === 'string' ? JSON.parse(row.option_content) : row.option_content)
        : {},
    };
  }
}
