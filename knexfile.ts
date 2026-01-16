import type { Knex } from 'knex';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

// Load environment variables from .env.local (preferred) or .env
const envLocalPath = resolve(process.cwd(), '.env.local');
const envPath = resolve(process.cwd(), '.env');

if (existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else {
  dotenv.config({ path: envPath });
}

// Determine if we're running in production/staging (compiled) or development (TypeScript)
const isProd = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
const migrationsDir = isProd
  ? resolve(__dirname, 'src/database/migrations')
  : resolve(__dirname, 'src/database/migrations');
const migrationsExt = isProd ? 'js' : 'ts';
const seedsDir = isProd
  ? resolve(__dirname, 'src/database/seeds')
  : resolve(__dirname, 'src/database/seeds');

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL || {
      host: 'localhost',
      port: 5432,
      user: 'educonnect',
      password: process.env.DB_PASSWORD || 'changeme',
      database: 'educonnect',
    },
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: migrationsDir,
      extension: migrationsExt,
    },
    seeds: {
      directory: seedsDir,
      extension: migrationsExt,
    },
  },

  test: {
    client: 'postgresql',
    connection: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || {
      host: 'localhost',
      port: 5432,
      user: 'educonnect',
      password: process.env.DB_PASSWORD || 'changeme',
      database: 'educonnect_test',
    },
    pool: {
      min: 2,
      max: 20,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 1000,
      reapIntervalMillis: 100,
    },
    acquireConnectionTimeout: 30000,
    migrations: {
      tableName: 'knex_migrations',
      directory: migrationsDir,
      extension: migrationsExt,
    },
    seeds: {
      directory: seedsDir,
      extension: migrationsExt,
    },
  },

  staging: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: migrationsDir,
      extension: migrationsExt,
    },
  },

  production: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL,
    pool: {
      min: 5,
      max: 20,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: migrationsDir,
      extension: migrationsExt,
    },
    acquireConnectionTimeout: 10000,
  },
};

export default config;
