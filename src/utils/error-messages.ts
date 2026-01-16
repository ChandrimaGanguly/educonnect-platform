/**
 * Secure Error Messages
 *
 * Provides sanitized error messages for API responses to prevent information disclosure.
 * Internal errors are logged separately with full details.
 *
 * SECURITY: Never expose internal system details, database errors, or stack traces
 * to end users. Always log full errors internally for debugging.
 */

export const CheckpointErrorMessages = {
  // Session errors
  SESSION_NOT_FOUND: 'The requested session is not available',
  SESSION_UNAUTHORIZED: 'You do not have access to this session',
  SESSION_INVALID_STATE: 'This session cannot be modified in its current state',
  SESSION_ALREADY_STARTED: 'This session has already been started',
  SESSION_ALREADY_SUBMITTED: 'This session has already been submitted',
  SESSION_TIMEOUT: 'Session time limit exceeded',

  // Checkpoint errors
  CHECKPOINT_NOT_FOUND: 'The requested checkpoint is not available',
  CHECKPOINT_INACTIVE: 'This checkpoint is currently not accepting submissions',
  CHECKPOINT_MAX_ATTEMPTS: 'You have reached the maximum number of attempts for this checkpoint',
  CHECKPOINT_COOLDOWN: 'Please wait before starting a new attempt for this checkpoint',

  // Question errors
  QUESTION_NOT_FOUND: 'The requested question is not available',
  QUESTION_ALREADY_ANSWERED: 'This question has already been answered',
  QUESTION_INVALID_RESPONSE: 'The response format is invalid for this question type',

  // Validation errors
  VALIDATION_ERROR: 'Invalid input data provided',
  INVALID_UUID: 'Invalid identifier format',

  // Generic errors
  GENERIC_ERROR: 'An error occurred. Please try again later',
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'You do not have permission to perform this action',
} as const;

export const MentorshipErrorMessages = {
  MENTOR_NOT_FOUND: 'Mentor profile not found',
  RELATIONSHIP_NOT_FOUND: 'Mentorship relationship not found',
  REQUEST_NOT_FOUND: 'Mentorship request not found',
  ALREADY_MENTOR: 'You already have an active mentor profile',
  MAX_MENTEES_REACHED: 'This mentor has reached their maximum number of mentees',
  DUPLICATE_REQUEST: 'You already have a pending request with this mentor',
  INVALID_STATUS_TRANSITION: 'This status change is not allowed',
  FEEDBACK_ALREADY_SUBMITTED: 'You have already submitted feedback for this relationship',
  MATCHING_SERVICE_UNAVAILABLE: 'Matching service is temporarily unavailable',
} as const;

/**
 * Map internal error patterns to safe user-facing messages
 */
export function sanitizeCheckpointError(error: Error): {
  statusCode: number;
  errorType: string;
  message: string;
  fields?: string[];
} {
  const errorMessage = error.message.toLowerCase();

  // Session errors
  if (errorMessage.includes('session') && errorMessage.includes('not found')) {
    return {
      statusCode: 404,
      errorType: 'Not Found',
      message: CheckpointErrorMessages.SESSION_NOT_FOUND,
    };
  }

  if (errorMessage.includes('unauthorized') || errorMessage.includes('not belong')) {
    return {
      statusCode: 403,
      errorType: 'Forbidden',
      message: CheckpointErrorMessages.SESSION_UNAUTHORIZED,
    };
  }

  if (errorMessage.includes('already started')) {
    return {
      statusCode: 400,
      errorType: 'Bad Request',
      message: CheckpointErrorMessages.SESSION_ALREADY_STARTED,
    };
  }

  if (errorMessage.includes('already submitted')) {
    return {
      statusCode: 400,
      errorType: 'Bad Request',
      message: CheckpointErrorMessages.SESSION_ALREADY_SUBMITTED,
    };
  }

  // Checkpoint errors
  if (errorMessage.includes('checkpoint') && errorMessage.includes('not found')) {
    return {
      statusCode: 404,
      errorType: 'Not Found',
      message: CheckpointErrorMessages.CHECKPOINT_NOT_FOUND,
    };
  }

  if (errorMessage.includes('not active') || errorMessage.includes('inactive')) {
    return {
      statusCode: 404,
      errorType: 'Not Found',
      message: CheckpointErrorMessages.CHECKPOINT_INACTIVE,
    };
  }

  if (errorMessage.includes('maximum attempts')) {
    return {
      statusCode: 403,
      errorType: 'Forbidden',
      message: CheckpointErrorMessages.CHECKPOINT_MAX_ATTEMPTS,
    };
  }

  if (errorMessage.includes('cooldown')) {
    return {
      statusCode: 403,
      errorType: 'Forbidden',
      message: CheckpointErrorMessages.CHECKPOINT_COOLDOWN,
    };
  }

  // Question errors
  if (errorMessage.includes('question') && errorMessage.includes('not found')) {
    return {
      statusCode: 404,
      errorType: 'Not Found',
      message: CheckpointErrorMessages.QUESTION_NOT_FOUND,
    };
  }

  // Session state errors
  if (errorMessage.includes('can only be') || errorMessage.includes('invalid state')) {
    return {
      statusCode: 400,
      errorType: 'Bad Request',
      message: CheckpointErrorMessages.SESSION_INVALID_STATE,
    };
  }

  // Default to generic error
  return {
    statusCode: 500,
    errorType: 'Internal Server Error',
    message: CheckpointErrorMessages.GENERIC_ERROR,
  };
}

/**
 * Sanitize Zod validation errors to prevent information disclosure
 */
export function sanitizeValidationError(zodError: any): {
  statusCode: number;
  errorType: string;
  message: string;
  fields: string[];
} {
  return {
    statusCode: 400,
    errorType: 'Validation Error',
    message: CheckpointErrorMessages.VALIDATION_ERROR,
    // Only expose field paths, not full error details
    fields: zodError.errors.map((e: any) => e.path.join('.')),
  };
}
