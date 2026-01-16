import { FastifyInstance } from 'fastify';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  createTestApp,
  cleanupTestApp,
  cleanDatabase,
  createTestUser,
  cleanCurriculumDatabase,
  createTestDomain,
  createTestSubject,
} from '../../../test/helpers';

describe('Subject Routes', () => {
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

  describe('GET /api/v1/curriculum/subjects', () => {
    it('should return empty list when no subjects exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/curriculum/subjects',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.subjects).toEqual([]);
      expect(body.total).toBe(0);
    });

    it('should return published subjects', async () => {
      const domain = await createTestDomain(testUser.id);
      const subject1 = await createTestSubject(domain.id, testUser.id);
      const subject2 = await createTestSubject(domain.id, testUser.id);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/curriculum/subjects',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.subjects).toHaveLength(2);
      expect(body.total).toBe(2);
    });

    it('should filter by domain_id', async () => {
      const domain1 = await createTestDomain(testUser.id);
      const domain2 = await createTestDomain(testUser.id);
      const subject1 = await createTestSubject(domain1.id, testUser.id);
      const subject2 = await createTestSubject(domain2.id, testUser.id);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/curriculum/subjects?domain_id=${domain1.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.subjects).toHaveLength(1);
      expect(body.subjects[0].domain_id).toBe(domain1.id);
    });

    it('should return 400 for invalid query parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/curriculum/subjects?limit=invalid',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/curriculum/subjects/:id', () => {
    it('should return subject by id', async () => {
      const domain = await createTestDomain(testUser.id);
      const subject = await createTestSubject(domain.id, testUser.id);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/curriculum/subjects/${subject.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.subject.id).toBe(subject.id);
    });

    it('should return 404 for non-existent subject', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/curriculum/subjects/00000000-0000-0000-0000-000000000000',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/curriculum/domains/:domainId/subjects', () => {
    it('should return subjects for a specific domain', async () => {
      const domain = await createTestDomain(testUser.id);
      const subject1 = await createTestSubject(domain.id, testUser.id);
      const subject2 = await createTestSubject(domain.id, testUser.id);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/curriculum/domains/${domain.id}/subjects`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.subjects).toHaveLength(2);
      expect(body.subjects[0].domain_id).toBe(domain.id);
    });

    it('should return empty list for domain with no subjects', async () => {
      const domain = await createTestDomain(testUser.id);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/curriculum/domains/${domain.id}/subjects`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.subjects).toEqual([]);
      expect(body.total).toBe(0);
    });
  });
});
