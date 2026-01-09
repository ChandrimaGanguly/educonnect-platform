import * as dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Define environment schema
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('3000'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Database
  DATABASE_URL: z.string().url(),
  DB_POOL_MIN: z.string().transform(Number).pipe(z.number()).default('2'),
  DB_POOL_MAX: z.string().transform(Number).pipe(z.number()).default('10'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().transform(Number).pipe(z.number()).default('0'),

  // Authentication
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  BCRYPT_ROUNDS: z.string().transform(Number).pipe(z.number().min(10).max(15)).default('12'),

  // Session
  SESSION_SECRET: z.string().min(32),
  SESSION_MAX_AGE: z.string().transform(Number).pipe(z.number()).default('86400000'),
  SESSION_COOKIE_SECURE: z.string().transform((val) => val === 'true').default('false'),

  // Rate Limiting
  RATE_LIMIT_MAX: z.string().transform(Number).pipe(z.number()).default('100'),
  RATE_LIMIT_WINDOW: z.string().transform(Number).pipe(z.number()).default('60000'),

  // Email
  SENDGRID_API_KEY: z.string().optional(),
  FROM_EMAIL: z.string().email().default('noreply@educonnect.org'),
  SUPPORT_EMAIL: z.string().email().default('support@educonnect.org'),

  // File Storage
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.string().transform(Number).pipe(z.number()).default('10485760'),

  // Python Services
  MATCHING_SERVICE_URL: z.string().url().default('http://localhost:8001'),
  ANALYTICS_SERVICE_URL: z.string().url().default('http://localhost:8002'),
  CHECKPOINT_SERVICE_URL: z.string().url().default('http://localhost:8003'),
  MODERATION_SERVICE_URL: z.string().url().default('http://localhost:8004'),

  // Feature Flags
  ENABLE_MFA: z.string().transform((val) => val === 'true').default('false'),
  ENABLE_EMAIL_VERIFICATION: z.string().transform((val) => val === 'true').default('true'),

  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
});

// Parse and validate environment
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
};

export const env = parseEnv();

export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
