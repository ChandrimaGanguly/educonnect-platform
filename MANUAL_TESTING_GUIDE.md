# Manual Testing Guide: Mentorship Matching System

This guide walks you through manually testing the mentorship matching system step-by-step.

---

## Part 1: Python Matching Algorithm (Direct Test)

### Step 1.1: Activate Python Environment

```bash
cd /home/gangucham/educonnect-platform/python-services/matching
source ../../educonnect-venv/bin/activate
```

**Expected Output**: Your terminal prompt should change to show `(educonnect-venv)`.

### Step 1.2: Run the Direct Algorithm Test

```bash
python test_matching_manual.py
```

**What This Tests**:
- Direct Python function calls (no HTTP)
- 3 different mentor-learner matching scenarios
- Score calculation accuracy
- Human-readable match reasons

**Expected Output**:
```
================================================================================
MATCHING ALGORITHM TEST
================================================================================

Learner Profile:
  Learning Goals: ['mathematics', 'physics', 'programming']
  Availability: 3 slots
    - monday: 18:00 - 20:00
    - wednesday: 18:00 - 20:00
    - friday: 18:00 - 20:00

--------------------------------------------------------------------------------
MENTOR 1: Good subject + good availability match
--------------------------------------------------------------------------------
  📊 Overall Score: 66.67/100
  📚 Subject Overlap: 66.67/100
  📅 Availability Overlap: 66.67/100
  💡 Reasons:
     - Strong subject overlap
     - Good schedule alignment

[... more test scenarios ...]

✅ Matching algorithm test completed successfully!
```

**What to Verify**:
- ✅ All 3 mentors are scored
- ✅ Perfect match gets 100/100
- ✅ Scores are reasonable (0-100 range)
- ✅ Match reasons are descriptive
- ✅ Mentor 3 (perfect match) ranks #1

---

## Part 2: Python FastAPI Service Test

### Step 2.1: Start the Test Server

**Terminal 1** (Server):
```bash
cd /home/gangucham/educonnect-platform/python-services/matching
source ../../educonnect-venv/bin/activate
python test_server.py
```

**Expected Output**:
```
Starting Matching Test Server on http://localhost:8001
No database dependencies required
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8001 (Press CTRL+C to quit)
```

**What This Does**:
- Starts a FastAPI web server on port 8001
- Exposes HTTP endpoints for match scoring
- No database connection required (standalone test mode)

### Step 2.2: Test Health Endpoint

**Terminal 2** (Testing):
```bash
curl http://localhost:8001/health
```

**Expected Response**:
```json
{"status":"ok","service":"matching-test"}
```

**What This Tests**: Server is running and responding to HTTP requests.

### Step 2.3: Test Root Endpoint

```bash
curl http://localhost:8001/
```

**Expected Response**:
```json
{
  "service": "Matching Service Test Server",
  "version": "0.1.0",
  "status": "operational"
}
```

### Step 2.4: Test Match Scoring Endpoint (Good Match)

```bash
curl -X POST http://localhost:8001/match/score \
  -H "Content-Type: application/json" \
  -d '{
    "learner_profile": {
      "learning_goals": ["mathematics", "physics", "programming"],
      "availability": [
        {"day_of_week": "monday", "start_time": "18:00", "end_time": "20:00"},
        {"day_of_week": "wednesday", "start_time": "18:00", "end_time": "20:00"}
      ]
    },
    "mentor_profile": {
      "subjects": ["mathematics", "physics"],
      "availability": [
        {"day_of_week": "monday", "start_time": "17:00", "end_time": "21:00"},
        {"day_of_week": "wednesday", "start_time": "17:00", "end_time": "21:00"}
      ]
    }
  }'
```

**Expected Response**:
```json
{
    "overall_score": 66.67,
    "subject_overlap_score": 66.67,
    "availability_overlap_score": 66.67,
    "match_reasons": [
        "Strong subject overlap",
        "Good schedule alignment"
    ]
}
```

**What to Verify**:
- ✅ Status code 200 OK
- ✅ JSON response with all fields
- ✅ Scores are numbers (not strings)
- ✅ Match reasons is an array of strings
- ✅ Score makes sense (2 of 3 subjects = ~67%, 2 of 2 days = 100%, weighted = 66.67)

### Step 2.5: Test Perfect Match

```bash
curl -X POST http://localhost:8001/match/score \
  -H "Content-Type: application/json" \
  -d '{
    "learner_profile": {
      "learning_goals": ["mathematics", "physics"],
      "availability": [
        {"day_of_week": "monday", "start_time": "18:00", "end_time": "20:00"}
      ]
    },
    "mentor_profile": {
      "subjects": ["mathematics", "physics"],
      "availability": [
        {"day_of_week": "monday", "start_time": "18:00", "end_time": "20:00"}
      ]
    }
  }'
```

**Expected Response**:
```json
{
    "overall_score": 100.0,
    "subject_overlap_score": 100.0,
    "availability_overlap_score": 100.0,
    "match_reasons": [
        "Excellent subject expertise match",
        "Highly compatible schedules"
    ]
}
```

### Step 2.6: Test No Match

```bash
curl -X POST http://localhost:8001/match/score \
  -H "Content-Type: application/json" \
  -d '{
    "learner_profile": {
      "learning_goals": ["mathematics"],
      "availability": [
        {"day_of_week": "monday", "start_time": "18:00", "end_time": "20:00"}
      ]
    },
    "mentor_profile": {
      "subjects": ["web development"],
      "availability": [
        {"day_of_week": "saturday", "start_time": "10:00", "end_time": "12:00"}
      ]
    }
  }'
```

**Expected Response**:
```json
{
    "overall_score": 0.0,
    "subject_overlap_score": 0.0,
    "availability_overlap_score": 0.0,
    "match_reasons": [
        "Limited subject overlap",
        "Limited schedule overlap"
    ]
}
```

**What to Verify**:
- ✅ No overlap = 0.0 score
- ✅ Reasons say "Limited" overlap
- ✅ No errors or crashes

### Step 2.7: Test Invalid Request (Should Error)

```bash
curl -X POST http://localhost:8001/match/score \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}'
```

**Expected Response**: 422 Validation Error
```json
{
    "detail": [
        {
            "type": "missing",
            "loc": ["body", "learner_profile"],
            "msg": "Field required",
            ...
        }
    ]
}
```

**What This Tests**: FastAPI validation is working correctly.

### Step 2.8: Stop the Server

In Terminal 1, press `CTRL+C` to stop the server.

---

## Part 3: Comprehensive Integration Test

### Step 3.1: Make Test Script Executable

```bash
cd /home/gangucham/educonnect-platform
chmod +x test_mentorship_integration.sh
```

### Step 3.2: Start Python Server (Terminal 1)

```bash
cd /home/gangucham/educonnect-platform/python-services/matching
source ../../educonnect-venv/bin/activate
python test_server.py
```

### Step 3.3: Run Integration Test (Terminal 2)

```bash
cd /home/gangucham/educonnect-platform
./test_mentorship_integration.sh
```

**What This Tests**:
- Python service health check
- 4 different match scenarios (0%, ~42%, 80%, 100%)
- Proper score weighting
- Match quality categorization
- Full workflow documentation

**Expected Output**: See full output in terminal with:
- ✅ Service operational check
- ✅ 4 test scenarios with scores
- ✅ Algorithm validation summary
- ✅ API endpoint list
- ✅ Workflow simulation
- ✅ Final test summary

---

## Part 4: TypeScript Code Verification

### Step 4.1: Check TypeScript Compilation

```bash
cd /home/gangucham/educonnect-platform
npm run typecheck 2>&1 | grep -E "error TS" | grep -v checkpoint
```

**Expected Output**: No errors related to mentorship code.

**What This Tests**:
- All TypeScript files compile
- Type safety is maintained
- No syntax errors

### Step 4.2: View Created Files

```bash
# View types
cat src/types/mentorship.types.ts | head -50

# View migration
cat src/database/migrations/20260116110917_create_mentorship_tables.ts | head -50

# View service
cat src/services/mentorship/mentor-profile.service.ts | head -50

# View routes
cat src/routes/mentorship/mentor-profiles.ts | head -50
```

### Step 4.3: Verify Route Registration

```bash
grep -A 10 "Mentorship routes" src/routes/index.ts
```

**Expected Output**:
```typescript
// Mentorship routes (Phase 1 Group F)
await server.register(mentorProfileRoutes, { prefix: '/api/v1/mentorship' });
await server.register(mentorshipRequestRoutes, { prefix: '/api/v1/mentorship' });
await server.register(mentorshipRelationshipRoutes, { prefix: '/api/v1/mentorship' });
await server.register(matchingRoutes, { prefix: '/api/v1/mentorship' });
```

---

## Part 5: Database Migration (When Database Available)

### Step 5.1: Check Database Connection

```bash
# Check if database is running
npm run migrate:status 2>&1 | head -10
```

**If Database is Running**:

### Step 5.2: Run Migration

```bash
npm run migrate
```

**Expected Output**:
```
Batch 1 run: 1 migrations
/path/to/migrations/20260116110917_create_mentorship_tables.ts
```

### Step 5.3: Verify Tables Created

```bash
# Connect to PostgreSQL and check tables
psql $DATABASE_URL -c "\dt mentor*"
```

**Expected Tables**:
- mentor_profiles
- mentorship_requests
- mentorship_relationships
- mentorship_feedback

### Step 5.4: Verify Triggers

```bash
psql $DATABASE_URL -c "SELECT trigger_name FROM information_schema.triggers WHERE trigger_name LIKE '%mentor%';"
```

**Expected Triggers**:
- update_mentor_profiles_updated_at
- update_mentorship_requests_updated_at
- update_mentorship_relationships_updated_at
- update_mentorship_feedback_updated_at
- update_mentor_mentee_count_trigger

---

## Part 6: API Endpoint Testing (When Backend Running)

**Prerequisites**: Database and Node.js backend running.

### Step 6.1: Start Backend

```bash
npm run dev
```

### Step 6.2: Register a User

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "mentor@example.com",
    "username": "testmentor",
    "password": "Test123!",
    "fullName": "Test Mentor"
  }'
```

Save the JWT token from response.

### Step 6.3: Create Mentor Profile

```bash
export TOKEN="your-jwt-token-here"

curl -X POST http://localhost:3000/api/v1/mentorship/mentors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "subjects": ["mathematics", "physics"],
    "bio": "Experienced tutor with 5 years of teaching",
    "max_mentees": 5,
    "preferred_session_duration": 60
  }'
```

**Expected Response**: 201 Created with mentor profile object.

### Step 6.4: Get Mentor Profile

```bash
curl http://localhost:3000/api/v1/mentorship/mentors/me \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response**: Full mentor profile with user details, skills, availability.

### Step 6.5: Update Mentor Status

```bash
curl -X PATCH http://localhost:3000/api/v1/mentorship/mentors/me/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"mentor_status": "available"}'
```

### Step 6.6: Search Mentors (Public)

```bash
curl "http://localhost:3000/api/v1/mentorship/mentors?limit=10"
```

**Expected Response**: Paginated list of available mentors.

### Step 6.7: Test Match Endpoint

```bash
curl -X POST http://localhost:3000/api/v1/mentorship/match \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "subject_id": "some-uuid",
    "limit": 5
  }'
```

**Expected**: Calls Python service, returns ranked mentors with scores.

---

## Troubleshooting Common Issues

### Issue 1: Python Service Not Starting

**Error**: `ModuleNotFoundError: No module named 'psycopg2'`

**Solution**: Use the standalone test server instead:
```bash
python test_server.py  # instead of python main.py
```

### Issue 2: Port Already in Use

**Error**: `[Errno 98] Address already in use`

**Solution**:
```bash
# Find and kill process on port 8001
lsof -ti:8001 | xargs kill -9
```

### Issue 3: Virtual Environment Not Activated

**Symptom**: `command not found: uvicorn`

**Solution**:
```bash
source /home/gangucham/educonnect-platform/educonnect-venv/bin/activate
```

### Issue 4: Database Connection Error

**Error**: `password authentication failed`

**Solution**: Database is not running. This is expected for service tests - use `test_server.py` which doesn't require DB.

---

## Success Criteria Checklist

After completing all manual tests, verify:

- [ ] Python algorithm runs directly (Part 1)
- [ ] FastAPI service responds to HTTP requests (Part 2)
- [ ] Health endpoint returns OK (Part 2.2)
- [ ] Match scoring returns valid JSON (Part 2.4-2.6)
- [ ] Invalid requests return proper errors (Part 2.7)
- [ ] Integration test passes all scenarios (Part 3)
- [ ] TypeScript compiles without errors (Part 4.1)
- [ ] Routes are registered correctly (Part 4.3)
- [ ] Migration file exists and is valid (Part 4.2)
- [ ] All 20 API endpoints are documented (Part 4)

---

## Next Steps

1. **With Database**: Run migration, test full CRUD operations
2. **Write Tests**: Create Jest unit tests for services
3. **Load Testing**: Test with 100+ mentors
4. **Security Audit**: Test for SQL injection, IDOR
5. **Monitoring**: Set up logging and metrics
6. **Deployment**: Deploy to staging environment

---

## Quick Reference Commands

```bash
# Start Python test server
cd python-services/matching && source ../../educonnect-venv/bin/activate && python test_server.py

# Run algorithm test
cd python-services/matching && source ../../educonnect-venv/bin/activate && python test_matching_manual.py

# Run integration test
./test_mentorship_integration.sh

# Check TypeScript
npm run typecheck

# Run migration (when DB available)
npm run migrate

# Start backend (when DB available)
npm run dev
```

---

**Happy Testing! 🎉**
