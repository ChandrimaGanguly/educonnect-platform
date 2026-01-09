# EduConnect Platform - Setup Guide

## Phase 1 Group A - Foundation Layer ✅

This guide helps you set up the EduConnect Platform development environment.

## Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- Python >= 3.11
- Docker and Docker Compose
- PostgreSQL 16 (or use Docker)
- Redis 7 (or use Docker)

## Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd educonnect-platform
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start services with Docker Compose**
   ```bash
   docker-compose up -d
   ```

   This will start:
   - PostgreSQL database (port 5432)
   - Redis cache (port 6379)
   - Node.js backend API (port 3000)
   - Python matching service (port 8001)
   - Python analytics service (port 8002)
   - Python checkpoint service (port 8003)
   - Python moderation service (port 8004)

4. **Run database migrations**
   ```bash
   npm run migrate
   ```

5. **Access the services**
   - Backend API: http://localhost:3000
   - Health check: http://localhost:3000/health
   - Readiness: http://localhost:3000/ready

## Local Development (without Docker)

### Backend Setup

1. **Install Node.js dependencies**
   ```bash
   npm install
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env
   # Configure your local PostgreSQL and Redis
   ```

3. **Run migrations**
   ```bash
   npm run migrate
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

### Python Services Setup

1. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run a service (example: matching)**
   ```bash
   cd python-services/matching
   SERVICE_NAME=matching python main.py
   ```

## Development Commands

### Backend (Node.js/TypeScript)

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
npm run lint         # Run ESLint
npm run lint:fix     # Fix linting issues
npm run format       # Format code with Prettier
npm run typecheck    # Run TypeScript type checking
npm run migrate      # Run database migrations
npm run migrate:rollback # Rollback last migration
```

### Python Services

```bash
# From python-services directory
black .              # Format code
flake8 .            # Lint code
isort .             # Sort imports
mypy <service>      # Type check
pytest              # Run tests
pytest --cov        # Run tests with coverage
```

## Database Migrations

The project uses Knex.js for database migrations.

### Create a new migration

```bash
npm run migrate:make <migration_name>
```

### Run migrations

```bash
npm run migrate
```

### Rollback last migration

```bash
npm run migrate:rollback
```

## Project Structure

```
educonnect-platform/
├── src/                      # Node.js backend source
│   ├── app.ts               # Fastify application setup
│   ├── index.ts             # Entry point
│   ├── config/              # Configuration
│   │   ├── env.ts          # Environment variables
│   │   ├── logger.ts       # Logging configuration
│   │   ├── redis.ts        # Redis client
│   │   ├── cache.ts        # Cache service
│   │   └── session.ts      # Session service
│   ├── database/            # Database setup
│   │   ├── connection.ts   # Database connection
│   │   └── migrations/     # Database migrations
│   └── test/               # Test utilities
│       ├── setup.ts        # Test setup
│       └── helpers.ts      # Test helpers
├── python-services/         # Python microservices
│   ├── shared/             # Shared utilities
│   │   ├── config.py       # Configuration
│   │   ├── database.py     # Database connection
│   │   └── redis_client.py # Redis client
│   ├── matching/           # Matching service
│   ├── analytics/          # Analytics service
│   ├── checkpoint/         # Checkpoint service
│   └── moderation/         # Moderation service
├── .github/workflows/       # CI/CD pipelines
│   ├── ci.yml              # Continuous Integration
│   └── deploy.yml          # Deployment
├── docker-compose.yml       # Docker services
├── Dockerfile.backend       # Backend Docker image
├── Dockerfile.python        # Python services Docker image
├── package.json            # Node.js dependencies
├── requirements.txt        # Python dependencies
├── tsconfig.json           # TypeScript configuration
├── jest.config.js          # Jest configuration
├── .eslintrc.js           # ESLint configuration
├── .prettierrc            # Prettier configuration
└── knexfile.ts            # Database configuration
```

## Testing

### Run all tests

```bash
# Backend tests
npm test

# Python services tests
cd python-services
pytest
```

### Coverage reports

```bash
# Backend coverage
npm run test:coverage
open coverage/index.html

# Python coverage
cd python-services
pytest --cov --cov-report=html
open htmlcov/index.html
```

## Linting and Formatting

### Backend

```bash
npm run lint        # Check for issues
npm run lint:fix    # Fix auto-fixable issues
npm run format      # Format all files
```

### Python

```bash
cd python-services
black .             # Format code
isort .            # Sort imports
flake8 .           # Lint
mypy <service>     # Type check
```

## Environment Variables

Key environment variables (see .env.example for all):

```bash
# Application
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://educonnect:changeme@localhost:5432/educonnect
DB_PASSWORD=changeme

# Redis
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production
SESSION_SECRET=your-session-secret-change-in-production
BCRYPT_ROUNDS=12

# Python Services
MATCHING_SERVICE_URL=http://localhost:8001
ANALYTICS_SERVICE_URL=http://localhost:8002
CHECKPOINT_SERVICE_URL=http://localhost:8003
MODERATION_SERVICE_URL=http://localhost:8004
```

## Troubleshooting

### Database connection issues

1. Ensure PostgreSQL is running
2. Check DATABASE_URL in .env
3. Verify database exists: `psql -U educonnect -d educonnect`

### Redis connection issues

1. Ensure Redis is running
2. Check REDIS_URL in .env
3. Test connection: `redis-cli ping`

### Docker issues

1. Rebuild images: `docker-compose build --no-cache`
2. Reset volumes: `docker-compose down -v && docker-compose up`
3. Check logs: `docker-compose logs -f <service_name>`

## Next Steps

Phase 1 Group A is complete! Ready to proceed with:
- **Group B**: User Account Management, Authentication System, API Gateway
- **Group C**: User Profiles, Community Management, RBAC
- **Group D**: Trust Networks, Audit Logging, Notifications

See ROADMAP.md for the complete implementation plan.
