import { Knex } from 'knex';
import { getDatabase } from '../database';
import { hashPassword, verifyPassword } from '../utils/password';
import { generateMfaSecret, generateBackupCodes } from '../utils/mfa';
import {
  PrivacySettings,
  NotificationPreferences,
  UserMetadata,
} from '../types/domain';

export interface User {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  full_name: string;
  bio?: string;
  avatar_url?: string;
  locale: string;
  timezone: string;
  phone_number?: string;
  phone_verified: boolean;
  email_verified: boolean;
  status: 'active' | 'inactive' | 'suspended' | 'deleted';
  is_verified: boolean;
  verified_at?: Date;
  mfa_enabled: boolean;
  mfa_secret?: string;
  mfa_backup_codes?: string;
  trust_score: number;
  reputation_points: number;
  privacy_settings: PrivacySettings;
  notification_preferences: NotificationPreferences;
  metadata?: UserMetadata;
  last_login_at?: Date;
  password_changed_at?: Date;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface CreateUserData {
  email: string;
  username: string;
  password: string;
  fullName: string;
}

export interface UpdateUserData {
  full_name?: string;
  bio?: string;
  avatar_url?: string;
  locale?: string;
  timezone?: string;
  phone_number?: string;
  privacy_settings?: Partial<PrivacySettings>;
  notification_preferences?: Partial<NotificationPreferences>;
}

export class UserService {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * Create a new user
   */
  async createUser(data: CreateUserData): Promise<User> {
    const passwordHash = await hashPassword(data.password);

    const [user] = await this.db('users')
      .insert({
        email: data.email.toLowerCase(),
        username: data.username.toLowerCase(),
        password_hash: passwordHash,
        full_name: data.fullName,
        email_verified: false,
        mfa_enabled: false,
      })
      .returning('*');

    return user;
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const user = await this.db('users').where({ id }).first();
    return user || null;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const user = await this.db('users')
      .where({ email: email.toLowerCase() })
      .first();
    return user || null;
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    const user = await this.db('users')
      .where({ username: username.toLowerCase() })
      .first();
    return user || null;
  }

  /**
   * Find user by email or username
   */
  async findByEmailOrUsername(emailOrUsername: string): Promise<User | null> {
    const normalized = emailOrUsername.toLowerCase();
    const user = await this.db('users')
      .where({ email: normalized })
      .orWhere({ username: normalized })
      .first();
    return user || null;
  }

  /**
   * Update user
   */
  async updateUser(id: string, data: UpdateUserData): Promise<User> {
    const [user] = await this.db('users')
      .where({ id })
      .update(data)
      .returning('*');
    return user;
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(id: string): Promise<void> {
    await this.db('users').where({ id }).update({
      last_login_at: this.db.fn.now(),
    });
  }

  /**
   * Verify password
   */
  async verifyPassword(userId: string, password: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) {
      return false;
    }
    return verifyPassword(password, user.password_hash);
  }

  /**
   * Update password
   */
  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const passwordHash = await hashPassword(newPassword);
    await this.db('users').where({ id: userId }).update({
      password_hash: passwordHash,
      password_changed_at: this.db.fn.now(),
    });
  }

  /**
   * Enable MFA for user
   * Stores hashed backup codes in the database for recovery
   */
  async enableMfa(userId: string): Promise<{ secret: string; backupCodes: string[] }> {
    const secret = generateMfaSecret();
    const backupCodes = generateBackupCodes();

    // Hash backup codes before storing (they're one-time use)
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(async (code) => ({
        hash: await hashPassword(code),
        used: false,
      }))
    );

    await this.db('users').where({ id: userId }).update({
      mfa_enabled: true,
      mfa_secret: secret,
      mfa_backup_codes: JSON.stringify(hashedBackupCodes),
    });

    return { secret, backupCodes };
  }

  /**
   * Verify and consume a backup code for MFA recovery
   * Returns true if code was valid and consumed
   */
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user || !user.mfa_backup_codes) {
      return false;
    }

    const backupCodes = typeof user.mfa_backup_codes === 'string'
      ? JSON.parse(user.mfa_backup_codes)
      : user.mfa_backup_codes;

    for (let i = 0; i < backupCodes.length; i++) {
      if (!backupCodes[i].used) {
        const isValid = await verifyPassword(code, backupCodes[i].hash);
        if (isValid) {
          // Mark code as used
          backupCodes[i].used = true;
          await this.db('users').where({ id: userId }).update({
            mfa_backup_codes: JSON.stringify(backupCodes),
          });
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Disable MFA for user
   * Clears both the secret and backup codes
   */
  async disableMfa(userId: string): Promise<void> {
    await this.db('users').where({ id: userId }).update({
      mfa_enabled: false,
      mfa_secret: null,
      mfa_backup_codes: null,
    });
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const count = await this.db('users')
      .where({ email: email.toLowerCase() })
      .count('* as count')
      .first();
    return (count?.count as number) > 0;
  }

  /**
   * Check if username exists
   */
  async usernameExists(username: string): Promise<boolean> {
    const count = await this.db('users')
      .where({ username: username.toLowerCase() })
      .count('* as count')
      .first();
    return (count?.count as number) > 0;
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(userId: string): Promise<void> {
    await this.db('users').where({ id: userId }).update({
      status: 'deleted',
      deleted_at: this.db.fn.now(),
    });
  }
}
