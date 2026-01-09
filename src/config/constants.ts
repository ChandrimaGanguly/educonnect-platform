/**
 * Application-wide constants
 * Centralizes magic numbers and configuration values
 */

// Time constants (in milliseconds)
export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
} as const;

// Session/Token configuration
export const SESSION = {
  /** Access token lifetime: 15 minutes */
  ACCESS_TOKEN_EXPIRY_MS: 15 * TIME.MINUTE,
  /** Refresh token lifetime: 7 days */
  REFRESH_TOKEN_EXPIRY_MS: 7 * TIME.DAY,
  /** Session cleanup age: 30 days */
  CLEANUP_AGE_DAYS: 30,
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  DEFAULT_OFFSET: 0,
} as const;

// Trust system
export const TRUST = {
  /** Default trust score for new users */
  DEFAULT_SCORE: 0,
  /** Minimum trust score */
  MIN_SCORE: -100,
  /** Maximum trust score */
  MAX_SCORE: 100,
  /** Trust impact for content completion */
  CONTENT_COMPLETION_IMPACT: 2.0,
  /** Trust impact for skill validation */
  SKILL_VALIDATION_IMPACT: 5.0,
} as const;

// MFA configuration
export const MFA = {
  /** Number of backup codes to generate */
  BACKUP_CODE_COUNT: 10,
  /** TOTP time window for validation */
  TOTP_WINDOW: 1,
} as const;

// Rate limiting defaults
export const RATE_LIMIT = {
  /** Login attempts per window */
  LOGIN_MAX_ATTEMPTS: 5,
  /** Login rate limit window */
  LOGIN_WINDOW_MINUTES: 15,
  /** Password reset attempts per window */
  PASSWORD_RESET_MAX_ATTEMPTS: 3,
  /** Password reset rate limit window */
  PASSWORD_RESET_WINDOW_MINUTES: 15,
} as const;

// Community defaults
export const COMMUNITY = {
  /** Default invitation expiry in days */
  INVITATION_EXPIRY_DAYS: 7,
  /** Default probation period for trust relationships */
  DEFAULT_PROBATION_DAYS: 30,
} as const;

// Sync engine
export const SYNC = {
  /** Maximum retry attempts for sync items */
  MAX_RETRIES: 3,
  /** Retry delays in ms (exponential backoff) */
  RETRY_DELAYS_MS: [1000, 5000, 15000] as readonly number[],
  /** Batch size for processing sync items */
  BATCH_SIZE: 50,
  /** Days to keep completed sync items */
  CLEANUP_DAYS: 7,
} as const;

// Notification defaults
export const NOTIFICATION = {
  /** Default daily notification limit */
  DEFAULT_DAILY_LIMIT: 50,
  /** Default batch time (9 AM) */
  DEFAULT_BATCH_HOUR: 9,
} as const;
