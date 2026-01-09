import { Knex } from 'knex';
import { getDatabase } from '../database';

export interface Role {
  id: string;
  name: string;
  slug: string;
  description?: string;
  scope: 'platform' | 'community';
  community_id?: string;
  is_default: boolean;
  is_system_role: boolean;
  priority: number;
  metadata?: any;
  created_at: Date;
  updated_at: Date;
}

export interface Permission {
  id: string;
  name: string;
  slug: string;
  description?: string;
  resource: string;
  action: string;
  scope: 'platform' | 'community' | 'both';
  metadata?: any;
  created_at: Date;
  updated_at: Date;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  conditions?: any;
  created_at: Date;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  assigned_by?: string;
  assigned_at: Date;
  expires_at?: Date;
  assignment_reason?: string;
  metadata?: any;
  created_at: Date;
  updated_at: Date;
}

export interface CommunityUserRole {
  id: string;
  user_id: string;
  community_id: string;
  role_id: string;
  assigned_by?: string;
  assigned_at: Date;
  expires_at?: Date;
  assignment_reason?: string;
  metadata?: any;
  created_at: Date;
  updated_at: Date;
}

export interface CreateRoleData {
  name: string;
  slug: string;
  description?: string;
  scope: 'platform' | 'community';
  community_id?: string;
  is_default?: boolean;
  priority?: number;
}

export interface CreatePermissionData {
  name: string;
  slug: string;
  description?: string;
  resource: string;
  action: string;
  scope: 'platform' | 'community' | 'both';
}

export class RbacService {
  private db: Knex;

  constructor() {
    this.db = getDatabase();
  }

  // ========== Role Management ==========

  /**
   * Create a new role
   */
  async createRole(data: CreateRoleData): Promise<Role> {
    const [role] = await this.db('roles')
      .insert({
        name: data.name,
        slug: data.slug,
        description: data.description,
        scope: data.scope,
        community_id: data.community_id,
        is_default: data.is_default || false,
        is_system_role: false,
        priority: data.priority || 0,
      })
      .returning('*');

    return role;
  }

  /**
   * Get role by ID
   */
  async getRoleById(roleId: string): Promise<Role | null> {
    const role = await this.db('roles').where({ id: roleId }).first();
    return role || null;
  }

  /**
   * Get role by slug and scope
   */
  async getRoleBySlug(slug: string, scope: 'platform' | 'community', communityId?: string): Promise<Role | null> {
    let query = this.db('roles').where({ slug, scope });

    if (scope === 'community' && communityId) {
      query = query.where({ community_id: communityId });
    }

    const role = await query.first();
    return role || null;
  }

  /**
   * List all roles
   */
  async listRoles(options: {
    scope?: 'platform' | 'community';
    community_id?: string;
  } = {}): Promise<Role[]> {
    let query = this.db('roles');

    if (options.scope) {
      query = query.where({ scope: options.scope });
    }

    if (options.community_id) {
      query = query.where({ community_id: options.community_id });
    }

    const roles = await query.orderBy('priority', 'desc').orderBy('name');
    return roles;
  }

  /**
   * Update role
   */
  async updateRole(roleId: string, data: Partial<CreateRoleData>): Promise<Role> {
    const [role] = await this.db('roles')
      .where({ id: roleId })
      .update(data)
      .returning('*');

    return role;
  }

  /**
   * Delete role
   */
  async deleteRole(roleId: string): Promise<void> {
    const role = await this.getRoleById(roleId);

    if (role?.is_system_role) {
      throw new Error('Cannot delete system role');
    }

    await this.db('roles').where({ id: roleId }).delete();
  }

  // ========== Permission Management ==========

  /**
   * Create a new permission
   */
  async createPermission(data: CreatePermissionData): Promise<Permission> {
    const [permission] = await this.db('permissions')
      .insert({
        name: data.name,
        slug: data.slug,
        description: data.description,
        resource: data.resource,
        action: data.action,
        scope: data.scope,
      })
      .returning('*');

    return permission;
  }

  /**
   * Get permission by ID
   */
  async getPermissionById(permissionId: string): Promise<Permission | null> {
    const permission = await this.db('permissions').where({ id: permissionId }).first();
    return permission || null;
  }

  /**
   * Get permission by slug
   */
  async getPermissionBySlug(slug: string): Promise<Permission | null> {
    const permission = await this.db('permissions').where({ slug }).first();
    return permission || null;
  }

  /**
   * List all permissions
   */
  async listPermissions(options: {
    resource?: string;
    action?: string;
    scope?: 'platform' | 'community' | 'both';
  } = {}): Promise<Permission[]> {
    let query = this.db('permissions');

    if (options.resource) {
      query = query.where({ resource: options.resource });
    }

    if (options.action) {
      query = query.where({ action: options.action });
    }

    if (options.scope) {
      query = query.where({ scope: options.scope });
    }

    const permissions = await query.orderBy('resource').orderBy('action');
    return permissions;
  }

  // ========== Role-Permission Mapping ==========

  /**
   * Assign permission to role
   */
  async assignPermissionToRole(roleId: string, permissionId: string, conditions?: any): Promise<RolePermission> {
    const [rolePermission] = await this.db('role_permissions')
      .insert({
        role_id: roleId,
        permission_id: permissionId,
        conditions,
      })
      .returning('*');

    return rolePermission;
  }

  /**
   * Remove permission from role
   */
  async removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    await this.db('role_permissions')
      .where({ role_id: roleId, permission_id: permissionId })
      .delete();
  }

  /**
   * Get permissions for a role
   */
  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const permissions = await this.db('permissions')
      .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
      .where('role_permissions.role_id', roleId)
      .select('permissions.*');

    return permissions;
  }

  // ========== User Role Assignment ==========

  /**
   * Assign platform role to user
   */
  async assignPlatformRole(
    userId: string,
    roleId: string,
    options: {
      assigned_by?: string;
      expires_at?: Date;
      assignment_reason?: string;
    } = {}
  ): Promise<UserRole> {
    const role = await this.getRoleById(roleId);

    if (!role || role.scope !== 'platform') {
      throw new Error('Invalid platform role');
    }

    const [userRole] = await this.db('user_roles')
      .insert({
        user_id: userId,
        role_id: roleId,
        assigned_by: options.assigned_by,
        expires_at: options.expires_at,
        assignment_reason: options.assignment_reason,
      })
      .returning('*');

    return userRole;
  }

  /**
   * Assign community role to user
   */
  async assignCommunityRole(
    userId: string,
    communityId: string,
    roleId: string,
    options: {
      assigned_by?: string;
      expires_at?: Date;
      assignment_reason?: string;
    } = {}
  ): Promise<CommunityUserRole> {
    const role = await this.getRoleById(roleId);

    if (!role || role.scope !== 'community') {
      throw new Error('Invalid community role');
    }

    if (role.community_id && role.community_id !== communityId) {
      throw new Error('Role does not belong to this community');
    }

    const [communityUserRole] = await this.db('community_user_roles')
      .insert({
        user_id: userId,
        community_id: communityId,
        role_id: roleId,
        assigned_by: options.assigned_by,
        expires_at: options.expires_at,
        assignment_reason: options.assignment_reason,
      })
      .returning('*');

    return communityUserRole;
  }

  /**
   * Remove platform role from user
   */
  async removePlatformRole(userId: string, roleId: string): Promise<void> {
    await this.db('user_roles')
      .where({ user_id: userId, role_id: roleId })
      .delete();
  }

  /**
   * Remove community role from user
   */
  async removeCommunityRole(userId: string, communityId: string, roleId: string): Promise<void> {
    await this.db('community_user_roles')
      .where({ user_id: userId, community_id: communityId, role_id: roleId })
      .delete();
  }

  /**
   * Get user's platform roles
   */
  async getUserPlatformRoles(userId: string): Promise<Role[]> {
    const roles = await this.db('roles')
      .join('user_roles', 'roles.id', 'user_roles.role_id')
      .where('user_roles.user_id', userId)
      .where(function() {
        this.whereNull('user_roles.expires_at')
          .orWhere('user_roles.expires_at', '>', this.client.raw('NOW()'));
      })
      .select('roles.*');

    return roles;
  }

  /**
   * Get user's community roles
   */
  async getUserCommunityRoles(userId: string, communityId: string): Promise<Role[]> {
    const roles = await this.db('roles')
      .join('community_user_roles', 'roles.id', 'community_user_roles.role_id')
      .where('community_user_roles.user_id', userId)
      .where('community_user_roles.community_id', communityId)
      .where(function() {
        this.whereNull('community_user_roles.expires_at')
          .orWhere('community_user_roles.expires_at', '>', this.client.raw('NOW()'));
      })
      .select('roles.*');

    return roles;
  }

  /**
   * Get all user permissions (platform + community)
   */
  async getUserPermissions(userId: string, communityId?: string): Promise<Permission[]> {
    const platformRoles = await this.getUserPlatformRoles(userId);
    let communityRoles: Role[] = [];

    if (communityId) {
      communityRoles = await this.getUserCommunityRoles(userId, communityId);
    }

    const allRoles = [...platformRoles, ...communityRoles];
    const roleIds = allRoles.map(r => r.id);

    if (roleIds.length === 0) {
      return [];
    }

    const permissions = await this.db('permissions')
      .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
      .whereIn('role_permissions.role_id', roleIds)
      .distinct('permissions.*');

    return permissions;
  }

  // ========== Authorization Checks ==========

  /**
   * Check if user has a specific permission
   */
  async userHasPermission(
    userId: string,
    permissionSlug: string,
    communityId?: string
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId, communityId);
    return permissions.some(p => p.slug === permissionSlug);
  }

  /**
   * Check if user has any of the specified permissions
   */
  async userHasAnyPermission(
    userId: string,
    permissionSlugs: string[],
    communityId?: string
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId, communityId);
    return permissions.some(p => permissionSlugs.includes(p.slug));
  }

  /**
   * Check if user has all of the specified permissions
   */
  async userHasAllPermissions(
    userId: string,
    permissionSlugs: string[],
    communityId?: string
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId, communityId);
    const userPermissionSlugs = permissions.map(p => p.slug);

    return permissionSlugs.every(slug => userPermissionSlugs.includes(slug));
  }

  /**
   * Check if user has a specific role
   */
  async userHasRole(userId: string, roleSlug: string, communityId?: string): Promise<boolean> {
    if (communityId) {
      const roles = await this.getUserCommunityRoles(userId, communityId);
      return roles.some(r => r.slug === roleSlug);
    } else {
      const roles = await this.getUserPlatformRoles(userId);
      return roles.some(r => r.slug === roleSlug);
    }
  }

  /**
   * Check if user has any of the specified roles
   */
  async userHasAnyRole(userId: string, roleSlugs: string[], communityId?: string): Promise<boolean> {
    if (communityId) {
      const roles = await this.getUserCommunityRoles(userId, communityId);
      return roles.some(r => roleSlugs.includes(r.slug));
    } else {
      const roles = await this.getUserPlatformRoles(userId);
      return roles.some(r => roleSlugs.includes(r.slug));
    }
  }
}
