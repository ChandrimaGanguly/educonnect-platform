# EduConnect Test Coverage & CI/CD Orchestrator

A Python-based orchestration tool that automates the execution of phased improvements to test coverage and CI/CD pipelines for the EduConnect platform.

## Overview

This orchestrator implements a 6-phase roadmap to:
1. **Improve test coverage** from ~25% to 80%+
2. **Fix CI/CD pipeline** architecture gaps
3. **Implement production-ready** deployment strategies

The orchestrator executes tasks in **parallel** where possible and **sequentially** where dependencies exist, maximizing efficiency while maintaining correctness.

## Features

- ✅ **Phased Execution**: 6 phases with 14 logical groups
- ✅ **Parallel & Sequential**: Intelligent dependency resolution
- ✅ **Multiple Task Types**: Config edits, test generation, file creation
- ✅ **Rich CLI**: Beautiful terminal output with progress tracking
- ✅ **Dry Run Mode**: Preview changes without executing
- ✅ **Retry Logic**: Automatic retries with exponential backoff
- ✅ **Validation Checkpoints**: Coverage and deployment health checks
- ✅ **Resume Support**: Continue from last completed group

## Installation

### Prerequisites

- Python 3.11+
- Node.js 20+ (for the main project)
- Git

### Setup

```bash
# Navigate to orchestrator directory
cd orchestrator

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install in development mode (optional)
pip install -e .
```

## Quick Start

```bash
# Activate virtual environment
source venv/bin/activate

# View execution plan
orchestrate plan

# Run specific phase (dry run)
orchestrate run --phase 1 --dry-run

# Execute Phase 1
orchestrate run --phase 1

# Execute specific group within phase
orchestrate run --phase 2 --group c

# Run all phases
orchestrate run --all

# Check current status
orchestrate status

# Validate configuration
orchestrate validate
```

## Architecture

### Directory Structure

```
orchestrator/
├── config/
│   └── phases.yaml          # Phase and task configuration
├── orchestrator/
│   ├── __init__.py
│   ├── cli.py               # CLI entry point (Typer)
│   ├── config.py            # Configuration models (Pydantic)
│   ├── executor.py          # Task execution engine
│   ├── reporter.py          # Progress reporting (Rich)
│   └── handlers/            # Task type handlers
│       ├── __init__.py
│       ├── base.py          # Base handler interface
│       ├── config_edit.py   # Config file modifications
│       ├── test_generation.py  # Test file generation
│       ├── file_generation.py  # File creation from templates
│       └── manual.py        # Manual task prompts
├── requirements.txt         # Python dependencies
├── pyproject.toml          # Package configuration
└── README.md               # This file
```

### Task Types

#### 1. `config_edit`
Modifies configuration files (Jest config, CI workflows, etc.)

**Actions:**
- `expand_coverage_collection` - Include all directories in Jest coverage
- `add_directory_thresholds` - Add per-directory coverage thresholds
- `remove_continue_on_error` - Fix Python safety check
- `add_migration_step` - Add DB migration to CI
- `implement_staging_deploy` - Add staging deployment logic
- `implement_production_deploy` - Add production deployment logic
- `add_approval_gates` - Require manual approval for production
- `make_trivy_blocking` - Fail build on security vulnerabilities

#### 2. `test_generation`
Generates test files for TypeScript/JavaScript or Python source files

**Supports:**
- Service layer tests (unit tests with mocking)
- Route tests (integration tests with test app)
- Config tests (environment variable validation)
- Python pytest tests

**Templates:**
- Automatically detects test type based on source location
- Includes setup/teardown boilerplate
- Adds TODOs for estimated test cases

#### 3. `file_generation`
Creates new files from templates

**Templates:**
- `users.fixture.ts` - User test fixtures
- `communities.fixture.ts` - Community test fixtures
- `assessments.fixture.ts` - Assessment test fixtures
- `database.helper.ts` - Database integration helpers
- `setup.ts` - Integration test setup
- `conftest.py` - Python pytest configuration
- `rollback-workflow.yml` - Deployment rollback workflow
- Markdown documentation (runbooks, guides)

#### 4. `manual`
Tasks requiring human intervention

- Pauses execution
- Displays instructions
- Waits for user confirmation
- Examples: Configure GitHub secrets, deploy to production

## Phase Overview

### Phase 1: Foundation & Quick Wins (Week 1)
**Goal**: Unblock CI and establish foundation

**Groups:**
- **Group A**: Fix immediate CI blockers (Jest config, migrations)
- **Group B**: Test infrastructure setup (fixtures, helpers)

**Impact**: Enables accurate coverage measurement

### Phase 2: Critical Service Coverage (Weeks 2-3)
**Goal**: Target highest-risk untested business logic

**Groups:**
- **Group C**: Core business logic tests (6 services, parallel)
- **Group D**: Authentication & security tests (sequential)

**Impact**: +25% test coverage

### Phase 3: Route & Integration Coverage (Weeks 4-5)
**Goal**: Complete API endpoint testing

**Groups:**
- **Group E**: Critical route tests (6 routes, parallel)
- **Group F**: Service gap closure (4 services, parallel)

**Impact**: +20% test coverage

### Phase 4: CI/CD Pipeline Architecture (Weeks 3-4, parallel)
**Goal**: Fix deployment pipeline gaps

**Groups:**
- **Group G**: Deployment implementation (sequential, critical)
- **Group H**: Pipeline quality improvements (parallel)
- **Group I**: Security & compliance (sequential)

**Impact**: Production-ready deployments

### Phase 5: Extended Coverage (Weeks 6-7)
**Goal**: Complete coverage across all layers

**Groups:**
- **Group J**: Configuration & infrastructure tests (5 modules, parallel)
- **Group K**: GraphQL tests (3 modules, parallel)
- **Group L**: Python microservices tests (4 services, parallel)

**Impact**: +15% test coverage, 80%+ overall

### Phase 6: Production Readiness (Week 8+)
**Goal**: Advanced deployment patterns and comprehensive testing

**Groups:**
- **Group M**: Deployment strategies (blue-green, canary)
- **Group N**: E2E & load testing

**Impact**: Operational maturity

## Configuration

### phases.yaml

The main configuration file defines all phases, groups, and tasks:

```yaml
phase_1:
  name: "Foundation & Quick Wins"
  description: "Unblock CI and establish foundation"
  estimated_duration: "1 week"

  groups:
    group_a:
      name: "Fix Immediate CI Blockers"
      execution: sequential  # or parallel
      tasks:
        - id: "1.1"
          name: "Expand Jest collectCoverageFrom"
          type: config_edit
          target: "jest.config.js"
          action: expand_coverage_collection
```

### Settings

Global orchestrator settings in `phases.yaml`:

```yaml
orchestrator:
  settings:
    max_parallel_tasks: 4
    retry_attempts: 3
    retry_delay_seconds: 5
    timeout_minutes: 30
    fail_fast: false
```

## CLI Commands

### `run`
Execute orchestrator phases

```bash
# Run specific phase
orchestrate run --phase 1

# Run specific group within phase
orchestrate run --phase 2 --group c

# Run all phases
orchestrate run --all

# Dry run (preview only)
orchestrate run --phase 1 --dry-run

# Disable parallel execution
orchestrate run --phase 2 --sequential

# Verbose output
orchestrate run --phase 1 --verbose
```

**Options:**
- `--phase, -p`: Phase number (1-6)
- `--group, -g`: Group letter (a-n)
- `--all, -a`: Run all phases
- `--dry-run, -d`: Preview without executing
- `--parallel/--sequential`: Enable/disable parallel execution
- `--config, -c`: Custom config path
- `--verbose, -v`: Verbose output

### `status`
Show current progress

```bash
orchestrate status
```

Displays:
- All phases with group and task counts
- Completion status (not started, in progress, completed)
- Current phase being executed

### `plan`
Display execution plan

```bash
# Show all phases
orchestrate plan

# Show specific phase
orchestrate plan --phase 2
```

Shows:
- Phase descriptions
- Group execution modes (parallel/sequential)
- Task list with IDs, types, and priorities
- Dependency information

### `validate`
Validate configuration

```bash
orchestrate validate
```

Checks:
- Configuration file syntax
- Target file existence
- Task dependencies
- Required parameters

## Examples

### Example 1: Initial Setup

```bash
# Install and validate
cd orchestrator
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# View the plan
orchestrate plan

# Validate configuration
orchestrate validate

# Start with Phase 1 (dry run first)
orchestrate run --phase 1 --dry-run
orchestrate run --phase 1
```

### Example 2: Resume After Interruption

```bash
# Check what's completed
orchestrate status

# Continue from next phase
orchestrate run --phase 2
```

### Example 3: Run Specific Group

```bash
# Only run authentication tests (Group D in Phase 2)
orchestrate run --phase 2 --group d
```

### Example 4: Parallel Phase Execution

Phase 4 can run in parallel with Phases 2-3:

```bash
# Terminal 1: Run Phase 2
orchestrate run --phase 2

# Terminal 2: Run Phase 4 (parallel)
orchestrate run --phase 4
```

## Development

### Adding New Task Types

1. Create handler in `orchestrator/handlers/`:

```python
from .base import TaskHandler

class MyHandler(TaskHandler):
    async def execute(self, task, project_root, verbose):
        # Implementation
        return TaskResult(...)
```

2. Register in `handlers/__init__.py`:

```python
HANDLER_REGISTRY = {
    "my_type": MyHandler,
    # ...
}
```

3. Use in `phases.yaml`:

```yaml
tasks:
  - id: "1.x"
    type: my_type
    # ...
```

### Adding New Phases

Edit `config/phases.yaml`:

```yaml
phase_7:
  name: "My New Phase"
  description: "What this phase does"
  depends_on: ["phase_6"]  # Dependencies

  groups:
    group_a:
      name: "My Group"
      execution: parallel
      tasks:
        - id: "7.1"
          name: "My Task"
          type: test_generation
          # ...
```

### Testing

```bash
# Run with dry-run to test logic
orchestrate run --phase 1 --dry-run --verbose

# Test specific handler
python -m pytest tests/handlers/test_config_edit.py
```

## Troubleshooting

### Issue: "Target file not found"

**Cause**: File path in configuration doesn't exist

**Solution**:
- Check `target` path in `phases.yaml`
- Ensure path is relative to project root
- Run `orchestrate validate` to check all paths

### Issue: Parallel tasks hanging

**Cause**: Too many parallel tasks or deadlock

**Solution**:
- Reduce `max_parallel_tasks` in configuration
- Use `--sequential` flag to disable parallelism
- Check task dependencies

### Issue: Tests not generated correctly

**Cause**: Template not matching source file structure

**Solution**:
- Check source file exports
- Modify template in `handlers/test_generation.py`
- Generate manually and update template

### Issue: CI workflow modifications not working

**Cause**: YAML indentation or syntax error

**Solution**:
- Validate YAML: `yamllint .github/workflows/ci.yml`
- Check git diff: `git diff .github/workflows/ci.yml`
- Manually fix and commit

## Monitoring

### Progress Tracking

The orchestrator provides real-time progress:

```
📦 PHASE_1: Foundation & Quick Wins

  ➡️  SEQUENTIAL Fix Immediate CI Blockers (4 tasks)
    🔴 [1.1] Expand Jest collectCoverageFrom (config_edit)
    ✓ [1.1] (2.3s)
    🟡 [1.2] Add per-directory coverage thresholds (config_edit)
    ✓ [1.2] (1.8s)
  ...

✓ GROUP_A completed (12.5s)
```

### Checkpoints

After each phase, validation checkpoints run:

```
🔍 Running Checkpoint: Foundation Complete

✓ Baseline coverage established
✓ CI pipeline runs successfully

✓ PASSED Checkpoint: after_phase_1
```

## Performance

### Execution Times

Estimated execution times (with parallelism):

| Phase | Sequential | Parallel | Speedup |
|-------|-----------|----------|---------|
| Phase 1 | 15min | 8min | 1.9x |
| Phase 2 | 3hrs | 1.2hrs | 2.5x |
| Phase 3 | 4hrs | 1.5hrs | 2.7x |
| Phase 4 | 2hrs | 45min | 2.7x |
| Phase 5 | 3.5hrs | 1.3hrs | 2.7x |
| Phase 6 | 5hrs | 2hrs | 2.5x |
| **Total** | **~18hrs** | **~7hrs** | **2.6x** |

### Optimization

- Adjust `max_parallel_tasks` based on CPU cores
- Use `--sequential` for debugging
- Run Phase 4 in parallel with Phases 2-3

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes to orchestrator
4. Test with `--dry-run`
5. Submit pull request

## License

MIT License - see main project LICENSE file

## Support

- Issues: https://github.com/anthropics/educonnect-platform/issues
- Documentation: See `openspec/` directory in main project
- Contact: EduConnect Team

---

**Ready to improve test coverage?**

```bash
orchestrate run --all
```
