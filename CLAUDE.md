# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EduConnect is a community-based educational social media platform designed to democratize access to quality education through peer-to-peer learning, mentor matching, and adaptive curriculum delivery. The platform is optimized for users in remote and underserved areas with limited connectivity (3G/4G).

**Core Mission**: Enable communities to build sustainable educational ecosystems where learners become mentors, knowledge flows bidirectionally, and practical skills are prioritized while maintaining alignment with formal education standards.

## Technology Stack

### Backend (Node.js/TypeScript)
- **Framework**: Fastify 4.x
- **Database**: PostgreSQL 14+ with Knex.js for migrations
- **Cache/Sessions**: Redis 7+
- **API**: GraphQL (Apollo Server) + REST
- **ORM**: Prisma (planned)
- **Authentication**: JWT via @fastify/jwt
- **Task Queue**: BullMQ

### Python Microservices (ML/AI)
- **Framework**: FastAPI
- **ML Libraries**: scikit-learn, transformers, fairlearn, aif360
- **Task Queue**: Celery with Redis broker
- **Services**: Matching (port 8001), Analytics (8002), Checkpoint (8003), Moderation (8004)

### Infrastructure
- **Deployment**: Docker Compose for development, Kubernetes-ready
- **Monitoring**: Prometheus + Grafana (optional profile)
- **Development Tools**: pgAdmin, Redis Commander (optional profile)

## Commands

### Development

```bash
# Install dependencies
npm install

# Run development server with hot reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Run production build
npm start

# Type checking without emitting files
npm run typecheck
```

### Database Management

```bash
# Run all pending migrations
npm run migrate

# Rollback last migration batch
npm run migrate:rollback

# Run database seeds
npm run seed

# Create new migration (manual - use knex CLI)
npx knex migrate:make migration_name
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Code Quality

```bash
# Run ESLint
npm run lint

# Fix ESLint issues automatically
npm run lint:fix

# Format code with Prettier
npm run format
```

### Docker Operations

```bash
# Start all services
docker-compose up -d

# Start with monitoring (Prometheus + Grafana)
docker-compose --profile monitoring up -d

# Start with development tools (pgAdmin + Redis Commander)
docker-compose --profile development up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f matching-service

# Stop all services
docker-compose down

# Rebuild services after code changes
docker-compose up -d --build
```

### Python Microservices

```bash
# Setup Python environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run individual services locally
cd python-services/matching
uvicorn main:app --reload --port 8001
```

## Architecture

### Service Architecture

The platform uses a **hybrid monolith + microservices** architecture:

1. **Node.js Backend** (Port 3000): Core platform services
   - User authentication and authorization
   - Community management
   - Content delivery
   - API gateway (GraphQL + REST)
   - Real-time features via Socket.io

2. **Python Microservices**: Specialized ML/AI services
   - **Matching Service** (8001): Mentor-learner compatibility scoring
   - **Analytics Service** (8002): Data processing and insights
   - **Checkpoint Service** (8003): Auto-generated assessments
   - **Moderation Service** (8004): Content safety and bias detection

3. **Worker Processes**:
   - **Node Worker**: Background jobs (emails, notifications, batch processing)
   - **Celery Worker**: Python ML tasks (async model inference, training)

### Data Layer

- **PostgreSQL**: Primary data store (users, communities, content, relationships)
- **Redis**:
  - Session storage
  - Cache layer
  - Task queue broker for BullMQ and Celery
  - Rate limiting state

### Frontend Communication

- **GraphQL**: Flexible querying for mobile apps (React Native)
- **REST**: Simple endpoints for specific operations
- **WebSocket**: Real-time updates (Socket.io)

### Key Architectural Principles

1. **Offline-First**: Core features work without connectivity, sync when online
2. **Low-Bandwidth Optimization**: 3G-friendly, progressive loading, text-first alternatives
3. **Privacy by Design**: Minimal data collection, community data sovereignty
4. **Trust-Based Security**: Community vouching, trust scores, progressive permissions
5. **Specification-Driven**: All features implement OpenSpec specifications

## Code Organization

```
src/
├── config/              # Environment configuration
│   ├── index.ts         # Main config aggregator
│   ├── redis.ts         # Redis connection config
│   ├── cache.ts         # Cache layer config
│   └── session.ts       # Session management config
├── database/            # Database layer
│   ├── connection.ts    # Knex connection and helpers
│   ├── index.ts         # Database exports
│   └── migrations/      # Knex migrations (timestamp-prefixed)
├── plugins/             # Fastify plugins
│   └── index.ts         # Plugin registration (CORS, JWT, Rate Limit, etc.)
├── routes/              # API routes
│   ├── index.ts         # Route registration
│   ├── health.ts        # Health check endpoints
│   └── auth.ts          # Authentication endpoints
└── index.ts             # Application entry point

openspec/                # Specification-driven development
├── project.md           # Project conventions
├── specs/               # Feature specifications
│   ├── core/            # User, community, role specs
│   ├── matching/        # Mentor-learner matching
│   ├── checkpoints/     # Learning assessments
│   ├── incentives/      # Points, badges, rewards
│   ├── curriculum/      # Content management
│   ├── oversight/       # Human oversight committees
│   ├── analytics/       # Data analytics
│   ├── security/        # Security systems
│   ├── mobile/          # Low-bandwidth optimization
│   ├── notifications/   # Notification system
│   └── content/         # Content moderation
├── changes/             # Proposed spec changes (deltas)
└── archive/             # Completed changes
```

## Development Workflow

### Specification-Driven Development

**ALL features must be implemented according to OpenSpec specifications in `openspec/specs/`**

#### Before Implementing Features:

1. **Read the relevant spec**: `openspec/specs/[feature]/spec.md`
2. **Understand requirement levels**:
   - `SHALL/MUST`: Mandatory requirement
   - `SHOULD`: Recommended but not mandatory
   - `MAY`: Optional feature
3. **Study scenarios**: Use GIVEN-WHEN-THEN format for acceptance criteria
4. **Check non-functional requirements**: Performance targets, constraints

#### When Making Changes:

1. Create change proposal in `openspec/changes/[change-name]/`
2. Include:
   - `proposal.md`: Rationale and scope
   - `tasks.md`: Implementation checklist
   - `specs/`: Delta changes to affected specs (ADDED/MODIFIED/REMOVED)

#### Implementation:

1. Implement according to spec requirements
2. Write tests covering all scenarios in the spec
3. Ensure 80%+ unit test coverage
4. Verify non-functional requirements (performance, security, accessibility)

### Database Migrations

- Use Knex.js for migrations (NOT Prisma migrations yet)
- Migrations are in `src/database/migrations/`
- Naming convention: `YYYYMMDDHHMMSS_description.ts`
- Always create both `up()` and `down()` functions
- Test rollbacks before committing

### Plugin Registration

Plugins are registered in `src/plugins/index.ts` in this order:
1. **Security**: Helmet (CSP headers)
2. **CORS**: Cross-origin configuration
3. **Compression**: Response compression
4. **JWT**: Authentication tokens
5. **Redis**: Cache connection
6. **Rate Limiting**: Request throttling
7. **Multipart**: File uploads
8. **Swagger**: API documentation

This order matters - don't reorder without understanding dependencies.

### Configuration Management

- Environment variables defined in `.env.example`
- Config centralized in `src/config/index.ts`
- Never commit `.env` files
- Use `config` object, not direct `process.env` access in application code

### Error Handling

- Fastify handles errors automatically
- Use HTTP status codes appropriately
- Log errors via Fastify's logger (Pino)
- Return structured error responses

### Security Considerations

1. **Trust Scores**: Users have trust scores that affect permissions
2. **Community Vouching**: New users must be vouched for by existing community members
3. **Rate Limiting**: All endpoints are rate-limited
4. **JWT**: Short-lived access tokens (15m), longer refresh tokens (7d)
5. **Input Validation**: Use Zod schemas for validation
6. **SQL Injection**: Use parameterized queries (Knex handles this)

### Testing Standards

- **Unit Tests**: 80% minimum coverage
- **Integration Tests**: All API endpoints
- **E2E Tests**: Critical user journeys (planned)
- **Accessibility Tests**: WCAG 2.1 AA compliance
- Test file naming: `*.test.ts` or `*.spec.ts`

### Code Style

- TypeScript strict mode enabled
- ESLint for linting
- Prettier for formatting
- No unused variables/parameters
- Explicit return types on functions
- Use `async/await` over promises

## Service URLs (Local Development)

| Service | URL | Description |
|---------|-----|-------------|
| Backend API | http://localhost:3000 | Main Node.js backend |
| Swagger Docs | http://localhost:3000/docs | API documentation |
| Matching Service | http://localhost:8001 | Mentor-learner matching ML |
| Analytics Service | http://localhost:8002 | Data analytics |
| Checkpoint Service | http://localhost:8003 | Assessment generation |
| Moderation Service | http://localhost:8004 | Content moderation |
| PostgreSQL | localhost:5432 | Database |
| Redis | localhost:6379 | Cache/sessions |
| Prometheus | http://localhost:9090 | Metrics (monitoring profile) |
| Grafana | http://localhost:3001 | Dashboards (monitoring profile) |
| pgAdmin | http://localhost:5050 | DB admin (development profile) |
| Redis Commander | http://localhost:8081 | Redis admin (development profile) |

## Key Domain Concepts

### Users and Communities

- **Users** belong to one or more **Communities**
- **Communities** are the primary organizational unit (not platform-wide)
- **Roles** are community-specific (learner, mentor, admin, etc.)
- **Trust scores** determine permissions within communities

### Mentoring Relationships

- **Learners** are matched with **Mentors** based on:
  - Skills and learning goals
  - Availability and time zones
  - Learning style compatibility
  - Historical success patterns
- **Peer Mentors**: Advanced learners who can guide beginners
- **Group Mentoring**: Study groups and cohorts

### Learning Content

- **Curriculum** hierarchy: Domain → Subject → Course → Module → Lesson
- **Checkpoints**: Assessments that validate learning progress
- **Adaptive Paths**: Content sequencing based on performance
- **Offline-First**: All content can be cached for offline access

### Incentive System

- **Points**: Learning points, mentor points, community points
- **Badges**: Tiered achievements (bronze, silver, gold)
- **Rewards**: Tangible benefits (certificates, opportunities)
- **Leaderboards**: Opt-in competitive elements

### Content Moderation

- **Automated Screening**: ML-based toxicity, spam, and bias detection
- **Community Reporting**: Users can flag inappropriate content
- **Oversight Committees**: Volunteer human reviewers
- **Transparency**: Public moderation statistics

## Implementation Status

The project is in **early development**. Currently implemented:

✅ **Phase 1 - Foundation** (Partial):
- Project scaffolding and Docker setup
- Database schema (users, communities, sessions tables)
- Fastify server with plugins (CORS, JWT, Rate Limit, Redis, Helmet)
- Health check endpoints
- Database connection and migration system
- Configuration management

🚧 **In Progress**:
- User authentication endpoints
- User profile management
- Community CRUD operations

📋 **Not Yet Started**:
- Python microservices
- GraphQL schema
- Mobile app
- ML/AI features
- Content management
- Checkpoint system
- Full specifications implementation

See `ROADMAP.md` for detailed phase planning and parallel implementation groups.

## Common Patterns

### Adding a New API Endpoint

1. Create route handler in `src/routes/[feature].ts`
2. Register route in `src/routes/index.ts`
3. Add Swagger/OpenAPI schema annotations
4. Implement service layer if complex logic needed
5. Write tests in `src/routes/[feature].test.ts`

### Adding a New Database Table

1. Create migration: `npx knex migrate:make create_[table]_table`
2. Implement `up()` and `down()` functions
3. Run migration: `npm run migrate`
4. Test rollback: `npm run migrate:rollback`

### Calling Python Microservices

```typescript
// Example: Call matching service from Node.js
const response = await fetch(
  `${config.matchingServiceUrl}/api/match`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ learnerId, mentorId })
  }
);
const matchScore = await response.json();
```

### Implementing Offline Support

1. Check `openspec/specs/mobile/spec.md` for requirements
2. Implement sync engine for data model
3. Handle conflict resolution (last-write-wins or merge)
4. Store sync state in Redis
5. Test with network disconnection

## Troubleshooting

### Database Connection Errors

- Verify PostgreSQL is running: `docker-compose ps`
- Check `DATABASE_URL` in `.env`
- Test connection: `npm run migrate`

### Redis Connection Errors

- Verify Redis is running: `docker-compose ps`
- Check `REDIS_URL` in `.env`
- Test with: `docker exec -it educonnect-redis redis-cli ping`

### Python Service Not Responding

- Services may need time to download ML models on first start
- Check logs: `docker-compose logs -f [service-name]`
- Verify service health: `curl http://localhost:8001/health`

### Migration Failures

- Check migration syntax
- Verify database is accessible
- Rollback and retry: `npm run migrate:rollback && npm run migrate`

## Additional Resources

- `README.md`: Installation and quick start
- `AGENTS.md`: AI assistant development guidelines
- `ROADMAP.md`: Implementation phases and task groups
- `DEPENDENCIES.md`: Dependency documentation and rationale
- `openspec/project.md`: OpenSpec conventions
- `openspec/specs/`: Feature specifications
