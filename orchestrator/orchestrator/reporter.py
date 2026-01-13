"""
Progress reporter for orchestrator execution.

Provides rich terminal output with progress bars, tables, and status updates.
"""

from typing import TYPE_CHECKING
from datetime import datetime

from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn
from rich.table import Table
from rich.panel import Panel
from rich.tree import Tree
from rich.live import Live

if TYPE_CHECKING:
    from .config import OrchestratorConfig, Phase, Group, Task, Checkpoint
    from .executor import TaskResult


class ProgressReporter:
    """Reports progress of orchestrator execution with rich terminal output."""

    def __init__(self, console: Console):
        self.console = console
        self.start_time: datetime | None = None
        self.phase_stats: dict[str, dict] = {}
        self.group_stats: dict[str, dict] = {}
        self.task_stats: dict[str, dict] = {}

    def start_orchestration(self, config: "OrchestratorConfig") -> None:
        """Display orchestration start banner."""
        self.start_time = datetime.now()

        banner = f"""
[bold cyan]{config.orchestrator.name}[/bold cyan]
[dim]Version {config.orchestrator.version}[/dim]

Total Phases: {len(config.phases)}
Project Root: {config.orchestrator.project_root}
"""
        self.console.print(Panel(banner, border_style="cyan", title="🚀 Orchestrator Started"))

    def complete_orchestration(self, results: dict[str, "TaskResult"]) -> None:
        """Display orchestration completion summary."""
        if not self.start_time:
            return

        elapsed = datetime.now() - self.start_time
        success_count = sum(1 for r in results.values() if r.success)
        failure_count = len(results) - success_count

        summary = f"""
[bold green]Total Tasks: {len(results)}[/bold green]
[green]✓ Successful: {success_count}[/green]
[red]✗ Failed: {failure_count}[/red]

[dim]Duration: {elapsed}[/dim]
"""
        style = "green" if failure_count == 0 else "yellow"
        self.console.print(Panel(summary, border_style=style, title="✨ Orchestration Complete"))

        # Display failed tasks if any
        if failure_count > 0:
            self._display_failures(results)

    def start_phase(self, phase_key: str, phase: "Phase") -> None:
        """Display phase start."""
        self.phase_stats[phase_key] = {
            "start_time": datetime.now(),
            "groups": len(phase.groups),
        }

        header = f"""
[bold white]{phase.name}[/bold white]
[dim]{phase.description}[/dim]

Groups: {len(phase.groups)} | Estimated: {phase.estimated_duration}
"""
        self.console.print(Panel(header, border_style="blue", title=f"📦 {phase_key.upper()}"))

    def complete_phase(self, phase_key: str, success: bool, error: str | None = None) -> None:
        """Display phase completion."""
        if phase_key not in self.phase_stats:
            return

        elapsed = datetime.now() - self.phase_stats[phase_key]["start_time"]
        status = "[green]✓ COMPLETED[/green]" if success else "[red]✗ FAILED[/red]"

        self.console.print(
            f"\n{status} {phase_key.upper()} [dim](took {elapsed})[/dim]"
        )

        if error:
            self.console.print(f"[red]Error: {error}[/red]")

        self.console.print("─" * 80)

    def start_group(self, group_key: str, group: "Group") -> None:
        """Display group start."""
        self.group_stats[group_key] = {
            "start_time": datetime.now(),
            "tasks": len(group.tasks),
        }

        mode = "🔀 PARALLEL" if group.execution == "parallel" else "➡️  SEQUENTIAL"
        self.console.print(
            f"\n  {mode} [cyan]{group.name}[/cyan] [dim]({len(group.tasks)} tasks)[/dim]"
        )

        if group.depends_on:
            self.console.print(f"  [dim]Depends on: {', '.join(group.depends_on)}[/dim]")

    def complete_group(self, group_key: str, success: bool, error: str | None = None) -> None:
        """Display group completion."""
        if group_key not in self.group_stats:
            return

        elapsed = datetime.now() - self.group_stats[group_key]["start_time"]
        status = "✓" if success else "✗"
        color = "green" if success else "red"

        self.console.print(f"  [{color}]{status} {group_key.upper()} completed[/{color}] [dim]({elapsed})[/dim]")

        if error:
            self.console.print(f"  [red]Error: {error}[/red]")

    def start_task(self, task: "Task") -> None:
        """Display task start."""
        self.task_stats[task.id] = {
            "start_time": datetime.now(),
            "name": task.name,
        }

        priority_icon = {
            "critical": "🔴",
            "high": "🟡",
            "medium": "🟢",
            "low": "⚪",
        }.get(task.priority, "⚪")

        self.console.print(
            f"    {priority_icon} [{task.id}] {task.name} [dim]({task.type})[/dim]"
        )

    def complete_task(self, task: "Task", result: "TaskResult") -> None:
        """Display task completion."""
        if task.id not in self.task_stats:
            return

        elapsed = datetime.now() - self.task_stats[task.id]["start_time"]
        status = "✓" if result.success else "✗"
        color = "green" if result.success else "red"

        self.console.print(
            f"    [{color}]{status}[/{color}] [{task.id}] [dim]({elapsed})[/dim]"
        )

        if result.message:
            self.console.print(f"      [dim]{result.message}[/dim]")

        if not result.success and result.error:
            self.console.print(f"      [red]Error: {result.error}[/red]")

    def start_checkpoint(self, checkpoint_key: str, checkpoint: "Checkpoint") -> None:
        """Display checkpoint validation start."""
        self.console.print(
            f"\n[bold yellow]🔍 Running Checkpoint: {checkpoint.name}[/bold yellow]"
        )

    def complete_checkpoint(self, checkpoint_key: str, passed: bool) -> None:
        """Display checkpoint validation result."""
        status = "[green]✓ PASSED[/green]" if passed else "[red]✗ FAILED[/red]"
        self.console.print(f"{status} Checkpoint: {checkpoint_key}\n")

    def _display_failures(self, results: dict[str, "TaskResult"]) -> None:
        """Display table of failed tasks."""
        failures = {k: v for k, v in results.items() if not v.success}

        table = Table(title="❌ Failed Tasks", show_header=True, header_style="bold red")
        table.add_column("Task ID", style="cyan")
        table.add_column("Error", style="red")

        for task_id, result in failures.items():
            table.add_row(task_id, result.error or "Unknown error")

        self.console.print(table)

    def display_execution_tree(self, config: "OrchestratorConfig") -> None:
        """Display execution plan as a tree."""
        tree = Tree("🎯 Execution Plan", style="bold cyan")

        for phase_key, phase in config.phases.items():
            phase_node = tree.add(f"[bold blue]{phase.name}[/bold blue]")

            for group_key, group in phase.groups.items():
                group_mode = "🔀" if group.execution == "parallel" else "➡️"
                group_node = phase_node.add(
                    f"{group_mode} [cyan]{group.name}[/cyan] [dim]({len(group.tasks)} tasks)[/dim]"
                )

                for task in group.tasks[:5]:  # Show first 5 tasks
                    priority_icon = {
                        "critical": "🔴",
                        "high": "🟡",
                        "medium": "🟢",
                        "low": "⚪",
                    }.get(task.priority, "⚪")

                    group_node.add(f"{priority_icon} [{task.id}] {task.name}")

                if len(group.tasks) > 5:
                    group_node.add(f"[dim]... and {len(group.tasks) - 5} more tasks[/dim]")

        self.console.print(tree)
