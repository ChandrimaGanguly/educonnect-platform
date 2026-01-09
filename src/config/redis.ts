import Redis, { RedisOptions } from 'ioredis';

export interface RedisConfig extends RedisOptions {
  url?: string;
  keyPrefix?: string;
}

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisPassword = process.env.REDIS_PASSWORD;

export const redisConfig: RedisConfig = {
  url: redisUrl,
  password: redisPassword || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  maxRetriesPerRequest: 3,
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError(err: Error) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      // Reconnect when Redis is in readonly mode
      return true;
    }
    return false;
  },
};

// Singleton Redis client instances
let redisClient: Redis | null = null;
let redisSubscriber: Redis | null = null;
let redisPublisher: Redis | null = null;

/**
 * Get the main Redis client for caching and general operations
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(redisConfig);

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Redis Client connected');
    });
  }

  return redisClient;
}

/**
 * Get Redis subscriber for pub/sub operations
 */
export function getRedisSubscriber(): Redis {
  if (!redisSubscriber) {
    redisSubscriber = new Redis(redisConfig);

    redisSubscriber.on('error', (err) => {
      console.error('Redis Subscriber Error:', err);
    });

    redisSubscriber.on('connect', () => {
      console.log('Redis Subscriber connected');
    });
  }

  return redisSubscriber;
}

/**
 * Get Redis publisher for pub/sub operations
 */
export function getRedisPublisher(): Redis {
  if (!redisPublisher) {
    redisPublisher = new Redis(redisConfig);

    redisPublisher.on('error', (err) => {
      console.error('Redis Publisher Error:', err);
    });

    redisPublisher.on('connect', () => {
      console.log('Redis Publisher connected');
    });
  }

  return redisPublisher;
}

/**
 * Close all Redis connections
 */
export async function closeRedis(): Promise<void> {
  const closePromises: Promise<void>[] = [];

  if (redisClient) {
    closePromises.push(redisClient.quit().then(() => { redisClient = null; }));
  }

  if (redisSubscriber) {
    closePromises.push(redisSubscriber.quit().then(() => { redisSubscriber = null; }));
  }

  if (redisPublisher) {
    closePromises.push(redisPublisher.quit().then(() => { redisPublisher = null; }));
  }

  await Promise.all(closePromises);
}

/**
 * Health check for Redis connection
 */
export async function redisHealthCheck(): Promise<boolean> {
  try {
    const client = getRedisClient();
    await client.ping();
    return true;
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}

export default getRedisClient;
