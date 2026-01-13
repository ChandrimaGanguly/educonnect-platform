import { Knex } from 'knex';
import { getDatabase } from '../database';
import {
  AssessmentQuestion,
  AssessmentOption,
  QuestionType,
} from './assessment-builder.service';

/**
 * Automated Scoring Service
 *
 * Implements requirements from openspec/specs/checkpoints/spec.md:
 * - Score immediately upon submission
 * - Apply partial credit where applicable
 * - Generate item-level feedback
 * - Calculate overall score and pass/fail status
 *
 * Non-functional requirements:
 * - Automated scoring SHALL complete within 3 seconds
 */

// ========== Types ==========

export type ScoringMethod =
  | 'exact_match'
  | 'partial_match'
  | 'rubric'
  | 'ai_assisted'
  | 'manual';

export type PassTier = 'fail' | 'pass' | 'merit' | 'distinction';

export type FeedbackType =
  | 'item'
  | 'summary'
  | 'strength'
  | 'improvement'
  | 'recommendation'
  | 'encouragement';

export interface ScoringConfiguration {
  id: string;
  community_id?: string;
  lesson_id?: string;
  draft_id?: string;
  passing_threshold: number;
  merit_threshold?: number;
  distinction_threshold?: number;
  allow_partial_credit: boolean;
  min_partial_credit: number;
  partial_credit_rules: Record<string, any>;
  time_bonus_enabled: boolean;
  time_bonus_percentage?: number;
  time_bonus_threshold_seconds?: number;
  max_attempts?: number;
  retry_cooldown_hours: number;
  retry_score_penalty: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  show_correct_answers: boolean;
  show_explanations: boolean;
  feedback_timing: 'immediate' | 'after_submission' | 'after_review' | 'never';
  integrity_check_enabled: boolean;
  is_active: boolean;
}

export interface CheckpointSubmission {
  id: string;
  session_id: string;
  question_id: string;
  response: any;
  response_text?: string;
  display_order: number;
  time_spent_seconds?: number;
  scoring_status: string;
}

export interface ScoringResult {
  submission_id: string;
  question_id: string;
  points_earned: number;
  points_possible: number;
  score_percentage: number;
  is_correct: boolean;
  is_partial_credit: boolean;
  scoring_method: ScoringMethod;
  scoring_details: ScoringDetails;
  needs_human_review: boolean;
  confidence_score?: number;
}

export interface ScoringDetails {
  matched_option_ids?: string[];
  partial_matches?: PartialMatch[];
  blank_scores?: BlankScore[];
  ordering_score?: OrderingScore;
  matching_score?: MatchingScore;
  code_evaluation?: CodeEvaluation;
  rubric_evaluation?: RubricEvaluation;
}

export interface PartialMatch {
  option_id: string;
  option_text: string;
  is_correct: boolean;
  partial_credit?: number;
}

export interface BlankScore {
  blank_index: number;
  user_answer: string;
  correct_answers: string[];
  is_correct: boolean;
  normalized_match?: string;
}

export interface OrderingScore {
  items: { position: number; correct_position: number; is_correct: boolean }[];
  correct_pairs: number;
  total_pairs: number;
}

export interface MatchingScore {
  pairs: { left_id: string; right_id: string; match_key: string; is_correct: boolean }[];
  correct_matches: number;
  total_matches: number;
}

export interface CodeEvaluation {
  test_cases_passed: number;
  test_cases_total: number;
  compilation_success: boolean;
  runtime_error?: string;
}

export interface RubricEvaluation {
  criteria: { name: string; score: number; max_score: number; feedback: string }[];
}

export interface SessionSummary {
  session_id: string;
  total_points_earned: number;
  total_points_possible: number;
  score_percentage: number;
  passing_threshold: number;
  passed: boolean;
  pass_tier: PassTier;
  questions_answered: number;
  questions_correct: number;
  questions_partial: number;
  questions_incorrect: number;
  questions_skipped: number;
  difficulty_breakdown: Record<string, { correct: number; total: number; percentage: number }>;
  objective_performance: Record<string, { correct: number; total: number; percentage: number }>;
  identified_strengths: string[];
  identified_weaknesses: string[];
  recommended_topics: string[];
}

export interface FeedbackItem {
  session_id: string;
  result_id?: string;
  question_id?: string;
  feedback_type: FeedbackType;
  feedback_text: string;
  feedback_content: Record<string, any>;
  category?: string;
  tags: string[];
  resource_links: { title: string; url: string }[];
  generated_by: 'system' | 'ai' | 'mentor' | 'template';
  display_order: number;
}

export interface ScoreCheckpointOptions {
  session_id: string;
  scoring_config?: Partial<ScoringConfiguration>;
}

// ========== Service ==========

export class AutomatedScoringService {
  private db: Knex;

  constructor(db?: Knex) {
    this.db = db || getDatabase();
  }

  // ========== Main Scoring Methods ==========

  /**
   * Score an entire checkpoint session
   * Implements: Score immediately upon submission
   */
  async scoreCheckpointSession(options: ScoreCheckpointOptions): Promise<{
    results: ScoringResult[];
    summary: SessionSummary;
    feedback: FeedbackItem[];
  }> {
    const { session_id, scoring_config } = options;

    // Get session with submissions
    const session = await this.getSessionWithSubmissions(session_id);
    if (!session) {
      throw new Error('Session not found');
    }

    // Get scoring configuration
    const config = await this.getEffectiveScoringConfig(
      session.community_id,
      session.lesson_id,
      session.draft_id,
      scoring_config
    );

    // Score each submission
    const results: ScoringResult[] = [];
    for (const submission of session.submissions) {
      const question = await this.getQuestionWithOptions(submission.question_id);
      if (!question) continue;

      const result = await this.scoreSubmission(submission, question, config);
      results.push(result);

      // Save result to database
      await this.saveResult(session_id, result);
    }

    // Calculate session summary
    const summary = await this.calculateSessionSummary(session_id, results, config);

    // Save summary
    await this.saveSessionSummary(summary);

    // Generate feedback
    const feedback = await this.generateFeedback(session_id, results, summary, config);

    // Update session status
    await this.updateSessionStatus(session_id, 'scored');

    return { results, summary, feedback };
  }

  /**
   * Score a single submission
   */
  async scoreSubmission(
    submission: CheckpointSubmission,
    question: AssessmentQuestion & { options: AssessmentOption[] },
    config: ScoringConfiguration
  ): Promise<ScoringResult> {
    const points_possible = question.points;

    let scoringResult: {
      points_earned: number;
      is_correct: boolean;
      is_partial_credit: boolean;
      scoring_method: ScoringMethod;
      scoring_details: ScoringDetails;
      needs_human_review: boolean;
      confidence_score?: number;
    };

    // Route to appropriate scoring method based on question type
    switch (question.question_type) {
      case 'multiple_choice':
      case 'true_false':
        scoringResult = this.scoreSingleChoice(submission.response, question, config);
        break;

      case 'multiple_select':
        scoringResult = this.scoreMultipleSelect(submission.response, question, config);
        break;

      case 'fill_blank':
        scoringResult = this.scoreFillBlank(submission.response, question, config);
        break;

      case 'matching':
        scoringResult = this.scoreMatching(submission.response, question, config);
        break;

      case 'ordering':
        scoringResult = this.scoreOrdering(submission.response, question, config);
        break;

      case 'short_answer':
        scoringResult = this.scoreShortAnswer(submission.response, question, config);
        break;

      case 'long_answer':
      case 'file_upload':
      case 'code':
        scoringResult = this.markForManualReview(question);
        break;

      default:
        scoringResult = this.markForManualReview(question);
    }

    const score_percentage =
      points_possible > 0
        ? Number(((scoringResult.points_earned / points_possible) * 100).toFixed(2))
        : 0;

    return {
      submission_id: submission.id,
      question_id: submission.question_id,
      points_earned: scoringResult.points_earned,
      points_possible,
      score_percentage,
      is_correct: scoringResult.is_correct,
      is_partial_credit: scoringResult.is_partial_credit,
      scoring_method: scoringResult.scoring_method,
      scoring_details: scoringResult.scoring_details,
      needs_human_review: scoringResult.needs_human_review,
      confidence_score: scoringResult.confidence_score,
    };
  }

  // ========== Question-Type Specific Scoring ==========

  /**
   * Score single choice questions (multiple_choice, true_false)
   */
  private scoreSingleChoice(
    response: { selected_option_id: string } | null,
    question: AssessmentQuestion & { options: AssessmentOption[] },
    _config: ScoringConfiguration
  ): {
    points_earned: number;
    is_correct: boolean;
    is_partial_credit: boolean;
    scoring_method: ScoringMethod;
    scoring_details: ScoringDetails;
    needs_human_review: boolean;
  } {
    if (!response?.selected_option_id) {
      return {
        points_earned: 0,
        is_correct: false,
        is_partial_credit: false,
        scoring_method: 'exact_match',
        scoring_details: { matched_option_ids: [] },
        needs_human_review: false,
      };
    }

    const selectedOption = question.options.find(
      (opt) => opt.id === response.selected_option_id
    );

    const is_correct = selectedOption?.is_correct ?? false;
    const points_earned = is_correct ? question.points : 0;

    return {
      points_earned,
      is_correct,
      is_partial_credit: false,
      scoring_method: 'exact_match',
      scoring_details: {
        matched_option_ids: [response.selected_option_id],
        partial_matches: [
          {
            option_id: response.selected_option_id,
            option_text: selectedOption?.option_text || '',
            is_correct,
          },
        ],
      },
      needs_human_review: false,
    };
  }

  /**
   * Score multiple select questions with partial credit
   * Implements: Apply partial credit where applicable
   */
  private scoreMultipleSelect(
    response: { selected_option_ids: string[] } | null,
    question: AssessmentQuestion & { options: AssessmentOption[] },
    config: ScoringConfiguration
  ): {
    points_earned: number;
    is_correct: boolean;
    is_partial_credit: boolean;
    scoring_method: ScoringMethod;
    scoring_details: ScoringDetails;
    needs_human_review: boolean;
  } {
    const selectedIds = response?.selected_option_ids || [];
    const correctOptions = question.options.filter((opt) => opt.is_correct);
    const correctIds = correctOptions.map((opt) => opt.id);

    // Count correct selections and incorrect selections
    let correctSelections = 0;
    let incorrectSelections = 0;

    const partialMatches: PartialMatch[] = [];

    for (const selectedId of selectedIds) {
      const option = question.options.find((opt) => opt.id === selectedId);
      if (!option) continue;

      if (option.is_correct) {
        correctSelections++;
        partialMatches.push({
          option_id: selectedId,
          option_text: option.option_text,
          is_correct: true,
          partial_credit: option.partial_credit,
        });
      } else {
        incorrectSelections++;
        partialMatches.push({
          option_id: selectedId,
          option_text: option.option_text,
          is_correct: false,
          partial_credit: option.partial_credit,
        });
      }
    }

    const totalCorrect = correctIds.length;
    const is_correct = correctSelections === totalCorrect && incorrectSelections === 0;

    // Calculate partial credit
    let points_earned = 0;
    if (is_correct) {
      points_earned = question.points;
    } else if (config.allow_partial_credit && question.partial_credit_allowed) {
      // Partial credit formula: (correct - incorrect) / total * points
      // But never go below 0
      const netCorrect = Math.max(0, correctSelections - incorrectSelections);
      const partialRatio = totalCorrect > 0 ? netCorrect / totalCorrect : 0;

      // Apply minimum partial credit threshold
      if (partialRatio >= config.min_partial_credit) {
        points_earned = Number((partialRatio * question.points).toFixed(2));
      }
    }

    const is_partial_credit = points_earned > 0 && points_earned < question.points;

    return {
      points_earned,
      is_correct,
      is_partial_credit,
      scoring_method: is_partial_credit ? 'partial_match' : 'exact_match',
      scoring_details: {
        matched_option_ids: selectedIds,
        partial_matches: partialMatches,
      },
      needs_human_review: false,
    };
  }

  /**
   * Score fill-in-the-blank questions
   */
  private scoreFillBlank(
    response: { answers: string[] } | null,
    question: AssessmentQuestion & { options: AssessmentOption[] },
    config: ScoringConfiguration
  ): {
    points_earned: number;
    is_correct: boolean;
    is_partial_credit: boolean;
    scoring_method: ScoringMethod;
    scoring_details: ScoringDetails;
    needs_human_review: boolean;
  } {
    const blanks = question.question_content?.blanks || [];
    const userAnswers = response?.answers || [];

    if (blanks.length === 0) {
      return {
        points_earned: 0,
        is_correct: false,
        is_partial_credit: false,
        scoring_method: 'exact_match',
        scoring_details: { blank_scores: [] },
        needs_human_review: true,
      };
    }

    const blankScores: BlankScore[] = [];
    let correctBlanks = 0;

    for (let i = 0; i < blanks.length; i++) {
      const blank = blanks[i];
      const userAnswer = userAnswers[i] || '';
      const correctAnswers: string[] = blank.correct_answers || [];

      // Normalize and compare
      const normalizedUserAnswer = this.normalizeAnswer(userAnswer);
      const matchedAnswer = correctAnswers.find(
        (ans) => this.normalizeAnswer(ans) === normalizedUserAnswer
      );

      const is_correct = !!matchedAnswer;
      if (is_correct) {
        correctBlanks++;
      }

      blankScores.push({
        blank_index: i,
        user_answer: userAnswer,
        correct_answers: correctAnswers,
        is_correct,
        normalized_match: matchedAnswer,
      });
    }

    const is_correct = correctBlanks === blanks.length;

    // Calculate partial credit
    let points_earned = 0;
    if (is_correct) {
      points_earned = question.points;
    } else if (config.allow_partial_credit && question.partial_credit_allowed) {
      const partialRatio = blanks.length > 0 ? correctBlanks / blanks.length : 0;
      if (partialRatio >= config.min_partial_credit) {
        points_earned = Number((partialRatio * question.points).toFixed(2));
      }
    }

    const is_partial_credit = points_earned > 0 && points_earned < question.points;

    return {
      points_earned,
      is_correct,
      is_partial_credit,
      scoring_method: is_partial_credit ? 'partial_match' : 'exact_match',
      scoring_details: { blank_scores: blankScores },
      needs_human_review: false,
    };
  }

  /**
   * Score matching questions
   */
  private scoreMatching(
    response: { matches: { left_id: string; right_id: string }[] } | null,
    question: AssessmentQuestion & { options: AssessmentOption[] },
    config: ScoringConfiguration
  ): {
    points_earned: number;
    is_correct: boolean;
    is_partial_credit: boolean;
    scoring_method: ScoringMethod;
    scoring_details: ScoringDetails;
    needs_human_review: boolean;
  } {
    const userMatches = response?.matches || [];

    // Build expected matches from options
    const optionsByKey: Record<string, AssessmentOption[]> = {};
    for (const option of question.options) {
      if (option.match_key) {
        if (!optionsByKey[option.match_key]) {
          optionsByKey[option.match_key] = [];
        }
        optionsByKey[option.match_key].push(option);
      }
    }

    // Create expected pairs (each match_key should have exactly 2 options)
    const expectedPairs: Map<string, { left: string; right: string }> = new Map();
    for (const [matchKey, options] of Object.entries(optionsByKey)) {
      if (options.length === 2) {
        // First option is left, second is right
        expectedPairs.set(matchKey, {
          left: options[0].id,
          right: options[1].id,
        });
      }
    }

    let correctMatches = 0;
    const totalMatches = expectedPairs.size;
    const pairResults: MatchingScore['pairs'] = [];

    for (const userMatch of userMatches) {
      // Find if this is a valid match
      let matchFound = false;
      for (const [matchKey, expected] of expectedPairs.entries()) {
        if (
          (userMatch.left_id === expected.left && userMatch.right_id === expected.right) ||
          (userMatch.left_id === expected.right && userMatch.right_id === expected.left)
        ) {
          correctMatches++;
          matchFound = true;
          pairResults.push({
            left_id: userMatch.left_id,
            right_id: userMatch.right_id,
            match_key: matchKey,
            is_correct: true,
          });
          break;
        }
      }
      if (!matchFound) {
        pairResults.push({
          left_id: userMatch.left_id,
          right_id: userMatch.right_id,
          match_key: '',
          is_correct: false,
        });
      }
    }

    const is_correct = correctMatches === totalMatches;

    // Calculate partial credit
    let points_earned = 0;
    if (is_correct) {
      points_earned = question.points;
    } else if (config.allow_partial_credit && question.partial_credit_allowed) {
      const partialRatio = totalMatches > 0 ? correctMatches / totalMatches : 0;
      if (partialRatio >= config.min_partial_credit) {
        points_earned = Number((partialRatio * question.points).toFixed(2));
      }
    }

    const is_partial_credit = points_earned > 0 && points_earned < question.points;

    return {
      points_earned,
      is_correct,
      is_partial_credit,
      scoring_method: is_partial_credit ? 'partial_match' : 'exact_match',
      scoring_details: {
        matching_score: {
          pairs: pairResults,
          correct_matches: correctMatches,
          total_matches: totalMatches,
        },
      },
      needs_human_review: false,
    };
  }

  /**
   * Score ordering questions
   */
  private scoreOrdering(
    response: { item_order: string[] } | null,
    question: AssessmentQuestion & { options: AssessmentOption[] },
    config: ScoringConfiguration
  ): {
    points_earned: number;
    is_correct: boolean;
    is_partial_credit: boolean;
    scoring_method: ScoringMethod;
    scoring_details: ScoringDetails;
    needs_human_review: boolean;
  } {
    const userOrder = response?.item_order || [];

    // Build correct order map
    const correctPositionMap: Map<string, number> = new Map();
    for (const option of question.options) {
      if (option.correct_position !== null && option.correct_position !== undefined) {
        correctPositionMap.set(option.id, option.correct_position);
      }
    }

    let correctPositions = 0;
    const totalItems = correctPositionMap.size;
    const items: OrderingScore['items'] = [];

    for (let userPosition = 0; userPosition < userOrder.length; userPosition++) {
      const optionId = userOrder[userPosition];
      const correctPosition = correctPositionMap.get(optionId);

      const is_correct = correctPosition === userPosition;
      if (is_correct) {
        correctPositions++;
      }

      items.push({
        position: userPosition,
        correct_position: correctPosition ?? -1,
        is_correct,
      });
    }

    const is_correct = correctPositions === totalItems;

    // Calculate partial credit using adjacent pairs
    let points_earned = 0;
    if (is_correct) {
      points_earned = question.points;
    } else if (config.allow_partial_credit && question.partial_credit_allowed) {
      // Alternative: count correctly ordered adjacent pairs
      let correctPairs = 0;
      for (let i = 0; i < userOrder.length - 1; i++) {
        const currentOptionId = userOrder[i];
        const nextOptionId = userOrder[i + 1];
        const currentCorrectPos = correctPositionMap.get(currentOptionId) ?? -1;
        const nextCorrectPos = correctPositionMap.get(nextOptionId) ?? -1;

        if (currentCorrectPos < nextCorrectPos) {
          correctPairs++;
        }
      }

      const totalPairs = Math.max(0, totalItems - 1);
      const partialRatio = totalPairs > 0 ? correctPairs / totalPairs : 0;

      if (partialRatio >= config.min_partial_credit) {
        points_earned = Number((partialRatio * question.points).toFixed(2));
      }
    }

    const is_partial_credit = points_earned > 0 && points_earned < question.points;

    return {
      points_earned,
      is_correct,
      is_partial_credit,
      scoring_method: is_partial_credit ? 'partial_match' : 'exact_match',
      scoring_details: {
        ordering_score: {
          items,
          correct_pairs: correctPositions,
          total_pairs: totalItems,
        },
      },
      needs_human_review: false,
    };
  }

  /**
   * Score short answer questions using keyword matching
   */
  private scoreShortAnswer(
    response: { answer: string } | null,
    question: AssessmentQuestion & { options: AssessmentOption[] },
    config: ScoringConfiguration
  ): {
    points_earned: number;
    is_correct: boolean;
    is_partial_credit: boolean;
    scoring_method: ScoringMethod;
    scoring_details: ScoringDetails;
    needs_human_review: boolean;
  } {
    const userAnswer = response?.answer || '';
    const normalizedAnswer = this.normalizeAnswer(userAnswer);

    // Check against correct options (expected answers)
    const correctOptions = question.options.filter((opt) => opt.is_correct);

    let is_correct = false;
    let bestMatch: PartialMatch | null = null;

    for (const option of correctOptions) {
      const normalizedCorrect = this.normalizeAnswer(option.option_text);

      if (normalizedAnswer === normalizedCorrect) {
        is_correct = true;
        bestMatch = {
          option_id: option.id,
          option_text: option.option_text,
          is_correct: true,
        };
        break;
      }
    }

    // If no exact match, check for partial credit options
    let points_earned = 0;
    if (is_correct) {
      points_earned = question.points;
    } else if (config.allow_partial_credit) {
      // Check partial credit options
      for (const option of question.options) {
        if (option.partial_credit && option.partial_credit > 0) {
          const normalizedOption = this.normalizeAnswer(option.option_text);
          if (normalizedAnswer.includes(normalizedOption) || normalizedOption.includes(normalizedAnswer)) {
            const partialPoints = option.partial_credit * question.points;
            if (partialPoints > points_earned) {
              points_earned = Number(partialPoints.toFixed(2));
              bestMatch = {
                option_id: option.id,
                option_text: option.option_text,
                is_correct: false,
                partial_credit: option.partial_credit,
              };
            }
          }
        }
      }
    }

    const is_partial_credit = points_earned > 0 && points_earned < question.points;

    // Short answers often need review if no match found
    const needs_human_review = !is_correct && !is_partial_credit && userAnswer.length > 0;

    return {
      points_earned,
      is_correct,
      is_partial_credit,
      scoring_method: needs_human_review ? 'manual' : is_partial_credit ? 'partial_match' : 'exact_match',
      scoring_details: {
        partial_matches: bestMatch ? [bestMatch] : [],
      },
      needs_human_review,
    };
  }

  /**
   * Mark question for manual review
   */
  private markForManualReview(question: AssessmentQuestion): {
    points_earned: number;
    is_correct: boolean;
    is_partial_credit: boolean;
    scoring_method: ScoringMethod;
    scoring_details: ScoringDetails;
    needs_human_review: boolean;
  } {
    return {
      points_earned: 0,
      is_correct: false,
      is_partial_credit: false,
      scoring_method: 'manual',
      scoring_details: {},
      needs_human_review: true,
    };
  }

  // ========== Summary and Feedback ==========

  /**
   * Calculate session summary
   * Implements: Calculate overall score and pass/fail status
   */
  async calculateSessionSummary(
    session_id: string,
    results: ScoringResult[],
    config: ScoringConfiguration
  ): Promise<SessionSummary> {
    // Calculate totals
    let total_points_earned = 0;
    let total_points_possible = 0;
    let questions_correct = 0;
    let questions_partial = 0;
    let questions_incorrect = 0;
    let questions_skipped = 0;

    // Track by difficulty and objective
    const difficultyBreakdown: Record<string, { correct: number; total: number }> = {};
    const objectiveBreakdown: Record<string, { correct: number; total: number }> = {};

    for (const result of results) {
      total_points_earned += result.points_earned;
      total_points_possible += result.points_possible;

      if (result.is_correct) {
        questions_correct++;
      } else if (result.is_partial_credit) {
        questions_partial++;
      } else if (result.needs_human_review) {
        // Don't count as incorrect if pending review
      } else if (result.points_possible > 0) {
        questions_incorrect++;
      }

      // Get question details for breakdown
      const question = await this.getQuestion(result.question_id);
      if (question) {
        // Difficulty breakdown
        const difficulty = question.difficulty;
        if (!difficultyBreakdown[difficulty]) {
          difficultyBreakdown[difficulty] = { correct: 0, total: 0 };
        }
        difficultyBreakdown[difficulty].total++;
        if (result.is_correct) {
          difficultyBreakdown[difficulty].correct++;
        }

        // Objective breakdown
        for (const objectiveId of question.objective_ids || []) {
          if (!objectiveBreakdown[objectiveId]) {
            objectiveBreakdown[objectiveId] = { correct: 0, total: 0 };
          }
          objectiveBreakdown[objectiveId].total++;
          if (result.is_correct) {
            objectiveBreakdown[objectiveId].correct++;
          }
        }
      }
    }

    // Get session to check for skipped questions
    const session = await this.getSession(session_id);
    const totalQuestions = session?.total_questions || results.length;
    questions_skipped = Math.max(0, totalQuestions - results.length);

    // Calculate percentages
    const score_percentage =
      total_points_possible > 0
        ? Number(((total_points_earned / total_points_possible) * 100).toFixed(2))
        : 0;

    // Determine pass tier
    let pass_tier: PassTier = 'fail';
    const passed = score_percentage >= config.passing_threshold;

    if (passed) {
      if (config.distinction_threshold && score_percentage >= config.distinction_threshold) {
        pass_tier = 'distinction';
      } else if (config.merit_threshold && score_percentage >= config.merit_threshold) {
        pass_tier = 'merit';
      } else {
        pass_tier = 'pass';
      }
    }

    // Format breakdowns with percentages
    const difficulty_breakdown: Record<string, { correct: number; total: number; percentage: number }> = {};
    for (const [key, value] of Object.entries(difficultyBreakdown)) {
      difficulty_breakdown[key] = {
        ...value,
        percentage: value.total > 0 ? Number(((value.correct / value.total) * 100).toFixed(2)) : 0,
      };
    }

    const objective_performance: Record<string, { correct: number; total: number; percentage: number }> = {};
    for (const [key, value] of Object.entries(objectiveBreakdown)) {
      objective_performance[key] = {
        ...value,
        percentage: value.total > 0 ? Number(((value.correct / value.total) * 100).toFixed(2)) : 0,
      };
    }

    // Identify strengths and weaknesses
    const identified_strengths: string[] = [];
    const identified_weaknesses: string[] = [];
    const recommended_topics: string[] = [];

    for (const [difficulty, data] of Object.entries(difficulty_breakdown)) {
      if (data.percentage >= 80) {
        identified_strengths.push(`Strong performance on ${difficulty} questions`);
      } else if (data.percentage < 50 && data.total >= 2) {
        identified_weaknesses.push(`Needs improvement on ${difficulty} questions`);
        recommended_topics.push(`Review ${difficulty} level material`);
      }
    }

    return {
      session_id,
      total_points_earned,
      total_points_possible,
      score_percentage,
      passing_threshold: config.passing_threshold,
      passed,
      pass_tier,
      questions_answered: results.length,
      questions_correct,
      questions_partial,
      questions_incorrect,
      questions_skipped,
      difficulty_breakdown,
      objective_performance,
      identified_strengths,
      identified_weaknesses,
      recommended_topics,
    };
  }

  /**
   * Generate feedback for the session
   * Implements: Generate item-level feedback
   */
  async generateFeedback(
    session_id: string,
    results: ScoringResult[],
    summary: SessionSummary,
    config: ScoringConfiguration
  ): Promise<FeedbackItem[]> {
    const feedback: FeedbackItem[] = [];
    let displayOrder = 0;

    if (config.feedback_timing === 'never') {
      return feedback;
    }

    // Generate item-level feedback
    for (const result of results) {
      const question = await this.getQuestionWithOptions(result.question_id);
      if (!question) continue;

      // Get appropriate feedback text
      let feedbackText = '';
      if (result.is_correct) {
        feedbackText = question.correct_feedback || 'Correct! Well done.';
      } else if (result.is_partial_credit) {
        feedbackText = 'Partially correct. ' + (question.explanation || '');
      } else {
        feedbackText = question.incorrect_feedback || 'Incorrect. ';
        if (config.show_explanations && question.explanation) {
          feedbackText += question.explanation;
        }
      }

      feedback.push({
        session_id,
        result_id: result.submission_id,
        question_id: result.question_id,
        feedback_type: 'item',
        feedback_text: feedbackText,
        feedback_content: {
          is_correct: result.is_correct,
          is_partial: result.is_partial_credit,
          points_earned: result.points_earned,
          points_possible: result.points_possible,
          show_correct_answer: config.show_correct_answers,
          correct_options: config.show_correct_answers
            ? question.options.filter((o) => o.is_correct).map((o) => o.option_text)
            : [],
        },
        category: question.difficulty,
        tags: question.tags || [],
        resource_links: [],
        generated_by: 'system',
        display_order: displayOrder++,
      });
    }

    // Generate summary feedback
    feedback.push({
      session_id,
      feedback_type: 'summary',
      feedback_text: this.generateSummaryText(summary),
      feedback_content: {
        score_percentage: summary.score_percentage,
        passed: summary.passed,
        pass_tier: summary.pass_tier,
        questions_correct: summary.questions_correct,
        questions_total: summary.questions_answered,
      },
      tags: [],
      resource_links: [],
      generated_by: 'system',
      display_order: displayOrder++,
    });

    // Generate strength feedback
    for (const strength of summary.identified_strengths) {
      feedback.push({
        session_id,
        feedback_type: 'strength',
        feedback_text: strength,
        feedback_content: {},
        tags: [],
        resource_links: [],
        generated_by: 'system',
        display_order: displayOrder++,
      });
    }

    // Generate improvement feedback
    for (const weakness of summary.identified_weaknesses) {
      feedback.push({
        session_id,
        feedback_type: 'improvement',
        feedback_text: weakness,
        feedback_content: {},
        tags: [],
        resource_links: [],
        generated_by: 'system',
        display_order: displayOrder++,
      });
    }

    // Generate recommendations
    for (const topic of summary.recommended_topics) {
      feedback.push({
        session_id,
        feedback_type: 'recommendation',
        feedback_text: topic,
        feedback_content: {},
        tags: [],
        resource_links: [],
        generated_by: 'system',
        display_order: displayOrder++,
      });
    }

    // Generate encouragement
    feedback.push({
      session_id,
      feedback_type: 'encouragement',
      feedback_text: this.generateEncouragementText(summary),
      feedback_content: {},
      tags: [],
      resource_links: [],
      generated_by: 'system',
      display_order: displayOrder++,
    });

    // Save feedback to database
    for (const item of feedback) {
      await this.saveFeedback(item);
    }

    return feedback;
  }

  // ========== Helper Methods ==========

  /**
   * Normalize answer for comparison
   */
  private normalizeAnswer(answer: string): string {
    return answer
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[.,;:!?'"]/g, '');
  }

  /**
   * Generate summary text
   */
  private generateSummaryText(summary: SessionSummary): string {
    const scoreText = `You scored ${summary.score_percentage}% (${summary.total_points_earned}/${summary.total_points_possible} points).`;

    let resultText = '';
    if (summary.passed) {
      switch (summary.pass_tier) {
        case 'distinction':
          resultText = 'Outstanding! You achieved a distinction.';
          break;
        case 'merit':
          resultText = 'Great work! You achieved a merit.';
          break;
        default:
          resultText = 'Congratulations! You passed.';
      }
    } else {
      resultText = `You need ${summary.passing_threshold}% to pass. Keep practicing!`;
    }

    const breakdownText = `You answered ${summary.questions_correct} questions correctly, ${summary.questions_partial} partially, and ${summary.questions_incorrect} incorrectly.`;

    return `${scoreText} ${resultText} ${breakdownText}`;
  }

  /**
   * Generate encouragement text
   */
  private generateEncouragementText(summary: SessionSummary): string {
    if (summary.pass_tier === 'distinction') {
      return 'Excellent performance! Your hard work is paying off. Keep pushing forward!';
    } else if (summary.pass_tier === 'merit') {
      return 'Great job! You demonstrated solid understanding. Continue building on this foundation!';
    } else if (summary.passed) {
      return 'Well done on passing! Every step forward is progress. Keep learning!';
    } else if (summary.score_percentage >= 50) {
      return "You're making progress! Review the areas for improvement and try again. You're capable of achieving this!";
    } else {
      return "Don't give up! Learning takes time and practice. Review the material and reach out for help if needed. You can do this!";
    }
  }

  // ========== Database Operations ==========

  async getSessionWithSubmissions(sessionId: string): Promise<{
    id: string;
    community_id: string;
    lesson_id?: string;
    draft_id?: string;
    submissions: CheckpointSubmission[];
    total_questions: number;
  } | null> {
    const session = await this.db('checkpoint_sessions')
      .where({ id: sessionId })
      .first();

    if (!session) return null;

    const submissions = await this.db('checkpoint_submissions')
      .where({ session_id: sessionId })
      .orderBy('display_order', 'asc');

    return {
      id: session.id,
      community_id: session.community_id,
      lesson_id: session.lesson_id,
      draft_id: session.draft_id,
      submissions: submissions.map((s: any) => ({
        ...s,
        response: typeof s.response === 'string' ? JSON.parse(s.response) : s.response,
      })),
      total_questions: session.total_questions,
    };
  }

  async getSession(sessionId: string): Promise<any> {
    return this.db('checkpoint_sessions').where({ id: sessionId }).first();
  }

  async getQuestion(questionId: string): Promise<AssessmentQuestion | null> {
    const question = await this.db('assessment_questions')
      .where({ id: questionId })
      .first();

    if (!question) return null;

    return {
      ...question,
      points: Number(question.points),
      question_content:
        typeof question.question_content === 'string'
          ? JSON.parse(question.question_content)
          : question.question_content || {},
      objective_ids: question.objective_ids || [],
      tags: question.tags || [],
    };
  }

  async getQuestionWithOptions(
    questionId: string
  ): Promise<(AssessmentQuestion & { options: AssessmentOption[] }) | null> {
    const question = await this.getQuestion(questionId);
    if (!question) return null;

    const options = await this.db('assessment_options')
      .where({ question_id: questionId })
      .orderBy('display_order', 'asc');

    return {
      ...question,
      options: options.map((o: any) => ({
        ...o,
        partial_credit: o.partial_credit ? Number(o.partial_credit) : undefined,
        option_content:
          typeof o.option_content === 'string'
            ? JSON.parse(o.option_content)
            : o.option_content || {},
      })),
    };
  }

  async getEffectiveScoringConfig(
    communityId: string,
    lessonId?: string,
    draftId?: string,
    overrides?: Partial<ScoringConfiguration>
  ): Promise<ScoringConfiguration> {
    // Try to find specific config
    let config = null;

    if (draftId) {
      config = await this.db('scoring_configurations')
        .where({ draft_id: draftId, is_active: true })
        .first();
    }

    if (!config && lessonId) {
      config = await this.db('scoring_configurations')
        .where({ lesson_id: lessonId, is_active: true })
        .first();
    }

    if (!config) {
      config = await this.db('scoring_configurations')
        .where({ community_id: communityId, is_active: true })
        .whereNull('lesson_id')
        .whereNull('draft_id')
        .first();
    }

    // Default configuration
    const defaultConfig: ScoringConfiguration = {
      id: 'default',
      community_id: communityId,
      passing_threshold: 70,
      merit_threshold: 80,
      distinction_threshold: 90,
      allow_partial_credit: true,
      min_partial_credit: 0.25,
      partial_credit_rules: {},
      time_bonus_enabled: false,
      max_attempts: undefined,
      retry_cooldown_hours: 24,
      retry_score_penalty: 0,
      shuffle_questions: true,
      shuffle_options: true,
      show_correct_answers: true,
      show_explanations: true,
      feedback_timing: 'immediate',
      integrity_check_enabled: false,
      is_active: true,
    };

    // Merge with database config and overrides
    const finalConfig = {
      ...defaultConfig,
      ...(config || {}),
      ...(overrides || {}),
    };

    // Parse JSONB fields if they're strings
    if (typeof finalConfig.partial_credit_rules === 'string') {
      finalConfig.partial_credit_rules = JSON.parse(finalConfig.partial_credit_rules);
    }

    return finalConfig;
  }

  async saveResult(sessionId: string, result: ScoringResult): Promise<void> {
    await this.db('checkpoint_results')
      .insert({
        session_id: sessionId,
        submission_id: result.submission_id,
        question_id: result.question_id,
        points_earned: result.points_earned,
        points_possible: result.points_possible,
        score_percentage: result.score_percentage,
        is_correct: result.is_correct,
        is_partial_credit: result.is_partial_credit,
        scoring_method: result.scoring_method,
        scoring_details: JSON.stringify(result.scoring_details),
        needs_human_review: result.needs_human_review,
        confidence_score: result.confidence_score,
      })
      .onConflict(['session_id', 'question_id'])
      .merge();

    // Update submission status
    await this.db('checkpoint_submissions')
      .where({ id: result.submission_id })
      .update({
        scoring_status: result.needs_human_review ? 'pending_review' : 'auto_scored',
      });
  }

  async saveSessionSummary(summary: SessionSummary): Promise<void> {
    await this.db('checkpoint_session_summary')
      .insert({
        session_id: summary.session_id,
        total_points_earned: summary.total_points_earned,
        total_points_possible: summary.total_points_possible,
        score_percentage: summary.score_percentage,
        passing_threshold: summary.passing_threshold,
        passed: summary.passed,
        pass_tier: summary.pass_tier,
        questions_answered: summary.questions_answered,
        questions_correct: summary.questions_correct,
        questions_partial: summary.questions_partial,
        questions_incorrect: summary.questions_incorrect,
        questions_skipped: summary.questions_skipped,
        difficulty_breakdown: JSON.stringify(summary.difficulty_breakdown),
        objective_performance: JSON.stringify(summary.objective_performance),
        identified_strengths: JSON.stringify(summary.identified_strengths),
        identified_weaknesses: JSON.stringify(summary.identified_weaknesses),
        recommended_topics: JSON.stringify(summary.recommended_topics),
      })
      .onConflict('session_id')
      .merge();
  }

  async saveFeedback(feedback: FeedbackItem): Promise<void> {
    await this.db('checkpoint_feedback').insert({
      session_id: feedback.session_id,
      result_id: feedback.result_id,
      question_id: feedback.question_id,
      feedback_type: feedback.feedback_type,
      feedback_text: feedback.feedback_text,
      feedback_content: JSON.stringify(feedback.feedback_content),
      category: feedback.category,
      tags: feedback.tags,
      resource_links: JSON.stringify(feedback.resource_links),
      generated_by: feedback.generated_by,
      display_order: feedback.display_order,
    });
  }

  async updateSessionStatus(sessionId: string, status: string): Promise<void> {
    const updateData: Record<string, any> = { status };

    if (status === 'scored') {
      updateData.scored_at = new Date();
    }
    if (status === 'completed') {
      updateData.completed_at = new Date();
    }

    await this.db('checkpoint_sessions')
      .where({ id: sessionId })
      .update(updateData);
  }

  // ========== Utility Methods for API ==========

  /**
   * Get results for a session
   */
  async getSessionResults(sessionId: string): Promise<ScoringResult[]> {
    const results = await this.db('checkpoint_results')
      .where({ session_id: sessionId })
      .orderBy('created_at', 'asc');

    return results.map((r: any) => ({
      ...r,
      points_earned: Number(r.points_earned),
      points_possible: Number(r.points_possible),
      score_percentage: Number(r.score_percentage),
      confidence_score: r.confidence_score ? Number(r.confidence_score) : undefined,
      scoring_details:
        typeof r.scoring_details === 'string'
          ? JSON.parse(r.scoring_details)
          : r.scoring_details || {},
    }));
  }

  /**
   * Get summary for a session
   */
  async getSessionSummary(sessionId: string): Promise<SessionSummary | null> {
    const summary = await this.db('checkpoint_session_summary')
      .where({ session_id: sessionId })
      .first();

    if (!summary) return null;

    return {
      ...summary,
      total_points_earned: Number(summary.total_points_earned),
      total_points_possible: Number(summary.total_points_possible),
      score_percentage: Number(summary.score_percentage),
      passing_threshold: Number(summary.passing_threshold),
      difficulty_breakdown:
        typeof summary.difficulty_breakdown === 'string'
          ? JSON.parse(summary.difficulty_breakdown)
          : summary.difficulty_breakdown || {},
      objective_performance:
        typeof summary.objective_performance === 'string'
          ? JSON.parse(summary.objective_performance)
          : summary.objective_performance || {},
      identified_strengths:
        typeof summary.identified_strengths === 'string'
          ? JSON.parse(summary.identified_strengths)
          : summary.identified_strengths || [],
      identified_weaknesses:
        typeof summary.identified_weaknesses === 'string'
          ? JSON.parse(summary.identified_weaknesses)
          : summary.identified_weaknesses || [],
      recommended_topics:
        typeof summary.recommended_topics === 'string'
          ? JSON.parse(summary.recommended_topics)
          : summary.recommended_topics || [],
    };
  }

  /**
   * Get feedback for a session
   */
  async getSessionFeedback(sessionId: string): Promise<FeedbackItem[]> {
    const feedback = await this.db('checkpoint_feedback')
      .where({ session_id: sessionId })
      .orderBy('display_order', 'asc');

    return feedback.map((f: any) => ({
      ...f,
      feedback_content:
        typeof f.feedback_content === 'string'
          ? JSON.parse(f.feedback_content)
          : f.feedback_content || {},
      resource_links:
        typeof f.resource_links === 'string'
          ? JSON.parse(f.resource_links)
          : f.resource_links || [],
      tags: f.tags || [],
    }));
  }

  /**
   * Create or update scoring configuration
   */
  async upsertScoringConfiguration(
    userId: string,
    config: Partial<ScoringConfiguration> & { community_id: string }
  ): Promise<ScoringConfiguration> {
    const existingConfig = await this.db('scoring_configurations')
      .where({
        community_id: config.community_id,
        lesson_id: config.lesson_id || null,
        draft_id: config.draft_id || null,
      })
      .first();

    const configData = {
      community_id: config.community_id,
      lesson_id: config.lesson_id,
      draft_id: config.draft_id,
      passing_threshold: config.passing_threshold ?? 70,
      merit_threshold: config.merit_threshold ?? 80,
      distinction_threshold: config.distinction_threshold ?? 90,
      allow_partial_credit: config.allow_partial_credit ?? true,
      min_partial_credit: config.min_partial_credit ?? 0.25,
      partial_credit_rules: JSON.stringify(config.partial_credit_rules || {}),
      time_bonus_enabled: config.time_bonus_enabled ?? false,
      time_bonus_percentage: config.time_bonus_percentage,
      time_bonus_threshold_seconds: config.time_bonus_threshold_seconds,
      max_attempts: config.max_attempts,
      retry_cooldown_hours: config.retry_cooldown_hours ?? 24,
      retry_score_penalty: config.retry_score_penalty ?? 0,
      shuffle_questions: config.shuffle_questions ?? true,
      shuffle_options: config.shuffle_options ?? true,
      show_correct_answers: config.show_correct_answers ?? true,
      show_explanations: config.show_explanations ?? true,
      feedback_timing: config.feedback_timing ?? 'immediate',
      integrity_check_enabled: config.integrity_check_enabled ?? false,
      is_active: config.is_active ?? true,
      updated_by: userId,
    };

    if (existingConfig) {
      const [updated] = await this.db('scoring_configurations')
        .where({ id: existingConfig.id })
        .update(configData)
        .returning('*');
      return this.formatScoringConfig(updated);
    } else {
      const [created] = await this.db('scoring_configurations')
        .insert({
          ...configData,
          created_by: userId,
        })
        .returning('*');
      return this.formatScoringConfig(created);
    }
  }

  private formatScoringConfig(row: any): ScoringConfiguration {
    return {
      ...row,
      passing_threshold: Number(row.passing_threshold),
      merit_threshold: row.merit_threshold ? Number(row.merit_threshold) : undefined,
      distinction_threshold: row.distinction_threshold ? Number(row.distinction_threshold) : undefined,
      min_partial_credit: Number(row.min_partial_credit),
      partial_credit_rules:
        typeof row.partial_credit_rules === 'string'
          ? JSON.parse(row.partial_credit_rules)
          : row.partial_credit_rules || {},
      time_bonus_percentage: row.time_bonus_percentage ? Number(row.time_bonus_percentage) : undefined,
      retry_score_penalty: Number(row.retry_score_penalty),
    };
  }
}
