/**
 * SessionService Unit Tests
 */
import { SessionService } from '../session.service';
import { getDatabase } from '../../database';
import { SESSION } from '../../config/constants';

// Mock the database
jest.mock('../../database', () => ({
  getDatabase: jest.fn(),
}));

// Mock JWT utils
jest.mock('../../utils/jwt', () => ({
  generateAccessToken: jest.fn(() => 'mock_access_token'),
  generateRefreshToken: jest.fn(() => 'mock_refresh_token'),
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-session-uuid'),
}));

describe('SessionService', () => {
  let sessionService: SessionService;
  let mockDb: any;
  let mockQueryBuilder: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockQueryBuilder = {
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      whereNot: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(null),
      returning: jest.fn().mockResolvedValue([]),
      orderBy: jest.fn().mockReturnThis(),
    };

    mockDb = jest.fn(() => mockQueryBuilder);
    mockDb.fn = { now: jest.fn(() => 'NOW()') };
    mockDb.raw = jest.fn((sql) => ({ toSQL: () => ({ sql }) }));
    mockDb.transaction = jest.fn(async (callback) => await callback(mockDb));
    (getDatabase as jest.Mock).mockReturnValue(mockDb);

    sessionService = new SessionService();
  });

  describe('createSession', () => {
    it('should create a session with tokens', async () => {
      const sessionData = {
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '127.0.0.1',
        userAgent: 'Test Browser',
      };

      const mockSession = {
        id: 'mock-session-uuid',
        user_id: sessionData.userId,
        is_active: true,
      };

      mockQueryBuilder.returning.mockResolvedValue([mockSession]);

      const result = await sessionService.createSession(sessionData);

      expect(result.accessToken).toBe('mock_access_token');
      expect(result.refreshToken).toBe('mock_refresh_token');
      expect(result.session).toEqual(mockSession);
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'mock-session-uuid',
          user_id: sessionData.userId,
          session_token: 'mock_access_token',
          refresh_token: 'mock_refresh_token',
          ip_address: sessionData.ipAddress,
          user_agent: sessionData.userAgent,
          is_active: true,
        })
      );
    });

    it('should set correct expiration times', async () => {
      const sessionData = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      mockQueryBuilder.returning.mockResolvedValue([{ id: '1' }]);

      const beforeCreate = Date.now();
      await sessionService.createSession(sessionData);
      const afterCreate = Date.now();

      const insertCall = mockQueryBuilder.insert.mock.calls[0][0];
      const expiresAt = new Date(insertCall.expires_at).getTime();
      const refreshExpiresAt = new Date(insertCall.refresh_expires_at).getTime();

      // Check access token expiry is ~15 minutes
      expect(expiresAt).toBeGreaterThanOrEqual(beforeCreate + SESSION.ACCESS_TOKEN_EXPIRY_MS - 1000);
      expect(expiresAt).toBeLessThanOrEqual(afterCreate + SESSION.ACCESS_TOKEN_EXPIRY_MS + 1000);

      // Check refresh token expiry is ~7 days
      expect(refreshExpiresAt).toBeGreaterThanOrEqual(beforeCreate + SESSION.REFRESH_TOKEN_EXPIRY_MS - 1000);
      expect(refreshExpiresAt).toBeLessThanOrEqual(afterCreate + SESSION.REFRESH_TOKEN_EXPIRY_MS + 1000);
    });
  });

  describe('findById', () => {
    it('should return session when found', async () => {
      const mockSession = { id: 'session-123', user_id: 'user-123' };
      mockQueryBuilder.first.mockResolvedValue(mockSession);

      const result = await sessionService.findById('session-123');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: 'session-123' });
      expect(result).toEqual(mockSession);
    });

    it('should return null when session not found', async () => {
      mockQueryBuilder.first.mockResolvedValue(undefined);

      const result = await sessionService.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByRefreshToken', () => {
    it('should find session by refresh token', async () => {
      const mockSession = { id: 'session-123', refresh_token: 'token' };
      mockQueryBuilder.first.mockResolvedValue(mockSession);

      const result = await sessionService.findByRefreshToken('token');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ refresh_token: 'token' });
      expect(result).toEqual(mockSession);
    });
  });

  describe('revokeSession', () => {
    it('should mark session as inactive with reason', async () => {
      mockQueryBuilder.returning.mockResolvedValue([{}]);

      await sessionService.revokeSession('session-123', 'User logged out');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: 'session-123' });
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        is_active: false,
        revoked_at: 'NOW()',
        revocation_reason: 'User logged out',
      });
    });
  });

  describe('revokeAllUserSessions', () => {
    it('should revoke all sessions for a user', async () => {
      mockQueryBuilder.returning.mockResolvedValue([{}]);

      await sessionService.revokeAllUserSessions('user-123');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ user_id: 'user-123' });
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        is_active: false,
        revoked_at: 'NOW()',
        revocation_reason: 'User logged out from all devices',
      });
    });

    it('should exclude current session when specified', async () => {
      mockQueryBuilder.returning.mockResolvedValue([{}]);

      await sessionService.revokeAllUserSessions('user-123', 'current-session');

      expect(mockQueryBuilder.whereNot).toHaveBeenCalledWith({ id: 'current-session' });
    });
  });

  describe('isSessionValid', () => {
    it('should return true for active, non-expired session', async () => {
      const futureDate = new Date(Date.now() + 60000);
      const mockSession = {
        id: 'session-123',
        is_active: true,
        expires_at: futureDate,
      };
      mockQueryBuilder.first.mockResolvedValue(mockSession);

      const result = await sessionService.isSessionValid('session-123');

      expect(result).toBe(true);
    });

    it('should return false for inactive session', async () => {
      const mockSession = {
        id: 'session-123',
        is_active: false,
        expires_at: new Date(Date.now() + 60000),
      };
      mockQueryBuilder.first.mockResolvedValue(mockSession);

      const result = await sessionService.isSessionValid('session-123');

      expect(result).toBe(false);
    });

    it('should return false and revoke expired session', async () => {
      const pastDate = new Date(Date.now() - 60000);
      const mockSession = {
        id: 'session-123',
        is_active: true,
        expires_at: pastDate,
      };
      mockQueryBuilder.first.mockResolvedValue(mockSession);
      mockQueryBuilder.returning.mockResolvedValue([{}]);

      const result = await sessionService.isSessionValid('session-123');

      expect(result).toBe(false);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_active: false,
          revocation_reason: 'Session expired',
        })
      );
    });

    it('should return false when session not found', async () => {
      mockQueryBuilder.first.mockResolvedValue(undefined);

      const result = await sessionService.isSessionValid('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('refreshSession', () => {
    it('should generate new tokens and update session', async () => {
      const mockSession = { id: 'session-123' };
      mockQueryBuilder.returning.mockResolvedValue([mockSession]);

      const result = await sessionService.refreshSession(
        'session-123',
        'user-123',
        'test@example.com'
      );

      expect(result.accessToken).toBe('mock_access_token');
      expect(result.refreshToken).toBe('mock_refresh_token');
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          session_token: 'mock_access_token',
          refresh_token: 'mock_refresh_token',
        })
      );
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should mark expired sessions as inactive', async () => {
      mockQueryBuilder.update = jest.fn().mockResolvedValue(5);

      const result = await sessionService.cleanupExpiredSessions();

      expect(mockDb).toHaveBeenCalledWith('sessions');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('expires_at', '<', 'NOW()');
      expect(result).toBe(5);
    });
  });
});
