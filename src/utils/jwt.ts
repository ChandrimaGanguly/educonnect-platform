import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { env } from '../config';

export interface JwtPayload {
  userId: string;
  email: string;
  sessionId: string;
  type: 'access' | 'refresh';
}

/**
 * Generate access token
 */
export function generateAccessToken(userId: string, email: string, sessionId: string): string {
  const payload: JwtPayload = {
    userId,
    email,
    sessionId,
    type: 'access',
  };

  const secret: Secret = env.JWT_SECRET;
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };

  return jwt.sign(payload, secret, options);
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(userId: string, email: string, sessionId: string): string {
  const payload: JwtPayload = {
    userId,
    email,
    sessionId,
    type: 'refresh',
  };

  const secret: Secret = env.JWT_SECRET;
  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
  };

  return jwt.sign(payload, secret, options);
}

/**
 * Verify and decode token
 */
export function verifyToken(token: string): JwtPayload {
  const secret: Secret = env.JWT_SECRET;
  return jwt.verify(token, secret) as JwtPayload;
}

/**
 * Generate a secure random token for password reset, etc.
 */
export function generateSecureToken(): string {
  return nanoid(32);
}
