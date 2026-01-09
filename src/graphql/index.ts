import { FastifyInstance, FastifyRequest } from 'fastify';
import { ApolloServer } from 'apollo-server-fastify';
import { ApolloServerPluginDrainHttpServer } from 'apollo-server-core';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { verifyToken } from '../utils/jwt';
import { SessionService } from '../services/session.service';

export async function registerGraphQL(app: FastifyInstance): Promise<void> {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: async ({ request }: { request: FastifyRequest }) => {
      // Try to extract user from Authorization header
      let user = null;

      try {
        const authHeader = request.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          const payload = verifyToken(token);

          // Validate session is still active
          const sessionService = new SessionService();
          const isValid = await sessionService.isSessionValid(payload.sessionId);

          if (isValid) {
            user = {
              userId: payload.userId,
              email: payload.email,
              sessionId: payload.sessionId,
            };

            // Update session activity
            await sessionService.updateActivity(payload.sessionId);
          }
        }
      } catch (error) {
        // Invalid token, continue without user
      }

      return {
        request,
        user,
      };
    },
    plugins: [
      ApolloServerPluginDrainHttpServer({
        httpServer: app.server,
      }),
    ],
  });

  await server.start();

  app.register(
    async (fastify) => {
      fastify.route({
        url: '/graphql',
        method: ['GET', 'POST', 'OPTIONS'],
        handler: async (request, reply) => {
          await server.createHandler({
            cors: {
              origin: true,
              credentials: true,
            },
          })(request, reply);
        },
      });
    },
    { prefix: '' }
  );

  app.log.info('GraphQL server registered at /graphql');
}
