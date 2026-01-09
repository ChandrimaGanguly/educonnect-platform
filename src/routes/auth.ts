import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from '../services/user.service';
import { sessionService } from '../services/session.service';
import { verifyPassword } from '../utils/password';
import { verifyTotp, generateTotpUri } from '../utils/mfa';
import {
  registrationSchema,
  loginSchema,
  passwordResetRequestSchema,
  mfaSetupSchema,
  mfaVerificationSchema,
  refreshTokenSchema,
} from '../utils/validation';
import { authenticate } from '../middleware/auth';
import { env } from '../config';

// Singleton services
const userService = new UserService();

export async function authRoutes(server: FastifyInstance): Promise<void> {

  /**
   * POST /register
   * Register a new user account
   */
  server.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = registrationSchema.parse(request.body);

      // Check if email already exists
      if (await userService.emailExists(data.email)) {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'Email address is already registered',
        });
      }

      // Check if username already exists
      if (await userService.usernameExists(data.username)) {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'Username is already taken',
        });
      }

      // Create user
      const user = await userService.createUser({
        email: data.email,
        username: data.username,
        password: data.password,
        fullName: data.fullName,
      });

      // Create session
      const { accessToken, refreshToken } = await sessionService.createSession({
        userId: user.id,
        email: user.email,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return reply.status(201).send({
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.full_name,
        },
        accessToken,
        refreshToken,
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
   * POST /login
   * Authenticate user and create session
   */
  server.post('/login', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '15 minutes',
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = loginSchema.parse(request.body);

      // Find user by email or username
      const user = await userService.findByEmailOrUsername(data.emailOrUsername);

      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid credentials',
        });
      }

      // Verify password
      const isValid = await verifyPassword(data.password, user.password_hash);

      if (!isValid) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid credentials',
        });
      }

      // Check if account is active
      if (user.status !== 'active') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: `Account is ${user.status}`,
        });
      }

      // Check MFA if enabled
      if (user.mfa_enabled) {
        if (!data.mfaCode) {
          return reply.status(401).send({
            error: 'MFA Required',
            message: 'Multi-factor authentication code is required',
            mfaRequired: true,
          });
        }

        if (!user.mfa_secret) {
          return reply.status(500).send({
            error: 'Server Error',
            message: 'MFA configuration error',
          });
        }

        const isMfaValid = verifyTotp(user.mfa_secret, data.mfaCode);

        if (!isMfaValid) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Invalid MFA code',
          });
        }
      }

      // Update last login
      await userService.updateLastLogin(user.id);

      // Create session
      const { accessToken, refreshToken } = await sessionService.createSession({
        userId: user.id,
        email: user.email,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return {
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.full_name,
          mfaEnabled: user.mfa_enabled,
        },
        accessToken,
        refreshToken,
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
   * POST /refresh
   * Refresh access token using refresh token
   */
  server.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = refreshTokenSchema.parse(request.body);

      // Find session by refresh token
      const session = await sessionService.findByRefreshToken(data.refreshToken);

      if (!session) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid refresh token',
        });
      }

      // Check if session is active
      if (!session.is_active) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Session has been revoked',
        });
      }

      // Check if refresh token has expired
      if (new Date(session.refresh_expires_at) < new Date()) {
        await sessionService.revokeSession(session.id, 'Refresh token expired');
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Refresh token has expired',
        });
      }

      // Get user
      const user = await userService.findById(session.user_id);

      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not found',
        });
      }

      // Refresh session
      const { accessToken, refreshToken } = await sessionService.refreshSession(
        session.id,
        user.id,
        user.email
      );

      return {
        message: 'Token refreshed successfully',
        accessToken,
        refreshToken,
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
   * POST /logout
   * Revoke current session
   */
  server.post('/logout', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { sessionId } = request.user!;

    await sessionService.revokeSession(sessionId, 'User logged out');

    return {
      message: 'Logged out successfully',
    };
  });

  /**
   * POST /logout-all
   * Revoke all sessions for the user
   */
  server.post('/logout-all', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, sessionId } = request.user!;

    await sessionService.revokeAllUserSessions(userId, sessionId);

    return {
      message: 'Logged out from all devices successfully',
    };
  });

  /**
   * GET /sessions
   * Get all active sessions for the user
   */
  server.get('/sessions', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user!;

    const sessions = await sessionService.findUserSessions(userId);

    return {
      sessions: sessions.map((session) => ({
        id: session.id,
        deviceInfo: session.device_info,
        ipAddress: session.ip_address,
        createdAt: session.created_at,
        lastActivityAt: session.last_activity_at,
      })),
    };
  });

  /**
   * DELETE /sessions/:sessionId
   * Revoke a specific session
   */
  server.delete('/sessions/:sessionId', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) => {
    const { userId } = request.user!;
    const { sessionId } = request.params;

    // Verify the session belongs to the user
    const session = await sessionService.findById(sessionId);

    if (!session || session.user_id !== userId) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Session not found',
      });
    }

    await sessionService.revokeSession(sessionId, 'User revoked session');

    return {
      message: 'Session revoked successfully',
    };
  });

  /**
   * POST /password/request-reset
   * Request password reset
   */
  server.post('/password/request-reset', {
    config: {
      rateLimit: {
        max: 3,
        timeWindow: '15 minutes',
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = passwordResetRequestSchema.parse(request.body);

      const user = await userService.findByEmail(data.email);

      // Don't reveal if user exists
      if (!user) {
        return {
          message: 'If the email exists, a password reset link will be sent',
        };
      }

      // TODO: Generate reset token and send email
      // For now, just return success
      request.log.info({ userId: user.id }, 'Password reset requested');

      return {
        message: 'If the email exists, a password reset link will be sent',
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
   * POST /mfa/setup
   * Set up MFA for the user
   */
  server.post('/mfa/setup', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = mfaSetupSchema.parse(request.body);
      const { userId } = request.user!;

      const user = await userService.findById(userId);

      if (!user) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      // Verify password
      const isValid = await verifyPassword(data.password, user.password_hash);

      if (!isValid) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid password',
        });
      }

      // Check if MFA is already enabled (requires feature flag check)
      if (env.ENABLE_MFA && user.mfa_enabled) {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'MFA is already enabled for this account',
        });
      }

      // Generate MFA secret
      const { secret, backupCodes } = await userService.enableMfa(userId);

      // Generate QR code URI
      const otpUri = generateTotpUri(secret, user.email);

      return {
        message: 'MFA setup initiated',
        secret,
        qrCodeUri: otpUri,
        backupCodes,
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
   * POST /mfa/verify
   * Verify MFA code during setup
   */
  server.post('/mfa/verify', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = mfaVerificationSchema.parse(request.body);
      const { userId } = request.user!;

      const user = await userService.findById(userId);

      if (!user || !user.mfa_secret) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'MFA is not set up for this account',
        });
      }

      const isValid = verifyTotp(user.mfa_secret, data.code);

      if (!isValid) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid MFA code',
        });
      }

      return {
        message: 'MFA verified successfully',
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
   * DELETE /mfa
   * Disable MFA for the user
   */
  server.delete('/mfa', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user!;

    await userService.disableMfa(userId);

    return {
      message: 'MFA disabled successfully',
    };
  });

  /**
   * GET /me
   * Get current user information
   */
  server.get('/me', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user!;

    const user = await userService.findById(userId);

    if (!user) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.full_name,
        bio: user.bio,
        avatarUrl: user.avatar_url,
        locale: user.locale,
        timezone: user.timezone,
        emailVerified: user.email_verified,
        mfaEnabled: user.mfa_enabled,
        trustScore: parseFloat(user.trust_score.toString()),
        reputationPoints: user.reputation_points,
        createdAt: user.created_at,
      },
    };
  });
}
