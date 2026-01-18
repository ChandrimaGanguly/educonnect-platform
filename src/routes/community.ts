import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CommunityService } from '../services/community.service';
import { authenticate } from '../middleware/auth';
import {
  createCommunitySchema,
  updateCommunitySchema,
  invitationSchema,
  approveRequestSchema,
  listCommunitiesSchema,
  listMembersSchema,
} from '../utils/validation';

// Singleton service
const communityService = new CommunityService();

export async function communityRoutes(server: FastifyInstance): Promise<void> {

  // ========== Community CRUD ==========

  /**
   * POST /communities
   * Create a new community
   */
  server.post('/communities', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;
      const data = createCommunitySchema.parse(request.body);

      // Ensure required fields are present
      const communityData = {
        name: data.name!,
        description: data.description || '',
        type: data.type,
        welcome_message: data.welcome_message,
        logo_url: data.logo_url,
        banner_url: data.banner_url,
        primary_language: data.primary_language,
        tags: data.tags,
        settings: data.settings,
      };

      const community = await communityService.createCommunity(userId, communityData);

      return reply.status(201).send({
        message: 'Community created successfully',
        community,
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }
      throw error;
    }
  });

  /**
   * GET /communities/:communityId
   * Get community details by ID
   */
  server.get('/communities/:communityId', async (request: FastifyRequest<{ Params: { communityId: string } }>, reply: FastifyReply) => {
    const { communityId } = request.params;

    const community = await communityService.getCommunityById(communityId);

    if (!community) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Community not found',
      });
    }

    return { community };
  });

  /**
   * GET /communities/slug/:slug
   * Get community details by slug
   */
  server.get('/communities/slug/:slug', async (request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
    const { slug } = request.params;

    const community = await communityService.getCommunityBySlug(slug);

    if (!community) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Community not found',
      });
    }

    return { community };
  });

  /**
   * PATCH /communities/:communityId
   * Update community details
   */
  server.patch('/communities/:communityId', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { communityId: string } }>, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;
      const { communityId } = request.params;
      const data = updateCommunitySchema.parse(request.body);

      // Check if user has admin or owner role
      const hasPermission = await communityService.hasRole(communityId, userId, ['admin', 'owner']);

      if (!hasPermission) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You do not have permission to update this community',
        });
      }

      const community = await communityService.updateCommunity(communityId, data);

      return {
        message: 'Community updated successfully',
        community,
      };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }
      throw error;
    }
  });

  /**
   * DELETE /communities/:communityId
   * Archive a community (soft delete)
   */
  server.delete('/communities/:communityId', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { communityId: string } }>, reply: FastifyReply) => {
    const { userId } = request.user!;
    const { communityId } = request.params;

    // Check if user is owner
    const hasPermission = await communityService.hasRole(communityId, userId, ['owner']);

    if (!hasPermission) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Only community owners can archive the community',
      });
    }

    await communityService.archiveCommunity(communityId);

    return {
      message: 'Community archived successfully',
    };
  });

  // ========== Community Discovery ==========

  /**
   * GET /communities
   * List and search communities with filters
   */
  server.get('/communities', async (request: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) => {
    try {
      const queryParams = listCommunitiesSchema.parse(request.query);

      const result = await communityService.listCommunities({
        search: queryParams.search,
        type: queryParams.type,
        tags: queryParams.tags,
        limit: queryParams.limit,
        offset: queryParams.offset,
      });

      return {
        communities: result.communities,
        total: result.total,
        pagination: {
          limit: queryParams.limit,
          offset: queryParams.offset,
        },
      };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }
      throw error;
    }
  });

  // ========== Community Membership ==========

  /**
   * GET /communities/:communityId/members
   * Get community members
   * SECURITY: Access control based on community type
   */
  server.get('/communities/:communityId/members', async (request: FastifyRequest<{
    Params: { communityId: string };
    Querystring: any;
  }>, reply: FastifyReply) => {
    try {
      const { communityId } = request.params;
      const queryParams = listMembersSchema.parse(request.query);

      // Check if community exists
      const community = await communityService.getCommunityById(communityId);

      if (!community) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Community not found',
        });
      }

      // SECURITY FIX: Proper access control for non-public communities
      // Private/invite-only communities require authentication AND membership
      if (community.type === 'private' || community.type === 'invite_only') {
        // Require authentication
        if (!request.user) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'You must be logged in to view this member list',
          });
        }

        // Require membership
        const { userId } = request.user;
        const isMember = await communityService.isMember(communityId, userId);

        if (!isMember) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'You must be a member to view the member list',
          });
        }
      }

      const result = await communityService.getCommunityMembers(communityId, {
        status: queryParams.status,
        membership_type: queryParams.membership_type,
        limit: queryParams.limit,
        offset: queryParams.offset,
      });

      return {
        members: result.members,
        total: result.total,
        pagination: {
          limit: queryParams.limit,
          offset: queryParams.offset,
        },
      };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }
      throw error;
    }
  });

  /**
   * POST /communities/:communityId/join
   * Join a community
   */
  server.post('/communities/:communityId/join', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Params: { communityId: string };
    Body: { invitation_token?: string; message?: string };
  }>, reply: FastifyReply) => {
    const { userId } = request.user!;
    const { communityId } = request.params;
    const body = request.body as any;

    const community = await communityService.getCommunityById(communityId);

    if (!community) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Community not found',
      });
    }

    // Check if already a member
    const isMember = await communityService.isMember(communityId, userId);

    if (isMember) {
      return reply.status(409).send({
        error: 'Conflict',
        message: 'You are already a member of this community',
      });
    }

    // Handle different community types
    if (community.type === 'public' || community.auto_approve_members) {
      // Auto-approve for public communities
      const member = await communityService.addMember(communityId, userId, {
        auto_approve: true,
      });

      return reply.status(201).send({
        message: 'Successfully joined the community',
        member,
      });
    } else if (community.type === 'invite_only') {
      // Require invitation token
      if (!body.invitation_token) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Invitation token is required for invite-only communities',
        });
      }

      // Accept invitation
      const member = await communityService.acceptInvitation(body.invitation_token, userId);

      return reply.status(201).send({
        message: 'Successfully joined the community',
        member,
      });
    } else {
      // Create join request for private communities
      const joinRequest = await communityService.createJoinRequest(
        communityId,
        userId,
        body?.message || null
      );

      return reply.status(202).send({
        message: 'Join request submitted and pending approval',
        joinRequest,
      });
    }
  });

  /**
   * POST /communities/:communityId/leave
   * Leave a community
   * SECURITY: Uses atomic check-and-remove to prevent race condition
   */
  server.post('/communities/:communityId/leave', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { communityId: string } }>, reply: FastifyReply) => {
    const { userId } = request.user!;
    const { communityId } = request.params;

    // SECURITY: Atomic membership removal with last-owner check
    // Prevents TOCTOU race condition using pessimistic locking
    const result = await communityService.removeMemberIfNotLastOwner(communityId, userId);

    if (!result.success) {
      const statusCode = result.error?.includes('not a member') ? 404 : 400;
      return reply.status(statusCode).send({
        error: statusCode === 404 ? 'Not Found' : 'Bad Request',
        message: result.error,
      });
    }

    return {
      message: 'Successfully left the community',
    };
  });

  // ========== Community Invitations ==========

  /**
   * POST /communities/:communityId/invite
   * Invite a user to the community
   */
  server.post('/communities/:communityId/invite', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { communityId: string } }>, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;
      const { communityId } = request.params;
      const data = invitationSchema.parse(request.body);

      const community = await communityService.getCommunityById(communityId);

      if (!community) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Community not found',
        });
      }

      // Check if user can invite (member or admin if allow_member_invites is false)
      const isMember = await communityService.isMember(communityId, userId);

      if (!isMember) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You must be a member to invite others',
        });
      }

      if (!community.allow_member_invites) {
        const hasPermission = await communityService.hasRole(communityId, userId, ['admin', 'owner']);

        if (!hasPermission) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Only admins can invite members to this community',
          });
        }
      }

      const invitation = await communityService.createInvitation(
        communityId,
        userId,
        data.invitee_email || '',
        {
          inviteeId: data.invitee_id,
          message: data.message,
        }
      );

      return reply.status(201).send({
        message: 'Invitation sent successfully',
        invitation,
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }
      throw error;
    }
  });

  /**
   * POST /communities/invitations/:token/accept
   * Accept a community invitation
   */
  server.post('/communities/invitations/:token/accept', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { token: string } }>, reply: FastifyReply) => {
    const { userId } = request.user!;
    const { token } = request.params;

    const member = await communityService.acceptInvitation(token, userId);

    return {
      message: 'Invitation accepted successfully',
      member,
    };
  });

  /**
   * POST /communities/invitations/:token/decline
   * Decline a community invitation
   */
  server.post('/communities/invitations/:token/decline', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { token: string } }>, reply: FastifyReply) => {
    const { token } = request.params;

    await communityService.declineInvitation(token);

    return {
      message: 'Invitation declined',
    };
  });

  // ========== Join Requests ==========

  /**
   * GET /communities/:communityId/join-requests
   * Get pending join requests for a community
   */
  server.get('/communities/:communityId/join-requests', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { communityId: string } }>, reply: FastifyReply) => {
    const { userId } = request.user!;
    const { communityId } = request.params;

    // Check if user has permission (admin or owner)
    const hasPermission = await communityService.hasRole(communityId, userId, ['admin', 'owner']);

    if (!hasPermission) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'You do not have permission to view join requests',
      });
    }

    const requests = await communityService.getPendingJoinRequests(communityId);

    return { requests };
  });

  /**
   * POST /communities/:communityId/join-requests/:requestId/approve
   * Approve a join request
   */
  server.post('/communities/:communityId/join-requests/:requestId/approve', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { communityId: string; requestId: string } }>, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;
      const { communityId, requestId } = request.params;
      const data = approveRequestSchema.parse(request.body);

      // Check if user has permission (admin or owner)
      const hasPermission = await communityService.hasRole(communityId, userId, ['admin', 'owner']);

      if (!hasPermission) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You do not have permission to approve join requests',
        });
      }

      await communityService.approveJoinRequest(requestId, userId, data.notes);

      return {
        message: 'Join request approved successfully',
      };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }
      throw error;
    }
  });

  /**
   * POST /communities/:communityId/join-requests/:requestId/reject
   * Reject a join request
   */
  server.post('/communities/:communityId/join-requests/:requestId/reject', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { communityId: string; requestId: string } }>, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;
      const { communityId, requestId } = request.params;
      const data = approveRequestSchema.parse(request.body);

      // Check if user has permission (admin or owner)
      const hasPermission = await communityService.hasRole(communityId, userId, ['admin', 'owner']);

      if (!hasPermission) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You do not have permission to reject join requests',
        });
      }

      await communityService.rejectJoinRequest(requestId, userId, data.notes);

      return {
        message: 'Join request rejected',
      };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }
      throw error;
    }
  });
}
