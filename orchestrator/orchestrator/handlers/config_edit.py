"""
Handler for config_edit tasks.

Modifies configuration files (Jest config, CI workflows, etc.)
"""

import asyncio
import subprocess
from pathlib import Path
from typing import TYPE_CHECKING

import aiofiles
import yaml

from .base import TaskHandler

if TYPE_CHECKING:
    from ..config import Task
    from ..executor import TaskResult


class ConfigEditHandler(TaskHandler):
    """Handles configuration file edits."""

    async def execute(
        self,
        task: "Task",
        project_root: Path,
        verbose: bool = False,
    ) -> "TaskResult":
        """Execute configuration edit based on action type."""

        from ..executor import TaskResult

        target_path = self._resolve_path(task.target, project_root)

        if not target_path.exists():
            return TaskResult(
                task_id=task.id,
                success=False,
                error=f"Target file not found: {target_path}",
            )

        try:
            if task.action == "expand_coverage_collection":
                await self._expand_jest_coverage(target_path, verbose)
            elif task.action == "add_directory_thresholds":
                await self._add_jest_thresholds(target_path, task.thresholds or {}, verbose)
            elif task.action == "remove_continue_on_error":
                await self._fix_safety_check(target_path, verbose)
            elif task.action == "add_migration_step":
                await self._add_ci_migration(target_path, verbose)
            elif task.action == "implement_staging_deploy":
                await self._implement_staging_deploy(target_path, verbose)
            elif task.action == "implement_production_deploy":
                await self._implement_production_deploy(target_path, verbose)
            elif task.action == "add_approval_gates":
                await self._add_approval_gates(target_path, verbose)
            elif task.action == "make_trivy_blocking":
                await self._make_trivy_blocking(target_path, verbose)
            else:
                return TaskResult(
                    task_id=task.id,
                    success=False,
                    error=f"Unknown action: {task.action}",
                )

            return TaskResult(
                task_id=task.id,
                success=True,
                message=f"Successfully applied {task.action} to {target_path.name}",
            )

        except Exception as e:
            return TaskResult(
                task_id=task.id,
                success=False,
                error=f"Failed to edit config: {str(e)}",
            )

    async def _expand_jest_coverage(self, target: Path, verbose: bool) -> None:
        """Expand Jest coverage collection to all directories."""
        async with aiofiles.open(target, "r") as f:
            content = await f.read()

        # Replace limited coverage collection with expanded version
        old_pattern = "collectCoverageFrom: ['src/services/**/*.ts']"
        new_pattern = """collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/test/**',
    '!src/database/migrations/**',
    '!src/database/seeds/**',
    '!src/index.ts',
  ]"""

        if old_pattern in content:
            content = content.replace(old_pattern, new_pattern)
        else:
            # Try alternate pattern
            content = content.replace(
                "collectCoverageFrom: [\n    'src/services/**/*.ts',\n  ],",
                new_pattern,
            )

        async with aiofiles.open(target, "w") as f:
            await f.write(content)

    async def _add_jest_thresholds(
        self,
        target: Path,
        thresholds: dict[str, int],
        verbose: bool,
    ) -> None:
        """Add per-directory coverage thresholds to Jest config."""
        async with aiofiles.open(target, "r") as f:
            content = await f.read()

        # Build threshold configuration
        threshold_config = "  coverageThreshold: {\n    global: {\n"
        threshold_config += "      branches: 70,\n      functions: 70,\n      lines: 70,\n      statements: 70,\n"
        threshold_config += "    },\n"

        for directory, value in thresholds.items():
            threshold_config += f"    './src/{directory}/': {{\n"
            threshold_config += f"      branches: {value},\n"
            threshold_config += f"      functions: {value},\n"
            threshold_config += f"      lines: {value},\n"
            threshold_config += f"      statements: {value},\n"
            threshold_config += "    },\n"

        threshold_config += "  },"

        # Insert after coverageReporters or before module.exports closing
        if "coverageThreshold:" in content:
            # Already exists, skip
            return

        content = content.replace(
            "  coverageReporters: ['text', 'lcov', 'html'],",
            "  coverageReporters: ['text', 'lcov', 'html'],\n" + threshold_config,
        )

        async with aiofiles.open(target, "w") as f:
            await f.write(content)

    async def _fix_safety_check(self, target: Path, verbose: bool) -> None:
        """Remove --continue-on-error from Python safety check."""
        async with aiofiles.open(target, "r") as f:
            content = await f.read()

        content = content.replace(
            "safety check -r requirements.txt --continue-on-error",
            "safety check -r requirements.txt",
        )

        async with aiofiles.open(target, "w") as f:
            await f.write(content)

    async def _add_ci_migration(self, target: Path, verbose: bool) -> None:
        """Add database migration step to CI workflow."""
        async with aiofiles.open(target, "r") as f:
            content = await f.read()

        migration_step = """
      - name: Run database migrations
        run: npm run migrate
        env:
          DATABASE_URL: postgresql://educonnect:test@localhost:5432/educonnect_test

"""

        # Insert before test execution step
        content = content.replace(
            "      - name: Run tests with coverage\n        run: npm run test:coverage",
            migration_step + "      - name: Run tests with coverage\n        run: npm run test:coverage",
        )

        async with aiofiles.open(target, "w") as f:
            await f.write(content)

    async def _implement_staging_deploy(self, target: Path, verbose: bool) -> None:
        """Implement actual staging deployment logic."""
        async with aiofiles.open(target, "r") as f:
            content = await f.read()

        deploy_steps = '''      - name: Deploy to staging
        run: |
          echo "Deploying to staging environment"
          # Configure kubectl
          echo "${{ secrets.KUBECONFIG_STAGING }}" | base64 -d > kubeconfig
          export KUBECONFIG=./kubeconfig

          # Deploy using kubectl or Helm
          kubectl set image deployment/educonnect-backend \\
            backend=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-backend:${{ github.sha }} \\
            --namespace=staging

          kubectl rollout status deployment/educonnect-backend --namespace=staging

          # Deploy Python services
          for service in matching analytics checkpoint moderation; do
            kubectl set image deployment/educonnect-$service \\
              $service=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-$service:${{ github.sha }} \\
              --namespace=staging
            kubectl rollout status deployment/educonnect-$service --namespace=staging
          done'''

        content = content.replace(
            '''      - name: Deploy to staging
        run: |
          echo "Deploy to staging environment"
          # Add deployment commands here (e.g., kubectl, helm, docker-compose)''',
            deploy_steps,
        )

        async with aiofiles.open(target, "w") as f:
            await f.write(content)

    async def _implement_production_deploy(self, target: Path, verbose: bool) -> None:
        """Implement actual production deployment logic."""
        async with aiofiles.open(target, "r") as f:
            content = await f.read()

        deploy_steps = '''      - name: Deploy to production
        run: |
          echo "Deploying to production environment"
          # Configure kubectl
          echo "${{ secrets.KUBECONFIG_PRODUCTION }}" | base64 -d > kubeconfig
          export KUBECONFIG=./kubeconfig

          # Deploy using kubectl or Helm with blue-green strategy
          kubectl set image deployment/educonnect-backend \\
            backend=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-backend:${{ github.sha }} \\
            --namespace=production

          kubectl rollout status deployment/educonnect-backend --namespace=production

          # Deploy Python services
          for service in matching analytics checkpoint moderation; do
            kubectl set image deployment/educonnect-$service \\
              $service=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-$service:${{ github.sha }} \\
              --namespace=production
            kubectl rollout status deployment/educonnect-$service --namespace=production
          done'''

        content = content.replace(
            '''      - name: Deploy to production
        run: |
          echo "Deploy to production environment"
          # Add deployment commands here''',
            deploy_steps,
        )

        async with aiofiles.open(target, "w") as f:
            await f.write(content)

    async def _add_approval_gates(self, target: Path, verbose: bool) -> None:
        """Add manual approval gates for production deployment."""
        async with aiofiles.open(target, "r") as f:
            content = await f.read()

        # Add environment with required reviewers
        content = content.replace(
            "    environment:\n      name: production\n      url: https://educonnect.org",
            "    environment:\n      name: production\n      url: https://educonnect.org\n      required-reviewers: true",
        )

        async with aiofiles.open(target, "w") as f:
            await f.write(content)

    async def _make_trivy_blocking(self, target: Path, verbose: bool) -> None:
        """Make Trivy security scan fail the build on vulnerabilities."""
        async with aiofiles.open(target, "r") as f:
            content = await f.read()

        # Add exit-code parameter to Trivy scan
        content = content.replace(
            "        with:\n          scan-type: 'fs'\n          scan-ref: '.'\n          format: 'sarif'\n          output: 'trivy-results.sarif'",
            "        with:\n          scan-type: 'fs'\n          scan-ref: '.'\n          format: 'sarif'\n          output: 'trivy-results.sarif'\n          exit-code: '1'\n          severity: 'CRITICAL,HIGH'",
        )

        async with aiofiles.open(target, "w") as f:
            await f.write(content)
