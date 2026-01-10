import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { communityTrustService, TrustLevel, TrustStatus } from '../services/community-trust';
import { auditService } from '../services/audit';
import { CommunityService } from '../services/community.service';
import { authenticate } from '../middleware/auth';

// Singleton service
const communityService = new CommunityService();

/**
 * Community Trust Network Routes
 *
 * API endpoints for managing inter-community trust relationships
 */

/**
 * Helper to verify user is admin/owner of a community
 */
async function verifyUserIsCommunityAdmin(
  userId: string,
  communityId: string
): Promise<boolean> {
  const hasRole = await communityService.hasRole(communityId, userId, ['admin', 'owner']);
  return hasRole;
}

interface CreateTrustBody {
  fromCommunityId: string;
  toCommunityId: string;
  trustLevel?: TrustLevel;
  sharingPermissions?: Record<string, any>;
  notes?: string;
  probationDays?: number;
}

interface ApproveTrustBody {
  securityComplianceVerified?: boolean;
  notes?: string;
}

interface UpdateTrustBody {
  trustLevel?: TrustLevel;
  sharingPermissions?: Record<string, any>;
  notes?: string;
}

interface RevokeTrustBody {
  reason: string;
}

interface SuspendTrustBody {
  reason: string;
}

export async function communityTrustRoutes(server: FastifyInstance): Promise<void> {
  // Create trust relationship
  server.post('/community-trust', {
    preHandler: [authenticate],
    schema: {
      description: 'Initiate a trust relationship between two communities',
      tags: ['community-trust'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['fromCommunityId', 'toCommunityId'],
        properties: {
          fromCommunityId: { type: 'string', format: 'uuid' },
          toCommunityId: { type: 'string', format: 'uuid' },
          trustLevel: { type: 'string', enum: ['limited', 'standard', 'full'] },
          sharingPermissions: { type: 'object' },
          notes: { type: 'string' },
          probationDays: { type: 'integer', minimum: 1 },
        },
      },
      response: {
        201: {
          description: 'Trust relationship created',
          type: 'object',
          properties: {
            id: { type: 'string' },
            status: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: CreateTrustBody }>, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;

      // Verify user is admin of the source community
      const isAdmin = await verifyUserIsCommunityAdmin(userId, request.body.fromCommunityId);
      if (!isAdmin) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'You must be an admin of the source community to create trust relationships',
        });
      }

      const trust = await communityTrustService.createTrustRelationship({
        ...request.body,
        initiatedBy: userId,
      });

      return reply.code(201).send({
        id: trust.id,
        status: trust.status,
        message: 'Trust relationship initiated. Awaiting approval.',
      });
    } catch (error: any) {
      request.log.error(error);

      if (error.message.includes('not found') || error.message.includes('already exists')) {
        return reply.code(400).send({ error: error.message });
      }

      return reply.code(500).send({ error: 'Failed to create trust relationship' });
    }
  });

  // Approve trust relationship
  server.post('/community-trust/:trustId/approve', {
    preHandler: [authenticate],
    schema: {
      description: 'Approve a pending trust relationship',
      tags: ['community-trust'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          trustId: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        properties: {
          securityComplianceVerified: { type: 'boolean' },
          notes: { type: 'string' },
        },
      },
      response: {
        200: {
          description: 'Trust relationship approved',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest<{
    Params: { trustId: string };
    Body: ApproveTrustBody;
  }>, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;

      const trust = await communityTrustService.approveTrustRelationship({
        trustId: request.params.trustId,
        approvedBy: userId,
        ...request.body,
      });

      return reply.send(trust);
    } catch (error: any) {
      request.log.error(error);

      if (error.message.includes('not found') || error.message.includes('not in pending')) {
        return reply.code(400).send({ error: error.message });
      }

      return reply.code(500).send({ error: 'Failed to approve trust relationship' });
    }
  });

  // Update trust relationship
  server.patch('/community-trust/:trustId', {
    preHandler: [authenticate],
    schema: {
      description: 'Update trust relationship settings',
      tags: ['community-trust'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          trustId: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        properties: {
          trustLevel: { type: 'string', enum: ['limited', 'standard', 'full'] },
          sharingPermissions: { type: 'object' },
          notes: { type: 'string' },
        },
      },
      response: {
        200: {
          description: 'Trust relationship updated',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest<{
    Params: { trustId: string };
    Body: UpdateTrustBody;
  }>, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;

      const trust = await communityTrustService.updateTrustRelationship({
        trustId: request.params.trustId,
        userId,
        ...request.body,
      });

      return reply.send(trust);
    } catch (error: any) {
      request.log.error(error);

      if (error.message.includes('not found')) {
        return reply.code(404).send({ error: error.message });
      }

      return reply.code(500).send({ error: 'Failed to update trust relationship' });
    }
  });

  // Suspend trust relationship
  server.post('/community-trust/:trustId/suspend', {
    preHandler: [authenticate],
    schema: {
      description: 'Suspend a trust relationship temporarily',
      tags: ['community-trust'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          trustId: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['reason'],
        properties: {
          reason: { type: 'string' },
        },
      },
      response: {
        200: {
          description: 'Trust relationship suspended',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest<{
    Params: { trustId: string };
    Body: SuspendTrustBody;
  }>, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;

      const trust = await communityTrustService.suspendTrustRelationship(
        request.params.trustId,
        userId,
        request.body.reason
      );

      return reply.send(trust);
    } catch (error: any) {
      request.log.error(error);

      if (error.message.includes('not found')) {
        return reply.code(404).send({ error: error.message });
      }

      return reply.code(500).send({ error: 'Failed to suspend trust relationship' });
    }
  });

  // Revoke trust relationship
  server.post('/community-trust/:trustId/revoke', {
    preHandler: [authenticate],
    schema: {
      description: 'Revoke a trust relationship permanently',
      tags: ['community-trust'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          trustId: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['reason'],
        properties: {
          reason: { type: 'string' },
        },
      },
      response: {
        200: {
          description: 'Trust relationship revoked',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest<{
    Params: { trustId: string };
    Body: RevokeTrustBody;
  }>, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;

      const trust = await communityTrustService.revokeTrustRelationship({
        trustId: request.params.trustId,
        revokedBy: userId,
        reason: request.body.reason,
      });

      return reply.send(trust);
    } catch (error: any) {
      request.log.error(error);

      if (error.message.includes('not found')) {
        return reply.code(404).send({ error: error.message });
      }

      return reply.code(500).send({ error: 'Failed to revoke trust relationship' });
    }
  });

  // End probation
  server.post('/community-trust/:trustId/end-probation', {
    preHandler: [authenticate],
    schema: {
      description: 'End probationary period for a trust relationship',
      tags: ['community-trust'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          trustId: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          description: 'Probation ended',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest<{
    Params: { trustId: string };
  }>, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;

      const trust = await communityTrustService.endProbation(request.params.trustId, userId);

      return reply.send(trust);
    } catch (error: any) {
      request.log.error(error);

      if (error.message.includes('not found') || error.message.includes('not in probationary')) {
        return reply.code(400).send({ error: error.message });
      }

      return reply.code(500).send({ error: 'Failed to end probation' });
    }
  });

  // Get community trust relationships
  server.get('/communities/:communityId/trust', {
    schema: {
      description: 'Get trust relationships for a community',
      tags: ['community-trust'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          communityId: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['pending', 'active', 'suspended', 'revoked'] },
        },
      },
      response: {
        200: {
          description: 'List of trust relationships',
          type: 'array',
          items: { type: 'object' },
        },
      },
    },
  }, async (request: FastifyRequest<{
    Params: { communityId: string };
    Querystring: { status?: TrustStatus };
  }>, reply: FastifyReply) => {
    try {
      const trusts = await communityTrustService.getCommunityTrustRelationships(
        request.params.communityId,
        request.query.status
      );

      return reply.send(trusts);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch trust relationships' });
    }
  });

  // Get trusted communities
  server.get('/communities/:communityId/trusted-communities', {
    schema: {
      description: 'Get communities trusted by this community',
      tags: ['community-trust'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          communityId: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          minTrustLevel: { type: 'string', enum: ['limited', 'standard', 'full'] },
        },
      },
      response: {
        200: {
          description: 'List of trusted community IDs',
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest<{
    Params: { communityId: string };
    Querystring: { minTrustLevel?: TrustLevel };
  }>, reply: FastifyReply) => {
    try {
      const trustedIds = await communityTrustService.getTrustedCommunities(
        request.params.communityId,
        request.query.minTrustLevel
      );

      return reply.send(trustedIds);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch trusted communities' });
    }
  });

  // Check trust between two communities
  server.get('/community-trust/check/:community1Id/:community2Id', {
    schema: {
      description: 'Check if trust exists between two communities',
      tags: ['community-trust'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          community1Id: { type: 'string', format: 'uuid' },
          community2Id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          description: 'Trust status',
          type: 'object',
          properties: {
            exists: { type: 'boolean' },
            trust: { type: 'object', nullable: true },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{
    Params: { community1Id: string; community2Id: string };
  }>, reply: FastifyReply) => {
    try {
      const trust = await communityTrustService.checkTrust(
        request.params.community1Id,
        request.params.community2Id
      );

      return reply.send({
        exists: trust !== null,
        trust,
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to check trust' });
    }
  });
}
