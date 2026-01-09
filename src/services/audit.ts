import { getDatabase } from '../database';
import type { Knex } from 'knex';

/**
 * Audit Log Service
 *
 * Implements immutable audit logging for all security-relevant actions.
 * Per security spec: logs SHALL capture authentication, authorization, data access,
 * configuration changes, and administrative actions.
 */

export interface AuditLogEntry {
  // Actor information
  actorId?: string;
  actorType: 'user' | 'system' | 'service';
  actorIp?: string;
  actorUserAgent?: string;

  // Action details
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;

  // Context
  description?: string;
  metadata?: Record<string, any>;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };

  // Request context
  requestId?: string;
  sessionId?: string;

  // Classification
  severity?: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  category: 'authentication' | 'authorization' | 'data_access' | 'configuration' | 'administration' | 'security' | 'content' | 'other';

  // Compliance flags
  isSensitive?: boolean;
  isSecurityEvent?: boolean;
  requiresReview?: boolean;
}

export interface AuditLogQuery {
  actorId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  category?: string;
  severity?: string;
  isSecurityEvent?: boolean;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

class AuditService {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * Create an immutable audit log entry
   *
   * @param entry Audit log entry details
   * @returns Created audit log ID
   */
  async log(entry: AuditLogEntry): Promise<string> {
    const [result] = await this.db('audit_logs')
      .insert({
        actor_id: entry.actorId,
        actor_type: entry.actorType,
        actor_ip: entry.actorIp,
        actor_user_agent: entry.actorUserAgent,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        entity_name: entry.entityName,
        description: entry.description,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
        changes: entry.changes ? JSON.stringify(entry.changes) : null,
        request_id: entry.requestId,
        session_id: entry.sessionId,
        severity: entry.severity || 'info',
        category: entry.category,
        is_sensitive: entry.isSensitive || false,
        is_security_event: entry.isSecurityEvent || false,
        requires_review: entry.requiresReview || false,
      })
      .returning('id');

    return result.id;
  }

  /**
   * Log authentication events (login, logout, MFA, etc.)
   */
  async logAuth(params: {
    userId?: string;
    action: 'login' | 'logout' | 'login_failed' | 'mfa_enabled' | 'mfa_disabled' | 'password_reset' | 'password_changed';
    ip?: string;
    userAgent?: string;
    sessionId?: string;
    metadata?: Record<string, any>;
  }): Promise<string> {
    return this.log({
      actorId: params.userId,
      actorType: params.userId ? 'user' : 'system',
      actorIp: params.ip,
      actorUserAgent: params.userAgent,
      action: params.action,
      entityType: 'user',
      entityId: params.userId,
      sessionId: params.sessionId,
      category: 'authentication',
      severity: params.action === 'login_failed' ? 'warning' : 'info',
      isSecurityEvent: true,
      metadata: params.metadata,
    });
  }

  /**
   * Log authorization decisions (permission checks, role changes, etc.)
   */
  async logAuthz(params: {
    userId: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    permission: string;
    granted: boolean;
    reason?: string;
    metadata?: Record<string, any>;
  }): Promise<string> {
    return this.log({
      actorId: params.userId,
      actorType: 'user',
      action: `authz_${params.granted ? 'granted' : 'denied'}`,
      entityType: params.resourceType,
      entityId: params.resourceId,
      description: `Permission '${params.permission}' for action '${params.action}' was ${params.granted ? 'granted' : 'denied'}${params.reason ? `: ${params.reason}` : ''}`,
      category: 'authorization',
      severity: params.granted ? 'info' : 'warning',
      metadata: {
        action: params.action,
        permission: params.permission,
        granted: params.granted,
        reason: params.reason,
        ...params.metadata,
      },
    });
  }

  /**
   * Log data access events (read, export, share, etc.)
   */
  async logDataAccess(params: {
    userId: string;
    action: 'read' | 'export' | 'share' | 'download';
    dataType: string;
    dataId?: string;
    dataDescription?: string;
    isSensitive?: boolean;
    metadata?: Record<string, any>;
  }): Promise<string> {
    return this.log({
      actorId: params.userId,
      actorType: 'user',
      action: `data_${params.action}`,
      entityType: params.dataType,
      entityId: params.dataId,
      entityName: params.dataDescription,
      category: 'data_access',
      severity: params.isSensitive ? 'warning' : 'info',
      isSensitive: params.isSensitive,
      metadata: params.metadata,
    });
  }

  /**
   * Log configuration changes (settings, policies, etc.)
   */
  async logConfig(params: {
    userId: string;
    action: 'create' | 'update' | 'delete';
    configType: string;
    configId?: string;
    configName?: string;
    before?: Record<string, any>;
    after?: Record<string, any>;
    metadata?: Record<string, any>;
  }): Promise<string> {
    return this.log({
      actorId: params.userId,
      actorType: 'user',
      action: `config_${params.action}`,
      entityType: params.configType,
      entityId: params.configId,
      entityName: params.configName,
      category: 'configuration',
      severity: 'info',
      requiresReview: true,
      changes: params.before || params.after ? {
        before: params.before,
        after: params.after,
      } : undefined,
      metadata: params.metadata,
    });
  }

  /**
   * Log administrative actions
   */
  async logAdmin(params: {
    userId: string;
    action: string;
    targetType: string;
    targetId?: string;
    targetName?: string;
    description?: string;
    metadata?: Record<string, any>;
  }): Promise<string> {
    return this.log({
      actorId: params.userId,
      actorType: 'user',
      action: `admin_${params.action}`,
      entityType: params.targetType,
      entityId: params.targetId,
      entityName: params.targetName,
      description: params.description,
      category: 'administration',
      severity: 'info',
      isSecurityEvent: true,
      requiresReview: true,
      metadata: params.metadata,
    });
  }

  /**
   * Log security events (suspicious activity, violations, etc.)
   */
  async logSecurity(params: {
    userId?: string;
    action: string;
    severity: 'warning' | 'error' | 'critical';
    description: string;
    metadata?: Record<string, any>;
    ip?: string;
  }): Promise<string> {
    return this.log({
      actorId: params.userId,
      actorType: params.userId ? 'user' : 'system',
      actorIp: params.ip,
      action: `security_${params.action}`,
      entityType: 'security_event',
      description: params.description,
      category: 'security',
      severity: params.severity,
      isSecurityEvent: true,
      requiresReview: true,
      metadata: params.metadata,
    });
  }

  /**
   * Query audit logs
   *
   * @param query Query parameters
   * @returns Array of audit log entries
   */
  async query(query: AuditLogQuery): Promise<any[]> {
    let q = this.db('audit_logs').select('*');

    if (query.actorId) {
      q = q.where('actor_id', query.actorId);
    }

    if (query.action) {
      q = q.where('action', query.action);
    }

    if (query.entityType) {
      q = q.where('entity_type', query.entityType);
    }

    if (query.entityId) {
      q = q.where('entity_id', query.entityId);
    }

    if (query.category) {
      q = q.where('category', query.category);
    }

    if (query.severity) {
      q = q.where('severity', query.severity);
    }

    if (query.isSecurityEvent !== undefined) {
      q = q.where('is_security_event', query.isSecurityEvent);
    }

    if (query.fromDate) {
      q = q.where('created_at', '>=', query.fromDate);
    }

    if (query.toDate) {
      q = q.where('created_at', '<=', query.toDate);
    }

    q = q.orderBy('created_at', 'desc');

    if (query.limit) {
      q = q.limit(query.limit);
    }

    if (query.offset) {
      q = q.offset(query.offset);
    }

    return await q;
  }

  /**
   * Get audit logs for a specific entity
   *
   * @param entityType Entity type
   * @param entityId Entity ID
   * @param limit Maximum number of records
   * @returns Array of audit log entries
   */
  async getEntityHistory(entityType: string, entityId: string, limit: number = 100): Promise<any[]> {
    return this.query({
      entityType,
      entityId,
      limit,
    });
  }

  /**
   * Get security events requiring review
   *
   * @param limit Maximum number of records
   * @returns Array of audit log entries
   */
  async getSecurityEventsForReview(limit: number = 100): Promise<any[]> {
    return this.query({
      isSecurityEvent: true,
      limit,
    });
  }

  /**
   * Get user activity summary
   *
   * @param userId User ID
   * @param fromDate Start date
   * @param toDate End date
   * @returns Activity summary
   */
  async getUserActivitySummary(userId: string, fromDate?: Date, toDate?: Date): Promise<any> {
    const query: any = {
      select: [
        this.db.raw('COUNT(*) as total_actions'),
        this.db.raw("COUNT(*) FILTER (WHERE category = 'authentication') as auth_events"),
        this.db.raw("COUNT(*) FILTER (WHERE category = 'data_access') as data_access_events"),
        this.db.raw("COUNT(*) FILTER (WHERE is_security_event = true) as security_events"),
        this.db.raw('MIN(created_at) as first_action'),
        this.db.raw('MAX(created_at) as last_action'),
      ],
    };

    let q = this.db('audit_logs')
      .select(query.select)
      .where('actor_id', userId);

    if (fromDate) {
      q = q.where('created_at', '>=', fromDate);
    }

    if (toDate) {
      q = q.where('created_at', '<=', toDate);
    }

    const [result] = await q;
    return result;
  }
}

// Export singleton instance
export const auditService = new AuditService();

// Export class for testing
export { AuditService };
