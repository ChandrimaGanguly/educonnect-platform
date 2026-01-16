import { getRedisClient } from './redis';
import { logger } from './logger';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

export class CacheService {
  private redis = getRedisClient();
  private defaultTTL = 3600; // 1 hour default
  private keyPrefix = 'educonnect:';

  /**
   * Set a value in cache
   */
  async set(key: string, value: any, options?: CacheOptions): Promise<void> {
    const fullKey = this.getKey(key, options?.prefix);
    const ttl = options?.ttl || this.defaultTTL;
    const serialized = JSON.stringify(value);

    await this.redis.setex(fullKey, ttl, serialized);
  }

  /**
   * Get a value from cache
   */
  async get<T = any>(key: string, options?: CacheOptions): Promise<T | null> {
    const fullKey = this.getKey(key, options?.prefix);
    const value = await this.redis.get(fullKey);

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      logger.warn({ error, key }, 'Failed to parse cached value');
      return null;
    }
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string, options?: CacheOptions): Promise<void> {
    const fullKey = this.getKey(key, options?.prefix);
    await this.redis.del(fullKey);
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string, options?: CacheOptions): Promise<void> {
    const fullPattern = this.getKey(pattern, options?.prefix);
    const keys = await this.redis.keys(fullPattern);

    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string, options?: CacheOptions): Promise<boolean> {
    const fullKey = this.getKey(key, options?.prefix);
    const result = await this.redis.exists(fullKey);
    return result === 1;
  }

  /**
   * Set expiration on a key
   */
  async expire(key: string, ttl: number, options?: CacheOptions): Promise<void> {
    const fullKey = this.getKey(key, options?.prefix);
    await this.redis.expire(fullKey, ttl);
  }

  /**
   * Increment a counter
   */
  async increment(key: string, amount: number = 1, options?: CacheOptions): Promise<number> {
    const fullKey = this.getKey(key, options?.prefix);
    return await this.redis.incrby(fullKey, amount);
  }

  /**
   * Decrement a counter
   */
  async decrement(key: string, amount: number = 1, options?: CacheOptions): Promise<number> {
    const fullKey = this.getKey(key, options?.prefix);
    return await this.redis.decrby(fullKey, amount);
  }

  /**
   * Get or set pattern - get from cache, or compute and cache if not found
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const cached = await this.get<T>(key, options);

    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Clear all cache (use with caution)
   */
  async clearAll(): Promise<void> {
    const keys = await this.redis.keys(`${this.keyPrefix}*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * Get full cache key with prefix
   */
  private getKey(key: string, prefix?: string): string {
    if (prefix) {
      return `${this.keyPrefix}${prefix}:${key}`;
    }
    return `${this.keyPrefix}${key}`;
  }
}

// Export singleton instance
export const cacheService = new CacheService();
