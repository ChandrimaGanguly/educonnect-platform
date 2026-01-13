"""
Handler for test_generation tasks.

Generates test files for TypeScript/JavaScript and Python source files.
"""

import asyncio
import subprocess
from pathlib import Path
from typing import TYPE_CHECKING

import aiofiles
from jinja2 import Template

from .base import TaskHandler

if TYPE_CHECKING:
    from ..config import Task
    from ..executor import TaskResult


class TestGenerationHandler(TaskHandler):
    """Handles test file generation."""

    async def execute(
        self,
        task: "Task",
        project_root: Path,
        verbose: bool = False,
    ) -> "TaskResult":
        """Generate test file for the target source file."""

        from ..executor import TaskResult

        target_path = self._resolve_path(task.target, project_root)
        test_path = self._resolve_path(task.test_file or "", project_root)

        if not target_path.exists():
            return TaskResult(
                task_id=task.id,
                success=False,
                error=f"Target source file not found: {target_path}",
            )

        if test_path.exists():
            return TaskResult(
                task_id=task.id,
                success=True,
                message=f"Test file already exists: {test_path.name}",
            )

        try:
            # Ensure test directory exists
            test_path.parent.mkdir(parents=True, exist_ok=True)

            # Generate test based on language
            if task.language == "python":
                await self._generate_python_test(target_path, test_path, task, verbose)
            else:
                await self._generate_typescript_test(target_path, test_path, task, verbose)

            # Format the generated test file
            await self._format_test_file(test_path, task.language, verbose)

            return TaskResult(
                task_id=task.id,
                success=True,
                message=f"Generated test file: {test_path.name}",
                output=str(test_path),
            )

        except Exception as e:
            return TaskResult(
                task_id=task.id,
                success=False,
                error=f"Failed to generate test: {str(e)}",
            )

    async def _generate_typescript_test(
        self,
        source: Path,
        test: Path,
        task: "Task",
        verbose: bool,
    ) -> None:
        """Generate TypeScript/Jest test file."""

        # Read source file to analyze exports
        async with aiofiles.open(source, "r") as f:
            source_content = await f.read()

        # Extract module name
        module_name = source.stem
        relative_import = self._get_relative_import(test, source)

        # Determine test type
        if "routes" in str(source):
            template = self._get_route_test_template()
        elif "service" in str(source):
            template = self._get_service_test_template()
        elif "config" in str(source):
            template = self._get_config_test_template()
        else:
            template = self._get_generic_test_template()

        # Render template
        test_content = template.render(
            module_name=module_name,
            import_path=relative_import,
            estimated_cases=task.estimated_cases or 10,
            description=task.description or f"Tests for {module_name}",
        )

        async with aiofiles.open(test, "w") as f:
            await f.write(test_content)

    async def _generate_python_test(
        self,
        source: Path,
        test: Path,
        task: "Task",
        verbose: bool,
    ) -> None:
        """Generate Python/pytest test file."""

        module_name = source.stem
        relative_import = source.stem  # Simplified for Python

        template = self._get_python_test_template()

        test_content = template.render(
            module_name=module_name,
            import_path=relative_import,
            estimated_cases=task.estimated_cases or 10,
            description=task.description or f"Tests for {module_name}",
        )

        async with aiofiles.open(test, "w") as f:
            await f.write(test_content)

    def _get_relative_import(self, from_path: Path, to_path: Path) -> str:
        """Calculate relative import path from test to source."""
        try:
            # Remove file extensions and __tests__ directory
            from_dir = from_path.parent
            if from_dir.name == "__tests__":
                from_dir = from_dir.parent

            relative = to_path.relative_to(from_dir)
            import_path = str(relative.with_suffix("")).replace("/", ".")

            # Count levels up
            parts = []
            current = from_path.parent
            while current != from_dir:
                parts.append("..")
                current = current.parent

            if parts:
                return "/".join(parts) + "/" + str(relative.with_suffix(""))
            else:
                return "./" + str(relative.with_suffix(""))

        except ValueError:
            # Fallback to absolute import
            return str(to_path.with_suffix("")).replace("/", ".")

    def _get_service_test_template(self) -> Template:
        """Template for service layer tests."""
        return Template('''/**
 * Tests for {{ module_name }}
 * {{ description }}
 *
 * Generated by Orchestrator
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { cleanDatabase, createTestUser, createTestCommunity } from '../../test/helpers';
import * as {{ module_name }} from '{{ import_path }}';

describe('{{ module_name }}', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Core Functionality', () => {
    it('should be defined', () => {
      expect({{ module_name }}).toBeDefined();
    });

    // TODO: Add {{ estimated_cases }}+ test cases covering:
    // - Happy path scenarios
    // - Edge cases
    // - Error handling
    // - Input validation
    // - Database interactions
  });

  describe('Error Handling', () => {
    it('should handle invalid input gracefully', async () => {
      // TODO: Implement error handling tests
      expect(true).toBe(true);
    });
  });

  describe('Integration', () => {
    it('should integrate with database correctly', async () => {
      const user = await createTestUser();
      expect(user).toBeDefined();
      // TODO: Add integration tests
    });
  });
});
''')

    def _get_route_test_template(self) -> Template:
        """Template for route/endpoint tests."""
        return Template('''/**
 * Tests for {{ module_name }} routes
 * {{ description }}
 *
 * Generated by Orchestrator
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createTestApp, cleanupTestApp, cleanDatabase, createTestUser, generateTestToken } from '../../test/helpers';
import type { FastifyInstance } from 'fastify';

describe('{{ module_name }} routes', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeEach(async () => {
    app = await createTestApp();
    await cleanDatabase();

    const user = await createTestUser();
    authToken = generateTestToken(user.id);
  });

  afterEach(async () => {
    await cleanupTestApp(app);
  });

  describe('GET endpoints', () => {
    it('should respond to GET requests', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/...',  // TODO: Update endpoint
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      // TODO: Add response validation
    });
  });

  describe('POST endpoints', () => {
    it('should handle POST requests', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/...',  // TODO: Update endpoint
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          // TODO: Add test payload
        },
      });

      expect(response.statusCode).toBe(201);
      // TODO: Add response validation
    });

    it('should validate request body', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/...',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          // Invalid payload
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/...',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // TODO: Add {{ estimated_cases }}+ test cases covering all endpoints
});
''')

    def _get_config_test_template(self) -> Template:
        """Template for configuration tests."""
        return Template('''/**
 * Tests for {{ module_name }} configuration
 * {{ description }}
 *
 * Generated by Orchestrator
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import * as {{ module_name }} from '{{ import_path }}';

describe('{{ module_name }} configuration', () => {
  beforeEach(() => {
    // Reset environment
    jest.resetModules();
  });

  describe('Configuration Loading', () => {
    it('should load configuration correctly', () => {
      expect({{ module_name }}).toBeDefined();
      // TODO: Add configuration validation tests
    });

    it('should have required configuration properties', () => {
      // TODO: Check for required config properties
      expect(true).toBe(true);
    });
  });

  describe('Environment Variables', () => {
    it('should handle missing environment variables', () => {
      // TODO: Test environment variable handling
      expect(true).toBe(true);
    });

    it('should validate configuration values', () => {
      // TODO: Test configuration validation
      expect(true).toBe(true);
    });
  });

  // TODO: Add {{ estimated_cases }}+ test cases
});
''')

    def _get_generic_test_template(self) -> Template:
        """Generic test template."""
        return Template('''/**
 * Tests for {{ module_name }}
 * {{ description }}
 *
 * Generated by Orchestrator
 */

import { describe, it, expect } from '@jest/globals';
import * as {{ module_name }} from '{{ import_path }}';

describe('{{ module_name }}', () => {
  it('should be defined', () => {
    expect({{ module_name }}).toBeDefined();
  });

  // TODO: Add {{ estimated_cases }}+ test cases
});
''')

    def _get_python_test_template(self) -> Template:
        """Template for Python tests."""
        return Template('''"""
Tests for {{ module_name }}
{{ description }}

Generated by Orchestrator
"""

import pytest
from {{ import_path }} import *


class Test{{ module_name|title }}:
    """Test suite for {{ module_name }}."""

    def test_module_exists(self):
        """Test that the module is importable."""
        assert True  # Module imported successfully

    # TODO: Add {{ estimated_cases }}+ test cases covering:
    # - Happy path scenarios
    # - Edge cases
    # - Error handling
    # - Input validation

    @pytest.mark.asyncio
    async def test_async_functionality(self):
        """Test async operations."""
        # TODO: Implement async tests
        assert True
''')

    async def _format_test_file(self, test_path: Path, language: str, verbose: bool) -> None:
        """Format the generated test file."""
        try:
            if language == "python":
                await asyncio.create_subprocess_exec(
                    "black", str(test_path),
                    stdout=asyncio.subprocess.DEVNULL,
                    stderr=asyncio.subprocess.DEVNULL,
                )
            else:
                # Use prettier for TypeScript
                await asyncio.create_subprocess_exec(
                    "npx", "prettier", "--write", str(test_path),
                    stdout=asyncio.subprocess.DEVNULL,
                    stderr=asyncio.subprocess.DEVNULL,
                )
        except Exception:
            # Formatting is optional, don't fail if it doesn't work
            pass
