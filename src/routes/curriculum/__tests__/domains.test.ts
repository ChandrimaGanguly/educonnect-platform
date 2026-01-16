import { FastifyInstance } from 'fastify';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  createTestApp,
  cleanupTestApp,
  cleanDatabase,
  createTestUser,
  cleanCurriculumDatabase,
  createTestDomain,
  createTestCommunity,
} from '../../../test/helpers';

describe('Domain Routes', () => {
  let app: FastifyInstance;
  let testUser: any;

  beforeEach(async () => {
    app = await createTestApp();
    await cleanDatabase();
    await cleanCurriculumDatabase();

    testUser = await createTestUser({ password: 'Password123!' });
  });

  afterEach(async () => {
    await cleanupTestApp(app);
  });

  describe('GET /api/v1/curriculum/domains', () => {
    it('should return empty list when no domains exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/curriculum/domains',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.domains).toEqual([]);
      expect(body.total).toBe(0);
    });

    it('should return published domains', async () => {
      const domain1 = await createTestDomain(testUser.id);
      const domain2 = await createTestDomain(testUser.id);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/curriculum/domains',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.domains).toHaveLength(2);
      expect(body.total).toBe(2);
    });

    it('should filter by community_id', async () => {
      const community = await createTestCommunity(testUser.id);
      const communityDomain = await createTestDomain(testUser.id, {
        community_id: community.id,
      });
      const globalDomain = await createTestDomain(testUser.id);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/curriculum/domains?community_id=${community.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.domains).toHaveLength(1);
      expect(body.domains[0].community_id).toBe(community.id);
    });

    it('should search by query string', async () => {
      const domain = await createTestDomain(testUser.id, { name: 'Mathematics' });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/curriculum/domains?search=math',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.domains).toHaveLength(1);
    });

    it('should return 400 for invalid query parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/curriculum/domains?limit=invalid',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/curriculum/domains/:id', () => {
    it('should return domain by id', async () => {
      const domain = await createTestDomain(testUser.id);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/curriculum/domains/${domain.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.domain.id).toBe(domain.id);
    });

    it('should return 404 for non-existent domain', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/curriculum/domains/00000000-0000-0000-0000-000000000000',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/curriculum/domains/by-slug/:slug', () => {
    it('should return domain by slug', async () => {
      const domain = await createTestDomain(testUser.id, { slug: 'mathematics' });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/curriculum/domains/by-slug/mathematics',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.domain.slug).toBe('mathematics');
    });

    it('should return 404 for non-existent slug', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/curriculum/domains/by-slug/non-existent',
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
