# EduConnect - Agent Quick Start Guide

## How to Use This Roadmap with Agents

This guide explains how to implement EduConnect using multiple parallel agents.

---

## Step 1: Understand the Structure

```
ROADMAP.md          → High-level phases and parallel groups
TASKS.md            → Detailed tasks for Phase 1-2
TASKS-PHASE3-4.md   → Detailed tasks for Phase 3-4
openspec/specs/     → Detailed requirements (source of truth)
```

---

## Step 2: Assign Agents to Groups

Each **Group (A-Q)** can be implemented by one or more agents in parallel.

### Example Agent Assignment

```bash
# Phase 1 - Start 4 agents simultaneously:
Agent-1: "Implement Group A (Database Schema & Infrastructure)"
Agent-2: "Implement Group B (User Auth & API Gateway)"
Agent-3: "Implement Group C (Profiles, Communities, RBAC)"
Agent-4: "Implement Group D (Trust Networks, Audit Logging)"
```

---

## Step 3: Agent Prompt Templates

### For Foundation Features (Groups A-D)

```
You are implementing the EduConnect education platform.

Your task: Implement [GROUP LETTER]: [FEATURE NAME]

Instructions:
1. Read the spec at ~/educonnect-platform/openspec/specs/[SPEC]/spec.md
2. Check TASKS.md for the specific implementation checklist
3. Create all required files in the appropriate directories:
   - Backend code: src/
   - Database migrations: src/db/migrations/
   - Tests: src/__tests__/
4. Follow the conventions in AGENTS.md
5. Ensure all scenarios from the spec have corresponding tests

Tech stack: Node.js/TypeScript, Fastify, Prisma, PostgreSQL, Redis

Start by reading the spec, then implement each requirement systematically.
```

### For ML/AI Features (Groups I-M)

```
You are implementing ML services for the EduConnect education platform.

Your task: Implement [GROUP LETTER]: [FEATURE NAME]

Instructions:
1. Read the spec at ~/educonnect-platform/openspec/specs/[SPEC]/spec.md
2. Check TASKS-PHASE3-4.md for the specific implementation checklist
3. Create Python services in python-services/[service-name]/
4. Expose as FastAPI endpoints
5. Write comprehensive tests

Tech stack: Python, FastAPI, scikit-learn, transformers, PostgreSQL

Start by reading the spec, then implement each requirement systematically.
```

---

## Step 4: Dependency Rules

**CRITICAL**: Agents must respect these dependencies:

### Phase Dependencies
```
Phase 1 (Groups A-D)  →  Phase 2 (Groups E-H)  →  Phase 3 (Groups I-M)  →  Phase 4 (Groups N-Q)
```

### Within-Phase Dependencies
```
Group A → Group B → Group C → Group D
Group E → Group F → Group G → Group H
Group I → Group J → Group K → Group L → Group M
Group N → Group O → Group P → Group Q
```

### Cross-Feature Dependencies
- **Matching** needs: Users, Profiles, Curriculum, Checkpoints
- **Incentives** needs: Users, Checkpoints, Matching
- **Analytics** needs: All data-generating features
- **Oversight** needs: All features to review

---

## Step 5: Shared Resources

Agents working in parallel should be aware of shared resources:

### Database Tables
Each agent should only create tables in their domain:
- **Core**: users, communities, roles, permissions
- **Curriculum**: courses, modules, lessons, content
- **Checkpoints**: checkpoints, questions, responses, scores
- **Matching**: matches, relationships, sessions
- **Incentives**: points, badges, achievements
- **Analytics**: events, metrics, predictions

### API Namespaces
```
/api/v1/users/*        → Core agent
/api/v1/communities/*  → Core agent
/api/v1/content/*      → Curriculum agent
/api/v1/checkpoints/*  → Checkpoints agent
/api/v1/matching/*     → Matching agent
/api/v1/incentives/*   → Incentives agent
/api/v1/analytics/*    → Analytics agent
```

---

## Step 6: Testing Strategy

Each agent must write tests for their features:

```typescript
// Unit tests for business logic
describe('MatchingService', () => {
  it('should calculate compatibility score', () => {...})
  it('should respect capacity limits', () => {...})
})

// Integration tests for API endpoints
describe('POST /api/v1/matching/request', () => {
  it('should create match request', () => {...})
  it('should validate learner exists', () => {...})
})

// Scenario tests from specs
describe('Spec: Mentor-Learner Matching', () => {
  describe('Scenario: Initial Match Generation', () => {...})
  describe('Scenario: Capacity Management', () => {...})
})
```

---

## Step 7: Handoff Protocol

When an agent completes a group:

1. **Document**: Update relevant README files
2. **Test**: Ensure all tests pass
3. **Migrate**: Run database migrations
4. **Notify**: Mark group as complete in TASKS.md

---

## Example: Launching Phase 1

```bash
# Terminal 1 - Infrastructure Agent
claude "Implement EduConnect Group A: Set up PostgreSQL schema,
        Redis config, and project scaffolding per TASKS.md"

# Terminal 2 - Auth Agent
claude "Implement EduConnect Group B: User authentication with
        JWT and MFA support per core/spec.md and security/spec.md"

# Terminal 3 - Profiles Agent
claude "Implement EduConnect Group C: User profiles and community
        management per core/spec.md"

# Terminal 4 - Trust Agent
claude "Implement EduConnect Group D: Trust scoring and audit
        logging per security/spec.md"
```

---

## Feature Completion Checklist

For each feature, verify:

- [ ] All spec requirements implemented (SHALL statements)
- [ ] Database migrations created and tested
- [ ] API endpoints documented (OpenAPI/Swagger)
- [ ] Unit tests written (80%+ coverage)
- [ ] Integration tests for all scenarios
- [ ] Error handling implemented
- [ ] Logging added for observability
- [ ] Works offline (where applicable)
- [ ] Low-bandwidth optimized (where applicable)

---

## Troubleshooting

### Agent stuck on dependencies
```
Check ROADMAP.md for which groups must complete first.
Ensure database tables from prior groups exist.
```

### Conflicting database migrations
```
Use sequential migration numbering: 001_, 002_, etc.
Each group owns specific table namespaces.
```

### API conflicts
```
Each feature uses namespaced endpoints.
Check AGENTS.md for API conventions.
```

---

## Quick Commands

```bash
# Run all tests
npm test

# Run specific feature tests
npm test -- --grep "Matching"

# Check database status
npm run migrate:status

# Start development server
npm run dev

# Start Python services
cd python-services && uvicorn main:app --reload
```
