# Quick Start Guide - Phase 1 Group B

This guide will help you get the EduConnect Platform API up and running with Phase 1 Group B features (Authentication & API Gateway).

## Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- Docker and Docker Compose (for PostgreSQL and Redis)
- Git

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and update it:

```bash
cp .env.example .env
```

**IMPORTANT:** Update the following values in `.env`:

```bash
# Generate a secure JWT secret (32+ characters)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-change-this

# Generate a secure session secret (32+ characters)
SESSION_SECRET=your-session-secret-min-32-chars-change-this

# Database password
DB_PASSWORD=your-secure-database-password
```

You can generate secure secrets using:
```bash
# On Linux/macOS
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Start Infrastructure Services

Start PostgreSQL and Redis using Docker Compose:

```bash
docker-compose up -d postgres redis
```

Verify services are running:

```bash
docker-compose ps
```

### 4. Run Database Migrations

Create the database schema:

```bash
npm run migrate
```

This will create the following tables:
- `users` - User accounts and profiles
- `communities` - Community management
- `sessions` - Authentication sessions
- `user_profiles` - Extended user profiles
- `community_memberships` - User-community relationships
- `rbac_system` - Role-based access control

### 5. Start the Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

## Verify Installation

### 1. Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-09T...",
  "uptime": 123.456,
  "environment": "development"
}
```

### 2. Readiness Check

```bash
curl http://localhost:3000/ready
```

Expected response:
```json
{
  "status": "ready",
  "database": true,
  "redis": true
}
```

### 3. API Info

```bash
curl http://localhost:3000/
```

Expected response:
```json
{
  "name": "EduConnect Platform API",
  "version": "0.1.0",
  "documentation": "/docs"
}
```

## Test Authentication Flow

### 1. Register a New User

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "Test1234!",
    "fullName": "Test User"
  }'
```

Expected response (example):
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "test@example.com",
    "username": "testuser",
    "fullName": "Test User"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Save the `accessToken` for the next steps!

### 2. Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrUsername": "testuser",
    "password": "Test1234!"
  }'
```

### 3. Get Current User (Protected Route)

Replace `YOUR_ACCESS_TOKEN` with the token from registration/login:

```bash
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected response:
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "test@example.com",
    "username": "testuser",
    "fullName": "Test User",
    "trustScore": 0,
    "reputationPoints": 0,
    "emailVerified": false,
    "mfaEnabled": false,
    "createdAt": "2026-01-09T..."
  }
}
```

### 4. List Active Sessions

```bash
curl http://localhost:3000/api/v1/auth/sessions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 5. Refresh Token

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

### 6. Logout

```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Test GraphQL API

### 1. Access GraphQL Playground

Open your browser and navigate to:
```
http://localhost:3000/graphql
```

### 2. Register via GraphQL

```graphql
mutation {
  register(input: {
    email: "graphql@example.com"
    username: "graphqluser"
    password: "Test1234!"
    fullName: "GraphQL User"
  }) {
    accessToken
    refreshToken
    user {
      id
      email
      username
      fullName
    }
  }
}
```

### 3. Login via GraphQL

```graphql
mutation {
  login(input: {
    emailOrUsername: "graphqluser"
    password: "Test1234!"
  }) {
    accessToken
    refreshToken
    user {
      id
      email
      username
      fullName
      trustScore
      reputationPoints
    }
  }
}
```

### 4. Query Current User (Protected)

First, set the Authorization header in GraphQL Playground:
```json
{
  "Authorization": "Bearer YOUR_ACCESS_TOKEN"
}
```

Then run the query:
```graphql
query {
  me {
    id
    email
    username
    fullName
    bio
    trustScore
    reputationPoints
    emailVerified
    mfaEnabled
    createdAt
  }
}
```

### 5. List Sessions

```graphql
query {
  mySessions {
    id
    deviceInfo
    ipAddress
    createdAt
    lastActivityAt
  }
}
```

## Enable Multi-Factor Authentication (MFA)

### 1. Update Environment Variable

In your `.env` file, set:
```bash
ENABLE_MFA=true
```

Restart the server:
```bash
# Stop with Ctrl+C, then:
npm run dev
```

### 2. Setup MFA

```bash
curl -X POST http://localhost:3000/api/v1/auth/mfa/setup \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "Test1234!"
  }'
```

Response will include:
```json
{
  "message": "MFA setup initiated",
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCodeUri": "otpauth://totp/EduConnect:test@example.com?secret=JBSWY3DPEHPK3PXP&issuer=EduConnect",
  "backupCodes": [
    "A1B2-C3D4",
    "E5F6-G7H8",
    ...
  ]
}
```

### 3. Generate QR Code

Use the `qrCodeUri` with a QR code generator:
- Copy the URI to https://www.qr-code-generator.com/
- Or use `qrencode` command line tool

Scan the QR code with an authenticator app (Google Authenticator, Authy, etc.)

### 4. Verify MFA Code

Get the 6-digit code from your authenticator app:

```bash
curl -X POST http://localhost:3000/api/v1/auth/mfa/verify \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "123456"
  }'
```

### 5. Login with MFA

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrUsername": "testuser",
    "password": "Test1234!",
    "mfaCode": "123456"
  }'
```

## Database Management

### View Database with pgAdmin (Optional)

Start pgAdmin:
```bash
docker-compose --profile development up -d pgadmin
```

Access at: http://localhost:5050
- Email: admin@educonnect.local
- Password: admin

### View Redis Data (Optional)

Start Redis Commander:
```bash
docker-compose --profile development up -d redis-commander
```

Access at: http://localhost:8081

### Run Additional Migrations

```bash
npm run migrate
```

### Rollback Last Migration

```bash
npm run migrate:rollback
```

## Development Tools

### Run Linting

```bash
npm run lint
```

### Fix Linting Issues

```bash
npm run lint:fix
```

### Format Code

```bash
npm run format
```

### Type Checking

```bash
npm run typecheck
```

## Troubleshooting

### Port Already in Use

If port 3000 is already in use, change it in `.env`:
```bash
PORT=3001
```

### Database Connection Failed

1. Verify PostgreSQL is running:
   ```bash
   docker-compose ps postgres
   ```

2. Check PostgreSQL logs:
   ```bash
   docker-compose logs postgres
   ```

3. Verify DATABASE_URL in `.env` matches your setup

### Redis Connection Failed

1. Verify Redis is running:
   ```bash
   docker-compose ps redis
   ```

2. Check Redis logs:
   ```bash
   docker-compose logs redis
   ```

### Migration Errors

If migrations fail, check:
1. Database is running
2. DATABASE_URL is correct
3. Database user has CREATE TABLE permissions

Reset database (⚠️ This will delete all data):
```bash
docker-compose down -v
docker-compose up -d postgres redis
npm run migrate
```

### TypeScript Errors

Ensure all dependencies are installed:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

Once Phase 1 Group B is working:

1. **Explore the API**
   - Try all authentication endpoints
   - Test rate limiting
   - Experiment with GraphQL queries

2. **Review the Code**
   - Check `src/routes/auth.ts` for REST endpoints
   - Review `src/graphql/schema.ts` and `resolvers.ts`
   - Understand middleware in `src/middleware/auth.ts`

3. **Prepare for Phase 1 Group C**
   - User Profile System
   - Community Management
   - Role-Based Access Control
   - Trust Score Foundation

## Useful Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f backend

# Reset everything (⚠️ deletes data)
docker-compose down -v
docker-compose up -d
npm run migrate

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

## Support

For issues or questions:
- Check `PHASE1-GROUP-B-SUMMARY.md` for detailed implementation info
- Review API documentation in the summary
- Check logs in the console

## Success Criteria

✅ All health checks pass
✅ User registration works
✅ User login works
✅ Protected routes require authentication
✅ Token refresh works
✅ Session management works
✅ GraphQL queries work
✅ MFA setup and verification works (when enabled)
✅ Rate limiting prevents abuse

---

**Congratulations!** You now have a fully functional authentication system and API gateway for the EduConnect Platform.
