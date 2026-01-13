/**
 * Checkpoint Execution Engine Types
 *
 * Type definitions for checkpoint sessions, responses, events,
 * accessibility accommodations, and offline sync.
 */

// ========== Enums ==========

export type CheckpointType = 'knowledge' | 'practical' | 'oral' | 'mixed';
export type CheckpointStatus = 'draft' | 'published' | 'archived';

export type SessionStatus =
  | 'initializing'
  | 'in_progress'
  | 'paused'
  | 'on_break'
  | 'submitted'
  | 'timed_out'
  | 'abandoned'
  | 'flagged_for_review'
  | 'scored'
  | 'reviewed';

export type ResponseStatus =
  | 'not_viewed'
  | 'viewed'
  | 'in_progress'
  | 'answered'
  | 'skipped'
  | 'flagged';

export type GradeLevel = 'fail' | 'pass' | 'merit' | 'distinction';
export type ScoreConfidence = 'high' | 'medium' | 'low';
export type VerificationMethod = 'password' | 'biometric' | 'photo' | 'none';
export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type VerificationStatus = 'pending' | 'verified' | 'expired';
export type SyncStatus = 'pending' | 'processing' | 'validated' | 'invalid' | 'completed' | 'failed';

export type SessionEventType =
  | 'session_start'
  | 'session_end'
  | 'question_view'
  | 'question_answer'
  | 'question_skip'
  | 'question_flag'
  | 'question_unflag'
  | 'pause'
  | 'resume'
  | 'break_start'
  | 'break_end'
  | 'focus_lost'
  | 'focus_gained'
  | 'copy_attempt'
  | 'paste_attempt'
  | 'tab_switch'
  | 'window_resize'
  | 'submit'
  | 'timeout'
  | 'abandon'
  | 'integrity_flag'
  | 'offline_start'
  | 'offline_sync'
  | 'identity_verified'
  | 'accommodation_applied';

// ========== Checkpoint Definition ==========

export interface Checkpoint {
  id: string;
  community_id: string;
  lesson_id?: string;
  module_id?: string;
  course_id?: string;
  title: string;
  description?: string;
  checkpoint_type: CheckpointType;
  is_timed: boolean;
  time_limit_minutes?: number;
  allow_pause: boolean;
  max_attempts?: number;
  cooldown_hours?: number;
  show_correct_answers: boolean;
  passing_score: number;
  merit_score?: number;
  distinction_score?: number;
  question_count?: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  require_identity_verification: boolean;
  monitor_integrity: boolean;
  prevent_copy_paste: boolean;
  require_camera: boolean;
  lockdown_browser: boolean;
  allow_offline: boolean;
  offline_pre_download: boolean;
  allow_extended_time: boolean;
  extended_time_multiplier?: number;
  allow_breaks: boolean;
  max_break_minutes?: number;
  text_to_speech: boolean;
  high_contrast_mode: boolean;
  status: CheckpointStatus;
  metadata: Record<string, any>;
  created_by: string;
  updated_by?: string;
  created_at: Date;
  updated_at: Date;
  published_at?: Date;
}

export interface CheckpointQuestion {
  id: string;
  checkpoint_id: string;
  question_id: string;
  display_order: number;
  weight: number;
  is_required: boolean;
  created_at: Date;
}

// ========== Accessibility Profile ==========

export interface LearnerAccessibilityProfile {
  id: string;
  user_id: string;
  extended_time_enabled: boolean;
  time_multiplier: number;
  extended_time_reason?: string;
  extended_time_approved_by?: string;
  extended_time_approved_at?: Date;
  breaks_enabled: boolean;
  break_frequency_minutes?: number;
  break_duration_minutes?: number;
  high_contrast: boolean;
  large_text: boolean;
  font_size_adjustment: number;
  reduce_motion: boolean;
  screen_reader_mode: boolean;
  text_to_speech: boolean;
  speech_rate: number;
  voice_input: boolean;
  alternative_keyboard: boolean;
  switch_access: boolean;
  preferred_formats: string[];
  oral_examination: boolean;
  accommodation_notes?: string;
  documentation: Record<string, any>;
  verification_status: VerificationStatus;
  verified_at?: Date;
  expires_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface AccessibilityAccommodations {
  extended_time?: {
    enabled: boolean;
    multiplier: number;
  };
  breaks?: {
    enabled: boolean;
    frequency_minutes?: number;
    duration_minutes?: number;
  };
  visual?: {
    high_contrast: boolean;
    large_text: boolean;
    font_size_adjustment: number;
    reduce_motion: boolean;
  };
  audio?: {
    screen_reader_mode: boolean;
    text_to_speech: boolean;
    speech_rate: number;
  };
  input?: {
    voice_input: boolean;
    alternative_keyboard: boolean;
    switch_access: boolean;
  };
  format_preferences?: string[];
}

// ========== Session ==========

export interface CheckpointSession {
  id: string;
  checkpoint_id: string;
  user_id: string;
  community_id: string;
  attempt_number: number;
  status: SessionStatus;
  identity_verified: boolean;
  verification_method?: VerificationMethod;
  verified_at?: Date;
  started_at?: Date;
  ended_at?: Date;
  time_limit_seconds?: number;
  time_elapsed_seconds: number;
  time_remaining_seconds?: number;
  breaks_taken: number;
  total_break_seconds: number;
  break_started_at?: Date;
  questions_total: number;
  questions_answered: number;
  questions_skipped: number;
  current_question_index: number;
  score?: number;
  max_score?: number;
  score_percentage?: number;
  grade?: GradeLevel;
  passed?: boolean;
  is_offline: boolean;
  offline_started_at?: Date;
  synced_at?: Date;
  offline_checksum?: string;
  sync_validated?: boolean;
  device_id?: string;
  device_type?: DeviceType;
  browser?: string;
  os?: string;
  ip_address?: string;
  geo_location?: { x: number; y: number };
  accommodations_applied: AccessibilityAccommodations;
  integrity_flagged: boolean;
  integrity_flags: string[];
  integrity_notes?: string;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface CheckpointResponse {
  id: string;
  session_id: string;
  question_id: string;
  question_order: number;
  response_data: Record<string, any>;
  text_response?: string;
  selected_options: string[];
  matching_pairs?: Record<string, string>;
  ordering?: string[];
  file_submission_id?: string;
  audio_response_url?: string;
  status: ResponseStatus;
  flagged_for_review: boolean;
  first_viewed_at?: Date;
  answered_at?: Date;
  time_spent_seconds: number;
  points_earned?: number;
  points_possible: number;
  is_correct?: boolean;
  partial_credit?: number;
  feedback?: string;
  score_confidence?: ScoreConfidence;
  requires_human_review: boolean;
  reviewed_by?: string;
  reviewed_at?: Date;
  synced: boolean;
  offline_answered_at?: Date;
  response_checksum?: string;
  created_at: Date;
  updated_at: Date;
}

// ========== Session Events ==========

export interface CheckpointSessionEvent {
  id: string;
  session_id: string;
  event_type: SessionEventType;
  event_data: Record<string, any>;
  question_id?: string;
  source?: string;
  ip_address?: string;
  user_agent?: string;
  is_suspicious: boolean;
  suspicion_reason?: string;
  occurred_at: Date;
  client_timestamp?: number;
}

// ========== Sync ==========

export interface CheckpointSyncQueueItem {
  id: string;
  session_id: string;
  user_id: string;
  device_id?: string;
  session_data: Partial<CheckpointSession>;
  responses_data: Partial<CheckpointResponse>[];
  events_data: Partial<CheckpointSessionEvent>[];
  data_checksum: string;
  client_timestamp: number;
  client_timezone_offset?: number;
  status: SyncStatus;
  retry_count: number;
  error_message?: string;
  received_at: Date;
  processed_at?: Date;
  completed_at?: Date;
}

// ========== Analytics ==========

export interface CheckpointAnalytics {
  id: string;
  checkpoint_id: string;
  community_id: string;
  analytics_date: Date;
  total_attempts: number;
  completed_attempts: number;
  abandoned_attempts: number;
  timed_out_attempts: number;
  passed_count: number;
  failed_count: number;
  merit_count: number;
  distinction_count: number;
  pass_rate?: number;
  avg_score?: number;
  min_score?: number;
  max_score?: number;
  median_score?: number;
  std_dev_score?: number;
  avg_duration_seconds?: number;
  min_duration_seconds?: number;
  max_duration_seconds?: number;
  integrity_flags_count: number;
  flagged_sessions_count: number;
  offline_attempts: number;
  offline_sync_success: number;
  offline_sync_failed: number;
  extended_time_used: number;
  breaks_used: number;
  created_at: Date;
  updated_at: Date;
}

// ========== DTOs ==========

export interface CreateCheckpointDto {
  community_id: string;
  lesson_id?: string;
  module_id?: string;
  course_id?: string;
  title: string;
  description?: string;
  checkpoint_type?: CheckpointType;
  is_timed?: boolean;
  time_limit_minutes?: number;
  allow_pause?: boolean;
  max_attempts?: number;
  cooldown_hours?: number;
  show_correct_answers?: boolean;
  passing_score?: number;
  merit_score?: number;
  distinction_score?: number;
  question_count?: number;
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
  require_identity_verification?: boolean;
  monitor_integrity?: boolean;
  prevent_copy_paste?: boolean;
  require_camera?: boolean;
  lockdown_browser?: boolean;
  allow_offline?: boolean;
  offline_pre_download?: boolean;
  allow_extended_time?: boolean;
  extended_time_multiplier?: number;
  allow_breaks?: boolean;
  max_break_minutes?: number;
  text_to_speech?: boolean;
  high_contrast_mode?: boolean;
}

export interface UpdateCheckpointDto extends Partial<CreateCheckpointDto> {
  status?: CheckpointStatus;
}

export interface StartSessionDto {
  checkpoint_id: string;
  device_id?: string;
  device_type?: DeviceType;
  browser?: string;
  os?: string;
  offline_mode?: boolean;
}

export interface VerifyIdentityDto {
  session_id: string;
  method: VerificationMethod;
  credentials?: Record<string, any>;
}

export interface SubmitResponseDto {
  session_id: string;
  question_id: string;
  response_data?: Record<string, any>;
  text_response?: string;
  selected_options?: string[];
  matching_pairs?: Record<string, string>;
  ordering?: string[];
  file_submission_id?: string;
  audio_response_url?: string;
  flagged_for_review?: boolean;
  time_spent_seconds?: number;
  offline_timestamp?: number;
}

export interface SubmitSessionDto {
  session_id: string;
  client_timestamp?: number;
  offline_checksum?: string;
}

export interface SyncOfflineSessionDto {
  session_id: string;
  session_data: Partial<CheckpointSession>;
  responses_data: Partial<CheckpointResponse>[];
  events_data: Partial<CheckpointSessionEvent>[];
  data_checksum: string;
  client_timestamp: number;
  client_timezone_offset?: number;
}

export interface RecordEventDto {
  session_id: string;
  event_type: SessionEventType;
  event_data?: Record<string, any>;
  question_id?: string;
  client_timestamp?: number;
}

export interface UpdateAccessibilityProfileDto {
  extended_time_enabled?: boolean;
  time_multiplier?: number;
  extended_time_reason?: string;
  breaks_enabled?: boolean;
  break_frequency_minutes?: number;
  break_duration_minutes?: number;
  high_contrast?: boolean;
  large_text?: boolean;
  font_size_adjustment?: number;
  reduce_motion?: boolean;
  screen_reader_mode?: boolean;
  text_to_speech?: boolean;
  speech_rate?: number;
  voice_input?: boolean;
  alternative_keyboard?: boolean;
  switch_access?: boolean;
  preferred_formats?: string[];
  oral_examination?: boolean;
  accommodation_notes?: string;
}

// ========== Response Types ==========

export interface SessionWithQuestions extends CheckpointSession {
  checkpoint: Checkpoint;
  questions: Array<{
    question_id: string;
    question_order: number;
    weight: number;
    is_required: boolean;
    question_data?: Record<string, any>;
  }>;
  responses: CheckpointResponse[];
}

export interface SessionSummary {
  session_id: string;
  checkpoint_id: string;
  checkpoint_title: string;
  status: SessionStatus;
  score?: number;
  score_percentage?: number;
  grade?: GradeLevel;
  passed?: boolean;
  started_at?: Date;
  ended_at?: Date;
  time_elapsed_seconds: number;
  questions_total: number;
  questions_answered: number;
}

export interface SessionResult {
  session_id: string;
  checkpoint_id: string;
  score: number;
  max_score: number;
  score_percentage: number;
  grade: GradeLevel;
  passed: boolean;
  feedback: {
    overall: string;
    strengths: string[];
    improvements: string[];
    recommendations: string[];
  };
  question_results: Array<{
    question_id: string;
    points_earned: number;
    points_possible: number;
    is_correct: boolean;
    feedback?: string;
  }>;
}

export interface IntegrityReport {
  session_id: string;
  flagged: boolean;
  flags: Array<{
    type: string;
    description: string;
    occurred_at: Date;
    severity: 'low' | 'medium' | 'high';
  }>;
  suspicious_events: CheckpointSessionEvent[];
  recommendation: 'accept' | 'review' | 'reject';
}
