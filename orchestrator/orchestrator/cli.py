"""
CLI entry point for the EduConnect Orchestrator.

Usage:
    orchestrate run --phase 1              # Run specific phase
    orchestrate run --phase 1 --group a    # Run specific group
    orchestrate run --all                  # Run all phases
    orchestrate status                     # Show current progress
    orchestrate validate                   # Validate configuration
"""

import asyncio
from pathlib import Path
from typing import Optional

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from .executor import PhaseExecutor
from .config import load_config, OrchestratorConfig
from .reporter import ProgressReporter

app = typer.Typer(
    name="orchestrate",
    help="EduConnect Test Coverage & CI/CD Improvement Orchestrator",
    add_completion=False,
)
console = Console()


@app.command()
def run(
    phase: Optional[int] = typer.Option(
        None, "--phase", "-p", help="Run specific phase (1-6)"
    ),
    group: Optional[str] = typer.Option(
        None, "--group", "-g", help="Run specific group within phase (a-n)"
    ),
    all_phases: bool = typer.Option(
        False, "--all", "-a", help="Run all phases sequentially"
    ),
    dry_run: bool = typer.Option(
        False, "--dry-run", "-d", help="Show what would be executed without running"
    ),
    parallel: bool = typer.Option(
        True, "--parallel/--sequential", help="Enable parallel execution within groups"
    ),
    config_path: Path = typer.Option(
        Path("config/phases.yaml"), "--config", "-c", help="Path to configuration file"
    ),
    verbose: bool = typer.Option(
        False, "--verbose", "-v", help="Enable verbose output"
    ),
) -> None:
    """Execute orchestrator phases and groups."""

    try:
        config = load_config(config_path)
    except Exception as e:
        console.print(f"[red]Error loading config: {e}[/red]")
        raise typer.Exit(1)

    if not phase and not all_phases:
        console.print("[yellow]Please specify --phase N or --all[/yellow]")
        raise typer.Exit(1)

    executor = PhaseExecutor(config, dry_run=dry_run, parallel=parallel, verbose=verbose)
    reporter = ProgressReporter(console)

    if dry_run:
        console.print(Panel("[yellow]DRY RUN MODE - No changes will be made[/yellow]"))

    try:
        if all_phases:
            asyncio.run(executor.run_all_phases(reporter))
        elif phase:
            asyncio.run(executor.run_phase(phase, group, reporter))
    except KeyboardInterrupt:
        console.print("\n[yellow]Execution interrupted by user[/yellow]")
        raise typer.Exit(130)
    except Exception as e:
        console.print(f"[red]Execution failed: {e}[/red]")
        raise typer.Exit(1)


@app.command()
def status(
    config_path: Path = typer.Option(
        Path("config/phases.yaml"), "--config", "-c", help="Path to configuration file"
    ),
) -> None:
    """Show current progress and status of all phases."""

    try:
        config = load_config(config_path)
    except Exception as e:
        console.print(f"[red]Error loading config: {e}[/red]")
        raise typer.Exit(1)

    # Display status table
    table = Table(title="Orchestrator Status", show_header=True)
    table.add_column("Phase", style="cyan")
    table.add_column("Name", style="white")
    table.add_column("Groups", style="yellow")
    table.add_column("Tasks", style="green")
    table.add_column("Status", style="magenta")

    for phase_key, phase_data in config.phases.items():
        group_count = len(phase_data.groups)
        task_count = sum(len(g.tasks) for g in phase_data.groups.values())
        status_str = _get_phase_status(phase_key)

        table.add_row(
            phase_key.replace("phase_", "Phase "),
            phase_data.name,
            str(group_count),
            str(task_count),
            status_str,
        )

    console.print(table)


@app.command()
def validate(
    config_path: Path = typer.Option(
        Path("config/phases.yaml"), "--config", "-c", help="Path to configuration file"
    ),
) -> None:
    """Validate the orchestrator configuration."""

    console.print("[cyan]Validating configuration...[/cyan]")

    try:
        config = load_config(config_path)

        # Validate phases
        issues = []
        for phase_key, phase_data in config.phases.items():
            for group_key, group_data in phase_data.groups.items():
                for task in group_data.tasks:
                    # Check target files exist
                    target_path = Path(config.orchestrator.project_root) / task.target
                    if task.type == "test_generation" and not target_path.exists():
                        issues.append(f"[yellow]Warning: Target file not found: {task.target}[/yellow]")

        if issues:
            console.print("[yellow]Validation completed with warnings:[/yellow]")
            for issue in issues:
                console.print(f"  {issue}")
        else:
            console.print("[green]Configuration is valid![/green]")

    except Exception as e:
        console.print(f"[red]Validation failed: {e}[/red]")
        raise typer.Exit(1)


@app.command()
def plan(
    phase: Optional[int] = typer.Option(
        None, "--phase", "-p", help="Show plan for specific phase"
    ),
    config_path: Path = typer.Option(
        Path("config/phases.yaml"), "--config", "-c", help="Path to configuration file"
    ),
) -> None:
    """Display execution plan without running."""

    try:
        config = load_config(config_path)
    except Exception as e:
        console.print(f"[red]Error loading config: {e}[/red]")
        raise typer.Exit(1)

    phases_to_show = [f"phase_{phase}"] if phase else list(config.phases.keys())

    for phase_key in phases_to_show:
        if phase_key not in config.phases:
            console.print(f"[red]Phase {phase_key} not found[/red]")
            continue

        phase_data = config.phases[phase_key]

        console.print(Panel(
            f"[bold]{phase_data.name}[/bold]\n{phase_data.description}",
            title=phase_key.replace("_", " ").title(),
            border_style="cyan",
        ))

        for group_key, group_data in phase_data.groups.items():
            table = Table(
                title=f"Group {group_key.upper()}: {group_data.name}",
                show_header=True,
            )
            table.add_column("ID", style="dim")
            table.add_column("Task", style="white")
            table.add_column("Type", style="cyan")
            table.add_column("Target", style="yellow")
            table.add_column("Priority", style="magenta")

            for task in group_data.tasks:
                priority = getattr(task, "priority", "medium")
                priority_style = {
                    "critical": "[red]CRITICAL[/red]",
                    "high": "[yellow]HIGH[/yellow]",
                    "medium": "[green]MEDIUM[/green]",
                    "low": "[dim]LOW[/dim]",
                }.get(priority, priority)

                table.add_row(
                    task.id,
                    task.name,
                    task.type,
                    task.target,
                    priority_style,
                )

            execution_mode = f"[{group_data.execution}]"
            console.print(f"\n  Execution: {execution_mode}")
            if group_data.depends_on:
                console.print(f"  Depends on: {', '.join(group_data.depends_on)}")
            console.print(table)

        console.print()


def _get_phase_status(phase_key: str) -> str:
    """Get the status of a phase from the state file."""
    # TODO: Implement state persistence
    return "[dim]Not started[/dim]"


if __name__ == "__main__":
    app()
