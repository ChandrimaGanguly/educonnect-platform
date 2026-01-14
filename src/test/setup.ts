/**
 * Jest global setup file
 * This file runs before all tests
 */

// Set test environment variables
// Only set defaults if not already set (e.g., by CI environment)
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://educonnect:changeme@localhost:5432/educonnect_test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only-min-32-chars';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-session-secret-for-testing-only-min-32';

// Increase timeout for integration tests
jest.setTimeout(10000);

// Mock nanoid to avoid ESM import issues
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test-nanoid-123'),
}));

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
