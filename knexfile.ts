import type { Knex } from 'knex';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config();

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
      directory: resolve(__dirname, 'src/database/migrations'),
      extension: 'ts',
    },
    seeds: {
      directory: resolve(__dirname, 'src/database/seeds'),
      extension: 'ts',
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
      directory: resolve(__dirname, 'src/database/migrations'),
      extension: 'ts',
    },
    seeds: {
      directory: resolve(__dirname, 'src/database/seeds'),
      extension: 'ts',
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
      directory: resolve(__dirname, 'dist/database/migrations'),
      extension: 'js',
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
      directory: resolve(__dirname, 'dist/database/migrations'),
      extension: 'js',
    },
    acquireConnectionTimeout: 10000,
  },
};

export default config;
