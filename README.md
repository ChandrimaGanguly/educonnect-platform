# EduConnect Platform

A community-based educational social media platform designed to democratize access to quality education through peer-to-peer learning, mentor matching, and adaptive curriculum delivery, optimized for users in remote and underserved areas with limited connectivity (3G/4G).

## 🎯 Core Mission

Enable communities to build sustainable educational ecosystems where learners become mentors, knowledge flows bidirectionally, and practical skills are prioritized while maintaining alignment with formal education standards.

---

## 📋 Project Structure

```
educonnect-platform/
├── openspec/                    # OpenSpec specifications
│   ├── project.md              # Project overview and conventions
│   ├── specs/                  # Feature specifications
│   │   ├── core/               # User management, communities, roles
│   │   ├── matching/           # Mentor-learner matching system
│   │   ├── checkpoints/        # Learning assessments
│   │   ├── incentives/         # Points, badges, rewards
│   │   ├── curriculum/         # Content management
│   │   ├── oversight/          # Human oversight committees
│   │   ├── analytics/          # Data analytics & adaptation
│   │   ├── security/           # Security & trust systems
│   │   ├── mobile/             # Low-bandwidth optimization
│   │   ├── notifications/      # Notification system
│   │   └── content/            # Content moderation
│   ├── changes/                # Proposed changes (spec deltas)
│   └── archive/                # Completed changes
├── src/                        # Node.js/TypeScript backend source
├── python-services/            # Python ML/AI microservices
├── requirements.txt            # Python dependencies
├── package.json                # Node.js dependencies
├── docker-compose.yml          # Multi-service orchestration
├── AGENTS.md                   # AI coding assistant instructions
└── DEPENDENCIES.md             # Dependency documentation
```

---

## 🚀 Key Features

### 1. **Mentor-Learner Matching**
- AI-powered multi-dimensional compatibility scoring
- Peer mentor development pathways
- Group and cohort-based mentoring support

### 2. **Adaptive Learning Checkpoints**
- Multiple assessment formats (MCQ, practical, oral, project-based)
- Auto-generated inclusive evaluation criteria
- Continuous checkpoint evolution based on performance data

### 3. **Incentive System**
- Points (Learning, Mentor, Community)
- Achievements and badges with tiered progression
- Tangible rewards and certificate generation

### 4. **Community-First Architecture**
- Trust-based onboarding through community vouching
- Inter-community trust networks
- Voluntary human oversight committees

### 5. **Low-Bandwidth Optimization**
- Offline-first architecture with sync
- Progressive content loading
- Text-first with media alternatives
- Works on 3G connections

### 6. **Security & Privacy**
- Trust score-based permissions
- Multi-factor authentication
- Privacy-preserving analytics
- GDPR/FERPA compliance

---

## 🛠 Technology Stack

### Backend
- **Node.js 20+** with **TypeScript**
- **Fastify** - High-performance web framework
- **GraphQL** - Flexible API queries
- **PostgreSQL** - Primary database
- **Redis** - Caching and sessions
- **Prisma** - Type-safe ORM

### ML/AI Services (Python)
- **FastAPI** - Microservices framework
- **scikit-learn** - ML algorithms
- **transformers** - NLP and content generation
- **fairlearn/aif360** - Bias detection
- **Celery** - Background job processing

### Mobile
- **React Native** - Cross-platform mobile apps
- **PWA** support for web access

---

## 📦 Installation

### Prerequisites
- Node.js 20+ and npm 10+
- Python 3.10+
- PostgreSQL 14+
- Redis 7+
- Docker & Docker Compose (optional but recommended)

### Quick Start with Docker

```bash
# Clone repository
git clone <repo-url>
cd educonnect-platform

# Copy environment file
cp .env.example .env
# Edit .env with your configuration

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend
```

Services will be available at:
- Backend API: http://localhost:3000
- Matching Service: http://localhost:8001
- Analytics Service: http://localhost:8002
- Checkpoint Service: http://localhost:8003
- Moderation Service: http://localhost:8004

### Manual Installation

#### Backend (Node.js)
```bash
# Install dependencies
npm install

# Set up database
npm run migrate

# Run development server
npm run dev
```

#### Python Services
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run matching service
cd python-services/matching
uvicorn main:app --reload --port 8001
```

---

## 🧪 Testing

### Node.js Backend
```bash
npm test                # Run tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

### Python Services
```bash
pytest                  # Run all tests
pytest --cov           # With coverage
pytest -v              # Verbose output
```

---

## 📖 Specification-Driven Development

This project uses **OpenSpec** for specification-driven development. All features must be implemented according to specifications in `openspec/specs/`.

### Workflow

1. **Read the spec** for the feature you're implementing
2. **Understand requirements** (SHALL = mandatory, SHOULD = recommended, MAY = optional)
3. **Create change proposal** in `openspec/changes/[feature-name]/`
4. **Implement** according to spec scenarios
5. **Test** all scenario acceptance criteria

See [AGENTS.md](./AGENTS.md) for detailed development guidelines.

---

## 🔒 Security

- Trust-based community onboarding
- Multi-factor authentication
- Rate limiting and DDoS protection
- Encryption at rest and in transit
- Regular security audits

See [security specification](./openspec/specs/security/spec.md) for details.

---

## 📊 Monitoring

### With Docker (optional monitoring profile)
```bash
docker-compose --profile monitoring up -d
```

Access:
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)

### Development Tools
```bash
docker-compose --profile development up -d
```

Access:
- **pgAdmin**: http://localhost:5050
- **Redis Commander**: http://localhost:8081

---

## 🌍 Internationalization

The platform supports:
- Multi-language content
- RTL language support
- Community-driven translations
- Localized learning materials

---

## 📈 Scalability

- Horizontal scaling for all services
- CDN for static content
- Regional deployments for reduced latency
- Efficient database indexing
- Caching strategies

**Targets:**
- 100,000+ members per community
- 10,000+ concurrent users per deployment
- 99.9% uptime SLA

---

## 🤝 Contributing

1. Read the relevant specification in `openspec/specs/`
2. Create a change proposal
3. Implement with tests
4. Submit pull request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

---

## 📄 License

MIT License - See [LICENSE](./LICENSE) for details

---

## 📞 Support

- Documentation: `/docs`
- Issues: GitHub Issues
- Community: [Community Forum]
- Email: support@educonnect.org

---

## 🎓 Credits

Built with ❤️ for democratizing education access globally.

Special thanks to the open-source community for the amazing tools that make this possible.
