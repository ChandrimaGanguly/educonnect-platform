/**
 * Core Domain Types
 * Replaces `any` types with proper interfaces for type safety
 */

// ============ User Types ============

export interface PrivacySettings {
  profile_visibility: 'public' | 'community' | 'private';
  show_email: boolean;
  show_phone: boolean;
  allow_messages: boolean;
  allow_friend_requests?: boolean;
  show_activity?: boolean;
  show_learning_progress?: boolean;
}

export interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  in_app_notifications?: boolean;
  digest_frequency?: 'immediate' | 'daily' | 'weekly';
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

export interface UserMetadata {
  onboarding_completed?: boolean;
  onboarding_step?: number;
  last_seen_at?: Date;
  login_count?: number;
  referral_code?: string;
  referred_by?: string;
  custom_fields?: Record<string, string | number | boolean>;
}

// ============ Community Types ============

export interface ContentGuidelines {
  max_post_length?: number;
  allowed_media_types?: string[];
  require_moderation?: boolean;
  banned_words?: string[];
  language_requirements?: string[];
  citation_required?: boolean;
}

export interface CommunityFeatures {
  discussions_enabled: boolean;
  events_enabled: boolean;
  resources_enabled: boolean;
  mentorship_enabled: boolean;
  badges_enabled: boolean;
  leaderboards_enabled: boolean;
  offline_access_enabled: boolean;
  ai_moderation_enabled?: boolean;
}

export interface CommunitySettings {
  join_approval_required: boolean;
  min_trust_score_to_join?: number;
  max_members?: number;
  allow_invitations: boolean;
  invitation_limit_per_member?: number;
  default_member_role?: string;
  probation_period_days?: number;
  content_retention_days?: number;
}

export interface CommunityMetadata {
  banner_image_url?: string;
  social_links?: Record<string, string>;
  custom_fields?: Record<string, string | number | boolean>;
  analytics_enabled?: boolean;
}

export interface MemberNotificationPreferences {
  community_announcements: boolean;
  new_content: boolean;
  mentions: boolean;
  replies: boolean;
  events: boolean;
  digest_enabled: boolean;
}

export interface MemberMetadata {
  joined_via?: 'invitation' | 'request' | 'direct';
  invited_by?: string;
  notes?: string;
  custom_fields?: Record<string, string | number | boolean>;
}

// ============ RBAC Types ============

export interface RoleMetadata {
  description_long?: string;
  icon?: string;
  color?: string;
  permissions_summary?: string[];
}

export interface PermissionMetadata {
  category?: string;
  risk_level?: 'low' | 'medium' | 'high';
  requires_audit?: boolean;
}

export interface PermissionConditions {
  time_restricted?: {
    allowed_hours_start?: number;
    allowed_hours_end?: number;
    allowed_days?: number[];
  };
  resource_restricted?: {
    allowed_resource_ids?: string[];
    excluded_resource_ids?: string[];
  };
  rate_limited?: {
    max_per_hour?: number;
    max_per_day?: number;
  };
  trust_score_required?: number;
}

export interface UserRoleMetadata {
  assignment_type?: 'manual' | 'automatic' | 'earned';
  source?: string;
  notes?: string;
}

// ============ Trust Types ============

export interface TrustHistoryMetadata {
  automated?: boolean;
  triggered_by?: string;
  related_entity_type?: string;
  related_entity_id?: string;
}

export interface TrustPermissionRuleMetadata {
  description?: string;
  risk_level?: 'low' | 'medium' | 'high';
  review_required?: boolean;
}

export interface GrantedPermissions {
  can_post: boolean;
  can_comment: boolean;
  can_vote: boolean;
  can_report: boolean;
  can_invite: boolean;
  can_moderate?: boolean;
  can_access_premium?: boolean;
  custom_permissions?: Record<string, boolean>;
}

// ============ Audit Types ============

export interface AuditMetadata {
  request_id?: string;
  session_id?: string;
  user_agent?: string;
  additional_context?: Record<string, unknown>;
}

export interface AuditChanges {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  fields_changed?: string[];
}

// ============ Notification Types ============

export interface NotificationData {
  entity_type?: string;
  entity_id?: string;
  action_type?: string;
  actor_id?: string;
  actor_name?: string;
  preview_text?: string;
  deep_link?: string;
  custom_data?: Record<string, unknown>;
}

// ============ Sync Types ============

export interface SyncMetadata {
  client_version?: string;
  sync_source?: 'manual' | 'auto' | 'background';
  network_type?: 'wifi' | 'cellular' | 'offline';
  battery_level?: number;
}

export interface SyncCursor {
  [entityType: string]: {
    last_id?: string;
    last_timestamp?: string;
    page?: number;
  };
}

// ============ Content Types ============

export interface AssessmentCriteria {
  criterion_id: string;
  description: string;
  weight: number;
  rubric?: {
    level: number;
    description: string;
    points: number;
  }[];
}

export interface AccessibilityIssue {
  id: string;
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  element?: string;
  suggestion?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// ============ Database Row Mapper Type ============

/**
 * Generic database row type for mapping functions
 * Use this when you need to accept raw database rows before mapping
 */
export interface DatabaseRow {
  [key: string]: unknown;
}

// ============ Query Builder Types ============

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterOptions {
  [field: string]: string | number | boolean | string[] | undefined;
}
