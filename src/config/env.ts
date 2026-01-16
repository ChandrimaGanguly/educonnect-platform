import * as dotenv from 'dotenv';
import { z } from 'zod';
import { existsSync } from 'fs';
import { resolve } from 'path';

// Load environment variables from .env.local (preferred) or .env
const envLocalPath = resolve(process.cwd(), '.env.local');
const envPath = resolve(process.cwd(), '.env');

if (existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else {
  dotenv.config({ path: envPath });
}

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
      // eslint-disable-next-line no-console
      console.error('❌ Invalid environment variables:');
      error.errors.forEach((err) => {
        // eslint-disable-next-line no-console
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
};

/**
 * Validate secrets are not using weak/default values
 * This prevents accidental deployment with insecure defaults
 */
const validateSecrets = (env: ReturnType<typeof envSchema.parse>) => {
  // List of weak/default secret patterns that should never be used
  const WEAK_SECRET_PATTERNS = [
    'INSECURE_DEFAULT',
    'CHANGE_ME',
    'CHANGE_THIS',
    'your-super-secret',
    'your-session-secret',
    'changeme',
    'password',
    'secret',
    'default',
    'example',
    'test123',
    '12345',
  ];

  const WEAK_DATABASE_PASSWORDS = [
    'changeme',
    'password',
    'postgres',
    'admin',
    '12345',
  ];

  // Extract secrets to validate
  const secrets = {
    JWT_SECRET: env.JWT_SECRET,
    SESSION_SECRET: env.SESSION_SECRET,
  };

  // Check each secret for weak patterns
  const weakSecrets: string[] = [];

  Object.entries(secrets).forEach(([key, value]) => {
    const lowerValue = value.toLowerCase();

    // Check if secret is too short (less than 32 chars is already caught by Zod)
    // But we can check for minimum entropy

    // Check for weak patterns
    const hasWeakPattern = WEAK_SECRET_PATTERNS.some(pattern =>
      lowerValue.includes(pattern.toLowerCase())
    );

    if (hasWeakPattern) {
      weakSecrets.push(key);
    }
  });

  // Check database password
  const dbUrlMatch = env.DATABASE_URL.match(/:\/\/[^:]+:([^@]+)@/);
  if (dbUrlMatch) {
    const dbPassword = dbUrlMatch[1];
    const hasWeakDbPassword = WEAK_DATABASE_PASSWORDS.some(weak =>
      dbPassword.toLowerCase() === weak.toLowerCase()
    );

    if (hasWeakDbPassword) {
      weakSecrets.push('DATABASE_URL password');
    }
  }

  // Skip validation in test environment
  if (env.NODE_ENV === 'test') {
    return;
  }

  // Fail startup if weak secrets detected
  if (weakSecrets.length > 0) {
    // eslint-disable-next-line no-console
    console.error('\n❌ SECURITY ERROR: Weak or default secrets detected!\n');
    // eslint-disable-next-line no-console
    console.error('The following secrets are using insecure default values:');
    weakSecrets.forEach(secret => {
      // eslint-disable-next-line no-console
      console.error(`  - ${secret}`);
    });
    // eslint-disable-next-line no-console
    console.error('\n📝 To fix this:\n');
    // eslint-disable-next-line no-console
    console.error('1. Generate strong secrets:');
    // eslint-disable-next-line no-console
    console.error('   node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"\n');
    // eslint-disable-next-line no-console
    console.error('2. Update your .env.local file with the generated secrets\n');
    // eslint-disable-next-line no-console
    console.error('3. For production, use a secrets manager (AWS Secrets Manager, HashiCorp Vault)\n');
    // eslint-disable-next-line no-console
    console.error('⚠️  Application startup aborted for security reasons.\n');
    process.exit(1);
  }

  // Warn if using development secrets in production
  if (env.NODE_ENV === 'production') {
    // eslint-disable-next-line no-console
    console.log('✅ Production secrets validation passed');
  }
};

export const env = parseEnv();

// Validate secrets before exporting
validateSecrets(env);

export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
