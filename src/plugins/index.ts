import { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyJwt from '@fastify/jwt';
import fastifyRedis from '@fastify/redis';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyMultipart from '@fastify/multipart';
import fastifyCompress from '@fastify/compress';
import fastifySwagger from '@fastify/swagger';
import { config } from '../config';

export async function registerPlugins(server: FastifyInstance): Promise<void> {
  // Security headers
  await server.register(fastifyHelmet, {
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
  await server.register(fastifyCors, {
    origin: config.cors.origin,
    credentials: config.cors.credentials,
  });

  // Compression
  await server.register(fastifyCompress, {
    global: true,
  });

  // JWT
  await server.register(fastifyJwt, {
    secret: config.jwt.secret,
    sign: {
      expiresIn: config.jwt.accessTokenExpiry,
    },
  });

  // Redis
  await server.register(fastifyRedis, {
    url: config.redis.url,
  });

  // Rate limiting
  await server.register(fastifyRateLimit, {
    max: config.rateLimit.global.max,
    timeWindow: config.rateLimit.global.timeWindow,
    redis: server.redis,
  });

  // Multipart (file uploads)
  await server.register(fastifyMultipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  });

  // Swagger/OpenAPI
  await server.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'EduConnect Platform API',
        description: 'Community-based educational social media platform API',
        version: '0.1.0',
      },
      servers: [
        {
          url: `http://localhost:${config.port}`,
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  server.log.info('Plugins registered successfully');
}
