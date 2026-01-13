# Quick Start Guide

Get the orchestrator running in 5 minutes.

## Prerequisites

- Python 3.11+
- Node.js 20+ (for the main EduConnect project)
- Git

## Step 1: Setup (2 minutes)

```bash
cd orchestrator
./setup.sh
```

This will:
- Create virtual environment
- Install dependencies
- Install orchestrate CLI

## Step 2: Activate Environment

```bash
source venv/bin/activate
```

## Step 3: Validate Configuration

```bash
orchestrate validate
```

Should output: `✓ Configuration is valid!`

## Step 4: View the Plan

```bash
orchestrate plan
```

This shows all 6 phases and their tasks.

## Step 5: Run Phase 1 (Dry Run)

```bash
orchestrate run --phase 1 --dry-run
```

This previews what will happen without making changes.

## Step 6: Execute Phase 1

```bash
orchestrate run --phase 1
```

This will:
- Expand Jest coverage collection
- Add per-directory coverage thresholds
- Fix Python safety check in CI
- Add database migration step to CI
- Create test fixtures and helpers

**Duration**: ~8 minutes

## Step 7: Verify Changes

```bash
# Check what was modified
git status

# Review changes
git diff jest.config.js
git diff .github/workflows/ci.yml

# Run tests to verify
cd ..
npm test
```

## Step 8: Continue to Phase 2

```bash
cd orchestrator
orchestrate run --phase 2
```

This generates tests for critical services.

**Duration**: ~1.5 hours (parallel execution)

## Common Commands

```bash
# Check progress
orchestrate status

# View plan for specific phase
orchestrate plan --phase 2

# Run specific group
orchestrate run --phase 2 --group c

# Run with verbose output
orchestrate run --phase 1 --verbose
```

## Troubleshooting

### Virtual environment issues

```bash
# Deactivate and recreate
deactivate
rm -rf venv
./setup.sh
```

### Import errors

```bash
# Reinstall in development mode
pip install -e .
```

### Configuration errors

```bash
# Validate and check for issues
orchestrate validate

# View detailed error
orchestrate run --phase 1 --verbose
```

## What's Next?

1. **Review Phase 1 changes**: Check generated fixtures and config edits
2. **Run tests**: `npm test` to verify nothing broke
3. **Commit changes**: `git add . && git commit -m "Phase 1: Foundation"`
4. **Continue**: `orchestrate run --phase 2` for test generation

## Full Execution

To run all phases at once (not recommended for first time):

```bash
orchestrate run --all
```

**Total Duration**: ~7 hours (with parallelism)

## Need Help?

- View this guide: `cat QUICKSTART.md`
- Read full docs: `cat README.md`
- Validate config: `orchestrate validate`
- Check status: `orchestrate status`

---

**Ready to go?**

```bash
./setup.sh && source venv/bin/activate && orchestrate run --phase 1
```
