import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ApolloServer } from '@apollo/server';

import { verifyToken } from '../utils/jwt';
import { SessionService } from '../services/session.service';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';

export async function registerGraphQL(app: FastifyInstance): Promise<void> {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await server.start();

  app.post('/graphql', async (request: FastifyRequest, reply: FastifyReply) => {
    // Extract user context from request
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

    const response = await server.executeOperation(
      {
        query: (request.body as { query?: string })?.query || '',
        variables: (request.body as { variables?: Record<string, unknown> })?.variables,
        operationName: (request.body as { operationName?: string })?.operationName,
      },
      {
        contextValue: {
          request,
          user,
        },
      }
    );

    if (response.body.kind === 'single') {
      return reply
        .code(200)
        .header('Content-Type', 'application/json')
        .send(response.body.singleResult);
    }

    return reply.code(500).send({ errors: [{ message: 'Unexpected response' }] });
  });

  app.log.info('GraphQL server registered at /graphql');
}
