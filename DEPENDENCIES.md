# EduConnect Platform - Dependency Guide

This document explains the dependency files and technology stack for the EduConnect platform.

## Technology Stack Overview

EduConnect uses a **hybrid architecture** with two primary technology stacks:

1. **Node.js/TypeScript** - Main application backend, API services, real-time features
2. **Python** - ML/AI microservices, analytics, content processing

---

## Node.js/TypeScript Stack (`package.json`)

### Core Framework
- **Fastify** - High-performance web framework (faster than Express)
- **GraphQL** - Flexible API queries for bandwidth optimization
- **Socket.io** - Real-time bidirectional communication

### Database & Caching
- **Prisma** - Modern ORM with type safety
- **PostgreSQL** (pg) - Primary relational database
- **Redis** (ioredis) - Caching and session management
- **Knex** - SQL query builder for migrations

### Authentication & Security
- **bcrypt** - Password hashing
- **jsonwebtoken** - JWT authentication
- **@fastify/jwt** - JWT integration
- **@fastify/helmet** - Security headers
- **@fastify/rate-limit** - API rate limiting

### File Processing
- **sharp** - High-performance image processing
- **@fastify/multipart** - File upload handling

### Background Jobs
- **BullMQ** - Redis-based job queue for async tasks

### Utilities
- **zod** - Runtime type validation
- **luxon/date-fns** - Date/time handling
- **nanoid/uuid** - Unique ID generation

### Development Tools
- **TypeScript** - Type safety
- **Jest** - Testing framework
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **ts-node/nodemon** - Development server

---

## Python Stack (`requirements.txt`)

### Purpose by Module

#### 1. **Matching Algorithm Service** (matching spec)
```
scikit-learn      # ML algorithms for compatibility scoring
numpy, pandas     # Data processing
scipy             # Optimization algorithms
implicit          # Collaborative filtering
sentence-transformers  # Semantic similarity
```

**What it does:**
- Calculates multi-dimensional compatibility scores
- Learns from successful matches
- Predicts match success probability

---

#### 2. **Checkpoint Generation Service** (checkpoints spec)
```
transformers      # Question generation from content
spacy, nltk       # NLP processing
openai/anthropic  # AI content generation (optional)
```

**What it does:**
- Auto-generates questions from learning materials
- Calibrates difficulty using IRT
- Detects bias in assessments

---

#### 3. **Analytics Service** (analytics spec)
```
pandas, numpy     # Data analysis
scikit-learn      # Predictive models
statsmodels       # Statistical analysis
matplotlib, seaborn  # Visualization
fairlearn, aif360    # Bias detection
```

**What it does:**
- Dropout prediction
- Performance analytics
- Bias detection in algorithms
- A/B testing analysis

---

#### 4. **Content Moderation Service** (content spec)
```
detoxify          # Toxicity detection
Pillow, opencv    # Image moderation
transformers      # Text classification
```

**What it does:**
- Automated content screening
- Hate speech detection
- Image safety verification

---

#### 5. **Recommendation Engine**
```
surprise          # Collaborative filtering
implicit          # Matrix factorization
networkx          # Social graph analysis
```

**What it does:**
- Content recommendations
- Learning path suggestions
- Community suggestions

---

#### 6. **Core Python Services**
```
fastapi           # API framework for microservices
celery            # Background task processing
redis, psycopg2   # Database connectivity
httpx, aiohttp    # Async HTTP clients
```

**What it does:**
- Exposes ML models as REST APIs
- Processes background analytics jobs
- Communicates with main Node.js backend

---

## Service Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Mobile Apps                         │
│              (React Native - iOS/Android)               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Node.js/TypeScript Backend                 │
│  • User Management (core spec)                          │
│  • Community Management (core spec)                     │
│  • Real-time Communications                             │
│  • Content Delivery (curriculum spec)                   │
│  • Incentives System (incentives spec)                  │
└────────┬────────────────────────────────────────────────┘
         │
         ├──────────────────┬──────────────────┬─────────────┐
         ▼                  ▼                  ▼             ▼
┌─────────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Matching ML   │  │  Analytics  │  │  Checkpoint │  │  Moderation │
│    Service      │  │   Service   │  │  Generator  │  │   Service   │
│   (Python)      │  │  (Python)   │  │  (Python)   │  │  (Python)   │
└─────────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
         │                  │                  │                │
         └──────────────────┴──────────────────┴────────────────┘
                            ▼
                    ┌───────────────┐
                    │  PostgreSQL   │
                    │     Redis     │
                    └───────────────┘
```

---

## Installation

### Node.js Services
```bash
cd educonnect-platform
npm install
npm run dev
```

### Python Services
```bash
cd educonnect-platform
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

---

## Why This Architecture?

### Node.js for Main Backend
✅ **Fast** - Event-driven, non-blocking I/O
✅ **TypeScript** - Type safety prevents bugs
✅ **Ecosystem** - Rich library ecosystem
✅ **Real-time** - Native WebSocket support
✅ **Mobile-friendly** - Same language as React Native

### Python for ML/AI Services
✅ **ML Libraries** - Best-in-class ML/AI ecosystem
✅ **Data Science** - Superior data processing tools
✅ **NLP** - Best transformers/LLM integration
✅ **Fairness** - Mature bias detection libraries
✅ **Performance** - NumPy/SciPy are highly optimized

### Hybrid Benefits
- **Separation of Concerns** - Each service uses optimal tech
- **Independent Scaling** - Scale ML services separately
- **Team Flexibility** - Different teams can work independently
- **Cost Optimization** - Run expensive ML only when needed

---

## Optional Dependencies

Some dependencies are marked optional in comments:

### For Advanced Matching
```bash
pip install torch==2.1.2  # Deep learning for neural matching
```

### For Cloud Services
```bash
pip install google-cloud-dlp  # Google Cloud PII detection
```

### For Additional AI Models
```bash
pip install openai anthropic  # Commercial AI APIs
```

---

## Low-Bandwidth Optimization

Per the mobile spec requirements, several libraries support low-bandwidth:

- **Brotli** (Python) - Better compression than gzip
- **@fastify/compress** (Node) - Response compression
- **sharp** (Node) - Efficient image optimization
- **opencv-python-headless** (Python) - Video compression

---

## Security Stack

- **Cryptography** (Python) - Encryption at rest
- **@fastify/helmet** (Node) - Security headers
- **@fastify/rate-limit** (Node) - DoS protection
- **passlib** (Python) - Password hashing
- **bcrypt** (Node) - Password hashing

---

## Monitoring & Observability

- **prometheus-client** (Python) - Metrics export
- **sentry-sdk** (Python/Node) - Error tracking
- **pino** (Node) - Structured logging
- **structlog** (Python) - Structured logging

---

## Next Steps

1. Set up Docker containers for each service
2. Configure PostgreSQL and Redis
3. Set up CI/CD pipelines
4. Deploy to cloud (AWS/GCP/Azure)
5. Configure monitoring and alerting
