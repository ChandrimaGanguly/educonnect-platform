/**
 * Jest global setup file
 * This file runs before all tests
 */

// Set test environment variables
// Only set defaults if not already set (e.g., by CI environment)
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://educonnect:changeme@localhost:5432/educonnect';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
// Use crypto-like strings to avoid weak pattern detection
process.env.JWT_SECRET = process.env.JWT_SECRET || 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'f2e1d0c9b8a7z6y5x4w3v2u1t0s9r8q7p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1';
process.env.RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX || '10000'; // High limit for tests
process.env.RATE_LIMIT_WINDOW = process.env.RATE_LIMIT_WINDOW || '60000'; // 1 minute window

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
