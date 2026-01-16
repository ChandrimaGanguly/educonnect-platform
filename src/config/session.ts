import { getRedisClient } from './redis';

export interface SessionData {
  userId: string;
  email: string;
  username: string;
  roles?: string[];
  permissions?: string[];
  metadata?: Record<string, any>;
}

export interface SessionConfig {
  maxAge?: number; // in milliseconds
  prefix?: string;
}

export class SessionService {
  private redis = getRedisClient();
  private sessionPrefix = 'educonnect:session:';
  private userSessionsPrefix = 'educonnect:user-sessions:';
  private defaultMaxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  /**
   * Create a new session
   * Uses a user-session index (Redis Set) to avoid KEYS enumeration
   */
  async create(sessionId: string, data: SessionData, config?: SessionConfig): Promise<void> {
    const key = this.getSessionKey(sessionId);
    const maxAge = config?.maxAge || this.defaultMaxAge;
    const ttl = Math.floor(maxAge / 1000); // Convert to seconds

    const sessionData = {
      ...data,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + maxAge).toISOString(),
    };

    // Use pipeline for atomic operation
    const pipeline = this.redis.pipeline();

    // Store session data
    pipeline.setex(key, ttl, JSON.stringify(sessionData));

    // Add session ID to user's session set
    const userSessionsKey = this.getUserSessionsKey(data.userId);
    pipeline.sadd(userSessionsKey, sessionId);

    // Set TTL on user's session set (slightly longer than session TTL)
    pipeline.expire(userSessionsKey, ttl + 3600); // +1 hour buffer

    await pipeline.exec();
  }

  /**
   * Get session data
   */
  async get(sessionId: string): Promise<(SessionData & { createdAt: string; expiresAt: string }) | null> {
    const key = this.getSessionKey(sessionId);
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data);
    } catch (error) {
      // Note: Logger will be passed via dependency injection in production
// For now, we silently fail to avoid breaking the session flow
      return null;
    }
  }

  /**
   * Update session data (extends TTL)
   */
  async update(sessionId: string, data: Partial<SessionData>, config?: SessionConfig): Promise<void> {
    const key = this.getSessionKey(sessionId);
    const existing = await this.get(sessionId);

    if (!existing) {
      throw new Error('Session not found');
    }

    const maxAge = config?.maxAge || this.defaultMaxAge;
    const ttl = Math.floor(maxAge / 1000);

    const sessionData = {
      ...existing,
      ...data,
      expiresAt: new Date(Date.now() + maxAge).toISOString(),
    };

    await this.redis.setex(key, ttl, JSON.stringify(sessionData));
  }

  /**
   * Refresh session (extend TTL without modifying data)
   */
  async refresh(sessionId: string, config?: SessionConfig): Promise<void> {
    const key = this.getSessionKey(sessionId);
    const maxAge = config?.maxAge || this.defaultMaxAge;
    const ttl = Math.floor(maxAge / 1000);

    const exists = await this.redis.exists(key);
    if (!exists) {
      throw new Error('Session not found');
    }

    await this.redis.expire(key, ttl);
  }

  /**
   * Delete a session
   * Also removes from user's session index
   */
  async destroy(sessionId: string): Promise<void> {
    const key = this.getSessionKey(sessionId);

    // Get session data to find userId
    const sessionData = await this.get(sessionId);

    if (sessionData) {
      const pipeline = this.redis.pipeline();

      // Delete session data
      pipeline.del(key);

      // Remove from user's session set
      const userSessionsKey = this.getUserSessionsKey(sessionData.userId);
      pipeline.srem(userSessionsKey, sessionId);

      await pipeline.exec();
    } else {
      // Session doesn't exist, just delete the key
      await this.redis.del(key);
    }
  }

  /**
   * Delete all sessions for a user
   * Uses user-session index (O(N) where N = sessions per user, not all sessions)
   *
   * SECURITY FIX: Replaced KEYS pattern with user-session index
   * - Prevents Redis blocking on large keyspaces
   * - Eliminates session enumeration vulnerability
   * - O(N) complexity where N is sessions per user (typically < 10)
   */
  async destroyAllForUser(userId: string): Promise<void> {
    const userSessionsKey = this.getUserSessionsKey(userId);

    // Get all session IDs for this user
    const sessionIds = await this.redis.smembers(userSessionsKey);

    if (sessionIds.length === 0) {
      return;
    }

    // Delete all sessions in a pipeline (atomic)
    const pipeline = this.redis.pipeline();

    sessionIds.forEach(sessionId => {
      const key = this.getSessionKey(sessionId);
      pipeline.del(key);
    });

    // Delete the user's session set
    pipeline.del(userSessionsKey);

    await pipeline.exec();
  }

  /**
   * Check if session exists
   */
  async exists(sessionId: string): Promise<boolean> {
    const key = this.getSessionKey(sessionId);
    const result = await this.redis.exists(key);
    return result === 1;
  }

  /**
   * Get remaining TTL for a session in seconds
   */
  async getTTL(sessionId: string): Promise<number> {
    const key = this.getSessionKey(sessionId);
    return await this.redis.ttl(key);
  }

  /**
   * Get all active session IDs for a user
   * Uses user-session index for O(N) performance where N = sessions per user
   *
   * SECURITY FIX: Replaced KEYS pattern with user-session index
   */
  async getAllForUser(userId: string): Promise<string[]> {
    const userSessionsKey = this.getUserSessionsKey(userId);

    // Get all session IDs from the user's session set
    const sessionIds = await this.redis.smembers(userSessionsKey);

    // Filter out expired sessions (cleanup)
    const validSessionIds: string[] = [];
    const expiredSessionIds: string[] = [];

    for (const sessionId of sessionIds) {
      const exists = await this.exists(sessionId);
      if (exists) {
        validSessionIds.push(sessionId);
      } else {
        expiredSessionIds.push(sessionId);
      }
    }

    // Clean up expired sessions from the set
    if (expiredSessionIds.length > 0) {
      await this.redis.srem(userSessionsKey, ...expiredSessionIds);
    }

    return validSessionIds;
  }

  /**
   * Get session key with prefix
   */
  private getSessionKey(sessionId: string): string {
    return `${this.sessionPrefix}${sessionId}`;
  }

  /**
   * Get user sessions set key with prefix
   */
  private getUserSessionsKey(userId: string): string {
    return `${this.userSessionsPrefix}${userId}`;
  }
}

// Export singleton instance
export const sessionService = new SessionService();
