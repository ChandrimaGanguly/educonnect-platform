# EduConnect Platform - Architecture Design Decisions

> **Document Version**: 1.0
> **Last Updated**: January 2026
> **Status**: Living Document

This document records the architectural decisions made for the EduConnect platform, including alternatives considered, trade-offs evaluated, and rationale for final choices. Each decision is accompanied by architecture diagrams where relevant.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Context](#2-system-context)
3. [Decision 1: Service Architecture Pattern](#3-decision-1-service-architecture-pattern)
4. [Decision 2: Database Architecture](#4-decision-2-database-architecture)
5. [Decision 3: API Design Strategy](#5-decision-3-api-design-strategy)
6. [Decision 4: ML/AI Service Architecture](#6-decision-4-mlai-service-architecture)
7. [Decision 5: Caching Strategy](#7-decision-5-caching-strategy)
8. [Decision 6: Authentication & Session Management](#8-decision-6-authentication--session-management)
9. [Decision 7: Offline-First Architecture](#9-decision-7-offline-first-architecture)
10. [Decision 8: Real-Time Communication](#10-decision-8-real-time-communication)
11. [Decision 9: Message Queue & Background Jobs](#11-decision-9-message-queue--background-jobs)
12. [Decision 10: Content Delivery Strategy](#12-decision-10-content-delivery-strategy)
13. [Recommendations & Action Items](#13-recommendations--action-items)
    - [13.3 Architecture Evolution Path for 1 Million Users](#133-architecture-evolution-path-for-1-million-users)
    - [13.4 Scaling Triggers and Actions](#134-scaling-triggers-and-actions)
    - [13.5 Cost Estimation by Phase](#135-cost-estimation-by-phase)
    - [13.6 Specific Scalability Recommendations](#136-specific-scalability-recommendations)
14. [Appendix: Architecture Diagrams](#14-appendix-architecture-diagrams)

---

## 1. Executive Summary

EduConnect is a community-based educational platform optimized for low-bandwidth environments. After thorough analysis of the current architecture against requirements and alternatives, our assessment is:

### Overall Verdict: **Current Architecture is Sound with Minor Optimizations Needed**

| Decision Area | Current Choice | Assessment | Action |
|---------------|----------------|------------|--------|
| Service Architecture | Hybrid Monolith + Microservices | **Optimal** | Keep |
| Database | PostgreSQL + Knex | **Good** | Keep |
| API Design | GraphQL + REST | **Good** | Minor refinement |
| ML/AI Services | Python Microservices | **Optimal** | Keep |
| Caching | Redis | **Good** | Enhance strategy |
| Auth/Sessions | JWT + DB Sessions | **Good** | Keep |
| Offline-First | Sync Engine | **Good** | Complete implementation |
| Real-Time | Socket.io | **Good** | Keep |
| Message Queue | BullMQ + Celery | **Good** | Keep |
| Content Delivery | Multi-format + CDN | **Good** | Complete CDN setup |

**Key Finding**: The architecture is well-suited for the platform's requirements and **can scale to 1 million users** with the evolution path outlined in this document. No major architectural changes are recommended. Focus should be on completing the implementation and preparing for scale.

### Scalability Assessment Summary (Target: 1M Users)

| Component | Current Capacity | 1M User Capacity | Required Changes |
|-----------|------------------|------------------|------------------|
| Backend (Fastify) | 10K concurrent | 100K concurrent | Horizontal scaling (10+ instances) |
| PostgreSQL | 100K users | 1M users | Read replicas + Connection pooling (PgBouncer) |
| Redis | 10K concurrent | 100K concurrent | Redis Cluster (6 nodes) |
| ML Services | 1K req/min | 10K req/min | Auto-scaling + GPU instances |
| CDN | N/A | Global | CloudFlare Enterprise |
| WebSocket | 5K connections | 50K connections | Redis adapter + multiple instances |

---

## 2. System Context

### 2.1 Platform Mission

EduConnect democratizes education through peer-to-peer learning, mentor matching, and adaptive curriculum delivery, optimized for users in remote areas with limited connectivity (3G/4G).

### 2.2 Key Constraints

| Constraint | Impact |
|------------|--------|
| Low Bandwidth (3G/4G) | Must minimize data transfer, support offline |
| Remote Users | Intermittent connectivity, high latency tolerance |
| Community-Centric | Data sovereignty per community |
| ML/AI Features | Matching, content generation, moderation |
| Multi-Platform | Web, PWA, iOS, Android |
| **Scale Target** | **1,000,000 total users, 100,000 concurrent** |

### 2.3 Current System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           EDUCONNECT PLATFORM ARCHITECTURE                       │
└─────────────────────────────────────────────────────────────────────────────────┘

                                    ┌──────────────┐
                                    │   CLIENTS    │
                                    ├──────────────┤
                                    │ React Native │
                                    │   iOS App    │
                                    │ Android App  │
                                    │   PWA/Web    │
                                    └──────┬───────┘
                                           │
                                           │ HTTPS
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              LOAD BALANCER / CDN                                 │
│                          (CloudFlare / AWS CloudFront)                           │
└─────────────────────────────────────────────────────────────────────────────────┘
                                           │
            ┌──────────────────────────────┼──────────────────────────────┐
            │                              │                              │
            ▼                              ▼                              ▼
┌───────────────────┐        ┌───────────────────┐        ┌───────────────────┐
│   REST ENDPOINTS  │        │  GRAPHQL ENDPOINT │        │  WEBSOCKET (WS)   │
│   /api/v1/*       │        │     /graphql      │        │    Socket.io      │
└─────────┬─────────┘        └─────────┬─────────┘        └─────────┬─────────┘
          │                            │                            │
          └────────────────────────────┼────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        NODE.JS BACKEND (Fastify 4.x)                            │
│                              Port 3000                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                           PLUGIN LAYER                                   │    │
│  │  ┌─────────┐ ┌──────┐ ┌────────┐ ┌─────┐ ┌───────────┐ ┌───────────┐   │    │
│  │  │ Helmet  │ │ CORS │ │Compress│ │ JWT │ │Rate Limit │ │ Multipart │   │    │
│  │  └─────────┘ └──────┘ └────────┘ └─────┘ └───────────┘ └───────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                           ROUTE LAYER                                    │    │
│  │  /auth  /content  /communities  /notifications  /checkpoints  /health   │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                          SERVICE LAYER                                   │    │
│  │  UserService │ CommunityService │ ContentService │ TrustService │ ...   │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
          │                              │                              │
          │ Knex.js                       │ ioredis                      │ HTTP
          ▼                              ▼                              ▼
┌───────────────────┐        ┌───────────────────┐        ┌───────────────────┐
│    PostgreSQL     │        │      Redis        │        │  PYTHON SERVICES  │
│    Primary DB     │        │   Cache/Sessions  │        │   (FastAPI)       │
│                   │        │   Rate Limiting   │        │                   │
│  ┌─────────────┐  │        │   Pub/Sub         │        │  ┌─────────────┐  │
│  │ 30+ Tables  │  │        │                   │        │  │  Matching   │  │
│  │   Users     │  │        └───────────────────┘        │  │  :8001      │  │
│  │Communities  │  │                                     │  ├─────────────┤  │
│  │  Content    │  │                                     │  │  Analytics  │  │
│  │Checkpoints  │  │                                     │  │  :8002      │  │
│  │   Trust     │  │                                     │  ├─────────────┤  │
│  │   Sync      │  │                                     │  │ Checkpoint  │  │
│  └─────────────┘  │                                     │  │  :8003      │  │
└───────────────────┘                                     │  ├─────────────┤  │
                                                          │  │ Moderation  │  │
                                                          │  │  :8004      │  │
                                                          │  └─────────────┘  │
                                                          └───────────────────┘
          │
          │ BullMQ                              │ Celery
          ▼                                     ▼
┌───────────────────┐                ┌───────────────────┐
│   NODE WORKER     │                │   CELERY WORKER   │
│  Background Jobs  │                │   ML/AI Tasks     │
│  - Emails         │                │  - Model Training │
│  - Notifications  │                │  - Batch Scoring  │
│  - Batch Process  │                │  - Content Gen    │
└───────────────────┘                └───────────────────┘
```

---

## 3. Decision 1: Service Architecture Pattern

### 3.1 Context

The platform requires handling both traditional web operations (auth, CRUD) and compute-intensive ML/AI operations (matching, content moderation, assessment generation).

### 3.2 Alternatives Considered

#### Option A: Pure Monolith

```
┌─────────────────────────────────────────────────────┐
│                  SINGLE APPLICATION                  │
│  ┌───────────────────────────────────────────────┐  │
│  │  Node.js Backend (Everything)                 │  │
│  │  - Auth, CRUD, ML (via TensorFlow.js)        │  │
│  │  - All business logic                         │  │
│  │  - Background jobs (in-process)               │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

| Pros | Cons |
|------|------|
| Simple deployment | ML libraries limited in Node.js |
| Easy debugging | Single point of failure |
| No network latency between services | Can't scale ML independently |
| Single codebase | Blocks event loop during ML ops |

#### Option B: Full Microservices

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│   Auth   │ │Community │ │ Content  │ │Checkpoint│ │Matching  │
│ Service  │ │ Service  │ │ Service  │ │ Service  │ │ Service  │
└────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘
     │            │            │            │            │
     └────────────┴────────────┴────────────┴────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   Message Broker   │
                    │   (RabbitMQ/Kafka) │
                    └───────────────────┘
```

| Pros | Cons |
|------|------|
| Independent scaling | Complex deployment (K8s needed) |
| Technology freedom per service | Service discovery overhead |
| Fault isolation | Distributed tracing complexity |
| Team autonomy | Data consistency challenges |
| | Higher operational cost |

#### Option C: Hybrid Monolith + Microservices (CURRENT)

```
┌─────────────────────────────────────────────────────┐
│               NODE.JS BACKEND MONOLITH              │
│  ┌───────────────────────────────────────────────┐  │
│  │  Core Platform Services                       │  │
│  │  - Auth, Users, Communities                   │  │
│  │  - Content Management                         │  │
│  │  - Sessions, Notifications                    │  │
│  │  - Sync Engine                                │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────┘
                      │ HTTP (REST)
    ┌─────────────────┼─────────────────┐
    │                 │                 │
    ▼                 ▼                 ▼
┌────────┐      ┌──────────┐      ┌──────────┐
│Matching│      │Checkpoint│      │Moderation│
│(Python)│      │ (Python) │      │ (Python) │
└────────┘      └──────────┘      └──────────┘
```

| Pros | Cons |
|------|------|
| Optimal language per domain | Some network latency to ML services |
| ML services scale independently | Two deployment patterns |
| Core platform is simple to debug | Need to manage Python dependencies |
| Reduced operational complexity | |
| Best ML library ecosystem (Python) | |

### 3.3 Decision

**CHOSEN: Option C - Hybrid Monolith + Microservices**

### 3.4 Rationale

1. **Language Optimization**: Python has the best ML/AI ecosystem (scikit-learn, transformers, fairlearn). Node.js excels at I/O-bound web operations.

2. **Scaling Characteristics**:
   - Core platform: I/O bound, needs connection pooling → Node.js monolith efficient
   - ML services: CPU/GPU bound, stateless → Independent scaling beneficial

3. **Team Structure**: Allows separate ML engineering and platform engineering without complex service boundaries.

4. **Operational Simplicity**: Only 5 services to manage (1 monolith + 4 ML services) vs. potentially 15+ true microservices.

5. **Requirements Fit**:
   - Core spec requirements (auth, CRUD) → Monolith handles efficiently
   - ML spec requirements (matching algorithm, bias detection) → Python services handle optimally

### 3.5 Verdict: **NO CHANGE NEEDED**

The current hybrid architecture is the optimal choice for EduConnect's requirements.

---

## 4. Decision 2: Database Architecture

### 4.1 Context

The platform manages relational data (users, communities, roles), document-like data (content, profiles), and time-series data (analytics, audit logs).

### 4.2 Alternatives Considered

#### Option A: PostgreSQL Only (CURRENT)

```
┌─────────────────────────────────────────────────────┐
│                    PostgreSQL 16                     │
│  ┌─────────────────────────────────────────────────┐│
│  │ RELATIONAL DATA                                 ││
│  │ users, communities, roles, permissions          ││
│  ├─────────────────────────────────────────────────┤│
│  │ JSONB COLUMNS (Document-like)                   ││
│  │ user_profiles.metadata, community.settings      ││
│  ├─────────────────────────────────────────────────┤│
│  │ TIME-SERIES (with partitioning)                 ││
│  │ audit_logs, analytics_events                    ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

| Pros | Cons |
|------|------|
| Single database to manage | Large time-series may need optimization |
| ACID transactions | JSONB less efficient than native document DB |
| Excellent tooling | Horizontal scaling complex (read replicas) |
| JSONB supports flexible schemas | |
| Strong consistency | |

#### Option B: Polyglot Persistence

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  PostgreSQL  │   │   MongoDB    │   │  TimescaleDB │
│  Relational  │   │   Documents  │   │  Time-Series │
│  users       │   │   profiles   │   │  audit_logs  │
│  communities │   │   content    │   │  analytics   │
│  roles       │   │   settings   │   │              │
└──────────────┘   └──────────────┘   └──────────────┘
```

| Pros | Cons |
|------|------|
| Optimized storage per data type | 3 databases to manage |
| Each DB excels at its purpose | Distributed transactions complex |
| Horizontal scaling per DB | Increased operational overhead |
| | Higher infrastructure cost |
| | Data sync complexity |

#### Option C: PostgreSQL + Redis (Enhanced CURRENT)

```
┌─────────────────────────────────────────────────────┐
│                    PostgreSQL 16                     │
│          (Primary Data Store - All Tables)          │
└──────────────────────────┬──────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────┐
│                       Redis                          │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │   Sessions  │ │    Cache     │ │   Pub/Sub    │  │
│  │  (15m TTL)  │ │ (Query Cache)│ │  (Real-time) │  │
│  └─────────────┘ └──────────────┘ └──────────────┘  │
└─────────────────────────────────────────────────────┘
```

| Pros | Cons |
|------|------|
| PostgreSQL handles all persistence | Redis adds operational overhead |
| Redis accelerates hot paths | Cache invalidation complexity |
| Simple consistency model | |
| Proven at scale | |

### 4.3 Decision

**CHOSEN: Option C - PostgreSQL + Redis (Current Architecture)**

### 4.4 Rationale

1. **Data Relationships**: EduConnect has highly relational data (users belong to communities, have roles, trust relationships). PostgreSQL handles this natively.

2. **JSONB Capabilities**: PostgreSQL's JSONB provides sufficient flexibility for semi-structured data (profile metadata, community settings) without needing MongoDB.

3. **Offline Sync Requirements**: The sync engine needs strong ACID guarantees for conflict resolution. PostgreSQL excels here.

4. **Operational Simplicity**: One primary database reduces complexity for backup, failover, and monitoring.

5. **Redis Complement**: Redis accelerates hot paths (sessions, rate limiting, cache) without requiring data migration.

### 4.5 Potential Optimization: Table Partitioning

For audit_logs and analytics tables that will grow large:

```sql
-- Consider adding this for audit_logs (future optimization)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    ...
) PARTITION BY RANGE (created_at);

CREATE TABLE audit_logs_2026_q1 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
```

### 4.6 Verdict: **NO CHANGE NEEDED**

Current PostgreSQL + Redis architecture is optimal. Consider table partitioning for time-series tables as data grows.

---

## 5. Decision 3: API Design Strategy

### 5.1 Context

The platform serves:
- Mobile apps (React Native) with varying connectivity
- Web application (PWA)
- Future third-party integrations

### 5.2 Alternatives Considered

#### Option A: REST Only

```
GET    /api/v1/users/:id
POST   /api/v1/auth/login
PUT    /api/v1/communities/:id
DELETE /api/v1/content/:id

+ Swagger/OpenAPI Documentation
```

| Pros | Cons |
|------|------|
| Simple, well-understood | Over-fetching on mobile |
| Cacheable (HTTP caching) | Multiple requests for related data |
| Great tooling | N+1 problem for nested resources |
| Easy to version | |

#### Option B: GraphQL Only

```graphql
query GetUserWithCommunities {
  user(id: "123") {
    name
    email
    communities {
      name
      memberCount
    }
    trustScore
  }
}
```

| Pros | Cons |
|------|------|
| Fetch exactly what's needed | Caching more complex |
| Single request for nested data | Learning curve |
| Strong typing | N+1 on backend without DataLoader |
| Great for mobile bandwidth | File uploads need special handling |

#### Option C: GraphQL + REST Hybrid (CURRENT)

```
┌─────────────────────────────────────────────────────┐
│                    API STRATEGY                      │
├─────────────────────────────────────────────────────┤
│  GraphQL (/graphql)                                 │
│  - Complex queries (user with communities)          │
│  - Mobile app primary interface                     │
│  - Flexible field selection                         │
├─────────────────────────────────────────────────────┤
│  REST (/api/v1/*)                                   │
│  - Simple operations (auth, health)                 │
│  - File uploads (multipart)                         │
│  - Webhooks/external integrations                   │
│  - Server-side operations                           │
└─────────────────────────────────────────────────────┘
```

| Pros | Cons |
|------|------|
| Best of both worlds | Two patterns to maintain |
| Optimal for each use case | Team needs both skills |
| Mobile gets efficiency | |
| Integrations get simplicity | |

#### Option D: gRPC + REST

```protobuf
service UserService {
  rpc GetUser (UserRequest) returns (User);
  rpc StreamProgress (ProgressRequest) returns (stream Progress);
}
```

| Pros | Cons |
|------|------|
| Binary protocol (smaller) | Browser support limited |
| Streaming support | More complex tooling |
| Strong contracts | Mobile requires proxy |
| | Less human-readable |

### 5.3 Decision

**CHOSEN: Option C - GraphQL + REST Hybrid (Current Architecture)**

### 5.4 Rationale

1. **Mobile Optimization**: GraphQL allows mobile apps to request exactly the fields needed, critical for 3G/4G users.

2. **Bandwidth Efficiency**: A typical user profile fetch:
   - REST: 3-4 requests, ~15KB
   - GraphQL: 1 request, ~3KB (only requested fields)

3. **REST for Simplicity**: Auth flows, file uploads, and health checks are simpler with REST.

4. **Third-Party Integration**: External integrations expect REST APIs with OpenAPI specs.

5. **Spec Alignment**: OpenSpec mobile/spec.md explicitly requires "Implement GraphQL for flexible queries" and "Support field selection to reduce payload."

### 5.5 Minor Refinement Needed

Current implementation has basic GraphQL schema. Recommend:

1. **Add DataLoader**: Prevent N+1 queries for nested resolvers
2. **Implement Persisted Queries**: Cache query strings client-side for further bandwidth savings
3. **Add Query Complexity Limits**: Prevent abusive queries

### 5.6 Verdict: **KEEP WITH MINOR ENHANCEMENTS**

The hybrid approach is correct. Add DataLoader and persisted queries for optimization.

---

## 6. Decision 4: ML/AI Service Architecture

### 6.1 Context

Platform requires ML for:
- Mentor-learner matching (compatibility scoring)
- Content moderation (toxicity, bias detection)
- Checkpoint generation (NLP question generation)
- Analytics insights (learning pattern analysis)

### 6.2 Alternatives Considered

#### Option A: Node.js with TensorFlow.js

```
┌─────────────────────────────────────────────────────┐
│               NODE.JS BACKEND                        │
│  ┌───────────────────────────────────────────────┐  │
│  │  TensorFlow.js                                │  │
│  │  - Pre-trained models                         │  │
│  │  - Inference only (no training)               │  │
│  │  - Limited model selection                    │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

| Pros | Cons |
|------|------|
| Single language codebase | Limited ML library ecosystem |
| No service communication | Can't train custom models |
| Simple deployment | CPU-only (no GPU acceleration) |
| | Blocks event loop |

#### Option B: Python Microservices (CURRENT)

```
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│  Matching  │ │ Analytics  │ │ Checkpoint │ │ Moderation │
│  Service   │ │  Service   │ │  Service   │ │  Service   │
│  :8001     │ │  :8002     │ │  :8003     │ │  :8004     │
├────────────┤ ├────────────┤ ├────────────┤ ├────────────┤
│ FastAPI    │ │ FastAPI    │ │ FastAPI    │ │ FastAPI    │
│ scikit-    │ │ pandas     │ │ transformers│ │ fairlearn │
│ learn      │ │ numpy      │ │ NLP models │ │ aif360    │
│            │ │            │ │            │ │           │
└────────────┘ └────────────┘ └────────────┘ └────────────┘
```

| Pros | Cons |
|------|------|
| Best ML ecosystem | HTTP latency to services |
| GPU support | Python dependency management |
| Custom model training | Two languages in stack |
| Async processing via Celery | |
| Independent scaling | |

#### Option C: Serverless ML (AWS Lambda/Google Cloud Functions)

```
┌─────────────────────────────────────────────────────┐
│                   API GATEWAY                        │
└───────────────────────┬─────────────────────────────┘
                        │
    ┌───────────────────┼───────────────────┐
    ▼                   ▼                   ▼
┌────────┐        ┌──────────┐        ┌──────────┐
│Lambda  │        │ Lambda   │        │ Lambda   │
│Matching│        │Checkpoint│        │Moderation│
└────────┘        └──────────┘        └──────────┘
```

| Pros | Cons |
|------|------|
| Zero infrastructure management | Cold start latency (5-10s) |
| Pay per invocation | Memory/time limits |
| Auto-scaling | Complex model deployment |
| | No GPU in standard tiers |
| | Vendor lock-in |

#### Option D: ML Platform Service (AWS SageMaker, Vertex AI)

```
┌─────────────────────────────────────────────────────┐
│                   Node.js Backend                    │
└───────────────────────┬─────────────────────────────┘
                        │ HTTP/SDK
                        ▼
┌─────────────────────────────────────────────────────┐
│              AWS SageMaker / Vertex AI              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │  Matching   │ │ Checkpoint  │ │ Moderation  │   │
│  │   Endpoint  │ │  Endpoint   │ │  Endpoint   │   │
│  └─────────────┘ └─────────────┘ └─────────────┘   │
└─────────────────────────────────────────────────────┘
```

| Pros | Cons |
|------|------|
| Managed infrastructure | High cost |
| Built-in monitoring | Vendor lock-in |
| Easy model versioning | Less control |
| Auto-scaling | Overkill for current scale |

### 6.3 Decision

**CHOSEN: Option B - Python Microservices (Current Architecture)**

### 6.4 Rationale

1. **ML Ecosystem**: Python has the best libraries for EduConnect's needs:
   - `scikit-learn`: Matching algorithm
   - `transformers`: Question generation
   - `fairlearn`, `aif360`: Bias detection (required by matching spec)

2. **Custom Model Training**: Platform will need custom models trained on community data. Python enables this; serverless doesn't.

3. **Cost Efficiency**: Self-managed services are more cost-effective at scale vs. managed ML platforms.

4. **Spec Requirements**: Matching spec requires "Algorithm Training" and "Bias Detection" - both need full Python ML capabilities.

5. **Latency Acceptable**: ML operations are not in critical user paths. HTTP latency (~10-50ms) is acceptable.

### 6.5 Architecture Diagram: ML Service Communication

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ML SERVICE COMMUNICATION FLOW                         │
└─────────────────────────────────────────────────────────────────────────────┘

 User Request                  Synchronous Path (< 5s operations)
      │
      ▼
┌──────────────┐     HTTP POST /match     ┌──────────────┐
│   Node.js    │─────────────────────────▶│   Matching   │
│   Backend    │◀─────────────────────────│   Service    │
│              │     JSON Response         │   (FastAPI)  │
└──────────────┘                          └──────────────┘


 Background Task               Asynchronous Path (> 5s operations)
      │
      ▼
┌──────────────┐     Celery Task          ┌──────────────┐
│   Node.js    │─────────────────────────▶│    Redis     │
│   Backend    │                          │   (Broker)   │
└──────────────┘                          └──────┬───────┘
      │                                          │
      │ Webhook/Polling                          ▼
      │                                   ┌──────────────┐
      └───────────────────────────────────│   Celery     │
                                          │   Worker     │
                                          │   (Python)   │
                                          └──────────────┘
```

### 6.6 Verdict: **NO CHANGE NEEDED**

Python microservices architecture is optimal for ML/AI requirements.

---

## 7. Decision 5: Caching Strategy

### 7.1 Context

Platform needs caching for:
- Session data (high read frequency)
- Rate limiting state
- Expensive query results
- Content metadata
- Real-time pub/sub

### 7.2 Alternatives Considered

#### Option A: In-Memory Only (Node.js)

```javascript
const cache = new Map();
// or
const NodeCache = require('node-cache');
```

| Pros | Cons |
|------|------|
| Zero latency | Lost on restart |
| No external dependency | Can't share across instances |
| Simple | Memory limits |

#### Option B: Redis Single Instance (CURRENT)

```
┌─────────────────────────────────────────────────────┐
│                    Redis 7                           │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │   Strings   │ │    Hashes    │ │   Pub/Sub    │  │
│  │  Sessions   │ │  User Data   │ │  Real-time   │  │
│  │  Rate Limit │ │  Cache       │ │              │  │
│  └─────────────┘ └──────────────┘ └──────────────┘  │
└─────────────────────────────────────────────────────┘
```

| Pros | Cons |
|------|------|
| Shared across instances | Network latency (~1ms) |
| Persistence options | Single point of failure |
| Rich data structures | |
| Built-in pub/sub | |

#### Option C: Redis Cluster

```
┌─────────┐ ┌─────────┐ ┌─────────┐
│ Redis 1 │ │ Redis 2 │ │ Redis 3 │
│ Primary │ │ Primary │ │ Primary │
└────┬────┘ └────┬────┘ └────┬────┘
     │           │           │
┌────┴────┐ ┌────┴────┐ ┌────┴────┐
│Replica 1│ │Replica 2│ │Replica 3│
└─────────┘ └─────────┘ └─────────┘
```

| Pros | Cons |
|------|------|
| High availability | Complex setup |
| Horizontal scaling | Higher cost |
| Automatic failover | Operational overhead |

#### Option D: Multi-Tier Cache

```
┌─────────────────────────────────────────────────────┐
│                    NODE.JS                           │
│  ┌─────────────────────────────────────────────────┐│
│  │  L1: In-Memory Cache (node-cache)              ││
│  │  - Hot data (100ms TTL)                        ││
│  │  - Session shortcuts                           ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────┬───────────────────────────────┘
                      │ L1 Miss
                      ▼
┌─────────────────────────────────────────────────────┐
│  L2: Redis                                          │
│  - Sessions, Rate Limits                            │
│  - Query Cache (5min TTL)                           │
└─────────────────────────────────────────────────────┘
```

| Pros | Cons |
|------|------|
| Lowest latency for hot data | Cache coherency complexity |
| Reduces Redis load | Two caches to manage |
| Best of both worlds | |

### 7.3 Decision

**CHOSEN: Option B - Redis Single Instance (Current)**

For future scale: **Evolve to Option D - Multi-Tier Cache**

### 7.4 Rationale

1. **Current Scale**: Single Redis instance handles 10,000 concurrent users easily.

2. **Operational Simplicity**: One cache layer is easier to reason about and debug.

3. **Future Path**: When needed, add L1 in-memory cache for ultra-hot data (sessions).

### 7.5 Enhancement Recommendation

Add structured cache key namespacing:

```typescript
// Current: Ad-hoc keys
redis.set(`session:${sessionId}`, data);

// Recommended: Namespaced strategy
const CacheKeys = {
  session: (id: string) => `session:v1:${id}`,
  user: (id: string) => `user:v1:${id}`,
  community: (id: string) => `community:v1:${id}`,
  rateLimit: (ip: string, endpoint: string) => `rate:v1:${ip}:${endpoint}`,
};
```

### 7.6 Verdict: **KEEP WITH MINOR ENHANCEMENTS**

Current Redis setup is appropriate. Add key namespacing and consider L1 cache for sessions at scale.

---

## 8. Decision 6: Authentication & Session Management

### 8.1 Context

Platform requires:
- Secure authentication
- MFA support
- Session management with revocation
- Low-bandwidth optimization
- Offline-capable tokens

### 8.2 Alternatives Considered

#### Option A: Session-Based (Server-Side Sessions)

```
┌────────────┐        ┌────────────┐        ┌────────────┐
│   Client   │───────▶│   Server   │───────▶│   Redis    │
│            │ Cookie │            │ Lookup │  Sessions  │
│            │◀───────│            │◀───────│            │
└────────────┘        └────────────┘        └────────────┘
```

| Pros | Cons |
|------|------|
| Easy revocation | Stateful (scaling concern) |
| Server controls session | Every request hits session store |
| No client-side storage | Offline not possible |

#### Option B: Pure JWT (Stateless)

```
┌────────────┐        ┌────────────┐
│   Client   │───────▶│   Server   │
│   (JWT)    │ Verify │  Stateless │
│            │◀───────│            │
└────────────┘        └────────────┘
```

| Pros | Cons |
|------|------|
| Stateless | Can't revoke before expiry |
| Works offline | Token size grows with claims |
| No session lookup | Longer tokens = more bandwidth |

#### Option C: JWT + Database Sessions (CURRENT)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                                       │
└─────────────────────────────────────────────────────────────────────────────┘

    Login Request                                     Token Validation
         │                                                  │
         ▼                                                  ▼
┌─────────────────┐                               ┌─────────────────┐
│  Verify Creds   │                               │  Verify JWT     │
│  (DB Lookup)    │                               │  (Signature)    │
└────────┬────────┘                               └────────┬────────┘
         │                                                  │
         ▼                                                  ▼
┌─────────────────┐                               ┌─────────────────┐
│ Create Session  │                               │ Check Session   │
│ (PostgreSQL)    │                               │ (Redis Cache)   │
└────────┬────────┘                               └────────┬────────┘
         │                                                  │
         ▼                                                  │
┌─────────────────┐                                        │
│  Generate JWT   │                               ┌────────┴────────┐
│  Access (15m)   │                               │ If not cached,  │
│  Refresh (7d)   │                               │ check PostgreSQL│
└────────┬────────┘                               └─────────────────┘
         │
         ▼
    Return Tokens
```

| Pros | Cons |
|------|------|
| Revocation via session DB | Hybrid complexity |
| JWT for offline validation | Session lookup adds latency |
| Short access tokens limit exposure | |
| Refresh token rotation | |

#### Option D: OAuth 2.0 / OIDC (External Provider)

| Pros | Cons |
|------|------|
| Delegated auth complexity | Requires internet for auth |
| Social login support | Not suitable for offline |
| | External dependency |

### 8.3 Decision

**CHOSEN: Option C - JWT + Database Sessions (Current)**

### 8.4 Rationale

1. **Revocation Requirement**: Platform needs to revoke sessions (security incidents, logout all devices). Pure JWT can't do this.

2. **Offline Support**: Short-lived JWT (15min) can work offline for limited periods. This aligns with mobile spec.

3. **MFA Integration**: Session-based approach allows storing MFA state server-side.

4. **Spec Alignment**: Core spec requires "issue a secure session token" and "session SHALL expire after configured timeout."

5. **Trust Score Integration**: Sessions store user context including trust score, used for authorization decisions.

### 8.5 Token Strategy Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TOKEN LIFECYCLE                                      │
└─────────────────────────────────────────────────────────────────────────────┘

 Access Token (15 minutes)                    Refresh Token (7 days)
 ┌─────────────────────────┐                 ┌─────────────────────────┐
 │ {                       │                 │ {                       │
 │   "sub": "user-uuid",   │                 │   "sub": "user-uuid",   │
 │   "sessionId": "...",   │                 │   "sessionId": "...",   │
 │   "type": "access",     │                 │   "type": "refresh",    │
 │   "exp": 1234567890     │                 │   "exp": 1234567890     │
 │ }                       │                 │ }                       │
 └─────────────────────────┘                 └─────────────────────────┘
          │                                           │
          │ Used for API requests                     │ Used only to get new
          │ Validated on every request                │ access token
          │                                           │
          ▼                                           ▼
    ┌───────────┐                              ┌───────────┐
    │ Stateless │                              │ Validates │
    │ Validation│                              │  Against  │
    │ (JWT sig) │                              │  Session  │
    └─────┬─────┘                              │   in DB   │
          │                                    └───────────┘
          ▼
    ┌───────────┐
    │ Optional: │
    │ Session   │
    │ Validity  │
    │ Check     │
    └───────────┘
```

### 8.6 Verdict: **NO CHANGE NEEDED**

JWT + Database Sessions is the correct approach for EduConnect's requirements.

---

## 9. Decision 7: Offline-First Architecture

### 9.1 Context

Mobile spec requires:
- Offline content access
- Offline checkpoint completion
- Background sync
- Conflict resolution
- 100% offline functionality reliability

### 9.2 Alternatives Considered

#### Option A: Cache-Only (No Sync)

```
┌──────────────────────────────────────────────────┐
│                     CLIENT                        │
│  ┌──────────────────────────────────────────────┐│
│  │            Service Worker Cache              ││
│  │  - Static assets                             ││
│  │  - Read-only content                         ││
│  └──────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

| Pros | Cons |
|------|------|
| Simple implementation | No offline writes |
| Good for read-only content | No sync capability |

#### Option B: Local-First with CRDT

```
┌──────────────────────────────────────────────────┐
│                     CLIENT                        │
│  ┌──────────────────────────────────────────────┐│
│  │              Local Database                  ││
│  │  (SQLite / IndexedDB + CRDT)                 ││
│  │  - Full data model replica                   ││
│  │  - Automatic conflict resolution             ││
│  └────────────────────┬─────────────────────────┘│
└───────────────────────┼──────────────────────────┘
                        │ Sync Protocol (Automerge/Y.js)
                        ▼
┌──────────────────────────────────────────────────┐
│                     SERVER                        │
│              CRDT Sync Endpoint                   │
└──────────────────────────────────────────────────┘
```

| Pros | Cons |
|------|------|
| Automatic conflict resolution | Complex implementation |
| True local-first | Large client-side storage |
| Real-time collaboration ready | CRDT libraries add bundle size |
| | Not all data suits CRDTs |

#### Option C: Sync Engine with Queue (CURRENT)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OFFLINE SYNC ARCHITECTURE                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│                     CLIENT                        │
│  ┌────────────────┐  ┌────────────────────────┐  │
│  │  IndexedDB /   │  │     Sync Queue         │  │
│  │  SQLite        │  │  ┌──────────────────┐  │  │
│  │  - Content     │  │  │ Pending Actions  │  │  │
│  │  - Progress    │  │  │ - Create         │  │  │
│  │  - Checkpoints │  │  │ - Update         │  │  │
│  └────────────────┘  │  │ - Delete         │  │  │
│                      │  └──────────────────┘  │  │
└──────────────────────┴──────────┬─────────────┘──┘
                                  │
                     Connection Restored
                                  │
                                  ▼
┌──────────────────────────────────────────────────┐
│                     SERVER                        │
│  ┌────────────────────────────────────────────┐  │
│  │              Sync Engine Service            │  │
│  │  - Receive batched changes                  │  │
│  │  - Detect conflicts                         │  │
│  │  - Apply resolution strategy                │  │
│  │  - Return sync results                      │  │
│  └────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────┐  │
│  │              Sync Tables                    │  │
│  │  - sync_queue                               │  │
│  │  - sync_conflicts                           │  │
│  │  - device_sync_state                        │  │
│  │  - offline_content_cache                    │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

| Pros | Cons |
|------|------|
| Works with relational data model | Manual conflict resolution |
| Clear sync boundaries | More complex than cache-only |
| Predictable behavior | Requires careful queue management |
| Aligns with spec requirements | |

### 9.3 Decision

**CHOSEN: Option C - Sync Engine with Queue (Current)**

### 9.4 Rationale

1. **Spec Alignment**: Mobile spec explicitly requires:
   - Queue all user actions for sync
   - Detect conflicts automatically
   - Apply conflict resolution rules
   - Preserve user work (never lose data)

2. **Data Model Fit**: EduConnect's relational data (checkpoints, progress) doesn't suit CRDTs well. Explicit sync is clearer.

3. **Control**: Manual conflict resolution gives more control over business logic (e.g., checkpoint submissions should use timestamp-based resolution, not merge).

4. **Implementation Progress**: Sync tables already created:
   - `sync_queue` - Pending sync items
   - `sync_conflicts` - Detected conflicts
   - `device_sync_state` - Per-device sync cursors
   - `offline_content_cache` - Cached content metadata

### 9.5 Conflict Resolution Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CONFLICT RESOLUTION STRATEGIES                          │
└─────────────────────────────────────────────────────────────────────────────┘

 Content Type          Strategy              Rationale
 ────────────────────────────────────────────────────────────────────────────
 Checkpoint Answers    Last-Write-Wins       User's final answer matters
                       (client timestamp)

 Learning Progress     Server-Wins           Progress should only advance
                       (max value)

 Profile Updates       Last-Write-Wins       User's latest preference
                       (client timestamp)

 Community Actions     Server-Wins           Requires server validation
                       (with notification)

 Content Edits         Manual Resolution     Content requires human review
                       (queue for user)
```

### 9.6 Verdict: **KEEP, COMPLETE IMPLEMENTATION**

The sync engine architecture is correct. Focus on completing the client-side implementation and testing conflict resolution scenarios.

---

## 10. Decision 8: Real-Time Communication

### 10.1 Context

Platform needs real-time features for:
- Notifications
- Chat/messaging (future)
- Live collaboration (future)
- Sync status updates

### 10.2 Alternatives Considered

#### Option A: Polling

```
Client ──────────────────▶ Server
        GET /notifications
        every 30 seconds
```

| Pros | Cons |
|------|------|
| Simple | Wasteful bandwidth |
| Works everywhere | High latency |
| | Server load |

#### Option B: Server-Sent Events (SSE)

```
Client ◀────────────────── Server
        text/event-stream
        one-way push
```

| Pros | Cons |
|------|------|
| Simple server implementation | One-way only |
| HTTP-based | Connection limits |
| Auto-reconnect | No binary support |

#### Option C: WebSockets (Socket.io) (CURRENT)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SOCKET.IO ARCHITECTURE                                    │
└─────────────────────────────────────────────────────────────────────────────┘

 Client                                              Server
    │                                                   │
    │◀──────────── Bidirectional ─────────────────────▶│
    │              WebSocket                            │
    │                                                   │
    │  ┌──────────────────────────────────────────────┐│
    │  │              Redis Pub/Sub                   ││
    │  │  (Multi-instance coordination)               ││
    │  └──────────────────────────────────────────────┘│
```

| Pros | Cons |
|------|------|
| Bidirectional | More complex than SSE |
| Low latency | Requires sticky sessions or Redis |
| Auto-reconnect | WebSocket may be blocked |
| Room/namespace support | |
| Fallback to polling | |

#### Option D: WebRTC Data Channels

| Pros | Cons |
|------|------|
| P2P capable | Complex signaling |
| Low latency | Overkill for notifications |
| | NAT traversal issues |

### 10.3 Decision

**CHOSEN: Option C - WebSockets (Socket.io) (Current)**

### 10.4 Rationale

1. **Future Features**: Chat and live collaboration will need bidirectional communication.

2. **Low-Bandwidth Friendly**: WebSocket is more efficient than polling for push notifications.

3. **Scaling Ready**: Current setup has Redis pub/sub clients ready for multi-instance coordination.

4. **Fallback Support**: Socket.io falls back to HTTP polling if WebSocket blocked.

### 10.5 Verdict: **NO CHANGE NEEDED**

Socket.io is the right choice for EduConnect's real-time needs.

---

## 11. Decision 9: Message Queue & Background Jobs

### 11.1 Context

Platform needs background processing for:
- Email notifications
- Push notifications
- Batch analytics
- ML model inference (async)
- Content processing (transcoding)
- Scheduled tasks

### 11.2 Alternatives Considered

#### Option A: In-Process (setTimeout/setInterval)

| Pros | Cons |
|------|------|
| No external dependency | Lost on restart |
| Simple | Can't distribute |
| | Blocks event loop |

#### Option B: BullMQ Only

```
┌──────────────────────────────────────────────────┐
│                     Redis                         │
│  ┌──────────────────────────────────────────────┐│
│  │               BullMQ Queues                  ││
│  │  - email-queue                               ││
│  │  - notification-queue                        ││
│  │  - analytics-queue                           ││
│  └──────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
          │                    │
          ▼                    ▼
┌──────────────────┐ ┌──────────────────┐
│   Node Worker 1  │ │   Node Worker 2  │
└──────────────────┘ └──────────────────┘
```

| Pros | Cons |
|------|------|
| Redis-backed (already have) | Node.js only |
| Delayed jobs, retries | Python tasks need HTTP |
| Good monitoring | |

#### Option C: BullMQ + Celery (CURRENT)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MESSAGE QUEUE ARCHITECTURE                              │
└─────────────────────────────────────────────────────────────────────────────┘

                              Redis (Broker)
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
        ┌─────────────────────┐       ┌─────────────────────┐
        │      BullMQ         │       │       Celery        │
        │   (Node.js Jobs)    │       │   (Python Jobs)     │
        │                     │       │                     │
        │  - Emails           │       │  - ML Inference     │
        │  - Notifications    │       │  - Model Training   │
        │  - Batch DB ops     │       │  - Content Analysis │
        │  - Sync processing  │       │  - Bias Detection   │
        └─────────────────────┘       └─────────────────────┘
                │                             │
                ▼                             ▼
        ┌─────────────────────┐       ┌─────────────────────┐
        │    Node Worker      │       │   Celery Worker     │
        │                     │       │                     │
        └─────────────────────┘       └─────────────────────┘
```

| Pros | Cons |
|------|------|
| Best tool for each language | Two queue systems |
| Shared broker (Redis) | Slightly more complex |
| Independent scaling | |

#### Option D: RabbitMQ / Kafka

| Pros | Cons |
|------|------|
| Language agnostic | Another service to manage |
| Better durability | Overkill for current needs |
| Stream processing (Kafka) | |

### 11.3 Decision

**CHOSEN: Option C - BullMQ + Celery (Current)**

### 11.4 Rationale

1. **Language Alignment**: BullMQ for Node.js tasks, Celery for Python ML tasks. Each uses native patterns.

2. **Shared Infrastructure**: Both use Redis as broker - no additional infrastructure.

3. **Proven Patterns**:
   - BullMQ: Email, notifications, general jobs
   - Celery: ML model inference, long-running analysis

4. **Spec Alignment**: Platform needs async ML operations for matching algorithm training, bias detection.

### 11.5 Verdict: **NO CHANGE NEEDED**

BullMQ + Celery combination is optimal for polyglot job processing.

---

## 12. Decision 10: Content Delivery Strategy

### 12.1 Context

Mobile spec requirements:
- Average page weight: <500KB
- Time to Interactive: <5s on 3G
- Support text-first mode (90% weight reduction)
- Adaptive media quality
- Support 2G connections (degraded)

### 12.2 Alternatives Considered

#### Option A: Origin-Only Delivery

```
Client ──────────────────▶ Backend ──────▶ Storage (S3/Local)
```

| Pros | Cons |
|------|------|
| Simple | High latency globally |
| Full control | Origin bandwidth costs |
| | No edge caching |

#### Option B: CDN for Static Assets

```
Client ──────▶ CDN Edge ──────▶ Origin (on miss)
```

| Pros | Cons |
|------|------|
| Low latency | Additional cost |
| Reduced origin load | Cache invalidation |
| Global reach | |

#### Option C: Multi-Tier Content Strategy (RECOMMENDED)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CONTENT DELIVERY STRATEGY                                 │
└─────────────────────────────────────────────────────────────────────────────┘

 Connection Quality Detection
         │
         ├──── Excellent/Good ────▶ Full Media (Video, Images)
         │                         CDN Edge Delivery
         │                         Adaptive Bitrate
         │
         ├──── Fair ──────────────▶ Compressed Media
         │                         Image optimization (WebP)
         │                         Lower video quality
         │
         ├──── Poor ──────────────▶ Text + Thumbnails
         │                         Lazy load media
         │                         Audio alternatives
         │
         └──── Offline/2G ────────▶ Text Mode
                                   Cached content only
                                   SMS fallback (optional)

 Content Type Processing
 ────────────────────────────────────────────────────────────────────────────
 Images:    Source → Sharp → WebP/AVIF → Multiple sizes → CDN
 Video:     Source → FFmpeg → HLS/DASH → Multiple bitrates → CDN
 Audio:     Source → FFmpeg → AAC → Multiple bitrates → CDN
 Documents: Source → Parse → Text extract + PDF → CDN
```

| Pros | Cons |
|------|------|
| Optimized per connection | Complex implementation |
| Meets bandwidth targets | Multiple processing pipelines |
| Graceful degradation | |

### 12.3 Decision

**CHOSEN: Option C - Multi-Tier Content Strategy**

### 12.4 Rationale

1. **Spec Mandated**: Mobile spec explicitly requires adaptive media quality, text mode, and bandwidth optimization.

2. **Current Implementation**:
   - Content handlers exist: `text-handler.ts`, `image-handler.ts`, `video-handler.ts`, etc.
   - Text mode service: `text-mode.service.ts`
   - Multi-format content table in database
   - Content transcoding service structure in place

3. **CDN Integration**: Not yet implemented but structure supports it.

### 12.5 Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Content Handlers | Partial | Factory pattern implemented, handlers need completion |
| Text Mode | Partial | Service exists, needs endpoint integration |
| Transcoding | Structure Only | Service skeleton, needs FFmpeg integration |
| CDN | Not Started | Recommend CloudFlare or CloudFront |

### 12.6 Verdict: **KEEP, COMPLETE IMPLEMENTATION**

Architecture is correct. Priorities:
1. Complete content handler implementations
2. Add CDN integration (CloudFlare recommended for cost)
3. Implement adaptive bitrate streaming

---

## 13. Recommendations & Action Items

### 13.1 Summary Matrix

| Decision | Verdict | Priority Action |
|----------|---------|-----------------|
| Service Architecture | **Keep** | None |
| Database | **Keep** | Add table partitioning for audit_logs (when needed) |
| API Design | **Keep** | Add DataLoader, persisted queries |
| ML Services | **Keep** | Complete placeholder implementations |
| Caching | **Keep** | Add key namespacing |
| Authentication | **Keep** | None |
| Offline-First | **Keep** | Complete client-side sync engine |
| Real-Time | **Keep** | None |
| Message Queue | **Keep** | None |
| Content Delivery | **Keep** | Complete handlers, add CDN |

### 13.2 Priority Action Items

#### High Priority (Complete Current Architecture)

1. **Complete ML Service Implementations**
   - Matching service: Implement multi-dimensional scoring
   - Checkpoint service: Integrate transformer models
   - Moderation service: Implement fairlearn bias detection

2. **Complete Offline Sync**
   - Client-side sync queue implementation
   - Conflict resolution UI
   - Background sync testing

3. **Add GraphQL DataLoader**
   - Prevent N+1 queries
   - Batch database calls

#### Medium Priority (Optimization)

4. **CDN Integration**
   - Set up CloudFlare or CloudFront
   - Configure caching rules
   - Implement cache invalidation

5. **Content Handler Completion**
   - FFmpeg integration for video
   - Sharp optimization for images
   - Adaptive bitrate setup

6. **Cache Key Namespacing**
   - Implement structured key strategy
   - Add cache versioning

#### Low Priority (Scale Preparation)

7. **Table Partitioning**
   - Partition audit_logs by date
   - Partition analytics tables

8. **L1 Cache Layer**
   - Add in-memory cache for sessions
   - Implement cache coherency

### 13.3 Architecture Evolution Path for 1 Million Users

The architecture is designed to scale progressively. Below is the detailed evolution path:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                    ARCHITECTURE EVOLUTION PATH TO 1 MILLION USERS                        │
└─────────────────────────────────────────────────────────────────────────────────────────┘

 PHASE 1: FOUNDATION              PHASE 2: GROWTH                 PHASE 3: SCALE
 (Current - 10K users)            (100K users)                    (1M users)
 ════════════════════════════════════════════════════════════════════════════════════════

 COMPUTE LAYER
 ─────────────────────────────────────────────────────────────────────────────────────────
 ┌─────────────────┐              ┌─────────────────┐             ┌─────────────────┐
 │ Backend (1-2)   │      →       │ Backend (4-6)   │     →       │ Backend (10-20) │
 │ Fastify         │              │ + Load Balancer │             │ + Auto-scaling  │
 │ Single AZ       │              │ Multi-AZ        │             │ Multi-Region    │
 └─────────────────┘              └─────────────────┘             └─────────────────┘

 ┌─────────────────┐              ┌─────────────────┐             ┌─────────────────┐
 │ ML Services     │      →       │ ML Services     │     →       │ ML Services     │
 │ (1 each)        │              │ (2-3 each)      │             │ (Auto-scaled)   │
 │ CPU only        │              │ + GPU for train │             │ GPU inference   │
 └─────────────────┘              └─────────────────┘             └─────────────────┘

 DATABASE LAYER
 ─────────────────────────────────────────────────────────────────────────────────────────
 ┌─────────────────┐              ┌─────────────────┐             ┌─────────────────┐
 │ PostgreSQL      │      →       │ PostgreSQL      │     →       │ PostgreSQL      │
 │ Single Primary  │              │ Primary +       │             │ Primary +       │
 │ 16GB RAM        │              │ 2 Read Replicas │             │ 4 Read Replicas │
 │                 │              │ PgBouncer       │             │ Citus/Partitions│
 │                 │              │ 64GB RAM        │             │ 128GB+ RAM      │
 └─────────────────┘              └─────────────────┘             └─────────────────┘

 Table Sizes (Estimated):
 - users: 10K rows               - users: 100K rows              - users: 1M rows
 - sessions: 50K rows            - sessions: 500K rows           - sessions: 5M rows
 - audit_logs: 1M rows           - audit_logs: 50M rows          - audit_logs: 500M rows
                                                                   (partitioned)

 CACHE LAYER
 ─────────────────────────────────────────────────────────────────────────────────────────
 ┌─────────────────┐              ┌─────────────────┐             ┌─────────────────┐
 │ Redis Single    │      →       │ Redis Primary + │     →       │ Redis Cluster   │
 │ 2GB RAM         │              │ Replica         │             │ 6 nodes         │
 │                 │              │ 8GB RAM         │             │ 32GB total      │
 └─────────────────┘              └─────────────────┘             └─────────────────┘

 CDN & EDGE
 ─────────────────────────────────────────────────────────────────────────────────────────
 ┌─────────────────┐              ┌─────────────────┐             ┌─────────────────┐
 │ No CDN          │      →       │ CloudFlare Pro  │     →       │ CloudFlare      │
 │ Direct origin   │              │ Static + Media  │             │ Enterprise      │
 │                 │              │ Basic WAF       │             │ Full WAF        │
 │                 │              │                 │             │ Workers (edge)  │
 └─────────────────┘              └─────────────────┘             └─────────────────┘

 REAL-TIME
 ─────────────────────────────────────────────────────────────────────────────────────────
 ┌─────────────────┐              ┌─────────────────┐             ┌─────────────────┐
 │ Socket.io       │      →       │ Socket.io       │     →       │ Socket.io       │
 │ Single instance │              │ Redis Adapter   │             │ Redis Cluster   │
 │ 5K connections  │              │ 3 instances     │             │ Adapter         │
 │                 │              │ 15K connections │             │ 50K+ connections│
 └─────────────────┘              └─────────────────┘             └─────────────────┘

 MESSAGE QUEUES
 ─────────────────────────────────────────────────────────────────────────────────────────
 ┌─────────────────┐              ┌─────────────────┐             ┌─────────────────┐
 │ BullMQ (1 worker)│     →       │ BullMQ (3 workers)│    →      │ BullMQ (10 workers)│
 │ Celery (1 worker)│             │ Celery (3 workers)│           │ Celery (10 workers)│
 │                 │              │ Prioritized queues│           │ Dedicated queues │
 └─────────────────┘              └─────────────────┘             └─────────────────┘
```

### 13.4 Scaling Triggers and Actions

| Metric | Phase 1 Limit | Action to Phase 2 | Phase 2 Limit | Action to Phase 3 |
|--------|---------------|-------------------|---------------|-------------------|
| **Users** | 10K | Add read replica, PgBouncer | 100K | Add Citus, partition tables |
| **Concurrent** | 1K | Add backend instances | 10K | Add auto-scaling, regions |
| **DB Connections** | 100 | Deploy PgBouncer | 500 | Connection pooling tuning |
| **Redis Memory** | 2GB | Upgrade to 8GB | 8GB | Deploy Redis Cluster |
| **API Latency p99** | 500ms | Add caching, optimize | 200ms | Edge caching, read replicas |
| **ML Inference** | 1K/min | Add ML instances | 5K/min | GPU instances, batching |

### 13.5 Cost Estimation by Phase

| Phase | Monthly Estimate | Key Costs |
|-------|------------------|-----------|
| Phase 1 (10K users) | $500-1,000 | 2 servers, managed DB, Redis |
| Phase 2 (100K users) | $3,000-5,000 | 6 servers, DB replicas, CDN Pro |
| Phase 3 (1M users) | $15,000-25,000 | 20 servers, DB cluster, CDN Enterprise, GPU |

### 13.6 Specific Scalability Recommendations

#### Database Scaling Strategy

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                    POSTGRESQL SCALING FOR 1M USERS                                       │
└─────────────────────────────────────────────────────────────────────────────────────────┘

1. CONNECTION POOLING (Phase 2)
   ┌─────────────────┐
   │  Application    │ ──── 20 connections ────▶ ┌─────────────────┐
   │  (10 instances) │                           │   PgBouncer     │
   └─────────────────┘                           │   (200 pooled)  │
                                                 └────────┬────────┘
                                                          │ 50 actual
                                                          ▼
                                                 ┌─────────────────┐
                                                 │   PostgreSQL    │
                                                 │   (max 100)     │
                                                 └─────────────────┘

2. READ REPLICAS (Phase 2)
   ┌─────────────────┐     WRITES     ┌─────────────────┐
   │   Application   │ ──────────────▶│    Primary      │
   │                 │                 │   PostgreSQL    │
   │                 │                 └────────┬────────┘
   │                 │                          │ Streaming
   │                 │                          │ Replication
   │                 │     READS       ┌───────┴────────┐
   │                 │ ◀───────────────│  Read Replica  │
   │                 │ ◀───────────────│  Read Replica  │
   └─────────────────┘                 └────────────────┘

3. TABLE PARTITIONING (Phase 3)
   Large tables partitioned by time or tenant:

   audit_logs (500M rows)
   ├── audit_logs_2026_q1 (125M rows)
   ├── audit_logs_2026_q2 (125M rows)
   ├── audit_logs_2026_q3 (125M rows)
   └── audit_logs_2026_q4 (125M rows)

   sync_queue (partitioned by community_id for multi-tenant)
   ├── sync_queue_community_1
   ├── sync_queue_community_2
   └── ...

4. HORIZONTAL SHARDING (Phase 3+, if needed)
   Consider Citus extension for PostgreSQL:
   - Distribute large tables across nodes
   - Co-locate related data (user + their content)
   - Reference tables for shared data (roles, permissions)
```

#### Redis Cluster Configuration (Phase 3)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                    REDIS CLUSTER FOR 1M USERS                                            │
└─────────────────────────────────────────────────────────────────────────────────────────┘

   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
   │  Primary 1  │     │  Primary 2  │     │  Primary 3  │
   │  Slots 0-   │     │  Slots      │     │  Slots      │
   │  5460       │     │  5461-10922 │     │  10923-16383│
   └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
          │                   │                   │
   ┌──────┴──────┐     ┌──────┴──────┐     ┌──────┴──────┐
   │  Replica 1  │     │  Replica 2  │     │  Replica 3  │
   └─────────────┘     └─────────────┘     └─────────────┘

   Data Distribution:
   - Sessions: ~5M keys (slot distribution)
   - Rate Limits: ~1M keys
   - Cache: ~2M keys
   - Pub/Sub: All primaries (cluster-wide)
```

#### Backend Auto-Scaling Configuration

```yaml
# Kubernetes HPA for 1M users
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: educonnect-backend
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 5
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Pods
        value: 4
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

---

## 14. Appendix: Architecture Diagrams

### 14.1 Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              EDUCONNECT COMPLETE ARCHITECTURE                            │
└─────────────────────────────────────────────────────────────────────────────────────────┘

                                        CLIENTS
                    ┌─────────────────────────────────────────────┐
                    │  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
                    │  │   iOS   │  │ Android │  │   PWA   │     │
                    │  │   App   │  │   App   │  │   Web   │     │
                    │  └────┬────┘  └────┬────┘  └────┬────┘     │
                    │       │            │            │          │
                    │  ┌────┴────────────┴────────────┴────┐     │
                    │  │         Local Storage              │     │
                    │  │  IndexedDB │ SQLite │ Cache        │     │
                    │  │  ┌─────────────────────────────┐   │     │
                    │  │  │       Sync Queue            │   │     │
                    │  │  └─────────────────────────────┘   │     │
                    │  └────────────────────────────────────┘     │
                    └─────────────────────┬───────────────────────┘
                                          │
                                          │ HTTPS / WSS
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    EDGE LAYER                                            │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐    │
│  │                     CDN (CloudFlare / CloudFront)                                │    │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                     │    │
│  │  │  Static Assets │  │  Media Content │  │   API Cache    │                     │    │
│  │  │    (JS/CSS)    │  │  (Video/Image) │  │  (GraphQL)     │                     │    │
│  │  └────────────────┘  └────────────────┘  └────────────────┘                     │    │
│  └─────────────────────────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐    │
│  │                         Load Balancer (nginx / ALB)                              │    │
│  │                     Rate Limiting │ SSL Termination                              │    │
│  └─────────────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                     │
                    ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                               APPLICATION LAYER                                          │
│                                                                                          │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │
│  │                         NODE.JS BACKEND (Fastify)                                  │  │
│  │                                 Port 3000                                          │  │
│  │  ┌─────────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │                            PLUGINS                                           │  │  │
│  │  │  Helmet │ CORS │ Compress │ JWT │ Rate-Limit │ Multipart │ Redis │ Swagger  │  │  │
│  │  └─────────────────────────────────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │                             ROUTES                                           │  │  │
│  │  │  /api/v1/auth    │ /api/v1/users      │ /api/v1/communities                 │  │  │
│  │  │  /api/v1/content │ /api/v1/checkpoints│ /graphql │ /health                  │  │  │
│  │  └─────────────────────────────────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │                            SERVICES                                          │  │  │
│  │  │  UserService │ CommunityService │ ContentService │ TrustService             │  │  │
│  │  │  SessionService │ SyncEngine │ NotificationService │ CheckpointService      │  │  │
│  │  └─────────────────────────────────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │                        CONTENT HANDLERS                                      │  │  │
│  │  │  TextHandler │ ImageHandler │ VideoHandler │ AudioHandler │ CodeHandler     │  │  │
│  │  └─────────────────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
│                                          │                                              │
│                    ┌─────────────────────┴─────────────────────┐                        │
│                    │                                           │                        │
│                    ▼                                           ▼                        │
│  ┌───────────────────────────────────┐      ┌───────────────────────────────────┐      │
│  │          NODE WORKER              │      │         PYTHON SERVICES           │      │
│  │           (BullMQ)                │      │           (FastAPI)               │      │
│  │  ┌─────────────────────────────┐  │      │  ┌─────────────────────────────┐  │      │
│  │  │  - Email Jobs               │  │      │  │  Matching     (8001)        │  │      │
│  │  │  - Notification Jobs        │  │      │  │  Analytics    (8002)        │  │      │
│  │  │  - Batch Processing         │  │      │  │  Checkpoint   (8003)        │  │      │
│  │  │  - Sync Processing          │  │      │  │  Moderation   (8004)        │  │      │
│  │  └─────────────────────────────┘  │      │  └─────────────────────────────┘  │      │
│  └───────────────────────────────────┘      └────────────────┬──────────────────┘      │
│                                                              │                          │
│                                                              ▼                          │
│                                             ┌───────────────────────────────────┐      │
│                                             │         CELERY WORKER             │      │
│                                             │  ┌─────────────────────────────┐  │      │
│                                             │  │  - ML Inference             │  │      │
│                                             │  │  - Model Training           │  │      │
│                                             │  │  - Batch Analysis           │  │      │
│                                             │  └─────────────────────────────┘  │      │
│                                             └───────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                     │
                    ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                  DATA LAYER                                              │
│                                                                                          │
│  ┌───────────────────────────────┐  ┌───────────────────────────────┐                   │
│  │        PostgreSQL 16          │  │           Redis 7             │                   │
│  │         Port 5432             │  │          Port 6379            │                   │
│  │  ┌─────────────────────────┐  │  │  ┌─────────────────────────┐  │                   │
│  │  │  CORE TABLES            │  │  │  │  CACHING                │  │                   │
│  │  │  - users                │  │  │  │  - Session cache        │  │                   │
│  │  │  - communities          │  │  │  │  - Query cache          │  │                   │
│  │  │  - sessions             │  │  │  │  - User data cache      │  │                   │
│  │  ├─────────────────────────┤  │  │  ├─────────────────────────┤  │                   │
│  │  │  RBAC TABLES            │  │  │  │  RATE LIMITING          │  │                   │
│  │  │  - roles                │  │  │  │  - Per-IP counters      │  │                   │
│  │  │  - permissions          │  │  │  │  - Per-user counters    │  │                   │
│  │  │  - user_roles           │  │  │  ├─────────────────────────┤  │                   │
│  │  ├─────────────────────────┤  │  │  │  PUB/SUB                │  │                   │
│  │  │  TRUST TABLES           │  │  │  │  - Real-time events     │  │                   │
│  │  │  - trust_events         │  │  │  │  - Socket.io adapter    │  │                   │
│  │  │  - trust_relationships  │  │  │  ├─────────────────────────┤  │                   │
│  │  ├─────────────────────────┤  │  │  │  JOB QUEUES             │  │                   │
│  │  │  CONTENT TABLES         │  │  │  │  - BullMQ queues        │  │                   │
│  │  │  - content_storage      │  │  │  │  - Celery broker        │  │                   │
│  │  │  - checkpoint_*         │  │  │  └─────────────────────────┘  │                   │
│  │  ├─────────────────────────┤  │  └───────────────────────────────┘                   │
│  │  │  SYNC TABLES            │  │                                                      │
│  │  │  - sync_queue           │  │  ┌───────────────────────────────┐                   │
│  │  │  - sync_conflicts       │  │  │       Object Storage          │                   │
│  │  │  - device_sync_state    │  │  │        (S3 / Local)           │                   │
│  │  └─────────────────────────┘  │  │  ┌─────────────────────────┐  │                   │
│  └───────────────────────────────┘  │  │  - Media files          │  │                   │
│                                     │  │  - Document uploads     │  │                   │
│                                     │  │  - Content backups      │  │                   │
│                                     │  └─────────────────────────┘  │                   │
│                                     └───────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 14.2 Data Flow: User Authentication

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           AUTHENTICATION DATA FLOW                                       │
└─────────────────────────────────────────────────────────────────────────────────────────┘

  Client                    Backend                    Database/Cache
    │                          │                            │
    │  POST /api/v1/auth/login │                            │
    │  {email, password}       │                            │
    │─────────────────────────▶│                            │
    │                          │                            │
    │                          │  SELECT * FROM users       │
    │                          │  WHERE email = ?           │
    │                          │───────────────────────────▶│
    │                          │                            │
    │                          │◀───────────────────────────│
    │                          │  User record               │
    │                          │                            │
    │                          │  bcrypt.compare(password)  │
    │                          │  ─────────────────────     │
    │                          │                            │
    │                          │  INSERT INTO sessions      │
    │                          │───────────────────────────▶│
    │                          │                            │
    │                          │◀───────────────────────────│
    │                          │  Session ID                │
    │                          │                            │
    │                          │  SET session:{id}          │
    │                          │───────────────────────────▶│ Redis
    │                          │                            │
    │                          │  Sign JWT tokens           │
    │                          │  ─────────────────────     │
    │                          │                            │
    │◀─────────────────────────│                            │
    │  {accessToken, refreshToken}                          │
    │                          │                            │

  ═══════════════════════════════════════════════════════════════════════════════════════

  Subsequent Request with Token
    │                          │                            │
    │  GET /api/v1/users/me    │                            │
    │  Authorization: Bearer   │                            │
    │─────────────────────────▶│                            │
    │                          │                            │
    │                          │  Verify JWT signature      │
    │                          │  ─────────────────────     │
    │                          │                            │
    │                          │  GET session:{id}          │
    │                          │───────────────────────────▶│ Redis
    │                          │                            │
    │                          │◀───────────────────────────│
    │                          │  Session data (cache hit)  │
    │                          │                            │
    │                          │  Process request           │
    │                          │  ─────────────────────     │
    │                          │                            │
    │◀─────────────────────────│                            │
    │  {user data}             │                            │
```

### 14.3 Data Flow: Offline Sync

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              OFFLINE SYNC DATA FLOW                                      │
└─────────────────────────────────────────────────────────────────────────────────────────┘

  OFFLINE OPERATION
  ─────────────────────────────────────────────────────────────────────────────────────────

  Client (Offline)
    │
    │  User completes checkpoint
    │
    ▼
  ┌─────────────────────────────────────────┐
  │           Local Database                 │
  │  ┌───────────────────────────────────┐  │
  │  │  checkpoint_responses             │  │
  │  │  {id, answers, timestamp}         │  │
  │  └───────────────────────────────────┘  │
  │  ┌───────────────────────────────────┐  │
  │  │  sync_queue                       │  │
  │  │  {action: CREATE, data, ts}       │──┼──▶ Queued for sync
  │  └───────────────────────────────────┘  │
  └─────────────────────────────────────────┘


  SYNC OPERATION (Connection Restored)
  ─────────────────────────────────────────────────────────────────────────────────────────

  Client                       Backend                      Database
    │                             │                             │
    │  POST /api/v1/sync          │                             │
    │  {                          │                             │
    │    device_id,               │                             │
    │    last_sync_cursor,        │                             │
    │    changes: [               │                             │
    │      {action, data, ts}     │                             │
    │    ]                        │                             │
    │  }                          │                             │
    │────────────────────────────▶│                             │
    │                             │                             │
    │                             │  BEGIN TRANSACTION          │
    │                             │────────────────────────────▶│
    │                             │                             │
    │                             │  For each change:           │
    │                             │    Check for conflicts      │
    │                             │    Apply resolution         │
    │                             │────────────────────────────▶│
    │                             │                             │
    │                             │  Get server changes         │
    │                             │  since last_sync_cursor     │
    │                             │────────────────────────────▶│
    │                             │                             │
    │                             │◀────────────────────────────│
    │                             │  Server changes             │
    │                             │                             │
    │                             │  Update device_sync_state   │
    │                             │────────────────────────────▶│
    │                             │                             │
    │                             │  COMMIT                     │
    │                             │────────────────────────────▶│
    │                             │                             │
    │◀────────────────────────────│                             │
    │  {                          │                             │
    │    new_cursor,              │                             │
    │    server_changes: [...],   │                             │
    │    conflicts: [...]         │                             │
    │  }                          │                             │
    │                             │                             │
    │  Apply server changes       │                             │
    │  to local database          │                             │
    │  ──────────────────         │                             │
    │                             │                             │
    │  Resolve conflicts          │                             │
    │  (show UI if needed)        │                             │
    │  ──────────────────         │                             │
```

### 14.4 Data Flow: ML Matching

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           ML MATCHING DATA FLOW                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘

  Client                   Backend              Matching Service        Database
    │                         │                        │                    │
    │  POST /api/v1/match     │                        │                    │
    │  {learner_id, subject}  │                        │                    │
    │────────────────────────▶│                        │                    │
    │                         │                        │                    │
    │                         │  Get learner profile   │                    │
    │                         │───────────────────────────────────────────▶│
    │                         │                        │                    │
    │                         │◀───────────────────────────────────────────│
    │                         │  Learner data          │                    │
    │                         │                        │                    │
    │                         │  Get candidate mentors │                    │
    │                         │───────────────────────────────────────────▶│
    │                         │                        │                    │
    │                         │◀───────────────────────────────────────────│
    │                         │  Mentor list           │                    │
    │                         │                        │                    │
    │                         │  POST /match/score     │                    │
    │                         │  {learner, mentors}    │                    │
    │                         │───────────────────────▶│                    │
    │                         │                        │                    │
    │                         │                        │  Compute scores:   │
    │                         │                        │  - Subject (30%)   │
    │                         │                        │  - Style (20%)     │
    │                         │                        │  - Language (15%)  │
    │                         │                        │  - Availability(15%)│
    │                         │                        │  - Timezone (10%)  │
    │                         │                        │  - History (10%)   │
    │                         │                        │                    │
    │                         │◀───────────────────────│                    │
    │                         │  Ranked matches        │                    │
    │                         │                        │                    │
    │◀────────────────────────│                        │                    │
    │  {                      │                        │                    │
    │    matches: [           │                        │                    │
    │      {mentor, score,    │                        │                    │
    │       factors}          │                        │                    │
    │    ]                    │                        │                    │
    │  }                      │                        │                    │
```

### 14.5 Target Architecture: 1 Million Users

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                           EDUCONNECT - 1 MILLION USER ARCHITECTURE                                       │
│                                    (Phase 3 Target State)                                                │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘

                                              GLOBAL USERS
                                         ┌─────────────────────┐
                                         │  1,000,000 Users    │
                                         │  100,000 Concurrent │
                                         │  Global Distribution│
                                         └──────────┬──────────┘
                                                    │
                                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         EDGE LAYER (Global)                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐    │
│  │                              CloudFlare Enterprise CDN                                           │    │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  │    │
│  │  │   Americas    │  │    Europe     │  │     Asia      │  │    Africa     │  │   Oceania     │  │    │
│  │  │  Edge PoPs    │  │   Edge PoPs   │  │  Edge PoPs    │  │  Edge PoPs    │  │  Edge PoPs    │  │    │
│  │  │  - Static     │  │  - Static     │  │  - Static     │  │  - Static     │  │  - Static     │  │    │
│  │  │  - Media      │  │  - Media      │  │  - Media      │  │  - Media      │  │  - Media      │  │    │
│  │  │  - API Cache  │  │  - API Cache  │  │  - API Cache  │  │  - API Cache  │  │  - API Cache  │  │    │
│  │  └───────────────┘  └───────────────┘  └───────────────┘  └───────────────┘  └───────────────┘  │    │
│  │                                                                                                  │    │
│  │  Features: DDoS Protection │ WAF │ Bot Management │ Rate Limiting │ Workers (Edge Compute)      │    │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                    │
                              ┌─────────────────────┼─────────────────────┐
                              │                     │                     │
                              ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    COMPUTE LAYER (Multi-Region)                                          │
│                                                                                                          │
│  REGION: US-EAST                    REGION: EU-WEST                    REGION: ASIA-PACIFIC             │
│  ┌─────────────────────────┐        ┌─────────────────────────┐        ┌─────────────────────────┐      │
│  │  Kubernetes Cluster     │        │  Kubernetes Cluster     │        │  Kubernetes Cluster     │      │
│  │  ┌───────────────────┐  │        │  ┌───────────────────┐  │        │  ┌───────────────────┐  │      │
│  │  │   Backend Pods    │  │        │  │   Backend Pods    │  │        │  │   Backend Pods    │  │      │
│  │  │   (5-10 replicas) │  │        │  │   (5-10 replicas) │  │        │  │   (5-10 replicas) │  │      │
│  │  │   Auto-scaling    │  │        │  │   Auto-scaling    │  │        │  │   Auto-scaling    │  │      │
│  │  └───────────────────┘  │        │  └───────────────────┘  │        │  └───────────────────┘  │      │
│  │  ┌───────────────────┐  │        │  ┌───────────────────┐  │        │  ┌───────────────────┐  │      │
│  │  │   ML Services     │  │        │  │   ML Services     │  │        │  │   ML Services     │  │      │
│  │  │   (2-4 each)      │  │        │  │   (2-4 each)      │  │        │  │   (2-4 each)      │  │      │
│  │  │   GPU: Matching   │  │        │  │   GPU: Matching   │  │        │  │   GPU: Matching   │  │      │
│  │  │   GPU: Checkpoint │  │        │  │   GPU: Checkpoint │  │        │  │   GPU: Checkpoint │  │      │
│  │  └───────────────────┘  │        │  └───────────────────┘  │        │  └───────────────────┘  │      │
│  │  ┌───────────────────┐  │        │  ┌───────────────────┐  │        │  ┌───────────────────┐  │      │
│  │  │   Workers         │  │        │  │   Workers         │  │        │  │   Workers         │  │      │
│  │  │   BullMQ (3-5)    │  │        │  │   BullMQ (3-5)    │  │        │  │   BullMQ (3-5)    │  │      │
│  │  │   Celery (3-5)    │  │        │  │   Celery (3-5)    │  │        │  │   Celery (3-5)    │  │      │
│  │  └───────────────────┘  │        │  └───────────────────┘  │        │  └───────────────────┘  │      │
│  └─────────────────────────┘        └─────────────────────────┘        └─────────────────────────┘      │
│                                                                                                          │
│  Total: 15-30 Backend instances │ 12-24 ML instances │ 9-15 Workers │ Auto-scaling based on load        │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                    │
                              ┌─────────────────────┼─────────────────────┐
                              │                     │                     │
                              ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      DATA LAYER (High Availability)                                      │
│                                                                                                          │
│  ┌───────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                              PostgreSQL (Citus Distributed)                                        │  │
│  │                                                                                                    │  │
│  │    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                    │  │
│  │    │ Coordinator │     │   Worker 1  │     │   Worker 2  │     │   Worker 3  │                    │  │
│  │    │   (Primary) │     │  (Shard 1)  │     │  (Shard 2)  │     │  (Shard 3)  │                    │  │
│  │    │  128GB RAM  │     │   64GB RAM  │     │   64GB RAM  │     │   64GB RAM  │                    │  │
│  │    └──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘                    │  │
│  │           │                   │                   │                   │                            │  │
│  │    ┌──────┴──────┐     ┌──────┴──────┐     ┌──────┴──────┐     ┌──────┴──────┐                    │  │
│  │    │  Standby    │     │  Replica    │     │  Replica    │     │  Replica    │                    │  │
│  │    └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘                    │  │
│  │                                                                                                    │  │
│  │    Sharding: users by community_id │ content by community_id │ Reference tables replicated        │  │
│  │    Total Capacity: 1M users │ 5M sessions │ 500M audit_logs (partitioned)                         │  │
│  └───────────────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                          │
│  ┌───────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                      Redis Cluster                                                 │  │
│  │                                                                                                    │  │
│  │    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                                        │  │
│  │    │  Primary 1  │     │  Primary 2  │     │  Primary 3  │                                        │  │
│  │    │  Slots 0-   │     │  Slots      │     │  Slots      │                                        │  │
│  │    │  5460       │     │ 5461-10922  │     │10923-16383  │                                        │  │
│  │    │   8GB RAM   │     │   8GB RAM   │     │   8GB RAM   │                                        │  │
│  │    └──────┬──────┘     └──────┬──────┘     └──────┬──────┘                                        │  │
│  │           │                   │                   │                                                │  │
│  │    ┌──────┴──────┐     ┌──────┴──────┐     ┌──────┴──────┐                                        │  │
│  │    │  Replica 1  │     │  Replica 2  │     │  Replica 3  │                                        │  │
│  │    │   8GB RAM   │     │   8GB RAM   │     │   8GB RAM   │                                        │  │
│  │    └─────────────┘     └─────────────┘     └─────────────┘                                        │  │
│  │                                                                                                    │  │
│  │    Total: 48GB RAM │ 5M session keys │ 1M rate limit keys │ 2M cache keys │ Pub/Sub cluster-wide  │  │
│  └───────────────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                          │
│  ┌───────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                     Object Storage (S3/GCS)                                        │  │
│  │                                                                                                    │  │
│  │    ┌─────────────────────────────────────────────────────────────────────────────────────────┐    │  │
│  │    │  Media Content │ User Uploads │ ML Models │ Backups │ Multi-region replication          │    │  │
│  │    │  Estimated: 10TB total │ Lifecycle policies for cost optimization                       │    │  │
│  │    └─────────────────────────────────────────────────────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     MONITORING & OBSERVABILITY                                           │
│                                                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐                 │
│  │   Prometheus     │  │    Grafana       │  │   Jaeger         │  │   PagerDuty      │                 │
│  │   (Metrics)      │  │   (Dashboards)   │  │   (Tracing)      │  │   (Alerting)     │                 │
│  │                  │  │                  │  │                  │  │                  │                 │
│  │  - Request rates │  │  - Real-time     │  │  - Distributed   │  │  - On-call       │                 │
│  │  - Latencies     │  │    monitoring    │  │    tracing       │  │    rotation      │                 │
│  │  - Error rates   │  │  - SLO tracking  │  │  - Service maps  │  │  - Escalation    │                 │
│  │  - Resource use  │  │  - Capacity      │  │  - Bottleneck    │  │  - Incidents     │                 │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘                 │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘

 PERFORMANCE TARGETS (1M Users)
 ════════════════════════════════════════════════════════════════════════════════════════════════════════
 │ Metric                  │ Target           │ Measurement                                              │
 ├─────────────────────────┼──────────────────┼──────────────────────────────────────────────────────────┤
 │ API Response (p50)      │ < 50ms           │ Backend processing time                                  │
 │ API Response (p99)      │ < 200ms          │ Including network latency                                │
 │ Page Load (3G)          │ < 3s             │ Time to Interactive                                      │
 │ Offline Sync            │ < 30s            │ Daily content sync                                       │
 │ ML Matching             │ < 5s             │ Generate recommendations                                 │
 │ Concurrent Connections  │ 100,000          │ WebSocket + HTTP                                         │
 │ Availability            │ 99.9%            │ Uptime SLA                                               │
 │ Data Durability         │ 99.999999999%    │ 11 nines (S3 standard)                                   │
 └─────────────────────────┴──────────────────┴──────────────────────────────────────────────────────────┘
```

### 14.6 Key Scalability Design Principles

1. **Stateless Services**: All backend and ML services are stateless, enabling horizontal scaling.

2. **Database Read/Write Split**: Writes go to primary, reads distributed across replicas.

3. **Sharding by Community**: Data naturally partitions by community, enabling horizontal database scaling.

4. **Edge Caching**: Static content and API responses cached at CDN edge for global performance.

5. **Async Processing**: All non-critical operations processed asynchronously via message queues.

6. **Circuit Breakers**: Prevent cascade failures when dependent services are unavailable.

7. **Graceful Degradation**: Platform continues functioning (degraded) when ML services are overloaded.

8. **Multi-Region Active-Active**: Users routed to nearest region for lowest latency.

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2026 | Architecture Review | Initial comprehensive review |
| 1.1 | Jan 2026 | Architecture Review | Added 1M user scalability analysis |

---

*This document should be updated as architectural decisions evolve. Each significant change should go through the OpenSpec change proposal process.*
