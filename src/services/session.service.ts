import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { SESSION } from '../config/constants';

export interface Session {
  id: string;
  user_id: string;
  session_token: string;
  refresh_token: string;
  device_info?: string;
  ip_address?: string;
  user_agent?: string;
  expires_at: Date;
  refresh_expires_at: Date;
  is_active: boolean;
  revoked_at?: Date;
  revocation_reason?: string;
  created_at: Date;
  last_activity_at: Date;
}

export interface CreateSessionData {
  userId: string;
  email: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class SessionService {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * Create a new session
   */
  async createSession(data: CreateSessionData): Promise<{
    session: Session;
    accessToken: string;
    refreshToken: string;
  }> {
    const sessionId = uuidv4();
    const accessToken = generateAccessToken(data.userId, data.email, sessionId);
    const refreshToken = generateRefreshToken(data.userId, data.email, sessionId);

    const expiresAt = new Date(Date.now() + SESSION.ACCESS_TOKEN_EXPIRY_MS);
    const refreshExpiresAt = new Date(Date.now() + SESSION.REFRESH_TOKEN_EXPIRY_MS);

    const [session] = await this.db('sessions')
      .insert({
        id: sessionId,
        user_id: data.userId,
        session_token: accessToken,
        refresh_token: refreshToken,
        device_info: data.deviceInfo,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        expires_at: expiresAt,
        refresh_expires_at: refreshExpiresAt,
        is_active: true,
      })
      .returning('*');

    return { session, accessToken, refreshToken };
  }

  /**
   * Find session by ID
   */
  async findById(sessionId: string): Promise<Session | null> {
    const session = await this.db('sessions').where({ id: sessionId }).first();
    return session || null;
  }

  /**
   * Find session by refresh token
   */
  async findByRefreshToken(refreshToken: string): Promise<Session | null> {
    const session = await this.db('sessions')
      .where({ refresh_token: refreshToken })
      .first();
    return session || null;
  }

  /**
   * Find all active sessions for a user
   */
  async findUserSessions(userId: string): Promise<Session[]> {
    return this.db('sessions')
      .where({ user_id: userId, is_active: true })
      .orderBy('last_activity_at', 'desc');
  }

  /**
   * Refresh a session
   */
  async refreshSession(
    sessionId: string,
    userId: string,
    email: string
  ): Promise<{
    session: Session;
    accessToken: string;
    refreshToken: string;
  }> {
    const newAccessToken = generateAccessToken(userId, email, sessionId);
    const newRefreshToken = generateRefreshToken(userId, email, sessionId);

    const expiresAt = new Date(Date.now() + SESSION.ACCESS_TOKEN_EXPIRY_MS);
    const refreshExpiresAt = new Date(Date.now() + SESSION.REFRESH_TOKEN_EXPIRY_MS);

    const [session] = await this.db('sessions')
      .where({ id: sessionId })
      .update({
        session_token: newAccessToken,
        refresh_token: newRefreshToken,
        expires_at: expiresAt,
        refresh_expires_at: refreshExpiresAt,
        last_activity_at: this.db.fn.now(),
      })
      .returning('*');

    return {
      session,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Update session activity
   */
  async updateActivity(sessionId: string): Promise<void> {
    await this.db('sessions')
      .where({ id: sessionId })
      .update({ last_activity_at: this.db.fn.now() });
  }

  /**
   * Revoke a session
   */
  async revokeSession(sessionId: string, reason?: string): Promise<void> {
    await this.db('sessions').where({ id: sessionId }).update({
      is_active: false,
      revoked_at: this.db.fn.now(),
      revocation_reason: reason,
    });
  }

  /**
   * Revoke a session atomically (only if owned by user)
   * Returns true if session was revoked, false if not found or not owned by user
   *
   * SECURITY FIX: Atomic check-and-revoke operation prevents TOCTOU race conditions
   */
  async revokeSessionIfOwned(
    sessionId: string,
    userId: string,
    reason?: string
  ): Promise<boolean> {
    const result = await this.db('sessions')
      .where({
        id: sessionId,
        user_id: userId,
        is_active: true,
      })
      .update({
        is_active: false,
        revoked_at: this.db.fn.now(),
        revocation_reason: reason,
      })
      .returning('*');

    return result.length > 0;
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeAllUserSessions(userId: string, except?: string): Promise<void> {
    const query = this.db('sessions').where({ user_id: userId });

    if (except) {
      query.whereNot({ id: except });
    }

    await query.update({
      is_active: false,
      revoked_at: this.db.fn.now(),
      revocation_reason: 'User logged out from all devices',
    });
  }

  /**
   * Check if session is valid
   */
  async isSessionValid(sessionId: string): Promise<boolean> {
    const session = await this.findById(sessionId);

    if (!session || !session.is_active) {
      return false;
    }

    if (new Date(session.expires_at) < new Date()) {
      await this.revokeSession(sessionId, 'Session expired');
      return false;
    }

    return true;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.db('sessions')
      .where('expires_at', '<', this.db.fn.now())
      .where({ is_active: true })
      .update({
        is_active: false,
        revoked_at: this.db.fn.now(),
        revocation_reason: 'Session expired',
      });

    return result;
  }
}

// Export singleton instance for consistent usage
export const sessionService = new SessionService();
