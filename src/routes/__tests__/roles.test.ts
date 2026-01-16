/**
 * Tests for role assignment API
 * Phase 1 Group C: Role-Based Access Control
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  createTestApp,
  cleanupTestApp,
  cleanDatabase,
  createTestUser,
  createTestCommunity,
} from '../../test/helpers';
import type { FastifyInstance } from 'fastify';
import { getDatabase } from '../../database';
import { sessionService } from '../../services/session.service';

describe('role routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    await cleanDatabase();
    app = await createTestApp();

    // Seed default roles and permissions
    const db = getDatabase();

    // Create test permissions
    const permissions = await db('permissions').insert([
      {
        name: 'View Content',
        slug: 'content:view',
        resource: 'content',
        action: 'view',
        scope: 'both',
      },
      {
        name: 'Create Content',
        slug: 'content:create',
        resource: 'content',
        action: 'create',
        scope: 'both',
      },
      {
        name: 'Manage Members',
        slug: 'community:manage_members',
        resource: 'community',
        action: 'manage',
        scope: 'community',
      },
      {
        name: 'Update Any User',
        slug: 'user:update:any',
        resource: 'user',
        action: 'update',
        scope: 'platform',
      },
      {
        name: 'View Users',
        slug: 'user:view',
        resource: 'user',
        action: 'view',
        scope: 'both',
      },
    ]).returning('*');

    // Create test roles
    const roles = await db('roles').insert([
      {
        name: 'Member',
        slug: 'member',
        description: 'Basic member',
        scope: 'community',
        is_default: true,
        is_system_role: true,
        priority: 1,
      },
      {
        name: 'Admin',
        slug: 'admin',
        description: 'Community admin',
        scope: 'community',
        is_default: false,
        is_system_role: true,
        priority: 50,
      },
      {
        name: 'Platform Admin',
        slug: 'platform_admin',
        description: 'Platform administrator',
        scope: 'platform',
        is_default: false,
        is_system_role: true,
        priority: 100,
      },
    ]).returning('*');

    // Assign permissions to roles
    const memberRole = roles.find(r => r.slug === 'member');
    const adminRole = roles.find(r => r.slug === 'admin');
    const platformAdminRole = roles.find(r => r.slug === 'platform_admin');

    const viewPermission = permissions.find(p => p.slug === 'content:view');
    const createPermission = permissions.find(p => p.slug === 'content:create');
    const managePermission = permissions.find(p => p.slug === 'community:manage_members');
    const updateAnyPermission = permissions.find(p => p.slug === 'user:update:any');
    const viewUserPermission = permissions.find(p => p.slug === 'user:view');

    await db('role_permissions').insert([
      { role_id: memberRole.id, permission_id: viewPermission.id },
      { role_id: adminRole.id, permission_id: viewPermission.id },
      { role_id: adminRole.id, permission_id: createPermission.id },
      { role_id: adminRole.id, permission_id: managePermission.id },
      { role_id: platformAdminRole.id, permission_id: updateAnyPermission.id },
      { role_id: platformAdminRole.id, permission_id: viewUserPermission.id },
    ]);
  });

  afterEach(async () => {
    if (app) {
      await cleanupTestApp(app);
    }
  });

  describe('GET /api/v1/roles/platform', () => {
    it('should list platform roles for authenticated user', async () => {
      const user = await createTestUser({ password: 'TestPassword123!' });

      // Create session for authentication
      const { accessToken } = await sessionService.createSession({
        userId: user.id,
        email: user.email,
        ipAddress: '127.0.0.1',
        userAgent: 'test',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/roles/platform',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.roles).toBeDefined();
      expect(Array.isArray(body.roles)).toBe(true);
      expect(body.roles.some((r: any) => r.slug === 'platform_admin')).toBe(true);
    });

    it('should reject unauthenticated requests', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/roles/platform',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/v1/roles/platform/assign', () => {
    it('should assign platform role to user with proper permissions', async () => {
      const admin = await createTestUser({ password: 'TestPassword123!' });
      const targetUser = await createTestUser();

      // Give admin the user:update:any permission
      const db = getDatabase();
      const platformAdminRole = await db('roles').where({ slug: 'platform_admin' }).first();
      await db('user_roles').insert({
        user_id: admin.id,
        role_id: platformAdminRole.id,
      });

      const { accessToken } = await sessionService.createSession({
        userId: admin.id,
        email: admin.email,
        ipAddress: '127.0.0.1',
        userAgent: 'test',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/roles/platform/assign',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          userId: targetUser.id,
          roleId: platformAdminRole.id,
          assignmentReason: 'Test assignment',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('assigned successfully');
      expect(body.userRole.userId).toBe(targetUser.id);
    });

    it('should reject duplicate role assignments', async () => {
      const admin = await createTestUser({ password: 'TestPassword123!' });
      const targetUser = await createTestUser();

      const db = getDatabase();
      const platformAdminRole = await db('roles').where({ slug: 'platform_admin' }).first();

      // Assign admin role to admin user
      await db('user_roles').insert({
        user_id: admin.id,
        role_id: platformAdminRole.id,
      });

      // Pre-assign role to target user
      await db('user_roles').insert({
        user_id: targetUser.id,
        role_id: platformAdminRole.id,
      });

      const { accessToken } = await sessionService.createSession({
        userId: admin.id,
        email: admin.email,
        ipAddress: '127.0.0.1',
        userAgent: 'test',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/roles/platform/assign',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          userId: targetUser.id,
          roleId: platformAdminRole.id,
        },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('POST /api/v1/roles/community/:communityId/assign', () => {
    it('should assign community role to user with proper permissions', async () => {
      const admin = await createTestUser({ password: 'TestPassword123!' });
      const targetUser = await createTestUser();
      const community = await createTestCommunity(admin.id);

      const db = getDatabase();
      const adminRole = await db('roles').where({ slug: 'admin' }).first();
      const memberRole = await db('roles').where({ slug: 'member' }).first();

      // Assign admin role to admin user in community
      await db('community_user_roles').insert({
        user_id: admin.id,
        community_id: community.id,
        role_id: adminRole.id,
      });

      const { accessToken } = await sessionService.createSession({
        userId: admin.id,
        email: admin.email,
        ipAddress: '127.0.0.1',
        userAgent: 'test',
      });

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/roles/community/${community.id}/assign`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          userId: targetUser.id,
          roleId: memberRole.id,
          assignmentReason: 'New member',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('assigned successfully');
      expect(body.communityUserRole.userId).toBe(targetUser.id);
      expect(body.communityUserRole.communityId).toBe(community.id);
    });
  });

  describe('GET /api/v1/roles/community/:communityId/users/:userId', () => {
    it('should allow users to view their own community roles', async () => {
      const user = await createTestUser({ password: 'TestPassword123!' });
      const community = await createTestCommunity(user.id);

      const db = getDatabase();
      const memberRole = await db('roles').where({ slug: 'member' }).first();

      await db('community_user_roles').insert({
        user_id: user.id,
        community_id: community.id,
        role_id: memberRole.id,
      });

      const { accessToken } = await sessionService.createSession({
        userId: user.id,
        email: user.email,
        ipAddress: '127.0.0.1',
        userAgent: 'test',
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/roles/community/${community.id}/users/${user.id}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.roles).toBeDefined();
      expect(body.roles.some((r: any) => r.slug === 'member')).toBe(true);
    });
  });

  describe('GET /api/v1/roles/permissions', () => {
    it('should list all permissions for authenticated user', async () => {
      const user = await createTestUser({ password: 'TestPassword123!' });

      const { accessToken } = await sessionService.createSession({
        userId: user.id,
        email: user.email,
        ipAddress: '127.0.0.1',
        userAgent: 'test',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/roles/permissions',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.permissions).toBeDefined();
      expect(Array.isArray(body.permissions)).toBe(true);
      expect(body.permissions.length).toBeGreaterThan(0);
    });
  });
});
