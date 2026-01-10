/**
 * Validation Schema Tests
 */
import {
  emailSchema,
  passwordSchema,
  usernameSchema,
  registrationSchema,
  loginSchema,
  mfaVerificationSchema,
} from '../validation';

describe('Validation Schemas', () => {
  describe('emailSchema', () => {
    it('should accept valid emails', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.org',
        'user+tag@example.co.uk',
        'a@b.co',
      ];

      validEmails.forEach((email) => {
        expect(() => emailSchema.parse(email)).not.toThrow();
      });
    });

    it('should reject invalid emails', () => {
      const invalidEmails = [
        'notanemail',
        '@nodomain.com',
        'missing@',
        'spaces in@email.com',
        '',
      ];

      invalidEmails.forEach((email) => {
        expect(() => emailSchema.parse(email)).toThrow();
      });
    });
  });

  describe('passwordSchema', () => {
    it('should accept valid passwords', () => {
      const validPasswords = [
        'SecurePass1!',
        'MyP@ssw0rd',
        'Complex123!@#',
        'Abcdefgh1!',
      ];

      validPasswords.forEach((password) => {
        expect(() => passwordSchema.parse(password)).not.toThrow();
      });
    });

    it('should reject passwords without lowercase', () => {
      expect(() => passwordSchema.parse('UPPERCASE1!')).toThrow(/lowercase/);
    });

    it('should reject passwords without uppercase', () => {
      expect(() => passwordSchema.parse('lowercase1!')).toThrow(/uppercase/);
    });

    it('should reject passwords without numbers', () => {
      expect(() => passwordSchema.parse('NoNumbers!')).toThrow(/number/);
    });

    it('should reject passwords without special characters', () => {
      expect(() => passwordSchema.parse('NoSpecial1')).toThrow(/special/);
    });

    it('should reject passwords shorter than 8 characters', () => {
      expect(() => passwordSchema.parse('Short1!')).toThrow(/8 characters/);
    });
  });

  describe('usernameSchema', () => {
    it('should accept valid usernames', () => {
      const validUsernames = [
        'user123',
        'test_user',
        'my-name',
        'abc',
        'User_Name-123',
      ];

      validUsernames.forEach((username) => {
        expect(() => usernameSchema.parse(username)).not.toThrow();
      });
    });

    it('should reject usernames shorter than 3 characters', () => {
      expect(() => usernameSchema.parse('ab')).toThrow(/3 characters/);
    });

    it('should reject usernames longer than 50 characters', () => {
      const longUsername = 'a'.repeat(51);
      expect(() => usernameSchema.parse(longUsername)).toThrow(/50 characters/);
    });

    it('should reject usernames with invalid characters', () => {
      const invalidUsernames = [
        'user@name',
        'user name',
        'user.name',
        'user!name',
      ];

      invalidUsernames.forEach((username) => {
        expect(() => usernameSchema.parse(username)).toThrow();
      });
    });
  });

  describe('registrationSchema', () => {
    it('should accept valid registration data', () => {
      const validData = {
        email: 'user@example.com',
        username: 'validuser',
        password: 'SecurePass1!',
        fullName: 'John Doe',
      };

      expect(() => registrationSchema.parse(validData)).not.toThrow();
    });

    it('should reject missing fields', () => {
      const missingEmail = {
        username: 'validuser',
        password: 'SecurePass1!',
        fullName: 'John Doe',
      };

      expect(() => registrationSchema.parse(missingEmail)).toThrow();
    });

    it('should reject invalid nested fields', () => {
      const invalidEmail = {
        email: 'notvalid',
        username: 'validuser',
        password: 'SecurePass1!',
        fullName: 'John Doe',
      };

      expect(() => registrationSchema.parse(invalidEmail)).toThrow();
    });

    it('should require fullName', () => {
      const missingName = {
        email: 'user@example.com',
        username: 'validuser',
        password: 'SecurePass1!',
        fullName: '',
      };

      expect(() => registrationSchema.parse(missingName)).toThrow();
    });
  });

  describe('loginSchema', () => {
    it('should accept valid login data', () => {
      const validData = {
        emailOrUsername: 'user@example.com',
        password: 'anypassword',
      };

      expect(() => loginSchema.parse(validData)).not.toThrow();
    });

    it('should accept username as emailOrUsername', () => {
      const validData = {
        emailOrUsername: 'myusername',
        password: 'anypassword',
      };

      expect(() => loginSchema.parse(validData)).not.toThrow();
    });

    it('should accept optional mfaCode', () => {
      const withMfa = {
        emailOrUsername: 'user@example.com',
        password: 'anypassword',
        mfaCode: '123456',
      };

      expect(() => loginSchema.parse(withMfa)).not.toThrow();
    });

    it('should reject empty emailOrUsername', () => {
      const invalidData = {
        emailOrUsername: '',
        password: 'anypassword',
      };

      expect(() => loginSchema.parse(invalidData)).toThrow();
    });
  });

  describe('mfaVerificationSchema', () => {
    it('should accept 6-digit codes', () => {
      expect(() => mfaVerificationSchema.parse({ code: '123456' })).not.toThrow();
      expect(() => mfaVerificationSchema.parse({ code: '000000' })).not.toThrow();
    });

    it('should reject codes that are not 6 characters', () => {
      expect(() => mfaVerificationSchema.parse({ code: '12345' })).toThrow(/6 digits/);
      expect(() => mfaVerificationSchema.parse({ code: '1234567' })).toThrow(/6 digits/);
    });
  });
});
