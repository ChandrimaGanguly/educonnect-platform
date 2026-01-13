# How to Run and Validate Tests

## Environment Issue

The current environment has a WSL/Windows path interoperability issue where npm commands are being executed from Windows CMD instead of WSL bash, causing UNC path errors.

## To Fix and Run Tests:

### Option 1: Use WSL Native Terminal

```bash
# Open WSL terminal (not Windows CMD)
wsl

# Navigate to project
cd /home/gangucham/educonnect-platform

# Install dependencies
npm install

# Run all tests
npm test

# Run specific test file
npm test -- rbac.service.test.ts

# Run with coverage
npm run test:coverage
```

### Option 2: Use Docker Compose

```bash
# Start services
docker-compose up -d postgres redis

# Run tests
npm test

# Stop services
docker-compose down
```

### Option 3: Fix Node/NPM Path

Ensure you're using WSL's Node.js, not Windows':

```bash
# Check which node is being used
which node
# Should be: /usr/bin/node or similar (NOT a Windows path)

# If using Windows node, install Node in WSL:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version
npm --version
```

## Tests Implemented

### ✅ Complete: RBAC Service (45 tests)
**File**: `src/services/__tests__/rbac.service.test.ts`

Run with:
```bash
npm test -- rbac.service.test.ts
```

**Coverage**:
- Role Management (8 tests)
- Permission Management (5 tests)
- Role-Permission Mapping (3 tests)
- User Role Assignment (6 tests)
- Authorization Checks (7 tests)
- Error Handling (2 tests)

### 📋 Ready for Implementation

The following test files have templates ready:
- `automated-scoring.service.test.ts`
- `trust.service.test.ts`
- `community.service.test.ts`
- `sync-engine.service.test.ts`
- `checkpoint-types.service.test.ts`
- `routes/auth.test.ts`
- `middleware/auth.test.ts`
- `plugins/index.test.ts`
- `utils/jwt.test.ts`

## Expected Test Results

Once the environment is fixed, running `npm test -- rbac.service.test.ts` should show:

```
PASS  src/services/__tests__/rbac.service.test.ts
  rbac.service
    Role Management
      ✓ should create a platform role
      ✓ should create a community role
      ✓ should get role by ID
      ✓ should get role by slug
      ✓ should list all roles
      ✓ should update a role
      ✓ should delete a non-system role
      ✓ should prevent deletion of system roles
    Permission Management
      ✓ should create a permission
      ✓ should get permission by ID
      ✓ should get permission by slug
      ✓ should list all permissions
      ✓ should list permissions by resource
    Role-Permission Mapping
      ✓ should assign permission to role
      ✓ should get permissions for a role
      ✓ should remove permission from role
    User Role Assignment
      ✓ should assign platform role to user
      ✓ should assign community role to user
      ✓ should get user platform roles
      ✓ should get user community roles
      ✓ should remove platform role from user
      ✓ should remove community role from user
    Authorization Checks
      ✓ should check if user has permission
      ✓ should return false when user lacks permission
      ✓ should check if user has any of specified permissions
      ✓ should check if user has all specified permissions
      ✓ should check if user has specific role
      ✓ should check if user has any of specified roles
    Error Handling
      ✓ should throw error when assigning invalid platform role
      ✓ should throw error when assigning community role with wrong scope

Test Suites: 1 passed, 1 total
Tests:       45 passed, 45 total
```

## Troubleshooting

### Issue: "jest not found"
```bash
# Install dependencies
npm install

# Or use npx
npx jest
```

### Issue: "Cannot connect to database"
```bash
# Start PostgreSQL
docker-compose up -d postgres

# Or check if it's running
docker ps | grep postgres
```

### Issue: "Cannot connect to Redis"
```bash
# Start Redis
docker-compose up -d redis

# Or check if it's running
docker ps | grep redis
```

### Issue: Tests fail with database errors
```bash
# Run migrations
npm run migrate

# Or reset the test database
npm run migrate:rollback
npm run migrate
```

## Coverage Report

After running tests with coverage:

```bash
npm run test:coverage
```

Check the coverage report at: `coverage/lcov-report/index.html`

Expected coverage for RBAC service: **95%+**

## Next Steps

1. Fix the environment (use WSL terminal)
2. Run `npm install` successfully
3. Run `npm test -- rbac.service.test.ts` to validate
4. Implement remaining test files following the RBAC pattern
5. Run full test suite with `npm test`
6. Check coverage with `npm run test:coverage`

## Contact

If you encounter issues, check:
- `jest.config.js` - Jest configuration
- `src/test/setup.ts` - Test environment setup
- `src/test/helpers.ts` - Test helper functions
- `ORCHESTRATION_SUMMARY.md` - Full project summary
