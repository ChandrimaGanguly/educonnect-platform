import { Knex } from 'knex';
import { getDatabase } from '../database';
import {
  CheckpointResponse,
  ResponseStatus,
  SubmitResponseDto,
  CheckpointSession,
} from '../types/checkpoint.types';
import { CheckpointTypesService } from './checkpoint-types.service';
import { CheckpointSessionService } from './checkpoint-session.service';

/**
 * Checkpoint Execution Service
 *
 * Handles question delivery and response submission for checkpoint sessions:
 * - Question delivery with shuffling
 * - Response validation and submission
 * - Question flagging and skipping
 * - Completeness checking
 * - Offline sync support
 *
 * Implements requirements from Phase 1 Group E (E4, E5):
 * - Question delivery
 * - Response submission and validation
 * - Answer tracking
 */
export class CheckpointExecutionService {
  private db: Knex;
  private checkpointTypesService: CheckpointTypesService;
  private sessionService: CheckpointSessionService;

  constructor(db?: Knex) {
    this.db = db || getDatabase();
    this.checkpointTypesService = new CheckpointTypesService();
    this.sessionService = new CheckpointSessionService(this.db);
  }

  // ========== Question Delivery ==========

  /**
   * Get questions for a checkpoint session
   * Returns questions with shuffling and accessibility accommodations applied
   */
  async getSessionQuestions(
    sessionId: string,
    userId: string
  ): Promise<{
    session_id: string;
    questions: Array<{
      question_id: string;
      question_order: number;
      question_data: any;
      format_type: string;
      points: number;
      is_required: boolean;
      response_status?: ResponseStatus;
      user_response?: any;
    }>;
    show_correct_answers: boolean;
    shuffle_options: boolean;
  }> {
    // Get session
    const session = await this.sessionService.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.user_id !== userId) {
      throw new Error('Unauthorized: Session does not belong to user');
    }

    // Get checkpoint
    const checkpoint = await this.checkpointTypesService.getCheckpoint(
      session.checkpoint_id
    );
    if (!checkpoint) {
      throw new Error('Checkpoint not found');
    }

    // Get checkpoint questions
    const checkpointQuestions = await this.checkpointTypesService.getCheckpointQuestions(
      session.checkpoint_id
    );

    // Shuffle questions if required
    let orderedQuestions = [...checkpointQuestions];
    if (checkpoint.shuffle_questions) {
      orderedQuestions = this.shuffleArray(orderedQuestions, sessionId);
    } else {
      orderedQuestions.sort((a, b) => a.display_order - b.display_order);
    }

    // Get user's existing responses
    const existingResponses = await this.db('checkpoint_responses')
      .where({ session_id: sessionId })
      .select('*');

    const responsesByQuestionId = new Map(
      existingResponses.map((r: any) => [r.question_id, r])
    );

    // === OPTIMIZED: Batch fetch all data to avoid N+1 queries ===

    // 1. Fetch all questions in one query
    const questionIds = orderedQuestions.map(cq => cq.question_id);
    const allQuestions = await this.db('assessment_questions')
      .whereIn('id', questionIds)
      .select('*');
    const questionsById = new Map(allQuestions.map((q: any) => [q.id, q]));

    // 2. Fetch all format types in one query
    const formatTypeIds = [...new Set(orderedQuestions.map(cq => cq.format_type_id))];
    const allFormatTypes = await this.db('checkpoint_format_types')
      .whereIn('id', formatTypeIds)
      .select('*');
    const formatTypesById = new Map(allFormatTypes.map((ft: any) => [ft.id, ft]));

    // 3. Fetch all options in one query
    const allOptions = await this.db('assessment_options')
      .whereIn('question_id', questionIds)
      .orderBy(['question_id', 'display_order'], ['asc', 'asc'])
      .select('*');

    // Group options by question_id
    const optionsByQuestionId = new Map<string, any[]>();
    allOptions.forEach((opt: any) => {
      if (!optionsByQuestionId.has(opt.question_id)) {
        optionsByQuestionId.set(opt.question_id, []);
      }
      optionsByQuestionId.get(opt.question_id)!.push(opt);
    });

    // === Now map synchronously (no more async in loop) ===
    const questions = orderedQuestions.map((cq, index) => {
      const questionData = questionsById.get(cq.question_id);

      if (!questionData) {
        return null;
      }

      // Get format type from pre-loaded map
      const formatType = formatTypesById.get(cq.format_type_id);

      // Get options from pre-loaded map
      let options = optionsByQuestionId.get(cq.question_id) || [];

      // Shuffle options if required
      if (
        checkpoint.shuffle_options &&
        options.length > 0 &&
        !['matching', 'ordering'].includes(questionData.question_type)
      ) {
        options = this.shuffleArray(options, `${sessionId}-${cq.question_id}`);
      }

      const existingResponse = responsesByQuestionId.get(cq.question_id);

      return {
        question_id: cq.question_id,
        question_order: index,
        question_data: {
          question_text: questionData.question_text,
          question_type: questionData.question_type,
          question_content: typeof questionData.question_content === 'string'
            ? JSON.parse(questionData.question_content)
            : questionData.question_content,
          difficulty: questionData.difficulty,
          options: options.map((o: any) => ({
            id: o.id,
            option_text: o.option_text,
            option_content: typeof o.option_content === 'string'
              ? JSON.parse(o.option_content)
              : o.option_content,
            display_order: o.display_order,
            // Don't include is_correct or correct_position until after submission
          })),
        },
        format_type: formatType?.code || questionData.question_type,
        points: cq.points_override || questionData.points,
        is_required: cq.is_required,
        response_status: existingResponse?.status || 'not_viewed',
        user_response: existingResponse ? {
          response_data: typeof existingResponse.response_data === 'string'
            ? JSON.parse(existingResponse.response_data)
            : existingResponse.response_data,
          text_response: existingResponse.text_response,
          selected_options: existingResponse.selected_options,
          matching_pairs: typeof existingResponse.matching_pairs === 'string'
            ? JSON.parse(existingResponse.matching_pairs)
            : existingResponse.matching_pairs,
          ordering: existingResponse.ordering,
          time_spent_seconds: existingResponse.time_spent_seconds,
          flagged_for_review: existingResponse.flagged_for_review,
        } : undefined,
      };
    });

    return {
      session_id: sessionId,
      questions: questions.filter(q => q !== null) as any,
      show_correct_answers: checkpoint.show_correct_answers,
      shuffle_options: checkpoint.shuffle_options,
    };
  }

  /**
   * Get a specific question for a session
   */
  async getQuestion(
    sessionId: string,
    questionId: string,
    userId: string
  ): Promise<{
    question_id: string;
    question_order: number;
    question_data: any;
    format_type: string;
    points: number;
    is_required: boolean;
    response_status?: ResponseStatus;
    user_response?: any;
  } | null> {
    const questions = await this.getSessionQuestions(sessionId, userId);
    const question = questions.questions.find(q => q.question_id === questionId);
    return question || null;
  }

  /**
   * Mark question as viewed
   */
  async markQuestionViewed(
    sessionId: string,
    questionId: string,
    userId: string
  ): Promise<void> {
    const session = await this.sessionService.getSession(sessionId);
    if (!session || session.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    // Check if response exists
    const existingResponse = await this.db('checkpoint_responses')
      .where({ session_id: sessionId, question_id: questionId })
      .first();

    if (existingResponse) {
      // Update status to viewed if not already
      if (existingResponse.status === 'not_viewed') {
        await this.db('checkpoint_responses')
          .where({ id: existingResponse.id })
          .update({
            status: 'viewed',
            first_viewed_at: new Date(),
            updated_at: new Date(),
          });
      }
    } else {
      // Create new response record
      const questionData = await this.db('checkpoint_questions')
        .where({ checkpoint_id: session.checkpoint_id, question_id: questionId })
        .first();

      if (!questionData) {
        throw new Error('Question not found in checkpoint');
      }

      await this.db('checkpoint_responses').insert({
        session_id: sessionId,
        question_id: questionId,
        question_order: questionData.display_order,
        response_data: {},
        selected_options: [],
        status: 'viewed',
        flagged_for_review: false,
        first_viewed_at: new Date(),
        time_spent_seconds: 0,
        points_possible: questionData.weight,
        synced: true,
      });
    }

    // Record event
    await this.sessionService.recordEvent({
      session_id: sessionId,
      event_type: 'question_view',
      question_id: questionId,
      event_data: {
        viewed_at: new Date().toISOString(),
      },
    });
  }

  // ========== Response Submission ==========

  /**
   * Submit a response for a question
   */
  async submitResponse(data: SubmitResponseDto, userId: string): Promise<CheckpointResponse> {
    // Validate session
    const session = await this.sessionService.getSession(data.session_id);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    if (session.status !== 'in_progress') {
      throw new Error('Cannot submit responses for sessions not in progress');
    }

    // Validate question belongs to checkpoint
    const questionData = await this.db('checkpoint_questions')
      .where({
        checkpoint_id: session.checkpoint_id,
        question_id: data.question_id,
      })
      .first();

    if (!questionData) {
      throw new Error('Question not found in checkpoint');
    }

    // Validate response structure
    await this.validateResponse(data);

    const now = new Date();

    // Use upsert pattern to handle race conditions atomically
    // This eliminates the check-then-act race condition
    const [response] = await this.db('checkpoint_responses')
      .insert({
        session_id: data.session_id,
        question_id: data.question_id,
        question_order: questionData.display_order,
        response_data: data.response_data || {},
        text_response: data.text_response,
        selected_options: data.selected_options || [],
        matching_pairs: data.matching_pairs || {},
        ordering: data.ordering || [],
        file_submission_id: data.file_submission_id,
        audio_response_url: data.audio_response_url,
        status: 'answered' as ResponseStatus,
        flagged_for_review: data.flagged_for_review || false,
        answered_at: now,
        first_viewed_at: now,
        time_spent_seconds: data.time_spent_seconds || 0,
        offline_answered_at: data.offline_timestamp ? new Date(data.offline_timestamp) : undefined,
        synced: !data.offline_timestamp,
        points_possible: questionData.weight,
        updated_at: now,
      })
      .onConflict(['session_id', 'question_id'])
      .merge({
        // On conflict, update these fields
        response_data: data.response_data || {},
        text_response: data.text_response,
        selected_options: data.selected_options || [],
        matching_pairs: data.matching_pairs || {},
        ordering: data.ordering || [],
        file_submission_id: data.file_submission_id,
        audio_response_url: data.audio_response_url,
        status: 'answered' as ResponseStatus,
        flagged_for_review: data.flagged_for_review || false,
        answered_at: now,
        time_spent_seconds: data.time_spent_seconds || 0,
        offline_answered_at: data.offline_timestamp ? new Date(data.offline_timestamp) : undefined,
        synced: !data.offline_timestamp,
        updated_at: now,
      })
      .returning('*');

    // Update session progress
    await this.updateSessionProgress(data.session_id);

    // Record event
    await this.sessionService.recordEvent({
      session_id: data.session_id,
      event_type: 'question_answer',
      question_id: data.question_id,
      event_data: {
        answered_at: now.toISOString(),
        time_spent: data.time_spent_seconds,
      },
      client_timestamp: data.offline_timestamp,
    });

    return this.formatResponse(response);
  }

  /**
   * Flag a question for review
   */
  async flagQuestion(
    sessionId: string,
    questionId: string,
    userId: string
  ): Promise<CheckpointResponse> {
    const session = await this.sessionService.getSession(sessionId);
    if (!session || session.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    const existingResponse = await this.db('checkpoint_responses')
      .where({ session_id: sessionId, question_id: questionId })
      .first();

    if (!existingResponse) {
      throw new Error('Response not found');
    }

    const [updated] = await this.db('checkpoint_responses')
      .where({ id: existingResponse.id })
      .update({
        flagged_for_review: true,
        status: 'flagged',
        updated_at: new Date(),
      })
      .returning('*');

    // Record event
    await this.sessionService.recordEvent({
      session_id: sessionId,
      event_type: 'question_flag',
      question_id: questionId,
      event_data: {
        flagged_at: new Date().toISOString(),
      },
    });

    return this.formatResponse(updated);
  }

  /**
   * Unflag a question
   */
  async unflagQuestion(
    sessionId: string,
    questionId: string,
    userId: string
  ): Promise<CheckpointResponse> {
    const session = await this.sessionService.getSession(sessionId);
    if (!session || session.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    const existingResponse = await this.db('checkpoint_responses')
      .where({ session_id: sessionId, question_id: questionId })
      .first();

    if (!existingResponse) {
      throw new Error('Response not found');
    }

    const [updated] = await this.db('checkpoint_responses')
      .where({ id: existingResponse.id })
      .update({
        flagged_for_review: false,
        status: existingResponse.answered_at ? 'answered' : 'viewed',
        updated_at: new Date(),
      })
      .returning('*');

    // Record event
    await this.sessionService.recordEvent({
      session_id: sessionId,
      event_type: 'question_unflag',
      question_id: questionId,
      event_data: {
        unflagged_at: new Date().toISOString(),
      },
    });

    return this.formatResponse(updated);
  }

  /**
   * Skip a question
   */
  async skipQuestion(
    sessionId: string,
    questionId: string,
    userId: string
  ): Promise<CheckpointResponse> {
    const session = await this.sessionService.getSession(sessionId);
    if (!session || session.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    const questionData = await this.db('checkpoint_questions')
      .where({
        checkpoint_id: session.checkpoint_id,
        question_id: questionId,
      })
      .first();

    if (!questionData) {
      throw new Error('Question not found in checkpoint');
    }

    if (questionData.is_required) {
      throw new Error('Cannot skip required questions');
    }

    const existingResponse = await this.db('checkpoint_responses')
      .where({ session_id: sessionId, question_id: questionId })
      .first();

    const now = new Date();
    let response;

    if (existingResponse) {
      [response] = await this.db('checkpoint_responses')
        .where({ id: existingResponse.id })
        .update({
          status: 'skipped',
          updated_at: now,
        })
        .returning('*');
    } else {
      [response] = await this.db('checkpoint_responses')
        .insert({
          session_id: sessionId,
          question_id: questionId,
          question_order: questionData.display_order,
          response_data: {},
          selected_options: [],
          status: 'skipped',
          flagged_for_review: false,
          first_viewed_at: now,
          time_spent_seconds: 0,
          points_possible: questionData.weight,
          synced: true,
        })
        .returning('*');
    }

    // Update session skipped count
    await this.db('checkpoint_sessions')
      .where({ id: sessionId })
      .increment('questions_skipped', 1);

    // Record event
    await this.sessionService.recordEvent({
      session_id: sessionId,
      event_type: 'question_skip',
      question_id: questionId,
      event_data: {
        skipped_at: now.toISOString(),
      },
    });

    return this.formatResponse(response);
  }

  // ========== Response Validation ==========

  /**
   * Validate response structure based on question type
   */
  async validateResponse(data: SubmitResponseDto): Promise<void> {
    const question = await this.db('assessment_questions')
      .where({ id: data.question_id })
      .first();

    if (!question) {
      throw new Error('Question not found');
    }

    const questionType = question.question_type;

    // Validate based on question type
    switch (questionType) {
      case 'multiple_choice':
      case 'true_false':
        if (!data.selected_options || data.selected_options.length !== 1) {
          throw new Error('Single choice questions require exactly one option selected');
        }
        break;

      case 'multiple_select':
        if (!data.selected_options || data.selected_options.length === 0) {
          throw new Error('Multiple select questions require at least one option selected');
        }
        break;

      case 'fill_blank':
        if (!data.response_data || !Array.isArray(data.response_data.answers)) {
          throw new Error('Fill in the blank questions require answers array');
        }
        break;

      case 'matching':
        if (!data.matching_pairs || Object.keys(data.matching_pairs).length === 0) {
          throw new Error('Matching questions require matching pairs');
        }
        break;

      case 'ordering':
        if (!data.ordering || data.ordering.length === 0) {
          throw new Error('Ordering questions require item order');
        }
        break;

      case 'short_answer':
      case 'long_answer':
        if (!data.text_response || data.text_response.trim().length === 0) {
          throw new Error('Text answer required');
        }
        break;

      case 'file_upload':
        if (!data.file_submission_id) {
          throw new Error('File submission required');
        }
        break;

      case 'code':
        if (!data.text_response && !data.file_submission_id) {
          throw new Error('Code submission required');
        }
        break;

      default:
        // Generic validation
        if (!data.response_data && !data.text_response && !data.selected_options) {
          throw new Error('Response data required');
        }
    }
  }

  /**
   * Check if all required questions are answered
   */
  async checkCompleteness(sessionId: string): Promise<{
    is_complete: boolean;
    unanswered_required: string[];
    total_required: number;
    answered_required: number;
  }> {
    const session = await this.sessionService.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Get all required questions
    const requiredQuestions = await this.db('checkpoint_questions')
      .where({
        checkpoint_id: session.checkpoint_id,
        is_required: true,
      })
      .select('question_id');

    const requiredQuestionIds = requiredQuestions.map(q => q.question_id);

    if (requiredQuestionIds.length === 0) {
      return {
        is_complete: true,
        unanswered_required: [],
        total_required: 0,
        answered_required: 0,
      };
    }

    // Get answered required questions
    const answeredResponses = await this.db('checkpoint_responses')
      .where({ session_id: sessionId })
      .whereIn('question_id', requiredQuestionIds)
      .where('status', 'answered')
      .select('question_id');

    const answeredQuestionIds = new Set(answeredResponses.map(r => r.question_id));
    const unansweredRequired = requiredQuestionIds.filter(
      id => !answeredQuestionIds.has(id)
    );

    return {
      is_complete: unansweredRequired.length === 0,
      unanswered_required: unansweredRequired,
      total_required: requiredQuestionIds.length,
      answered_required: answeredQuestionIds.size,
    };
  }

  // ========== Helper Methods ==========

  /**
   * Update session progress counters
   */
  private async updateSessionProgress(sessionId: string): Promise<void> {
    const answeredCount = await this.db('checkpoint_responses')
      .where({ session_id: sessionId })
      .where('status', 'answered')
      .count('* as count')
      .first();

    const skippedCount = await this.db('checkpoint_responses')
      .where({ session_id: sessionId })
      .where('status', 'skipped')
      .count('* as count')
      .first();

    await this.db('checkpoint_sessions')
      .where({ id: sessionId })
      .update({
        questions_answered: Number(answeredCount?.count || 0),
        questions_skipped: Number(skippedCount?.count || 0),
        updated_at: new Date(),
      });
  }

  /**
   * Shuffle array deterministically using session ID as seed
   */
  private shuffleArray<T>(array: T[], seed: string): T[] {
    const shuffled = [...array];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash = hash & hash;
    }

    // Fisher-Yates shuffle with seeded random
    for (let i = shuffled.length - 1; i > 0; i--) {
      hash = (hash * 9301 + 49297) % 233280;
      const j = Math.floor((hash / 233280) * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }

  /**
   * Format response object
   */
  private formatResponse(row: any): CheckpointResponse {
    return {
      ...row,
      response_data:
        typeof row.response_data === 'string'
          ? JSON.parse(row.response_data)
          : row.response_data || {},
      selected_options: row.selected_options || [],
      matching_pairs:
        typeof row.matching_pairs === 'string'
          ? JSON.parse(row.matching_pairs)
          : row.matching_pairs || {},
      ordering: row.ordering || [],
    };
  }
}
