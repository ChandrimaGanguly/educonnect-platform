import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { SubjectService } from '../subject.service';
import {
  cleanDatabase,
  cleanCurriculumDatabase,
  createTestUser,
  createTestDomain,
  createTestSubject,
} from '../../../test/helpers';
import { getDatabase } from '../../../database';

describe('SubjectService', () => {
  let subjectService: SubjectService;
  let testUser: any;
  let db: any;

  beforeEach(async () => {
    await cleanDatabase();
    await cleanCurriculumDatabase();
    subjectService = new SubjectService();
    db = getDatabase();

    testUser = await createTestUser({ password: 'Password123!' });
  });

  afterEach(async () => {
    // Cleanup handled by next beforeEach
  });

  describe('listSubjects', () => {
    it('should return empty list when no subjects exist', async () => {
      const result = await subjectService.listSubjects();

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it('should return published subjects with default pagination', async () => {
      const domain = await createTestDomain(testUser.id);
      const subject1 = await createTestSubject(domain.id, testUser.id, { display_order: 0 });
      const subject2 = await createTestSubject(domain.id, testUser.id, { display_order: 1 });

      const result = await subjectService.listSubjects();

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter subjects by domain_id', async () => {
      const domain1 = await createTestDomain(testUser.id);
      const domain2 = await createTestDomain(testUser.id);
      const subject1 = await createTestSubject(domain1.id, testUser.id);
      const subject2 = await createTestSubject(domain2.id, testUser.id);

      const result = await subjectService.listSubjects({ domain_id: domain1.id });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].domain_id).toBe(domain1.id);
    });

    it('should filter subjects by status', async () => {
      const domain = await createTestDomain(testUser.id);
      const publishedSubject = await createTestSubject(domain.id, testUser.id, {
        status: 'published',
      });
      const draftSubject = await createTestSubject(domain.id, testUser.id, { status: 'draft' });

      const result = await subjectService.listSubjects({ status: 'draft' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe('draft');
    });

    it('should search subjects by name', async () => {
      const domain = await createTestDomain(testUser.id);
      const subject1 = await createTestSubject(domain.id, testUser.id, { name: 'Algebra' });
      const subject2 = await createTestSubject(domain.id, testUser.id, { name: 'Geometry' });

      const result = await subjectService.listSubjects({ search: 'algebra' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Algebra');
    });

    it('should filter subjects by tags', async () => {
      const domain = await createTestDomain(testUser.id);
      const subject = await createTestSubject(domain.id, testUser.id);
      await db('curriculum_subjects')
        .where({ id: subject.id })
        .update({ tags: ['beginner', 'math'] });

      const result = await subjectService.listSubjects({ tags: ['math'] });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].tags).toContain('math');
    });

    it('should sort by display_order by default', async () => {
      const domain = await createTestDomain(testUser.id);
      const subject2 = await createTestSubject(domain.id, testUser.id, { display_order: 2 });
      const subject1 = await createTestSubject(domain.id, testUser.id, { display_order: 1 });
      const subject0 = await createTestSubject(domain.id, testUser.id, { display_order: 0 });

      const result = await subjectService.listSubjects();

      expect(result.data[0].display_order).toBe(0);
      expect(result.data[1].display_order).toBe(1);
      expect(result.data[2].display_order).toBe(2);
    });
  });

  describe('listSubjectsByDomain', () => {
    it('should return subjects for specific domain ordered by display_order', async () => {
      const domain = await createTestDomain(testUser.id);
      const subject1 = await createTestSubject(domain.id, testUser.id, { display_order: 0 });
      const subject2 = await createTestSubject(domain.id, testUser.id, { display_order: 1 });

      const result = await subjectService.listSubjectsByDomain(domain.id);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].display_order).toBe(0);
      expect(result.data[1].display_order).toBe(1);
    });

    it('should return empty list for domain with no subjects', async () => {
      const domain = await createTestDomain(testUser.id);

      const result = await subjectService.listSubjectsByDomain(domain.id);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getSubjectById', () => {
    it('should return subject by id', async () => {
      const domain = await createTestDomain(testUser.id);
      const subject = await createTestSubject(domain.id, testUser.id);

      const result = await subjectService.getSubjectById(subject.id);

      expect(result).toBeDefined();
      expect(result!.id).toBe(subject.id);
      expect(result!.name).toBe('Test Subject');
    });

    it('should return null for non-existent subject', async () => {
      const result = await subjectService.getSubjectById('00000000-0000-0000-0000-000000000000');

      expect(result).toBeNull();
    });
  });

  describe('getSubjectBySlug', () => {
    it('should return subject by slug', async () => {
      const domain = await createTestDomain(testUser.id);
      const subject = await createTestSubject(domain.id, testUser.id, { slug: 'algebra' });

      const result = await subjectService.getSubjectBySlug(domain.id, 'algebra');

      expect(result).toBeDefined();
      expect(result!.slug).toBe('algebra');
      expect(result!.domain_id).toBe(domain.id);
    });

    it('should return null for non-existent slug', async () => {
      const domain = await createTestDomain(testUser.id);

      const result = await subjectService.getSubjectBySlug(domain.id, 'non-existent');

      expect(result).toBeNull();
    });

    it('should return null when slug exists but domain_id does not match', async () => {
      const domain1 = await createTestDomain(testUser.id);
      const domain2 = await createTestDomain(testUser.id);
      const subject = await createTestSubject(domain1.id, testUser.id, { slug: 'algebra' });

      const result = await subjectService.getSubjectBySlug(domain2.id, 'algebra');

      expect(result).toBeNull();
    });
  });

  describe('getSubjectsCount', () => {
    it('should return total count of all subjects', async () => {
      const domain = await createTestDomain(testUser.id);
      const subject1 = await createTestSubject(domain.id, testUser.id);
      const subject2 = await createTestSubject(domain.id, testUser.id);

      const count = await subjectService.getSubjectsCount();

      expect(count).toBe(2);
    });

    it('should filter count by status', async () => {
      const domain = await createTestDomain(testUser.id);
      const publishedSubject = await createTestSubject(domain.id, testUser.id, {
        status: 'published',
      });
      const draftSubject = await createTestSubject(domain.id, testUser.id, { status: 'draft' });

      const publishedCount = await subjectService.getSubjectsCount('published');
      const draftCount = await subjectService.getSubjectsCount('draft');

      expect(publishedCount).toBe(1);
      expect(draftCount).toBe(1);
    });

    it('should filter count by domainId', async () => {
      const domain1 = await createTestDomain(testUser.id);
      const domain2 = await createTestDomain(testUser.id);
      const subject1 = await createTestSubject(domain1.id, testUser.id);
      const subject2 = await createTestSubject(domain2.id, testUser.id);

      const count = await subjectService.getSubjectsCount(undefined, domain1.id);

      expect(count).toBe(1);
    });

    it('should return 0 when no subjects exist', async () => {
      const count = await subjectService.getSubjectsCount();

      expect(count).toBe(0);
    });
  });
});
