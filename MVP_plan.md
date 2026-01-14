# EduConnect Platform - MVP Plan

## Executive Summary

This document defines a **Demo-Ready Minimum Viable Product (MVP)** for the EduConnect Platform - a community-based educational social media platform designed to democratize access to quality education through peer-to-peer learning and mentor matching.

**MVP Goal**: Demonstrate the core value proposition with a functional end-to-end user journey from registration through learning to mentor matching.

---

## MVP Definition

### What "Demo-Ready" Means

A demo-ready MVP should:

1. **Complete Core User Journey**: A user can register, join a community, browse content, complete assessments, and get matched with a mentor
2. **Functional (Not Production-Ready)**: Features work correctly but may lack polish, advanced error handling, or production-grade performance
3. **Demonstrable Value**: Clearly shows the platform's unique value proposition to stakeholders and potential users
4. **Stable**: No critical bugs that prevent demo flow completion
5. **Seed Data Available**: Pre-populated with realistic sample content for demonstrations

### MVP User Stories

| ID | User Story | Priority |
|----|------------|----------|
| US1 | As a learner, I can register an account and set up my profile | Critical |
| US2 | As a learner, I can browse and join communities | Critical |
| US3 | As a learner, I can browse educational content (courses, lessons) | Critical |
| US4 | As a learner, I can complete learning checkpoints and see my scores | Critical |
| US5 | As a learner, I can request mentor matching and see recommendations | Critical |
| US6 | As a mentor, I can respond to mentorship requests | High |
| US7 | As a user, I can access content offline and sync when connected | High |
| US8 | As an admin, I can create and manage community content | High |
| US9 | As a user, I can receive notifications about my learning progress | Medium |
| US10 | As a user, I can view my progress, points, and achievements | Medium |

---

## Roadmap Alignment

### Phase Coverage for MVP

| Phase | Status for MVP | Coverage |
|-------|----------------|----------|
| **Phase 1: Foundation** | Required 100% | All Groups A-D |
| **Phase 2: Content & Learning** | Required ~70% | Groups E-G (partial H) |
| **Phase 3: Intelligence & Engagement** | Required ~30% | Group I (basic matching only) |
| **Phase 4: Governance & Quality** | Deferred | Post-MVP |

### Critical Path to MVP

```
A1 → B1 → B2 → C1 → C2 → C3 → E1 → F1 → G1 → G2 → I3 → J3
     (DB)  (Auth)     (Users/Communities)  (Content)  (Checkpoints) (Matching)
```

---

## Current Implementation Status

### Phase 1: Foundation Layer

#### Group A: Infrastructure ✅ COMPLETE
| Feature | Status | Notes |
|---------|--------|-------|
| A1: Database Schema | ✅ Done | Users, communities, sessions, profiles, memberships, RBAC, trust, audit logs |
| A2: Project Scaffolding | ✅ Done | Node.js/Fastify, Python service stubs, Docker configs |
| A3: Development Tooling | ✅ Done | ESLint, Jest, CI/CD pipeline |

#### Group B: Authentication ✅ COMPLETE
| Feature | Status | Notes |
|---------|--------|-------|
| B1: User Account Management | ✅ Done | Registration, login, password recovery |
| B2: Authentication System | ✅ Done | JWT tokens, MFA support, session management |
| B3: Basic API Gateway | ✅ Done | REST endpoints, GraphQL schema started, rate limiting |

#### Group C: User & Community Management 🔶 PARTIAL
| Feature | Status | Notes |
|---------|--------|-------|
| C1: User Profile System | 🔶 Partial | Basic profile exists; missing profile setup wizard, skill self-assessment |
| C2: Community Management | 🔶 Partial | Schema exists; missing CRUD API routes, membership workflows |
| C3: Role-Based Access Control | 🔶 Partial | Schema and seeds exist; missing role assignment API, permission enforcement middleware |
| C4: Trust Score Foundation | ✅ Done | Trust service and community trust implemented |

#### Group D: Trust & Audit 🔶 PARTIAL
| Feature | Status | Notes |
|---------|--------|-------|
| D1: Inter-Community Trust Networks | ✅ Done | Community trust routes implemented |
| D2: Audit Logging System | ✅ Done | Audit service implemented |
| D3: Basic Notification Infrastructure | 🔶 Partial | Schema and basic routes exist; missing delivery mechanisms |

### Phase 2: Content & Learning Infrastructure

#### Group E: Content Structure 🔶 PARTIAL
| Feature | Status | Notes |
|---------|--------|-------|
| E1: Curriculum Structure | 🔶 Partial | Database schema exists; missing API routes for CRUD |
| E2: Content Storage & CDN | 🔶 Partial | Basic structure exists; missing CDN integration |
| E3: Low-Bandwidth Core | 🔶 Partial | Sync engine service exists; missing offline client implementation |

#### Group F: Content Authoring 🔶 PARTIAL
| Feature | Status | Notes |
|---------|--------|-------|
| F1: Content Authoring Tools | 🔶 Partial | Service exists; missing complete WYSIWYG integration |
| F2: Content Review Workflow | 🔶 Partial | Service and routes exist; needs completion |
| F3: Multi-Format Support | ✅ Done | Content handlers for text, video, audio, image, document, code, interactive |
| F4: Accessibility Compliance | ✅ Done | Accessibility service and checker implemented |

#### Group G: Checkpoints 🔶 PARTIAL
| Feature | Status | Notes |
|---------|--------|-------|
| G1: Checkpoint Types | 🔶 Partial | Service exists; missing full question type implementation |
| G2: Checkpoint Execution Engine | 🔶 Partial | Schema exists; missing session management, offline support |
| G3: Automated Scoring | 🔶 Partial | Service exists; needs completion |
| G4: Text-First Content Mode | ✅ Done | Service and routes implemented |

#### Group H: Learning Paths 🔴 NOT STARTED
| Feature | Status | Notes |
|---------|--------|-------|
| H1: Learning Path Engine | 🔴 Not Started | Needed for MVP |
| H2: Checkpoint Scheduling | 🔴 Not Started | Can defer partial |
| H3: Progression Logic | 🔴 Not Started | Needed for MVP |
| H4: PWA Implementation | 🔴 Not Started | Can defer to post-MVP |

### Phase 3: Intelligence & Engagement

#### Group I: Analytics & Matching 🔴 MOSTLY NOT STARTED
| Feature | Status | Notes |
|---------|--------|-------|
| I1: Analytics Data Collection | 🔴 Not Started | Can defer to post-MVP |
| I2: Points System Core | 🔴 Not Started | Can defer to post-MVP |
| I3: Basic Matching Algorithm | 🔴 Stub Only | Python service exists but returns empty; needs implementation |

---

## Outstanding Tasks for MVP

### Priority 1: Critical Path (Must Complete)

#### 1.1 Complete User Profile System (C1)
**Estimated Effort**: Medium

- [ ] Profile setup wizard API endpoints
- [ ] Skill self-assessment questionnaire
- [ ] Profile privacy settings API
- [ ] Profile completion percentage tracking
- [ ] Learning interests and goals storage

#### 1.2 Complete Community Management (C2)
**Estimated Effort**: Medium

- [ ] Community CRUD API routes (`POST/GET/PUT/DELETE /api/v1/communities`)
- [ ] Community membership API (join, leave, invite)
- [ ] Community configuration settings
- [ ] Community member listing and search
- [ ] Community discovery/browse endpoint

#### 1.3 Implement RBAC Middleware (C3)
**Estimated Effort**: Medium

- [ ] Permission check middleware for routes
- [ ] Role assignment API endpoints
- [ ] Community-specific role validation
- [ ] Permission inheritance logic
- [ ] Default role auto-assignment on community join

#### 1.4 Complete Curriculum API (E1)
**Estimated Effort**: High

- [ ] Domain CRUD API routes
- [ ] Subject CRUD API routes
- [ ] Course CRUD API routes
- [ ] Module CRUD API routes
- [ ] Lesson CRUD API routes
- [ ] Content hierarchy navigation API
- [ ] Content search/filter endpoints

#### 1.5 Complete Checkpoint Execution (G2)
**Estimated Effort**: High

- [ ] Checkpoint session initialization API
- [ ] Question delivery with pagination
- [ ] Response submission handling
- [ ] Checkpoint timer management
- [ ] Session completion and scoring trigger
- [ ] Result display API

#### 1.6 Implement Basic Matching Algorithm (I3)
**Estimated Effort**: High

- [ ] Mentor profile data model (skills, availability, capacity)
- [ ] Learner preference capture
- [ ] Compatibility scoring algorithm (subject expertise, availability overlap)
- [ ] Match recommendation endpoint (`POST /api/v1/matching/recommend`)
- [ ] Match request workflow (learner requests, mentor responds)
- [ ] Match confirmation and relationship creation

### Priority 2: High Priority (Complete for Good Demo)

#### 2.1 Learning Progress Tracking
**Estimated Effort**: Medium

- [ ] Progress tracking per course/module
- [ ] Completion status tracking
- [ ] Progress dashboard API endpoint
- [ ] Learning history retrieval

#### 2.2 Basic Learning Path (H1/H3 Minimal)
**Estimated Effort**: Medium

- [ ] Prerequisite definition storage
- [ ] Prerequisite check before content access
- [ ] Next recommended content API
- [ ] Content unlock on checkpoint pass

#### 2.3 Notification Delivery
**Estimated Effort**: Medium

- [ ] In-app notification list API
- [ ] Mark as read functionality
- [ ] New notification count API
- [ ] Basic notification triggers (checkpoint complete, match request)

#### 2.4 Mentor Response Flow
**Estimated Effort**: Medium

- [ ] Mentor dashboard endpoint (pending requests)
- [ ] Accept/decline mentorship request API
- [ ] Match finalization workflow
- [ ] Relationship status tracking

### Priority 3: Medium Priority (Nice to Have for Demo)

#### 3.1 Basic Points Display
**Estimated Effort**: Low

- [ ] Points balance in user profile
- [ ] Simple point award on checkpoint completion
- [ ] Points display on profile API

#### 3.2 Content Offline Preparation
**Estimated Effort**: Medium

- [ ] Content download manifest API
- [ ] Downloadable content packaging
- [ ] Sync status endpoint

#### 3.3 Demo Seed Data
**Estimated Effort**: Medium

- [ ] Sample communities (3-5)
- [ ] Sample courses with lessons (10+ lessons)
- [ ] Sample checkpoints with questions
- [ ] Sample users (learners and mentors)
- [ ] Sample mentor-learner relationships

---

## API Endpoints Required for MVP

### User & Profile APIs
```
POST   /api/v1/auth/register          ✅ Exists
POST   /api/v1/auth/login             ✅ Exists
POST   /api/v1/auth/refresh           ✅ Exists
GET    /api/v1/auth/me                ✅ Exists
PUT    /api/v1/users/profile          ❌ Needed
POST   /api/v1/users/skills           ❌ Needed
GET    /api/v1/users/:id/profile      ❌ Needed
```

### Community APIs
```
GET    /api/v1/communities            ❌ Needed
POST   /api/v1/communities            ❌ Needed
GET    /api/v1/communities/:id        ❌ Needed
PUT    /api/v1/communities/:id        ❌ Needed
POST   /api/v1/communities/:id/join   ❌ Needed
POST   /api/v1/communities/:id/leave  ❌ Needed
GET    /api/v1/communities/:id/members ❌ Needed
```

### Curriculum APIs
```
GET    /api/v1/domains                ❌ Needed
GET    /api/v1/subjects               ❌ Needed
GET    /api/v1/courses                ❌ Needed
GET    /api/v1/courses/:id            ❌ Needed
GET    /api/v1/courses/:id/modules    ❌ Needed
GET    /api/v1/modules/:id/lessons    ❌ Needed
GET    /api/v1/lessons/:id            ❌ Needed
POST   /api/v1/lessons/:id/complete   ❌ Needed
```

### Checkpoint APIs
```
GET    /api/v1/checkpoints/:id        🔶 Partial
POST   /api/v1/checkpoints/:id/start  ❌ Needed
GET    /api/v1/checkpoints/:id/questions ❌ Needed
POST   /api/v1/checkpoints/:id/submit ❌ Needed
GET    /api/v1/checkpoints/:id/results ❌ Needed
```

### Matching APIs
```
POST   /api/v1/matching/recommend     ❌ Needed (Python service stub)
POST   /api/v1/matching/request       ❌ Needed
GET    /api/v1/matching/requests      ❌ Needed
PUT    /api/v1/matching/requests/:id  ❌ Needed
GET    /api/v1/matching/relationships ❌ Needed
```

### Progress APIs
```
GET    /api/v1/progress               ❌ Needed
GET    /api/v1/progress/course/:id    ❌ Needed
GET    /api/v1/progress/dashboard     ❌ Needed
```

---

## Database Schema Status

### Existing Tables
- ✅ users
- ✅ user_profiles
- ✅ sessions
- ✅ communities
- ✅ community_memberships
- ✅ roles
- ✅ permissions
- ✅ role_permissions
- ✅ user_community_roles
- ✅ trust_scores
- ✅ trust_events
- ✅ community_trust
- ✅ audit_logs
- ✅ notifications
- ✅ domains (curriculum)
- ✅ subjects (curriculum)
- ✅ courses (curriculum)
- ✅ modules (curriculum)
- ✅ lessons (curriculum)
- ✅ checkpoint_templates
- ✅ question_banks
- ✅ content_items
- ✅ sync_queue
- ✅ sync_conflicts

### Tables Needed for MVP
- ❌ mentor_profiles (availability, capacity, subjects)
- ❌ match_requests
- ❌ mentorship_relationships
- ❌ checkpoint_sessions
- ❌ checkpoint_responses
- ❌ learning_progress
- ❌ skill_assessments

---

## MVP Timeline Phases

### Phase MVP-1: Complete Foundation (Groups C, D)
Complete user profiles, community management, RBAC middleware, and notification delivery.

**Deliverables**:
- User profile setup flow
- Community CRUD and membership
- Role-based permission enforcement
- Working notifications

### Phase MVP-2: Content Delivery (Groups E, G)
Complete curriculum API and checkpoint execution.

**Deliverables**:
- Browse domains → subjects → courses → modules → lessons
- Take checkpoints with multiple question types
- View scores and feedback

### Phase MVP-3: Mentor Matching (Group I)
Implement basic matching algorithm and workflow.

**Deliverables**:
- Mentor recommendation based on subject and availability
- Match request/response workflow
- Active relationship tracking

### Phase MVP-4: Integration & Polish
End-to-end testing, seed data, demo script preparation.

**Deliverables**:
- Full demo flow working
- Seed data for demonstrations
- Bug fixes and stabilization

---

## Demo Scenario Script

### Demo Flow (10-15 minutes)

1. **Registration & Profile Setup** (2 min)
   - New user registers
   - Completes profile with learning interests
   - Self-assesses skill level

2. **Community Discovery** (1 min)
   - Browse available communities
   - Join "Web Development" community

3. **Content Exploration** (3 min)
   - Browse curriculum: Technology → Programming → JavaScript Fundamentals
   - Open a lesson, view content
   - Complete lesson

4. **Assessment** (3 min)
   - Take end-of-module checkpoint
   - Answer 5 multiple choice questions
   - View score and feedback

5. **Mentor Matching** (3 min)
   - Request mentor for JavaScript
   - System shows 3 recommended mentors
   - Select and send request

6. **Mentor Perspective** (2 min)
   - Switch to mentor account
   - View pending request
   - Accept mentorship

7. **Relationship Established** (1 min)
   - Show confirmed mentor-learner relationship
   - Both parties see dashboard update

---

## Success Criteria

### MVP is complete when:

1. [ ] New user can register and complete profile setup
2. [ ] User can browse and join communities
3. [ ] User can navigate curriculum hierarchy (domain → lesson)
4. [ ] User can view lesson content
5. [ ] User can complete a checkpoint with scoring
6. [ ] User can request mentor matching
7. [ ] System returns mentor recommendations
8. [ ] Mentor can accept/decline requests
9. [ ] Relationship is established and visible
10. [ ] All APIs return valid responses (no 500 errors in demo flow)
11. [ ] Seed data exists for demonstration
12. [ ] Demo can be completed in under 15 minutes

---

## Technical Debt Accepted for MVP

The following are explicitly deferred to post-MVP:

1. **Offline-first PWA** - Backend ready but client-side not needed for demo
2. **Advanced matching ML** - Simple rule-based matching sufficient for MVP
3. **Points and gamification** - Optional display only, no full system
4. **Content moderation** - Trust manual curation for demo
5. **Email/SMS notifications** - In-app only for MVP
6. **Analytics and reporting** - Deferred entirely
7. **Oversight committees** - Post-MVP feature
8. **Advanced accessibility** - Basic WCAG compliance only
9. **Bias detection** - Post-MVP
10. **Performance optimization** - Functional correctness first

---

## Appendix: File Locations

### Key Implementation Files
- Auth routes: `src/routes/auth.ts`
- Routes index: `src/routes/index.ts`
- User service: `src/services/user.service.ts`
- Community service: `src/services/community.service.ts`
- RBAC service: `src/services/rbac.service.ts`
- Checkpoint service: `src/services/checkpoint-types.service.ts`
- Matching service (Python): `python-services/matching/main.py`

### Database Migrations
- Location: `src/database/migrations/`
- Curriculum: `20260109130001_create_curriculum_structure.ts`
- Checkpoints: `20260110000001_create_checkpoint_types.ts`

### GraphQL Schema
- Schema: `src/graphql/schema.ts`
- Resolvers: `src/graphql/resolvers.ts`

### Specifications Reference
- Core: `openspec/specs/core/spec.md`
- Matching: `openspec/specs/matching/spec.md`
- Checkpoints: `openspec/specs/checkpoints/spec.md`
- Curriculum: `openspec/specs/curriculum/spec.md`

---

*Last Updated: January 2026*
*Version: 1.0*
