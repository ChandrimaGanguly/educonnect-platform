import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { DomainService } from '../domain.service';
import {
  cleanDatabase,
  cleanCurriculumDatabase,
  createTestUser,
  createTestDomain,
  createTestCommunity,
} from '../../../test/helpers';
import { getDatabase } from '../../../database';

describe('DomainService', () => {
  let domainService: DomainService;
  let testUser: any;
  let db: any;

  beforeEach(async () => {
    await cleanDatabase();
    await cleanCurriculumDatabase();
    domainService = new DomainService();
    db = getDatabase();

    testUser = await createTestUser({ password: 'Password123!' });
  });

  afterEach(async () => {
    // Cleanup handled by next beforeEach
  });

  describe('listDomains', () => {
    it('should return empty list when no domains exist', async () => {
      const result = await domainService.listDomains();

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it('should return published domains with default pagination', async () => {
      const domain1 = await createTestDomain(testUser.id, { display_order: 0 });
      const domain2 = await createTestDomain(testUser.id, { display_order: 1 });

      const result = await domainService.listDomains();

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.data[0].display_order).toBe(0);
      expect(result.data[1].display_order).toBe(1);
    });

    it('should filter domains by status', async () => {
      const publishedDomain = await createTestDomain(testUser.id, { status: 'published' });
      const draftDomain = await createTestDomain(testUser.id, { status: 'draft' });

      const result = await domainService.listDomains({ status: 'draft' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe('draft');
    });

    it('should filter domains by community_id', async () => {
      const community = await createTestCommunity(testUser.id);
      const communityDomain = await createTestDomain(testUser.id, {
        community_id: community.id,
      });
      const globalDomain = await createTestDomain(testUser.id, { community_id: null });

      const result = await domainService.listDomains({ community_id: community.id });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].community_id).toBe(community.id);
    });

    it('should filter domains with null community_id (global domains)', async () => {
      const community = await createTestCommunity(testUser.id);
      const communityDomain = await createTestDomain(testUser.id, {
        community_id: community.id,
      });
      const globalDomain = await createTestDomain(testUser.id, { community_id: null });

      const result = await domainService.listDomains({ community_id: null });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].community_id).toBeNull();
    });

    it('should search domains by name', async () => {
      const domain1 = await createTestDomain(testUser.id, { name: 'Mathematics' });
      const domain2 = await createTestDomain(testUser.id, { name: 'Science' });

      const result = await domainService.listDomains({ search: 'math' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Mathematics');
    });

    it('should search domains by description', async () => {
      const domain1 = await createTestDomain(testUser.id, {
        description: 'Study of numbers and patterns',
      });
      const domain2 = await createTestDomain(testUser.id, {
        description: 'Natural sciences',
      });

      const result = await domainService.listDomains({ search: 'numbers' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].description).toContain('numbers');
    });

    it('should filter domains by tags', async () => {
      const domain1 = await createTestDomain(testUser.id);
      await db('curriculum_domains')
        .where({ id: domain1.id })
        .update({ tags: ['stem', 'advanced'] });

      const domain2 = await createTestDomain(testUser.id);
      await db('curriculum_domains')
        .where({ id: domain2.id })
        .update({ tags: ['humanities', 'beginner'] });

      const result = await domainService.listDomains({ tags: ['stem'] });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].tags).toContain('stem');
    });

    it('should respect pagination parameters', async () => {
      // Create 5 domains
      for (let i = 0; i < 5; i++) {
        await createTestDomain(testUser.id, { display_order: i });
      }

      const result = await domainService.listDomains({ limit: 3, offset: 0 });

      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(5);
      expect(result.limit).toBe(3);
      expect(result.offset).toBe(0);
    });

    it('should handle pagination offset', async () => {
      // Create 5 domains
      for (let i = 0; i < 5; i++) {
        await createTestDomain(testUser.id, { display_order: i });
      }

      const result = await domainService.listDomains({ limit: 2, offset: 3 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(5);
      expect(result.data[0].display_order).toBe(3);
      expect(result.data[1].display_order).toBe(4);
    });

    it('should sort by display_order and name by default', async () => {
      const domainC = await createTestDomain(testUser.id, {
        name: 'Domain C',
        display_order: 0,
      });
      const domainA = await createTestDomain(testUser.id, {
        name: 'Domain A',
        display_order: 1,
      });
      const domainB = await createTestDomain(testUser.id, {
        name: 'Domain B',
        display_order: 1,
      });

      const result = await domainService.listDomains();

      expect(result.data[0].display_order).toBe(0);
      expect(result.data[1].display_order).toBe(1);
      expect(result.data[2].display_order).toBe(1);
      // Within same display_order, sorted by name
      expect(result.data[1].name).toBe('Domain A');
      expect(result.data[2].name).toBe('Domain B');
    });
  });

  describe('getDomainById', () => {
    it('should return domain by id', async () => {
      const domain = await createTestDomain(testUser.id);

      const result = await domainService.getDomainById(domain.id);

      expect(result).toBeDefined();
      expect(result!.id).toBe(domain.id);
      expect(result!.name).toBe('Test Domain');
    });

    it('should return null for non-existent domain', async () => {
      const result = await domainService.getDomainById('00000000-0000-0000-0000-000000000000');

      expect(result).toBeNull();
    });
  });

  describe('getDomainBySlug', () => {
    it('should return domain by slug', async () => {
      const domain = await createTestDomain(testUser.id, { slug: 'mathematics' });

      const result = await domainService.getDomainBySlug(undefined, 'mathematics');

      expect(result).toBeDefined();
      expect(result!.slug).toBe('mathematics');
    });

    it('should filter by community_id when provided', async () => {
      const community = await createTestCommunity(testUser.id);
      const communityDomain = await createTestDomain(testUser.id, {
        slug: 'math',
        community_id: community.id,
      });
      const globalDomain = await createTestDomain(testUser.id, {
        slug: 'math',
        community_id: null,
      });

      const result = await domainService.getDomainBySlug('math', community.id);

      expect(result).toBeDefined();
      expect(result!.community_id).toBe(community.id);
    });

    it('should filter by null community_id (global)', async () => {
      const community = await createTestCommunity(testUser.id);
      const communityDomain = await createTestDomain(testUser.id, {
        slug: 'math',
        community_id: community.id,
      });
      const globalDomain = await createTestDomain(testUser.id, {
        slug: 'math',
        community_id: null,
      });

      const result = await domainService.getDomainBySlug('math', null);

      expect(result).toBeDefined();
      expect(result!.community_id).toBeNull();
    });

    it('should return null for non-existent slug', async () => {
      const result = await domainService.getDomainBySlug(undefined, 'non-existent-slug');

      expect(result).toBeNull();
    });

    it('should return null when slug exists but community_id does not match', async () => {
      const community1 = await createTestCommunity(testUser.id);
      const community2 = await createTestCommunity(testUser.id);
      const domain = await createTestDomain(testUser.id, {
        slug: 'math',
        community_id: community1.id,
      });

      const result = await domainService.getDomainBySlug('math', community2.id);

      expect(result).toBeNull();
    });
  });

  describe('searchDomains', () => {
    it('should search domains by query string', async () => {
      const domain1 = await createTestDomain(testUser.id, {
        name: 'Advanced Mathematics',
        description: 'Calculus and linear algebra',
      });
      const domain2 = await createTestDomain(testUser.id, {
        name: 'Basic Science',
        description: 'Physics and chemistry',
      });

      const result = await domainService.searchDomains('mathematics');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Advanced Mathematics');
    });

    it('should search in both name and description', async () => {
      const domain1 = await createTestDomain(testUser.id, {
        name: 'Physics',
        description: 'Study of matter and energy',
      });
      const domain2 = await createTestDomain(testUser.id, {
        name: 'Chemistry',
        description: 'Study of substances',
      });

      const result = await domainService.searchDomains('energy');

      expect(result).toHaveLength(1);
      expect(result[0].description).toContain('energy');
    });

    it('should be case-insensitive', async () => {
      const domain = await createTestDomain(testUser.id, { name: 'Mathematics' });

      const result = await domainService.searchDomains('MATH');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Mathematics');
    });

    it('should return empty for no matches', async () => {
      const domain = await createTestDomain(testUser.id, { name: 'Mathematics' });

      const result = await domainService.searchDomains('xyz123');

      expect(result).toEqual([]);
    });

    it('should respect pagination in search', async () => {
      // Create 5 domains with similar names
      for (let i = 0; i < 5; i++) {
        await createTestDomain(testUser.id, {
          name: `Science ${i}`,
          display_order: i,
        });
      }

      const result = await domainService.searchDomains('science', { limit: 3 });

      expect(result).toHaveLength(3);
    });
  });

  describe('getDomainsCount', () => {
    it('should return total count of all domains', async () => {
      const domain1 = await createTestDomain(testUser.id);
      const domain2 = await createTestDomain(testUser.id);

      const count = await domainService.getDomainsCount();

      expect(count).toBe(2);
    });

    it('should filter count by status', async () => {
      const publishedDomain = await createTestDomain(testUser.id, { status: 'published' });
      const draftDomain = await createTestDomain(testUser.id, { status: 'draft' });

      const publishedCount = await domainService.getDomainsCount('published');
      const draftCount = await domainService.getDomainsCount('draft');

      expect(publishedCount).toBe(1);
      expect(draftCount).toBe(1);
    });

    it('should filter count by communityId', async () => {
      const community = await createTestCommunity(testUser.id);
      const communityDomain = await createTestDomain(testUser.id, {
        community_id: community.id,
      });
      const globalDomain = await createTestDomain(testUser.id, { community_id: null });

      const count = await domainService.getDomainsCount(undefined, community.id);

      expect(count).toBe(1);
    });

    it('should return 0 when no domains exist', async () => {
      const count = await domainService.getDomainsCount();

      expect(count).toBe(0);
    });
  });
});
