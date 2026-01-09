# EduConnect Platform - Phase 3 & Phase 4 Implementation Tasks

This document contains detailed implementation tasks for Groups I through Q (Phase 3 and Phase 4). Each feature includes specific files/modules to create, database tables, API endpoints, ML models/services, and tests to write.

**Prerequisites**: Phase 1 (Groups A-D) and Phase 2 (Groups E-H) must be completed.

---

## Phase 3: Intelligence & Engagement

Phase 3 adds ML/AI features and engagement mechanics. Builds on the content and learning infrastructure from Phase 2.

---

## Group I: Analytics Pipeline, Points Core, Basic Matching

*Can start immediately after Phase 2 completion. Features in this group can be developed in parallel.*

---

### I1: Analytics Data Collection

**Complexity**: Medium
**Spec Reference**: `openspec/specs/analytics/spec.md`

#### Files/Modules to Create

- [ ] `src/services/analytics/event-collector.service.ts` - Core event collection service
- [ ] `src/services/analytics/event-processor.service.ts` - Event processing and enrichment
- [ ] `src/services/analytics/consent-manager.service.ts` - User consent management
- [ ] `src/services/analytics/data-pipeline.service.ts` - Data pipeline orchestration
- [ ] `src/services/analytics/privacy-filter.service.ts` - PII scrubbing and anonymization
- [ ] `src/models/analytics/event.model.ts` - Event data models
- [ ] `src/models/analytics/consent.model.ts` - Consent data models
- [ ] `src/workers/analytics/event-ingestion.worker.ts` - Background event ingestion worker
- [ ] `src/workers/analytics/data-aggregation.worker.ts` - Batch aggregation worker
- [ ] `src/middleware/analytics/tracking.middleware.ts` - Request tracking middleware
- [ ] `src/utils/analytics/event-schema-validator.ts` - Event schema validation

#### Database Tables

- [ ] `analytics_events` - Raw event storage
  - `id`, `event_type`, `user_id`, `session_id`, `community_id`, `timestamp`, `payload`, `context`, `created_at`
- [ ] `analytics_consent` - User consent records
  - `id`, `user_id`, `consent_type`, `granted`, `granted_at`, `revoked_at`, `ip_address`, `user_agent`
- [ ] `analytics_sessions` - Session tracking
  - `id`, `user_id`, `session_start`, `session_end`, `device_info`, `geo_location`, `events_count`
- [ ] `analytics_aggregates_daily` - Pre-computed daily aggregates
  - `id`, `date`, `metric_type`, `dimension`, `dimension_value`, `count`, `sum`, `avg`
- [ ] `analytics_event_types` - Event type registry
  - `id`, `name`, `category`, `schema`, `retention_days`, `pii_fields`

#### API Endpoints

- [ ] `POST /api/v1/analytics/events` - Submit analytics events (batch)
- [ ] `POST /api/v1/analytics/events/single` - Submit single event
- [ ] `GET /api/v1/analytics/consent` - Get user consent status
- [ ] `PUT /api/v1/analytics/consent` - Update consent preferences
- [ ] `DELETE /api/v1/analytics/consent` - Revoke all consent
- [ ] `GET /api/v1/analytics/data-export` - Request data export (GDPR)
- [ ] `DELETE /api/v1/analytics/data` - Request data deletion (GDPR)

#### ML Models/Services

- [ ] Event anomaly detection model for fraud prevention
- [ ] User behavior clustering for segmentation
- [ ] Real-time event validation pipeline

#### Tests to Write

- [ ] `tests/unit/analytics/event-collector.test.ts` - Event collection unit tests
- [ ] `tests/unit/analytics/consent-manager.test.ts` - Consent management tests
- [ ] `tests/unit/analytics/privacy-filter.test.ts` - PII scrubbing tests
- [ ] `tests/integration/analytics/event-pipeline.test.ts` - End-to-end pipeline tests
- [ ] `tests/integration/analytics/consent-flow.test.ts` - Consent workflow tests
- [ ] `tests/load/analytics/event-ingestion.test.ts` - Load testing for high-volume events
- [ ] `tests/e2e/analytics/gdpr-compliance.test.ts` - GDPR compliance e2e tests

---

### I2: Points System Core

**Complexity**: Medium
**Spec Reference**: `openspec/specs/incentives/spec.md`

#### Files/Modules to Create

- [ ] `src/services/incentives/points.service.ts` - Core points management
- [ ] `src/services/incentives/points-calculator.service.ts` - Points calculation logic
- [ ] `src/services/incentives/points-ledger.service.ts` - Immutable ledger management
- [ ] `src/services/incentives/earning-rules.service.ts` - Point earning rules engine
- [ ] `src/models/incentives/points.model.ts` - Points data models
- [ ] `src/models/incentives/earning-rules.model.ts` - Earning rules models
- [ ] `src/workers/incentives/points-processor.worker.ts` - Async points processing
- [ ] `src/events/incentives/points.events.ts` - Points-related event definitions
- [ ] `src/validators/incentives/points.validator.ts` - Points transaction validation
- [ ] `src/graphql/resolvers/incentives/points.resolver.ts` - GraphQL resolvers

#### Database Tables

- [ ] `point_balances` - Current point balances
  - `id`, `user_id`, `point_type` (LP/MP/CP), `balance`, `lifetime_earned`, `updated_at`
- [ ] `point_transactions` - Immutable transaction ledger
  - `id`, `user_id`, `point_type`, `amount`, `transaction_type`, `source_type`, `source_id`, `description`, `created_at`
- [ ] `earning_rules` - Configurable earning rules
  - `id`, `activity_type`, `point_type`, `base_amount`, `multipliers`, `max_per_day`, `community_id`, `active`, `created_at`
- [ ] `point_multipliers` - Active multipliers/boosts
  - `id`, `user_id`, `multiplier`, `point_type`, `reason`, `expires_at`, `created_at`
- [ ] `daily_earning_caps` - Daily earning limits tracking
  - `id`, `user_id`, `date`, `activity_type`, `earned_count`, `cap_reached`

#### API Endpoints

- [ ] `GET /api/v1/points/balance` - Get user's point balances
- [ ] `GET /api/v1/points/history` - Get transaction history with pagination
- [ ] `GET /api/v1/points/earning-rules` - Get active earning rules
- [ ] `POST /api/v1/points/award` - Award points (internal/admin)
- [ ] `GET /api/v1/points/leaderboard` - Get points leaderboard
- [ ] `GET /api/v1/points/stats` - Get earning statistics
- [ ] `GET /api/v1/points/multipliers` - Get active multipliers

#### ML Models/Services

- [ ] Fraud detection for point gaming prevention
- [ ] Optimal earning rate recommendation engine
- [ ] Point velocity anomaly detection

#### Tests to Write

- [ ] `tests/unit/incentives/points-calculator.test.ts` - Calculation logic tests
- [ ] `tests/unit/incentives/earning-rules.test.ts` - Rules engine tests
- [ ] `tests/unit/incentives/points-ledger.test.ts` - Ledger immutability tests
- [ ] `tests/integration/incentives/points-flow.test.ts` - Full points workflow
- [ ] `tests/integration/incentives/concurrent-transactions.test.ts` - Concurrency tests
- [ ] `tests/security/incentives/points-manipulation.test.ts` - Security tests
- [ ] `tests/e2e/incentives/points-journey.test.ts` - User journey tests

---

### I3: Basic Matching Algorithm

**Complexity**: High
**Spec Reference**: `openspec/specs/matching/spec.md`

#### Files/Modules to Create

- [ ] `src/services/matching/matching-engine.service.ts` - Core matching engine
- [ ] `src/services/matching/compatibility-scorer.service.ts` - Compatibility score calculation
- [ ] `src/services/matching/availability-matcher.service.ts` - Schedule/availability matching
- [ ] `src/services/matching/capacity-manager.service.ts` - Mentor capacity management
- [ ] `src/services/matching/match-ranker.service.ts` - Match ranking and sorting
- [ ] `src/models/matching/match.model.ts` - Match data models
- [ ] `src/models/matching/compatibility-profile.model.ts` - Compatibility profile models
- [ ] `src/algorithms/matching/weighted-scorer.ts` - Weighted scoring algorithm
- [ ] `src/algorithms/matching/timezone-overlap.ts` - Timezone overlap calculator
- [ ] `src/workers/matching/match-generator.worker.ts` - Background match generation
- [ ] `src/cache/matching/compatibility-cache.ts` - Compatibility score caching

#### Database Tables

- [ ] `mentor_profiles` - Extended mentor information
  - `id`, `user_id`, `subjects`, `expertise_levels`, `teaching_style`, `max_mentees`, `current_mentees`, `availability_json`, `timezone`, `languages`, `success_rate`
- [ ] `learner_preferences` - Learner matching preferences
  - `id`, `user_id`, `subject_id`, `learning_style`, `preferred_pace`, `availability_json`, `timezone`, `language_preference`, `goals`
- [ ] `compatibility_scores` - Cached compatibility scores
  - `id`, `learner_id`, `mentor_id`, `subject_id`, `overall_score`, `dimension_scores`, `calculated_at`, `expires_at`
- [ ] `match_requests` - Pending match requests
  - `id`, `learner_id`, `subject_id`, `status`, `preferences`, `created_at`, `expires_at`
- [ ] `match_recommendations` - Generated recommendations
  - `id`, `request_id`, `mentor_id`, `rank`, `score`, `score_breakdown`, `created_at`

#### API Endpoints

- [ ] `POST /api/v1/matching/request` - Create match request
- [ ] `GET /api/v1/matching/recommendations` - Get mentor recommendations
- [ ] `GET /api/v1/matching/compatibility/:mentorId` - Get compatibility score
- [ ] `PUT /api/v1/matching/preferences` - Update matching preferences
- [ ] `GET /api/v1/matching/availability/:mentorId` - Get mentor availability
- [ ] `POST /api/v1/matching/calculate` - Trigger compatibility calculation
- [ ] `GET /api/v1/mentors/capacity` - Get mentor capacity status

#### ML Models/Services

- [ ] Compatibility prediction model (collaborative filtering)
- [ ] Learning style inference from behavior
- [ ] Optimal matching weight tuning

#### Tests to Write

- [ ] `tests/unit/matching/compatibility-scorer.test.ts` - Scoring algorithm tests
- [ ] `tests/unit/matching/availability-matcher.test.ts` - Availability logic tests
- [ ] `tests/unit/matching/weighted-scorer.test.ts` - Weight algorithm tests
- [ ] `tests/integration/matching/match-generation.test.ts` - Full matching flow
- [ ] `tests/integration/matching/capacity-limits.test.ts` - Capacity enforcement
- [ ] `tests/performance/matching/large-pool.test.ts` - Performance with large user pool
- [ ] `tests/e2e/matching/mentor-discovery.test.ts` - E2E mentor discovery

---

## Group J: Badges, Learner Analytics, Match Flow, Push Notifications

*Requires Group I completion. Features in this group can be developed in parallel.*

---

### J1: Achievement & Badge System

**Complexity**: Medium
**Spec Reference**: `openspec/specs/incentives/spec.md`

#### Files/Modules to Create

- [ ] `src/services/incentives/achievements.service.ts` - Achievement management
- [ ] `src/services/incentives/badge-engine.service.ts` - Badge unlock logic
- [ ] `src/services/incentives/progress-tracker.service.ts` - Achievement progress tracking
- [ ] `src/services/incentives/achievement-notifier.service.ts` - Unlock notifications
- [ ] `src/models/incentives/achievement.model.ts` - Achievement data models
- [ ] `src/models/incentives/badge.model.ts` - Badge data models
- [ ] `src/workers/incentives/achievement-processor.worker.ts` - Background processing
- [ ] `src/events/incentives/achievement.events.ts` - Achievement events
- [ ] `src/validators/incentives/badge-criteria.validator.ts` - Criteria validation
- [ ] `src/utils/incentives/badge-renderer.ts` - Badge image/SVG generation

#### Database Tables

- [ ] `achievements` - Achievement definitions
  - `id`, `name`, `description`, `category`, `tier`, `icon_url`, `criteria_type`, `criteria_config`, `points_reward`, `active`
- [ ] `user_achievements` - User earned achievements
  - `id`, `user_id`, `achievement_id`, `earned_at`, `progress_snapshot`, `featured`
- [ ] `achievement_progress` - In-progress achievement tracking
  - `id`, `user_id`, `achievement_id`, `current_value`, `target_value`, `last_updated`
- [ ] `badges` - Badge definitions (display items)
  - `id`, `name`, `tier`, `category`, `image_url`, `verification_code`, `expires_after_days`
- [ ] `user_badges` - User badge collection
  - `id`, `user_id`, `badge_id`, `achievement_id`, `earned_at`, `expires_at`, `featured_order`

#### API Endpoints

- [ ] `GET /api/v1/achievements` - List all achievements
- [ ] `GET /api/v1/achievements/user/:userId` - Get user's achievements
- [ ] `GET /api/v1/achievements/progress` - Get achievement progress
- [ ] `GET /api/v1/badges/user/:userId` - Get user's badges
- [ ] `PUT /api/v1/badges/featured` - Update featured badges
- [ ] `GET /api/v1/badges/verify/:code` - Verify badge authenticity
- [ ] `GET /api/v1/achievements/categories` - Get achievement categories
- [ ] `GET /api/v1/achievements/recent` - Get recently unlocked (community)

#### ML Models/Services

- [ ] Achievement recommendation engine
- [ ] Near-completion prediction for engagement nudges
- [ ] Achievement difficulty calibration

#### Tests to Write

- [ ] `tests/unit/incentives/badge-engine.test.ts` - Badge unlock logic tests
- [ ] `tests/unit/incentives/progress-tracker.test.ts` - Progress tracking tests
- [ ] `tests/unit/incentives/badge-renderer.test.ts` - Rendering tests
- [ ] `tests/integration/incentives/achievement-flow.test.ts` - Full achievement flow
- [ ] `tests/integration/incentives/badge-verification.test.ts` - Verification tests
- [ ] `tests/e2e/incentives/achievement-unlock.test.ts` - E2E unlock journey

---

### J2: Learner Dashboard Analytics

**Complexity**: Medium
**Spec Reference**: `openspec/specs/analytics/spec.md`

#### Files/Modules to Create

- [ ] `src/services/analytics/learner-analytics.service.ts` - Learner-specific analytics
- [ ] `src/services/analytics/progress-visualizer.service.ts` - Progress data preparation
- [ ] `src/services/analytics/trend-analyzer.service.ts` - Trend analysis
- [ ] `src/services/analytics/recommendation-engine.service.ts` - Content recommendations
- [ ] `src/models/analytics/learner-metrics.model.ts` - Learner metrics models
- [ ] `src/workers/analytics/metrics-aggregator.worker.ts` - Metrics aggregation
- [ ] `src/graphql/resolvers/analytics/learner-dashboard.resolver.ts` - Dashboard resolvers
- [ ] `src/utils/analytics/chart-data-formatter.ts` - Chart data formatting

#### Database Tables

- [ ] `learner_metrics_daily` - Daily learner metrics
  - `id`, `user_id`, `date`, `study_time_minutes`, `content_completed`, `checkpoints_passed`, `streak_day`, `points_earned`
- [ ] `learner_trends` - Computed trend data
  - `id`, `user_id`, `metric_type`, `period`, `trend_direction`, `change_percent`, `calculated_at`
- [ ] `learner_goals` - User-set goals
  - `id`, `user_id`, `goal_type`, `target_value`, `current_value`, `period`, `start_date`, `end_date`, `status`
- [ ] `content_recommendations` - Personalized recommendations
  - `id`, `user_id`, `content_id`, `reason`, `score`, `created_at`, `clicked`, `completed`

#### API Endpoints

- [ ] `GET /api/v1/analytics/dashboard/learner` - Get learner dashboard data
- [ ] `GET /api/v1/analytics/progress/:userId` - Get progress visualization data
- [ ] `GET /api/v1/analytics/trends/:userId` - Get trend analysis
- [ ] `GET /api/v1/analytics/recommendations` - Get personalized recommendations
- [ ] `POST /api/v1/analytics/goals` - Create learning goal
- [ ] `PUT /api/v1/analytics/goals/:goalId` - Update goal
- [ ] `GET /api/v1/analytics/goals` - Get user goals and progress
- [ ] `GET /api/v1/analytics/streaks` - Get streak information

#### ML Models/Services

- [ ] Content recommendation model (collaborative + content-based)
- [ ] Learning pace optimization model
- [ ] Goal achievement prediction

#### Tests to Write

- [ ] `tests/unit/analytics/learner-analytics.test.ts` - Analytics calculation tests
- [ ] `tests/unit/analytics/trend-analyzer.test.ts` - Trend analysis tests
- [ ] `tests/unit/analytics/recommendation-engine.test.ts` - Recommendation logic
- [ ] `tests/integration/analytics/dashboard-data.test.ts` - Dashboard data flow
- [ ] `tests/integration/analytics/goal-tracking.test.ts` - Goal tracking tests
- [ ] `tests/e2e/analytics/learner-dashboard.test.ts` - E2E dashboard tests

---

### J3: Mentor Matching Flow

**Complexity**: Medium
**Spec Reference**: `openspec/specs/matching/spec.md`

#### Files/Modules to Create

- [ ] `src/services/matching/match-request.service.ts` - Match request management
- [ ] `src/services/matching/mentor-response.service.ts` - Mentor response handling
- [ ] `src/services/matching/match-confirmation.service.ts` - Match confirmation
- [ ] `src/services/matching/relationship-initializer.service.ts` - New relationship setup
- [ ] `src/models/matching/request.model.ts` - Request models
- [ ] `src/models/matching/relationship.model.ts` - Relationship models
- [ ] `src/events/matching/request.events.ts` - Request lifecycle events
- [ ] `src/notifications/matching/match-notifications.ts` - Match-related notifications
- [ ] `src/templates/matching/intro-message.template.ts` - Initial message templates

#### Database Tables

- [ ] `mentorship_requests` - Full request records
  - `id`, `learner_id`, `subject_id`, `status`, `created_at`, `expires_at`, `notes`, `preferences`
- [ ] `request_responses` - Mentor responses
  - `id`, `request_id`, `mentor_id`, `response_type`, `message`, `responded_at`
- [ ] `mentorship_relationships` - Active relationships
  - `id`, `mentor_id`, `learner_id`, `subject_id`, `status`, `started_at`, `ended_at`, `learning_plan_id`
- [ ] `relationship_communications` - Relationship message history
  - `id`, `relationship_id`, `sender_id`, `message`, `sent_at`, `read_at`

#### API Endpoints

- [ ] `POST /api/v1/matching/requests` - Submit match request
- [ ] `GET /api/v1/matching/requests` - Get user's requests
- [ ] `GET /api/v1/matching/requests/:id` - Get request details
- [ ] `DELETE /api/v1/matching/requests/:id` - Cancel request
- [ ] `POST /api/v1/matching/requests/:id/respond` - Mentor respond to request
- [ ] `POST /api/v1/matching/confirm/:requestId` - Confirm match
- [ ] `GET /api/v1/relationships` - Get active relationships
- [ ] `GET /api/v1/relationships/:id` - Get relationship details

#### ML Models/Services

- [ ] Request-mentor urgency scoring
- [ ] Response prediction for queue optimization

#### Tests to Write

- [ ] `tests/unit/matching/match-request.test.ts` - Request handling tests
- [ ] `tests/unit/matching/mentor-response.test.ts` - Response handling tests
- [ ] `tests/unit/matching/relationship-initializer.test.ts` - Initialization tests
- [ ] `tests/integration/matching/request-flow.test.ts` - Full request flow
- [ ] `tests/integration/matching/rejection-handling.test.ts` - Rejection scenarios
- [ ] `tests/e2e/matching/mentor-match.test.ts` - E2E matching journey

---

### J4: Push Notifications

**Complexity**: Medium
**Spec Reference**: `openspec/specs/notifications/spec.md`

#### Files/Modules to Create

- [ ] `src/services/notifications/push-notification.service.ts` - Push notification core
- [ ] `src/services/notifications/fcm-provider.service.ts` - Firebase Cloud Messaging
- [ ] `src/services/notifications/apns-provider.service.ts` - Apple Push Notification Service
- [ ] `src/services/notifications/device-registry.service.ts` - Device token management
- [ ] `src/services/notifications/notification-scheduler.service.ts` - Scheduled notifications
- [ ] `src/models/notifications/device.model.ts` - Device token models
- [ ] `src/models/notifications/push-notification.model.ts` - Push notification models
- [ ] `src/workers/notifications/push-sender.worker.ts` - Async push sending
- [ ] `src/templates/notifications/push-templates.ts` - Push notification templates
- [ ] `src/utils/notifications/deep-link-builder.ts` - Deep link construction

#### Database Tables

- [ ] `user_devices` - Registered devices
  - `id`, `user_id`, `platform`, `device_token`, `device_info`, `registered_at`, `last_active`, `active`
- [ ] `push_notifications` - Push notification history
  - `id`, `user_id`, `device_id`, `title`, `body`, `data`, `sent_at`, `delivered_at`, `opened_at`, `status`
- [ ] `scheduled_notifications` - Scheduled push notifications
  - `id`, `user_id`, `scheduled_for`, `template_id`, `data`, `status`, `sent_at`
- [ ] `push_notification_templates` - Notification templates
  - `id`, `name`, `title_template`, `body_template`, `action_url_template`, `category`

#### API Endpoints

- [ ] `POST /api/v1/notifications/devices/register` - Register device token
- [ ] `DELETE /api/v1/notifications/devices/:deviceId` - Unregister device
- [ ] `GET /api/v1/notifications/devices` - Get user's devices
- [ ] `POST /api/v1/notifications/push/send` - Send push notification (admin)
- [ ] `POST /api/v1/notifications/push/test` - Test push notification
- [ ] `GET /api/v1/notifications/push/history` - Get push history
- [ ] `PUT /api/v1/notifications/push/preferences` - Update push preferences

#### ML Models/Services

- [ ] Optimal send time prediction model
- [ ] Notification relevance scoring
- [ ] Click-through rate prediction

#### Tests to Write

- [ ] `tests/unit/notifications/fcm-provider.test.ts` - FCM integration tests
- [ ] `tests/unit/notifications/apns-provider.test.ts` - APNs integration tests
- [ ] `tests/unit/notifications/device-registry.test.ts` - Device management tests
- [ ] `tests/integration/notifications/push-flow.test.ts` - Full push flow
- [ ] `tests/integration/notifications/scheduling.test.ts` - Scheduling tests
- [ ] `tests/e2e/notifications/push-delivery.test.ts` - E2E delivery tests

---

## Group K: Peer Mentoring, Relationships, Streaks, Email/SMS

*Requires Group J completion. Features in this group can be developed in parallel.*

---

### K1: Peer Mentor Development

**Complexity**: High
**Spec Reference**: `openspec/specs/matching/spec.md`

#### Files/Modules to Create

- [ ] `src/services/mentoring/peer-mentor-eligibility.service.ts` - Eligibility assessment
- [ ] `src/services/mentoring/peer-mentor-training.service.ts` - Training pathway management
- [ ] `src/services/mentoring/supervision.service.ts` - Supervisor assignment and monitoring
- [ ] `src/services/mentoring/peer-mentor-graduation.service.ts` - Graduation criteria
- [ ] `src/models/mentoring/peer-mentor.model.ts` - Peer mentor models
- [ ] `src/models/mentoring/training-progress.model.ts` - Training progress models
- [ ] `src/workers/mentoring/eligibility-checker.worker.ts` - Background eligibility checks
- [ ] `src/events/mentoring/peer-mentor.events.ts` - Peer mentor lifecycle events
- [ ] `src/curriculum/mentoring/mentor-training-content.ts` - Training content definitions

#### Database Tables

- [ ] `peer_mentor_candidates` - Candidate tracking
  - `id`, `user_id`, `eligible_since`, `eligibility_score`, `status`, `supervisor_id`, `training_started_at`
- [ ] `peer_mentor_training` - Training progress
  - `id`, `user_id`, `module_id`, `status`, `score`, `started_at`, `completed_at`, `attempts`
- [ ] `peer_mentor_supervision` - Supervision records
  - `id`, `peer_mentor_id`, `supervisor_id`, `session_id`, `feedback`, `rating`, `created_at`
- [ ] `peer_mentors` - Graduated peer mentors
  - `id`, `user_id`, `graduated_at`, `supervisor_id`, `level`, `total_mentees`, `success_rate`

#### API Endpoints

- [ ] `GET /api/v1/peer-mentors/eligibility` - Check eligibility status
- [ ] `POST /api/v1/peer-mentors/apply` - Apply for peer mentor track
- [ ] `GET /api/v1/peer-mentors/training/progress` - Get training progress
- [ ] `POST /api/v1/peer-mentors/training/:moduleId/complete` - Complete training module
- [ ] `GET /api/v1/peer-mentors/supervision/sessions` - Get supervision sessions
- [ ] `POST /api/v1/peer-mentors/supervision/feedback` - Submit supervision feedback
- [ ] `GET /api/v1/peer-mentors/graduation/status` - Check graduation eligibility
- [ ] `POST /api/v1/peer-mentors/graduate` - Request graduation review

#### ML Models/Services

- [ ] Peer mentor success prediction model
- [ ] Optimal supervisor matching
- [ ] Training content recommendation

#### Tests to Write

- [ ] `tests/unit/mentoring/peer-mentor-eligibility.test.ts` - Eligibility logic tests
- [ ] `tests/unit/mentoring/peer-mentor-training.test.ts` - Training progression tests
- [ ] `tests/unit/mentoring/supervision.test.ts` - Supervision workflow tests
- [ ] `tests/integration/mentoring/peer-mentor-journey.test.ts` - Full journey tests
- [ ] `tests/integration/mentoring/graduation-flow.test.ts` - Graduation flow tests
- [ ] `tests/e2e/mentoring/become-peer-mentor.test.ts` - E2E peer mentor journey

---

### K2: Relationship Management

**Complexity**: Medium
**Spec Reference**: `openspec/specs/matching/spec.md`

#### Files/Modules to Create

- [ ] `src/services/relationships/relationship-dashboard.service.ts` - Dashboard data
- [ ] `src/services/relationships/session-scheduler.service.ts` - Session scheduling
- [ ] `src/services/relationships/check-in.service.ts` - Progress check-ins
- [ ] `src/services/relationships/relationship-health.service.ts` - Health scoring
- [ ] `src/services/relationships/conclusion.service.ts` - Relationship conclusion
- [ ] `src/models/relationships/session.model.ts` - Session models
- [ ] `src/models/relationships/check-in.model.ts` - Check-in models
- [ ] `src/workers/relationships/check-in-reminder.worker.ts` - Check-in reminders
- [ ] `src/events/relationships/session.events.ts` - Session events

#### Database Tables

- [ ] `mentorship_sessions` - Scheduled sessions
  - `id`, `relationship_id`, `scheduled_at`, `duration_minutes`, `session_type`, `status`, `notes`, `created_at`
- [ ] `session_feedback` - Session feedback
  - `id`, `session_id`, `from_user_id`, `rating`, `feedback_text`, `created_at`
- [ ] `relationship_check_ins` - Periodic check-ins
  - `id`, `relationship_id`, `check_in_number`, `learner_response`, `mentor_response`, `health_score`, `created_at`
- [ ] `relationship_milestones` - Milestone tracking
  - `id`, `relationship_id`, `milestone_type`, `achieved_at`, `notes`
- [ ] `relationship_conclusions` - Concluded relationships
  - `id`, `relationship_id`, `concluded_at`, `reason`, `exit_survey_learner`, `exit_survey_mentor`

#### API Endpoints

- [ ] `GET /api/v1/relationships/:id/dashboard` - Get relationship dashboard
- [ ] `POST /api/v1/relationships/:id/sessions` - Schedule session
- [ ] `GET /api/v1/relationships/:id/sessions` - Get sessions list
- [ ] `PUT /api/v1/sessions/:id` - Update session
- [ ] `POST /api/v1/sessions/:id/feedback` - Submit session feedback
- [ ] `POST /api/v1/relationships/:id/check-in` - Submit check-in response
- [ ] `GET /api/v1/relationships/:id/health` - Get relationship health score
- [ ] `POST /api/v1/relationships/:id/conclude` - Initiate conclusion

#### ML Models/Services

- [ ] Relationship health prediction
- [ ] Optimal check-in timing
- [ ] Re-matching recommendation engine

#### Tests to Write

- [ ] `tests/unit/relationships/session-scheduler.test.ts` - Scheduling logic tests
- [ ] `tests/unit/relationships/check-in.test.ts` - Check-in flow tests
- [ ] `tests/unit/relationships/relationship-health.test.ts` - Health scoring tests
- [ ] `tests/integration/relationships/session-flow.test.ts` - Full session flow
- [ ] `tests/integration/relationships/conclusion-flow.test.ts` - Conclusion flow
- [ ] `tests/e2e/relationships/mentorship-lifecycle.test.ts` - E2E lifecycle

---

### K3: Engagement Mechanics

**Complexity**: Medium
**Spec Reference**: `openspec/specs/incentives/spec.md`

#### Files/Modules to Create

- [ ] `src/services/engagement/daily-challenges.service.ts` - Daily challenge management
- [ ] `src/services/engagement/streaks.service.ts` - Streak tracking and shields
- [ ] `src/services/engagement/goals.service.ts` - Goal management
- [ ] `src/services/engagement/challenge-generator.service.ts` - Challenge generation
- [ ] `src/models/engagement/challenge.model.ts` - Challenge models
- [ ] `src/models/engagement/streak.model.ts` - Streak models
- [ ] `src/models/engagement/goal.model.ts` - Goal models
- [ ] `src/workers/engagement/challenge-refresh.worker.ts` - Daily challenge refresh
- [ ] `src/workers/engagement/streak-checker.worker.ts` - Streak maintenance
- [ ] `src/notifications/engagement/streak-reminders.ts` - Streak reminder notifications

#### Database Tables

- [ ] `daily_challenges` - Available daily challenges
  - `id`, `user_id`, `date`, `challenge_type`, `description`, `target`, `difficulty`, `points_reward`, `status`
- [ ] `user_streaks` - User streak tracking
  - `id`, `user_id`, `streak_type`, `current_count`, `longest_count`, `last_activity_date`, `shield_available`, `shield_used_date`
- [ ] `streak_history` - Streak history
  - `id`, `user_id`, `streak_type`, `start_date`, `end_date`, `length`, `broken_reason`
- [ ] `user_goals` - User-defined goals
  - `id`, `user_id`, `goal_type`, `title`, `target_value`, `current_value`, `period_type`, `start_date`, `deadline`, `status`
- [ ] `goal_progress` - Goal progress log
  - `id`, `goal_id`, `date`, `value`, `notes`

#### API Endpoints

- [ ] `GET /api/v1/challenges/daily` - Get today's challenges
- [ ] `POST /api/v1/challenges/:id/complete` - Mark challenge complete
- [ ] `GET /api/v1/streaks` - Get user's streaks
- [ ] `POST /api/v1/streaks/shield` - Use streak shield
- [ ] `POST /api/v1/goals` - Create goal
- [ ] `GET /api/v1/goals` - Get user's goals
- [ ] `PUT /api/v1/goals/:id` - Update goal
- [ ] `DELETE /api/v1/goals/:id` - Delete goal
- [ ] `GET /api/v1/goals/suggestions` - Get goal suggestions

#### ML Models/Services

- [ ] Personalized challenge difficulty tuning
- [ ] Goal recommendation based on behavior
- [ ] Optimal streak reminder timing

#### Tests to Write

- [ ] `tests/unit/engagement/daily-challenges.test.ts` - Challenge logic tests
- [ ] `tests/unit/engagement/streaks.test.ts` - Streak calculation tests
- [ ] `tests/unit/engagement/goals.test.ts` - Goal management tests
- [ ] `tests/integration/engagement/challenge-flow.test.ts` - Challenge flow tests
- [ ] `tests/integration/engagement/streak-protection.test.ts` - Shield tests
- [ ] `tests/e2e/engagement/daily-engagement.test.ts` - E2E engagement

---

### K4: Email/SMS Notifications

**Complexity**: Medium
**Spec Reference**: `openspec/specs/notifications/spec.md`

#### Files/Modules to Create

- [ ] `src/services/notifications/email.service.ts` - Email notification service
- [ ] `src/services/notifications/sms.service.ts` - SMS notification service
- [ ] `src/services/notifications/digest.service.ts` - Digest compilation
- [ ] `src/services/notifications/channel-router.service.ts` - Multi-channel routing
- [ ] `src/providers/notifications/sendgrid.provider.ts` - SendGrid integration
- [ ] `src/providers/notifications/twilio.provider.ts` - Twilio integration
- [ ] `src/models/notifications/email.model.ts` - Email models
- [ ] `src/models/notifications/sms.model.ts` - SMS models
- [ ] `src/workers/notifications/email-sender.worker.ts` - Async email sending
- [ ] `src/workers/notifications/sms-sender.worker.ts` - Async SMS sending
- [ ] `src/workers/notifications/digest-compiler.worker.ts` - Digest compilation
- [ ] `src/templates/emails/` - Email templates directory

#### Database Tables

- [ ] `email_notifications` - Email history
  - `id`, `user_id`, `to_email`, `subject`, `template_id`, `sent_at`, `delivered_at`, `opened_at`, `clicked_at`, `status`
- [ ] `sms_notifications` - SMS history
  - `id`, `user_id`, `to_phone`, `message`, `sent_at`, `delivered_at`, `status`, `cost`
- [ ] `notification_digests` - Digest configuration
  - `id`, `user_id`, `frequency`, `last_sent_at`, `next_scheduled`, `enabled`
- [ ] `email_templates` - Email templates
  - `id`, `name`, `subject_template`, `html_template`, `text_template`, `category`, `active`
- [ ] `channel_preferences` - Per-user channel preferences
  - `id`, `user_id`, `notification_type`, `channels`, `updated_at`

#### API Endpoints

- [ ] `GET /api/v1/notifications/email/history` - Get email history
- [ ] `GET /api/v1/notifications/sms/history` - Get SMS history
- [ ] `PUT /api/v1/notifications/digest/preferences` - Update digest preferences
- [ ] `POST /api/v1/notifications/email/test` - Send test email
- [ ] `GET /api/v1/notifications/channels` - Get channel preferences
- [ ] `PUT /api/v1/notifications/channels` - Update channel preferences
- [ ] `POST /api/v1/notifications/unsubscribe/:token` - One-click unsubscribe

#### ML Models/Services

- [ ] Email open rate prediction
- [ ] Optimal digest frequency recommendation
- [ ] Channel preference prediction

#### Tests to Write

- [ ] `tests/unit/notifications/email.test.ts` - Email service tests
- [ ] `tests/unit/notifications/sms.test.ts` - SMS service tests
- [ ] `tests/unit/notifications/digest.test.ts` - Digest compilation tests
- [ ] `tests/integration/notifications/email-flow.test.ts` - Email delivery flow
- [ ] `tests/integration/notifications/sms-flow.test.ts` - SMS delivery flow
- [ ] `tests/e2e/notifications/multi-channel.test.ts` - Multi-channel delivery

---

## Group L: Auto-Generated Questions, Match ML, Personalization, Rewards

*Requires Group K completion. Features in this group can be developed in parallel.*

---

### L1: Auto Question Generation

**Complexity**: High
**Spec Reference**: `openspec/specs/checkpoints/spec.md`

#### Files/Modules to Create

- [ ] `src/services/checkpoints/question-generator.service.ts` - Question generation orchestrator
- [ ] `src/services/checkpoints/nlp-analyzer.service.ts` - NLP content analysis
- [ ] `src/services/checkpoints/difficulty-calibrator.service.ts` - Difficulty calibration
- [ ] `src/services/checkpoints/anti-pattern-detector.service.ts` - Question quality validation
- [ ] `src/services/checkpoints/human-review-queue.service.ts` - Human review pipeline
- [ ] `src/ml/models/question-generator/` - Question generation ML models
- [ ] `src/ml/models/difficulty-predictor/` - Difficulty prediction models
- [ ] `src/models/checkpoints/generated-question.model.ts` - Generated question models
- [ ] `src/workers/checkpoints/question-generator.worker.ts` - Background generation
- [ ] `src/workers/checkpoints/quality-validator.worker.ts` - Quality validation

#### Database Tables

- [ ] `generated_questions` - Auto-generated questions
  - `id`, `content_id`, `question_type`, `question_text`, `options`, `correct_answer`, `explanation`, `difficulty_score`, `generation_method`, `status`, `created_at`
- [ ] `question_reviews` - Human review records
  - `id`, `question_id`, `reviewer_id`, `decision`, `edits`, `feedback`, `reviewed_at`
- [ ] `question_performance` - Question performance metrics
  - `id`, `question_id`, `times_asked`, `correct_rate`, `avg_time_seconds`, `discrimination_index`, `updated_at`
- [ ] `generation_templates` - Question templates
  - `id`, `question_type`, `template`, `example_output`, `quality_score`

#### API Endpoints

- [ ] `POST /api/v1/checkpoints/generate` - Trigger question generation
- [ ] `GET /api/v1/checkpoints/generated/:contentId` - Get generated questions
- [ ] `GET /api/v1/checkpoints/review-queue` - Get questions pending review
- [ ] `POST /api/v1/checkpoints/review/:questionId` - Submit review decision
- [ ] `PUT /api/v1/checkpoints/questions/:id` - Edit generated question
- [ ] `GET /api/v1/checkpoints/questions/:id/performance` - Get question metrics
- [ ] `POST /api/v1/checkpoints/calibrate/:questionId` - Recalibrate difficulty

#### ML Models/Services

- [ ] GPT-based question generation model (fine-tuned)
- [ ] Distractor quality scoring model
- [ ] Difficulty prediction model (IRT-based)
- [ ] Anti-pattern detection model
- [ ] Question similarity/deduplication model

#### Tests to Write

- [ ] `tests/unit/checkpoints/question-generator.test.ts` - Generation logic tests
- [ ] `tests/unit/checkpoints/nlp-analyzer.test.ts` - NLP analysis tests
- [ ] `tests/unit/checkpoints/difficulty-calibrator.test.ts` - Calibration tests
- [ ] `tests/unit/checkpoints/anti-pattern-detector.test.ts` - Pattern detection tests
- [ ] `tests/integration/checkpoints/generation-pipeline.test.ts` - Full pipeline
- [ ] `tests/ml/question-generator/quality.test.ts` - ML output quality tests
- [ ] `tests/e2e/checkpoints/auto-generation.test.ts` - E2E generation flow

---

### L2: Match Quality ML

**Complexity**: High
**Spec Reference**: `openspec/specs/matching/spec.md`

#### Files/Modules to Create

- [ ] `src/services/matching/ml-matcher.service.ts` - ML-enhanced matching
- [ ] `src/services/matching/feedback-analyzer.service.ts` - Feedback analysis
- [ ] `src/services/matching/algorithm-tuner.service.ts` - Dynamic weight tuning
- [ ] `src/services/matching/bias-detector.service.ts` - Bias detection
- [ ] `src/ml/models/match-predictor/` - Match success prediction model
- [ ] `src/ml/models/bias-detector/` - Matching bias detection model
- [ ] `src/ml/pipelines/matching/training.pipeline.ts` - Model training pipeline
- [ ] `src/ml/pipelines/matching/inference.pipeline.ts` - Inference pipeline
- [ ] `src/workers/matching/model-trainer.worker.ts` - Model retraining worker
- [ ] `src/analytics/matching/ab-testing.service.ts` - A/B testing framework

#### Database Tables

- [ ] `match_outcomes` - Historical match outcomes
  - `id`, `relationship_id`, `outcome_score`, `duration_days`, `feedback_scores`, `success_factors`, `calculated_at`
- [ ] `matching_algorithm_versions` - Algorithm version tracking
  - `id`, `version`, `weights`, `model_path`, `deployed_at`, `deprecated_at`, `performance_metrics`
- [ ] `matching_experiments` - A/B test experiments
  - `id`, `name`, `control_config`, `treatment_config`, `started_at`, `ended_at`, `results`
- [ ] `matching_bias_audits` - Bias audit results
  - `id`, `audit_date`, `demographic_category`, `disparity_score`, `details`, `remediation_status`

#### API Endpoints

- [ ] `GET /api/v1/matching/ml/predict` - Get ML-enhanced recommendations
- [ ] `GET /api/v1/matching/algorithm/performance` - Get algorithm metrics
- [ ] `POST /api/v1/matching/algorithm/tune` - Trigger algorithm tuning
- [ ] `GET /api/v1/matching/bias/audit` - Get bias audit results
- [ ] `GET /api/v1/matching/experiments` - Get active experiments
- [ ] `POST /api/v1/matching/experiments` - Create experiment
- [ ] `GET /api/v1/matching/feedback/analysis` - Get feedback analysis

#### ML Models/Services

- [ ] Match success prediction model (gradient boosting/neural network)
- [ ] Collaborative filtering for mentor recommendation
- [ ] Demographic bias detection model
- [ ] Feature importance analyzer
- [ ] Online learning for real-time adaptation

#### Tests to Write

- [ ] `tests/unit/matching/ml-matcher.test.ts` - ML matcher tests
- [ ] `tests/unit/matching/feedback-analyzer.test.ts` - Feedback analysis tests
- [ ] `tests/unit/matching/bias-detector.test.ts` - Bias detection tests
- [ ] `tests/integration/matching/ml-pipeline.test.ts` - Full ML pipeline
- [ ] `tests/ml/matching/model-accuracy.test.ts` - Model accuracy validation
- [ ] `tests/ml/matching/bias-audit.test.ts` - Bias audit tests
- [ ] `tests/e2e/matching/ml-enhanced-matching.test.ts` - E2E ML matching

---

### L3: Personalization Engine

**Complexity**: High
**Spec Reference**: `openspec/specs/analytics/spec.md`

#### Files/Modules to Create

- [ ] `src/services/personalization/recommendation-engine.service.ts` - Content recommendations
- [ ] `src/services/personalization/pace-optimizer.service.ts` - Learning pace optimization
- [ ] `src/services/personalization/intervention-trigger.service.ts` - Intervention detection
- [ ] `src/services/personalization/learning-profile.service.ts` - Learning profile management
- [ ] `src/ml/models/content-recommender/` - Content recommendation model
- [ ] `src/ml/models/dropout-predictor/` - Dropout risk prediction
- [ ] `src/ml/models/pace-optimizer/` - Optimal pace model
- [ ] `src/models/personalization/learning-profile.model.ts` - Profile models
- [ ] `src/workers/personalization/profile-updater.worker.ts` - Profile updates
- [ ] `src/workers/personalization/intervention-checker.worker.ts` - Intervention checks

#### Database Tables

- [ ] `learning_profiles` - User learning profiles
  - `id`, `user_id`, `learning_style_scores`, `pace_preference`, `optimal_session_length`, `best_learning_times`, `updated_at`
- [ ] `content_interactions` - Detailed content interactions
  - `id`, `user_id`, `content_id`, `interaction_type`, `duration`, `completion_percent`, `engagement_score`, `timestamp`
- [ ] `personalization_recommendations` - Active recommendations
  - `id`, `user_id`, `recommendation_type`, `content_id`, `reason`, `score`, `created_at`, `acted_on`
- [ ] `intervention_triggers` - Triggered interventions
  - `id`, `user_id`, `trigger_type`, `trigger_reason`, `intervention_type`, `triggered_at`, `resolved_at`, `outcome`
- [ ] `dropout_risk_scores` - Dropout risk tracking
  - `id`, `user_id`, `risk_score`, `risk_factors`, `calculated_at`

#### API Endpoints

- [ ] `GET /api/v1/personalization/recommendations` - Get personalized recommendations
- [ ] `GET /api/v1/personalization/profile` - Get learning profile
- [ ] `PUT /api/v1/personalization/profile` - Update profile preferences
- [ ] `GET /api/v1/personalization/pace` - Get optimal pace suggestions
- [ ] `GET /api/v1/personalization/interventions` - Get active interventions
- [ ] `POST /api/v1/personalization/interventions/:id/resolve` - Resolve intervention
- [ ] `GET /api/v1/personalization/insights` - Get learning insights

#### ML Models/Services

- [ ] Hybrid content recommender (collaborative + content-based)
- [ ] Dropout prediction model
- [ ] Learning pace optimization model
- [ ] Session length predictor
- [ ] Engagement pattern analyzer

#### Tests to Write

- [ ] `tests/unit/personalization/recommendation-engine.test.ts` - Recommendation tests
- [ ] `tests/unit/personalization/pace-optimizer.test.ts` - Pace optimization tests
- [ ] `tests/unit/personalization/intervention-trigger.test.ts` - Intervention tests
- [ ] `tests/integration/personalization/recommendation-flow.test.ts` - Recommendation flow
- [ ] `tests/ml/personalization/recommender-accuracy.test.ts` - ML accuracy tests
- [ ] `tests/e2e/personalization/personalized-journey.test.ts` - E2E personalization

---

### L4: Rewards & Redemption

**Complexity**: Medium
**Spec Reference**: `openspec/specs/incentives/spec.md`

#### Files/Modules to Create

- [ ] `src/services/rewards/rewards-catalog.service.ts` - Rewards catalog management
- [ ] `src/services/rewards/redemption.service.ts` - Redemption processing
- [ ] `src/services/rewards/certificate-generator.service.ts` - Certificate generation
- [ ] `src/services/rewards/partner-integration.service.ts` - Partner reward integration
- [ ] `src/models/rewards/reward.model.ts` - Reward models
- [ ] `src/models/rewards/redemption.model.ts` - Redemption models
- [ ] `src/models/rewards/certificate.model.ts` - Certificate models
- [ ] `src/workers/rewards/certificate-generator.worker.ts` - Background generation
- [ ] `src/templates/certificates/` - Certificate templates
- [ ] `src/utils/rewards/qr-generator.ts` - QR code generation for verification

#### Database Tables

- [ ] `rewards_catalog` - Available rewards
  - `id`, `name`, `description`, `category`, `point_cost`, `point_type`, `stock`, `image_url`, `partner_id`, `active`
- [ ] `redemptions` - Redemption records
  - `id`, `user_id`, `reward_id`, `point_cost`, `status`, `redeemed_at`, `fulfilled_at`, `fulfillment_details`
- [ ] `certificates` - Generated certificates
  - `id`, `user_id`, `certificate_type`, `title`, `issued_at`, `verification_code`, `verification_url`, `metadata`
- [ ] `reward_partners` - Partner organizations
  - `id`, `name`, `api_endpoint`, `api_key_encrypted`, `conversion_rate`, `active`
- [ ] `community_rewards` - Community-defined rewards
  - `id`, `community_id`, `name`, `description`, `point_cost`, `stock`, `fulfillment_type`, `active`

#### API Endpoints

- [ ] `GET /api/v1/rewards/catalog` - Get rewards catalog
- [ ] `GET /api/v1/rewards/:id` - Get reward details
- [ ] `POST /api/v1/rewards/redeem/:id` - Redeem reward
- [ ] `GET /api/v1/rewards/redemptions` - Get user redemptions
- [ ] `GET /api/v1/certificates` - Get user certificates
- [ ] `GET /api/v1/certificates/:id` - Get certificate details
- [ ] `GET /api/v1/certificates/verify/:code` - Verify certificate
- [ ] `GET /api/v1/rewards/partners` - Get partner rewards

#### ML Models/Services

- [ ] Reward preference prediction
- [ ] Optimal reward timing suggestions

#### Tests to Write

- [ ] `tests/unit/rewards/rewards-catalog.test.ts` - Catalog management tests
- [ ] `tests/unit/rewards/redemption.test.ts` - Redemption logic tests
- [ ] `tests/unit/rewards/certificate-generator.test.ts` - Certificate generation tests
- [ ] `tests/integration/rewards/redemption-flow.test.ts` - Full redemption flow
- [ ] `tests/integration/rewards/partner-integration.test.ts` - Partner integration
- [ ] `tests/e2e/rewards/reward-journey.test.ts` - E2E reward redemption

---

## Group M: Checkpoint Evolution, Predictive Analytics, Group Mentoring, Social

*Requires Group L completion. Features in this group can be developed in parallel.*

---

### M1: Checkpoint Evolution

**Complexity**: High
**Spec Reference**: `openspec/specs/analytics/spec.md`

#### Files/Modules to Create

- [ ] `src/services/checkpoints/evolution-engine.service.ts` - Checkpoint evolution orchestrator
- [ ] `src/services/checkpoints/performance-analyzer.service.ts` - Question performance analysis
- [ ] `src/services/checkpoints/retirement-manager.service.ts` - Question retirement
- [ ] `src/services/checkpoints/format-innovator.service.ts` - Format experimentation
- [ ] `src/ml/models/question-difficulty/` - Difficulty prediction model
- [ ] `src/ml/models/question-discrimination/` - Discrimination analysis
- [ ] `src/analytics/checkpoints/irt-analyzer.ts` - Item Response Theory analysis
- [ ] `src/workers/checkpoints/performance-analyzer.worker.ts` - Background analysis
- [ ] `src/workers/checkpoints/retirement-checker.worker.ts` - Retirement checks

#### Database Tables

- [ ] `question_irt_params` - IRT parameters
  - `id`, `question_id`, `difficulty`, `discrimination`, `guessing`, `calculated_at`, `sample_size`
- [ ] `question_retirement_queue` - Questions pending retirement
  - `id`, `question_id`, `reason`, `proposed_at`, `approved_by`, `approved_at`, `status`
- [ ] `format_experiments` - Format A/B tests
  - `id`, `name`, `original_format`, `new_format`, `started_at`, `ended_at`, `results`, `winner`
- [ ] `question_evolution_log` - Evolution history
  - `id`, `question_id`, `change_type`, `old_values`, `new_values`, `reason`, `changed_at`

#### API Endpoints

- [ ] `GET /api/v1/checkpoints/evolution/analysis` - Get evolution analysis
- [ ] `GET /api/v1/checkpoints/questions/performance` - Get question performance
- [ ] `GET /api/v1/checkpoints/retirement/queue` - Get retirement queue
- [ ] `POST /api/v1/checkpoints/retirement/approve/:id` - Approve retirement
- [ ] `GET /api/v1/checkpoints/experiments` - Get format experiments
- [ ] `POST /api/v1/checkpoints/experiments` - Create experiment
- [ ] `GET /api/v1/checkpoints/irt/:questionId` - Get IRT parameters

#### ML Models/Services

- [ ] IRT parameter estimation model
- [ ] Question degradation prediction
- [ ] Format effectiveness predictor
- [ ] Replacement question generator

#### Tests to Write

- [ ] `tests/unit/checkpoints/evolution-engine.test.ts` - Evolution logic tests
- [ ] `tests/unit/checkpoints/performance-analyzer.test.ts` - Analysis tests
- [ ] `tests/unit/checkpoints/retirement-manager.test.ts` - Retirement logic tests
- [ ] `tests/integration/checkpoints/evolution-pipeline.test.ts` - Full pipeline
- [ ] `tests/ml/checkpoints/irt-accuracy.test.ts` - IRT model accuracy
- [ ] `tests/e2e/checkpoints/question-lifecycle.test.ts` - E2E lifecycle

---

### M2: Predictive Analytics

**Complexity**: High
**Spec Reference**: `openspec/specs/analytics/spec.md`

#### Files/Modules to Create

- [ ] `src/services/analytics/predictive/dropout-predictor.service.ts` - Dropout prediction
- [ ] `src/services/analytics/predictive/success-predictor.service.ts` - Success prediction
- [ ] `src/services/analytics/predictive/demand-forecaster.service.ts` - Demand forecasting
- [ ] `src/services/analytics/predictive/content-predictor.service.ts` - Content performance
- [ ] `src/ml/models/dropout-predictor/` - Dropout prediction model
- [ ] `src/ml/models/success-predictor/` - Success prediction model
- [ ] `src/ml/models/demand-forecaster/` - Demand forecasting model
- [ ] `src/ml/pipelines/predictive/training.pipeline.ts` - Training pipeline
- [ ] `src/workers/analytics/prediction-runner.worker.ts` - Prediction execution
- [ ] `src/analytics/predictive/feature-store.ts` - ML feature store

#### Database Tables

- [ ] `dropout_predictions` - Dropout risk predictions
  - `id`, `user_id`, `prediction_date`, `risk_score`, `risk_factors`, `intervention_suggested`, `model_version`
- [ ] `success_predictions` - Success predictions
  - `id`, `user_id`, `subject_id`, `prediction_date`, `success_probability`, `contributing_factors`, `model_version`
- [ ] `demand_forecasts` - Demand forecasts
  - `id`, `forecast_date`, `subject_id`, `community_id`, `predicted_demand`, `confidence_interval`, `model_version`
- [ ] `ml_feature_store` - Pre-computed features
  - `id`, `entity_type`, `entity_id`, `feature_set`, `features`, `computed_at`
- [ ] `model_performance_log` - Model performance tracking
  - `id`, `model_name`, `model_version`, `metric_name`, `metric_value`, `evaluated_at`

#### API Endpoints

- [ ] `GET /api/v1/analytics/predictions/dropout` - Get dropout predictions
- [ ] `GET /api/v1/analytics/predictions/success/:userId` - Get success prediction
- [ ] `GET /api/v1/analytics/forecasts/demand` - Get demand forecasts
- [ ] `GET /api/v1/analytics/predictions/content/:contentId` - Get content prediction
- [ ] `GET /api/v1/analytics/models/performance` - Get model performance
- [ ] `POST /api/v1/analytics/predictions/refresh` - Refresh predictions

#### ML Models/Services

- [ ] Dropout prediction model (survival analysis / gradient boosting)
- [ ] Success prediction model (neural network)
- [ ] Time series demand forecasting (ARIMA/Prophet)
- [ ] Content performance prediction
- [ ] Automated model retraining pipeline

#### Tests to Write

- [ ] `tests/unit/analytics/dropout-predictor.test.ts` - Dropout prediction tests
- [ ] `tests/unit/analytics/success-predictor.test.ts` - Success prediction tests
- [ ] `tests/unit/analytics/demand-forecaster.test.ts` - Forecasting tests
- [ ] `tests/integration/analytics/prediction-pipeline.test.ts` - Pipeline tests
- [ ] `tests/ml/analytics/model-validation.test.ts` - Model validation
- [ ] `tests/e2e/analytics/predictive-insights.test.ts` - E2E predictions

---

### M3: Group Mentoring

**Complexity**: Medium
**Spec Reference**: `openspec/specs/matching/spec.md`

#### Files/Modules to Create

- [ ] `src/services/mentoring/study-groups.service.ts` - Study group management
- [ ] `src/services/mentoring/cohorts.service.ts` - Cohort management
- [ ] `src/services/mentoring/group-sessions.service.ts` - Group session management
- [ ] `src/services/mentoring/group-formation.service.ts` - Intelligent group formation
- [ ] `src/models/mentoring/study-group.model.ts` - Study group models
- [ ] `src/models/mentoring/cohort.model.ts` - Cohort models
- [ ] `src/algorithms/mentoring/group-optimizer.ts` - Group composition optimization
- [ ] `src/workers/mentoring/group-formation.worker.ts` - Background formation
- [ ] `src/events/mentoring/group.events.ts` - Group events

#### Database Tables

- [ ] `study_groups` - Study group definitions
  - `id`, `name`, `subject_id`, `mentor_id`, `max_size`, `current_size`, `status`, `created_at`
- [ ] `study_group_members` - Group membership
  - `id`, `group_id`, `user_id`, `role`, `joined_at`, `left_at`
- [ ] `cohorts` - Learning cohorts
  - `id`, `name`, `curriculum_id`, `start_date`, `end_date`, `max_size`, `status`
- [ ] `cohort_members` - Cohort membership
  - `id`, `cohort_id`, `user_id`, `role`, `joined_at`, `progress_percent`
- [ ] `group_sessions` - Group session records
  - `id`, `group_id`, `scheduled_at`, `duration`, `session_type`, `attendance`, `notes`

#### API Endpoints

- [ ] `GET /api/v1/groups/study` - Get available study groups
- [ ] `POST /api/v1/groups/study` - Create study group
- [ ] `POST /api/v1/groups/study/:id/join` - Join study group
- [ ] `POST /api/v1/groups/study/:id/leave` - Leave study group
- [ ] `GET /api/v1/cohorts` - Get available cohorts
- [ ] `POST /api/v1/cohorts/:id/enroll` - Enroll in cohort
- [ ] `GET /api/v1/groups/:id/sessions` - Get group sessions
- [ ] `POST /api/v1/groups/:id/sessions` - Schedule group session

#### ML Models/Services

- [ ] Optimal group composition model
- [ ] Group success prediction
- [ ] Peer compatibility scoring

#### Tests to Write

- [ ] `tests/unit/mentoring/study-groups.test.ts` - Study group tests
- [ ] `tests/unit/mentoring/cohorts.test.ts` - Cohort management tests
- [ ] `tests/unit/mentoring/group-formation.test.ts` - Formation algorithm tests
- [ ] `tests/integration/mentoring/group-lifecycle.test.ts` - Group lifecycle
- [ ] `tests/integration/mentoring/cohort-flow.test.ts` - Cohort flow tests
- [ ] `tests/e2e/mentoring/group-learning.test.ts` - E2E group learning

---

### M4: Leaderboards & Social

**Complexity**: Medium
**Spec Reference**: `openspec/specs/incentives/spec.md`

#### Files/Modules to Create

- [ ] `src/services/social/leaderboards.service.ts` - Leaderboard management
- [ ] `src/services/social/kudos.service.ts` - Kudos system
- [ ] `src/services/social/spotlights.service.ts` - Spotlight features
- [ ] `src/services/social/thank-you-notes.service.ts` - Thank you notes
- [ ] `src/models/social/leaderboard.model.ts` - Leaderboard models
- [ ] `src/models/social/kudos.model.ts` - Kudos models
- [ ] `src/models/social/spotlight.model.ts` - Spotlight models
- [ ] `src/workers/social/leaderboard-updater.worker.ts` - Leaderboard updates
- [ ] `src/cache/social/leaderboard-cache.ts` - Leaderboard caching

#### Database Tables

- [ ] `leaderboards` - Leaderboard definitions
  - `id`, `name`, `type`, `scope`, `community_id`, `metric`, `reset_frequency`, `active`
- [ ] `leaderboard_entries` - Current leaderboard state
  - `id`, `leaderboard_id`, `user_id`, `score`, `rank`, `period_start`, `updated_at`
- [ ] `kudos` - Kudos records
  - `id`, `from_user_id`, `to_user_id`, `kudos_type`, `message`, `created_at`
- [ ] `spotlights` - Spotlight nominations
  - `id`, `user_id`, `nominator_id`, `reason`, `spotlight_type`, `period`, `votes`, `featured`, `created_at`
- [ ] `thank_you_notes` - Mentor thank you notes
  - `id`, `relationship_id`, `from_user_id`, `to_user_id`, `message`, `public`, `created_at`

#### API Endpoints

- [ ] `GET /api/v1/leaderboards` - Get available leaderboards
- [ ] `GET /api/v1/leaderboards/:id` - Get leaderboard entries
- [ ] `PUT /api/v1/leaderboards/opt-in` - Opt into leaderboards
- [ ] `POST /api/v1/kudos` - Send kudos
- [ ] `GET /api/v1/kudos/received` - Get received kudos
- [ ] `POST /api/v1/spotlights/nominate` - Nominate for spotlight
- [ ] `POST /api/v1/spotlights/:id/vote` - Vote for spotlight
- [ ] `POST /api/v1/thank-you` - Send thank you note
- [ ] `GET /api/v1/thank-you/received` - Get received notes

#### ML Models/Services

- [ ] Engagement boost prediction from social features
- [ ] Spotlight recommendation engine

#### Tests to Write

- [ ] `tests/unit/social/leaderboards.test.ts` - Leaderboard logic tests
- [ ] `tests/unit/social/kudos.test.ts` - Kudos system tests
- [ ] `tests/unit/social/spotlights.test.ts` - Spotlight system tests
- [ ] `tests/integration/social/social-features.test.ts` - Social feature flow
- [ ] `tests/performance/social/leaderboard-scale.test.ts` - Scale tests
- [ ] `tests/e2e/social/social-engagement.test.ts` - E2E social features

---

## Phase 4: Governance & Quality

Phase 4 adds moderation, oversight, and compliance features. Builds on the intelligence layer from Phase 3.

---

## Group N: Automated Screening, Reporting, Committee Setup

*Can start immediately after Phase 3 completion. Features in this group can be developed in parallel.*

---

### N1: Automated Content Screening

**Complexity**: High
**Spec Reference**: `openspec/specs/content/spec.md`

#### Files/Modules to Create

- [ ] `src/services/moderation/content-screener.service.ts` - Content screening orchestrator
- [ ] `src/services/moderation/toxicity-detector.service.ts` - Toxicity detection
- [ ] `src/services/moderation/image-moderator.service.ts` - Image moderation
- [ ] `src/services/moderation/spam-detector.service.ts` - Spam detection
- [ ] `src/services/moderation/link-checker.service.ts` - Link safety verification
- [ ] `src/ml/models/toxicity-detector/` - Toxicity detection model
- [ ] `src/ml/models/image-classifier/` - Image classification model
- [ ] `src/ml/models/spam-detector/` - Spam detection model
- [ ] `src/workers/moderation/content-screener.worker.ts` - Background screening
- [ ] `src/utils/moderation/blocklist-manager.ts` - Blocklist management

#### Database Tables

- [ ] `content_screenings` - Screening results
  - `id`, `content_id`, `content_type`, `screening_results`, `auto_action`, `flagged_for_review`, `screened_at`
- [ ] `toxicity_scores` - Toxicity detection results
  - `id`, `content_id`, `overall_score`, `category_scores`, `model_version`, `detected_at`
- [ ] `image_moderation_results` - Image moderation
  - `id`, `image_id`, `classifications`, `confidence_scores`, `flagged`, `moderated_at`
- [ ] `blocklists` - Link and content blocklists
  - `id`, `list_type`, `entries`, `last_updated`, `source`
- [ ] `screening_rules` - Configurable screening rules
  - `id`, `rule_type`, `condition`, `action`, `community_id`, `active`

#### API Endpoints

- [ ] `POST /api/v1/moderation/screen` - Screen content
- [ ] `GET /api/v1/moderation/screening/:contentId` - Get screening results
- [ ] `GET /api/v1/moderation/flagged` - Get flagged content
- [ ] `PUT /api/v1/moderation/rules` - Update screening rules
- [ ] `GET /api/v1/moderation/rules` - Get active rules
- [ ] `POST /api/v1/moderation/blocklist` - Add to blocklist
- [ ] `GET /api/v1/moderation/stats` - Get moderation statistics

#### ML Models/Services

- [ ] Multi-language toxicity detection model (BERT-based)
- [ ] NSFW image classification model
- [ ] Hate symbol detection model
- [ ] Spam/bot detection model
- [ ] PII detection model

#### Tests to Write

- [ ] `tests/unit/moderation/content-screener.test.ts` - Screener logic tests
- [ ] `tests/unit/moderation/toxicity-detector.test.ts` - Toxicity detection tests
- [ ] `tests/unit/moderation/image-moderator.test.ts` - Image moderation tests
- [ ] `tests/unit/moderation/spam-detector.test.ts` - Spam detection tests
- [ ] `tests/integration/moderation/screening-pipeline.test.ts` - Full pipeline
- [ ] `tests/ml/moderation/model-accuracy.test.ts` - Model accuracy tests
- [ ] `tests/e2e/moderation/content-submission.test.ts` - E2E content flow

---

### N2: Community Reporting

**Complexity**: Medium
**Spec Reference**: `openspec/specs/content/spec.md`

#### Files/Modules to Create

- [ ] `src/services/moderation/report-submission.service.ts` - Report submission
- [ ] `src/services/moderation/report-triage.service.ts` - Report triage
- [ ] `src/services/moderation/report-deduplication.service.ts` - Report deduplication
- [ ] `src/services/moderation/reporter-trust.service.ts` - Reporter trust scoring
- [ ] `src/models/moderation/report.model.ts` - Report models
- [ ] `src/workers/moderation/report-processor.worker.ts` - Report processing
- [ ] `src/events/moderation/report.events.ts` - Report events
- [ ] `src/validators/moderation/report.validator.ts` - Report validation

#### Database Tables

- [ ] `content_reports` - User-submitted reports
  - `id`, `reporter_id`, `content_id`, `content_type`, `reason_category`, `description`, `status`, `submitted_at`
- [ ] `report_categories` - Report reason categories
  - `id`, `name`, `description`, `severity`, `sla_hours`, `active`
- [ ] `reporter_trust_scores` - Reporter reliability
  - `id`, `user_id`, `accurate_reports`, `false_reports`, `trust_score`, `updated_at`
- [ ] `report_clusters` - Deduplicated report clusters
  - `id`, `content_id`, `report_count`, `first_reported_at`, `priority_score`, `status`

#### API Endpoints

- [ ] `POST /api/v1/reports` - Submit report
- [ ] `GET /api/v1/reports/categories` - Get report categories
- [ ] `GET /api/v1/reports/my-reports` - Get user's submitted reports
- [ ] `GET /api/v1/reports/:id/status` - Get report status
- [ ] `GET /api/v1/moderation/queue` - Get moderation queue (moderators)
- [ ] `GET /api/v1/moderation/queue/stats` - Get queue statistics
- [ ] `PUT /api/v1/reports/:id/resolve` - Resolve report (moderators)

#### ML Models/Services

- [ ] Report urgency scoring model
- [ ] Report clustering for deduplication
- [ ] False report detection

#### Tests to Write

- [ ] `tests/unit/moderation/report-submission.test.ts` - Submission tests
- [ ] `tests/unit/moderation/report-triage.test.ts` - Triage logic tests
- [ ] `tests/unit/moderation/report-deduplication.test.ts` - Deduplication tests
- [ ] `tests/integration/moderation/report-flow.test.ts` - Full report flow
- [ ] `tests/integration/moderation/queue-management.test.ts` - Queue tests
- [ ] `tests/e2e/moderation/report-submission.test.ts` - E2E reporting

---

### N3: Committee Structure

**Complexity**: Medium
**Spec Reference**: `openspec/specs/oversight/spec.md`

#### Files/Modules to Create

- [ ] `src/services/oversight/committee.service.ts` - Committee management
- [ ] `src/services/oversight/committee-membership.service.ts` - Membership management
- [ ] `src/services/oversight/charter.service.ts` - Charter management
- [ ] `src/services/oversight/nominations.service.ts` - Nomination handling
- [ ] `src/models/oversight/committee.model.ts` - Committee models
- [ ] `src/models/oversight/membership.model.ts` - Membership models
- [ ] `src/models/oversight/charter.model.ts` - Charter models
- [ ] `src/events/oversight/committee.events.ts` - Committee events
- [ ] `src/templates/oversight/charter-templates.ts` - Charter templates

#### Database Tables

- [ ] `committees` - Committee definitions
  - `id`, `name`, `type`, `scope`, `community_id`, `charter_id`, `quorum_requirement`, `status`, `created_at`
- [ ] `committee_memberships` - Member records
  - `id`, `committee_id`, `user_id`, `role`, `term_start`, `term_end`, `status`, `joined_at`
- [ ] `committee_charters` - Committee charters
  - `id`, `committee_id`, `version`, `purpose`, `responsibilities`, `procedures`, `effective_date`, `approved_by`
- [ ] `committee_nominations` - Member nominations
  - `id`, `committee_id`, `nominee_id`, `nominator_id`, `statement`, `votes_for`, `votes_against`, `status`, `created_at`
- [ ] `committee_terms` - Term configurations
  - `id`, `committee_id`, `term_length_months`, `max_consecutive_terms`, `rotation_schedule`

#### API Endpoints

- [ ] `GET /api/v1/committees` - List committees
- [ ] `POST /api/v1/committees` - Create committee
- [ ] `GET /api/v1/committees/:id` - Get committee details
- [ ] `PUT /api/v1/committees/:id` - Update committee
- [ ] `GET /api/v1/committees/:id/members` - Get members
- [ ] `POST /api/v1/committees/:id/nominations` - Submit nomination
- [ ] `POST /api/v1/committees/:id/nominations/:nominationId/vote` - Vote on nomination
- [ ] `GET /api/v1/committees/:id/charter` - Get charter
- [ ] `PUT /api/v1/committees/:id/charter` - Update charter

#### ML Models/Services

- [ ] Committee composition optimization
- [ ] Workload balancing recommendation

#### Tests to Write

- [ ] `tests/unit/oversight/committee.test.ts` - Committee management tests
- [ ] `tests/unit/oversight/committee-membership.test.ts` - Membership tests
- [ ] `tests/unit/oversight/charter.test.ts` - Charter management tests
- [ ] `tests/integration/oversight/committee-lifecycle.test.ts` - Lifecycle tests
- [ ] `tests/integration/oversight/nomination-flow.test.ts` - Nomination flow
- [ ] `tests/e2e/oversight/committee-setup.test.ts` - E2E committee setup

---

## Group O: Human Review, Oversight Review, Moderation Actions

*Requires Group N completion. Features in this group can be developed in parallel.*

---

### O1: Human Review Workflow

**Complexity**: Medium
**Spec Reference**: `openspec/specs/content/spec.md`

#### Files/Modules to Create

- [ ] `src/services/moderation/review-queue.service.ts` - Review queue management
- [ ] `src/services/moderation/review-assignment.service.ts` - Reviewer assignment
- [ ] `src/services/moderation/review-decision.service.ts` - Decision handling
- [ ] `src/services/moderation/appeals.service.ts` - Appeals handling
- [ ] `src/services/moderation/reviewer-qa.service.ts` - QA for reviewers
- [ ] `src/models/moderation/review.model.ts` - Review models
- [ ] `src/models/moderation/appeal.model.ts` - Appeal models
- [ ] `src/workers/moderation/review-assigner.worker.ts` - Auto-assignment
- [ ] `src/events/moderation/review.events.ts` - Review events

#### Database Tables

- [ ] `review_queue` - Items pending review
  - `id`, `content_id`, `content_type`, `priority`, `source`, `assigned_to`, `due_at`, `status`, `queued_at`
- [ ] `reviews` - Review records
  - `id`, `queue_item_id`, `reviewer_id`, `decision`, `reasoning`, `evidence_links`, `reviewed_at`
- [ ] `appeals` - Appeal records
  - `id`, `original_review_id`, `appellant_id`, `grounds`, `status`, `assigned_to`, `final_decision`, `created_at`
- [ ] `reviewer_performance` - Reviewer metrics
  - `id`, `reviewer_id`, `reviews_completed`, `accuracy_rate`, `appeal_reversal_rate`, `avg_review_time`, `updated_at`
- [ ] `review_calibrations` - Calibration exercises
  - `id`, `reviewer_id`, `calibration_date`, `score`, `feedback`

#### API Endpoints

- [ ] `GET /api/v1/moderation/review/queue` - Get review queue
- [ ] `GET /api/v1/moderation/review/:id` - Get item for review
- [ ] `POST /api/v1/moderation/review/:id/decision` - Submit decision
- [ ] `POST /api/v1/moderation/review/:id/escalate` - Escalate item
- [ ] `POST /api/v1/appeals` - Submit appeal
- [ ] `GET /api/v1/appeals/:id` - Get appeal status
- [ ] `POST /api/v1/appeals/:id/decide` - Decide appeal
- [ ] `GET /api/v1/moderation/reviewer/stats` - Get reviewer stats

#### ML Models/Services

- [ ] Optimal reviewer assignment model
- [ ] Review difficulty prediction
- [ ] Decision consistency analyzer

#### Tests to Write

- [ ] `tests/unit/moderation/review-queue.test.ts` - Queue management tests
- [ ] `tests/unit/moderation/review-assignment.test.ts` - Assignment logic tests
- [ ] `tests/unit/moderation/appeals.test.ts` - Appeals handling tests
- [ ] `tests/integration/moderation/review-flow.test.ts` - Full review flow
- [ ] `tests/integration/moderation/appeal-flow.test.ts` - Appeal flow tests
- [ ] `tests/e2e/moderation/human-review.test.ts` - E2E review process

---

### O2: Oversight Review Workflows

**Complexity**: Medium
**Spec Reference**: `openspec/specs/oversight/spec.md`

#### Files/Modules to Create

- [ ] `src/services/oversight/review-workflow.service.ts` - Review workflow orchestration
- [ ] `src/services/oversight/accuracy-review.service.ts` - Content accuracy review
- [ ] `src/services/oversight/bias-review.service.ts` - Bias review
- [ ] `src/services/oversight/consensus.service.ts` - Multi-reviewer consensus
- [ ] `src/models/oversight/review.model.ts` - Oversight review models
- [ ] `src/workers/oversight/review-router.worker.ts` - Review routing
- [ ] `src/events/oversight/review.events.ts` - Review events
- [ ] `src/templates/oversight/review-rubrics.ts` - Review rubric templates

#### Database Tables

- [ ] `oversight_reviews` - Oversight review records
  - `id`, `committee_id`, `content_id`, `review_type`, `status`, `created_at`, `deadline`
- [ ] `oversight_review_assignments` - Review assignments
  - `id`, `review_id`, `reviewer_id`, `assigned_at`, `completed_at`, `verdict`, `feedback`
- [ ] `review_consensus` - Consensus tracking
  - `id`, `review_id`, `total_reviewers`, `approve_count`, `reject_count`, `final_decision`, `decided_at`
- [ ] `accuracy_issues` - Identified accuracy issues
  - `id`, `content_id`, `issue_type`, `description`, `severity`, `reported_by`, `resolved`, `created_at`

#### API Endpoints

- [ ] `GET /api/v1/oversight/reviews/pending` - Get pending reviews
- [ ] `GET /api/v1/oversight/reviews/:id` - Get review details
- [ ] `POST /api/v1/oversight/reviews/:id/submit` - Submit review verdict
- [ ] `GET /api/v1/oversight/reviews/:id/consensus` - Get consensus status
- [ ] `POST /api/v1/oversight/accuracy-issues` - Report accuracy issue
- [ ] `GET /api/v1/oversight/accuracy-issues/:contentId` - Get content issues
- [ ] `PUT /api/v1/oversight/accuracy-issues/:id/resolve` - Resolve issue

#### ML Models/Services

- [ ] Factual accuracy verification (fact-checking)
- [ ] Bias detection in educational content
- [ ] Consensus prediction model

#### Tests to Write

- [ ] `tests/unit/oversight/review-workflow.test.ts` - Workflow logic tests
- [ ] `tests/unit/oversight/accuracy-review.test.ts` - Accuracy review tests
- [ ] `tests/unit/oversight/consensus.test.ts` - Consensus calculation tests
- [ ] `tests/integration/oversight/review-pipeline.test.ts` - Pipeline tests
- [ ] `tests/integration/oversight/multi-reviewer.test.ts` - Multi-reviewer tests
- [ ] `tests/e2e/oversight/committee-review.test.ts` - E2E committee review

---

### O3: Moderation Actions

**Complexity**: Medium
**Spec Reference**: `openspec/specs/content/spec.md`

#### Files/Modules to Create

- [ ] `src/services/moderation/actions.service.ts` - Action execution
- [ ] `src/services/moderation/progressive-discipline.service.ts` - Progressive discipline
- [ ] `src/services/moderation/education.service.ts` - Educational interventions
- [ ] `src/services/moderation/action-history.service.ts` - Action history tracking
- [ ] `src/models/moderation/action.model.ts` - Action models
- [ ] `src/models/moderation/violation.model.ts` - Violation models
- [ ] `src/workers/moderation/action-executor.worker.ts` - Action execution
- [ ] `src/events/moderation/action.events.ts` - Action events
- [ ] `src/notifications/moderation/action-notifications.ts` - Action notifications

#### Database Tables

- [ ] `moderation_actions` - Executed actions
  - `id`, `user_id`, `action_type`, `reason`, `content_id`, `executed_by`, `expires_at`, `executed_at`
- [ ] `user_violations` - User violation history
  - `id`, `user_id`, `violation_type`, `severity`, `content_id`, `action_id`, `created_at`
- [ ] `disciplinary_levels` - Progressive discipline levels
  - `id`, `user_id`, `current_level`, `violation_count`, `last_violation_at`, `cooldown_ends_at`
- [ ] `educational_interventions` - Required education
  - `id`, `user_id`, `intervention_type`, `content_id`, `required_by`, `completed_at`, `status`
- [ ] `action_appeals_history` - Historical appeals
  - `id`, `action_id`, `appeal_id`, `original_action`, `appeal_result`, `modified_action`

#### API Endpoints

- [ ] `POST /api/v1/moderation/actions` - Execute action
- [ ] `GET /api/v1/moderation/actions/:userId` - Get user's action history
- [ ] `PUT /api/v1/moderation/actions/:id/expire` - Expire action early
- [ ] `GET /api/v1/moderation/violations/:userId` - Get violation history
- [ ] `GET /api/v1/moderation/discipline/:userId` - Get discipline level
- [ ] `POST /api/v1/moderation/education/assign` - Assign education
- [ ] `POST /api/v1/moderation/education/:id/complete` - Complete education

#### ML Models/Services

- [ ] Recidivism prediction model
- [ ] Optimal intervention recommendation

#### Tests to Write

- [ ] `tests/unit/moderation/actions.test.ts` - Action execution tests
- [ ] `tests/unit/moderation/progressive-discipline.test.ts` - Discipline logic tests
- [ ] `tests/unit/moderation/education.test.ts` - Education intervention tests
- [ ] `tests/integration/moderation/action-flow.test.ts` - Full action flow
- [ ] `tests/integration/moderation/discipline-escalation.test.ts` - Escalation tests
- [ ] `tests/e2e/moderation/enforcement.test.ts` - E2E enforcement

---

## Group P: Algorithm Oversight, Transparency, QA, Volunteers

*Requires Group O completion. Features in this group can be developed in parallel.*

---

### P1: Algorithmic Oversight

**Complexity**: High
**Spec Reference**: `openspec/specs/oversight/spec.md`

#### Files/Modules to Create

- [ ] `src/services/oversight/algorithm-registry.service.ts` - Algorithm documentation
- [ ] `src/services/oversight/algorithm-review.service.ts` - Algorithm review process
- [ ] `src/services/oversight/algorithm-monitoring.service.ts` - Continuous monitoring
- [ ] `src/services/oversight/algorithm-appeals.service.ts` - Algorithmic decision appeals
- [ ] `src/models/oversight/algorithm.model.ts` - Algorithm registry models
- [ ] `src/workers/oversight/algorithm-monitor.worker.ts` - Monitoring worker
- [ ] `src/analytics/oversight/algorithm-metrics.ts` - Algorithm metrics
- [ ] `src/docs/oversight/algorithm-docs.ts` - Algorithm documentation generator

#### Database Tables

- [ ] `algorithm_registry` - Registered algorithms
  - `id`, `name`, `version`, `purpose`, `description`, `impact_level`, `inputs`, `outputs`, `deployed_at`
- [ ] `algorithm_reviews` - Algorithm review records
  - `id`, `algorithm_id`, `review_type`, `reviewer_id`, `verdict`, `conditions`, `reviewed_at`
- [ ] `algorithm_performance` - Performance tracking
  - `id`, `algorithm_id`, `date`, `metrics`, `by_demographic`, `anomalies`
- [ ] `algorithm_decision_appeals` - Appeals of algorithmic decisions
  - `id`, `algorithm_id`, `user_id`, `decision_id`, `appeal_reason`, `human_review`, `outcome`, `created_at`
- [ ] `algorithm_changes` - Change history
  - `id`, `algorithm_id`, `change_type`, `old_version`, `new_version`, `change_reason`, `changed_by`, `changed_at`

#### API Endpoints

- [ ] `GET /api/v1/oversight/algorithms` - List registered algorithms
- [ ] `GET /api/v1/oversight/algorithms/:id` - Get algorithm details
- [ ] `GET /api/v1/oversight/algorithms/:id/explain` - Get algorithm explanation
- [ ] `GET /api/v1/oversight/algorithms/:id/performance` - Get performance metrics
- [ ] `POST /api/v1/oversight/algorithms/:id/review` - Request algorithm review
- [ ] `POST /api/v1/oversight/algorithms/decisions/:id/appeal` - Appeal decision
- [ ] `GET /api/v1/oversight/algorithms/:id/audits` - Get audit history

#### ML Models/Services

- [ ] Algorithm drift detection
- [ ] Fairness metric calculator
- [ ] Impact assessment model

#### Tests to Write

- [ ] `tests/unit/oversight/algorithm-registry.test.ts` - Registry tests
- [ ] `tests/unit/oversight/algorithm-review.test.ts` - Review process tests
- [ ] `tests/unit/oversight/algorithm-monitoring.test.ts` - Monitoring tests
- [ ] `tests/integration/oversight/algorithm-lifecycle.test.ts` - Lifecycle tests
- [ ] `tests/integration/oversight/decision-appeal.test.ts` - Appeal flow tests
- [ ] `tests/e2e/oversight/algorithm-transparency.test.ts` - E2E transparency

---

### P2: Transparency Reports

**Complexity**: Medium
**Spec Reference**: `openspec/specs/content/spec.md`

#### Files/Modules to Create

- [ ] `src/services/transparency/report-generator.service.ts` - Report generation
- [ ] `src/services/transparency/metrics-aggregator.service.ts` - Metrics aggregation
- [ ] `src/services/transparency/publication.service.ts` - Report publication
- [ ] `src/models/transparency/report.model.ts` - Report models
- [ ] `src/workers/transparency/report-generator.worker.ts` - Background generation
- [ ] `src/templates/transparency/report-templates.ts` - Report templates
- [ ] `src/analytics/transparency/trend-analyzer.ts` - Trend analysis

#### Database Tables

- [ ] `transparency_reports` - Published reports
  - `id`, `report_type`, `period_start`, `period_end`, `data`, `published_at`, `public_url`
- [ ] `moderation_statistics` - Aggregated moderation stats
  - `id`, `date`, `content_reviewed`, `actions_taken`, `appeals_count`, `overturn_rate`
- [ ] `report_schedules` - Scheduled reports
  - `id`, `report_type`, `frequency`, `next_generation`, `recipients`

#### API Endpoints

- [ ] `GET /api/v1/transparency/reports` - List transparency reports
- [ ] `GET /api/v1/transparency/reports/:id` - Get report details
- [ ] `GET /api/v1/transparency/reports/latest` - Get latest report
- [ ] `POST /api/v1/transparency/reports/generate` - Trigger report generation
- [ ] `GET /api/v1/transparency/statistics` - Get live statistics
- [ ] `GET /api/v1/transparency/trends` - Get trend data

#### ML Models/Services

- [ ] Anomaly detection for report metrics
- [ ] Trend forecasting

#### Tests to Write

- [ ] `tests/unit/transparency/report-generator.test.ts` - Generation tests
- [ ] `tests/unit/transparency/metrics-aggregator.test.ts` - Aggregation tests
- [ ] `tests/integration/transparency/report-flow.test.ts` - Report flow tests
- [ ] `tests/e2e/transparency/public-reports.test.ts` - E2E public access

---

### P3: Quality Assurance

**Complexity**: Medium
**Spec Reference**: `openspec/specs/oversight/spec.md`

#### Files/Modules to Create

- [ ] `src/services/qa/periodic-review.service.ts` - Periodic re-review scheduling
- [ ] `src/services/qa/accuracy-audit.service.ts` - Educational accuracy audits
- [ ] `src/services/qa/bias-audit.service.ts` - Bias auditing
- [ ] `src/services/qa/content-freshness.service.ts` - Content freshness checks
- [ ] `src/models/qa/audit.model.ts` - Audit models
- [ ] `src/workers/qa/review-scheduler.worker.ts` - Review scheduling
- [ ] `src/workers/qa/freshness-checker.worker.ts` - Freshness checking
- [ ] `src/analytics/qa/quality-metrics.ts` - Quality metrics

#### Database Tables

- [ ] `content_qa_schedule` - Scheduled QA reviews
  - `id`, `content_id`, `review_type`, `last_reviewed`, `next_review`, `priority`
- [ ] `qa_audits` - QA audit records
  - `id`, `audit_type`, `scope`, `started_at`, `completed_at`, `findings`, `remediation_status`
- [ ] `content_freshness` - Content freshness tracking
  - `id`, `content_id`, `last_updated`, `freshness_score`, `stale_flag`, `checked_at`
- [ ] `bias_audit_results` - Bias audit results
  - `id`, `content_id`, `audit_date`, `bias_indicators`, `severity`, `remediation_required`

#### API Endpoints

- [ ] `GET /api/v1/qa/schedule` - Get QA schedule
- [ ] `POST /api/v1/qa/schedule/:contentId` - Schedule content for review
- [ ] `GET /api/v1/qa/audits` - Get audit history
- [ ] `POST /api/v1/qa/audits/accuracy` - Trigger accuracy audit
- [ ] `POST /api/v1/qa/audits/bias` - Trigger bias audit
- [ ] `GET /api/v1/qa/freshness` - Get content freshness report
- [ ] `GET /api/v1/qa/metrics` - Get quality metrics

#### ML Models/Services

- [ ] Content freshness prediction
- [ ] Bias indicator detection
- [ ] Accuracy verification with fact-checking APIs

#### Tests to Write

- [ ] `tests/unit/qa/periodic-review.test.ts` - Scheduling tests
- [ ] `tests/unit/qa/accuracy-audit.test.ts` - Accuracy audit tests
- [ ] `tests/unit/qa/bias-audit.test.ts` - Bias audit tests
- [ ] `tests/integration/qa/audit-pipeline.test.ts` - Audit pipeline tests
- [ ] `tests/e2e/qa/quality-assurance.test.ts` - E2E QA process

---

### P4: Volunteer Management

**Complexity**: Medium
**Spec Reference**: `openspec/specs/oversight/spec.md`

#### Files/Modules to Create

- [ ] `src/services/volunteers/workload.service.ts` - Workload management
- [ ] `src/services/volunteers/recognition.service.ts` - Volunteer recognition
- [ ] `src/services/volunteers/wellness.service.ts` - Wellness support
- [ ] `src/services/volunteers/training.service.ts` - Volunteer training
- [ ] `src/models/volunteers/volunteer.model.ts` - Volunteer models
- [ ] `src/workers/volunteers/workload-balancer.worker.ts` - Workload balancing
- [ ] `src/notifications/volunteers/wellness-check.ts` - Wellness check notifications
- [ ] `src/templates/volunteers/certificates.ts` - Service certificate templates

#### Database Tables

- [ ] `volunteer_profiles` - Volunteer profiles
  - `id`, `user_id`, `volunteer_type`, `availability`, `max_hours_weekly`, `preferences`, `joined_at`
- [ ] `volunteer_workload` - Workload tracking
  - `id`, `volunteer_id`, `period_start`, `period_end`, `hours_worked`, `items_reviewed`, `difficult_content_count`
- [ ] `volunteer_recognition` - Recognition records
  - `id`, `volunteer_id`, `recognition_type`, `description`, `awarded_at`, `certificate_url`
- [ ] `volunteer_wellness_checks` - Wellness check records
  - `id`, `volunteer_id`, `check_date`, `response`, `action_taken`
- [ ] `volunteer_training` - Training records
  - `id`, `volunteer_id`, `training_module`, `started_at`, `completed_at`, `score`

#### API Endpoints

- [ ] `GET /api/v1/volunteers/profile` - Get volunteer profile
- [ ] `PUT /api/v1/volunteers/profile` - Update volunteer profile
- [ ] `GET /api/v1/volunteers/workload` - Get workload summary
- [ ] `PUT /api/v1/volunteers/availability` - Update availability
- [ ] `GET /api/v1/volunteers/recognition` - Get recognition history
- [ ] `POST /api/v1/volunteers/wellness/check-in` - Submit wellness check
- [ ] `GET /api/v1/volunteers/training/required` - Get required training
- [ ] `POST /api/v1/volunteers/break` - Request break

#### ML Models/Services

- [ ] Burnout risk prediction
- [ ] Optimal workload distribution
- [ ] Training recommendation engine

#### Tests to Write

- [ ] `tests/unit/volunteers/workload.test.ts` - Workload management tests
- [ ] `tests/unit/volunteers/recognition.test.ts` - Recognition system tests
- [ ] `tests/unit/volunteers/wellness.test.ts` - Wellness support tests
- [ ] `tests/integration/volunteers/volunteer-lifecycle.test.ts` - Lifecycle tests
- [ ] `tests/e2e/volunteers/volunteer-experience.test.ts` - E2E volunteer journey

---

## Group Q: Bias Detection, Admin Dashboards, Compliance

*Requires Group P completion. Features in this group can be developed in parallel.*

---

### Q1: Bias Detection System

**Complexity**: High
**Spec Reference**: `openspec/specs/analytics/spec.md`

#### Files/Modules to Create

- [ ] `src/services/bias/demographic-analyzer.service.ts` - Demographic analysis
- [ ] `src/services/bias/dif-detector.service.ts` - Differential Item Functioning
- [ ] `src/services/bias/remediation.service.ts` - Bias remediation
- [ ] `src/services/bias/monitoring.service.ts` - Continuous monitoring
- [ ] `src/ml/models/bias-detector/` - Bias detection models
- [ ] `src/analytics/bias/fairness-metrics.ts` - Fairness metric calculators
- [ ] `src/workers/bias/analyzer.worker.ts` - Background analysis
- [ ] `src/reports/bias/audit-report.ts` - Audit report generator

#### Database Tables

- [ ] `demographic_performance` - Performance by demographic
  - `id`, `content_id`, `demographic_category`, `demographic_value`, `performance_metrics`, `sample_size`, `calculated_at`
- [ ] `dif_analysis` - DIF analysis results
  - `id`, `question_id`, `reference_group`, `focal_group`, `dif_statistic`, `significance`, `flagged`, `analyzed_at`
- [ ] `bias_alerts` - Detected bias alerts
  - `id`, `source_type`, `source_id`, `bias_type`, `severity`, `details`, `status`, `detected_at`
- [ ] `bias_remediations` - Remediation records
  - `id`, `alert_id`, `remediation_type`, `action_taken`, `verified_by`, `completed_at`
- [ ] `fairness_metrics` - Platform fairness metrics
  - `id`, `metric_type`, `scope`, `value`, `threshold`, `status`, `calculated_at`

#### API Endpoints

- [ ] `GET /api/v1/bias/analysis/:contentId` - Get bias analysis
- [ ] `GET /api/v1/bias/dif/:questionId` - Get DIF analysis
- [ ] `GET /api/v1/bias/alerts` - Get bias alerts
- [ ] `PUT /api/v1/bias/alerts/:id/remediate` - Mark as remediated
- [ ] `GET /api/v1/bias/metrics` - Get fairness metrics
- [ ] `POST /api/v1/bias/analyze` - Trigger analysis
- [ ] `GET /api/v1/bias/reports` - Get bias audit reports

#### ML Models/Services

- [ ] Demographic disparity detection model
- [ ] DIF statistical analysis (Mantel-Haenszel, IRT-based)
- [ ] Language bias detection
- [ ] Cultural bias detection
- [ ] Automated remediation suggestion engine

#### Tests to Write

- [ ] `tests/unit/bias/demographic-analyzer.test.ts` - Demographic analysis tests
- [ ] `tests/unit/bias/dif-detector.test.ts` - DIF detection tests
- [ ] `tests/unit/bias/remediation.test.ts` - Remediation tests
- [ ] `tests/integration/bias/detection-pipeline.test.ts` - Full pipeline tests
- [ ] `tests/ml/bias/model-validation.test.ts` - Model validation tests
- [ ] `tests/e2e/bias/bias-audit.test.ts` - E2E bias audit

---

### Q2: Community Admin Dashboard

**Complexity**: Medium
**Spec Reference**: `openspec/specs/analytics/spec.md`

#### Files/Modules to Create

- [ ] `src/services/analytics/community-dashboard.service.ts` - Dashboard data
- [ ] `src/services/analytics/community-health.service.ts` - Health metrics
- [ ] `src/services/analytics/community-growth.service.ts` - Growth analytics
- [ ] `src/services/analytics/resource-utilization.service.ts` - Resource tracking
- [ ] `src/models/analytics/community-metrics.model.ts` - Metrics models
- [ ] `src/workers/analytics/community-aggregator.worker.ts` - Metrics aggregation
- [ ] `src/graphql/resolvers/analytics/community-dashboard.resolver.ts` - GraphQL resolvers
- [ ] `src/cache/analytics/dashboard-cache.ts` - Dashboard caching

#### Database Tables

- [ ] `community_health_metrics` - Community health tracking
  - `id`, `community_id`, `date`, `active_users`, `retention_rate`, `mentor_ratio`, `content_velocity`, `health_score`
- [ ] `community_growth_metrics` - Growth tracking
  - `id`, `community_id`, `date`, `new_members`, `churned_members`, `net_growth`, `acquisition_sources`
- [ ] `resource_utilization_metrics` - Resource usage
  - `id`, `community_id`, `date`, `mentor_hours_used`, `content_accessed`, `storage_used`, `api_calls`
- [ ] `community_benchmarks` - Benchmark data
  - `id`, `metric_type`, `percentile_25`, `percentile_50`, `percentile_75`, `updated_at`

#### API Endpoints

- [ ] `GET /api/v1/analytics/community/:id/dashboard` - Get dashboard data
- [ ] `GET /api/v1/analytics/community/:id/health` - Get health metrics
- [ ] `GET /api/v1/analytics/community/:id/growth` - Get growth analytics
- [ ] `GET /api/v1/analytics/community/:id/resources` - Get resource utilization
- [ ] `GET /api/v1/analytics/community/:id/benchmarks` - Get benchmarks
- [ ] `GET /api/v1/analytics/community/:id/alerts` - Get health alerts
- [ ] `GET /api/v1/analytics/community/:id/export` - Export analytics data

#### ML Models/Services

- [ ] Community health prediction
- [ ] Churn forecasting at community level
- [ ] Resource demand prediction

#### Tests to Write

- [ ] `tests/unit/analytics/community-dashboard.test.ts` - Dashboard data tests
- [ ] `tests/unit/analytics/community-health.test.ts` - Health metrics tests
- [ ] `tests/unit/analytics/community-growth.test.ts` - Growth analytics tests
- [ ] `tests/integration/analytics/community-analytics.test.ts` - Full analytics flow
- [ ] `tests/e2e/analytics/admin-dashboard.test.ts` - E2E dashboard tests

---

### Q3: Platform Admin Tools

**Complexity**: Medium
**Spec Reference**: `openspec/specs/analytics/spec.md`

#### Files/Modules to Create

- [ ] `src/services/admin/platform-dashboard.service.ts` - Platform-wide dashboard
- [ ] `src/services/admin/cross-community.service.ts` - Cross-community analytics
- [ ] `src/services/admin/algorithm-effectiveness.service.ts` - Algorithm effectiveness
- [ ] `src/services/admin/system-health.service.ts` - System health monitoring
- [ ] `src/services/admin/fraud-detection.service.ts` - Fraud indicators
- [ ] `src/models/admin/platform-metrics.model.ts` - Platform metrics models
- [ ] `src/workers/admin/platform-aggregator.worker.ts` - Platform aggregation
- [ ] `src/graphql/resolvers/admin/platform-dashboard.resolver.ts` - GraphQL resolvers

#### Database Tables

- [ ] `platform_metrics` - Platform-wide metrics
  - `id`, `date`, `total_users`, `total_communities`, `total_content`, `total_checkpoints`, `system_health`
- [ ] `cross_community_analytics` - Cross-community comparisons
  - `id`, `date`, `metric_type`, `community_rankings`, `outliers`, `trends`
- [ ] `algorithm_effectiveness` - Algorithm performance
  - `id`, `algorithm_id`, `date`, `effectiveness_score`, `improvement_trend`, `issues_detected`
- [ ] `fraud_indicators` - Fraud detection
  - `id`, `indicator_type`, `severity`, `affected_users`, `affected_communities`, `detected_at`, `resolved`
- [ ] `capacity_planning` - Capacity forecasts
  - `id`, `resource_type`, `current_usage`, `projected_usage`, `forecast_date`, `action_needed`

#### API Endpoints

- [ ] `GET /api/v1/admin/dashboard` - Get platform dashboard
- [ ] `GET /api/v1/admin/communities/compare` - Compare communities
- [ ] `GET /api/v1/admin/algorithms/effectiveness` - Get algorithm metrics
- [ ] `GET /api/v1/admin/system/health` - Get system health
- [ ] `GET /api/v1/admin/fraud/indicators` - Get fraud indicators
- [ ] `GET /api/v1/admin/capacity` - Get capacity planning
- [ ] `POST /api/v1/admin/broadcast` - Send platform broadcast

#### ML Models/Services

- [ ] Multi-community pattern detection
- [ ] Fraud ring detection
- [ ] Capacity prediction model

#### Tests to Write

- [ ] `tests/unit/admin/platform-dashboard.test.ts` - Dashboard tests
- [ ] `tests/unit/admin/cross-community.test.ts` - Cross-community tests
- [ ] `tests/unit/admin/fraud-detection.test.ts` - Fraud detection tests
- [ ] `tests/integration/admin/platform-analytics.test.ts` - Analytics flow
- [ ] `tests/e2e/admin/platform-admin.test.ts` - E2E admin tools

---

### Q4: Compliance & Audit

**Complexity**: Medium
**Spec Reference**: `openspec/specs/security/spec.md`

#### Files/Modules to Create

- [ ] `src/services/compliance/gdpr.service.ts` - GDPR compliance
- [ ] `src/services/compliance/ferpa.service.ts` - FERPA compliance
- [ ] `src/services/compliance/data-export.service.ts` - Data export
- [ ] `src/services/compliance/audit-report.service.ts` - Audit reporting
- [ ] `src/services/compliance/retention.service.ts` - Data retention
- [ ] `src/models/compliance/audit.model.ts` - Audit models
- [ ] `src/models/compliance/data-request.model.ts` - Data request models
- [ ] `src/workers/compliance/data-exporter.worker.ts` - Background export
- [ ] `src/workers/compliance/retention-enforcer.worker.ts` - Retention enforcement
- [ ] `src/templates/compliance/audit-report.template.ts` - Audit templates

#### Database Tables

- [ ] `data_subject_requests` - GDPR/privacy requests
  - `id`, `user_id`, `request_type`, `status`, `requested_at`, `completed_at`, `export_url`
- [ ] `compliance_audits` - Audit records
  - `id`, `audit_type`, `scope`, `auditor`, `findings`, `compliance_status`, `audit_date`
- [ ] `data_retention_policies` - Retention policies
  - `id`, `data_type`, `retention_period_days`, `deletion_strategy`, `active`
- [ ] `audit_trail` - Immutable audit trail
  - `id`, `action_type`, `actor_id`, `target_type`, `target_id`, `details`, `timestamp`
- [ ] `compliance_certifications` - Compliance certifications
  - `id`, `certification_type`, `issued_date`, `expires_date`, `certificate_url`, `status`

#### API Endpoints

- [ ] `POST /api/v1/compliance/data-request` - Submit data request
- [ ] `GET /api/v1/compliance/data-request/:id` - Get request status
- [ ] `GET /api/v1/compliance/data-export/:id` - Download export
- [ ] `GET /api/v1/compliance/audits` - Get audit history
- [ ] `POST /api/v1/compliance/audits` - Create audit record
- [ ] `GET /api/v1/compliance/retention-policies` - Get retention policies
- [ ] `GET /api/v1/compliance/certifications` - Get certifications
- [ ] `GET /api/v1/compliance/audit-trail` - Query audit trail

#### ML Models/Services

- [ ] PII detection for data export
- [ ] Compliance risk scoring
- [ ] Audit anomaly detection

#### Tests to Write

- [ ] `tests/unit/compliance/gdpr.test.ts` - GDPR compliance tests
- [ ] `tests/unit/compliance/ferpa.test.ts` - FERPA compliance tests
- [ ] `tests/unit/compliance/data-export.test.ts` - Export functionality tests
- [ ] `tests/unit/compliance/retention.test.ts` - Retention enforcement tests
- [ ] `tests/integration/compliance/data-request-flow.test.ts` - Request flow
- [ ] `tests/integration/compliance/audit-trail.test.ts` - Audit trail tests
- [ ] `tests/e2e/compliance/compliance-journey.test.ts` - E2E compliance

---

## Implementation Notes

### Development Guidelines

1. **Parallel Development**: Features within the same group can be developed concurrently
2. **Dependencies**: Each group depends on the completion of the previous group
3. **Testing**: All features must have unit, integration, and E2E tests before merging
4. **Documentation**: API documentation must be updated with each feature
5. **Security Review**: All features handling user data require security review

### ML Model Development

1. **Training Data**: Collect and label training data during Phase 2/3
2. **Baseline Models**: Start with simple rule-based approaches
3. **Iteration**: Improve models based on production feedback
4. **Monitoring**: All ML models must have performance monitoring

### Database Migrations

1. **Naming**: Use timestamp prefixes for migration files
2. **Rollback**: All migrations must have rollback scripts
3. **Data Migration**: Large data migrations should be done in batches

### API Versioning

1. **Version**: All new endpoints use `/api/v1/`
2. **Deprecation**: Minimum 6-month deprecation notice for breaking changes
3. **Documentation**: OpenAPI 3.0 specs for all endpoints

---

## Estimated Timeline

| Group | Features | Estimated Duration |
|-------|----------|-------------------|
| I | Analytics, Points, Matching Core | 4-6 weeks |
| J | Badges, Learner Dashboard, Match Flow, Push | 3-4 weeks |
| K | Peer Mentoring, Relationships, Streaks, Email/SMS | 4-5 weeks |
| L | Question Gen, Match ML, Personalization, Rewards | 6-8 weeks |
| M | Checkpoint Evolution, Predictions, Groups, Social | 5-6 weeks |
| N | Screening, Reporting, Committees | 4-5 weeks |
| O | Human Review, Oversight, Actions | 3-4 weeks |
| P | Algorithm Oversight, Transparency, QA, Volunteers | 4-5 weeks |
| Q | Bias Detection, Dashboards, Compliance | 4-5 weeks |

**Total Phase 3**: ~22-29 weeks
**Total Phase 4**: ~15-19 weeks
**Combined**: ~37-48 weeks (with parallel development)

---

*Document generated based on EduConnect Platform specifications.*
