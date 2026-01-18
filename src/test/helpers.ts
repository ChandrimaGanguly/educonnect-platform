/**
 * Test helper utilities
 */
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app';
import { getDatabase, closeDatabase } from '../database';
import { closeRedis } from '../config/redis';
import { hashPassword } from '../utils/password';

/**
 * Create a test Fastify instance
 */
export async function createTestApp(): Promise<FastifyInstance> {
  return await buildApp();
}

/**
 * Clean up test resources
 * Note: We don't close the database connection here to avoid pool exhaustion
 * The database connection will be reused across tests and closed in the global teardown
 */
export async function cleanupTestApp(app: FastifyInstance): Promise<void> {
  await app.close();
  // Don't close database - reuse the connection
  // await closeDatabase();
  // Don't close Redis - reuse the connection
  // await closeRedis();
}

/**
 * Clean database tables for testing
 */
export async function cleanDatabase(): Promise<void> {
  const db = getDatabase();

  // Wrap in try-catch to log errors but continue cleanup
  try {
    // Delete from tables in correct dependency order (children before parents)
    // Using individual deletes instead of TRUNCATE to avoid issues with parallel tests

    // Deepest children - tables that depend on other tables
    const childTables = [
      'trust_score_history',
      'trust_events',
      'user_trust_relationships',
      'community_trust_relationships',
      'trust_permission_rules',
      'community_members',
      'community_invitations',
      'community_join_requests',
      'community_user_roles',
      'role_permissions',
      'user_roles',
    ];

    for (const table of childTables) {
      try {
        await db(table).del();
      } catch (error) {
        // Table might not exist in all test scenarios - continue
        console.warn(`Warning: Could not clean table ${table}:`, error);
      }
    }

    // Mid-level tables - permissions and roles (parents to role_permissions, user_roles)
    try {
      await db('permissions').del();
    } catch (error) {
      console.warn('Warning: Could not clean table permissions:', error);
    }
    try {
      await db('roles').del();
    } catch (error) {
      console.warn('Warning: Could not clean table roles:', error);
    }

    // Sessions table
    try {
      await db('sessions').del();
    } catch (error) {
      console.warn('Warning: Could not clean table sessions:', error);
    }

    // Parent tables - must be deleted last
    try {
      await db('communities').del();
    } catch (error) {
      console.warn('Warning: Could not clean table communities:', error);
    }
    try {
      await db('users').del();
    } catch (error) {
      console.warn('Warning: Could not clean table users:', error);
    }
  } catch (error) {
    console.error('Error in cleanDatabase:', error);
    throw error;
  }
}

/**
 * Create a test user
 * @param overrides - Optional overrides for user properties
 *                    Use `password` to set a plain password (will be hashed automatically)
 *                    Use `password_hash` to set a pre-hashed password
 */
export async function createTestUser(overrides: any = {}) {
  const db = getDatabase();

  // Generate unique email and username to avoid conflicts
  const uniqueSuffix = Math.random().toString(36).substring(2, 15);

  // If a plain password is provided, hash it
  let passwordHash = '$2b$12$test.hash.value'; // Default test hash
  if (overrides.password) {
    passwordHash = await hashPassword(overrides.password);
    delete overrides.password; // Remove plain password from overrides
  } else if (overrides.password_hash) {
    passwordHash = overrides.password_hash;
    delete overrides.password_hash; // Remove from overrides to avoid duplication
  }

  const defaultUser = {
    email: `test-${uniqueSuffix}@example.com`,
    username: `testuser-${uniqueSuffix}`,
    password_hash: passwordHash,
    full_name: 'Test User',
    status: 'active',
    ...overrides,
  };

  const [user] = await db('users').insert(defaultUser).returning('*');
  return user;
}

/**
 * Create a test community
 */
export async function createTestCommunity(createdBy: string, overrides = {}) {
  const db = getDatabase();

  // Generate unique slug to avoid conflicts
  const uniqueSuffix = Math.random().toString(36).substring(2, 15);

  const defaultCommunity = {
    name: 'Test Community',
    slug: `test-community-${uniqueSuffix}`,
    description: 'A test community',
    type: 'public',
    status: 'active',
    created_by: createdBy,
    ...overrides,
  };

  const [community] = await db('communities').insert(defaultCommunity).returning('*');

  // Add creator as owner member
  await db('community_members').insert({
    community_id: community.id,
    user_id: createdBy,
    membership_type: 'owner',
    status: 'active',
    approved: true,
  });

  return community;
}

/**
 * Generate a test JWT token with a valid session
 */
export async function generateTestToken(app: FastifyInstance, payload: { userId: string; email: string }): Promise<string> {
  const db = getDatabase();

  // Generate unique session token
  const sessionToken = `test_session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // Create a test session
  const [session] = await db('sessions')
    .insert({
      user_id: payload.userId,
      session_token: sessionToken,
      refresh_token: `test_refresh_${Date.now()}`,
      ip_address: '127.0.0.1',
      user_agent: 'Test Agent',
      expires_at: new Date(Date.now() + 86400000), // 24 hours from now
    })
    .returning('*');

  // Include sessionId in the JWT payload
  return app.jwt.sign({
    userId: payload.userId,
    email: payload.email,
    sessionId: session.id,
  });
}

/**
 * Create a test domain
 */
export async function createTestDomain(createdBy: string, overrides = {}) {
  const db = getDatabase();

  const uniqueSuffix = Math.random().toString(36).substring(2, 15);

  const defaultDomain = {
    name: 'Test Domain',
    slug: `test-domain-${uniqueSuffix}`,
    description: 'A test domain',
    status: 'published',
    display_order: 0,
    color: '#3B82F6',
    created_by: createdBy,
    ...overrides,
  };

  const [domain] = await db('curriculum_domains').insert(defaultDomain).returning('*');
  return domain;
}

/**
 * Create a test subject
 */
export async function createTestSubject(domainId: string, createdBy: string, overrides = {}) {
  const db = getDatabase();

  const uniqueSuffix = Math.random().toString(36).substring(2, 15);

  const defaultSubject = {
    domain_id: domainId,
    name: 'Test Subject',
    slug: `test-subject-${uniqueSuffix}`,
    description: 'A test subject',
    status: 'published',
    display_order: 0,
    created_by: createdBy,
    ...overrides,
  };

  const [subject] = await db('curriculum_subjects').insert(defaultSubject).returning('*');
  return subject;
}

/**
 * Create a test course
 */
export async function createTestCourse(subjectId: string, createdBy: string, overrides = {}) {
  const db = getDatabase();

  const uniqueSuffix = Math.random().toString(36).substring(2, 15);

  const defaultCourse = {
    subject_id: subjectId,
    name: 'Test Course',
    slug: `test-course-${uniqueSuffix}`,
    description: 'A test course',
    status: 'published',
    difficulty_level: 'beginner',
    track_type: 'practical',
    is_certification_eligible: false,
    requires_approval: false,
    enrollment_count: 0,
    is_enrollable: true,
    display_order: 0,
    version: 1,
    board_approved: false,
    created_by: createdBy,
    ...overrides,
  };

  const [course] = await db('curriculum_courses').insert(defaultCourse).returning('*');
  return course;
}

/**
 * Create a test module
 */
export async function createTestModule(courseId: string, createdBy: string, overrides = {}) {
  const db = getDatabase();

  const uniqueSuffix = Math.random().toString(36).substring(2, 15);

  const defaultModule = {
    course_id: courseId,
    name: 'Test Module',
    slug: `test-module-${uniqueSuffix}`,
    description: 'A test module',
    status: 'published',
    display_order: 0,
    unlock_type: 'always',
    has_prerequisites: false,
    created_by: createdBy,
    ...overrides,
  };

  const [module] = await db('curriculum_modules').insert(defaultModule).returning('*');
  return module;
}

/**
 * Create a test lesson
 */
export async function createTestLesson(moduleId: string, createdBy: string, overrides = {}) {
  const db = getDatabase();

  const uniqueSuffix = Math.random().toString(36).substring(2, 15);

  const defaultLesson = {
    module_id: moduleId,
    name: 'Test Lesson',
    slug: `test-lesson-${uniqueSuffix}`,
    description: 'A test lesson',
    content: 'Test lesson content',
    lesson_type: 'text',
    content_format: 'markdown',
    status: 'published',
    display_order: 0,
    has_video: false,
    has_audio: false,
    has_interactive: false,
    has_prerequisites: false,
    has_transcript: false,
    has_captions: false,
    has_alt_text: false,
    text_only_available: true,
    created_by: createdBy,
    ...overrides,
  };

  const [lesson] = await db('curriculum_lessons').insert(defaultLesson).returning('*');
  return lesson;
}

/**
 * Create a complete curriculum hierarchy for testing
 * Returns all created entities
 */
export async function createTestCurriculum(createdBy: string) {
  const domain = await createTestDomain(createdBy);
  const subject = await createTestSubject(domain.id, createdBy);
  const course = await createTestCourse(subject.id, createdBy);
  const module = await createTestModule(course.id, createdBy);
  const lesson = await createTestLesson(module.id, createdBy);

  return {
    domain,
    subject,
    course,
    module,
    lesson,
  };
}

/**
 * Clean curriculum tables
 */
export async function cleanCurriculumDatabase(): Promise<void> {
  const db = getDatabase();

  try {
    // Delete curriculum tables in dependency order
    const curriculumTables = [
      'lesson_completions',
      'curriculum_resources',
      'curriculum_lessons',
      'curriculum_modules',
      'curriculum_learning_paths',
      'curriculum_content_standards',
      'curriculum_standards',
      'curriculum_courses',
      'curriculum_subjects',
      'curriculum_domains',
    ];

    for (const table of curriculumTables) {
      try {
        await db(table).del();
      } catch (error) {
        console.warn(`Warning: Could not clean table ${table}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in cleanCurriculumDatabase:', error);
    throw error;
  }
}

/**
 * Clean checkpoint/assessment tables
 */
export async function cleanCheckpointDatabase(): Promise<void> {
  const db = getDatabase();

  try {
    // Delete checkpoint tables in dependency order (children first)
    // Note: We DON'T clean checkpoint_categories, checkpoint_format_types, or
    // checkpoint_accommodation_types as these are reference/seed tables
    const checkpointTables = [
      'checkpoint_responses',
      'checkpoint_session_events',
      'checkpoint_sessions',
      'checkpoint_questions',
      'checkpoint_question_pools',
      'checkpoints',
      'checkpoint_types',
    ];

    for (const table of checkpointTables) {
      try {
        await db(table).del();
      } catch (error) {
        console.warn(`Warning: Could not clean table ${table}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in cleanCheckpointDatabase:', error);
    throw error;
  }
}

/**
 * Clean all test data - comprehensive cleanup
 */
export async function cleanAllTestData(): Promise<void> {
  await cleanCheckpointDatabase();
  await cleanCurriculumDatabase();
  await cleanDatabase();
}
