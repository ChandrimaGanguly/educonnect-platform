/**
 * Tests for user profile routes
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

describe('Profile Routes', () => {
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

  describe('GET /api/v1/users/me/profile', () => {
    it('should return complete user profile', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/users/me/profile',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.user).toBeDefined();
      expect(data.user.id).toBe(userId);
      expect(data.skills).toBeDefined();
      expect(data.interests).toBeDefined();
      expect(data.education).toBeDefined();
      expect(data.availability).toBeDefined();
    });

    it('should return 401 without auth token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/users/me/profile',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('PATCH /api/v1/users/me/profile', () => {
    it('should update basic profile information', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/users/me/profile',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          bio: 'Updated bio',
          timezone: 'America/New_York',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.user.bio).toBe('Updated bio');
      expect(data.user.timezone).toBe('America/New_York');
    });

    it('should validate bio length', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/users/me/profile',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          bio: 'a'.repeat(501),
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Skills Management', () => {
    it('should add a skill', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/users/me/skills',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          skill_name: 'JavaScript',
          category: 'technical',
          proficiency_level: 'intermediate',
          notes: 'Web development',
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.payload);
      expect(data.skill.skill_name).toBe('JavaScript');
      expect(data.skill.proficiency_level).toBe('intermediate');
    });

    it('should get user skills', async () => {
      // Add a skill first
      await app.inject({
        method: 'POST',
        url: '/api/v1/users/me/skills',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          skill_name: 'Python',
          category: 'technical',
          proficiency_level: 'advanced',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/users/me/skills',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.skills).toHaveLength(1);
      expect(data.skills[0].skill_name).toBe('Python');
    });

    it('should filter skills by category', async () => {
      // Add skills in different categories
      await app.inject({
        method: 'POST',
        url: '/api/v1/users/me/skills',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          skill_name: 'JavaScript',
          category: 'technical',
          proficiency_level: 'intermediate',
        },
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/users/me/skills',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          skill_name: 'Spanish',
          category: 'language',
          proficiency_level: 'beginner',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/users/me/skills?category=technical',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.skills).toHaveLength(1);
      expect(data.skills[0].category).toBe('technical');
    });

    it('should update a skill', async () => {
      // Add a skill first
      const addResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/users/me/skills',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          skill_name: 'TypeScript',
          category: 'technical',
          proficiency_level: 'beginner',
        },
      });

      const skillId = JSON.parse(addResponse.payload).skill.id;

      // Update the skill
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/users/me/skills/${skillId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          proficiency_level: 'intermediate',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.skill.proficiency_level).toBe('intermediate');
    });

    it('should delete a skill', async () => {
      // Add a skill first
      const addResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/users/me/skills',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          skill_name: 'Ruby',
          category: 'technical',
          proficiency_level: 'beginner',
        },
      });

      const skillId = JSON.parse(addResponse.payload).skill.id;

      // Delete the skill
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/users/me/skills/${skillId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      // Verify it's deleted
      const getResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/users/me/skills',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      const data = JSON.parse(getResponse.payload);
      expect(data.skills).toHaveLength(0);
    });

    it('should validate skill proficiency level', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/users/me/skills',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          skill_name: 'Java',
          category: 'technical',
          proficiency_level: 'invalid',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Interests Management', () => {
    it('should add an interest', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/users/me/interests',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          interest_name: 'Web Development',
          category: 'technology',
          interest_type: 'learning',
          priority: 5,
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.payload);
      expect(data.interest.interest_name).toBe('Web Development');
      expect(data.interest.interest_type).toBe('learning');
    });

    it('should get user interests', async () => {
      // Add an interest first
      await app.inject({
        method: 'POST',
        url: '/api/v1/users/me/interests',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          interest_name: 'Data Science',
          category: 'technology',
          interest_type: 'learning',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/users/me/interests',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.interests).toHaveLength(1);
    });

    it('should filter interests by type', async () => {
      // Add interests with different types
      await app.inject({
        method: 'POST',
        url: '/api/v1/users/me/interests',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          interest_name: 'Python Basics',
          category: 'technology',
          interest_type: 'learning',
        },
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/users/me/interests',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          interest_name: 'JavaScript Advanced',
          category: 'technology',
          interest_type: 'teaching',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/users/me/interests?type=learning',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      // Should include both 'learning' and 'both' types
      expect(data.interests.length).toBeGreaterThan(0);
    });
  });

  describe('Education Management', () => {
    it('should add education entry', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/users/me/education',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          institution: 'MIT',
          degree: 'Bachelor of Science',
          field_of_study: 'Computer Science',
          start_year: 2018,
          end_year: 2022,
          is_current: false,
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.payload);
      expect(data.education.institution).toBe('MIT');
      expect(data.education.degree).toBe('Bachelor of Science');
    });

    it('should get user education history', async () => {
      // Add education first
      await app.inject({
        method: 'POST',
        url: '/api/v1/users/me/education',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          institution: 'Stanford University',
          degree: 'Masters',
          field_of_study: 'Data Science',
          is_current: true,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/users/me/education',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.education).toHaveLength(1);
    });
  });

  describe('Availability Management', () => {
    it('should add availability slot', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/users/me/availability',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          day_of_week: 'monday',
          start_time: '18:00',
          end_time: '20:00',
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.payload);
      expect(data.availability.day_of_week).toBe('monday');
      expect(data.availability.start_time).toBe('18:00:00'); // PostgreSQL returns full time format
    });

    it('should get user availability', async () => {
      // Add availability first
      await app.inject({
        method: 'POST',
        url: '/api/v1/users/me/availability',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          day_of_week: 'tuesday',
          start_time: '10:00',
          end_time: '12:00',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/users/me/availability',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.availability).toHaveLength(1);
    });

    it('should validate time format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/users/me/availability',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          day_of_week: 'wednesday',
          start_time: 'invalid',
          end_time: '20:00',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
