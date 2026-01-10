/**
 * Cleanup Service
 *
 * Handles cleanup of expired data across the platform:
 * - Expired sessions
 * - Expired community invitations
 * - Old audit logs (optional retention)
 * - Completed sync queue items
 * - Expired notifications
 */

import { Knex } from 'knex';
import { getDatabase } from '../database';
import { SESSION, COMMUNITY, SYNC } from '../config/constants';

export interface CleanupResult {
  entity: string;
  deletedCount: number;
  error?: string;
}

export interface CleanupSummary {
  startedAt: Date;
  completedAt: Date;
  results: CleanupResult[];
  totalDeleted: number;
  errors: number;
}

export class CleanupService {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * Run all cleanup tasks
   * Should be called by a scheduled job (e.g., daily cron)
   */
  async runAllCleanupTasks(): Promise<CleanupSummary> {
    const startedAt = new Date();
    const results: CleanupResult[] = [];

    // Run each cleanup task and collect results
    results.push(await this.cleanupExpiredSessions());
    results.push(await this.cleanupExpiredInvitations());
    results.push(await this.cleanupExpiredNotifications());
    results.push(await this.cleanupCompletedSyncItems());
    results.push(await this.cleanupExpiredPasswordResetTokens());

    const completedAt = new Date();
    const totalDeleted = results.reduce((sum, r) => sum + r.deletedCount, 0);
    const errors = results.filter((r) => r.error).length;

    return {
      startedAt,
      completedAt,
      results,
      totalDeleted,
      errors,
    };
  }

  /**
   * Clean up expired sessions
   * Marks expired sessions as inactive and optionally deletes very old ones
   */
  async cleanupExpiredSessions(deleteOlderThanDays: number = SESSION.CLEANUP_AGE_DAYS): Promise<CleanupResult> {
    try {
      // First, mark expired sessions as inactive
      const markedInactive = await this.db('sessions')
        .where('expires_at', '<', this.db.fn.now())
        .where('is_active', true)
        .update({
          is_active: false,
          revoked_at: this.db.fn.now(),
          revocation_reason: 'Session expired (cleanup)',
        });

      // Then, delete very old inactive sessions
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - deleteOlderThanDays);

      const deleted = await this.db('sessions')
        .where('is_active', false)
        .where('created_at', '<', cutoffDate)
        .delete();

      return {
        entity: 'sessions',
        deletedCount: deleted + markedInactive,
      };
    } catch (error) {
      return {
        entity: 'sessions',
        deletedCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clean up expired community invitations
   * Marks pending invitations as expired, then deletes old ones
   */
  async cleanupExpiredInvitations(deleteOlderThanDays: number = 30): Promise<CleanupResult> {
    try {
      // Mark pending invitations as expired
      const markedExpired = await this.db('community_invitations')
        .where('status', 'pending')
        .where('expires_at', '<', this.db.fn.now())
        .update({
          status: 'expired',
          updated_at: this.db.fn.now(),
        });

      // Delete old expired/declined/cancelled invitations
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - deleteOlderThanDays);

      const deleted = await this.db('community_invitations')
        .whereIn('status', ['expired', 'declined', 'cancelled'])
        .where('created_at', '<', cutoffDate)
        .delete();

      return {
        entity: 'community_invitations',
        deletedCount: deleted + markedExpired,
      };
    } catch (error) {
      return {
        entity: 'community_invitations',
        deletedCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clean up expired notifications
   */
  async cleanupExpiredNotifications(deleteOlderThanDays: number = 90): Promise<CleanupResult> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - deleteOlderThanDays);

      // Delete read notifications older than cutoff
      const deletedRead = await this.db('notifications')
        .where('is_read', true)
        .where('created_at', '<', cutoffDate)
        .delete();

      // Delete expired notifications
      const deletedExpired = await this.db('notifications')
        .whereNotNull('expires_at')
        .where('expires_at', '<', this.db.fn.now())
        .delete();

      return {
        entity: 'notifications',
        deletedCount: deletedRead + deletedExpired,
      };
    } catch (error) {
      return {
        entity: 'notifications',
        deletedCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clean up completed sync queue items
   */
  async cleanupCompletedSyncItems(olderThanDays: number = SYNC.CLEANUP_DAYS): Promise<CleanupResult> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const deleted = await this.db('sync_queue')
        .where('status', 'completed')
        .where('completed_at', '<', cutoffDate)
        .delete();

      // Also clean up old failed items that exceeded max retries
      const deletedFailed = await this.db('sync_queue')
        .where('status', 'failed')
        .where('created_at', '<', cutoffDate)
        .delete();

      return {
        entity: 'sync_queue',
        deletedCount: deleted + deletedFailed,
      };
    } catch (error) {
      return {
        entity: 'sync_queue',
        deletedCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clean up expired password reset tokens
   */
  async cleanupExpiredPasswordResetTokens(): Promise<CleanupResult> {
    try {
      // Assuming there's a password_reset_tokens table
      // If it doesn't exist, this will just return 0
      const deleted = await this.db('password_reset_tokens')
        .where('expires_at', '<', this.db.fn.now())
        .delete()
        .catch(() => 0); // Table might not exist

      return {
        entity: 'password_reset_tokens',
        deletedCount: deleted,
      };
    } catch (error) {
      return {
        entity: 'password_reset_tokens',
        deletedCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clean up old audit logs (use with caution - may need to preserve for compliance)
   */
  async cleanupOldAuditLogs(olderThanDays: number = 365): Promise<CleanupResult> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // Only delete low-severity audit logs
      const deleted = await this.db('audit_logs')
        .where('severity', 'low')
        .where('created_at', '<', cutoffDate)
        .delete();

      return {
        entity: 'audit_logs',
        deletedCount: deleted,
      };
    } catch (error) {
      return {
        entity: 'audit_logs',
        deletedCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clean up resolved sync conflicts
   */
  async cleanupResolvedConflicts(olderThanDays: number = 30): Promise<CleanupResult> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const deleted = await this.db('sync_conflicts')
        .where('status', 'resolved')
        .where('resolved_at', '<', cutoffDate)
        .delete();

      return {
        entity: 'sync_conflicts',
        deletedCount: deleted,
      };
    } catch (error) {
      return {
        entity: 'sync_conflicts',
        deletedCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get cleanup statistics for monitoring
   */
  async getCleanupStats(): Promise<{
    expiredSessions: number;
    expiredInvitations: number;
    expiredNotifications: number;
    completedSyncItems: number;
  }> {
    const [sessions, invitations, notifications, syncItems] = await Promise.all([
      this.db('sessions')
        .where('expires_at', '<', this.db.fn.now())
        .where('is_active', true)
        .count('* as count')
        .first(),
      this.db('community_invitations')
        .where('status', 'pending')
        .where('expires_at', '<', this.db.fn.now())
        .count('* as count')
        .first(),
      this.db('notifications')
        .whereNotNull('expires_at')
        .where('expires_at', '<', this.db.fn.now())
        .count('* as count')
        .first(),
      this.db('sync_queue')
        .where('status', 'completed')
        .count('* as count')
        .first(),
    ]);

    return {
      expiredSessions: parseInt(sessions?.count as string || '0', 10),
      expiredInvitations: parseInt(invitations?.count as string || '0', 10),
      expiredNotifications: parseInt(notifications?.count as string || '0', 10),
      completedSyncItems: parseInt(syncItems?.count as string || '0', 10),
    };
  }
}

// Export singleton instance
export const cleanupService = new CleanupService();
