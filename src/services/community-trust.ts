import type { Knex } from 'knex';
import { getDatabase } from '../database';
import { auditService } from './audit';

/**
 * Community Trust Network Service
 *
 * Implements inter-community trust relationships enabling resource sharing
 * and cross-community collaboration.
 *
 * Per security spec: Requires administrator mutual agreement, security compliance
 * verification, and maintains trust audit trails.
 */

export type TrustLevel = 'limited' | 'standard' | 'full';
export type TrustStatus = 'pending' | 'active' | 'suspended' | 'revoked';

export interface CreateTrustParams {
  fromCommunityId: string;
  toCommunityId: string;
  initiatedBy: string;
  trustLevel?: TrustLevel;
  sharingPermissions?: Record<string, any>;
  notes?: string;
  probationDays?: number;
}

export interface ApproveTrustParams {
  trustId: string;
  approvedBy: string;
  securityComplianceVerified?: boolean;
  notes?: string;
}

export interface UpdateTrustParams {
  trustId: string;
  userId: string;
  trustLevel?: TrustLevel;
  sharingPermissions?: Record<string, any>;
  notes?: string;
}

export interface RevokeTrustParams {
  trustId: string;
  revokedBy: string;
  reason: string;
}

export interface TrustRelationship {
  id: string;
  fromCommunityId: string;
  toCommunityId: string;
  trustLevel: TrustLevel;
  status: TrustStatus;
  initiatedBy: string;
  approvedBy?: string;
  securityComplianceVerified: boolean;
  complianceVerifiedAt?: Date;
  complianceVerifiedBy?: string;
  sharingPermissions?: Record<string, any>;
  isProbationary: boolean;
  probationEndsAt?: Date;
  notes?: string;
  revocationReason?: string;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  revokedAt?: Date;
}

class CommunityTrustService {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * Initiate a trust relationship between two communities
   *
   * @param params Trust relationship parameters
   * @returns Created trust relationship
   */
  async createTrustRelationship(params: CreateTrustParams): Promise<TrustRelationship> {
    // Validate that communities exist
    const [fromCommunity, toCommunity] = await Promise.all([
      this.db('communities').where('id', params.fromCommunityId).first(),
      this.db('communities').where('id', params.toCommunityId).first(),
    ]);

    if (!fromCommunity) {
      throw new Error(`Community ${params.fromCommunityId} not found`);
    }

    if (!toCommunity) {
      throw new Error(`Community ${params.toCommunityId} not found`);
    }

    // Check if trust relationship already exists (in either direction)
    const existing = await this.db('community_trust_relationships')
      .where(function() {
        this.where({
          from_community_id: params.fromCommunityId,
          to_community_id: params.toCommunityId,
        }).orWhere({
          from_community_id: params.toCommunityId,
          to_community_id: params.fromCommunityId,
        });
      })
      .first();

    if (existing) {
      throw new Error('Trust relationship already exists between these communities');
    }

    // Set default probation period (30 days)
    const probationDays = params.probationDays || 30;
    const probationEndsAt = new Date();
    probationEndsAt.setDate(probationEndsAt.getDate() + probationDays);

    // Default sharing permissions
    const defaultPermissions = {
      content: { enabled: false, approval_required: true },
      mentors: { enabled: false, approval_required: true },
      analytics: { enabled: false },
    };

    const [trust] = await this.db('community_trust_relationships')
      .insert({
        from_community_id: params.fromCommunityId,
        to_community_id: params.toCommunityId,
        trust_level: params.trustLevel || 'limited',
        status: 'pending',
        initiated_by: params.initiatedBy,
        sharing_permissions: JSON.stringify(params.sharingPermissions || defaultPermissions),
        is_probationary: true,
        probation_ends_at: probationEndsAt,
        notes: params.notes,
      })
      .returning('*');

    // Log the trust relationship creation
    await auditService.logAdmin({
      userId: params.initiatedBy,
      action: 'create_trust_relationship',
      targetType: 'community_trust',
      targetId: trust.id,
      targetName: `Trust from ${fromCommunity.name} to ${toCommunity.name}`,
      description: `Initiated trust relationship between communities`,
      metadata: {
        fromCommunityId: params.fromCommunityId,
        toCommunityId: params.toCommunityId,
        trustLevel: trust.trust_level,
      },
    });

    return this.mapTrustRelationship(trust);
  }

  /**
   * Approve a pending trust relationship
   *
   * @param params Approval parameters
   * @returns Updated trust relationship
   */
  async approveTrustRelationship(params: ApproveTrustParams): Promise<TrustRelationship> {
    const trust = await this.db('community_trust_relationships')
      .where('id', params.trustId)
      .first();

    if (!trust) {
      throw new Error('Trust relationship not found');
    }

    if (trust.status !== 'pending') {
      throw new Error('Trust relationship is not in pending status');
    }

    const updateData: any = {
      status: 'active',
      approved_by: params.approvedBy,
      approved_at: new Date(),
    };

    if (params.securityComplianceVerified) {
      updateData.security_compliance_verified = true;
      updateData.compliance_verified_at = new Date();
      updateData.compliance_verified_by = params.approvedBy;
    }

    if (params.notes) {
      updateData.notes = params.notes;
    }

    const [updated] = await this.db('community_trust_relationships')
      .where('id', params.trustId)
      .update(updateData)
      .returning('*');

    // Log the approval
    await auditService.logAdmin({
      userId: params.approvedBy,
      action: 'approve_trust_relationship',
      targetType: 'community_trust',
      targetId: params.trustId,
      description: `Approved trust relationship`,
      metadata: {
        fromCommunityId: trust.from_community_id,
        toCommunityId: trust.to_community_id,
        securityComplianceVerified: params.securityComplianceVerified,
      },
    });

    return this.mapTrustRelationship(updated);
  }

  /**
   * Update trust relationship settings
   *
   * @param params Update parameters
   * @returns Updated trust relationship
   */
  async updateTrustRelationship(params: UpdateTrustParams): Promise<TrustRelationship> {
    const trust = await this.db('community_trust_relationships')
      .where('id', params.trustId)
      .first();

    if (!trust) {
      throw new Error('Trust relationship not found');
    }

    const updateData: any = {};

    if (params.trustLevel) {
      updateData.trust_level = params.trustLevel;
    }

    if (params.sharingPermissions) {
      updateData.sharing_permissions = JSON.stringify(params.sharingPermissions);
    }

    if (params.notes) {
      updateData.notes = params.notes;
    }

    const [updated] = await this.db('community_trust_relationships')
      .where('id', params.trustId)
      .update(updateData)
      .returning('*');

    // Log the update
    await auditService.logAdmin({
      userId: params.userId,
      action: 'update_trust_relationship',
      targetType: 'community_trust',
      targetId: params.trustId,
      description: `Updated trust relationship settings`,
      metadata: {
        changes: updateData,
      },
    });

    return this.mapTrustRelationship(updated);
  }

  /**
   * Suspend a trust relationship temporarily
   *
   * @param trustId Trust relationship ID
   * @param suspendedBy User ID
   * @param reason Suspension reason
   * @returns Updated trust relationship
   */
  async suspendTrustRelationship(trustId: string, suspendedBy: string, reason: string): Promise<TrustRelationship> {
    const trust = await this.db('community_trust_relationships')
      .where('id', trustId)
      .first();

    if (!trust) {
      throw new Error('Trust relationship not found');
    }

    const [updated] = await this.db('community_trust_relationships')
      .where('id', trustId)
      .update({
        status: 'suspended',
        notes: `${trust.notes || ''}\n\nSuspended: ${reason}`,
      })
      .returning('*');

    // Log the suspension
    await auditService.logAdmin({
      userId: suspendedBy,
      action: 'suspend_trust_relationship',
      targetType: 'community_trust',
      targetId: trustId,
      description: `Suspended trust relationship: ${reason}`,
      metadata: {
        reason,
      },
    });

    return this.mapTrustRelationship(updated);
  }

  /**
   * Revoke a trust relationship permanently
   *
   * @param params Revocation parameters
   * @returns Updated trust relationship
   */
  async revokeTrustRelationship(params: RevokeTrustParams): Promise<TrustRelationship> {
    const trust = await this.db('community_trust_relationships')
      .where('id', params.trustId)
      .first();

    if (!trust) {
      throw new Error('Trust relationship not found');
    }

    const [updated] = await this.db('community_trust_relationships')
      .where('id', params.trustId)
      .update({
        status: 'revoked',
        revoked_at: new Date(),
        revocation_reason: params.reason,
      })
      .returning('*');

    // Log the revocation
    await auditService.logAdmin({
      userId: params.revokedBy,
      action: 'revoke_trust_relationship',
      targetType: 'community_trust',
      targetId: params.trustId,
      description: `Revoked trust relationship: ${params.reason}`,
      metadata: {
        reason: params.reason,
      },
    });

    return this.mapTrustRelationship(updated);
  }

  /**
   * Get trust relationships for a community
   *
   * @param communityId Community ID
   * @param status Optional status filter
   * @returns Array of trust relationships
   */
  async getCommunityTrustRelationships(
    communityId: string,
    status?: TrustStatus
  ): Promise<TrustRelationship[]> {
    let query = this.db('community_trust_relationships')
      .where('from_community_id', communityId)
      .orWhere('to_community_id', communityId);

    if (status) {
      query = query.where('status', status);
    }

    const trusts = await query.orderBy('created_at', 'desc');

    return trusts.map(t => this.mapTrustRelationship(t));
  }

  /**
   * Get trusted communities (where trust is active)
   *
   * @param communityId Community ID
   * @param minTrustLevel Minimum trust level required
   * @returns Array of trusted community IDs
   */
  async getTrustedCommunities(
    communityId: string,
    minTrustLevel: TrustLevel = 'limited'
  ): Promise<string[]> {
    const trustLevels = ['limited', 'standard', 'full'];
    const minIndex = trustLevels.indexOf(minTrustLevel);
    const allowedLevels = trustLevels.slice(minIndex);

    const trusts = await this.db('community_trust_relationships')
      .where('status', 'active')
      .whereIn('trust_level', allowedLevels)
      .where(function() {
        this.where('from_community_id', communityId)
          .orWhere('to_community_id', communityId);
      });

    return trusts.map(t =>
      t.from_community_id === communityId ? t.to_community_id : t.from_community_id
    );
  }

  /**
   * Check if two communities have an active trust relationship
   *
   * @param community1Id First community ID
   * @param community2Id Second community ID
   * @returns Trust relationship if exists and active, null otherwise
   */
  async checkTrust(community1Id: string, community2Id: string): Promise<TrustRelationship | null> {
    const trust = await this.db('community_trust_relationships')
      .where('status', 'active')
      .where(function() {
        this.where({
          from_community_id: community1Id,
          to_community_id: community2Id,
        }).orWhere({
          from_community_id: community2Id,
          to_community_id: community1Id,
        });
      })
      .first();

    return trust ? this.mapTrustRelationship(trust) : null;
  }

  /**
   * End probationary period if conditions are met
   *
   * @param trustId Trust relationship ID
   * @param userId User ID performing the action
   * @returns Updated trust relationship
   */
  async endProbation(trustId: string, userId: string): Promise<TrustRelationship> {
    const trust = await this.db('community_trust_relationships')
      .where('id', trustId)
      .first();

    if (!trust) {
      throw new Error('Trust relationship not found');
    }

    if (!trust.is_probationary) {
      throw new Error('Trust relationship is not in probationary status');
    }

    const [updated] = await this.db('community_trust_relationships')
      .where('id', trustId)
      .update({
        is_probationary: false,
        probation_ends_at: null,
      })
      .returning('*');

    // Log the probation end
    await auditService.logAdmin({
      userId,
      action: 'end_trust_probation',
      targetType: 'community_trust',
      targetId: trustId,
      description: `Ended probationary period for trust relationship`,
    });

    return this.mapTrustRelationship(updated);
  }

  /**
   * Map database row to TrustRelationship interface
   */
  private mapTrustRelationship(row: any): TrustRelationship {
    return {
      id: row.id,
      fromCommunityId: row.from_community_id,
      toCommunityId: row.to_community_id,
      trustLevel: row.trust_level,
      status: row.status,
      initiatedBy: row.initiated_by,
      approvedBy: row.approved_by,
      securityComplianceVerified: row.security_compliance_verified,
      complianceVerifiedAt: row.compliance_verified_at,
      complianceVerifiedBy: row.compliance_verified_by,
      sharingPermissions: row.sharing_permissions,
      isProbationary: row.is_probationary,
      probationEndsAt: row.probation_ends_at,
      notes: row.notes,
      revocationReason: row.revocation_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      approvedAt: row.approved_at,
      revokedAt: row.revoked_at,
    };
  }
}

// Export singleton instance
export const communityTrustService = new CommunityTrustService();

// Export class for testing
export { CommunityTrustService };
