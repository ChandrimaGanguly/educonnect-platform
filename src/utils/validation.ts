import { z } from 'zod';

/**
 * Email validation schema
 */
export const emailSchema = z.string().email('Invalid email address');

/**
 * Password validation schema
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character');

/**
 * Username validation schema
 */
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters long')
  .max(50, 'Username must be at most 50 characters long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens');

/**
 * Registration request validation schema
 */
export const registrationSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
  fullName: z.string().min(1, 'Full name is required').max(255, 'Full name is too long'),
});

/**
 * Login request validation schema
 */
export const loginSchema = z.object({
  emailOrUsername: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
  mfaCode: z.string().optional(),
});

/**
 * Password reset request validation schema
 */
export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

/**
 * Password reset validation schema
 */
export const passwordResetSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: passwordSchema,
});

/**
 * MFA setup validation schema
 */
export const mfaSetupSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

/**
 * MFA verification validation schema
 */
export const mfaVerificationSchema = z.object({
  code: z.string().length(6, 'MFA code must be 6 digits'),
});

/**
 * Session refresh validation schema
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});
