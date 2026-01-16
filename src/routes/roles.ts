import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { RbacService } from '../services/rbac.service';
import { authenticate, requirePermissions } from '../middleware/auth';
import { z } from 'zod';

// Singleton service
const rbacService = new RbacService();

// ========== Validation Schemas ==========

const assignPlatformRoleSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  roleId: z.string().uuid('Invalid role ID'),
  assignmentReason: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

const assignCommunityRoleSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  roleId: z.string().uuid('Invalid role ID'),
  assignmentReason: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

const revokePlatformRoleSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  roleId: z.string().uuid('Invalid role ID'),
});

const revokeCommunityRoleSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  roleId: z.string().uuid('Invalid role ID'),
});

export async function roleRoutes(server: FastifyInstance): Promise<void> {

  // ========== Platform Role Management ==========

  /**
   * GET /roles/platform
   * List all platform roles
   */
  server.get('/roles/platform', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const roles = await rbacService.listRoles({ scope: 'platform' });

      return reply.send({
        roles: roles.map(role => ({
          id: role.id,
          name: role.name,
          slug: role.slug,
          description: role.description,
          priority: role.priority,
          isDefault: role.is_default,
          isSystemRole: role.is_system_role,
        })),
      });
    } catch (error: any) {
      request.log.error({ error }, 'Error listing platform roles');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to list platform roles',
      });
    }
  });

  /**
   * POST /roles/platform/assign
   * Assign a platform role to a user
   * Requires 'user:update:any' permission
   */
  server.post('/roles/platform/assign', {
    preHandler: [
      authenticate,
      requirePermissions('user:update:any'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = assignPlatformRoleSchema.parse(request.body);
      const assignedBy = request.user!.userId;

      const userRole = await rbacService.assignPlatformRole(
        data.userId,
        data.roleId,
        {
          assigned_by: assignedBy,
          assignment_reason: data.assignmentReason,
          expires_at: data.expiresAt ? new Date(data.expiresAt) : undefined,
        }
      );

      return reply.status(201).send({
        message: 'Platform role assigned successfully',
        userRole: {
          id: userRole.id,
          userId: userRole.user_id,
          roleId: userRole.role_id,
          assignedBy: userRole.assigned_by,
          assignedAt: userRole.assigned_at,
          expiresAt: userRole.expires_at,
        },
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }

      if (error.message?.includes('Invalid platform role')) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: error.message,
        });
      }

      // Check for unique constraint violations
      if (error.code === '23505') {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'User already has this platform role',
        });
      }

      request.log.error({ error }, 'Error assigning platform role');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to assign platform role',
      });
    }
  });

  /**
   * POST /roles/platform/revoke
   * Revoke a platform role from a user
   * Requires 'user:update:any' permission
   */
  server.post('/roles/platform/revoke', {
    preHandler: [
      authenticate,
      requirePermissions('user:update:any'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = revokePlatformRoleSchema.parse(request.body);

      await rbacService.removePlatformRole(data.userId, data.roleId);

      return reply.send({
        message: 'Platform role revoked successfully',
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }

      request.log.error({ error }, 'Error revoking platform role');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to revoke platform role',
      });
    }
  });

  /**
   * GET /roles/platform/users/:userId
   * Get platform roles for a specific user
   */
  server.get('/roles/platform/users/:userId', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = request.params as { userId: string };

      // Users can view their own roles, or need permission to view others
      if (userId !== request.user!.userId) {
        const hasPermission = await rbacService.userHasPermission(
          request.user!.userId,
          'user:view'
        );

        if (!hasPermission) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'You do not have permission to view this user\'s roles',
          });
        }
      }

      const roles = await rbacService.getUserPlatformRoles(userId);

      return reply.send({
        roles: roles.map(role => ({
          id: role.id,
          name: role.name,
          slug: role.slug,
          description: role.description,
          priority: role.priority,
        })),
      });
    } catch (error: any) {
      request.log.error({ error }, 'Error fetching user platform roles');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch user platform roles',
      });
    }
  });

  // ========== Community Role Management ==========

  /**
   * GET /roles/community/:communityId
   * List all roles for a specific community
   */
  server.get('/roles/community/:communityId', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { communityId } = request.params as { communityId: string };

      const roles = await rbacService.listRoles({
        scope: 'community',
        community_id: communityId,
      });

      return reply.send({
        roles: roles.map(role => ({
          id: role.id,
          name: role.name,
          slug: role.slug,
          description: role.description,
          priority: role.priority,
          isDefault: role.is_default,
          isSystemRole: role.is_system_role,
        })),
      });
    } catch (error: any) {
      request.log.error({ error }, 'Error listing community roles');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to list community roles',
      });
    }
  });

  /**
   * POST /roles/community/:communityId/assign
   * Assign a community role to a user
   * Requires 'community:manage_members' permission in the community
   */
  server.post('/roles/community/:communityId/assign', {
    preHandler: [
      authenticate,
      requirePermissions('community:manage_members', { communityIdParam: 'communityId' }),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { communityId } = request.params as { communityId: string };
      const data = assignCommunityRoleSchema.parse(request.body);
      const assignedBy = request.user!.userId;

      const communityUserRole = await rbacService.assignCommunityRole(
        data.userId,
        communityId,
        data.roleId,
        {
          assigned_by: assignedBy,
          assignment_reason: data.assignmentReason,
          expires_at: data.expiresAt ? new Date(data.expiresAt) : undefined,
        }
      );

      return reply.status(201).send({
        message: 'Community role assigned successfully',
        communityUserRole: {
          id: communityUserRole.id,
          userId: communityUserRole.user_id,
          communityId: communityUserRole.community_id,
          roleId: communityUserRole.role_id,
          assignedBy: communityUserRole.assigned_by,
          assignedAt: communityUserRole.assigned_at,
          expiresAt: communityUserRole.expires_at,
        },
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }

      if (error.message?.includes('Invalid community role') ||
          error.message?.includes('does not belong to this community')) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: error.message,
        });
      }

      // Check for unique constraint violations
      if (error.code === '23505') {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'User already has this role in the community',
        });
      }

      request.log.error({ error }, 'Error assigning community role');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to assign community role',
      });
    }
  });

  /**
   * POST /roles/community/:communityId/revoke
   * Revoke a community role from a user
   * Requires 'community:manage_members' permission in the community
   */
  server.post('/roles/community/:communityId/revoke', {
    preHandler: [
      authenticate,
      requirePermissions('community:manage_members', { communityIdParam: 'communityId' }),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { communityId } = request.params as { communityId: string };
      const data = revokeCommunityRoleSchema.parse(request.body);

      await rbacService.removeCommunityRole(data.userId, communityId, data.roleId);

      return reply.send({
        message: 'Community role revoked successfully',
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }

      request.log.error({ error }, 'Error revoking community role');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to revoke community role',
      });
    }
  });

  /**
   * GET /roles/community/:communityId/users/:userId
   * Get community roles for a specific user in a community
   */
  server.get('/roles/community/:communityId/users/:userId', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { communityId, userId } = request.params as { communityId: string; userId: string };

      // Users can view their own roles, or need permission to view others
      if (userId !== request.user!.userId) {
        const hasPermission = await rbacService.userHasPermission(
          request.user!.userId,
          'user:view',
          communityId
        );

        if (!hasPermission) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'You do not have permission to view this user\'s roles',
          });
        }
      }

      const roles = await rbacService.getUserCommunityRoles(userId, communityId);

      return reply.send({
        roles: roles.map(role => ({
          id: role.id,
          name: role.name,
          slug: role.slug,
          description: role.description,
          priority: role.priority,
        })),
      });
    } catch (error: any) {
      request.log.error({ error }, 'Error fetching user community roles');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch user community roles',
      });
    }
  });

  // ========== Permission Management ==========

  /**
   * GET /roles/permissions
   * List all available permissions
   */
  server.get('/roles/permissions', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const permissions = await rbacService.listPermissions();

      return reply.send({
        permissions: permissions.map(permission => ({
          id: permission.id,
          name: permission.name,
          slug: permission.slug,
          description: permission.description,
          resource: permission.resource,
          action: permission.action,
          scope: permission.scope,
        })),
      });
    } catch (error: any) {
      request.log.error({ error }, 'Error listing permissions');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to list permissions',
      });
    }
  });

  /**
   * GET /roles/:roleId/permissions
   * Get permissions for a specific role
   */
  server.get('/roles/:roleId/permissions', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { roleId } = request.params as { roleId: string };

      const permissions = await rbacService.getRolePermissions(roleId);

      return reply.send({
        permissions: permissions.map(permission => ({
          id: permission.id,
          name: permission.name,
          slug: permission.slug,
          description: permission.description,
          resource: permission.resource,
          action: permission.action,
          scope: permission.scope,
        })),
      });
    } catch (error: any) {
      request.log.error({ error }, 'Error fetching role permissions');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch role permissions',
      });
    }
  });

  /**
   * GET /roles/users/:userId/permissions
   * Get all permissions for a user (platform + community)
   * Query param: communityId (optional) - to include community-specific permissions
   */
  server.get('/roles/users/:userId/permissions', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = request.params as { userId: string };
      const { communityId } = request.query as { communityId?: string };

      // Users can view their own permissions, or need permission to view others
      if (userId !== request.user!.userId) {
        const hasPermission = await rbacService.userHasPermission(
          request.user!.userId,
          'user:view',
          communityId
        );

        if (!hasPermission) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'You do not have permission to view this user\'s permissions',
          });
        }
      }

      const permissions = await rbacService.getUserPermissions(userId, communityId);

      return reply.send({
        permissions: permissions.map(permission => ({
          id: permission.id,
          name: permission.name,
          slug: permission.slug,
          description: permission.description,
          resource: permission.resource,
          action: permission.action,
          scope: permission.scope,
        })),
      });
    } catch (error: any) {
      request.log.error({ error }, 'Error fetching user permissions');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch user permissions',
      });
    }
  });
}
