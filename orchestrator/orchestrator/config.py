"""
Configuration loader and models for the orchestrator.
"""

from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, Field


class Task(BaseModel):
    """Individual task configuration."""

    id: str
    name: str
    type: str  # config_edit, test_generation, file_generation, manual
    target: str
    description: str = ""
    action: str | None = None
    test_file: str | None = None
    priority: str = "medium"
    estimated_cases: int | None = None
    language: str = "typescript"
    test_type: str = "unit"
    templates: list[str] | None = None
    thresholds: dict[str, int] | None = None
    requires_manual: bool = False


class Group(BaseModel):
    """Group of related tasks."""

    name: str
    execution: str = "sequential"  # sequential or parallel
    max_parallel: int = 4
    depends_on: list[str] = Field(default_factory=list)
    tasks: list[Task]


class Phase(BaseModel):
    """Phase containing multiple groups."""

    name: str
    description: str
    estimated_duration: str = ""
    depends_on: list[str] = Field(default_factory=list)
    parallel_with: list[str] = Field(default_factory=list)
    groups: dict[str, Group]


class OrchestratorSettings(BaseModel):
    """Global orchestrator settings."""

    name: str
    version: str
    project_root: str = ".."
    max_parallel_tasks: int = 4
    retry_attempts: int = 3
    retry_delay_seconds: int = 5
    timeout_minutes: int = 30
    fail_fast: bool = False


class ValidationCheck(BaseModel):
    """Checkpoint validation configuration."""

    type: str
    target: int | None = None
    description: str = ""


class Checkpoint(BaseModel):
    """Validation checkpoint configuration."""

    name: str
    validations: list[ValidationCheck]


class OrchestratorConfig(BaseModel):
    """Root configuration model."""

    orchestrator: OrchestratorSettings
    phases: dict[str, Phase]
    checkpoints: dict[str, Checkpoint] = Field(default_factory=dict)


def load_config(config_path: Path) -> OrchestratorConfig:
    """Load and validate orchestrator configuration from YAML file."""

    if not config_path.exists():
        raise FileNotFoundError(f"Configuration file not found: {config_path}")

    with open(config_path) as f:
        raw_config = yaml.safe_load(f)

    # Parse orchestrator settings
    orchestrator_data = raw_config.get("orchestrator", {})
    settings_data = orchestrator_data.get("settings", {})
    orchestrator_settings = OrchestratorSettings(
        name=orchestrator_data.get("name", "Orchestrator"),
        version=orchestrator_data.get("version", "1.0.0"),
        project_root=orchestrator_data.get("project_root", ".."),
        **settings_data,
    )

    # Parse phases
    phases: dict[str, Phase] = {}
    for key, value in raw_config.items():
        if key.startswith("phase_"):
            groups = {}
            for group_key, group_data in value.get("groups", {}).items():
                tasks = [Task(**task) for task in group_data.get("tasks", [])]
                groups[group_key] = Group(
                    name=group_data.get("name", group_key),
                    execution=group_data.get("execution", "sequential"),
                    max_parallel=group_data.get("max_parallel", 4),
                    depends_on=group_data.get("depends_on", []),
                    tasks=tasks,
                )

            phases[key] = Phase(
                name=value.get("name", key),
                description=value.get("description", ""),
                estimated_duration=value.get("estimated_duration", ""),
                depends_on=value.get("depends_on", []),
                parallel_with=value.get("parallel_with", []),
                groups=groups,
            )

    # Parse checkpoints
    checkpoints: dict[str, Checkpoint] = {}
    for key, value in raw_config.get("checkpoints", {}).items():
        validations = [ValidationCheck(**v) for v in value.get("validations", [])]
        checkpoints[key] = Checkpoint(
            name=value.get("name", key),
            validations=validations,
        )

    return OrchestratorConfig(
        orchestrator=orchestrator_settings,
        phases=phases,
        checkpoints=checkpoints,
    )
