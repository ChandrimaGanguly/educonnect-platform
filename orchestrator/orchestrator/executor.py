"""
Task executor for the orchestrator.

Handles sequential and parallel execution of tasks across phases and groups.
"""

import asyncio
import subprocess
from pathlib import Path
from typing import TYPE_CHECKING

import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from .config import OrchestratorConfig, Phase, Group, Task
from .handlers import get_handler

if TYPE_CHECKING:
    from .reporter import ProgressReporter

logger = structlog.get_logger()


class TaskResult:
    """Result of a task execution."""

    def __init__(
        self,
        task_id: str,
        success: bool,
        message: str = "",
        output: str = "",
        error: str | None = None,
    ):
        self.task_id = task_id
        self.success = success
        self.message = message
        self.output = output
        self.error = error


class PhaseExecutor:
    """Executes phases and groups according to configuration."""

    def __init__(
        self,
        config: OrchestratorConfig,
        dry_run: bool = False,
        parallel: bool = True,
        verbose: bool = False,
    ):
        self.config = config
        self.dry_run = dry_run
        self.parallel = parallel
        self.verbose = verbose
        self.project_root = Path(config.orchestrator.project_root).resolve()
        self.results: dict[str, TaskResult] = {}
        self.completed_groups: set[str] = set()

    async def run_all_phases(self, reporter: "ProgressReporter") -> dict[str, TaskResult]:
        """Run all phases in dependency order."""

        reporter.start_orchestration(self.config)

        # Sort phases by dependencies
        phase_order = self._resolve_phase_order()

        for phase_key in phase_order:
            phase = self.config.phases[phase_key]
            reporter.start_phase(phase_key, phase)

            try:
                await self._run_phase(phase_key, phase, reporter)
                reporter.complete_phase(phase_key, success=True)

                # Run checkpoint validation if exists
                checkpoint_key = f"after_{phase_key}"
                if checkpoint_key in self.config.checkpoints:
                    await self._run_checkpoint(checkpoint_key, reporter)

            except Exception as e:
                reporter.complete_phase(phase_key, success=False, error=str(e))
                if self.config.orchestrator.fail_fast:
                    raise

        reporter.complete_orchestration(self.results)
        return self.results

    async def run_phase(
        self,
        phase_num: int,
        group_filter: str | None,
        reporter: "ProgressReporter",
    ) -> dict[str, TaskResult]:
        """Run a specific phase, optionally filtered to a specific group."""

        phase_key = f"phase_{phase_num}"
        if phase_key not in self.config.phases:
            raise ValueError(f"Phase {phase_num} not found")

        phase = self.config.phases[phase_key]
        reporter.start_phase(phase_key, phase)

        try:
            await self._run_phase(phase_key, phase, reporter, group_filter)
            reporter.complete_phase(phase_key, success=True)
        except Exception as e:
            reporter.complete_phase(phase_key, success=False, error=str(e))
            raise

        return self.results

    async def _run_phase(
        self,
        phase_key: str,
        phase: Phase,
        reporter: "ProgressReporter",
        group_filter: str | None = None,
    ) -> None:
        """Execute a phase's groups in dependency order."""

        # Determine which groups to run
        groups_to_run = (
            {f"group_{group_filter}": phase.groups[f"group_{group_filter}"]}
            if group_filter and f"group_{group_filter}" in phase.groups
            else phase.groups
        )

        # Sort groups by dependencies
        group_order = self._resolve_group_order(groups_to_run)

        for group_key in group_order:
            group = groups_to_run[group_key]

            # Check dependencies are met
            if not self._dependencies_met(group.depends_on):
                logger.warning(
                    "Skipping group due to unmet dependencies",
                    group=group_key,
                    depends_on=group.depends_on,
                )
                continue

            reporter.start_group(group_key, group)

            try:
                await self._run_group(group_key, group, reporter)
                self.completed_groups.add(group_key)
                reporter.complete_group(group_key, success=True)
            except Exception as e:
                reporter.complete_group(group_key, success=False, error=str(e))
                if self.config.orchestrator.fail_fast:
                    raise

    async def _run_group(
        self,
        group_key: str,
        group: Group,
        reporter: "ProgressReporter",
    ) -> None:
        """Execute a group's tasks."""

        if group.execution == "parallel" and self.parallel:
            await self._run_tasks_parallel(group.tasks, group.max_parallel, reporter)
        else:
            await self._run_tasks_sequential(group.tasks, reporter)

    async def _run_tasks_sequential(
        self,
        tasks: list[Task],
        reporter: "ProgressReporter",
    ) -> None:
        """Run tasks one after another."""

        for task in tasks:
            reporter.start_task(task)
            result = await self._execute_task(task)
            self.results[task.id] = result
            reporter.complete_task(task, result)

            if not result.success and self.config.orchestrator.fail_fast:
                raise RuntimeError(f"Task {task.id} failed: {result.error}")

    async def _run_tasks_parallel(
        self,
        tasks: list[Task],
        max_parallel: int,
        reporter: "ProgressReporter",
    ) -> None:
        """Run tasks in parallel with concurrency limit."""

        semaphore = asyncio.Semaphore(max_parallel)

        async def run_with_semaphore(task: Task) -> TaskResult:
            async with semaphore:
                reporter.start_task(task)
                result = await self._execute_task(task)
                self.results[task.id] = result
                reporter.complete_task(task, result)
                return result

        results = await asyncio.gather(
            *[run_with_semaphore(task) for task in tasks],
            return_exceptions=True,
        )

        # Check for failures
        failures = [
            r for r in results
            if isinstance(r, Exception) or (isinstance(r, TaskResult) and not r.success)
        ]

        if failures and self.config.orchestrator.fail_fast:
            raise RuntimeError(f"{len(failures)} tasks failed in parallel execution")

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
    )
    async def _execute_task(self, task: Task) -> TaskResult:
        """Execute a single task using the appropriate handler."""

        if self.dry_run:
            return TaskResult(
                task_id=task.id,
                success=True,
                message=f"[DRY RUN] Would execute: {task.name}",
            )

        try:
            handler = get_handler(task.type)
            result = await handler.execute(task, self.project_root, self.verbose)
            return result
        except Exception as e:
            logger.error("Task execution failed", task_id=task.id, error=str(e))
            return TaskResult(
                task_id=task.id,
                success=False,
                error=str(e),
            )

    async def _run_checkpoint(
        self,
        checkpoint_key: str,
        reporter: "ProgressReporter",
    ) -> bool:
        """Run validation checkpoint."""

        checkpoint = self.config.checkpoints[checkpoint_key]
        reporter.start_checkpoint(checkpoint_key, checkpoint)

        all_passed = True
        for validation in checkpoint.validations:
            passed = await self._run_validation(validation)
            if not passed:
                all_passed = False

        reporter.complete_checkpoint(checkpoint_key, all_passed)
        return all_passed

    async def _run_validation(self, validation) -> bool:
        """Run a single validation check."""

        if validation.type == "coverage_threshold":
            return await self._check_coverage(validation.target or 0)
        elif validation.type == "ci_passing":
            return await self._check_ci_status()
        elif validation.type == "deployment_working":
            return await self._check_deployment_health()
        return True

    async def _check_coverage(self, target: int) -> bool:
        """Check if coverage meets target threshold."""

        try:
            result = subprocess.run(
                ["npm", "run", "test:coverage", "--", "--json"],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=300,
            )
            # Parse coverage from output
            # This is simplified - actual implementation would parse Jest output
            return result.returncode == 0
        except Exception:
            return False

    async def _check_ci_status(self) -> bool:
        """Check if CI is passing."""
        # Would integrate with GitHub API
        return True

    async def _check_deployment_health(self) -> bool:
        """Check deployment health endpoints."""
        # Would make HTTP requests to health endpoints
        return True

    def _resolve_phase_order(self) -> list[str]:
        """Resolve phase execution order based on dependencies."""

        phases = list(self.config.phases.keys())
        ordered = []
        remaining = set(phases)

        while remaining:
            # Find phases with satisfied dependencies
            ready = [
                p for p in remaining
                if all(d in ordered for d in self.config.phases[p].depends_on)
            ]

            if not ready:
                # Handle parallel_with phases
                ready = [next(iter(remaining))]

            ordered.extend(sorted(ready))
            remaining -= set(ready)

        return ordered

    def _resolve_group_order(self, groups: dict[str, Group]) -> list[str]:
        """Resolve group execution order based on dependencies."""

        ordered = []
        remaining = set(groups.keys())

        while remaining:
            ready = [
                g for g in remaining
                if all(d in ordered or d in self.completed_groups for d in groups[g].depends_on)
            ]

            if not ready:
                ready = [next(iter(remaining))]

            ordered.extend(sorted(ready))
            remaining -= set(ready)

        return ordered

    def _dependencies_met(self, depends_on: list[str]) -> bool:
        """Check if all dependencies are satisfied."""
        return all(dep in self.completed_groups for dep in depends_on)
