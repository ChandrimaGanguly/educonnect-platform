# EduConnect Platform - AI Agent Instructions

This document provides instructions for AI coding assistants working on the EduConnect platform.

## Project Overview

EduConnect is a community-based educational social media platform optimized for low-bandwidth environments. The platform enables mentor-learner matching, peer-to-peer mentoring, automated learning checkpoints, and incentive-driven engagement.

## Specification-Driven Development

This project uses **OpenSpec** for specification-driven development. All features must be implemented according to the specifications in `openspec/specs/`.

### Spec Directory Structure

```
openspec/
├── project.md              # Project overview and conventions
├── specs/
│   ├── core/spec.md        # User management, communities, roles
│   ├── matching/spec.md    # Mentor-learner matching system
│   ├── checkpoints/spec.md # Learning assessments and validation
│   ├── incentives/spec.md  # Points, badges, rewards
│   ├── curriculum/spec.md  # Content and curriculum management
│   ├── oversight/spec.md   # Human oversight committees
│   ├── analytics/spec.md   # Data analytics and adaptation
│   ├── security/spec.md    # Security and trust systems
│   ├── mobile/spec.md      # Low-bandwidth optimization
│   ├── notifications/spec.md # Notification system
│   └── content/spec.md     # Content moderation
├── changes/                # Proposed changes (delta specs)
└── archive/                # Completed changes
```

## Development Guidelines

### Before Implementing Features

1. **Read the relevant spec** in `openspec/specs/[feature]/spec.md`
2. **Understand the requirements** and scenarios defined
3. **Follow the SHALL/MUST language** - these are mandatory requirements
4. **Check non-functional requirements** for performance and quality targets

### When Making Changes

1. Create a change proposal in `openspec/changes/[change-name]/`
2. Include:
   - `proposal.md` - Rationale and scope
   - `tasks.md` - Implementation checklist
   - `specs/` - Delta changes to affected specs

### Code Conventions

- **Language**: TypeScript for all application code
- **Mobile**: React Native for cross-platform mobile development
- **Backend**: Node.js with Express or similar framework
- **Database**: PostgreSQL for relational data, Redis for caching
- **API**: GraphQL for flexible queries, REST where appropriate
- **Documentation**: OpenAPI 3.0 for API documentation

### Quality Standards

- **Test Coverage**: Minimum 80% unit test coverage
- **Accessibility**: WCAG 2.1 AA compliance
- **Performance**: Meet targets in mobile/spec.md
- **Security**: Follow guidelines in security/spec.md

### Key Architectural Principles

1. **Offline-First**: All core features must work offline
2. **Low-Bandwidth**: Optimize for 3G connections
3. **Privacy by Design**: Minimal data collection, maximum protection
4. **Community-Centric**: Communities are the primary organizational unit
5. **Trust-Based**: Security derives from community trust networks

## Spec Language Reference

- **SHALL/MUST**: Mandatory requirement
- **SHOULD**: Recommended but not mandatory
- **MAY**: Optional feature
- **GIVEN-WHEN-THEN**: Scenario format for acceptance criteria

## Common Tasks

### Adding a New Feature

1. Check if feature is covered in existing specs
2. If not, create new spec in `openspec/specs/[feature]/spec.md`
3. Create change proposal for implementation
4. Implement according to spec requirements
5. Ensure all scenarios are covered by tests

### Modifying Existing Features

1. Create change in `openspec/changes/[change-name]/`
2. Document spec delta (ADDED/MODIFIED/REMOVED requirements)
3. Get approval before implementation
4. Update implementation to match spec changes

### Bug Fixes

1. Identify which spec requirement is not being met
2. Fix implementation to match spec
3. Add regression test for the scenario
