"""
Task handlers for different task types.

Each handler implements the logic for executing a specific type of task.
"""

from typing import Type

from .base import TaskHandler
from .config_edit import ConfigEditHandler
from .test_generation import TestGenerationHandler
from .file_generation import FileGenerationHandler
from .manual import ManualHandler


# Registry of task type to handler class
HANDLER_REGISTRY: dict[str, Type[TaskHandler]] = {
    "config_edit": ConfigEditHandler,
    "test_generation": TestGenerationHandler,
    "file_generation": FileGenerationHandler,
    "manual": ManualHandler,
}


def get_handler(task_type: str) -> TaskHandler:
    """Get the appropriate handler for a task type."""
    handler_class = HANDLER_REGISTRY.get(task_type)
    if not handler_class:
        raise ValueError(f"Unknown task type: {task_type}")
    return handler_class()


__all__ = [
    "TaskHandler",
    "get_handler",
    "ConfigEditHandler",
    "TestGenerationHandler",
    "FileGenerationHandler",
    "ManualHandler",
]
