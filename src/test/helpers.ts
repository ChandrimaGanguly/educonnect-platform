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

  // Delete from all tables in correct dependency order
  // Note: We don't use session_replication_role = replica because it can
  // interfere with CASCADE behavior on foreign keys

  // Delete from tables with no dependencies first (deepest children)
  await db('trust_score_history').del();
  await db('trust_events').del();
  await db('user_trust_relationships').del();
  await db('community_trust_relationships').del();
  await db('trust_permission_rules').del();

  // Delete from tables that depend on communities and users
  await db('community_members').del();
  await db('community_invitations').del();
  await db('community_join_requests').del();
  await db('role_permissions').del();
  await db('user_roles').del();
  await db('permissions').del();
  await db('roles').del();

  // Delete sessions
  await db('sessions').del();

  // Delete from parent tables last
  await db('communities').del();
  await db('users').del();
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
