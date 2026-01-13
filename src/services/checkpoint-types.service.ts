import { Knex } from 'knex';
import { getDatabase } from '../database';

/**
 * Checkpoint Types Service
 *
 * Manages checkpoint types, formats, templates, and learner accommodations.
 * Implements the checkpoint types specification requirements:
 * - Knowledge assessment checkpoints (MCQ, T/F, fill-blank, matching, short answer, essay)
 * - Practical skills checkpoints (projects, code, video, portfolio, peer review, mentor observation)
 * - Oral assessment checkpoints (voice recording, live exam, audio questions, speech-to-text)
 * - Adaptive format selection based on accessibility profile
 * - Learner format preferences and overrides
 */

// ========== Types ==========

export type CheckpointCategoryCode = 'knowledge' | 'practical' | 'oral';

export type CheckpointFormatCode =
  // Knowledge formats
  | 'multiple_choice'
  | 'true_false'
  | 'fill_blank'
  | 'matching'
  | 'short_answer'
  | 'essay'
  // Practical formats
  | 'project_submission'
  | 'code_submission'
  | 'video_demonstration'
  | 'portfolio_artifact'
  | 'peer_review'
  | 'mentor_observation'
  // Oral formats
  | 'voice_recorded'
  | 'live_oral_exam'
  | 'audio_question'
  | 'speech_to_text';

export type ScoringMethod = 'auto' | 'manual' | 'ai_assisted' | 'peer' | 'hybrid';

export type CheckpointStatus = 'draft' | 'scheduled' | 'active' | 'closed' | 'archived';

export type TemplateStatus = 'draft' | 'published' | 'archived';

export type ShowAnswersWhen = 'immediately' | 'after_submission' | 'after_deadline' | 'never';

export interface CheckpointCategory {
  id: string;
  code: CheckpointCategoryCode;
  name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface CheckpointFormatType {
  id: string;
  category_id: string;
  code: CheckpointFormatCode;
  name: string;
  description: string | null;
  supports_auto_scoring: boolean;
  requires_manual_review: boolean;
  supports_partial_credit: boolean;
  supports_offline: boolean;
  supports_time_limit: boolean;
  is_accessible: boolean;
  config_schema: Record<string, any> | null;
  scoring_method: ScoringMethod;
  default_points: number;
  is_active: boolean;
  display_order: number;
  created_at: Date;
  updated_at: Date;
  category?: CheckpointCategory;
}

export interface CheckpointTemplate {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  instructions: string | null;
  community_id: string | null;
  category_id: string;
  status: TemplateStatus;
  is_public: boolean;
  version: number;
  passing_score: number;
  passing_tiers: PassingTier[];
  allow_partial_credit: boolean;
  total_points: number;
  time_limit_minutes: number | null;
  max_attempts: number | null;
  cooldown_hours: number | null;
  show_timer: boolean;
  allow_pause: boolean;
  question_count: number | null;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  show_correct_answers: boolean;
  show_answers_when: ShowAnswersWhen;
  show_score_immediately: boolean;
  show_feedback_immediately: boolean;
  completion_message: string | null;
  allowed_formats: string[];
  accessibility_features: string[];
  allow_accommodations: boolean;
  metadata: Record<string, any>;
  tags: string[];
  created_by: string;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PassingTier {
  name: string;
  min_score: number;
}

export interface Checkpoint {
  id: string;
  name: string;
  description: string | null;
  instructions: string | null;
  template_id: string | null;
  community_id: string;
  category_id: string;
  course_id: string | null;
  module_id: string | null;
  lesson_id: string | null;
  status: CheckpointStatus;
  scheduled_at: Date | null;
  opens_at: Date | null;
  closes_at: Date | null;
  passing_score: number;
  passing_tiers: PassingTier[];
  allow_partial_credit: boolean;
  total_points: number;
  time_limit_minutes: number | null;
  max_attempts: number | null;
  cooldown_hours: number | null;
  show_timer: boolean;
  allow_pause: boolean;
  question_count: number | null;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  show_correct_answers: boolean;
  show_answers_when: ShowAnswersWhen;
  show_score_immediately: boolean;
  show_feedback_immediately: boolean;
  completion_message: string | null;
  allowed_formats: string[];
  accessibility_features: string[];
  allow_accommodations: boolean;
  require_identity_verification: boolean;
  detect_collaboration: boolean;
  log_session_events: boolean;
  attempt_count: number;
  average_score: number | null;
  pass_rate: number | null;
  average_duration_seconds: number | null;
  metadata: Record<string, any>;
  tags: string[];
  created_by: string;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
  published_at: Date | null;
}

export interface CheckpointQuestion {
  id: string;
  checkpoint_id: string;
  question_id: string;
  format_type_id: string;
  display_order: number;
  points_override: number | null;
  is_required: boolean;
  is_bonus: boolean;
  format_config: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
}

export interface CheckpointAccommodation {
  id: string;
  user_id: string;
  community_id: string;
  extended_time: boolean;
  time_multiplier: number;
  screen_reader_support: boolean;
  high_contrast_mode: boolean;
  large_text: boolean;
  font_size_percentage: number;
  break_allowances: boolean;
  break_frequency_minutes: number | null;
  break_duration_minutes: number | null;
  alternative_input: boolean;
  alternative_input_methods: string[];
  audio_descriptions: boolean;
  sign_language_support: boolean;
  text_to_speech: boolean;
  speech_to_text: boolean;
  preferred_formats: string[];
  excluded_formats: string[];
  documentation_notes: string | null;
  documentation_file_url: string | null;
  valid_from: Date | null;
  valid_until: Date | null;
  is_approved: boolean;
  approved_by: string | null;
  approved_at: Date | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export interface CheckpointFormatPreference {
  id: string;
  user_id: string;
  preferred_formats: string[];
  preferred_categories: string[];
  format_rankings: Record<string, number> | null;
  allow_format_override: boolean;
  override_justification: string | null;
  created_at: Date;
  updated_at: Date;
}

// ========== Create/Update Data Types ==========

export interface CreateCheckpointTemplateData {
  name: string;
  slug: string;
  description?: string;
  instructions?: string;
  community_id?: string;
  category_id: string;
  passing_score?: number;
  passing_tiers?: PassingTier[];
  allow_partial_credit?: boolean;
  time_limit_minutes?: number;
  max_attempts?: number;
  cooldown_hours?: number;
  show_timer?: boolean;
  allow_pause?: boolean;
  question_count?: number;
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
  show_correct_answers?: boolean;
  show_answers_when?: ShowAnswersWhen;
  show_score_immediately?: boolean;
  show_feedback_immediately?: boolean;
  completion_message?: string;
  allowed_formats?: string[];
  accessibility_features?: string[];
  allow_accommodations?: boolean;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface UpdateCheckpointTemplateData {
  name?: string;
  description?: string;
  instructions?: string;
  status?: TemplateStatus;
  is_public?: boolean;
  passing_score?: number;
  passing_tiers?: PassingTier[];
  allow_partial_credit?: boolean;
  time_limit_minutes?: number | null;
  max_attempts?: number | null;
  cooldown_hours?: number | null;
  show_timer?: boolean;
  allow_pause?: boolean;
  question_count?: number | null;
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
  show_correct_answers?: boolean;
  show_answers_when?: ShowAnswersWhen;
  show_score_immediately?: boolean;
  show_feedback_immediately?: boolean;
  completion_message?: string | null;
  allowed_formats?: string[];
  accessibility_features?: string[];
  allow_accommodations?: boolean;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface CreateCheckpointData {
  name: string;
  description?: string;
  instructions?: string;
  template_id?: string;
  community_id: string;
  category_id: string;
  course_id?: string;
  module_id?: string;
  lesson_id?: string;
  passing_score?: number;
  passing_tiers?: PassingTier[];
  allow_partial_credit?: boolean;
  time_limit_minutes?: number;
  max_attempts?: number;
  cooldown_hours?: number;
  show_timer?: boolean;
  allow_pause?: boolean;
  question_count?: number;
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
  show_correct_answers?: boolean;
  show_answers_when?: ShowAnswersWhen;
  show_score_immediately?: boolean;
  show_feedback_immediately?: boolean;
  completion_message?: string;
  allowed_formats?: string[];
  accessibility_features?: string[];
  allow_accommodations?: boolean;
  require_identity_verification?: boolean;
  detect_collaboration?: boolean;
  log_session_events?: boolean;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface UpdateCheckpointData {
  name?: string;
  description?: string;
  instructions?: string;
  status?: CheckpointStatus;
  scheduled_at?: Date | null;
  opens_at?: Date | null;
  closes_at?: Date | null;
  passing_score?: number;
  passing_tiers?: PassingTier[];
  allow_partial_credit?: boolean;
  time_limit_minutes?: number | null;
  max_attempts?: number | null;
  cooldown_hours?: number | null;
  show_timer?: boolean;
  allow_pause?: boolean;
  question_count?: number | null;
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
  show_correct_answers?: boolean;
  show_answers_when?: ShowAnswersWhen;
  show_score_immediately?: boolean;
  show_feedback_immediately?: boolean;
  completion_message?: string | null;
  allowed_formats?: string[];
  accessibility_features?: string[];
  allow_accommodations?: boolean;
  require_identity_verification?: boolean;
  detect_collaboration?: boolean;
  log_session_events?: boolean;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface CreateCheckpointQuestionData {
  question_id: string;
  format_type_id: string;
  display_order: number;
  points_override?: number;
  is_required?: boolean;
  is_bonus?: boolean;
  format_config?: Record<string, any>;
}

export interface CreateAccommodationData {
  community_id: string;
  extended_time?: boolean;
  time_multiplier?: number;
  screen_reader_support?: boolean;
  high_contrast_mode?: boolean;
  large_text?: boolean;
  font_size_percentage?: number;
  break_allowances?: boolean;
  break_frequency_minutes?: number;
  break_duration_minutes?: number;
  alternative_input?: boolean;
  alternative_input_methods?: string[];
  audio_descriptions?: boolean;
  sign_language_support?: boolean;
  text_to_speech?: boolean;
  speech_to_text?: boolean;
  preferred_formats?: string[];
  excluded_formats?: string[];
  documentation_notes?: string;
  documentation_file_url?: string;
  valid_from?: Date;
  valid_until?: Date;
}

export interface UpdateAccommodationData extends Partial<CreateAccommodationData> {
  is_approved?: boolean;
}

export interface UpdateFormatPreferenceData {
  preferred_formats?: string[];
  preferred_categories?: string[];
  format_rankings?: Record<string, number>;
  allow_format_override?: boolean;
  override_justification?: string;
}

export interface FormatSelectionResult {
  selected_formats: CheckpointFormatType[];
  applied_accommodations: Partial<CheckpointAccommodation> | null;
  user_preferences: Partial<CheckpointFormatPreference> | null;
  selection_reason: string;
}

// ========== Service Class ==========

export class CheckpointTypesService {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  // ========== Category Management ==========

  async getCategories(): Promise<CheckpointCategory[]> {
    const categories = await this.db('checkpoint_categories')
      .where({ is_active: true })
      .orderBy('display_order', 'asc');
    return categories;
  }

  async getCategoryByCode(code: CheckpointCategoryCode): Promise<CheckpointCategory | null> {
    const category = await this.db('checkpoint_categories')
      .where({ code })
      .first();
    return category || null;
  }

  async getCategoryById(id: string): Promise<CheckpointCategory | null> {
    const category = await this.db('checkpoint_categories')
      .where({ id })
      .first();
    return category || null;
  }

  // ========== Format Type Management ==========

  async getFormatTypes(options?: {
    category_id?: string;
    category_code?: CheckpointCategoryCode;
    is_active?: boolean;
    supports_offline?: boolean;
    supports_auto_scoring?: boolean;
    is_accessible?: boolean;
  }): Promise<CheckpointFormatType[]> {
    let query = this.db('checkpoint_format_types as ft')
      .select('ft.*')
      .orderBy('ft.display_order', 'asc');

    if (options?.category_id) {
      query = query.where('ft.category_id', options.category_id);
    }

    if (options?.category_code) {
      query = query
        .join('checkpoint_categories as cc', 'ft.category_id', 'cc.id')
        .where('cc.code', options.category_code);
    }

    if (options?.is_active !== undefined) {
      query = query.where('ft.is_active', options.is_active);
    }

    if (options?.supports_offline !== undefined) {
      query = query.where('ft.supports_offline', options.supports_offline);
    }

    if (options?.supports_auto_scoring !== undefined) {
      query = query.where('ft.supports_auto_scoring', options.supports_auto_scoring);
    }

    if (options?.is_accessible !== undefined) {
      query = query.where('ft.is_accessible', options.is_accessible);
    }

    const formats = await query;
    return formats.map((f: any) => this.formatFormatType(f));
  }

  async getFormatTypeByCode(code: CheckpointFormatCode): Promise<CheckpointFormatType | null> {
    const format = await this.db('checkpoint_format_types')
      .where({ code })
      .first();
    return format ? this.formatFormatType(format) : null;
  }

  async getFormatTypeById(id: string): Promise<CheckpointFormatType | null> {
    const format = await this.db('checkpoint_format_types')
      .where({ id })
      .first();
    return format ? this.formatFormatType(format) : null;
  }

  async getFormatTypesWithCategory(): Promise<(CheckpointFormatType & { category: CheckpointCategory })[]> {
    const formats = await this.db('checkpoint_format_types as ft')
      .join('checkpoint_categories as cc', 'ft.category_id', 'cc.id')
      .select(
        'ft.*',
        'cc.id as category_id',
        'cc.code as category_code',
        'cc.name as category_name',
        'cc.description as category_description'
      )
      .where('ft.is_active', true)
      .orderBy(['cc.display_order', 'ft.display_order']);

    return formats.map((row: any) => ({
      ...this.formatFormatType(row),
      category: {
        id: row.category_id,
        code: row.category_code,
        name: row.category_name,
        description: row.category_description,
        is_active: true,
        display_order: 0,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    }));
  }

  // ========== Template Management ==========

  async createTemplate(userId: string, data: CreateCheckpointTemplateData): Promise<CheckpointTemplate> {
    const [template] = await this.db('checkpoint_templates')
      .insert({
        name: data.name,
        slug: data.slug,
        description: data.description,
        instructions: data.instructions,
        community_id: data.community_id,
        category_id: data.category_id,
        passing_score: data.passing_score ?? 70,
        passing_tiers: JSON.stringify(data.passing_tiers ?? []),
        allow_partial_credit: data.allow_partial_credit ?? true,
        time_limit_minutes: data.time_limit_minutes,
        max_attempts: data.max_attempts,
        cooldown_hours: data.cooldown_hours,
        show_timer: data.show_timer ?? true,
        allow_pause: data.allow_pause ?? false,
        question_count: data.question_count,
        shuffle_questions: data.shuffle_questions ?? false,
        shuffle_options: data.shuffle_options ?? true,
        show_correct_answers: data.show_correct_answers ?? true,
        show_answers_when: data.show_answers_when ?? 'after_submission',
        show_score_immediately: data.show_score_immediately ?? true,
        show_feedback_immediately: data.show_feedback_immediately ?? true,
        completion_message: data.completion_message,
        allowed_formats: data.allowed_formats ?? [],
        accessibility_features: data.accessibility_features ?? [],
        allow_accommodations: data.allow_accommodations ?? true,
        metadata: JSON.stringify(data.metadata ?? {}),
        tags: data.tags ?? [],
        created_by: userId,
        updated_by: userId,
      })
      .returning('*');

    return this.formatTemplate(template);
  }

  async getTemplate(templateId: string): Promise<CheckpointTemplate | null> {
    const template = await this.db('checkpoint_templates')
      .where({ id: templateId })
      .first();
    return template ? this.formatTemplate(template) : null;
  }

  async getTemplates(options?: {
    community_id?: string;
    category_id?: string;
    status?: TemplateStatus;
    is_public?: boolean;
    tags?: string[];
    limit?: number;
    offset?: number;
  }): Promise<{ templates: CheckpointTemplate[]; total: number }> {
    const { limit = 50, offset = 0, tags, ...filters } = options || {};

    let query = this.db('checkpoint_templates');

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined) {
        query = query.where({ [key]: value });
      }
    }

    if (tags && tags.length > 0) {
      query = query.whereRaw('tags && ARRAY[?]::varchar[]', [tags]);
    }

    const [{ count }] = await query.clone().count('* as count');
    const templates = await query
      .limit(limit)
      .offset(offset)
      .orderBy('created_at', 'desc');

    return {
      templates: templates.map((t: any) => this.formatTemplate(t)),
      total: Number(count),
    };
  }

  async updateTemplate(
    templateId: string,
    userId: string,
    data: UpdateCheckpointTemplateData
  ): Promise<CheckpointTemplate> {
    const updateData: Record<string, any> = { updated_by: userId };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.instructions !== undefined) updateData.instructions = data.instructions;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.is_public !== undefined) updateData.is_public = data.is_public;
    if (data.passing_score !== undefined) updateData.passing_score = data.passing_score;
    if (data.passing_tiers !== undefined) updateData.passing_tiers = JSON.stringify(data.passing_tiers);
    if (data.allow_partial_credit !== undefined) updateData.allow_partial_credit = data.allow_partial_credit;
    if (data.time_limit_minutes !== undefined) updateData.time_limit_minutes = data.time_limit_minutes;
    if (data.max_attempts !== undefined) updateData.max_attempts = data.max_attempts;
    if (data.cooldown_hours !== undefined) updateData.cooldown_hours = data.cooldown_hours;
    if (data.show_timer !== undefined) updateData.show_timer = data.show_timer;
    if (data.allow_pause !== undefined) updateData.allow_pause = data.allow_pause;
    if (data.question_count !== undefined) updateData.question_count = data.question_count;
    if (data.shuffle_questions !== undefined) updateData.shuffle_questions = data.shuffle_questions;
    if (data.shuffle_options !== undefined) updateData.shuffle_options = data.shuffle_options;
    if (data.show_correct_answers !== undefined) updateData.show_correct_answers = data.show_correct_answers;
    if (data.show_answers_when !== undefined) updateData.show_answers_when = data.show_answers_when;
    if (data.show_score_immediately !== undefined) updateData.show_score_immediately = data.show_score_immediately;
    if (data.show_feedback_immediately !== undefined) updateData.show_feedback_immediately = data.show_feedback_immediately;
    if (data.completion_message !== undefined) updateData.completion_message = data.completion_message;
    if (data.allowed_formats !== undefined) updateData.allowed_formats = data.allowed_formats;
    if (data.accessibility_features !== undefined) updateData.accessibility_features = data.accessibility_features;
    if (data.allow_accommodations !== undefined) updateData.allow_accommodations = data.allow_accommodations;
    if (data.metadata !== undefined) updateData.metadata = JSON.stringify(data.metadata);
    if (data.tags !== undefined) updateData.tags = data.tags;

    const [template] = await this.db('checkpoint_templates')
      .where({ id: templateId })
      .update(updateData)
      .returning('*');

    return this.formatTemplate(template);
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await this.db('checkpoint_templates')
      .where({ id: templateId })
      .delete();
  }

  async publishTemplate(templateId: string, userId: string): Promise<CheckpointTemplate> {
    return this.updateTemplate(templateId, userId, { status: 'published' });
  }

  async archiveTemplate(templateId: string, userId: string): Promise<CheckpointTemplate> {
    return this.updateTemplate(templateId, userId, { status: 'archived' });
  }

  // ========== Checkpoint Management ==========

  async createCheckpoint(userId: string, data: CreateCheckpointData): Promise<Checkpoint> {
    const [checkpoint] = await this.db('checkpoints')
      .insert({
        name: data.name,
        description: data.description,
        instructions: data.instructions,
        template_id: data.template_id,
        community_id: data.community_id,
        category_id: data.category_id,
        course_id: data.course_id,
        module_id: data.module_id,
        lesson_id: data.lesson_id,
        passing_score: data.passing_score ?? 70,
        passing_tiers: JSON.stringify(data.passing_tiers ?? [
          { name: 'Pass', min_score: 70 },
          { name: 'Merit', min_score: 85 },
          { name: 'Distinction', min_score: 95 },
        ]),
        allow_partial_credit: data.allow_partial_credit ?? true,
        time_limit_minutes: data.time_limit_minutes,
        max_attempts: data.max_attempts,
        cooldown_hours: data.cooldown_hours,
        show_timer: data.show_timer ?? true,
        allow_pause: data.allow_pause ?? false,
        question_count: data.question_count,
        shuffle_questions: data.shuffle_questions ?? false,
        shuffle_options: data.shuffle_options ?? true,
        show_correct_answers: data.show_correct_answers ?? true,
        show_answers_when: data.show_answers_when ?? 'after_submission',
        show_score_immediately: data.show_score_immediately ?? true,
        show_feedback_immediately: data.show_feedback_immediately ?? true,
        completion_message: data.completion_message,
        allowed_formats: data.allowed_formats ?? [],
        accessibility_features: data.accessibility_features ?? [],
        allow_accommodations: data.allow_accommodations ?? true,
        require_identity_verification: data.require_identity_verification ?? false,
        detect_collaboration: data.detect_collaboration ?? false,
        log_session_events: data.log_session_events ?? true,
        metadata: JSON.stringify(data.metadata ?? {}),
        tags: data.tags ?? [],
        created_by: userId,
        updated_by: userId,
      })
      .returning('*');

    return this.formatCheckpoint(checkpoint);
  }

  async createCheckpointFromTemplate(
    userId: string,
    templateId: string,
    overrides?: Partial<CreateCheckpointData>
  ): Promise<Checkpoint> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const checkpointData: CreateCheckpointData = {
      name: overrides?.name ?? template.name,
      description: overrides?.description ?? template.description ?? undefined,
      instructions: overrides?.instructions ?? template.instructions ?? undefined,
      template_id: templateId,
      community_id: overrides?.community_id ?? template.community_id!,
      category_id: template.category_id,
      course_id: overrides?.course_id,
      module_id: overrides?.module_id,
      lesson_id: overrides?.lesson_id,
      passing_score: overrides?.passing_score ?? template.passing_score,
      passing_tiers: overrides?.passing_tiers ?? template.passing_tiers,
      allow_partial_credit: overrides?.allow_partial_credit ?? template.allow_partial_credit,
      time_limit_minutes: overrides?.time_limit_minutes ?? template.time_limit_minutes ?? undefined,
      max_attempts: overrides?.max_attempts ?? template.max_attempts ?? undefined,
      cooldown_hours: overrides?.cooldown_hours ?? template.cooldown_hours ?? undefined,
      show_timer: overrides?.show_timer ?? template.show_timer,
      allow_pause: overrides?.allow_pause ?? template.allow_pause,
      question_count: overrides?.question_count ?? template.question_count ?? undefined,
      shuffle_questions: overrides?.shuffle_questions ?? template.shuffle_questions,
      shuffle_options: overrides?.shuffle_options ?? template.shuffle_options,
      show_correct_answers: overrides?.show_correct_answers ?? template.show_correct_answers,
      show_answers_when: overrides?.show_answers_when ?? template.show_answers_when,
      show_score_immediately: overrides?.show_score_immediately ?? template.show_score_immediately,
      show_feedback_immediately: overrides?.show_feedback_immediately ?? template.show_feedback_immediately,
      completion_message: overrides?.completion_message ?? template.completion_message ?? undefined,
      allowed_formats: overrides?.allowed_formats ?? template.allowed_formats,
      accessibility_features: overrides?.accessibility_features ?? template.accessibility_features,
      allow_accommodations: overrides?.allow_accommodations ?? template.allow_accommodations,
      metadata: overrides?.metadata ?? template.metadata,
      tags: overrides?.tags ?? template.tags,
    };

    return this.createCheckpoint(userId, checkpointData);
  }

  async getCheckpoint(checkpointId: string): Promise<Checkpoint | null> {
    const checkpoint = await this.db('checkpoints')
      .where({ id: checkpointId })
      .first();
    return checkpoint ? this.formatCheckpoint(checkpoint) : null;
  }

  async getCheckpoints(options?: {
    community_id?: string;
    category_id?: string;
    course_id?: string;
    module_id?: string;
    lesson_id?: string;
    status?: CheckpointStatus;
    tags?: string[];
    limit?: number;
    offset?: number;
  }): Promise<{ checkpoints: Checkpoint[]; total: number }> {
    const { limit = 50, offset = 0, tags, ...filters } = options || {};

    let query = this.db('checkpoints');

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined) {
        query = query.where({ [key]: value });
      }
    }

    if (tags && tags.length > 0) {
      query = query.whereRaw('tags && ARRAY[?]::varchar[]', [tags]);
    }

    const [{ count }] = await query.clone().count('* as count');
    const checkpoints = await query
      .limit(limit)
      .offset(offset)
      .orderBy('created_at', 'desc');

    return {
      checkpoints: checkpoints.map((c: any) => this.formatCheckpoint(c)),
      total: Number(count),
    };
  }

  async updateCheckpoint(
    checkpointId: string,
    userId: string,
    data: UpdateCheckpointData
  ): Promise<Checkpoint> {
    const updateData: Record<string, any> = { updated_by: userId };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.instructions !== undefined) updateData.instructions = data.instructions;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.scheduled_at !== undefined) updateData.scheduled_at = data.scheduled_at;
    if (data.opens_at !== undefined) updateData.opens_at = data.opens_at;
    if (data.closes_at !== undefined) updateData.closes_at = data.closes_at;
    if (data.passing_score !== undefined) updateData.passing_score = data.passing_score;
    if (data.passing_tiers !== undefined) updateData.passing_tiers = JSON.stringify(data.passing_tiers);
    if (data.allow_partial_credit !== undefined) updateData.allow_partial_credit = data.allow_partial_credit;
    if (data.time_limit_minutes !== undefined) updateData.time_limit_minutes = data.time_limit_minutes;
    if (data.max_attempts !== undefined) updateData.max_attempts = data.max_attempts;
    if (data.cooldown_hours !== undefined) updateData.cooldown_hours = data.cooldown_hours;
    if (data.show_timer !== undefined) updateData.show_timer = data.show_timer;
    if (data.allow_pause !== undefined) updateData.allow_pause = data.allow_pause;
    if (data.question_count !== undefined) updateData.question_count = data.question_count;
    if (data.shuffle_questions !== undefined) updateData.shuffle_questions = data.shuffle_questions;
    if (data.shuffle_options !== undefined) updateData.shuffle_options = data.shuffle_options;
    if (data.show_correct_answers !== undefined) updateData.show_correct_answers = data.show_correct_answers;
    if (data.show_answers_when !== undefined) updateData.show_answers_when = data.show_answers_when;
    if (data.show_score_immediately !== undefined) updateData.show_score_immediately = data.show_score_immediately;
    if (data.show_feedback_immediately !== undefined) updateData.show_feedback_immediately = data.show_feedback_immediately;
    if (data.completion_message !== undefined) updateData.completion_message = data.completion_message;
    if (data.allowed_formats !== undefined) updateData.allowed_formats = data.allowed_formats;
    if (data.accessibility_features !== undefined) updateData.accessibility_features = data.accessibility_features;
    if (data.allow_accommodations !== undefined) updateData.allow_accommodations = data.allow_accommodations;
    if (data.require_identity_verification !== undefined) updateData.require_identity_verification = data.require_identity_verification;
    if (data.detect_collaboration !== undefined) updateData.detect_collaboration = data.detect_collaboration;
    if (data.log_session_events !== undefined) updateData.log_session_events = data.log_session_events;
    if (data.metadata !== undefined) updateData.metadata = JSON.stringify(data.metadata);
    if (data.tags !== undefined) updateData.tags = data.tags;

    const [checkpoint] = await this.db('checkpoints')
      .where({ id: checkpointId })
      .update(updateData)
      .returning('*');

    return this.formatCheckpoint(checkpoint);
  }

  async deleteCheckpoint(checkpointId: string): Promise<void> {
    await this.db('checkpoints')
      .where({ id: checkpointId })
      .delete();
  }

  async publishCheckpoint(checkpointId: string, userId: string): Promise<Checkpoint> {
    const [checkpoint] = await this.db('checkpoints')
      .where({ id: checkpointId })
      .update({
        status: 'active',
        published_at: this.db.fn.now(),
        updated_by: userId,
      })
      .returning('*');

    return this.formatCheckpoint(checkpoint);
  }

  async scheduleCheckpoint(
    checkpointId: string,
    userId: string,
    scheduledAt: Date,
    opensAt?: Date,
    closesAt?: Date
  ): Promise<Checkpoint> {
    const [checkpoint] = await this.db('checkpoints')
      .where({ id: checkpointId })
      .update({
        status: 'scheduled',
        scheduled_at: scheduledAt,
        opens_at: opensAt,
        closes_at: closesAt,
        updated_by: userId,
      })
      .returning('*');

    return this.formatCheckpoint(checkpoint);
  }

  async closeCheckpoint(checkpointId: string, userId: string): Promise<Checkpoint> {
    return this.updateCheckpoint(checkpointId, userId, { status: 'closed' });
  }

  // ========== Checkpoint Questions Management ==========

  async addQuestionToCheckpoint(
    checkpointId: string,
    data: CreateCheckpointQuestionData
  ): Promise<CheckpointQuestion> {
    const [question] = await this.db('checkpoint_questions')
      .insert({
        checkpoint_id: checkpointId,
        question_id: data.question_id,
        format_type_id: data.format_type_id,
        display_order: data.display_order,
        points_override: data.points_override,
        is_required: data.is_required ?? true,
        is_bonus: data.is_bonus ?? false,
        format_config: data.format_config ? JSON.stringify(data.format_config) : null,
      })
      .returning('*');

    // Update checkpoint total points
    await this.recalculateCheckpointPoints(checkpointId);

    return this.formatCheckpointQuestion(question);
  }

  async getCheckpointQuestions(checkpointId: string): Promise<CheckpointQuestion[]> {
    const questions = await this.db('checkpoint_questions')
      .where({ checkpoint_id: checkpointId })
      .orderBy('display_order', 'asc');

    return questions.map((q: any) => this.formatCheckpointQuestion(q));
  }

  async removeQuestionFromCheckpoint(checkpointId: string, questionId: string): Promise<void> {
    await this.db('checkpoint_questions')
      .where({ checkpoint_id: checkpointId, question_id: questionId })
      .delete();

    await this.recalculateCheckpointPoints(checkpointId);
  }

  async reorderCheckpointQuestions(
    checkpointId: string,
    questionOrders: { question_id: string; display_order: number }[]
  ): Promise<void> {
    await this.db.transaction(async (trx) => {
      for (const item of questionOrders) {
        await trx('checkpoint_questions')
          .where({ checkpoint_id: checkpointId, question_id: item.question_id })
          .update({ display_order: item.display_order });
      }
    });
  }

  private async recalculateCheckpointPoints(checkpointId: string): Promise<void> {
    const result = await this.db('checkpoint_questions as cq')
      .join('assessment_questions as aq', 'cq.question_id', 'aq.id')
      .where('cq.checkpoint_id', checkpointId)
      .where('cq.is_bonus', false)
      .select(this.db.raw('SUM(COALESCE(cq.points_override, aq.points)) as total_points'));

    const totalPoints = (result[0] as { total_points: number })?.total_points || 0;

    await this.db('checkpoints')
      .where({ id: checkpointId })
      .update({ total_points: totalPoints });
  }

  // ========== Accommodation Management ==========

  async createAccommodation(
    userId: string,
    createdBy: string,
    data: CreateAccommodationData
  ): Promise<CheckpointAccommodation> {
    const [accommodation] = await this.db('checkpoint_accommodations')
      .insert({
        user_id: userId,
        community_id: data.community_id,
        extended_time: data.extended_time ?? false,
        time_multiplier: data.time_multiplier ?? 1.0,
        screen_reader_support: data.screen_reader_support ?? false,
        high_contrast_mode: data.high_contrast_mode ?? false,
        large_text: data.large_text ?? false,
        font_size_percentage: data.font_size_percentage ?? 100,
        break_allowances: data.break_allowances ?? false,
        break_frequency_minutes: data.break_frequency_minutes,
        break_duration_minutes: data.break_duration_minutes,
        alternative_input: data.alternative_input ?? false,
        alternative_input_methods: data.alternative_input_methods ?? [],
        audio_descriptions: data.audio_descriptions ?? false,
        sign_language_support: data.sign_language_support ?? false,
        text_to_speech: data.text_to_speech ?? false,
        speech_to_text: data.speech_to_text ?? false,
        preferred_formats: data.preferred_formats ?? [],
        excluded_formats: data.excluded_formats ?? [],
        documentation_notes: data.documentation_notes,
        documentation_file_url: data.documentation_file_url,
        valid_from: data.valid_from,
        valid_until: data.valid_until,
        created_by: createdBy,
      })
      .returning('*');

    return this.formatAccommodation(accommodation);
  }

  async getAccommodation(userId: string, communityId: string): Promise<CheckpointAccommodation | null> {
    const accommodation = await this.db('checkpoint_accommodations')
      .where({ user_id: userId, community_id: communityId, is_active: true })
      .first();

    return accommodation ? this.formatAccommodation(accommodation) : null;
  }

  async updateAccommodation(
    userId: string,
    communityId: string,
    data: UpdateAccommodationData
  ): Promise<CheckpointAccommodation> {
    const updateData: Record<string, any> = {};

    if (data.extended_time !== undefined) updateData.extended_time = data.extended_time;
    if (data.time_multiplier !== undefined) updateData.time_multiplier = data.time_multiplier;
    if (data.screen_reader_support !== undefined) updateData.screen_reader_support = data.screen_reader_support;
    if (data.high_contrast_mode !== undefined) updateData.high_contrast_mode = data.high_contrast_mode;
    if (data.large_text !== undefined) updateData.large_text = data.large_text;
    if (data.font_size_percentage !== undefined) updateData.font_size_percentage = data.font_size_percentage;
    if (data.break_allowances !== undefined) updateData.break_allowances = data.break_allowances;
    if (data.break_frequency_minutes !== undefined) updateData.break_frequency_minutes = data.break_frequency_minutes;
    if (data.break_duration_minutes !== undefined) updateData.break_duration_minutes = data.break_duration_minutes;
    if (data.alternative_input !== undefined) updateData.alternative_input = data.alternative_input;
    if (data.alternative_input_methods !== undefined) updateData.alternative_input_methods = data.alternative_input_methods;
    if (data.audio_descriptions !== undefined) updateData.audio_descriptions = data.audio_descriptions;
    if (data.sign_language_support !== undefined) updateData.sign_language_support = data.sign_language_support;
    if (data.text_to_speech !== undefined) updateData.text_to_speech = data.text_to_speech;
    if (data.speech_to_text !== undefined) updateData.speech_to_text = data.speech_to_text;
    if (data.preferred_formats !== undefined) updateData.preferred_formats = data.preferred_formats;
    if (data.excluded_formats !== undefined) updateData.excluded_formats = data.excluded_formats;
    if (data.documentation_notes !== undefined) updateData.documentation_notes = data.documentation_notes;
    if (data.documentation_file_url !== undefined) updateData.documentation_file_url = data.documentation_file_url;
    if (data.valid_from !== undefined) updateData.valid_from = data.valid_from;
    if (data.valid_until !== undefined) updateData.valid_until = data.valid_until;
    if (data.is_approved !== undefined) updateData.is_approved = data.is_approved;

    const [accommodation] = await this.db('checkpoint_accommodations')
      .where({ user_id: userId, community_id: communityId })
      .update(updateData)
      .returning('*');

    return this.formatAccommodation(accommodation);
  }

  async approveAccommodation(
    userId: string,
    communityId: string,
    approverId: string
  ): Promise<CheckpointAccommodation> {
    const [accommodation] = await this.db('checkpoint_accommodations')
      .where({ user_id: userId, community_id: communityId })
      .update({
        is_approved: true,
        approved_by: approverId,
        approved_at: this.db.fn.now(),
      })
      .returning('*');

    return this.formatAccommodation(accommodation);
  }

  async deactivateAccommodation(userId: string, communityId: string): Promise<void> {
    await this.db('checkpoint_accommodations')
      .where({ user_id: userId, community_id: communityId })
      .update({ is_active: false });
  }

  // ========== Format Preferences Management ==========

  async getFormatPreferences(userId: string): Promise<CheckpointFormatPreference | null> {
    const preferences = await this.db('checkpoint_format_preferences')
      .where({ user_id: userId })
      .first();

    return preferences ? this.formatFormatPreference(preferences) : null;
  }

  async upsertFormatPreferences(
    userId: string,
    data: UpdateFormatPreferenceData
  ): Promise<CheckpointFormatPreference> {
    const existing = await this.getFormatPreferences(userId);

    if (existing) {
      const updateData: Record<string, any> = {};
      if (data.preferred_formats !== undefined) updateData.preferred_formats = data.preferred_formats;
      if (data.preferred_categories !== undefined) updateData.preferred_categories = data.preferred_categories;
      if (data.format_rankings !== undefined) updateData.format_rankings = JSON.stringify(data.format_rankings);
      if (data.allow_format_override !== undefined) updateData.allow_format_override = data.allow_format_override;
      if (data.override_justification !== undefined) updateData.override_justification = data.override_justification;

      const [preferences] = await this.db('checkpoint_format_preferences')
        .where({ user_id: userId })
        .update(updateData)
        .returning('*');

      return this.formatFormatPreference(preferences);
    }

    const [preferences] = await this.db('checkpoint_format_preferences')
      .insert({
        user_id: userId,
        preferred_formats: data.preferred_formats ?? [],
        preferred_categories: data.preferred_categories ?? [],
        format_rankings: data.format_rankings ? JSON.stringify(data.format_rankings) : null,
        allow_format_override: data.allow_format_override ?? true,
        override_justification: data.override_justification,
      })
      .returning('*');

    return this.formatFormatPreference(preferences);
  }

  // ========== Adaptive Format Selection ==========

  /**
   * Automatically select appropriate checkpoint formats based on:
   * 1. User's accessibility accommodations
   * 2. User's format preferences
   * 3. Checkpoint's allowed formats
   * 4. Format availability (offline support, etc.)
   *
   * Per spec: "The system SHALL automatically select appropriate formats
   * AND SHALL allow learner override with justification
   * AND SHALL never penalize format accommodation"
   */
  async selectFormatsForUser(
    userId: string,
    checkpointId: string,
    options?: {
      require_offline?: boolean;
      require_auto_scoring?: boolean;
    }
  ): Promise<FormatSelectionResult> {
    const checkpoint = await this.getCheckpoint(checkpointId);
    if (!checkpoint) {
      throw new Error('Checkpoint not found');
    }

    // Get user's accommodations
    const accommodations = await this.getAccommodation(userId, checkpoint.community_id);

    // Get user's preferences
    const preferences = await this.getFormatPreferences(userId);

    // Get all allowed formats for this checkpoint
    let allowedFormats = checkpoint.allowed_formats;
    if (!allowedFormats || allowedFormats.length === 0) {
      // If no formats specified, get all active formats for the category
      const categoryFormats = await this.getFormatTypes({
        category_id: checkpoint.category_id,
        is_active: true,
      });
      allowedFormats = categoryFormats.map(f => f.code);
    }

    // Get format details
    let formats = await this.db('checkpoint_format_types')
      .whereIn('code', allowedFormats)
      .where('is_active', true);

    formats = formats.map((f: any) => this.formatFormatType(f));

    // Apply accessibility filters
    if (accommodations) {
      // Exclude formats that are not accessible if user needs accessibility features
      if (accommodations.screen_reader_support || accommodations.text_to_speech) {
        formats = formats.filter((f: CheckpointFormatType) => f.is_accessible);
      }

      // Exclude user's explicitly excluded formats
      if (accommodations.excluded_formats && accommodations.excluded_formats.length > 0) {
        formats = formats.filter((f: CheckpointFormatType) => !accommodations.excluded_formats.includes(f.code));
      }

      // Prioritize user's preferred formats
      if (accommodations.preferred_formats && accommodations.preferred_formats.length > 0) {
        formats.sort((a: CheckpointFormatType, b: CheckpointFormatType) => {
          const aPreferred = accommodations.preferred_formats.includes(a.code);
          const bPreferred = accommodations.preferred_formats.includes(b.code);
          if (aPreferred && !bPreferred) return -1;
          if (!aPreferred && bPreferred) return 1;
          return a.display_order - b.display_order;
        });
      }
    }

    // Apply option filters
    if (options?.require_offline) {
      formats = formats.filter((f: CheckpointFormatType) => f.supports_offline);
    }

    if (options?.require_auto_scoring) {
      formats = formats.filter((f: CheckpointFormatType) => f.supports_auto_scoring);
    }

    // Apply user preferences if they exist and are allowed
    if (preferences && preferences.allow_format_override) {
      if (preferences.preferred_formats && preferences.preferred_formats.length > 0) {
        formats.sort((a: CheckpointFormatType, b: CheckpointFormatType) => {
          const aRank = preferences.format_rankings?.[a.code] ?? 999;
          const bRank = preferences.format_rankings?.[b.code] ?? 999;
          return aRank - bRank;
        });
      }
    }

    // Build selection reason
    let selectionReason = 'Default format selection based on checkpoint configuration.';
    if (accommodations) {
      selectionReason = 'Formats selected based on accessibility accommodations.';
    } else if (preferences) {
      selectionReason = 'Formats selected based on user preferences.';
    }
    if (options?.require_offline) {
      selectionReason += ' Filtered for offline support.';
    }
    if (options?.require_auto_scoring) {
      selectionReason += ' Filtered for auto-scoring support.';
    }

    return {
      selected_formats: formats,
      applied_accommodations: accommodations
        ? {
            extended_time: accommodations.extended_time,
            time_multiplier: accommodations.time_multiplier,
            screen_reader_support: accommodations.screen_reader_support,
            high_contrast_mode: accommodations.high_contrast_mode,
            large_text: accommodations.large_text,
            break_allowances: accommodations.break_allowances,
          }
        : null,
      user_preferences: preferences
        ? {
            preferred_formats: preferences.preferred_formats,
            allow_format_override: preferences.allow_format_override,
          }
        : null,
      selection_reason: selectionReason,
    };
  }

  /**
   * Allow user to override format selection with justification
   * Per spec: "SHALL allow learner override with justification"
   */
  async overrideFormatSelection(
    userId: string,
    formatCodes: string[],
    justification: string
  ): Promise<CheckpointFormatPreference> {
    return this.upsertFormatPreferences(userId, {
      preferred_formats: formatCodes,
      allow_format_override: true,
      override_justification: justification,
    });
  }

  // ========== Utility Methods ==========

  private formatFormatType(row: any): CheckpointFormatType {
    return {
      ...row,
      config_schema: row.config_schema
        ? (typeof row.config_schema === 'string' ? JSON.parse(row.config_schema) : row.config_schema)
        : null,
    };
  }

  private formatTemplate(row: any): CheckpointTemplate {
    return {
      ...row,
      passing_tiers: row.passing_tiers
        ? (typeof row.passing_tiers === 'string' ? JSON.parse(row.passing_tiers) : row.passing_tiers)
        : [],
      metadata: row.metadata
        ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata)
        : {},
      allowed_formats: row.allowed_formats || [],
      accessibility_features: row.accessibility_features || [],
      tags: row.tags || [],
    };
  }

  private formatCheckpoint(row: any): Checkpoint {
    return {
      ...row,
      passing_tiers: row.passing_tiers
        ? (typeof row.passing_tiers === 'string' ? JSON.parse(row.passing_tiers) : row.passing_tiers)
        : [],
      metadata: row.metadata
        ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata)
        : {},
      allowed_formats: row.allowed_formats || [],
      accessibility_features: row.accessibility_features || [],
      tags: row.tags || [],
      average_score: row.average_score ? Number(row.average_score) : null,
      pass_rate: row.pass_rate ? Number(row.pass_rate) : null,
    };
  }

  private formatCheckpointQuestion(row: any): CheckpointQuestion {
    return {
      ...row,
      format_config: row.format_config
        ? (typeof row.format_config === 'string' ? JSON.parse(row.format_config) : row.format_config)
        : null,
    };
  }

  private formatAccommodation(row: any): CheckpointAccommodation {
    return {
      ...row,
      time_multiplier: Number(row.time_multiplier),
      alternative_input_methods: row.alternative_input_methods || [],
      preferred_formats: row.preferred_formats || [],
      excluded_formats: row.excluded_formats || [],
    };
  }

  private formatFormatPreference(row: any): CheckpointFormatPreference {
    return {
      ...row,
      preferred_formats: row.preferred_formats || [],
      preferred_categories: row.preferred_categories || [],
      format_rankings: row.format_rankings
        ? (typeof row.format_rankings === 'string' ? JSON.parse(row.format_rankings) : row.format_rankings)
        : null,
    };
  }
}
