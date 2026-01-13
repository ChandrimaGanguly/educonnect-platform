"""
Base task handler interface.
"""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..config import Task
    from ..executor import TaskResult


class TaskHandler(ABC):
    """Abstract base class for task handlers."""

    @abstractmethod
    async def execute(
        self,
        task: "Task",
        project_root: Path,
        verbose: bool = False,
    ) -> "TaskResult":
        """
        Execute the task and return the result.

        Args:
            task: The task configuration
            project_root: Root directory of the project
            verbose: Whether to output verbose logging

        Returns:
            TaskResult indicating success or failure
        """
        pass

    def _resolve_path(self, path: str, project_root: Path) -> Path:
        """Resolve a relative path against the project root."""
        target = Path(path)
        if not target.is_absolute():
            target = project_root / target
        return target.resolve()
