import jwt from 'jsonwebtoken';
import { env } from '../config';
import { nanoid } from 'nanoid';

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

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
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

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });
}

/**
 * Verify and decode token
 */
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

/**
 * Generate a secure random token for password reset, etc.
 */
export function generateSecureToken(): string {
  return nanoid(32);
}
