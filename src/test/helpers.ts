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
