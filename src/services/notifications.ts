import type { Knex } from 'knex';
import { getDatabase } from '../database';
import { auditService } from './audit';

/**
 * Notification Service
 *
 * Implements basic notification infrastructure with multi-channel support
 * and low-bandwidth optimization.
 *
 * Per notifications spec: Supports in-app, push, email, SMS channels with
 * granular preferences, fatigue prevention, and low-bandwidth batching.
 */

export type NotificationChannel = 'in_app' | 'push' | 'email' | 'sms';
export type NotificationCategory = 'learning' | 'mentorship' | 'community' | 'system' | 'achievement';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationStatus = 'pending' | 'queued' | 'sent' | 'failed' | 'expired';

export interface CreateNotificationParams {
  userId: string;
  type: string;
  category: NotificationCategory;
  priority?: NotificationPriority;
  title: string;
  body: string;
  data?: Record<string, any>;
  actionUrl?: string;
  actionLabel?: string;
  groupKey?: string;
  expiresInHours?: number;
}

export interface NotificationPreferences {
  userId: string;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  categoryPreferences: Record<string, {
    in_app?: boolean;
    push?: boolean;
    email?: boolean;
    sms?: boolean;
  }>;
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
  maxDailyNotifications?: number;
  enableDigestMode: boolean;
  digestFrequency?: 'daily' | 'weekly';
  digestTime?: string;
  isPaused: boolean;
  pausedUntil?: Date;
  emailUnsubscribed: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  body: string;
  data?: Record<string, any>;
  actionUrl?: string;
  actionLabel?: string;
  status: NotificationStatus;
  isRead: boolean;
  readAt?: Date;
  deliveredInApp: boolean;
  deliveredPush: boolean;
  deliveredEmail: boolean;
  deliveredSms: boolean;
  deliveredAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  groupKey?: string;
  parentNotificationId?: string;
  expiresAt?: Date;
  isQueuedForBatch: boolean;
  scheduledFor?: Date;
  createdAt: Date;
  updatedAt: Date;
}

class NotificationService {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * Create a notification for a user
   *
   * @param params Notification parameters
   * @returns Created notification
   */
  async createNotification(params: CreateNotificationParams): Promise<Notification> {
    // Get user preferences
    const prefs = await this.getUserPreferences(params.userId);

    // Check if notifications are paused
    if (prefs.isPaused && prefs.pausedUntil && new Date() < prefs.pausedUntil) {
      // Queue for later delivery
      const scheduledFor = prefs.pausedUntil;
      return this.queueNotification(params, scheduledFor);
    }

    // Check if in quiet hours
    if (this.isInQuietHours(prefs)) {
      // Queue for after quiet hours
      const scheduledFor = this.getNextAvailableTime(prefs);
      return this.queueNotification(params, scheduledFor);
    }

    // Check daily notification limit
    const todayCount = await this.getDailyNotificationCount(params.userId);
    if (prefs.maxDailyNotifications && todayCount >= prefs.maxDailyNotifications) {
      // Queue for next day or batch
      return this.queueForBatch(params);
    }

    // Calculate expiry
    const expiresAt = params.expiresInHours
      ? new Date(Date.now() + params.expiresInHours * 60 * 60 * 1000)
      : null;

    // Create notification
    const [notification] = await this.db('notifications')
      .insert({
        user_id: params.userId,
        type: params.type,
        category: params.category,
        priority: params.priority || 'normal',
        title: params.title,
        body: params.body,
        data: params.data ? JSON.stringify(params.data) : null,
        action_url: params.actionUrl,
        action_label: params.actionLabel,
        group_key: params.groupKey,
        expires_at: expiresAt,
        status: 'pending',
      })
      .returning('*');

    // Update daily stats
    await this.updateDailyStats(params.userId, params.category);

    return this.mapNotification(notification);
  }

  /**
   * Queue notification for later delivery
   */
  private async queueNotification(
    params: CreateNotificationParams,
    scheduledFor: Date
  ): Promise<Notification> {
    const expiresAt = params.expiresInHours
      ? new Date(Date.now() + params.expiresInHours * 60 * 60 * 1000)
      : null;

    const [notification] = await this.db('notifications')
      .insert({
        user_id: params.userId,
        type: params.type,
        category: params.category,
        priority: params.priority || 'normal',
        title: params.title,
        body: params.body,
        data: params.data ? JSON.stringify(params.data) : null,
        action_url: params.actionUrl,
        action_label: params.actionLabel,
        group_key: params.groupKey,
        expires_at: expiresAt,
        status: 'queued',
        scheduled_for: scheduledFor,
      })
      .returning('*');

    return this.mapNotification(notification);
  }

  /**
   * Queue notification for batch delivery
   */
  private async queueForBatch(params: CreateNotificationParams): Promise<Notification> {
    const prefs = await this.getUserPreferences(params.userId);

    let scheduledFor = new Date();
    if (prefs.enableDigestMode && prefs.digestTime) {
      // Schedule for next digest time
      scheduledFor = this.getNextDigestTime(prefs.digestTime, prefs.digestFrequency || 'daily');
    } else {
      // Schedule for tomorrow
      scheduledFor.setDate(scheduledFor.getDate() + 1);
      scheduledFor.setHours(9, 0, 0, 0); // 9 AM
    }

    const expiresAt = params.expiresInHours
      ? new Date(Date.now() + params.expiresInHours * 60 * 60 * 1000)
      : null;

    const [notification] = await this.db('notifications')
      .insert({
        user_id: params.userId,
        type: params.type,
        category: params.category,
        priority: params.priority || 'normal',
        title: params.title,
        body: params.body,
        data: params.data ? JSON.stringify(params.data) : null,
        action_url: params.actionUrl,
        action_label: params.actionLabel,
        group_key: params.groupKey,
        expires_at: expiresAt,
        status: 'queued',
        is_queued_for_batch: true,
        scheduled_for: scheduledFor,
      })
      .returning('*');

    return this.mapNotification(notification);
  }

  /**
   * Get user notification preferences
   *
   * @param userId User ID
   * @returns Notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    let prefs = await this.db('notification_preferences')
      .where('user_id', userId)
      .first();

    // Create default preferences if they don't exist
    if (!prefs) {
      [prefs] = await this.db('notification_preferences')
        .insert({
          user_id: userId,
          in_app_enabled: true,
          push_enabled: true,
          email_enabled: true,
          sms_enabled: false,
          category_preferences: JSON.stringify(this.getDefaultCategoryPreferences()),
        })
        .returning('*');
    }

    return {
      userId: prefs.user_id,
      inAppEnabled: prefs.in_app_enabled,
      pushEnabled: prefs.push_enabled,
      emailEnabled: prefs.email_enabled,
      smsEnabled: prefs.sms_enabled,
      categoryPreferences: prefs.category_preferences,
      quietHoursEnabled: prefs.quiet_hours_enabled,
      quietHoursStart: prefs.quiet_hours_start,
      quietHoursEnd: prefs.quiet_hours_end,
      timezone: prefs.timezone,
      maxDailyNotifications: prefs.max_daily_notifications,
      enableDigestMode: prefs.enable_digest_mode,
      digestFrequency: prefs.digest_frequency,
      digestTime: prefs.digest_time,
      isPaused: prefs.is_paused,
      pausedUntil: prefs.paused_until,
      emailUnsubscribed: prefs.email_unsubscribed,
    };
  }

  /**
   * Update user notification preferences
   *
   * @param userId User ID
   * @param updates Preference updates
   * @returns Updated preferences
   */
  async updateUserPreferences(
    userId: string,
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const current = await this.getUserPreferences(userId);

    const updateData: any = {};

    if (updates.inAppEnabled !== undefined) updateData.in_app_enabled = updates.inAppEnabled;
    if (updates.pushEnabled !== undefined) updateData.push_enabled = updates.pushEnabled;
    if (updates.emailEnabled !== undefined) updateData.email_enabled = updates.emailEnabled;
    if (updates.smsEnabled !== undefined) updateData.sms_enabled = updates.smsEnabled;
    if (updates.categoryPreferences) updateData.category_preferences = JSON.stringify(updates.categoryPreferences);
    if (updates.quietHoursEnabled !== undefined) updateData.quiet_hours_enabled = updates.quietHoursEnabled;
    if (updates.quietHoursStart) updateData.quiet_hours_start = updates.quietHoursStart;
    if (updates.quietHoursEnd) updateData.quiet_hours_end = updates.quietHoursEnd;
    if (updates.timezone) updateData.timezone = updates.timezone;
    if (updates.maxDailyNotifications !== undefined) updateData.max_daily_notifications = updates.maxDailyNotifications;
    if (updates.enableDigestMode !== undefined) updateData.enable_digest_mode = updates.enableDigestMode;
    if (updates.digestFrequency) updateData.digest_frequency = updates.digestFrequency;
    if (updates.digestTime) updateData.digest_time = updates.digestTime;
    if (updates.isPaused !== undefined) updateData.is_paused = updates.isPaused;
    if (updates.pausedUntil) updateData.paused_until = updates.pausedUntil;

    await this.db('notification_preferences')
      .where('user_id', userId)
      .update(updateData);

    // Log preference change
    await auditService.logConfig({
      userId,
      action: 'update',
      configType: 'notification_preferences',
      configId: userId,
      configName: 'Notification Preferences',
      before: current,
      after: { ...current, ...updates },
    });

    return this.getUserPreferences(userId);
  }

  /**
   * Get user notifications
   *
   * @param userId User ID
   * @param options Query options
   * @returns Array of notifications
   */
  async getUserNotifications(
    userId: string,
    options: {
      category?: NotificationCategory;
      isRead?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Notification[]> {
    let query = this.db('notifications')
      .where('user_id', userId)
      .where(function() {
        this.whereNull('expires_at').orWhere('expires_at', '>', new Date());
      });

    if (options.category) {
      query = query.where('category', options.category);
    }

    if (options.isRead !== undefined) {
      query = query.where('is_read', options.isRead);
    }

    query = query.orderBy('created_at', 'desc');

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.offset(options.offset);
    }

    const notifications = await query;
    return notifications.map(n => this.mapNotification(n));
  }

  /**
   * Mark notification as read
   *
   * @param notificationId Notification ID
   * @param userId User ID
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.db('notifications')
      .where('id', notificationId)
      .where('user_id', userId)
      .update({
        is_read: true,
        read_at: new Date(),
      });
  }

  /**
   * Mark all notifications as read for a user
   *
   * @param userId User ID
   * @param category Optional category filter
   */
  async markAllAsRead(userId: string, category?: NotificationCategory): Promise<void> {
    let query = this.db('notifications')
      .where('user_id', userId)
      .where('is_read', false);

    if (category) {
      query = query.where('category', category);
    }

    await query.update({
      is_read: true,
      read_at: new Date(),
    });
  }

  /**
   * Get unread notification count
   *
   * @param userId User ID
   * @param category Optional category filter
   * @returns Unread count
   */
  async getUnreadCount(userId: string, category?: NotificationCategory): Promise<number> {
    let query = this.db('notifications')
      .where('user_id', userId)
      .where('is_read', false)
      .where(function() {
        this.whereNull('expires_at').orWhere('expires_at', '>', new Date());
      });

    if (category) {
      query = query.where('category', category);
    }

    const result = await query.count('* as count').first();
    return parseInt(String(result?.count || 0), 10);
  }

  /**
   * Get daily notification count for a user
   */
  private async getDailyNotificationCount(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.db('notifications')
      .where('user_id', userId)
      .where('created_at', '>=', today)
      .count('* as count')
      .first();

    return parseInt(String(result?.count || 0), 10);
  }

  /**
   * Update daily statistics
   */
  private async updateDailyStats(userId: string, category: NotificationCategory): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    const existing = await this.db('notification_stats')
      .where('user_id', userId)
      .where('stat_date', today)
      .first();

    if (existing) {
      const categoryField = `${category}_count`;
      await this.db('notification_stats')
        .where('id', existing.id)
        .increment(categoryField, 1)
        .increment('total_sent', 1);
    } else {
      const data: any = {
        user_id: userId,
        stat_date: today,
        learning_count: 0,
        mentorship_count: 0,
        community_count: 0,
        system_count: 0,
        achievement_count: 0,
        total_sent: 1,
      };

      data[`${category}_count`] = 1;

      await this.db('notification_stats').insert(data);
    }
  }

  /**
   * Check if current time is in quiet hours
   */
  private isInQuietHours(prefs: NotificationPreferences): boolean {
    if (!prefs.quietHoursEnabled || !prefs.quietHoursStart || !prefs.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    return currentTime >= prefs.quietHoursStart && currentTime < prefs.quietHoursEnd;
  }

  /**
   * Get next available delivery time (after quiet hours)
   */
  private getNextAvailableTime(prefs: NotificationPreferences): Date {
    const next = new Date();
    if (prefs.quietHoursEnd) {
      const [hours, minutes] = prefs.quietHoursEnd.split(':').map(Number);
      next.setHours(hours, minutes, 0, 0);

      // If quiet hours end is earlier than now, schedule for next day
      if (next <= new Date()) {
        next.setDate(next.getDate() + 1);
      }
    }
    return next;
  }

  /**
   * Get next digest delivery time
   */
  private getNextDigestTime(digestTime: string, frequency: 'daily' | 'weekly'): Date {
    const [hours, minutes] = digestTime.split(':').map(Number);
    const next = new Date();
    next.setHours(hours, minutes, 0, 0);

    if (next <= new Date()) {
      if (frequency === 'daily') {
        next.setDate(next.getDate() + 1);
      } else {
        next.setDate(next.getDate() + 7);
      }
    }

    return next;
  }

  /**
   * Get default category preferences
   */
  private getDefaultCategoryPreferences() {
    return {
      learning: { in_app: true, push: true, email: false, sms: false },
      mentorship: { in_app: true, push: true, email: true, sms: false },
      community: { in_app: true, push: false, email: false, sms: false },
      system: { in_app: true, push: true, email: true, sms: false },
      achievement: { in_app: true, push: true, email: false, sms: false },
    };
  }

  /**
   * Map database row to Notification interface
   */
  private mapNotification(row: any): Notification {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      category: row.category,
      priority: row.priority,
      title: row.title,
      body: row.body,
      data: row.data,
      actionUrl: row.action_url,
      actionLabel: row.action_label,
      status: row.status,
      isRead: row.is_read,
      readAt: row.read_at,
      deliveredInApp: row.delivered_in_app,
      deliveredPush: row.delivered_push,
      deliveredEmail: row.delivered_email,
      deliveredSms: row.delivered_sms,
      deliveredAt: row.delivered_at,
      failedAt: row.failed_at,
      failureReason: row.failure_reason,
      groupKey: row.group_key,
      parentNotificationId: row.parent_notification_id,
      expiresAt: row.expires_at,
      isQueuedForBatch: row.is_queued_for_batch,
      scheduledFor: row.scheduled_for,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

// Export class for testing
export { NotificationService };
