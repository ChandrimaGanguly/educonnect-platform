import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import compress from '@fastify/compress';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import jwt from '@fastify/jwt';
import { env, logger } from './config';
import { getRedisClient } from './config/redis';

export async function buildApp() {
  const app = Fastify({
    logger,
    requestIdLogLabel: 'reqId',
    disableRequestLogging: false,
    trustProxy: true,
  });

  // Security plugins
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  });

  // CORS
  await app.register(cors, {
    origin: env.NODE_ENV === 'production'
      ? ['https://educonnect.org', 'https://app.educonnect.org']
      : true,
    credentials: true,
  });

  // Compression
  await app.register(compress, {
    global: true,
    threshold: 1024,
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
    redis: getRedisClient(),
    nameSpace: 'rate-limit:',
    skipOnError: true,
  });

  // File upload support
  await app.register(multipart, {
    limits: {
      fieldNameSize: 100,
      fieldSize: 100,
      fields: 10,
      fileSize: env.MAX_FILE_SIZE,
      files: 5,
      headerPairs: 2000,
    },
  });

  // JWT authentication
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.JWT_EXPIRES_IN,
    },
  });

  // Health check endpoint
  app.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV,
    };
  });

  // Readiness check endpoint
  app.get('/ready', async (request, reply) => {
    try {
      // Check database connection
      const { healthCheck } = await import('./database');
      const dbHealthy = await healthCheck();

      // Check Redis connection
      const { redisHealthCheck } = await import('./config/redis');
      const redisHealthy = await redisHealthCheck();

      if (!dbHealthy || !redisHealthy) {
        return reply.status(503).send({
          status: 'not_ready',
          database: dbHealthy,
          redis: redisHealthy,
        });
      }

      return {
        status: 'ready',
        database: dbHealthy,
        redis: redisHealthy,
      };
    } catch (error) {
      return reply.status(503).send({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Root endpoint
  app.get('/', async (request, reply) => {
    return {
      name: 'EduConnect Platform API',
      version: '0.1.0',
      documentation: '/docs',
    };
  });

  // Register authentication routes
  const { authRoutes } = await import('./routes/auth');
  await app.register(authRoutes, { prefix: '/api/v1/auth' });

  // Register role and permission routes
  const { roleRoutes } = await import('./routes/roles');
  await app.register(roleRoutes, { prefix: '/api/v1' });

  // Register content routes
  const { contentRoutes } = await import('./routes/content');
  await app.register(contentRoutes, { prefix: '/api/v1/content' });

  // Register GraphQL server
  const { registerGraphQL } = await import('./graphql');
  await registerGraphQL(app);

  // 404 handler
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: 'Not Found',
      message: 'The requested resource does not exist',
      statusCode: 404,
    });
  });

  // Global error handler
  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    const statusCode = error.statusCode || 500;
    const message = statusCode === 500
      ? 'Internal Server Error'
      : error.message;

    reply.status(statusCode).send({
      error: error.name || 'Error',
      message,
      statusCode,
      ...(env.NODE_ENV === 'development' && { stack: error.stack }),
    });
  });

  return app;
}

export default buildApp;
