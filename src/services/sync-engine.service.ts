import { Knex } from 'knex';
import { getDatabase } from '../database/connection';
import { env } from '../config';

/**
 * Sync Engine Service
 *
 * Implements offline-first architecture with automatic conflict resolution.
 * Handles synchronization of offline actions to server with queue management
 * and intelligent retry logic.
 */

export interface SyncQueueItem {
  id: string;
  user_id: string;
  device_id: string;
  entity_type: string;
  entity_id: string;
  operation: 'create' | 'update' | 'delete';
  data: Record<string, any>;
  metadata: Record<string, any>;
  priority: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retry_count: number;
  error_message?: string;
  client_timestamp: Date;
  created_at: Date;
  processed_at?: Date;
  completed_at?: Date;
}

export interface ConflictResolution {
  id: string;
  sync_queue_id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  conflict_type: 'concurrent_update' | 'stale_data' | 'deleted_on_server';
  client_version: Record<string, any>;
  server_version: Record<string, any>;
  merged_version?: Record<string, any>;
  resolution_strategy: 'server_wins' | 'client_wins' | 'merge' | 'manual';
  status: 'detected' | 'resolved' | 'needs_manual';
  resolved_by?: string;
  resolution_notes?: string;
  detected_at: Date;
  resolved_at?: Date;
}

export interface DeviceSyncState {
  id: string;
  user_id: string;
  device_id: string;
  device_name?: string;
  device_type?: 'mobile' | 'tablet' | 'desktop' | 'pwa';
  platform?: 'android' | 'ios' | 'web';
  app_version?: string;
  last_sync_at?: Date;
  last_full_sync_at?: Date;
  sync_cursor: Record<string, any>;
  pending_items: number;
  storage_used_mb: number;
  storage_limit_mb: number;
  wifi_only: boolean;
  auto_sync_enabled: boolean;
  connection_quality?: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
  last_online_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export class SyncEngineService {
  private db: Knex;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = [1000, 5000, 15000]; // Exponential backoff
  private readonly BATCH_SIZE = 50;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * Enqueue an offline action for synchronization
   */
  async enqueue(params: {
    userId: string;
    deviceId: string;
    entityType: string;
    entityId: string;
    operation: 'create' | 'update' | 'delete';
    data: Record<string, any>;
    metadata?: Record<string, any>;
    priority?: number;
    clientTimestamp: Date;
  }): Promise<SyncQueueItem> {
    const [item] = await this.db('sync_queue')
      .insert({
        user_id: params.userId,
        device_id: params.deviceId,
        entity_type: params.entityType,
        entity_id: params.entityId,
        operation: params.operation,
        data: JSON.stringify(params.data),
        metadata: JSON.stringify(params.metadata || {}),
        priority: params.priority || 5,
        status: 'pending',
        retry_count: 0,
        client_timestamp: params.clientTimestamp,
      })
      .returning('*');

    // Update device sync state
    await this.updateDeviceSyncState(params.userId, params.deviceId, {
      pending_items: this.db.raw('pending_items + 1'),
    });

    return this.deserializeSyncQueueItem(item);
  }

  /**
   * Process pending sync queue items for a user
   */
  async processPendingItems(
    userId: string,
    deviceId?: string,
    limit: number = this.BATCH_SIZE
  ): Promise<{ processed: number; failed: number; conflicts: number }> {
    let query = this.db('sync_queue')
      .where('user_id', userId)
      .where('status', 'pending')
      .where('retry_count', '<', this.MAX_RETRIES)
      .orderBy('priority', 'asc')
      .orderBy('client_timestamp', 'asc')
      .limit(limit);

    if (deviceId) {
      query = query.where('device_id', deviceId);
    }

    const items = await query;

    let processed = 0;
    let failed = 0;
    let conflicts = 0;

    for (const item of items) {
      try {
        // Mark as processing
        await this.db('sync_queue')
          .where('id', item.id)
          .update({
            status: 'processing',
            processed_at: this.db.fn.now(),
          });

        // Process the item
        const result = await this.processItem(this.deserializeSyncQueueItem(item));

        if (result.conflict) {
          conflicts++;
          await this.handleConflict(item, result.conflictData!);
        } else if (result.success) {
          processed++;
          await this.db('sync_queue')
            .where('id', item.id)
            .update({
              status: 'completed',
              completed_at: this.db.fn.now(),
            });

          await this.updateDeviceSyncState(item.user_id, item.device_id, {
            pending_items: this.db.raw('GREATEST(pending_items - 1, 0)'),
            last_sync_at: this.db.fn.now(),
          });
        } else {
          failed++;
          await this.db('sync_queue')
            .where('id', item.id)
            .update({
              status: 'pending',
              retry_count: this.db.raw('retry_count + 1'),
              error_message: result.error,
            });
        }
      } catch (error) {
        failed++;
        await this.db('sync_queue')
          .where('id', item.id)
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            retry_count: this.db.raw('retry_count + 1'),
          });
      }
    }

    return { processed, failed, conflicts };
  }

  /**
   * Process a single sync queue item
   */
  private async processItem(item: SyncQueueItem): Promise<{
    success: boolean;
    conflict?: boolean;
    conflictData?: any;
    error?: string;
  }> {
    try {
      // Determine the target table based on entity type
      const table = this.getTableForEntityType(item.entity_type);
      if (!table) {
        return { success: false, error: `Unknown entity type: ${item.entity_type}` };
      }

      // Check for conflicts
      const conflict = await this.detectConflict(item, table);
      if (conflict) {
        return { success: false, conflict: true, conflictData: conflict };
      }

      // Execute the operation
      switch (item.operation) {
        case 'create':
          await this.db(table).insert(item.data);
          break;
        case 'update':
          await this.db(table)
            .where('id', item.entity_id)
            .update({
              ...item.data,
              updated_at: this.db.fn.now(),
            });
          break;
        case 'delete':
          await this.db(table).where('id', item.entity_id).delete();
          break;
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Detect conflicts between client and server versions
   */
  private async detectConflict(
    item: SyncQueueItem,
    table: string
  ): Promise<any | null> {
    if (item.operation === 'create') {
      // Check if entity already exists
      const existing = await this.db(table).where('id', item.entity_id).first();
      if (existing) {
        return {
          type: 'concurrent_update',
          server_version: existing,
        };
      }
    } else if (item.operation === 'update' || item.operation === 'delete') {
      const existing = await this.db(table).where('id', item.entity_id).first();

      if (!existing) {
        return {
          type: 'deleted_on_server',
          server_version: null,
        };
      }

      // Check if server version is newer
      if (existing.updated_at && item.client_timestamp) {
        const serverTime = new Date(existing.updated_at);
        const clientTime = new Date(item.client_timestamp);

        if (serverTime > clientTime) {
          return {
            type: 'stale_data',
            server_version: existing,
          };
        }
      }
    }

    return null;
  }

  /**
   * Handle synchronization conflicts
   */
  private async handleConflict(
    item: SyncQueueItem,
    conflictData: any
  ): Promise<void> {
    const strategy = this.determineResolutionStrategy(item.entity_type, conflictData.type);

    const [conflict] = await this.db('sync_conflicts')
      .insert({
        sync_queue_id: item.id,
        user_id: item.user_id,
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        conflict_type: conflictData.type,
        client_version: JSON.stringify(item.data),
        server_version: JSON.stringify(conflictData.server_version),
        resolution_strategy: strategy,
        status: strategy === 'manual' ? 'needs_manual' : 'detected',
      })
      .returning('*');

    // Auto-resolve if strategy is not manual
    if (strategy !== 'manual') {
      await this.resolveConflict(conflict.id, strategy);
    }
  }

  /**
   * Determine conflict resolution strategy
   */
  private determineResolutionStrategy(
    entityType: string,
    conflictType: string
  ): 'server_wins' | 'client_wins' | 'merge' | 'manual' {
    // Critical data: server wins by default
    const criticalEntities = ['checkpoint_response', 'progress', 'trust_score'];
    if (criticalEntities.includes(entityType)) {
      return 'server_wins';
    }

    // Deleted on server: server wins
    if (conflictType === 'deleted_on_server') {
      return 'server_wins';
    }

    // User-generated content: merge or manual
    const userContentEntities = ['profile', 'preferences', 'notes'];
    if (userContentEntities.includes(entityType)) {
      return 'merge';
    }

    // Default: server wins for stale data
    if (conflictType === 'stale_data') {
      return 'server_wins';
    }

    return 'manual';
  }

  /**
   * Resolve a conflict using the specified strategy
   */
  async resolveConflict(
    conflictId: string,
    strategy?: 'server_wins' | 'client_wins' | 'merge' | 'manual',
    userId?: string,
    notes?: string
  ): Promise<void> {
    const conflict = await this.db('sync_conflicts').where('id', conflictId).first();

    if (!conflict) {
      throw new Error('Conflict not found');
    }

    const resolutionStrategy = strategy || conflict.resolution_strategy;
    let mergedVersion: any = null;

    switch (resolutionStrategy) {
      case 'server_wins':
        mergedVersion = conflict.server_version;
        break;
      case 'client_wins':
        mergedVersion = conflict.client_version;
        break;
      case 'merge':
        mergedVersion = this.mergeVersions(
          conflict.client_version,
          conflict.server_version
        );
        break;
      case 'manual':
        if (!userId) {
          throw new Error('Manual resolution requires user ID');
        }
        // Manual resolution requires explicit merged version
        break;
    }

    await this.db('sync_conflicts')
      .where('id', conflictId)
      .update({
        merged_version: mergedVersion ? JSON.stringify(mergedVersion) : null,
        status: 'resolved',
        resolved_by: userId || null,
        resolution_notes: notes || null,
        resolved_at: this.db.fn.now(),
      });

    // Apply the resolution
    if (mergedVersion && resolutionStrategy !== 'manual') {
      const table = this.getTableForEntityType(conflict.entity_type);
      if (table) {
        await this.db(table)
          .where('id', conflict.entity_id)
          .update({
            ...mergedVersion,
            updated_at: this.db.fn.now(),
          });
      }
    }

    // Mark sync queue item as completed
    await this.db('sync_queue')
      .where('id', conflict.sync_queue_id)
      .update({
        status: 'completed',
        completed_at: this.db.fn.now(),
      });
  }

  /**
   * Merge client and server versions
   */
  private mergeVersions(
    clientVersion: any,
    serverVersion: any
  ): Record<string, any> {
    // Simple merge: prefer client for user-editable fields, server for system fields
    const merged = { ...serverVersion };
    const userEditableFields = ['name', 'bio', 'preferences', 'notes', 'settings'];

    for (const field of userEditableFields) {
      if (clientVersion[field] !== undefined) {
        merged[field] = clientVersion[field];
      }
    }

    return merged;
  }

  /**
   * Get or create device sync state
   */
  async getOrCreateDeviceSyncState(
    userId: string,
    deviceId: string,
    deviceInfo?: Partial<DeviceSyncState>
  ): Promise<DeviceSyncState> {
    const existing = await this.db('device_sync_state')
      .where('user_id', userId)
      .where('device_id', deviceId)
      .first();

    if (existing) {
      return existing;
    }

    const [state] = await this.db('device_sync_state')
      .insert({
        user_id: userId,
        device_id: deviceId,
        device_name: deviceInfo?.device_name || null,
        device_type: deviceInfo?.device_type || null,
        platform: deviceInfo?.platform || null,
        app_version: deviceInfo?.app_version || null,
        sync_cursor: JSON.stringify({}),
        pending_items: 0,
        storage_used_mb: 0,
        storage_limit_mb: 500,
        wifi_only: true,
        auto_sync_enabled: true,
      })
      .returning('*');

    return state;
  }

  /**
   * Update device sync state
   */
  async updateDeviceSyncState(
    userId: string,
    deviceId: string,
    updates: Partial<DeviceSyncState>
  ): Promise<void> {
    await this.db('device_sync_state')
      .where('user_id', userId)
      .where('device_id', deviceId)
      .update({
        ...updates,
        updated_at: this.db.fn.now(),
      });
  }

  /**
   * Get sync cursor for a device
   */
  async getSyncCursor(
    userId: string,
    deviceId: string
  ): Promise<Record<string, any>> {
    const state = await this.db('device_sync_state')
      .where('user_id', userId)
      .where('device_id', deviceId)
      .first();

    return state?.sync_cursor || {};
  }

  /**
   * Update sync cursor for a device
   */
  async updateSyncCursor(
    userId: string,
    deviceId: string,
    entityType: string,
    cursor: any
  ): Promise<void> {
    const currentCursor = await this.getSyncCursor(userId, deviceId);
    currentCursor[entityType] = cursor;

    await this.db('device_sync_state')
      .where('user_id', userId)
      .where('device_id', deviceId)
      .update({
        sync_cursor: JSON.stringify(currentCursor),
        updated_at: this.db.fn.now(),
      });
  }

  /**
   * Get pending sync items count
   */
  async getPendingCount(userId: string, deviceId?: string): Promise<number> {
    let query = this.db('sync_queue')
      .where('user_id', userId)
      .where('status', 'pending')
      .count('* as count');

    if (deviceId) {
      query = query.where('device_id', deviceId);
    }

    const result = await query.first();
    return parseInt(result?.count || '0', 10);
  }

  /**
   * Get unresolved conflicts
   */
  async getUnresolvedConflicts(userId: string): Promise<ConflictResolution[]> {
    const conflicts = await this.db('sync_conflicts')
      .where('user_id', userId)
      .whereIn('status', ['detected', 'needs_manual'])
      .orderBy('detected_at', 'desc');

    return conflicts;
  }

  /**
   * Clear old completed sync items
   */
  async cleanupCompletedItems(olderThanDays: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const deleted = await this.db('sync_queue')
      .where('status', 'completed')
      .where('completed_at', '<', cutoffDate)
      .delete();

    return deleted;
  }

  /**
   * Map entity type to database table
   */
  private getTableForEntityType(entityType: string): string | null {
    const mapping: Record<string, string> = {
      user: 'users',
      profile: 'user_profiles',
      checkpoint_response: 'checkpoint_responses',
      progress: 'learning_progress',
      preferences: 'user_preferences',
      notes: 'user_notes',
      interaction: 'content_interactions',
    };

    return mapping[entityType] || null;
  }

  /**
   * Deserialize sync queue item from database
   */
  private deserializeSyncQueueItem(item: any): SyncQueueItem {
    return {
      ...item,
      data: typeof item.data === 'string' ? JSON.parse(item.data) : item.data,
      metadata: typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata,
    };
  }
}

export const syncEngineService = new SyncEngineService();
