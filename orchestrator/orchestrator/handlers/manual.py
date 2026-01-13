"""
Handler for manual tasks.

These tasks require human intervention and cannot be automated.
"""

from pathlib import Path
from typing import TYPE_CHECKING

from .base import TaskHandler

if TYPE_CHECKING:
    from ..config import Task
    from ..executor import TaskResult


class ManualHandler(TaskHandler):
    """Handles tasks that require manual execution."""

    async def execute(
        self,
        task: "Task",
        project_root: Path,
        verbose: bool = False,
    ) -> "TaskResult":
        """
        Prompt user to complete manual task.

        Manual tasks pause execution and require user confirmation.
        """

        from ..executor import TaskResult

        print("\n" + "=" * 80)
        print(f"MANUAL TASK REQUIRED: {task.name}")
        print("=" * 80)
        print(f"\nDescription: {task.description}")
        print(f"Target: {task.target}")

        if task.description:
            print(f"\nInstructions:\n{task.description}")

        print("\n" + "-" * 80)
        print("Please complete this task manually before continuing.")
        print("-" * 80)

        # Wait for user confirmation
        response = input("\nHave you completed this task? (yes/no/skip): ").strip().lower()

        if response in ["yes", "y"]:
            return TaskResult(
                task_id=task.id,
                success=True,
                message="Manual task completed by user",
            )
        elif response in ["skip", "s"]:
            return TaskResult(
                task_id=task.id,
                success=True,
                message="Manual task skipped by user",
            )
        else:
            return TaskResult(
                task_id=task.id,
                success=False,
                error="Manual task not completed",
            )
