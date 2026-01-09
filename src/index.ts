import { buildApp } from './app';
import { env, logger } from './config';
import { closeDatabase } from './database';
import { closeRedis } from './config/redis';

async function start() {
  let app;

  try {
    // Build Fastify app
    app = await buildApp();

    // Start server
    await app.listen({
      port: env.PORT,
      host: '0.0.0.0',
    });

    logger.info(
      `🚀 EduConnect Platform API started on port ${env.PORT} in ${env.NODE_ENV} mode`
    );
  } catch (error) {
    logger.error(error, 'Failed to start server');
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully...`);

    try {
      if (app) {
        await app.close();
        logger.info('Fastify server closed');
      }

      await closeDatabase();
      logger.info('Database connection closed');

      await closeRedis();
      logger.info('Redis connection closed');

      process.exit(0);
    } catch (error) {
      logger.error(error, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught errors
  process.on('unhandledRejection', (reason, promise) => {
    logger.error({ promise, reason }, 'Unhandled Rejection');
  });

  process.on('uncaughtException', (error) => {
    logger.error(error, 'Uncaught Exception');
    process.exit(1);
  });
}

// Start the server
start();
