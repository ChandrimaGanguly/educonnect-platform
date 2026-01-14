/**
 * Test helper utilities
 */
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app';
import { getDatabase, closeDatabase } from '../database';
import { closeRedis } from '../config/redis';

/**
 * Create a test Fastify instance
 */
export async function createTestApp(): Promise<FastifyInstance> {
  return await buildApp();
}

/**
 * Clean up test resources
 */
export async function cleanupTestApp(app: FastifyInstance): Promise<void> {
  await app.close();
  await closeDatabase();
  await closeRedis();
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
 */
export async function createTestUser(overrides = {}) {
  const db = getDatabase();

  const defaultUser = {
    email: 'test@example.com',
    username: 'testuser',
    password_hash: '$2b$12$test.hash.value',
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

  const defaultCommunity = {
    name: 'Test Community',
    slug: 'test-community',
    description: 'A test community',
    type: 'public',
    status: 'active',
    created_by: createdBy,
    ...overrides,
  };

  const [community] = await db('communities').insert(defaultCommunity).returning('*');
  return community;
}

/**
 * Generate a test JWT token
 */
export function generateTestToken(app: FastifyInstance, payload: any): string {
  return app.jwt.sign(payload);
}
