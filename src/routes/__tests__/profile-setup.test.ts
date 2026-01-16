/**
 * Tests for profile setup wizard routes
 * Phase 1 Group B: User & Community Management
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  createTestApp,
  cleanupTestApp,
  cleanDatabase,
  createTestUser,
  generateTestToken,
} from '../../test/helpers';
import type { FastifyInstance } from 'fastify';

describe('Profile Setup Wizard Routes', () => {
  let app: FastifyInstance;
  let authToken: string;
  let userId: string;

  beforeEach(async () => {
    await cleanDatabase();
    app = await createTestApp();

    // Create test user and get auth token
    const user = await createTestUser();
    userId = user.id;
    authToken = await generateTestToken(app, { userId: user.id, email: user.email });
  });

  afterEach(async () => {
    if (app) {
      await cleanupTestApp(app);
    }
  });

  describe('GET /api/v1/profile-setup/status', () => {
    it('should return incomplete status for new user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/profile-setup/status',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.completed).toBe(false);
      expect(data.steps).toBeDefined();
      expect(data.steps.basic).toBe(false);
      expect(data.steps.skills).toBe(false);
      expect(data.steps.interests).toBe(false);
      expect(data.steps.availability).toBe(false);
    });

    it('should return 401 without auth token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/profile-setup/status',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/v1/profile-setup/basic', () => {
    it('should save basic profile information', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/profile-setup/basic',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          full_name: 'John Doe',
          bio: 'Software developer interested in learning',
          timezone: 'America/New_York',
          locale: 'en-US',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.user.fullName).toBe('John Doe');
      expect(data.user.bio).toBe('Software developer interested in learning');
    });

    it('should validate full_name is required', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/profile-setup/basic',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          bio: 'Just a bio',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate bio length', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/profile-setup/basic',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          full_name: 'John Doe',
          bio: 'a'.repeat(501),
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/profile-setup/skills', () => {
    it('should add multiple skills in bulk', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/profile-setup/skills',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          skills: [
            {
              skill_name: 'JavaScript',
              category: 'technical',
              proficiency_level: 'intermediate',
            },
            {
              skill_name: 'Python',
              category: 'technical',
              proficiency_level: 'beginner',
            },
            {
              skill_name: 'Spanish',
              category: 'language',
              proficiency_level: 'advanced',
            },
          ],
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.skills).toHaveLength(3);
      expect(data.message).toContain('3 skill(s) added successfully');
    });

    it('should validate minimum 1 skill required', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/profile-setup/skills',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          skills: [],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate maximum 20 skills', async () => {
      const skills = Array.from({ length: 21 }, (_, i) => ({
        skill_name: `Skill ${i}`,
        category: 'technical',
        proficiency_level: 'beginner' as const,
      }));

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/profile-setup/skills',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          skills,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/profile-setup/interests', () => {
    it('should add multiple interests in bulk', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/profile-setup/interests',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          interests: [
            {
              interest_name: 'Web Development',
              category: 'technology',
              interest_type: 'learning',
              priority: 5,
            },
            {
              interest_name: 'Data Science',
              category: 'technology',
              interest_type: 'both',
              priority: 4,
            },
          ],
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.interests).toHaveLength(2);
    });

    it('should set default priority if not provided', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/profile-setup/interests',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          interests: [
            {
              interest_name: 'Machine Learning',
              category: 'technology',
              interest_type: 'learning',
            },
          ],
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.interests[0].priority).toBeDefined();
    });
  });

  describe('POST /api/v1/profile-setup/availability', () => {
    it('should add multiple availability slots in bulk', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/profile-setup/availability',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          availability: [
            {
              day_of_week: 'monday',
              start_time: '18:00',
              end_time: '20:00',
            },
            {
              day_of_week: 'wednesday',
              start_time: '19:00',
              end_time: '21:00',
            },
          ],
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.availability).toHaveLength(2);
    });

    it('should validate time format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/profile-setup/availability',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          availability: [
            {
              day_of_week: 'monday',
              start_time: 'invalid',
              end_time: '20:00',
            },
          ],
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/profile-setup/complete', () => {
    it('should mark profile setup as completed', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/profile-setup/complete',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.message).toBe('Profile setup completed successfully');
    });

    it('should update status to completed', async () => {
      // Mark as complete
      await app.inject({
        method: 'POST',
        url: '/api/v1/profile-setup/complete',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      // Check status
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/profile-setup/status',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.completed).toBe(true);
    });
  });

  describe('Complete Wizard Flow', () => {
    it('should complete full wizard flow', async () => {
      // Step 1: Basic profile
      await app.inject({
        method: 'POST',
        url: '/api/v1/profile-setup/basic',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          full_name: 'Jane Smith',
          bio: 'Aspiring data scientist',
          timezone: 'America/Los_Angeles',
        },
      });

      // Step 2: Skills
      await app.inject({
        method: 'POST',
        url: '/api/v1/profile-setup/skills',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          skills: [
            {
              skill_name: 'Python',
              category: 'technical',
              proficiency_level: 'intermediate',
            },
          ],
        },
      });

      // Step 3: Interests
      await app.inject({
        method: 'POST',
        url: '/api/v1/profile-setup/interests',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          interests: [
            {
              interest_name: 'Machine Learning',
              category: 'technology',
              interest_type: 'learning',
            },
          ],
        },
      });

      // Step 4: Availability
      await app.inject({
        method: 'POST',
        url: '/api/v1/profile-setup/availability',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          availability: [
            {
              day_of_week: 'saturday',
              start_time: '10:00',
              end_time: '14:00',
            },
          ],
        },
      });

      // Complete setup
      await app.inject({
        method: 'POST',
        url: '/api/v1/profile-setup/complete',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      // Verify all steps are marked as completed
      const statusResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/profile-setup/status',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      const data = JSON.parse(statusResponse.payload);
      expect(data.completed).toBe(true);
      expect(data.steps.basic).toBe(true);
      expect(data.steps.skills).toBe(true);
      expect(data.steps.interests).toBe(true);
      expect(data.steps.availability).toBe(true);
    });
  });
});
