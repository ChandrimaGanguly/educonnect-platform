# EduConnect Platform - Implementation Tasks

This document contains detailed implementation tasks for Phase 1 (Groups A-D) and Phase 2 (Groups E-H). Each task is designed to be actionable and can be picked up by an agent for implementation.

---

## Phase 1: Foundation Layer

### Group A: Infrastructure & Scaffolding

#### A1: Database Schema & Infrastructure

**Database Tables to Create:**

- [ ] **users** - Core user account table
  - `id` (UUID, PK), `email` (unique), `password_hash`, `status` (pending/active/suspended/deleted)
  - `created_at`, `updated_at`, `last_login_at`, `email_verified_at`
  - Indexes: `email`, `status`, `created_at`

- [ ] **user_profiles** - Extended user profile information
  - `user_id` (FK), `display_name`, `bio`, `avatar_url`, `preferred_language`
  - `timezone`, `privacy_settings` (JSONB), `skill_levels` (JSONB)
  - `learning_interests` (JSONB), `availability` (JSONB)

- [ ] **communities** - Community organization table
  - `id` (UUID, PK), `name`, `slug` (unique), `description`, `type` (open/invitation/approval)
  - `settings` (JSONB), `created_by` (FK users), `created_at`, `updated_at`
  - `parent_community_id` (FK, nullable for sub-communities)

- [ ] **community_memberships** - User-community relationships
  - `id` (UUID, PK), `user_id` (FK), `community_id` (FK), `status` (pending/active/suspended)
  - `joined_at`, `invited_by` (FK users, nullable), `vouched_by` (JSONB array of user_ids)

- [ ] **roles** - Role definitions
  - `id` (UUID, PK), `name`, `description`, `community_id` (FK, nullable for platform roles)
  - `permissions` (JSONB), `is_system_role` (boolean), `created_at`

- [ ] **user_roles** - User role assignments
  - `id` (UUID, PK), `user_id` (FK), `role_id` (FK), `community_id` (FK)
  - `assigned_by` (FK users), `assigned_at`, `expires_at` (nullable)

- [ ] **audit_logs** - Immutable audit trail
  - `id` (UUID, PK), `actor_id` (FK users), `action`, `target_type`, `target_id`
  - `context` (JSONB), `ip_address`, `user_agent`, `created_at`
  - Partition by `created_at` for performance

- [ ] **invitations** - Community invitations
  - `id` (UUID, PK), `code` (unique), `community_id` (FK), `invited_by` (FK users)
  - `email` (nullable), `expires_at`, `used_at`, `created_at`

**Files/Modules to Create:**

- [ ] `src/db/migrations/001_initial_schema.sql` - Initial database migration
- [ ] `src/db/migrations/002_seed_roles.sql` - Seed default platform roles
- [ ] `src/db/schema.prisma` or `src/db/models/` - ORM schema definitions
- [ ] `src/db/connection.ts` - Database connection pool configuration
- [ ] `docker/postgres/init.sql` - Docker initialization script
- [ ] `docker/redis/redis.conf` - Redis configuration

**Tests to Write:**

- [ ] `tests/db/migrations.test.ts` - Verify migrations run cleanly
- [ ] `tests/db/schema.test.ts` - Validate schema constraints and indexes
- [ ] `tests/db/connection.test.ts` - Test connection pool behavior

---

#### A2: Project Scaffolding

**Files/Modules to Create:**

- [ ] `src/index.ts` - Application entry point
- [ ] `src/app.ts` - Express/Fastify application setup
- [ ] `src/config/index.ts` - Configuration loader (env vars, defaults)
- [ ] `src/config/database.ts` - Database configuration
- [ ] `src/config/redis.ts` - Redis configuration
- [ ] `src/config/security.ts` - Security settings (CORS, CSP, rate limits)
- [ ] `src/middleware/error-handler.ts` - Global error handling middleware
- [ ] `src/middleware/request-logger.ts` - Request logging middleware
- [ ] `src/middleware/cors.ts` - CORS configuration
- [ ] `src/utils/logger.ts` - Structured logging utility (Winston/Pino)
- [ ] `src/utils/errors.ts` - Custom error classes
- [ ] `src/utils/validators.ts` - Common validation functions
- [ ] `src/types/index.ts` - Shared TypeScript types
- [ ] `Dockerfile` - Production Docker image
- [ ] `Dockerfile.dev` - Development Docker image
- [ ] `docker-compose.override.yml` - Development overrides
- [ ] `.env.example` - Environment variable template
- [ ] `tsconfig.json` - TypeScript configuration
- [ ] `nodemon.json` - Development server configuration

**Python Services (ML/Analytics):**

- [ ] `services/ml/requirements.txt` - Python ML dependencies
- [ ] `services/ml/Dockerfile` - ML service container
- [ ] `services/ml/app.py` - FastAPI application entry
- [ ] `services/ml/config.py` - Configuration management

**Tests to Write:**

- [ ] `tests/setup.ts` - Test environment setup
- [ ] `tests/app.test.ts` - Basic application startup tests
- [ ] `tests/config.test.ts` - Configuration loading tests

---

#### A3: Development Tooling

**Files/Modules to Create:**

- [ ] `.eslintrc.js` - ESLint configuration
- [ ] `.prettierrc` - Prettier configuration
- [ ] `.editorconfig` - Editor configuration
- [ ] `jest.config.js` - Jest testing configuration
- [ ] `.github/workflows/ci.yml` - CI pipeline (lint, test, build)
- [ ] `.github/workflows/cd.yml` - CD pipeline (deploy to staging/prod)
- [ ] `.github/pull_request_template.md` - PR template
- [ ] `.husky/pre-commit` - Pre-commit hooks (lint-staged)
- [ ] `.husky/commit-msg` - Commit message validation
- [ ] `commitlint.config.js` - Conventional commits config
- [ ] `scripts/setup-dev.sh` - Developer environment setup script
- [ ] `scripts/db-reset.sh` - Database reset script for development
- [ ] `scripts/generate-types.sh` - Type generation from schema
- [ ] `Makefile` - Common development commands

**Tests to Write:**

- [ ] Verify linting rules catch common issues
- [ ] Verify CI pipeline runs all checks
- [ ] Verify pre-commit hooks execute correctly

---

### Group B: Authentication & API Gateway

#### B1: User Account Management

**Database Tables to Add:**

- [ ] **password_reset_tokens** - Password recovery
  - `id` (UUID, PK), `user_id` (FK), `token_hash`, `expires_at`, `used_at`, `created_at`

- [ ] **email_verification_tokens** - Email verification
  - `id` (UUID, PK), `user_id` (FK), `token_hash`, `expires_at`, `verified_at`, `created_at`

- [ ] **login_attempts** - Brute force tracking
  - `id` (UUID, PK), `email`, `ip_address`, `success` (boolean), `created_at`
  - Index on `(email, created_at)` and `(ip_address, created_at)`

**Files/Modules to Create:**

- [ ] `src/modules/auth/auth.controller.ts` - Authentication endpoints
- [ ] `src/modules/auth/auth.service.ts` - Authentication business logic
- [ ] `src/modules/auth/auth.routes.ts` - Route definitions
- [ ] `src/modules/auth/auth.validators.ts` - Request validation schemas
- [ ] `src/modules/users/user.controller.ts` - User management endpoints
- [ ] `src/modules/users/user.service.ts` - User business logic
- [ ] `src/modules/users/user.repository.ts` - Database operations
- [ ] `src/modules/users/user.routes.ts` - Route definitions
- [ ] `src/modules/users/user.validators.ts` - Request validation
- [ ] `src/services/email.service.ts` - Email sending service
- [ ] `src/services/password.service.ts` - Password hashing (argon2/bcrypt)
- [ ] `src/templates/emails/welcome.html` - Welcome email template
- [ ] `src/templates/emails/password-reset.html` - Password reset template
- [ ] `src/templates/emails/email-verification.html` - Verification template

**API Endpoints to Implement:**

- [ ] `POST /api/v1/auth/register` - User registration
  - Body: `{ email, password, invitationCode?, communityId? }`
  - Response: `{ userId, status: 'pending'|'active' }`

- [ ] `POST /api/v1/auth/login` - User login
  - Body: `{ email, password }`
  - Response: `{ accessToken, refreshToken, user }`

- [ ] `POST /api/v1/auth/logout` - User logout
  - Headers: `Authorization: Bearer <token>`
  - Response: `{ success: true }`

- [ ] `POST /api/v1/auth/refresh` - Refresh access token
  - Body: `{ refreshToken }`
  - Response: `{ accessToken, refreshToken }`

- [ ] `POST /api/v1/auth/forgot-password` - Request password reset
  - Body: `{ email }`
  - Response: `{ message: 'Check your email' }`

- [ ] `POST /api/v1/auth/reset-password` - Complete password reset
  - Body: `{ token, newPassword }`
  - Response: `{ success: true }`

- [ ] `POST /api/v1/auth/verify-email` - Verify email address
  - Body: `{ token }`
  - Response: `{ success: true }`

- [ ] `GET /api/v1/users/me` - Get current user
- [ ] `PATCH /api/v1/users/me` - Update current user
- [ ] `DELETE /api/v1/users/me` - Delete account (soft delete)

**Tests to Write:**

- [ ] `tests/modules/auth/register.test.ts` - Registration flow tests
- [ ] `tests/modules/auth/login.test.ts` - Login flow tests
- [ ] `tests/modules/auth/password-reset.test.ts` - Password reset tests
- [ ] `tests/modules/auth/brute-force.test.ts` - Rate limiting tests
- [ ] `tests/modules/users/user.service.test.ts` - User service unit tests
- [ ] `tests/integration/auth-flow.test.ts` - End-to-end auth flow

---

#### B2: Authentication System (Security)

**Database Tables to Add:**

- [ ] **sessions** - Active user sessions
  - `id` (UUID, PK), `user_id` (FK), `token_hash`, `ip_address`, `user_agent`
  - `expires_at`, `revoked_at`, `created_at`

- [ ] **mfa_settings** - Multi-factor authentication
  - `id` (UUID, PK), `user_id` (FK), `method` (totp/sms/backup)
  - `secret_encrypted`, `enabled_at`, `last_used_at`

- [ ] **backup_codes** - MFA backup codes
  - `id` (UUID, PK), `user_id` (FK), `code_hash`, `used_at`, `created_at`

- [ ] **trusted_devices** - Remembered devices
  - `id` (UUID, PK), `user_id` (FK), `device_fingerprint`, `name`
  - `last_used_at`, `trusted_until`, `created_at`

**Files/Modules to Create:**

- [ ] `src/modules/auth/jwt.service.ts` - JWT token management
- [ ] `src/modules/auth/session.service.ts` - Session management
- [ ] `src/modules/auth/mfa.service.ts` - MFA setup and verification
- [ ] `src/modules/auth/mfa.controller.ts` - MFA endpoints
- [ ] `src/middleware/authenticate.ts` - JWT verification middleware
- [ ] `src/middleware/require-mfa.ts` - MFA check middleware
- [ ] `src/middleware/rate-limit.ts` - Rate limiting middleware
- [ ] `src/utils/crypto.ts` - Encryption utilities
- [ ] `src/utils/totp.ts` - TOTP generation/verification

**API Endpoints to Implement:**

- [ ] `POST /api/v1/auth/mfa/setup` - Initialize MFA setup
  - Response: `{ secret, qrCodeUrl, backupCodes }`

- [ ] `POST /api/v1/auth/mfa/verify` - Verify MFA during login
  - Body: `{ code, trustDevice? }`
  - Response: `{ accessToken, refreshToken }`

- [ ] `POST /api/v1/auth/mfa/disable` - Disable MFA
  - Body: `{ code }` (current MFA code required)

- [ ] `GET /api/v1/auth/sessions` - List active sessions
- [ ] `DELETE /api/v1/auth/sessions/:id` - Revoke specific session
- [ ] `DELETE /api/v1/auth/sessions` - Revoke all sessions (logout everywhere)

**Tests to Write:**

- [ ] `tests/modules/auth/jwt.test.ts` - JWT token tests
- [ ] `tests/modules/auth/mfa.test.ts` - MFA flow tests
- [ ] `tests/modules/auth/session.test.ts` - Session management tests
- [ ] `tests/middleware/authenticate.test.ts` - Auth middleware tests
- [ ] `tests/security/token-security.test.ts` - Token security validation

---

#### B3: Basic API Gateway

**Files/Modules to Create:**

- [ ] `src/graphql/schema.graphql` - GraphQL schema definition
- [ ] `src/graphql/resolvers/index.ts` - Resolver aggregation
- [ ] `src/graphql/resolvers/user.resolver.ts` - User type resolvers
- [ ] `src/graphql/resolvers/auth.resolver.ts` - Auth mutations
- [ ] `src/graphql/context.ts` - Request context builder
- [ ] `src/graphql/directives/auth.directive.ts` - @auth directive
- [ ] `src/graphql/directives/rateLimit.directive.ts` - @rateLimit directive
- [ ] `src/graphql/scalars/datetime.ts` - DateTime scalar
- [ ] `src/graphql/scalars/uuid.ts` - UUID scalar
- [ ] `src/middleware/rate-limit-graphql.ts` - GraphQL rate limiting
- [ ] `src/utils/dataloader.ts` - DataLoader factory for N+1 prevention
- [ ] `src/openapi/spec.yaml` - OpenAPI 3.0 specification
- [ ] `src/docs/swagger-ui.ts` - Swagger UI setup

**GraphQL Schema to Define:**

```graphql
# Types to implement:
- [ ] type User { id, email, profile, roles, createdAt }
- [ ] type UserProfile { displayName, bio, avatar, skills }
- [ ] type Community { id, name, description, members, settings }
- [ ] type Role { id, name, permissions }
- [ ] type AuthPayload { accessToken, refreshToken, user }

# Queries to implement:
- [ ] me: User
- [ ] user(id: ID!): User
- [ ] communities(first: Int, after: String): CommunityConnection

# Mutations to implement:
- [ ] register(input: RegisterInput!): AuthPayload
- [ ] login(input: LoginInput!): AuthPayload
- [ ] logout: Boolean
- [ ] refreshToken(token: String!): AuthPayload
```

**Tests to Write:**

- [ ] `tests/graphql/schema.test.ts` - Schema validation tests
- [ ] `tests/graphql/resolvers/user.test.ts` - User resolver tests
- [ ] `tests/graphql/auth.test.ts` - GraphQL auth tests
- [ ] `tests/graphql/rate-limit.test.ts` - Rate limiting tests
- [ ] `tests/api/openapi-validation.test.ts` - OpenAPI spec validation

---

### Group C: Profiles, Communities & RBAC

#### C1: User Profile System

**Files/Modules to Create:**

- [ ] `src/modules/profiles/profile.controller.ts` - Profile endpoints
- [ ] `src/modules/profiles/profile.service.ts` - Profile business logic
- [ ] `src/modules/profiles/profile.repository.ts` - Profile data access
- [ ] `src/modules/profiles/profile.validators.ts` - Input validation
- [ ] `src/modules/profiles/skill-assessment.service.ts` - Skill self-assessment
- [ ] `src/modules/profiles/privacy.service.ts` - Privacy settings management
- [ ] `src/graphql/resolvers/profile.resolver.ts` - Profile GraphQL resolvers

**API Endpoints to Implement:**

- [ ] `GET /api/v1/profiles/:userId` - Get user profile
  - Respects privacy settings based on viewer relationship

- [ ] `PATCH /api/v1/profiles/me` - Update own profile
  - Body: `{ displayName?, bio?, avatar?, skills?, availability? }`

- [ ] `PUT /api/v1/profiles/me/privacy` - Update privacy settings
  - Body: `{ profileVisibility, showEmail, showActivity }`

- [ ] `POST /api/v1/profiles/me/skills` - Add/update skill assessment
  - Body: `{ subject, level, selfAssessment }`

- [ ] `GET /api/v1/profiles/me/skills` - Get skill assessments
- [ ] `POST /api/v1/profiles/me/avatar` - Upload avatar image
  - Multipart form data, resize/optimize on upload

**Tests to Write:**

- [ ] `tests/modules/profiles/profile.service.test.ts` - Profile service tests
- [ ] `tests/modules/profiles/privacy.test.ts` - Privacy filtering tests
- [ ] `tests/modules/profiles/skill-assessment.test.ts` - Skill tests
- [ ] `tests/integration/profile-visibility.test.ts` - Privacy integration tests

---

#### C2: Community Management

**Database Tables to Add:**

- [ ] **community_settings** - Extended community configuration
  - `community_id` (FK, PK), `moderation_policy` (JSONB)
  - `curriculum_preferences` (JSONB), `localization` (JSONB)
  - `data_sharing_policy` (JSONB)

- [ ] **community_trust_relationships** - Inter-community trust
  - `id` (UUID, PK), `community_a_id` (FK), `community_b_id` (FK)
  - `trust_level` (limited/standard/full), `established_at`, `established_by` (FK users)

**Files/Modules to Create:**

- [ ] `src/modules/communities/community.controller.ts` - Community endpoints
- [ ] `src/modules/communities/community.service.ts` - Community logic
- [ ] `src/modules/communities/community.repository.ts` - Data access
- [ ] `src/modules/communities/membership.service.ts` - Membership management
- [ ] `src/modules/communities/invitation.service.ts` - Invitation handling
- [ ] `src/modules/communities/settings.service.ts` - Settings management
- [ ] `src/graphql/resolvers/community.resolver.ts` - GraphQL resolvers

**API Endpoints to Implement:**

- [ ] `POST /api/v1/communities` - Create community
  - Body: `{ name, description, type, settings }`
  - Creator becomes founding administrator

- [ ] `GET /api/v1/communities` - List communities
  - Query params: `type`, `search`, `page`, `limit`

- [ ] `GET /api/v1/communities/:id` - Get community details
- [ ] `PATCH /api/v1/communities/:id` - Update community (admin only)
- [ ] `DELETE /api/v1/communities/:id` - Delete community (founder only)

- [ ] `POST /api/v1/communities/:id/members` - Join community
- [ ] `DELETE /api/v1/communities/:id/members/:userId` - Remove member
- [ ] `GET /api/v1/communities/:id/members` - List members
- [ ] `PATCH /api/v1/communities/:id/members/:userId` - Update membership

- [ ] `POST /api/v1/communities/:id/invitations` - Create invitation
- [ ] `GET /api/v1/communities/:id/invitations` - List invitations
- [ ] `DELETE /api/v1/communities/:id/invitations/:code` - Revoke invitation

- [ ] `POST /api/v1/communities/:id/sub-communities` - Create sub-community

**Tests to Write:**

- [ ] `tests/modules/communities/community.service.test.ts` - Service tests
- [ ] `tests/modules/communities/membership.test.ts` - Membership tests
- [ ] `tests/modules/communities/invitation.test.ts` - Invitation flow tests
- [ ] `tests/integration/community-hierarchy.test.ts` - Sub-community tests

---

#### C3: Role-Based Access Control

**Files/Modules to Create:**

- [ ] `src/modules/rbac/role.service.ts` - Role management
- [ ] `src/modules/rbac/permission.service.ts` - Permission checking
- [ ] `src/modules/rbac/rbac.repository.ts` - RBAC data access
- [ ] `src/modules/rbac/role.controller.ts` - Role endpoints
- [ ] `src/middleware/authorize.ts` - Authorization middleware
- [ ] `src/middleware/community-context.ts` - Community scope middleware
- [ ] `src/decorators/permissions.ts` - Permission decorators
- [ ] `src/constants/permissions.ts` - Permission constants
- [ ] `src/constants/default-roles.ts` - Default role definitions

**Default Roles to Seed:**

```typescript
// src/constants/default-roles.ts
- [ ] LEARNER: ['content:read', 'checkpoint:take', 'profile:own']
- [ ] PEER_MENTOR: [...LEARNER, 'mentee:guide', 'session:create']
- [ ] MENTOR: [...PEER_MENTOR, 'content:contribute', 'checkpoint:review']
- [ ] CONTENT_CONTRIBUTOR: ['content:create', 'content:edit', 'content:submit']
- [ ] COMMUNITY_MODERATOR: ['content:moderate', 'member:warn', 'report:handle']
- [ ] COMMUNITY_ADMIN: ['community:configure', 'role:assign', 'member:manage']
- [ ] OVERSIGHT_MEMBER: ['content:review', 'quality:audit', 'policy:enforce']
- [ ] PLATFORM_ADMIN: ['*'] // All permissions
```

**API Endpoints to Implement:**

- [ ] `GET /api/v1/communities/:id/roles` - List community roles
- [ ] `POST /api/v1/communities/:id/roles` - Create custom role
- [ ] `PATCH /api/v1/communities/:id/roles/:roleId` - Update role
- [ ] `DELETE /api/v1/communities/:id/roles/:roleId` - Delete role

- [ ] `POST /api/v1/communities/:id/members/:userId/roles` - Assign role
  - Body: `{ roleId, expiresAt? }`

- [ ] `DELETE /api/v1/communities/:id/members/:userId/roles/:roleId` - Remove role

- [ ] `GET /api/v1/permissions` - List all available permissions
- [ ] `GET /api/v1/users/me/permissions` - Get current user's permissions

**Tests to Write:**

- [ ] `tests/modules/rbac/permission.service.test.ts` - Permission check tests
- [ ] `tests/modules/rbac/role.service.test.ts` - Role management tests
- [ ] `tests/middleware/authorize.test.ts` - Authorization middleware tests
- [ ] `tests/integration/rbac-scenarios.test.ts` - RBAC scenario tests

---

#### C4: Trust Score Foundation

**Database Tables to Add:**

- [ ] **trust_scores** - User trust scores
  - `id` (UUID, PK), `user_id` (FK), `community_id` (FK, nullable for global)
  - `score` (decimal 0-100), `factors` (JSONB), `calculated_at`

- [ ] **trust_events** - Events affecting trust
  - `id` (UUID, PK), `user_id` (FK), `event_type`, `points` (positive or negative)
  - `context` (JSONB), `created_at`

- [ ] **vouch_relationships** - User vouching graph
  - `id` (UUID, PK), `voucher_id` (FK), `vouchee_id` (FK)
  - `community_id` (FK), `created_at`

**Files/Modules to Create:**

- [ ] `src/modules/trust/trust.service.ts` - Trust score calculation
- [ ] `src/modules/trust/trust.repository.ts` - Trust data access
- [ ] `src/modules/trust/vouch.service.ts` - Vouching system
- [ ] `src/modules/trust/trust-factors.ts` - Trust factor definitions
- [ ] `src/modules/trust/trust.controller.ts` - Trust endpoints
- [ ] `src/middleware/trust-gate.ts` - Trust-based access control

**Trust Score Factors:**

```typescript
// src/modules/trust/trust-factors.ts
- [ ] ACCOUNT_AGE_WEIGHT: 0.15 (max 15 points, 1 year = full)
- [ ] ACTIVITY_WEIGHT: 0.20 (based on engagement)
- [ ] VOUCH_CHAIN_WEIGHT: 0.25 (depth from trusted anchors)
- [ ] ROLE_WEIGHT: 0.15 (higher roles = more trust)
- [ ] POSITIVE_ENGAGEMENT_WEIGHT: 0.15 (helpful actions)
- [ ] VIOLATION_PENALTY: -0.10 to -0.50 per violation
```

**API Endpoints to Implement:**

- [ ] `GET /api/v1/users/:id/trust-score` - Get user's trust score
- [ ] `POST /api/v1/users/:id/vouch` - Vouch for a user
  - Requires established trust of voucher

- [ ] `DELETE /api/v1/users/:id/vouch` - Remove vouch
- [ ] `GET /api/v1/users/me/trust-requirements` - Get unlock requirements

**Tests to Write:**

- [ ] `tests/modules/trust/trust.service.test.ts` - Trust calculation tests
- [ ] `tests/modules/trust/vouch.test.ts` - Vouching tests
- [ ] `tests/modules/trust/trust-unlock.test.ts` - Permission unlock tests
- [ ] `tests/integration/trust-flow.test.ts` - Trust progression tests

---

### Group D: Trust Networks, Audit & Notifications

#### D1: Inter-Community Trust Networks

**Files/Modules to Create:**

- [ ] `src/modules/trust/community-trust.service.ts` - Community trust management
- [ ] `src/modules/trust/cross-community.service.ts` - Cross-community operations
- [ ] `src/modules/trust/trust-network.repository.ts` - Trust graph queries

**API Endpoints to Implement:**

- [ ] `POST /api/v1/communities/:id/trust-requests` - Request trust relationship
  - Body: `{ targetCommunityId, proposedLevel, message }`

- [ ] `GET /api/v1/communities/:id/trust-relationships` - List trust relationships
- [ ] `PATCH /api/v1/communities/:id/trust-relationships/:relationId` - Update trust level
- [ ] `DELETE /api/v1/communities/:id/trust-relationships/:relationId` - Remove trust

- [ ] `GET /api/v1/communities/:id/shared-resources` - List shared resources
- [ ] `GET /api/v1/communities/:id/cross-community-mentors` - Available cross-community mentors

**Tests to Write:**

- [ ] `tests/modules/trust/community-trust.test.ts` - Community trust tests
- [ ] `tests/modules/trust/cross-community.test.ts` - Cross-community tests
- [ ] `tests/integration/trust-network.test.ts` - Trust network tests

---

#### D2: Audit Logging System

**Files/Modules to Create:**

- [ ] `src/modules/audit/audit.service.ts` - Audit logging service
- [ ] `src/modules/audit/audit.repository.ts` - Audit data access
- [ ] `src/modules/audit/audit.middleware.ts` - Automatic audit logging
- [ ] `src/modules/audit/audit.controller.ts` - Audit query endpoints
- [ ] `src/modules/audit/audit-events.ts` - Audit event type definitions

**Audit Events to Track:**

```typescript
// src/modules/audit/audit-events.ts
- [ ] AUTH_LOGIN, AUTH_LOGOUT, AUTH_FAILED
- [ ] USER_CREATED, USER_UPDATED, USER_DELETED
- [ ] ROLE_ASSIGNED, ROLE_REMOVED
- [ ] COMMUNITY_CREATED, COMMUNITY_UPDATED
- [ ] MEMBERSHIP_CHANGED
- [ ] CONTENT_CREATED, CONTENT_UPDATED, CONTENT_DELETED
- [ ] SETTINGS_CHANGED
- [ ] TRUST_CHANGED
```

**API Endpoints to Implement:**

- [ ] `GET /api/v1/audit` - Query audit logs (admin only)
  - Query params: `actorId`, `action`, `targetType`, `from`, `to`, `page`

- [ ] `GET /api/v1/communities/:id/audit` - Community audit logs
- [ ] `GET /api/v1/users/me/audit` - Personal activity log

**Tests to Write:**

- [ ] `tests/modules/audit/audit.service.test.ts` - Audit logging tests
- [ ] `tests/modules/audit/audit-query.test.ts` - Audit query tests
- [ ] `tests/integration/audit-trail.test.ts` - Audit trail integrity tests

---

#### D3: Basic Notification Infrastructure

**Database Tables to Add:**

- [ ] **notifications** - Notification records
  - `id` (UUID, PK), `user_id` (FK), `type`, `category`
  - `title`, `body`, `data` (JSONB), `read_at`, `created_at`

- [ ] **notification_preferences** - User notification settings
  - `user_id` (FK, PK), `preferences` (JSONB)
  - `quiet_hours_start`, `quiet_hours_end`, `timezone`

- [ ] **notification_queue** - Pending notification delivery
  - `id` (UUID, PK), `notification_id` (FK), `channel` (in_app/push/email/sms)
  - `status`, `attempts`, `last_attempt_at`, `delivered_at`

**Files/Modules to Create:**

- [ ] `src/modules/notifications/notification.service.ts` - Notification logic
- [ ] `src/modules/notifications/notification.repository.ts` - Data access
- [ ] `src/modules/notifications/notification.controller.ts` - Endpoints
- [ ] `src/modules/notifications/preference.service.ts` - Preference management
- [ ] `src/modules/notifications/channels/in-app.channel.ts` - In-app delivery
- [ ] `src/modules/notifications/channels/push.channel.ts` - Push notification stub
- [ ] `src/modules/notifications/channels/email.channel.ts` - Email delivery
- [ ] `src/modules/notifications/queue.service.ts` - Queue processing
- [ ] `src/modules/notifications/templates/` - Notification templates

**Notification Categories:**

```typescript
- [ ] LEARNING: checkpoint_reminder, course_recommendation, streak_alert
- [ ] MENTORSHIP: request_received, session_reminder, message_received
- [ ] COMMUNITY: announcement, reply_received, moderation_action
- [ ] SYSTEM: security_alert, account_change, achievement_unlocked
```

**API Endpoints to Implement:**

- [ ] `GET /api/v1/notifications` - Get user notifications
  - Query params: `unreadOnly`, `category`, `page`

- [ ] `PATCH /api/v1/notifications/:id/read` - Mark as read
- [ ] `PATCH /api/v1/notifications/read-all` - Mark all as read
- [ ] `DELETE /api/v1/notifications/:id` - Delete notification

- [ ] `GET /api/v1/notifications/preferences` - Get preferences
- [ ] `PUT /api/v1/notifications/preferences` - Update preferences
- [ ] `GET /api/v1/notifications/unread-count` - Get unread count

**Tests to Write:**

- [ ] `tests/modules/notifications/notification.service.test.ts` - Service tests
- [ ] `tests/modules/notifications/preference.test.ts` - Preference tests
- [ ] `tests/modules/notifications/channels.test.ts` - Channel tests
- [ ] `tests/integration/notification-flow.test.ts` - End-to-end tests

---

## Phase 2: Content & Learning Infrastructure

### Group E: Curriculum Structure & Offline Core

#### E1: Curriculum Structure

**Database Tables to Create:**

- [ ] **domains** - Top-level subject areas
  - `id` (UUID, PK), `name`, `slug`, `description`, `icon_url`
  - `display_order`, `created_at`

- [ ] **subjects** - Disciplines within domains
  - `id` (UUID, PK), `domain_id` (FK), `name`, `slug`, `description`
  - `difficulty_range` (JSONB), `estimated_hours`, `created_at`

- [ ] **courses** - Complete learning units
  - `id` (UUID, PK), `subject_id` (FK), `community_id` (FK, nullable)
  - `title`, `slug`, `description`, `learning_outcomes` (JSONB)
  - `difficulty_level`, `estimated_hours`, `version`, `status` (draft/review/published)
  - `created_by` (FK), `created_at`, `published_at`

- [ ] **modules** - Chapters within courses
  - `id` (UUID, PK), `course_id` (FK), `title`, `description`
  - `sequence_order`, `estimated_minutes`, `created_at`

- [ ] **lessons** - Individual learning sessions
  - `id` (UUID, PK), `module_id` (FK), `title`, `description`
  - `content_type`, `sequence_order`, `estimated_minutes`
  - `created_at`, `updated_at`

- [ ] **resources** - Atomic content pieces
  - `id` (UUID, PK), `lesson_id` (FK), `type` (text/video/audio/interactive)
  - `title`, `content` (JSONB or reference), `metadata` (JSONB)
  - `sequence_order`, `created_at`

- [ ] **prerequisites** - Content dependencies
  - `id` (UUID, PK), `item_type`, `item_id`, `prerequisite_type`, `prerequisite_id`
  - `is_required` (boolean), `created_at`

- [ ] **learning_paths** - Curated course sequences
  - `id` (UUID, PK), `title`, `description`, `target_outcome`
  - `difficulty_level`, `estimated_hours`, `created_by`, `created_at`

- [ ] **learning_path_items** - Path content
  - `id` (UUID, PK), `path_id` (FK), `item_type`, `item_id`
  - `sequence_order`, `is_optional`

**Files/Modules to Create:**

- [ ] `src/modules/curriculum/domain.service.ts` - Domain management
- [ ] `src/modules/curriculum/subject.service.ts` - Subject management
- [ ] `src/modules/curriculum/course.service.ts` - Course management
- [ ] `src/modules/curriculum/module.service.ts` - Module management
- [ ] `src/modules/curriculum/lesson.service.ts` - Lesson management
- [ ] `src/modules/curriculum/resource.service.ts` - Resource management
- [ ] `src/modules/curriculum/prerequisite.service.ts` - Prerequisite logic
- [ ] `src/modules/curriculum/learning-path.service.ts` - Path management
- [ ] `src/modules/curriculum/curriculum.repository.ts` - Data access
- [ ] `src/modules/curriculum/curriculum.controller.ts` - Endpoints
- [ ] `src/modules/curriculum/version.service.ts` - Versioning logic
- [ ] `src/graphql/resolvers/curriculum.resolver.ts` - GraphQL resolvers

**API Endpoints to Implement:**

- [ ] `GET /api/v1/domains` - List domains
- [ ] `GET /api/v1/domains/:id` - Get domain with subjects
- [ ] `GET /api/v1/subjects/:id` - Get subject with courses
- [ ] `GET /api/v1/courses/:id` - Get course with modules
- [ ] `GET /api/v1/modules/:id` - Get module with lessons
- [ ] `GET /api/v1/lessons/:id` - Get lesson with resources

- [ ] `GET /api/v1/learning-paths` - List learning paths
- [ ] `GET /api/v1/learning-paths/:id` - Get path details
- [ ] `GET /api/v1/learning-paths/:id/progress` - Get user progress on path

- [ ] `POST /api/v1/courses` - Create course (contributor)
- [ ] `PATCH /api/v1/courses/:id` - Update course
- [ ] `POST /api/v1/courses/:id/submit` - Submit for review

**Tests to Write:**

- [ ] `tests/modules/curriculum/course.service.test.ts` - Course tests
- [ ] `tests/modules/curriculum/prerequisite.test.ts` - Prerequisite tests
- [ ] `tests/modules/curriculum/learning-path.test.ts` - Path tests
- [ ] `tests/integration/curriculum-hierarchy.test.ts` - Hierarchy tests

---

#### E2: Content Storage & CDN

**Database Tables to Add:**

- [ ] **media_assets** - Media file metadata
  - `id` (UUID, PK), `original_filename`, `mime_type`, `size_bytes`
  - `storage_key`, `cdn_url`, `variants` (JSONB - different resolutions)
  - `uploaded_by` (FK), `created_at`

- [ ] **content_versions** - Content version history
  - `id` (UUID, PK), `content_type`, `content_id`, `version_number`
  - `data` (JSONB), `created_by`, `created_at`

**Files/Modules to Create:**

- [ ] `src/modules/storage/storage.service.ts` - File storage abstraction
- [ ] `src/modules/storage/s3.provider.ts` - S3 storage implementation
- [ ] `src/modules/storage/local.provider.ts` - Local storage for dev
- [ ] `src/modules/storage/media.service.ts` - Media processing
- [ ] `src/modules/storage/cdn.service.ts` - CDN URL generation
- [ ] `src/modules/storage/image.processor.ts` - Image resizing/optimization
- [ ] `src/modules/storage/video.processor.ts` - Video transcoding
- [ ] `src/modules/storage/upload.controller.ts` - Upload endpoints

**API Endpoints to Implement:**

- [ ] `POST /api/v1/uploads/image` - Upload image
  - Returns multiple resolution variants

- [ ] `POST /api/v1/uploads/video` - Upload video
  - Triggers async transcoding

- [ ] `POST /api/v1/uploads/document` - Upload document
- [ ] `GET /api/v1/uploads/:id` - Get upload metadata
- [ ] `DELETE /api/v1/uploads/:id` - Delete upload

**Tests to Write:**

- [ ] `tests/modules/storage/storage.service.test.ts` - Storage tests
- [ ] `tests/modules/storage/image.processor.test.ts` - Image processing tests
- [ ] `tests/integration/upload-flow.test.ts` - Upload flow tests

---

#### E3: Low-Bandwidth Core (Offline-First)

**Database Tables to Add:**

- [ ] **user_downloads** - Downloaded content tracking
  - `id` (UUID, PK), `user_id` (FK), `content_type`, `content_id`
  - `version`, `downloaded_at`, `last_accessed_at`, `size_bytes`

- [ ] **sync_queue** - Pending sync operations
  - `id` (UUID, PK), `user_id` (FK), `operation`, `payload` (JSONB)
  - `created_at`, `synced_at`, `attempts`, `status`

- [ ] **sync_conflicts** - Detected conflicts
  - `id` (UUID, PK), `user_id` (FK), `entity_type`, `entity_id`
  - `local_version` (JSONB), `server_version` (JSONB)
  - `resolution`, `resolved_at`, `created_at`

**Files/Modules to Create:**

- [ ] `src/modules/offline/sync.service.ts` - Sync coordination
- [ ] `src/modules/offline/conflict-resolver.ts` - Conflict resolution
- [ ] `src/modules/offline/download-manager.ts` - Download management
- [ ] `src/modules/offline/offline.controller.ts` - Offline endpoints
- [ ] `src/modules/offline/delta-sync.ts` - Delta synchronization
- [ ] `src/modules/offline/compression.ts` - Payload compression

**Mobile/PWA Files to Create:**

- [ ] `mobile/src/services/offline-storage.ts` - Local storage abstraction
- [ ] `mobile/src/services/sync-manager.ts` - Client-side sync
- [ ] `mobile/src/services/download-queue.ts` - Download queue
- [ ] `mobile/src/services/network-detector.ts` - Connection monitoring
- [ ] `mobile/src/db/schema.ts` - Local database schema (SQLite/WatermelonDB)

**API Endpoints to Implement:**

- [ ] `POST /api/v1/sync` - Sync local changes
  - Body: `{ lastSyncTimestamp, changes: [...] }`
  - Response: `{ serverChanges: [...], conflicts: [...] }`

- [ ] `GET /api/v1/sync/status` - Get sync status
- [ ] `POST /api/v1/sync/resolve-conflict` - Resolve conflict manually

- [ ] `GET /api/v1/offline/manifest/:contentType/:id` - Get download manifest
- [ ] `POST /api/v1/offline/download` - Request content download
  - Body: `{ items: [{ type, id }] }`
  - Returns download URLs and checksums

**Tests to Write:**

- [ ] `tests/modules/offline/sync.service.test.ts` - Sync tests
- [ ] `tests/modules/offline/conflict-resolver.test.ts` - Conflict tests
- [ ] `tests/modules/offline/delta-sync.test.ts` - Delta sync tests
- [ ] `tests/integration/offline-workflow.test.ts` - Offline workflow tests

---

### Group F: Content Authoring & Review

#### F1: Content Authoring Tools

**Database Tables to Add:**

- [ ] **content_drafts** - Work-in-progress content
  - `id` (UUID, PK), `author_id` (FK), `content_type`, `target_id` (nullable)
  - `data` (JSONB), `auto_saved_at`, `created_at`

- [ ] **assessment_items** - Quiz/checkpoint questions
  - `id` (UUID, PK), `lesson_id` (FK, nullable), `type` (mcq/short/essay)
  - `question` (JSONB), `answer_key` (JSONB), `metadata` (JSONB)
  - `created_by`, `created_at`

**Files/Modules to Create:**

- [ ] `src/modules/authoring/editor.service.ts` - Content editing logic
- [ ] `src/modules/authoring/draft.service.ts` - Draft management
- [ ] `src/modules/authoring/assessment-builder.service.ts` - Assessment creation
- [ ] `src/modules/authoring/authoring.controller.ts` - Authoring endpoints
- [ ] `src/modules/authoring/validators/content.validator.ts` - Content validation
- [ ] `src/modules/authoring/validators/accessibility.validator.ts` - A11y checks
- [ ] `src/modules/authoring/markdown.parser.ts` - Markdown processing
- [ ] `src/modules/authoring/media-embed.service.ts` - Media embedding

**API Endpoints to Implement:**

- [ ] `POST /api/v1/authoring/drafts` - Create draft
- [ ] `GET /api/v1/authoring/drafts` - List user's drafts
- [ ] `GET /api/v1/authoring/drafts/:id` - Get draft
- [ ] `PATCH /api/v1/authoring/drafts/:id` - Update draft (auto-save)
- [ ] `DELETE /api/v1/authoring/drafts/:id` - Delete draft
- [ ] `POST /api/v1/authoring/drafts/:id/publish` - Submit for review

- [ ] `POST /api/v1/authoring/lessons` - Create lesson
- [ ] `PATCH /api/v1/authoring/lessons/:id` - Update lesson
- [ ] `POST /api/v1/authoring/lessons/:id/resources` - Add resource
- [ ] `POST /api/v1/authoring/lessons/:id/assessments` - Add assessment item

- [ ] `POST /api/v1/authoring/validate` - Validate content
  - Returns accessibility issues, missing requirements

**Tests to Write:**

- [ ] `tests/modules/authoring/editor.service.test.ts` - Editor tests
- [ ] `tests/modules/authoring/assessment-builder.test.ts` - Assessment tests
- [ ] `tests/modules/authoring/accessibility.test.ts` - A11y validation tests
- [ ] `tests/integration/authoring-workflow.test.ts` - Workflow tests

---

#### F2: Content Review Workflow

**Database Tables to Add:**

- [ ] **review_submissions** - Content submitted for review
  - `id` (UUID, PK), `content_type`, `content_id`, `version`
  - `submitted_by` (FK), `submitted_at`, `status` (pending/in_review/approved/rejected)
  - `priority`, `notes`

- [ ] **reviews** - Individual reviews
  - `id` (UUID, PK), `submission_id` (FK), `reviewer_id` (FK)
  - `verdict` (approve/reject/changes_requested), `feedback` (JSONB)
  - `created_at`

- [ ] **plagiarism_checks** - Plagiarism detection results
  - `id` (UUID, PK), `submission_id` (FK), `similarity_score`
  - `matches` (JSONB), `checked_at`

**Files/Modules to Create:**

- [ ] `src/modules/review/submission.service.ts` - Submission handling
- [ ] `src/modules/review/review.service.ts` - Review management
- [ ] `src/modules/review/assignment.service.ts` - Reviewer assignment
- [ ] `src/modules/review/plagiarism.service.ts` - Plagiarism detection
- [ ] `src/modules/review/review.controller.ts` - Review endpoints
- [ ] `src/modules/review/rubric.service.ts` - Review rubric management

**API Endpoints to Implement:**

- [ ] `GET /api/v1/reviews/queue` - Get review queue (reviewer)
- [ ] `GET /api/v1/reviews/submissions` - Get user's submissions (author)
- [ ] `GET /api/v1/reviews/submissions/:id` - Get submission details

- [ ] `POST /api/v1/reviews/submissions/:id/claim` - Claim for review
- [ ] `POST /api/v1/reviews/submissions/:id/review` - Submit review
  - Body: `{ verdict, feedback, detailedScores }`

- [ ] `POST /api/v1/reviews/submissions/:id/approve` - Final approval
- [ ] `POST /api/v1/reviews/submissions/:id/reject` - Reject with reason

**Tests to Write:**

- [ ] `tests/modules/review/submission.service.test.ts` - Submission tests
- [ ] `tests/modules/review/review.service.test.ts` - Review tests
- [ ] `tests/modules/review/assignment.test.ts` - Assignment tests
- [ ] `tests/integration/review-workflow.test.ts` - Workflow tests

---

#### F3: Multi-Format Support

**Files/Modules to Create:**

- [ ] `src/modules/content/formats/text.handler.ts` - Text/markdown handling
- [ ] `src/modules/content/formats/video.handler.ts` - Video content handling
- [ ] `src/modules/content/formats/audio.handler.ts` - Audio content handling
- [ ] `src/modules/content/formats/interactive.handler.ts` - Interactive content
- [ ] `src/modules/content/formats/code.handler.ts` - Code sandbox content
- [ ] `src/modules/content/formats/document.handler.ts` - PDF/EPUB handling
- [ ] `src/modules/content/transcription.service.ts` - Video/audio transcription
- [ ] `src/modules/content/format-converter.ts` - Format conversion

**API Endpoints to Implement:**

- [ ] `POST /api/v1/content/transcode` - Request format conversion
- [ ] `GET /api/v1/content/:id/formats` - Get available formats
- [ ] `POST /api/v1/content/:id/transcript` - Generate/upload transcript
- [ ] `GET /api/v1/content/:id/text-version` - Get text-only version

**Tests to Write:**

- [ ] `tests/modules/content/formats/video.test.ts` - Video handling tests
- [ ] `tests/modules/content/transcription.test.ts` - Transcription tests
- [ ] `tests/modules/content/format-converter.test.ts` - Conversion tests

---

#### F4: Accessibility Compliance

**Files/Modules to Create:**

- [ ] `src/modules/accessibility/checker.service.ts` - A11y checking
- [ ] `src/modules/accessibility/alt-text.service.ts` - Alt text management
- [ ] `src/modules/accessibility/caption.service.ts` - Caption management
- [ ] `src/modules/accessibility/color-contrast.ts` - Contrast checking
- [ ] `src/modules/accessibility/report.service.ts` - A11y report generation
- [ ] `src/modules/accessibility/wcag-rules.ts` - WCAG 2.1 AA rules

**API Endpoints to Implement:**

- [ ] `POST /api/v1/accessibility/check` - Check content accessibility
  - Body: `{ contentType, contentId }` or raw content
  - Returns: issues with severity and suggestions

- [ ] `GET /api/v1/accessibility/report/:contentId` - Get A11y report
- [ ] `POST /api/v1/accessibility/alt-text` - Generate alt text suggestion (AI)
- [ ] `POST /api/v1/accessibility/captions` - Generate caption suggestion

**Tests to Write:**

- [ ] `tests/modules/accessibility/checker.test.ts` - Checker tests
- [ ] `tests/modules/accessibility/wcag-rules.test.ts` - WCAG rule tests
- [ ] `tests/integration/accessibility-workflow.test.ts` - Workflow tests

---

### Group G: Checkpoints & Text-First Mode

#### G1: Checkpoint Types

**Database Tables to Add:**

- [ ] **checkpoints** - Checkpoint definitions
  - `id` (UUID, PK), `module_id` (FK), `title`, `description`
  - `type` (knowledge/practical/oral), `format` (mcq/short/essay/project/oral)
  - `time_limit_minutes`, `passing_score`, `max_attempts`
  - `settings` (JSONB), `created_at`

- [ ] **checkpoint_questions** - Questions in checkpoints
  - `id` (UUID, PK), `checkpoint_id` (FK), `question_type`
  - `question` (JSONB), `answer_key` (JSONB), `points`
  - `difficulty`, `tags` (JSONB), `sequence_order`

- [ ] **question_distractors** - MCQ distractors
  - `id` (UUID, PK), `question_id` (FK), `text`, `is_correct`
  - `feedback`, `sequence_order`

**Files/Modules to Create:**

- [ ] `src/modules/checkpoints/checkpoint.service.ts` - Checkpoint management
- [ ] `src/modules/checkpoints/question.service.ts` - Question management
- [ ] `src/modules/checkpoints/types/mcq.handler.ts` - MCQ handling
- [ ] `src/modules/checkpoints/types/short-answer.handler.ts` - Short answer
- [ ] `src/modules/checkpoints/types/essay.handler.ts` - Essay handling
- [ ] `src/modules/checkpoints/types/practical.handler.ts` - Practical submission
- [ ] `src/modules/checkpoints/types/oral.handler.ts` - Oral assessment
- [ ] `src/modules/checkpoints/checkpoint.controller.ts` - Endpoints

**API Endpoints to Implement:**

- [ ] `GET /api/v1/checkpoints/:id` - Get checkpoint details
- [ ] `GET /api/v1/modules/:id/checkpoints` - Get module checkpoints

- [ ] `POST /api/v1/checkpoints` - Create checkpoint (contributor)
- [ ] `PATCH /api/v1/checkpoints/:id` - Update checkpoint
- [ ] `POST /api/v1/checkpoints/:id/questions` - Add question
- [ ] `PATCH /api/v1/checkpoints/:id/questions/:qId` - Update question
- [ ] `DELETE /api/v1/checkpoints/:id/questions/:qId` - Remove question

**Tests to Write:**

- [ ] `tests/modules/checkpoints/checkpoint.service.test.ts` - Checkpoint tests
- [ ] `tests/modules/checkpoints/question.test.ts` - Question tests
- [ ] `tests/modules/checkpoints/types/mcq.test.ts` - MCQ handler tests
- [ ] `tests/integration/checkpoint-types.test.ts` - Type integration tests

---

#### G2: Checkpoint Execution Engine

**Database Tables to Add:**

- [ ] **checkpoint_sessions** - Active checkpoint attempts
  - `id` (UUID, PK), `checkpoint_id` (FK), `user_id` (FK)
  - `started_at`, `submitted_at`, `time_remaining_seconds`
  - `status` (in_progress/submitted/graded/abandoned)
  - `attempt_number`, `integrity_flags` (JSONB)

- [ ] **checkpoint_responses** - User answers
  - `id` (UUID, PK), `session_id` (FK), `question_id` (FK)
  - `response` (JSONB), `time_spent_seconds`
  - `created_at`, `updated_at`

- [ ] **checkpoint_results** - Final results
  - `id` (UUID, PK), `session_id` (FK), `score`, `max_score`
  - `passed` (boolean), `tier` (pass/merit/distinction)
  - `feedback` (JSONB), `graded_at`, `graded_by` (FK, nullable)

**Files/Modules to Create:**

- [ ] `src/modules/checkpoints/execution/session.service.ts` - Session management
- [ ] `src/modules/checkpoints/execution/timer.service.ts` - Timer handling
- [ ] `src/modules/checkpoints/execution/response.service.ts` - Response capture
- [ ] `src/modules/checkpoints/execution/integrity.service.ts` - Integrity checks
- [ ] `src/modules/checkpoints/execution/offline-handler.ts` - Offline support
- [ ] `src/modules/checkpoints/execution/execution.controller.ts` - Endpoints

**API Endpoints to Implement:**

- [ ] `POST /api/v1/checkpoints/:id/start` - Start checkpoint session
  - Returns: session, questions (randomized if applicable)

- [ ] `POST /api/v1/checkpoints/sessions/:sessionId/respond` - Submit response
  - Body: `{ questionId, response }`

- [ ] `POST /api/v1/checkpoints/sessions/:sessionId/submit` - Submit checkpoint
- [ ] `GET /api/v1/checkpoints/sessions/:sessionId` - Get session status
- [ ] `GET /api/v1/checkpoints/sessions/:sessionId/results` - Get results

- [ ] `POST /api/v1/checkpoints/sessions/sync` - Sync offline responses
  - Body: `{ sessionId, responses, clientTimestamps }`

**Tests to Write:**

- [ ] `tests/modules/checkpoints/execution/session.test.ts` - Session tests
- [ ] `tests/modules/checkpoints/execution/timer.test.ts` - Timer tests
- [ ] `tests/modules/checkpoints/execution/offline.test.ts` - Offline tests
- [ ] `tests/integration/checkpoint-execution.test.ts` - Execution flow tests

---

#### G3: Automated Scoring

**Files/Modules to Create:**

- [ ] `src/modules/checkpoints/scoring/scoring.service.ts` - Scoring orchestration
- [ ] `src/modules/checkpoints/scoring/mcq.scorer.ts` - MCQ scoring
- [ ] `src/modules/checkpoints/scoring/short-answer.scorer.ts` - Short answer
- [ ] `src/modules/checkpoints/scoring/partial-credit.ts` - Partial credit logic
- [ ] `src/modules/checkpoints/scoring/feedback-generator.ts` - Feedback generation
- [ ] `src/modules/checkpoints/scoring/ai-scorer.ts` - AI-assisted scoring

**Services/ML:**

- [ ] `services/ml/scoring/text_similarity.py` - Text similarity scoring
- [ ] `services/ml/scoring/essay_scorer.py` - Essay scoring model
- [ ] `services/ml/scoring/api.py` - Scoring API endpoints

**API Endpoints to Implement:**

- [ ] `POST /api/v1/scoring/auto-score` - Auto-score submission
  - Internal use by execution engine

- [ ] `POST /api/v1/scoring/mentor-review` - Submit mentor review score
  - Body: `{ sessionId, questionScores, feedback }`

- [ ] `GET /api/v1/scoring/rubrics/:checkpointId` - Get scoring rubric

**Tests to Write:**

- [ ] `tests/modules/checkpoints/scoring/mcq.test.ts` - MCQ scoring tests
- [ ] `tests/modules/checkpoints/scoring/partial-credit.test.ts` - Partial credit
- [ ] `tests/modules/checkpoints/scoring/feedback.test.ts` - Feedback tests
- [ ] `tests/integration/scoring-flow.test.ts` - Scoring flow tests

---

#### G4: Text-First Content Mode

**Files/Modules to Create:**

- [ ] `src/modules/content/text-mode.service.ts` - Text mode content
- [ ] `src/modules/content/bandwidth-detector.ts` - Bandwidth detection
- [ ] `src/modules/content/content-optimizer.ts` - Content optimization
- [ ] `src/middleware/bandwidth-aware.ts` - Bandwidth-aware middleware

**Mobile Files:**

- [ ] `mobile/src/services/text-mode.ts` - Text mode toggle
- [ ] `mobile/src/services/data-usage-tracker.ts` - Data usage tracking
- [ ] `mobile/src/components/TextModeToggle.tsx` - UI toggle

**API Endpoints to Implement:**

- [ ] `GET /api/v1/content/:id/text-only` - Get text-only version
- [ ] `GET /api/v1/content/:id/bandwidth-estimate` - Get bandwidth estimate
- [ ] `POST /api/v1/users/me/preferences/text-mode` - Enable text mode

**Tests to Write:**

- [ ] `tests/modules/content/text-mode.test.ts` - Text mode tests
- [ ] `tests/modules/content/optimizer.test.ts` - Optimizer tests
- [ ] `tests/integration/low-bandwidth.test.ts` - Low bandwidth tests

---

### Group H: Learning Paths, Scheduling & PWA

#### H1: Learning Path Engine

**Database Tables to Add:**

- [ ] **user_progress** - User learning progress
  - `id` (UUID, PK), `user_id` (FK), `content_type`, `content_id`
  - `status` (not_started/in_progress/completed), `progress_percent`
  - `started_at`, `completed_at`, `last_accessed_at`

- [ ] **user_path_enrollments** - User path enrollments
  - `id` (UUID, PK), `user_id` (FK), `path_id` (FK)
  - `enrolled_at`, `target_completion_date`, `completed_at`

- [ ] **adaptive_recommendations** - AI recommendations
  - `id` (UUID, PK), `user_id` (FK), `content_type`, `content_id`
  - `reason`, `score`, `created_at`, `dismissed_at`, `accepted_at`

**Files/Modules to Create:**

- [ ] `src/modules/learning/progress.service.ts` - Progress tracking
- [ ] `src/modules/learning/path-engine.service.ts` - Path navigation
- [ ] `src/modules/learning/prerequisite-checker.ts` - Prerequisite validation
- [ ] `src/modules/learning/unlock.service.ts` - Content unlocking
- [ ] `src/modules/learning/recommendation.service.ts` - Recommendations
- [ ] `src/modules/learning/adaptive.service.ts` - Adaptive sequencing
- [ ] `src/modules/learning/learning.controller.ts` - Endpoints

**API Endpoints to Implement:**

- [ ] `GET /api/v1/learning/progress` - Get overall progress
- [ ] `GET /api/v1/learning/progress/:contentType/:id` - Get specific progress
- [ ] `POST /api/v1/learning/progress/:contentType/:id` - Update progress

- [ ] `POST /api/v1/learning/paths/:id/enroll` - Enroll in path
- [ ] `GET /api/v1/learning/paths/:id/progress` - Get path progress
- [ ] `GET /api/v1/learning/paths/:id/next` - Get next recommended content

- [ ] `GET /api/v1/learning/recommendations` - Get personalized recommendations
- [ ] `POST /api/v1/learning/recommendations/:id/accept` - Accept recommendation
- [ ] `POST /api/v1/learning/recommendations/:id/dismiss` - Dismiss

- [ ] `POST /api/v1/learning/prerequisites/check` - Check prerequisites
  - Body: `{ contentType, contentId }`
  - Returns: `{ canAccess, missingPrerequisites }`

**Tests to Write:**

- [ ] `tests/modules/learning/progress.service.test.ts` - Progress tests
- [ ] `tests/modules/learning/path-engine.test.ts` - Path engine tests
- [ ] `tests/modules/learning/prerequisite.test.ts` - Prerequisite tests
- [ ] `tests/modules/learning/recommendation.test.ts` - Recommendation tests
- [ ] `tests/integration/learning-flow.test.ts` - Learning flow tests

---

#### H2: Checkpoint Scheduling

**Database Tables to Add:**

- [ ] **checkpoint_schedules** - Scheduled checkpoints
  - `id` (UUID, PK), `user_id` (FK), `checkpoint_id` (FK)
  - `scheduled_for`, `reminder_sent_at`, `trigger_type` (progress/time/spaced)
  - `status` (pending/reminded/completed/overdue)

- [ ] **spaced_repetition** - Spaced repetition data
  - `id` (UUID, PK), `user_id` (FK), `item_type`, `item_id`
  - `ease_factor`, `interval_days`, `next_review_at`
  - `review_count`, `last_reviewed_at`

**Files/Modules to Create:**

- [ ] `src/modules/scheduling/checkpoint-scheduler.service.ts` - Scheduling logic
- [ ] `src/modules/scheduling/spaced-repetition.service.ts` - SR algorithm
- [ ] `src/modules/scheduling/deadline.service.ts` - Deadline management
- [ ] `src/modules/scheduling/reminder.service.ts` - Reminder generation
- [ ] `src/modules/scheduling/scheduling.controller.ts` - Endpoints
- [ ] `src/jobs/checkpoint-reminder.job.ts` - Reminder job
- [ ] `src/jobs/overdue-checker.job.ts` - Overdue detection job

**API Endpoints to Implement:**

- [ ] `GET /api/v1/schedules` - Get user's scheduled checkpoints
- [ ] `POST /api/v1/schedules` - Schedule a checkpoint
  - Body: `{ checkpointId, scheduledFor }`

- [ ] `PATCH /api/v1/schedules/:id` - Reschedule
- [ ] `DELETE /api/v1/schedules/:id` - Cancel schedule

- [ ] `GET /api/v1/spaced-repetition` - Get items due for review
- [ ] `POST /api/v1/spaced-repetition/review` - Record review result
  - Body: `{ itemType, itemId, quality (0-5) }`

**Tests to Write:**

- [ ] `tests/modules/scheduling/scheduler.test.ts` - Scheduler tests
- [ ] `tests/modules/scheduling/spaced-repetition.test.ts` - SR algorithm tests
- [ ] `tests/modules/scheduling/deadline.test.ts` - Deadline tests
- [ ] `tests/integration/scheduling-flow.test.ts` - Scheduling flow tests

---

#### H3: Progression Logic

**Files/Modules to Create:**

- [ ] `src/modules/progression/progression.service.ts` - Progression logic
- [ ] `src/modules/progression/unlock-rules.ts` - Content unlock rules
- [ ] `src/modules/progression/retry-policy.service.ts` - Retry handling
- [ ] `src/modules/progression/remediation.service.ts` - Remediation paths
- [ ] `src/modules/progression/progression.controller.ts` - Endpoints

**API Endpoints to Implement:**

- [ ] `GET /api/v1/progression/status` - Get progression status
- [ ] `GET /api/v1/progression/:contentType/:id/unlock-status` - Check unlock
- [ ] `POST /api/v1/progression/checkpoints/:id/retry` - Request retry
  - Returns: `{ allowed, nextAttemptAt, attemptsRemaining }`

- [ ] `GET /api/v1/progression/remediation` - Get remediation recommendations
  - Query: `{ checkpointId }` for failed checkpoint

**Tests to Write:**

- [ ] `tests/modules/progression/progression.service.test.ts` - Progression tests
- [ ] `tests/modules/progression/unlock-rules.test.ts` - Unlock rule tests
- [ ] `tests/modules/progression/retry-policy.test.ts` - Retry policy tests
- [ ] `tests/integration/progression-flow.test.ts` - Progression flow tests

---

#### H4: PWA Implementation

**Files/Modules to Create:**

- [ ] `web/public/manifest.json` - PWA manifest
- [ ] `web/public/sw.js` - Service worker
- [ ] `web/src/service-worker/index.ts` - SW source
- [ ] `web/src/service-worker/cache-strategies.ts` - Caching strategies
- [ ] `web/src/service-worker/sync-handler.ts` - Background sync
- [ ] `web/src/service-worker/push-handler.ts` - Push notifications
- [ ] `web/src/hooks/useOffline.ts` - Offline state hook
- [ ] `web/src/hooks/usePWAInstall.ts` - Install prompt hook
- [ ] `web/src/components/OfflineIndicator.tsx` - Offline UI
- [ ] `web/src/components/InstallPrompt.tsx` - Install prompt UI
- [ ] `web/src/utils/cache-manager.ts` - Cache management

**Service Worker Strategies:**

```javascript
// Cache strategies to implement:
- [ ] NetworkFirst for API calls
- [ ] CacheFirst for static assets
- [ ] StaleWhileRevalidate for user data
- [ ] BackgroundSync for offline actions
```

**Tests to Write:**

- [ ] `tests/web/service-worker/cache.test.ts` - Cache strategy tests
- [ ] `tests/web/service-worker/sync.test.ts` - Background sync tests
- [ ] `tests/web/hooks/useOffline.test.ts` - Offline hook tests
- [ ] `tests/e2e/pwa-install.test.ts` - PWA installation tests
- [ ] `tests/e2e/offline-functionality.test.ts` - Offline functionality tests

---

## Testing Requirements Summary

### Unit Test Coverage Targets

| Module | Target Coverage |
|--------|-----------------|
| Auth | 90% |
| Users | 85% |
| Communities | 85% |
| RBAC | 90% |
| Trust | 85% |
| Notifications | 80% |
| Curriculum | 85% |
| Checkpoints | 90% |
| Offline/Sync | 90% |

### Integration Test Scenarios

- [ ] Complete user registration and onboarding flow
- [ ] Community creation and member invitation flow
- [ ] Role assignment and permission enforcement
- [ ] Content creation and review workflow
- [ ] Checkpoint execution and scoring flow
- [ ] Offline sync with conflict resolution
- [ ] Learning path progression with prerequisites
- [ ] PWA installation and offline access

### Performance Test Requirements

- [ ] Auth endpoints: <2s on 3G
- [ ] Content loading: <5s on 3G
- [ ] Checkpoint start: <3s on 3G
- [ ] Sync operations: <30s for daily content
- [ ] PWA first load: <5s on 3G

---

## Database Migration Order

1. `001_initial_schema.sql` - Users, communities, roles
2. `002_seed_roles.sql` - Default platform roles
3. `003_auth_tables.sql` - Sessions, MFA, tokens
4. `004_trust_tables.sql` - Trust scores, vouching
5. `005_audit_tables.sql` - Audit logging
6. `006_notification_tables.sql` - Notifications
7. `007_curriculum_tables.sql` - Content hierarchy
8. `008_storage_tables.sql` - Media assets
9. `009_offline_tables.sql` - Sync, downloads
10. `010_authoring_tables.sql` - Drafts, reviews
11. `011_checkpoint_tables.sql` - Checkpoints, sessions
12. `012_progress_tables.sql` - Learning progress
13. `013_scheduling_tables.sql` - Schedules, spaced rep

---

## Notes for Agents

1. **Start with database migrations** - Ensure schema is in place before implementing services
2. **Follow test-first approach** - Write tests before implementation where possible
3. **Respect spec requirements** - All SHALL/MUST requirements from specs are mandatory
4. **Check dependencies** - Verify dependent tasks are complete before starting
5. **Use existing patterns** - Follow established patterns from earlier implementations
6. **Document APIs** - Keep OpenAPI spec updated with new endpoints
7. **Consider offline** - All content-related features must work offline
8. **Accessibility first** - All UI components must be accessible

---

*Last updated: Generated from openspec/specs/*
