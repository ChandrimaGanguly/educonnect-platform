"""
Handler for file_generation tasks.

Creates new files from templates (fixtures, helpers, etc.)
"""

from pathlib import Path
from typing import TYPE_CHECKING

import aiofiles
from jinja2 import Template

from .base import TaskHandler

if TYPE_CHECKING:
    from ..config import Task
    from ..executor import TaskResult


class FileGenerationHandler(TaskHandler):
    """Handles generation of new files from templates."""

    async def execute(
        self,
        task: "Task",
        project_root: Path,
        verbose: bool = False,
    ) -> "TaskResult":
        """Generate files from templates."""

        from ..executor import TaskResult

        target_dir = self._resolve_path(task.target, project_root)
        target_dir.mkdir(parents=True, exist_ok=True)

        generated_files = []

        try:
            templates = task.templates or []
            for template_name in templates:
                file_path = target_dir / template_name

                if file_path.exists():
                    if verbose:
                        print(f"Skipping existing file: {file_path}")
                    continue

                content = self._get_template_content(template_name, task)

                async with aiofiles.open(file_path, "w") as f:
                    await f.write(content)

                generated_files.append(file_path.name)

            if not generated_files:
                return TaskResult(
                    task_id=task.id,
                    success=True,
                    message="All files already exist, nothing to generate",
                )

            return TaskResult(
                task_id=task.id,
                success=True,
                message=f"Generated {len(generated_files)} files",
                output=", ".join(generated_files),
            )

        except Exception as e:
            return TaskResult(
                task_id=task.id,
                success=False,
                error=f"Failed to generate files: {str(e)}",
            )

    def _get_template_content(self, template_name: str, task: "Task") -> str:
        """Get template content based on template name."""

        if template_name == "users.fixture.ts":
            return self._user_fixture_template()
        elif template_name == "communities.fixture.ts":
            return self._community_fixture_template()
        elif template_name == "assessments.fixture.ts":
            return self._assessment_fixture_template()
        elif template_name == "database.helper.ts":
            return self._database_helper_template()
        elif template_name == "setup.ts":
            return self._integration_setup_template()
        elif template_name == "conftest.py":
            return self._python_conftest_template()
        elif template_name == "fixtures/common.py":
            return self._python_fixtures_template()
        elif template_name == "rollback-workflow.yml":
            return self._rollback_workflow_template()
        elif template_name.endswith(".md"):
            return self._markdown_template(template_name)
        else:
            return f"// TODO: Implement {template_name}\n"

    def _user_fixture_template(self) -> str:
        return '''/**
 * User test fixtures
 */

import { hash } from '../../utils/password';

export const testUsers = {
  admin: {
    email: 'admin@test.com',
    username: 'testadmin',
    password_hash: '', // Will be set in beforeEach
    full_name: 'Test Admin',
    trust_score: 100,
  },
  mentor: {
    email: 'mentor@test.com',
    username: 'testmentor',
    password_hash: '',
    full_name: 'Test Mentor',
    trust_score: 80,
  },
  learner: {
    email: 'learner@test.com',
    username: 'testlearner',
    password_hash: '',
    full_name: 'Test Learner',
    trust_score: 50,
  },
};

export async function hashFixturePasswords() {
  for (const user of Object.values(testUsers)) {
    user.password_hash = await hash('TestPassword123!');
  }
}
'''

    def _community_fixture_template(self) -> str:
        return '''/**
 * Community test fixtures
 */

export const testCommunities = {
  public: {
    name: 'Test Community',
    description: 'A test community for integration tests',
    is_private: false,
    settings: {},
  },
  private: {
    name: 'Private Test Community',
    description: 'A private test community',
    is_private: true,
    settings: {},
  },
};
'''

    def _assessment_fixture_template(self) -> str:
        return '''/**
 * Assessment test fixtures
 */

export const testAssessments = {
  quiz: {
    title: 'Test Quiz',
    type: 'multiple_choice',
    questions: [
      {
        question: 'What is 2 + 2?',
        options: ['3', '4', '5', '6'],
        correct: 1,
      },
    ],
  },
  essay: {
    title: 'Test Essay',
    type: 'essay',
    prompt: 'Describe your learning goals.',
  },
};
'''

    def _database_helper_template(self) -> str:
        return '''/**
 * Database helpers for integration tests
 */

import { getDatabase } from '../../database';

export async function setupTestDatabase() {
  const db = getDatabase();

  // Run migrations
  await db.migrate.latest();

  return db;
}

export async function teardownTestDatabase() {
  const db = getDatabase();

  // Rollback all migrations
  await db.migrate.rollback(undefined, true);

  await db.destroy();
}

export async function truncateAllTables() {
  const db = getDatabase();

  await db.raw('TRUNCATE TABLE users, communities, sessions RESTART IDENTITY CASCADE');
}
'''

    def _integration_setup_template(self) -> str:
        return '''/**
 * Integration test setup
 */

import { setupTestDatabase, teardownTestDatabase } from './database.helper';

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});
'''

    def _python_conftest_template(self) -> str:
        return '''"""
Pytest configuration and fixtures for Python services.
"""

import pytest
import asyncio
from typing import AsyncGenerator

@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
async def test_client():
    """Create test HTTP client."""
    # TODO: Implement test client
    pass

@pytest.fixture
async def test_db():
    """Create test database connection."""
    # TODO: Implement test database
    pass
'''

    def _python_fixtures_template(self) -> str:
        return '''"""
Common test fixtures for Python services.
"""

import pytest

@pytest.fixture
def sample_user():
    """Sample user data for tests."""
    return {
        "id": 1,
        "email": "test@example.com",
        "username": "testuser",
    }

@pytest.fixture
def sample_community():
    """Sample community data for tests."""
    return {
        "id": 1,
        "name": "Test Community",
        "description": "A test community",
    }
'''

    def _rollback_workflow_template(self) -> str:
        return '''name: Rollback Deployment

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to rollback'
        required: true
        type: choice
        options:
          - staging
          - production
      revision:
        description: 'Revision to rollback to (previous by default)'
        required: false
        type: string

jobs:
  rollback:
    runs-on: ubuntu-latest
    environment:
      name: ${{ inputs.environment }}

    steps:
      - name: Configure kubectl
        run: |
          echo "${{ secrets.KUBECONFIG }}" | base64 -d > kubeconfig
          export KUBECONFIG=./kubeconfig

      - name: Rollback deployment
        run: |
          kubectl rollout undo deployment/educonnect-backend \\
            --namespace=${{ inputs.environment }} \\
            ${REVISION:+--to-revision=${{ inputs.revision }}}

          for service in matching analytics checkpoint moderation; do
            kubectl rollout undo deployment/educonnect-$service \\
              --namespace=${{ inputs.environment }} \\
              ${REVISION:+--to-revision=${{ inputs.revision }}}
          done

      - name: Verify rollback
        run: |
          kubectl rollout status deployment/educonnect-backend \\
            --namespace=${{ inputs.environment }}
'''

    def _markdown_template(self, name: str) -> str:
        """Generate markdown documentation templates."""
        if "deployment" in name:
            return '''# Deployment Runbook

## Prerequisites
- Access to Kubernetes cluster
- kubectl configured
- Appropriate permissions

## Deployment Steps

### 1. Pre-deployment Checks
- [ ] All tests passing
- [ ] Code review approved
- [ ] Database migrations reviewed

### 2. Deploy to Staging
```bash
# Trigger deployment
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0
```

### 3. Verify Staging
- [ ] Health checks passing
- [ ] Smoke tests completed
- [ ] Performance metrics acceptable

### 4. Deploy to Production
- Deployment triggered automatically on tag push
- Requires manual approval in GitHub

### 5. Post-deployment
- [ ] Monitor error rates
- [ ] Check application logs
- [ ] Verify database migrations

## Troubleshooting
See troubleshooting.md
'''
        elif "rollback" in name:
            return '''# Rollback Procedures

## When to Rollback
- Critical bugs in production
- Performance degradation
- Database migration failures

## Rollback Steps

### Automatic Rollback
Use the rollback workflow in GitHub Actions

### Manual Rollback
```bash
kubectl rollout undo deployment/educonnect-backend --namespace=production
```

## Verification
- Check health endpoints
- Monitor error rates
- Verify functionality
'''
        else:
            return f"# {name.replace('.md', '').replace('-', ' ').title()}\n\nTODO: Add content\n"
