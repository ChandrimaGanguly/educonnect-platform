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

// ========== Profile Management Schemas ==========

/**
 * Profile update validation schema
 */
export const profileUpdateSchema = z.object({
  bio: z.string().max(500, 'Bio must be at most 500 characters').optional(),
  avatar_url: z.string().url('Invalid avatar URL').optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
  phone_number: z.string().optional(),
});

/**
 * Skill validation schema
 */
export const skillSchema = z.object({
  skill_name: z.string().min(1, 'Skill name is required').max(100, 'Skill name is too long'),
  category: z.string().min(1, 'Category is required').max(50, 'Category is too long'),
  proficiency_level: z.enum(['beginner', 'intermediate', 'advanced', 'expert'], {
    errorMap: () => ({ message: 'Proficiency level must be beginner, intermediate, advanced, or expert' }),
  }),
  notes: z.string().max(500, 'Notes must be at most 500 characters').optional(),
});

/**
 * Skill update validation schema (all fields optional)
 */
export const skillUpdateSchema = skillSchema.partial();

/**
 * Interest validation schema
 */
export const interestSchema = z.object({
  interest_name: z.string().min(1, 'Interest name is required').max(100, 'Interest name is too long'),
  category: z.string().min(1, 'Category is required').max(50, 'Category is too long'),
  interest_type: z.enum(['learning', 'teaching', 'both'], {
    errorMap: () => ({ message: 'Interest type must be learning, teaching, or both' }),
  }),
  priority: z.number().int().min(1).max(5).optional().default(1),
});

/**
 * Interest update validation schema (all fields optional)
 */
export const interestUpdateSchema = interestSchema.partial();

/**
 * Education validation schema
 */
export const educationSchema = z.object({
  institution: z.string().min(1, 'Institution is required').max(200, 'Institution name is too long'),
  degree: z.string().max(100, 'Degree is too long').optional(),
  field_of_study: z.string().max(100, 'Field of study is too long').optional(),
  start_year: z.number().int().min(1900).max(new Date().getFullYear() + 10).optional(),
  end_year: z.number().int().min(1900).max(new Date().getFullYear() + 10).optional(),
  is_current: z.boolean().optional().default(false),
  description: z.string().max(500, 'Description is too long').optional(),
});

/**
 * Education update validation schema (all fields optional)
 */
export const educationUpdateSchema = educationSchema.partial();

/**
 * Availability validation schema
 */
export const availabilitySchema = z.object({
  day_of_week: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], {
    errorMap: () => ({ message: 'Invalid day of week' }),
  }),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format'),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format'),
  is_active: z.boolean().optional().default(true),
});

/**
 * Availability update validation schema (all fields optional)
 */
export const availabilityUpdateSchema = availabilitySchema.partial();

// ========== Profile Setup Wizard Schemas ==========

/**
 * Basic profile setup validation schema
 */
export const basicProfileSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters').max(255, 'Full name is too long'),
  bio: z.string().max(500, 'Bio must be at most 500 characters').optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
});

/**
 * Bulk skills validation schema
 */
export const bulkSkillsSchema = z.object({
  skills: z.array(skillSchema).min(1, 'At least one skill is required').max(20, 'Maximum 20 skills allowed'),
});

/**
 * Bulk interests validation schema
 */
export const bulkInterestsSchema = z.object({
  interests: z.array(interestSchema).min(1, 'At least one interest is required').max(20, 'Maximum 20 interests allowed'),
});

/**
 * Bulk availability validation schema
 */
export const bulkAvailabilitySchema = z.object({
  availability: z.array(availabilitySchema).max(50, 'Maximum 50 availability slots allowed'),
});

// ========== Community Management Schemas ==========

/**
 * Create community validation schema
 */
export const createCommunitySchema = z.object({
  name: z.string().min(3, 'Community name must be at least 3 characters').max(100, 'Community name is too long'),
  description: z.string().max(1000, 'Description must be at most 1000 characters').optional(),
  type: z.enum(['public', 'private', 'invite_only'], {
    errorMap: () => ({ message: 'Type must be public, private, or invite_only' }),
  }),
  welcome_message: z.string().max(500, 'Welcome message is too long').optional(),
  logo_url: z.string().url('Invalid logo URL').optional(),
  banner_url: z.string().url('Invalid banner URL').optional(),
  primary_language: z.string().optional().default('en'),
  region: z.string().optional(),
  tags: z.array(z.string()).optional(),
  settings: z.record(z.any()).optional(),
});

/**
 * Update community validation schema (all fields optional)
 */
export const updateCommunitySchema = createCommunitySchema.partial();

/**
 * Community invitation validation schema
 */
export const invitationSchema = z.object({
  invitee_email: z.string().email('Invalid email address').optional(),
  invitee_id: z.string().uuid('Invalid user ID').optional(),
  message: z.string().max(500, 'Message is too long').optional(),
}).refine((data) => data.invitee_email || data.invitee_id, {
  message: 'Either invitee_email or invitee_id is required',
});

/**
 * Join request approval validation schema
 */
export const approveRequestSchema = z.object({
  notes: z.string().max(500, 'Notes must be at most 500 characters').optional(),
});

/**
 * Community list query validation schema
 */
export const listCommunitiesSchema = z.object({
  search: z.string().optional(),
  type: z.enum(['public', 'private', 'invite_only']).optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional().default('active'),
  tags: z.array(z.string()).optional(),
  primary_language: z.string().optional(),
  region: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

/**
 * Community members query validation schema
 */
export const listMembersSchema = z.object({
  status: z.enum(['pending', 'active', 'inactive', 'suspended', 'banned']).optional(),
  membership_type: z.enum(['member', 'contributor', 'mentor', 'moderator', 'admin', 'owner']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});
