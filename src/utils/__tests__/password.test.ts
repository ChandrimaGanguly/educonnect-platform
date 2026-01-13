/**
 * Password Utility Tests
 */

// Mock config before importing password
jest.mock('../../config', () => ({
  env: {
    BCRYPT_ROUNDS: 10,
  },
}));

import { hashPassword, verifyPassword } from '../password';

describe('Password Utilities', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'SecurePassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'SecurePassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      // bcrypt adds salt, so hashes should be different
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty password', async () => {
      const hash = await hashPassword('');
      expect(hash).toBeDefined();
    });

    it('should handle unicode passwords', async () => {
      const password = 'Пароль123!日本語';
      const hash = await hashPassword(password);
      expect(hash).toBeDefined();
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'SecurePassword123!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'SecurePassword123!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword('WrongPassword123!', hash);

      expect(isValid).toBe(false);
    });

    it('should be case sensitive', async () => {
      const password = 'SecurePassword123!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword('securepassword123!', hash);

      expect(isValid).toBe(false);
    });

    it('should handle unicode passwords correctly', async () => {
      const password = 'Пароль123!日本語';
      const hash = await hashPassword(password);

      expect(await verifyPassword(password, hash)).toBe(true);
      expect(await verifyPassword('Пароль123!', hash)).toBe(false);
    });
  });
});
