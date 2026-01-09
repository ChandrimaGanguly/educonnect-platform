import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing data
  await knex('role_permissions').del();
  await knex('community_user_roles').del();
  await knex('user_roles').del();
  await knex('permissions').del();
  await knex('roles').del();

  // ========== Permissions ==========
  const permissions = [
    // User permissions
    { name: 'View Users', slug: 'user:view', resource: 'user', action: 'view', scope: 'both' },
    { name: 'Create Users', slug: 'user:create', resource: 'user', action: 'create', scope: 'platform' },
    { name: 'Update Own Profile', slug: 'user:update:own', resource: 'user', action: 'update', scope: 'both' },
    { name: 'Update Any User', slug: 'user:update:any', resource: 'user', action: 'update', scope: 'platform' },
    { name: 'Delete Users', slug: 'user:delete', resource: 'user', action: 'delete', scope: 'platform' },

    // Community permissions
    { name: 'View Communities', slug: 'community:view', resource: 'community', action: 'view', scope: 'both' },
    { name: 'Create Community', slug: 'community:create', resource: 'community', action: 'create', scope: 'platform' },
    { name: 'Update Community', slug: 'community:update', resource: 'community', action: 'update', scope: 'community' },
    { name: 'Delete Community', slug: 'community:delete', resource: 'community', action: 'delete', scope: 'community' },
    { name: 'Manage Members', slug: 'community:manage_members', resource: 'community', action: 'manage', scope: 'community' },
    { name: 'Invite Members', slug: 'community:invite', resource: 'community', action: 'invite', scope: 'community' },

    // Content permissions
    { name: 'View Content', slug: 'content:view', resource: 'content', action: 'view', scope: 'both' },
    { name: 'Create Content', slug: 'content:create', resource: 'content', action: 'create', scope: 'both' },
    { name: 'Update Own Content', slug: 'content:update:own', resource: 'content', action: 'update', scope: 'both' },
    { name: 'Update Any Content', slug: 'content:update:any', resource: 'content', action: 'update', scope: 'community' },
    { name: 'Delete Own Content', slug: 'content:delete:own', resource: 'content', action: 'delete', scope: 'both' },
    { name: 'Delete Any Content', slug: 'content:delete:any', resource: 'content', action: 'delete', scope: 'community' },
    { name: 'Publish Content', slug: 'content:publish', resource: 'content', action: 'publish', scope: 'both' },
    { name: 'Review Content', slug: 'content:review', resource: 'content', action: 'review', scope: 'community' },

    // Comment permissions
    { name: 'View Comments', slug: 'comment:view', resource: 'comment', action: 'view', scope: 'both' },
    { name: 'Create Comments', slug: 'comment:create', resource: 'comment', action: 'create', scope: 'both' },
    { name: 'Update Own Comment', slug: 'comment:update:own', resource: 'comment', action: 'update', scope: 'both' },
    { name: 'Delete Own Comment', slug: 'comment:delete:own', resource: 'comment', action: 'delete', scope: 'both' },
    { name: 'Delete Any Comment', slug: 'comment:delete:any', resource: 'comment', action: 'delete', scope: 'community' },

    // Moderation permissions
    { name: 'View Reports', slug: 'moderation:view_reports', resource: 'moderation', action: 'view', scope: 'community' },
    { name: 'Handle Reports', slug: 'moderation:handle_reports', resource: 'moderation', action: 'handle', scope: 'community' },
    { name: 'Warn Users', slug: 'moderation:warn', resource: 'moderation', action: 'warn', scope: 'community' },
    { name: 'Suspend Users', slug: 'moderation:suspend', resource: 'moderation', action: 'suspend', scope: 'community' },
    { name: 'Ban Users', slug: 'moderation:ban', resource: 'moderation', action: 'ban', scope: 'community' },

    // Mentoring permissions
    { name: 'Request Mentor', slug: 'mentor:request', resource: 'mentor', action: 'request', scope: 'both' },
    { name: 'Become Mentor', slug: 'mentor:become', resource: 'mentor', action: 'become', scope: 'both' },
    { name: 'Manage Mentorship', slug: 'mentor:manage', resource: 'mentor', action: 'manage', scope: 'community' },

    // Assessment permissions
    { name: 'Take Checkpoints', slug: 'checkpoint:take', resource: 'checkpoint', action: 'take', scope: 'both' },
    { name: 'Create Checkpoints', slug: 'checkpoint:create', resource: 'checkpoint', action: 'create', scope: 'community' },
    { name: 'Grade Checkpoints', slug: 'checkpoint:grade', resource: 'checkpoint', action: 'grade', scope: 'community' },

    // Analytics permissions
    { name: 'View Own Analytics', slug: 'analytics:view:own', resource: 'analytics', action: 'view', scope: 'both' },
    { name: 'View Community Analytics', slug: 'analytics:view:community', resource: 'analytics', action: 'view', scope: 'community' },
    { name: 'View Platform Analytics', slug: 'analytics:view:platform', resource: 'analytics', action: 'view', scope: 'platform' },
  ];

  const insertedPermissions = await knex('permissions').insert(permissions).returning('*');
  const permissionMap: { [key: string]: string } = {};
  insertedPermissions.forEach(p => {
    permissionMap[p.slug] = p.id;
  });

  // ========== Platform Roles ==========
  const platformRoles = [
    {
      name: 'User',
      slug: 'user',
      description: 'Default role for all registered users',
      scope: 'platform',
      is_default: true,
      is_system_role: true,
      priority: 1,
    },
    {
      name: 'Platform Admin',
      slug: 'platform_admin',
      description: 'Administrator with full platform access',
      scope: 'platform',
      is_default: false,
      is_system_role: true,
      priority: 100,
    },
    {
      name: 'Platform Moderator',
      slug: 'platform_moderator',
      description: 'Moderator with platform-wide moderation capabilities',
      scope: 'platform',
      is_default: false,
      is_system_role: true,
      priority: 50,
    },
  ];

  const insertedPlatformRoles = await knex('roles').insert(platformRoles).returning('*');
  const platformRoleMap: { [key: string]: string } = {};
  insertedPlatformRoles.forEach(r => {
    platformRoleMap[r.slug] = r.id;
  });

  // ========== Community Roles (Templates) ==========
  const communityRoles = [
    {
      name: 'Member',
      slug: 'member',
      description: 'Basic community member',
      scope: 'community',
      is_default: true,
      is_system_role: true,
      priority: 1,
    },
    {
      name: 'Contributor',
      slug: 'contributor',
      description: 'Member who can create content',
      scope: 'community',
      is_default: false,
      is_system_role: true,
      priority: 10,
    },
    {
      name: 'Mentor',
      slug: 'mentor',
      description: 'Community mentor who can guide learners',
      scope: 'community',
      is_default: false,
      is_system_role: true,
      priority: 20,
    },
    {
      name: 'Moderator',
      slug: 'moderator',
      description: 'Community moderator',
      scope: 'community',
      is_default: false,
      is_system_role: true,
      priority: 40,
    },
    {
      name: 'Admin',
      slug: 'admin',
      description: 'Community administrator',
      scope: 'community',
      is_default: false,
      is_system_role: true,
      priority: 50,
    },
    {
      name: 'Owner',
      slug: 'owner',
      description: 'Community owner with full control',
      scope: 'community',
      is_default: false,
      is_system_role: true,
      priority: 100,
    },
  ];

  const insertedCommunityRoles = await knex('roles').insert(communityRoles).returning('*');
  const communityRoleMap: { [key: string]: string } = {};
  insertedCommunityRoles.forEach(r => {
    communityRoleMap[r.slug] = r.id;
  });

  // ========== Role-Permission Mappings ==========

  // Platform User permissions
  await knex('role_permissions').insert([
    { role_id: platformRoleMap['user'], permission_id: permissionMap['user:view'] },
    { role_id: platformRoleMap['user'], permission_id: permissionMap['user:update:own'] },
    { role_id: platformRoleMap['user'], permission_id: permissionMap['community:view'] },
    { role_id: platformRoleMap['user'], permission_id: permissionMap['community:create'] },
    { role_id: platformRoleMap['user'], permission_id: permissionMap['content:view'] },
    { role_id: platformRoleMap['user'], permission_id: permissionMap['comment:view'] },
    { role_id: platformRoleMap['user'], permission_id: permissionMap['analytics:view:own'] },
    { role_id: platformRoleMap['user'], permission_id: permissionMap['mentor:request'] },
    { role_id: platformRoleMap['user'], permission_id: permissionMap['checkpoint:take'] },
  ]);

  // Platform Admin permissions (all permissions)
  const allPermissionIds = Object.values(permissionMap).map(id => ({
    role_id: platformRoleMap['platform_admin'],
    permission_id: id,
  }));
  await knex('role_permissions').insert(allPermissionIds);

  // Platform Moderator permissions
  await knex('role_permissions').insert([
    { role_id: platformRoleMap['platform_moderator'], permission_id: permissionMap['user:view'] },
    { role_id: platformRoleMap['platform_moderator'], permission_id: permissionMap['community:view'] },
    { role_id: platformRoleMap['platform_moderator'], permission_id: permissionMap['content:view'] },
    { role_id: platformRoleMap['platform_moderator'], permission_id: permissionMap['moderation:view_reports'] },
    { role_id: platformRoleMap['platform_moderator'], permission_id: permissionMap['moderation:handle_reports'] },
    { role_id: platformRoleMap['platform_moderator'], permission_id: permissionMap['moderation:warn'] },
    { role_id: platformRoleMap['platform_moderator'], permission_id: permissionMap['moderation:suspend'] },
    { role_id: platformRoleMap['platform_moderator'], permission_id: permissionMap['analytics:view:platform'] },
  ]);

  // Community Member permissions
  await knex('role_permissions').insert([
    { role_id: communityRoleMap['member'], permission_id: permissionMap['content:view'] },
    { role_id: communityRoleMap['member'], permission_id: permissionMap['comment:view'] },
    { role_id: communityRoleMap['member'], permission_id: permissionMap['comment:create'] },
    { role_id: communityRoleMap['member'], permission_id: permissionMap['comment:update:own'] },
    { role_id: communityRoleMap['member'], permission_id: permissionMap['comment:delete:own'] },
    { role_id: communityRoleMap['member'], permission_id: permissionMap['checkpoint:take'] },
    { role_id: communityRoleMap['member'], permission_id: permissionMap['mentor:request'] },
  ]);

  // Community Contributor permissions (includes Member permissions)
  await knex('role_permissions').insert([
    { role_id: communityRoleMap['contributor'], permission_id: permissionMap['content:view'] },
    { role_id: communityRoleMap['contributor'], permission_id: permissionMap['content:create'] },
    { role_id: communityRoleMap['contributor'], permission_id: permissionMap['content:update:own'] },
    { role_id: communityRoleMap['contributor'], permission_id: permissionMap['content:delete:own'] },
    { role_id: communityRoleMap['contributor'], permission_id: permissionMap['content:publish'] },
    { role_id: communityRoleMap['contributor'], permission_id: permissionMap['comment:view'] },
    { role_id: communityRoleMap['contributor'], permission_id: permissionMap['comment:create'] },
    { role_id: communityRoleMap['contributor'], permission_id: permissionMap['comment:update:own'] },
    { role_id: communityRoleMap['contributor'], permission_id: permissionMap['comment:delete:own'] },
    { role_id: communityRoleMap['contributor'], permission_id: permissionMap['checkpoint:take'] },
    { role_id: communityRoleMap['contributor'], permission_id: permissionMap['mentor:request'] },
    { role_id: communityRoleMap['contributor'], permission_id: permissionMap['mentor:become'] },
  ]);

  // Community Mentor permissions (includes Contributor permissions)
  await knex('role_permissions').insert([
    { role_id: communityRoleMap['mentor'], permission_id: permissionMap['content:view'] },
    { role_id: communityRoleMap['mentor'], permission_id: permissionMap['content:create'] },
    { role_id: communityRoleMap['mentor'], permission_id: permissionMap['content:update:own'] },
    { role_id: communityRoleMap['mentor'], permission_id: permissionMap['content:delete:own'] },
    { role_id: communityRoleMap['mentor'], permission_id: permissionMap['content:publish'] },
    { role_id: communityRoleMap['mentor'], permission_id: permissionMap['comment:view'] },
    { role_id: communityRoleMap['mentor'], permission_id: permissionMap['comment:create'] },
    { role_id: communityRoleMap['mentor'], permission_id: permissionMap['checkpoint:grade'] },
    { role_id: communityRoleMap['mentor'], permission_id: permissionMap['mentor:become'] },
    { role_id: communityRoleMap['mentor'], permission_id: permissionMap['mentor:manage'] },
  ]);

  // Community Moderator permissions
  await knex('role_permissions').insert([
    { role_id: communityRoleMap['moderator'], permission_id: permissionMap['content:view'] },
    { role_id: communityRoleMap['moderator'], permission_id: permissionMap['content:update:any'] },
    { role_id: communityRoleMap['moderator'], permission_id: permissionMap['content:delete:any'] },
    { role_id: communityRoleMap['moderator'], permission_id: permissionMap['content:review'] },
    { role_id: communityRoleMap['moderator'], permission_id: permissionMap['comment:view'] },
    { role_id: communityRoleMap['moderator'], permission_id: permissionMap['comment:delete:any'] },
    { role_id: communityRoleMap['moderator'], permission_id: permissionMap['moderation:view_reports'] },
    { role_id: communityRoleMap['moderator'], permission_id: permissionMap['moderation:handle_reports'] },
    { role_id: communityRoleMap['moderator'], permission_id: permissionMap['moderation:warn'] },
    { role_id: communityRoleMap['moderator'], permission_id: permissionMap['moderation:suspend'] },
    { role_id: communityRoleMap['moderator'], permission_id: permissionMap['analytics:view:community'] },
  ]);

  // Community Admin permissions
  await knex('role_permissions').insert([
    { role_id: communityRoleMap['admin'], permission_id: permissionMap['community:update'] },
    { role_id: communityRoleMap['admin'], permission_id: permissionMap['community:manage_members'] },
    { role_id: communityRoleMap['admin'], permission_id: permissionMap['community:invite'] },
    { role_id: communityRoleMap['admin'], permission_id: permissionMap['content:view'] },
    { role_id: communityRoleMap['admin'], permission_id: permissionMap['content:create'] },
    { role_id: communityRoleMap['admin'], permission_id: permissionMap['content:update:any'] },
    { role_id: communityRoleMap['admin'], permission_id: permissionMap['content:delete:any'] },
    { role_id: communityRoleMap['admin'], permission_id: permissionMap['content:review'] },
    { role_id: communityRoleMap['admin'], permission_id: permissionMap['checkpoint:create'] },
    { role_id: communityRoleMap['admin'], permission_id: permissionMap['moderation:view_reports'] },
    { role_id: communityRoleMap['admin'], permission_id: permissionMap['moderation:handle_reports'] },
    { role_id: communityRoleMap['admin'], permission_id: permissionMap['moderation:warn'] },
    { role_id: communityRoleMap['admin'], permission_id: permissionMap['moderation:suspend'] },
    { role_id: communityRoleMap['admin'], permission_id: permissionMap['moderation:ban'] },
    { role_id: communityRoleMap['admin'], permission_id: permissionMap['analytics:view:community'] },
  ]);

  // Community Owner permissions (all community permissions)
  const communityPermissions = insertedPermissions.filter(
    p => p.scope === 'community' || p.scope === 'both'
  );
  await knex('role_permissions').insert(
    communityPermissions.map(p => ({
      role_id: communityRoleMap['owner'],
      permission_id: p.id,
    }))
  );

  console.log('✓ Seeded default roles and permissions');
}
