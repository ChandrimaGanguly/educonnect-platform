/**
 * Tests for authentication and permission middleware
 * Phase 1 Group C: Role-Based Access Control
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  createTestApp,
  cleanupTestApp,
  cleanDatabase,
  createTestUser,
  createTestCommunity,
  generateTestToken,
} from '../../test/helpers';
import type { FastifyInstance } from 'fastify';
import { getDatabase } from '../../database';
import { RbacService } from '../../services/rbac.service';

describe('permission middleware', () => {
  let app: FastifyInstance;
  let rbacService: RbacService;

  beforeEach(async () => {
    await cleanDatabase();
    app = await createTestApp();
    rbacService = new RbacService();

    // Seed default roles and permissions
    const db = getDatabase();

    // Create test permissions
    const [viewPermission] = await db('permissions').insert({
      name: 'View Content',
      slug: 'content:view',
      resource: 'content',
      action: 'view',
      scope: 'both',
    }).returning('*');

    const [createPermission] = await db('permissions').insert({
      name: 'Create Content',
      slug: 'content:create',
      resource: 'content',
      action: 'create',
      scope: 'both',
    }).returning('*');

    const [managePermission] = await db('permissions').insert({
      name: 'Manage Community',
      slug: 'community:manage_members',
      resource: 'community',
      action: 'manage',
      scope: 'community',
    }).returning('*');

    // Create test roles
    const [memberRole] = await db('roles').insert({
      name: 'Member',
      slug: 'member',
      description: 'Basic member',
      scope: 'community',
      is_default: true,
      is_system_role: true,
      priority: 1,
    }).returning('*');

    const [adminRole] = await db('roles').insert({
      name: 'Admin',
      slug: 'admin',
      description: 'Community admin',
      scope: 'community',
      is_default: false,
      is_system_role: true,
      priority: 50,
    }).returning('*');

    // Assign permissions to roles
    await db('role_permissions').insert([
      { role_id: memberRole.id, permission_id: viewPermission.id },
      { role_id: adminRole.id, permission_id: viewPermission.id },
      { role_id: adminRole.id, permission_id: createPermission.id },
      { role_id: adminRole.id, permission_id: managePermission.id },
    ]);
  });

  afterEach(async () => {
    if (app) {
      await cleanupTestApp(app);
    }
  });

  describe('requirePermissions middleware', () => {
    it('should check permissions correctly', async () => {
      const user = await createTestUser();
      const community = await createTestCommunity(user.id);

      // Get admin role and assign to user
      const db = getDatabase();
      const adminRole = await db('roles').where({ slug: 'admin' }).first();
      await db('community_user_roles').insert({
        user_id: user.id,
        community_id: community.id,
        role_id: adminRole.id,
      });

      const hasPermission = await rbacService.userHasPermission(
        user.id,
        'content:create',
        community.id
      );

      expect(hasPermission).toBe(true);
    });

    it('should deny access when user lacks required permission', async () => {
      const user = await createTestUser();
      const community = await createTestCommunity(user.id);

      // Get member role (only has view permission) and assign to user
      const db = getDatabase();
      const memberRole = await db('roles').where({ slug: 'member' }).first();
      await db('community_user_roles').insert({
        user_id: user.id,
        community_id: community.id,
        role_id: memberRole.id,
      });

      // Check that user does NOT have create permission
      const hasPermission = await rbacService.userHasPermission(
        user.id,
        'content:create',
        community.id
      );

      expect(hasPermission).toBe(false);
    });
  });

  describe('requireRoles middleware', () => {
    it('should allow access when user has required role', async () => {
      const user = await createTestUser();
      const community = await createTestCommunity(user.id);

      // Assign admin role to user
      const db = getDatabase();
      const adminRole = await db('roles').where({ slug: 'admin' }).first();
      await db('community_user_roles').insert({
        user_id: user.id,
        community_id: community.id,
        role_id: adminRole.id,
      });

      const hasRole = await rbacService.userHasRole(user.id, 'admin', community.id);
      expect(hasRole).toBe(true);
    });

    it('should deny access when user lacks required role', async () => {
      const user = await createTestUser();
      const community = await createTestCommunity(user.id);

      // Assign only member role
      const db = getDatabase();
      const memberRole = await db('roles').where({ slug: 'member' }).first();
      await db('community_user_roles').insert({
        user_id: user.id,
        community_id: community.id,
        role_id: memberRole.id,
      });

      const hasRole = await rbacService.userHasRole(user.id, 'admin', community.id);
      expect(hasRole).toBe(false);
    });
  });
});
