import { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyJwt from '@fastify/jwt';
import fastifyRedis from '@fastify/redis';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyMultipart from '@fastify/multipart';
import fastifyCompress from '@fastify/compress';
import fastifySwagger from '@fastify/swagger';
import { env } from '../config';

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
    origin: env.NODE_ENV === 'production' ? ['https://educonnect.org'] : true,
    credentials: true,
  });

  // Compression
  await server.register(fastifyCompress, {
    global: true,
  });

  // JWT
  await server.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.JWT_EXPIRES_IN,
    },
  });

  // Redis
  await server.register(fastifyRedis, {
    url: env.REDIS_URL,
  });

  // Rate limiting
  await server.register(fastifyRateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
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
          url: `http://localhost:${env.PORT}`,
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
