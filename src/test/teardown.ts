/**
 * Jest global teardown file
 * This file runs after all tests complete
 */
import { closeDatabase } from '../database';
import { closeRedis } from '../config/redis';

export default async function globalTeardown() {
  // Close database connections
  try {
    await closeDatabase();
  } catch (error) {
    console.error('Error closing database:', error);
  }

  // Close Redis connections
  try {
    await closeRedis();
  } catch (error) {
    console.error('Error closing Redis:', error);
  }
}
