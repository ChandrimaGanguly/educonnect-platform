import { GraphQLScalarType, Kind } from 'graphql';
import { UserService } from '../services/user.service';
import { SessionService } from '../services/session.service';
import { verifyPassword } from '../utils/password';
import { verifyTotp, generateTotpUri } from '../utils/mfa';

// Custom scalar for DateTime
const dateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'Date custom scalar type',
  serialize(value: any) {
    return value instanceof Date ? value.toISOString() : value;
  },
  parseValue(value: any) {
    return new Date(value);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

export const resolvers = {
  DateTime: dateTimeScalar,

  Query: {
    me: async (_: any, __: any, context: any) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const userService = new UserService();
      const user = await userService.findById(context.user.userId);

      if (!user) {
        throw new Error('User not found');
      }

      return {
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
      };
    },

    mySessions: async (_: any, __: any, context: any) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const sessionService = new SessionService();
      const sessions = await sessionService.findUserSessions(context.user.userId);

      return sessions.map((session) => ({
        id: session.id,
        deviceInfo: session.device_info,
        ipAddress: session.ip_address,
        createdAt: session.created_at,
        lastActivityAt: session.last_activity_at,
      }));
    },
  },

  Mutation: {
    register: async (_: any, { input }: any, context: any) => {
      const userService = new UserService();
      const sessionService = new SessionService();

      // Check if email already exists
      if (await userService.emailExists(input.email)) {
        throw new Error('Email address is already registered');
      }

      // Check if username already exists
      if (await userService.usernameExists(input.username)) {
        throw new Error('Username is already taken');
      }

      // Create user
      const user = await userService.createUser({
        email: input.email,
        username: input.username,
        password: input.password,
        fullName: input.fullName,
      });

      // Create session
      const { accessToken, refreshToken } = await sessionService.createSession({
        userId: user.id,
        email: user.email,
        ipAddress: context.request?.ip,
        userAgent: context.request?.headers['user-agent'],
      });

      return {
        accessToken,
        refreshToken,
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
    },

    login: async (_: any, { input }: any, context: any) => {
      const userService = new UserService();
      const sessionService = new SessionService();

      // Find user by email or username
      const user = await userService.findByEmailOrUsername(input.emailOrUsername);

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Verify password
      const isValid = await verifyPassword(input.password, user.password_hash);

      if (!isValid) {
        throw new Error('Invalid credentials');
      }

      // Check if account is active
      if (user.status !== 'active') {
        throw new Error(`Account is ${user.status}`);
      }

      // Check MFA if enabled
      if (user.mfa_enabled) {
        if (!input.mfaCode) {
          throw new Error('Multi-factor authentication code is required');
        }

        if (!user.mfa_secret) {
          throw new Error('MFA configuration error');
        }

        const isMfaValid = verifyTotp(user.mfa_secret, input.mfaCode);

        if (!isMfaValid) {
          throw new Error('Invalid MFA code');
        }
      }

      // Update last login
      await userService.updateLastLogin(user.id);

      // Create session
      const { accessToken, refreshToken } = await sessionService.createSession({
        userId: user.id,
        email: user.email,
        ipAddress: context.request?.ip,
        userAgent: context.request?.headers['user-agent'],
      });

      return {
        accessToken,
        refreshToken,
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
    },

    refreshToken: async (_: any, { refreshToken }: any, context: any) => {
      const userService = new UserService();
      const sessionService = new SessionService();

      // Find session by refresh token
      const session = await sessionService.findByRefreshToken(refreshToken);

      if (!session) {
        throw new Error('Invalid refresh token');
      }

      // Check if session is active
      if (!session.is_active) {
        throw new Error('Session has been revoked');
      }

      // Check if refresh token has expired
      if (new Date(session.refresh_expires_at) < new Date()) {
        await sessionService.revokeSession(session.id, 'Refresh token expired');
        throw new Error('Refresh token has expired');
      }

      // Get user
      const user = await userService.findById(session.user_id);

      if (!user) {
        throw new Error('User not found');
      }

      // Refresh session
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
        await sessionService.refreshSession(session.id, user.id, user.email);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
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
    },

    logout: async (_: any, __: any, context: any) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const sessionService = new SessionService();
      await sessionService.revokeSession(context.user.sessionId, 'User logged out');

      return true;
    },

    logoutAll: async (_: any, __: any, context: any) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const sessionService = new SessionService();
      await sessionService.revokeAllUserSessions(context.user.userId, context.user.sessionId);

      return true;
    },

    revokeSession: async (_: any, { sessionId }: any, context: any) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const sessionService = new SessionService();
      const session = await sessionService.findById(sessionId);

      if (!session || session.user_id !== context.user.userId) {
        throw new Error('Session not found');
      }

      await sessionService.revokeSession(sessionId, 'User revoked session');

      return true;
    },

    updateProfile: async (_: any, { input }: any, context: any) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const userService = new UserService();
      const user = await userService.updateUser(context.user.userId, {
        full_name: input.fullName,
        bio: input.bio,
        locale: input.locale,
        timezone: input.timezone,
      });

      return {
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
      };
    },

    setupMfa: async (_: any, { password }: any, context: any) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const userService = new UserService();
      const user = await userService.findById(context.user.userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Verify password
      const isValid = await verifyPassword(password, user.password_hash);

      if (!isValid) {
        throw new Error('Invalid password');
      }

      // Check if MFA is already enabled
      if (user.mfa_enabled) {
        throw new Error('MFA is already enabled for this account');
      }

      // Generate MFA secret
      const { secret, backupCodes } = await userService.enableMfa(context.user.userId);

      // Generate QR code URI
      const otpUri = generateTotpUri(secret, user.email);

      return {
        secret,
        qrCodeUri: otpUri,
        backupCodes,
      };
    },

    verifyMfa: async (_: any, { code }: any, context: any) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const userService = new UserService();
      const user = await userService.findById(context.user.userId);

      if (!user || !user.mfa_secret) {
        throw new Error('MFA is not set up for this account');
      }

      const isValid = verifyTotp(user.mfa_secret, code);

      if (!isValid) {
        throw new Error('Invalid MFA code');
      }

      return true;
    },

    disableMfa: async (_: any, __: any, context: any) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const userService = new UserService();
      await userService.disableMfa(context.user.userId);

      return true;
    },
  },
};
