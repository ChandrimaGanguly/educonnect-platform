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
  private defaultMaxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  /**
   * Create a new session
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

    await this.redis.setex(key, ttl, JSON.stringify(sessionData));
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
      console.error('Error parsing session data:', error);
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
   */
  async destroy(sessionId: string): Promise<void> {
    const key = this.getSessionKey(sessionId);
    await this.redis.del(key);
  }

  /**
   * Delete all sessions for a user
   */
  async destroyAllForUser(userId: string): Promise<void> {
    const pattern = `${this.sessionPrefix}*`;
    const keys = await this.redis.keys(pattern);

    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        try {
          const sessionData = JSON.parse(data);
          if (sessionData.userId === userId) {
            await this.redis.del(key);
          }
        } catch (error) {
          console.error('Error parsing session data for deletion:', error);
        }
      }
    }
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
   */
  async getAllForUser(userId: string): Promise<string[]> {
    const pattern = `${this.sessionPrefix}*`;
    const keys = await this.redis.keys(pattern);
    const sessionIds: string[] = [];

    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        try {
          const sessionData = JSON.parse(data);
          if (sessionData.userId === userId) {
            sessionIds.push(key.replace(this.sessionPrefix, ''));
          }
        } catch (error) {
          console.error('Error parsing session data:', error);
        }
      }
    }

    return sessionIds;
  }

  /**
   * Get session key with prefix
   */
  private getSessionKey(sessionId: string): string {
    return `${this.sessionPrefix}${sessionId}`;
  }
}

// Export singleton instance
export const sessionService = new SessionService();
