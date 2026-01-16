import { Knex } from 'knex';
import { getDatabase } from '../database';
import {
  CheckpointSession,
  SessionStatus,
  VerificationMethod,
  SessionEventType,
  CheckpointSessionEvent,
  StartSessionDto,
  VerifyIdentityDto,
  RecordEventDto,
  SessionWithQuestions,
  SessionSummary,
  AccessibilityAccommodations,
} from '../types/checkpoint.types';
import { CheckpointTypesService } from './checkpoint-types.service';

/**
 * Checkpoint Session Service
 *
 * Manages checkpoint session lifecycle including:
 * - Session initialization and start
 * - Pause/resume functionality
 * - Break management
 * - Timer tracking
 * - Identity verification
 * - Integrity monitoring
 * - Offline sync
 *
 * Implements requirements from Phase 1 Group E (E3):
 * - Session state management
 * - Timer enforcement
 * - Integrity logging
 * - Accessibility accommodation application
 */
export class CheckpointSessionService {
  private db: Knex;
  private checkpointTypesService: CheckpointTypesService;

  constructor(db?: Knex) {
    this.db = db || getDatabase();
    this.checkpointTypesService = new CheckpointTypesService();
  }

  // ========== Session Creation and Initialization ==========

  /**
   * Create and initialize a new checkpoint session
   */
  async createSession(
    userId: string,
    checkpointId: string,
    data: StartSessionDto
  ): Promise<CheckpointSession> {
    // Get checkpoint details
    const checkpoint = await this.checkpointTypesService.getCheckpoint(checkpointId);
    if (!checkpoint) {
      throw new Error('Checkpoint not found');
    }

    // Check if checkpoint is active
    if (checkpoint.status !== 'active') {
      throw new Error('Checkpoint is not active');
    }

    // Check if checkpoint has time windows
    const now = new Date();
    if (checkpoint.opens_at && new Date(checkpoint.opens_at) > now) {
      throw new Error('Checkpoint is not yet open');
    }
    if (checkpoint.closes_at && new Date(checkpoint.closes_at) < now) {
      throw new Error('Checkpoint is closed');
    }

    // Check attempt limits
    if (checkpoint.max_attempts) {
      const previousAttempts = await this.db('checkpoint_sessions')
        .where({
          user_id: userId,
          checkpoint_id: checkpointId,
        })
        .whereNotIn('status', ['abandoned', 'invalidated'])
        .count('* as count')
        .first();

      const attemptCount = Number(previousAttempts?.count || 0);
      if (attemptCount >= checkpoint.max_attempts) {
        throw new Error(`Maximum attempts (${checkpoint.max_attempts}) reached`);
      }
    }

    // Check cooldown period
    if (checkpoint.cooldown_hours) {
      const lastAttempt = await this.db('checkpoint_sessions')
        .where({
          user_id: userId,
          checkpoint_id: checkpointId,
        })
        .orderBy('created_at', 'desc')
        .first();

      if (lastAttempt) {
        const cooldownEnd = new Date(lastAttempt.created_at);
        cooldownEnd.setHours(cooldownEnd.getHours() + checkpoint.cooldown_hours);
        if (cooldownEnd > now) {
          throw new Error(`Cooldown period in effect until ${cooldownEnd.toISOString()}`);
        }
      }
    }

    // Get user's accessibility accommodations
    let accommodations: AccessibilityAccommodations = {};
    const userAccommodation = await this.checkpointTypesService.getAccommodation(
      userId,
      checkpoint.community_id
    );

    if (userAccommodation && userAccommodation.is_approved) {
      accommodations = {
        extended_time: userAccommodation.extended_time
          ? {
              enabled: true,
              multiplier: userAccommodation.time_multiplier,
            }
          : undefined,
        breaks: userAccommodation.break_allowances
          ? {
              enabled: true,
              frequency_minutes: userAccommodation.break_frequency_minutes ?? undefined,
              duration_minutes: userAccommodation.break_duration_minutes ?? undefined,
            }
          : undefined,
        visual: {
          high_contrast: userAccommodation.high_contrast_mode,
          large_text: userAccommodation.large_text,
          font_size_adjustment: userAccommodation.font_size_percentage,
          reduce_motion: false,
        },
        audio: {
          screen_reader_mode: userAccommodation.screen_reader_support,
          text_to_speech: userAccommodation.text_to_speech,
          speech_rate: 1.0,
        },
        input: {
          voice_input: userAccommodation.alternative_input,
          alternative_keyboard: userAccommodation.alternative_input,
          switch_access: userAccommodation.alternative_input,
        },
        format_preferences: userAccommodation.preferred_formats,
      };
    }

    // Calculate time limit with accommodations
    let timeLimitSeconds: number | null = null;
    if (checkpoint.time_limit_minutes) {
      timeLimitSeconds = checkpoint.time_limit_minutes * 60;
      if (accommodations.extended_time?.enabled) {
        timeLimitSeconds = Math.floor(
          timeLimitSeconds * accommodations.extended_time.multiplier
        );
      }
    }

    // Get questions for checkpoint
    const questions = await this.checkpointTypesService.getCheckpointQuestions(checkpointId);

    // Count previous attempts
    const attemptNumber = await this.getNextAttemptNumber(userId, checkpointId);

    // Create session
    const [session] = await this.db('checkpoint_sessions')
      .insert({
        user_id: userId,
        checkpoint_id: checkpointId,
        community_id: checkpoint.community_id,
        attempt_number: attemptNumber,
        status: 'initializing',
        time_limit_seconds: timeLimitSeconds,
        time_elapsed_seconds: 0,
        time_remaining_seconds: timeLimitSeconds,
        breaks_taken: 0,
        total_break_seconds: 0,
        questions_total: questions.length,
        questions_answered: 0,
        questions_skipped: 0,
        current_question_index: 0,
        is_offline: data.offline_mode || false,
        device_id: data.device_id,
        device_type: data.device_type,
        browser: data.browser,
        os: data.os,
        accommodations_applied: accommodations,
        integrity_flagged: false,
        integrity_flags: [],
        metadata: {},
      })
      .returning('*');

    // Record session_start event
    await this.recordEvent({
      session_id: session.id,
      event_type: 'session_start',
      event_data: {
        checkpoint_id: checkpointId,
        device_id: data.device_id,
        device_type: data.device_type,
        offline_mode: data.offline_mode,
        accommodations_applied: Object.keys(accommodations).length > 0,
      },
    });

    return this.formatSession(session);
  }

  /**
   * Start a checkpoint session (move from initializing to in_progress)
   */
  async startSession(sessionId: string): Promise<CheckpointSession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'initializing') {
      throw new Error('Session can only be started from initializing state');
    }

    const now = new Date();
    const [updated] = await this.db('checkpoint_sessions')
      .where({ id: sessionId })
      .update({
        status: 'in_progress',
        started_at: now,
        updated_at: now,
      })
      .returning('*');

    // Record event
    await this.recordEvent({
      session_id: sessionId,
      event_type: 'session_start',
      event_data: {
        started_at: now.toISOString(),
      },
    });

    return this.formatSession(updated);
  }

  // ========== Session State Management ==========

  /**
   * Pause a checkpoint session
   */
  async pauseSession(sessionId: string): Promise<CheckpointSession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'in_progress') {
      throw new Error('Can only pause sessions in progress');
    }

    // Check if pause is allowed
    const checkpoint = await this.checkpointTypesService.getCheckpoint(
      session.checkpoint_id
    );
    if (!checkpoint?.allow_pause) {
      throw new Error('Pausing is not allowed for this checkpoint');
    }

    // Update time elapsed
    const timeElapsed = this.calculateTimeElapsed(session);

    const now = new Date();
    const [updated] = await this.db('checkpoint_sessions')
      .where({ id: sessionId })
      .update({
        status: 'paused',
        time_elapsed_seconds: timeElapsed,
        time_remaining_seconds: session.time_limit_seconds
          ? session.time_limit_seconds - timeElapsed
          : null,
        updated_at: now,
      })
      .returning('*');

    await this.recordEvent({
      session_id: sessionId,
      event_type: 'pause',
      event_data: {
        time_elapsed: timeElapsed,
        paused_at: now.toISOString(),
      },
    });

    return this.formatSession(updated);
  }

  /**
   * Resume a paused session
   */
  async resumeSession(sessionId: string): Promise<CheckpointSession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'paused') {
      throw new Error('Can only resume paused sessions');
    }

    const now = new Date();
    const [updated] = await this.db('checkpoint_sessions')
      .where({ id: sessionId })
      .update({
        status: 'in_progress',
        started_at: now, // Reset started_at to current time for accurate time tracking
        updated_at: now,
      })
      .returning('*');

    await this.recordEvent({
      session_id: sessionId,
      event_type: 'resume',
      event_data: {
        resumed_at: now.toISOString(),
        time_remaining: updated.time_remaining_seconds,
      },
    });

    return this.formatSession(updated);
  }

  /**
   * Start a break
   */
  async startBreak(sessionId: string): Promise<CheckpointSession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'in_progress') {
      throw new Error('Can only take breaks during active sessions');
    }

    // Check if breaks are allowed
    const accommodations = session.accommodations_applied as AccessibilityAccommodations;
    if (!accommodations?.breaks?.enabled) {
      throw new Error('Breaks are not enabled for this session');
    }

    // Update time elapsed
    const timeElapsed = this.calculateTimeElapsed(session);

    const now = new Date();
    const [updated] = await this.db('checkpoint_sessions')
      .where({ id: sessionId })
      .update({
        status: 'on_break',
        time_elapsed_seconds: timeElapsed,
        break_started_at: now,
        updated_at: now,
      })
      .returning('*');

    await this.recordEvent({
      session_id: sessionId,
      event_type: 'break_start',
      event_data: {
        break_number: session.breaks_taken + 1,
        time_elapsed: timeElapsed,
      },
    });

    return this.formatSession(updated);
  }

  /**
   * End a break
   */
  async endBreak(sessionId: string): Promise<CheckpointSession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'on_break') {
      throw new Error('Session is not on break');
    }

    if (!session.break_started_at) {
      throw new Error('Break start time not found');
    }

    // Calculate break duration
    const breakDuration = Math.floor(
      (Date.now() - new Date(session.break_started_at).getTime()) / 1000
    );

    const now = new Date();
    const [updated] = await this.db('checkpoint_sessions')
      .where({ id: sessionId })
      .update({
        status: 'in_progress',
        started_at: now, // Reset started_at for time tracking
        breaks_taken: session.breaks_taken + 1,
        total_break_seconds: session.total_break_seconds + breakDuration,
        break_started_at: null,
        updated_at: now,
      })
      .returning('*');

    await this.recordEvent({
      session_id: sessionId,
      event_type: 'break_end',
      event_data: {
        break_duration_seconds: breakDuration,
        total_break_seconds: updated.total_break_seconds,
      },
    });

    return this.formatSession(updated);
  }

  // ========== Session Submission ==========

  /**
   * Submit a checkpoint session for scoring
   */
  async submitSession(sessionId: string, userId: string): Promise<CheckpointSession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.user_id !== userId) {
      throw new Error('Unauthorized: Session does not belong to user');
    }

    if (!['in_progress', 'paused'].includes(session.status)) {
      throw new Error('Can only submit sessions that are in progress or paused');
    }

    // Calculate final time elapsed
    const timeElapsed = this.calculateTimeElapsed(session);

    // Check if all required questions are answered
    const answeredCount = await this.db('checkpoint_responses')
      .where({ session_id: sessionId })
      .whereNot('status', 'not_viewed')
      .count('* as count')
      .first();

    const now = new Date();
    const [updated] = await this.db('checkpoint_sessions')
      .where({ id: sessionId })
      .update({
        status: 'submitted',
        ended_at: now,
        time_elapsed_seconds: timeElapsed,
        questions_answered: Number(answeredCount?.count || 0),
        updated_at: now,
      })
      .returning('*');

    await this.recordEvent({
      session_id: sessionId,
      event_type: 'submit',
      event_data: {
        submitted_at: now.toISOString(),
        time_elapsed: timeElapsed,
        questions_answered: updated.questions_answered,
        questions_total: session.questions_total,
      },
    });

    return this.formatSession(updated);
  }

  /**
   * Abandon a session (timeout or user abandonment)
   */
  async abandonSession(sessionId: string, reason: 'timeout' | 'user'): Promise<CheckpointSession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const timeElapsed = this.calculateTimeElapsed(session);

    const now = new Date();
    const [updated] = await this.db('checkpoint_sessions')
      .where({ id: sessionId })
      .update({
        status: reason === 'timeout' ? 'timed_out' : 'abandoned',
        ended_at: now,
        time_elapsed_seconds: timeElapsed,
        updated_at: now,
      })
      .returning('*');

    await this.recordEvent({
      session_id: sessionId,
      event_type: reason === 'timeout' ? 'timeout' : 'abandon',
      event_data: {
        reason,
        time_elapsed: timeElapsed,
      },
    });

    return this.formatSession(updated);
  }

  // ========== Identity Verification ==========

  /**
   * Verify user identity for a session
   */
  async verifyIdentity(data: VerifyIdentityDto, userId: string): Promise<CheckpointSession> {
    const session = await this.getSession(data.session_id);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    // TODO: Implement actual verification logic based on method
    // For now, just mark as verified

    const now = new Date();
    const [updated] = await this.db('checkpoint_sessions')
      .where({ id: data.session_id })
      .update({
        identity_verified: true,
        verification_method: data.method,
        verified_at: now,
        updated_at: now,
      })
      .returning('*');

    await this.recordEvent({
      session_id: data.session_id,
      event_type: 'identity_verified',
      event_data: {
        method: data.method,
        verified_at: now.toISOString(),
      },
    });

    return this.formatSession(updated);
  }

  // ========== Integrity Monitoring ==========

  /**
   * Record a session event for integrity monitoring
   */
  async recordEvent(data: RecordEventDto): Promise<CheckpointSessionEvent> {
    const eventData: Partial<CheckpointSessionEvent> = {
      session_id: data.session_id,
      event_type: data.event_type,
      event_data: data.event_data || {},
      question_id: data.question_id,
      client_timestamp: data.client_timestamp,
      occurred_at: new Date(),
      is_suspicious: false,
    };

    // Check for suspicious events
    if (this.isSuspiciousEvent(data.event_type)) {
      eventData.is_suspicious = true;
      eventData.suspicion_reason = this.getSuspicionReason(data.event_type);

      // Flag session if suspicious
      await this.flagSession(data.session_id, data.event_type);
    }

    const [event] = await this.db('checkpoint_session_events')
      .insert(eventData)
      .returning('*');

    return event;
  }

  /**
   * Flag a session for integrity review
   */
  async flagSession(sessionId: string, reason: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    const integrityFlags = [...session.integrity_flags, reason];

    await this.db('checkpoint_sessions')
      .where({ id: sessionId })
      .update({
        integrity_flagged: true,
        integrity_flags: integrityFlags,
        updated_at: new Date(),
      });
  }

  // ========== Session Queries ==========

  /**
   * Get a session by ID
   */
  async getSession(sessionId: string): Promise<CheckpointSession | null> {
    const session = await this.db('checkpoint_sessions')
      .where({ id: sessionId })
      .first();

    return session ? this.formatSession(session) : null;
  }

  /**
   * Get session with questions and responses
   */
  async getSessionWithQuestions(sessionId: string): Promise<SessionWithQuestions | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    const checkpoint = await this.checkpointTypesService.getCheckpoint(
      session.checkpoint_id
    );
    if (!checkpoint) return null;

    const questions = await this.checkpointTypesService.getCheckpointQuestions(
      session.checkpoint_id
    );

    const responses = await this.db('checkpoint_responses')
      .where({ session_id: sessionId })
      .orderBy('question_order', 'asc');

    return {
      ...session,
      checkpoint,
      questions: questions.map((q) => ({
        question_id: q.question_id,
        question_order: q.display_order,
        weight: q.weight,
        is_required: q.is_required,
      })),
      responses: responses.map((r: any) => ({
        ...r,
        response_data:
          typeof r.response_data === 'string'
            ? JSON.parse(r.response_data)
            : r.response_data,
        selected_options: r.selected_options || [],
        matching_pairs:
          typeof r.matching_pairs === 'string'
            ? JSON.parse(r.matching_pairs)
            : r.matching_pairs,
        ordering: r.ordering || [],
      })),
    };
  }

  /**
   * Get user's sessions for a checkpoint
   */
  async getUserSessions(
    userId: string,
    checkpointId?: string,
    options?: {
      status?: SessionStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ sessions: SessionSummary[]; total: number }> {
    const { limit = 50, offset = 0, status } = options || {};

    let query = this.db('checkpoint_sessions')
      .where({ user_id: userId });

    if (checkpointId) {
      query = query.where({ checkpoint_id: checkpointId });
    }

    if (status) {
      query = query.where({ status });
    }

    const [{ count }] = await query.clone().count('* as count');

    const sessions = await query
      .select('*')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const summaries: SessionSummary[] = sessions.map((s: any) => ({
      session_id: s.id,
      checkpoint_id: s.checkpoint_id,
      checkpoint_title: 'Checkpoint', // TODO: Join with checkpoint to get title
      status: s.status,
      score: s.score,
      score_percentage: s.score_percentage,
      grade: s.grade,
      passed: s.passed,
      started_at: s.started_at,
      ended_at: s.ended_at,
      time_elapsed_seconds: s.time_elapsed_seconds,
      questions_total: s.questions_total,
      questions_answered: s.questions_answered,
    }));

    return {
      sessions: summaries,
      total: Number(count),
    };
  }

  /**
   * Get session progress
   */
  async getSessionProgress(sessionId: string): Promise<{
    session_id: string;
    status: SessionStatus;
    current_question_index: number;
    questions_total: number;
    questions_answered: number;
    questions_skipped: number;
    time_elapsed_seconds: number;
    time_remaining_seconds: number | null;
    completion_percentage: number;
  }> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const completionPercentage =
      session.questions_total > 0
        ? Math.round((session.questions_answered / session.questions_total) * 100)
        : 0;

    return {
      session_id: session.id,
      status: session.status,
      current_question_index: session.current_question_index,
      questions_total: session.questions_total,
      questions_answered: session.questions_answered,
      questions_skipped: session.questions_skipped,
      time_elapsed_seconds: session.time_elapsed_seconds,
      time_remaining_seconds: session.time_remaining_seconds,
      completion_percentage: completionPercentage,
    };
  }

  // ========== Helper Methods ==========

  /**
   * Get next attempt number for user/checkpoint
   */
  private async getNextAttemptNumber(userId: string, checkpointId: string): Promise<number> {
    const result = await this.db('checkpoint_sessions')
      .where({
        user_id: userId,
        checkpoint_id: checkpointId,
      })
      .max('attempt_number as max')
      .first();

    return (result?.max || 0) + 1;
  }

  /**
   * Calculate time elapsed for a session
   */
  private calculateTimeElapsed(session: CheckpointSession): number {
    if (!session.started_at) {
      return session.time_elapsed_seconds;
    }

    const startTime = new Date(session.started_at).getTime();
    const currentTime = Date.now();
    const sessionDuration = Math.floor((currentTime - startTime) / 1000);

    return session.time_elapsed_seconds + sessionDuration;
  }

  /**
   * Check if an event type is suspicious
   */
  private isSuspiciousEvent(eventType: SessionEventType): boolean {
    const suspiciousEvents: SessionEventType[] = [
      'copy_attempt',
      'paste_attempt',
      'tab_switch',
      'focus_lost',
    ];
    return suspiciousEvents.includes(eventType);
  }

  /**
   * Get suspicion reason for event type
   */
  private getSuspicionReason(eventType: SessionEventType): string {
    const reasons: Record<string, string> = {
      copy_attempt: 'User attempted to copy content',
      paste_attempt: 'User attempted to paste content',
      tab_switch: 'User switched browser tabs',
      focus_lost: 'Browser window lost focus',
    };
    return reasons[eventType] || 'Suspicious activity detected';
  }

  /**
   * Format session object
   */
  private formatSession(row: any): CheckpointSession {
    return {
      ...row,
      accommodations_applied:
        typeof row.accommodations_applied === 'string'
          ? JSON.parse(row.accommodations_applied)
          : row.accommodations_applied || {},
      integrity_flags: row.integrity_flags || [],
      metadata:
        typeof row.metadata === 'string'
          ? JSON.parse(row.metadata)
          : row.metadata || {},
      geo_location: row.geo_location
        ? typeof row.geo_location === 'string'
          ? JSON.parse(row.geo_location)
          : row.geo_location
        : undefined,
    };
  }
}
