import { FastifyRequest, FastifyReply } from 'fastify';
import { SessionService } from '../services/session.service';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      userId: string;
      email: string;
      sessionId: string;
    };
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user data to request
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Verify JWT token
    await request.jwtVerify();

    const payload = request.user as any;

    // Validate session is still active
    const sessionService = new SessionService();
    const isValid = await sessionService.isSessionValid(payload.sessionId);

    if (!isValid) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Session has expired or been revoked',
      });
    }

    // Update session activity
    await sessionService.updateActivity(payload.sessionId);

    // Attach user data to request
    request.user = {
      userId: payload.userId,
      email: payload.email,
      sessionId: payload.sessionId,
    };
  } catch (error) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }
}

/**
 * Optional authentication middleware
 * Tries to authenticate but doesn't fail if token is invalid
 */
export async function optionalAuthenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await authenticate(request, reply);
  } catch (error) {
    // Continue without authentication
  }
}
