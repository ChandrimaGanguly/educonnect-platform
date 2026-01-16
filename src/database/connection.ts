import knex, { Knex } from 'knex';
import knexConfig from '../../knexfile';
import { logger } from '../config/logger';

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];

let db: Knex | null = null;

export function getDatabase(): Knex {
  if (!db) {
    db = knex(config);
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.destroy();
    db = null;
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    const db = getDatabase();
    await db.raw('SELECT 1');
    return true;
  } catch (error) {
    logger.error({ error }, 'Database health check failed');
    return false;
  }
}

export default getDatabase;
