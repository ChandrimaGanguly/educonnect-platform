import { FastifyRequest, FastifyReply } from 'fastify';
import { sessionService } from '../services/session.service';
import { RbacService } from '../services/rbac.service';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
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
    const isValid = await sessionService.isSessionValid(payload.sessionId);

    if (!isValid) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Session has expired or been revoked',
      });
    }

    // Update session activity (fire-and-forget to not block response)
    sessionService.updateActivity(payload.sessionId).catch(() => {});

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

/**
 * Permission middleware factory
 * Creates a middleware that checks if the user has required permissions
 *
 * @param permissionSlugs - Array of permission slugs (user must have at least one)
 * @param options - Additional options for permission checking
 * @returns Fastify middleware function
 */
export function requirePermissions(
  permissionSlugs: string | string[],
  options: {
    requireAll?: boolean; // If true, user must have ALL permissions; if false (default), ANY permission
    communityIdParam?: string; // Name of route param containing community ID (e.g., 'communityId')
  } = {}
) {
  const slugs = Array.isArray(permissionSlugs) ? permissionSlugs : [permissionSlugs];
  const { requireAll = false, communityIdParam } = options;

  return async function permissionMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    // Ensure user is authenticated first
    if (!request.user?.userId) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const rbacService = new RbacService();
    const userId = request.user.userId;

    // Extract community ID from route params if specified
    let communityId: string | undefined;
    if (communityIdParam) {
      const params = request.params as Record<string, string>;
      communityId = params[communityIdParam];
    }

    try {
      // Check permissions
      const hasPermission = requireAll
        ? await rbacService.userHasAllPermissions(userId, slugs, communityId)
        : await rbacService.userHasAnyPermission(userId, slugs, communityId);

      if (!hasPermission) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You do not have the required permissions to access this resource',
          required_permissions: slugs,
        });
      }

      // Permission granted, continue to route handler
    } catch (error) {
      request.log.error({ error, userId, permissionSlugs: slugs }, 'Error checking permissions');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to verify permissions',
      });
    }
  };
}

/**
 * Role middleware factory
 * Creates a middleware that checks if the user has required roles
 *
 * @param roleSlugs - Array of role slugs (user must have at least one)
 * @param options - Additional options for role checking
 * @returns Fastify middleware function
 */
export function requireRoles(
  roleSlugs: string | string[],
  options: {
    communityIdParam?: string; // Name of route param containing community ID
  } = {}
) {
  const slugs = Array.isArray(roleSlugs) ? roleSlugs : [roleSlugs];
  const { communityIdParam } = options;

  return async function roleMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    // Ensure user is authenticated first
    if (!request.user?.userId) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const rbacService = new RbacService();
    const userId = request.user.userId;

    // Extract community ID from route params if specified
    let communityId: string | undefined;
    if (communityIdParam) {
      const params = request.params as Record<string, string>;
      communityId = params[communityIdParam];
    }

    try {
      // Check if user has any of the required roles
      const hasRole = await rbacService.userHasAnyRole(userId, slugs, communityId);

      if (!hasRole) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You do not have the required role to access this resource',
          required_roles: slugs,
        });
      }

      // Role check passed, continue to route handler
    } catch (error) {
      request.log.error({ error, userId, roleSlugs: slugs }, 'Error checking roles');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to verify roles',
      });
    }
  };
}
