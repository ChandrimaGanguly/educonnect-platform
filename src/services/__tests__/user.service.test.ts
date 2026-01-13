/**
 * UserService Unit Tests
 */
import { UserService } from '../user.service';
import { getDatabase } from '../../database';
import { hashPassword, verifyPassword } from '../../utils/password';

// Mock the database
jest.mock('../../database', () => ({
  getDatabase: jest.fn(),
}));

// Mock password utils
jest.mock('../../utils/password', () => ({
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
}));

// Mock MFA utils
jest.mock('../../utils/mfa', () => ({
  generateMfaSecret: jest.fn(() => 'MOCK_MFA_SECRET'),
  generateBackupCodes: jest.fn(() => ['CODE1-CODE2', 'CODE3-CODE4']),
}));

describe('UserService', () => {
  let userService: UserService;
  let mockDb: any;
  let mockQueryBuilder: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock query builder
    mockQueryBuilder = {
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(null),
      returning: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue([{ count: 0 }]),
    };

    // Setup mock database
    mockDb = jest.fn(() => mockQueryBuilder);
    mockDb.fn = { now: jest.fn(() => 'NOW()') };
    mockDb.raw = jest.fn((sql) => ({ toSQL: () => ({ sql }) }));
    mockDb.transaction = jest.fn(async (callback) => await callback(mockDb));
    (getDatabase as jest.Mock).mockReturnValue(mockDb);

    userService = new UserService();
  });

  describe('createUser', () => {
    it('should create a user with hashed password', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'SecurePass123!',
        fullName: 'Test User',
      };

      const mockUser = {
        id: 'user-123',
        email: userData.email.toLowerCase(),
        username: userData.username.toLowerCase(),
        full_name: userData.fullName,
      };

      (hashPassword as jest.Mock).mockResolvedValue('hashed_password');
      mockQueryBuilder.returning.mockResolvedValue([mockUser]);

      const result = await userService.createUser(userData);

      expect(hashPassword).toHaveBeenCalledWith(userData.password);
      expect(mockDb).toHaveBeenCalledWith('users');
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
        email: userData.email.toLowerCase(),
        username: userData.username.toLowerCase(),
        password_hash: 'hashed_password',
        full_name: userData.fullName,
        email_verified: false,
        mfa_enabled: false,
      });
      expect(result).toEqual(mockUser);
    });

    it('should normalize email and username to lowercase', async () => {
      const userData = {
        email: 'TEST@EXAMPLE.COM',
        username: 'TestUser',
        password: 'SecurePass123!',
        fullName: 'Test User',
      };

      (hashPassword as jest.Mock).mockResolvedValue('hashed_password');
      mockQueryBuilder.returning.mockResolvedValue([{ id: '1' }]);

      await userService.createUser(userData);

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          username: 'testuser',
        })
      );
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockQueryBuilder.first.mockResolvedValue(mockUser);

      const result = await userService.findById('user-123');

      expect(mockDb).toHaveBeenCalledWith('users');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: 'user-123' });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockQueryBuilder.first.mockResolvedValue(undefined);

      const result = await userService.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by lowercase email', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockQueryBuilder.first.mockResolvedValue(mockUser);

      const result = await userService.findByEmail('TEST@EXAMPLE.COM');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({
        email: 'test@example.com',
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('findByEmailOrUsername', () => {
    it('should search by both email and username', async () => {
      const mockUser = { id: 'user-123' };
      mockQueryBuilder.first.mockResolvedValue(mockUser);

      await userService.findByEmailOrUsername('TestUser');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ email: 'testuser' });
      expect(mockQueryBuilder.orWhere).toHaveBeenCalledWith({ username: 'testuser' });
    });
  });

  describe('verifyPassword', () => {
    it('should return true for valid password', async () => {
      const mockUser = { id: 'user-123', password_hash: 'hashed' };
      mockQueryBuilder.first.mockResolvedValue(mockUser);
      (verifyPassword as jest.Mock).mockResolvedValue(true);

      const result = await userService.verifyPassword('user-123', 'correct_password');

      expect(verifyPassword).toHaveBeenCalledWith('correct_password', 'hashed');
      expect(result).toBe(true);
    });

    it('should return false for invalid password', async () => {
      const mockUser = { id: 'user-123', password_hash: 'hashed' };
      mockQueryBuilder.first.mockResolvedValue(mockUser);
      (verifyPassword as jest.Mock).mockResolvedValue(false);

      const result = await userService.verifyPassword('user-123', 'wrong_password');

      expect(result).toBe(false);
    });

    it('should return false when user not found', async () => {
      mockQueryBuilder.first.mockResolvedValue(undefined);

      const result = await userService.verifyPassword('nonexistent', 'password');

      expect(result).toBe(false);
    });
  });

  describe('emailExists', () => {
    it('should return true when email exists', async () => {
      mockQueryBuilder.first.mockResolvedValue({ count: 1 });

      const result = await userService.emailExists('test@example.com');

      expect(result).toBe(true);
    });

    it('should return false when email does not exist', async () => {
      mockQueryBuilder.first.mockResolvedValue({ count: 0 });

      const result = await userService.emailExists('new@example.com');

      expect(result).toBe(false);
    });
  });

  describe('enableMfa', () => {
    it('should enable MFA and store hashed backup codes', async () => {
      (hashPassword as jest.Mock).mockResolvedValue('hashed_code');
      mockQueryBuilder.returning.mockResolvedValue([{}]);

      const result = await userService.enableMfa('user-123');

      expect(result.secret).toBe('MOCK_MFA_SECRET');
      expect(result.backupCodes).toEqual(['CODE1-CODE2', 'CODE3-CODE4']);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          mfa_enabled: true,
          mfa_secret: 'MOCK_MFA_SECRET',
        })
      );
    });
  });

  describe('disableMfa', () => {
    it('should disable MFA and clear backup codes', async () => {
      mockQueryBuilder.returning.mockResolvedValue([{}]);

      await userService.disableMfa('user-123');

      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        mfa_enabled: false,
        mfa_secret: null,
        mfa_backup_codes: null,
      });
    });
  });

  describe('deleteUser', () => {
    it('should soft delete user by setting status and deleted_at', async () => {
      mockQueryBuilder.returning.mockResolvedValue([{}]);

      await userService.deleteUser('user-123');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: 'user-123' });
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        status: 'deleted',
        deleted_at: 'NOW()',
      });
    });
  });
});
