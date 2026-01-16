/**
 * Tests for community routes
 * Phase 1 Group B: User & Community Management
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

describe('Community Routes', () => {
  let app: FastifyInstance;
  let authToken: string;
  let userId: string;
  let user2Token: string;
  let user2Id: string;

  beforeEach(async () => {
    await cleanDatabase();
    app = await createTestApp();

    // Create test users
    const user = await createTestUser();
    userId = user.id;
    authToken = await generateTestToken(app, { userId: user.id, email: user.email });

    const user2 = await createTestUser({ email: 'user2@test.com', username: 'testuser2' });
    user2Id = user2.id;
    user2Token = await generateTestToken(app, { userId: user2.id, email: user2.email });
  });

  afterEach(async () => {
    if (app) {
      await cleanupTestApp(app);
    }
  });

  describe('POST /api/v1/communities', () => {
    it('should create a new community', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/communities',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: 'Test Learning Community',
          description: 'A community for testing',
          type: 'public',
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.payload);
      expect(data.community.name).toBe('Test Learning Community');
      expect(data.community.type).toBe('public');
      expect(data.community.created_by).toBe(userId);
    });

    it('should validate required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/communities',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          description: 'Missing name',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/communities',
        payload: {
          name: 'Test Community',
          description: 'Test',
          type: 'public',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/communities/:communityId', () => {
    it('should get community details', async () => {
      const community = await createTestCommunity(userId);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/communities/${community.id}`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.community.id).toBe(community.id);
      expect(data.community.name).toBe(community.name);
    });

    it('should return 404 for non-existent community', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/communities/00000000-0000-0000-0000-000000000000',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/v1/communities/:communityId', () => {
    it('should update community as owner', async () => {
      const community = await createTestCommunity(userId);

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/communities/${community.id}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          description: 'Updated description',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.community.description).toBe('Updated description');
    });

    it('should deny update for non-owner', async () => {
      const community = await createTestCommunity(userId);

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/communities/${community.id}`,
        headers: {
          authorization: `Bearer ${user2Token}`,
        },
        payload: {
          description: 'Unauthorized update',
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('DELETE /api/v1/communities/:communityId', () => {
    it('should archive community as owner', async () => {
      const community = await createTestCommunity(userId);

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/communities/${community.id}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should deny archive for non-owner', async () => {
      const community = await createTestCommunity(userId);

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/communities/${community.id}`,
        headers: {
          authorization: `Bearer ${user2Token}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /api/v1/communities', () => {
    it('should list all active communities', async () => {
      await createTestCommunity(userId, { name: 'Community 1' });
      await createTestCommunity(userId, { name: 'Community 2' });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/communities',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.communities.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter communities by type', async () => {
      await createTestCommunity(userId, { type: 'public' });
      await createTestCommunity(userId, { type: 'private' });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/communities?type=public',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.communities.every((c: any) => c.type === 'public')).toBe(true);
    });

    it('should search communities by name', async () => {
      await createTestCommunity(userId, { name: 'JavaScript Learners' });
      await createTestCommunity(userId, { name: 'Python Experts' });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/communities?search=JavaScript',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.communities.length).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/communities?limit=10&offset=0',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.pagination.limit).toBe(10);
      expect(data.pagination.offset).toBe(0);
    });
  });

  describe('GET /api/v1/communities/:communityId/members', () => {
    it('should list community members', async () => {
      const community = await createTestCommunity(userId);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/communities/${community.id}/members`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.members).toBeDefined();
      expect(data.members.length).toBeGreaterThan(0); // Creator is a member
    });
  });

  describe('POST /api/v1/communities/:communityId/join', () => {
    it('should join a public community', async () => {
      const community = await createTestCommunity(userId, { type: 'public' });

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/communities/${community.id}/join`,
        headers: {
          authorization: `Bearer ${user2Token}`,
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.payload);
      expect(data.message).toContain('Successfully joined');
    });

    it('should prevent duplicate joins', async () => {
      const community = await createTestCommunity(userId, { type: 'public' });

      // Join once
      await app.inject({
        method: 'POST',
        url: `/api/v1/communities/${community.id}/join`,
        headers: {
          authorization: `Bearer ${user2Token}`,
        },
      });

      // Try to join again
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/communities/${community.id}/join`,
        headers: {
          authorization: `Bearer ${user2Token}`,
        },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should create join request for private community', async () => {
      const community = await createTestCommunity(userId, {
        type: 'private',
        auto_approve_members: false,
      });

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/communities/${community.id}/join`,
        headers: {
          authorization: `Bearer ${user2Token}`,
        },
        payload: {
          message: 'I would like to join',
        },
      });

      expect(response.statusCode).toBe(202);
      const data = JSON.parse(response.payload);
      expect(data.message).toContain('pending approval');
    });
  });

  describe('POST /api/v1/communities/:communityId/leave', () => {
    it('should leave a community', async () => {
      const community = await createTestCommunity(userId, { type: 'public' });

      // Join first
      await app.inject({
        method: 'POST',
        url: `/api/v1/communities/${community.id}/join`,
        headers: {
          authorization: `Bearer ${user2Token}`,
        },
      });

      // Leave
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/communities/${community.id}/leave`,
        headers: {
          authorization: `Bearer ${user2Token}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should prevent owner from leaving if sole owner', async () => {
      const community = await createTestCommunity(userId);

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/communities/${community.id}/leave`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.payload);
      expect(data.message).toContain('only owner');
    });
  });

  describe('POST /api/v1/communities/:communityId/invite', () => {
    it('should invite user by email', async () => {
      const community = await createTestCommunity(userId);

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/communities/${community.id}/invite`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          invitee_email: 'newuser@test.com',
          message: 'Join our community!',
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.payload);
      expect(data.invitation).toBeDefined();
    });

    it('should deny invitation for non-members', async () => {
      const community = await createTestCommunity(userId);

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/communities/${community.id}/invite`,
        headers: {
          authorization: `Bearer ${user2Token}`,
        },
        payload: {
          invitee_email: 'friend@test.com',
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /api/v1/communities/:communityId/join-requests', () => {
    it('should get pending join requests as owner', async () => {
      const community = await createTestCommunity(userId, {
        type: 'private',
        auto_approve_members: false,
      });

      // Create a join request
      await app.inject({
        method: 'POST',
        url: `/api/v1/communities/${community.id}/join`,
        headers: {
          authorization: `Bearer ${user2Token}`,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/communities/${community.id}/join-requests`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.requests).toBeDefined();
      expect(data.requests.length).toBeGreaterThan(0);
    });

    it('should deny access for non-admins', async () => {
      const community = await createTestCommunity(userId);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/communities/${community.id}/join-requests`,
        headers: {
          authorization: `Bearer ${user2Token}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Integration: End-to-End Community Flow', () => {
    it('should complete full community workflow', async () => {
      // Step 1: Create community
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/communities',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: 'Full Test Community',
          description: 'Testing complete workflow',
          type: 'public',
        },
      });

      expect(createResponse.statusCode).toBe(201);
      const { community } = JSON.parse(createResponse.payload);

      // Step 2: User 2 joins
      const joinResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/communities/${community.id}/join`,
        headers: {
          authorization: `Bearer ${user2Token}`,
        },
      });

      expect(joinResponse.statusCode).toBe(201);

      // Step 3: List members
      const membersResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/communities/${community.id}/members`,
      });

      const members = JSON.parse(membersResponse.payload);
      expect(members.members.length).toBeGreaterThanOrEqual(2); // Creator + user2

      // Step 4: Update community
      const updateResponse = await app.inject({
        method: 'PATCH',
        url: `/api/v1/communities/${community.id}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          description: 'Updated after members joined',
        },
      });

      expect(updateResponse.statusCode).toBe(200);

      // Step 5: User 2 leaves
      const leaveResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/communities/${community.id}/leave`,
        headers: {
          authorization: `Bearer ${user2Token}`,
        },
      });

      expect(leaveResponse.statusCode).toBe(200);
    });
  });
});
