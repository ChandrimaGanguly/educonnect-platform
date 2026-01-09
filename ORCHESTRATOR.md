# Orchestrator Script Documentation

## Overview

The `orchestrator.sh` script is an automated implementation manager that coordinates multiple Claude Code instances to implement the EduConnect Platform according to the phased roadmap defined in `ROADMAP.md`.

## Features

- **Phase-Based Execution**: Implements features in sequential phases (1-4)
- **Parallel Task Execution**: Launches multiple Claude Code instances for parallel tasks within groups
- **Automated Testing**: Runs tests after each group to ensure quality
- **Progress Tracking**: Creates status files for each completed group
- **Git Integration**: Automatically commits and pushes changes after each phase
- **Error Handling**: Robust error detection and logging
- **Task Timeout**: Prevents stuck tasks from blocking progress

## Prerequisites

Before running the orchestrator, ensure you have:

1. **Claude Code CLI** installed and available in PATH
   ```bash
   which claude
   ```

2. **Node.js and npm** installed (v20+)
   ```bash
   node --version
   npm --version
   ```

3. **Git** configured with proper credentials
   ```bash
   git config --list
   ```

4. **Docker and Docker Compose** (for service dependencies)
   ```bash
   docker-compose --version
   ```

5. **Environment variables** configured (copy `.env.example` to `.env`)
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

## Usage

### Basic Usage

Run the orchestrator to implement all phases automatically:

```bash
./orchestrator.sh
```

### What the Script Does

1. **Parses the Roadmap**: Reads `ROADMAP.md` and extracts all phases, groups, and tasks
2. **Checks Status**: Determines what's already been completed by examining:
   - Git commit history
   - Existing status files
   - Uncommitted changes
3. **Executes Groups Sequentially**:
   - For each phase (1-4):
     - For each group in sequence (A, B, C, D...):
       - Launches parallel Claude Code instances for tasks in that group
       - Waits for all tasks to complete
       - Runs comprehensive tests (type check, lint, unit tests, build)
       - Creates a status file documenting completion
       - Marks group as complete
   - After all groups in a phase complete:
     - Commits all changes with descriptive message
     - Pushes to remote repository
4. **Generates Reports**: Creates status files and logs for each completed group

### Directory Structure

The orchestrator creates the following directories:

```
.
├── orchestrator.sh           # Main orchestration script
├── status/                   # Tracking and status files
│   ├── roadmap_tasks.txt    # Parsed tasks from roadmap
│   ├── completed_tasks.txt  # List of completed groups
│   ├── in_progress_tasks.txt # Currently in-progress work
│   └── pending_tasks.txt    # Tasks not yet started
├── logs/orchestrator/        # Execution logs
│   ├── phase1_groupA_A1_*.log
│   ├── phase1_groupA_A2_*.log
│   └── ...
└── PHASE*-GROUP-*-STATUS.md  # Status files for completed groups
```

## Configuration

### Environment Variables

The orchestrator uses the following configuration (defined at the top of the script):

```bash
MAX_PARALLEL_AGENTS=4    # Maximum concurrent Claude instances
TASK_TIMEOUT=3600        # Timeout per task in seconds (1 hour)
```

You can modify these in the script or override them when running:

```bash
MAX_PARALLEL_AGENTS=8 TASK_TIMEOUT=7200 ./orchestrator.sh
```

## Workflow Details

### Phase 1: Foundation Layer

**Groups**: A → B → C → D

- **Group A**: Database Schema & Infrastructure
- **Group B**: User Account Management & Authentication
- **Group C**: User Profiles, Communities, RBAC
- **Group D**: Trust Networks, Audit Logging, Notifications

### Phase 2: Content & Learning Infrastructure

**Groups**: E → F → G → H

- **Group E**: Curriculum Structure & Low-Bandwidth Core
- **Group F**: Content Authoring & Review
- **Group G**: Checkpoint Types & Execution
- **Group H**: Learning Paths & PWA

### Phase 3: Intelligence & Engagement

**Groups**: I → J → K → L → M

- **Group I**: Analytics, Points, Basic Matching
- **Group J**: Badges, Learner Analytics, Match Flow
- **Group K**: Peer Mentors, Relationships, Engagement
- **Group L**: Auto-Gen, Match ML, Personalization
- **Group M**: Checkpoint Evolution, Predictive Analytics

### Phase 4: Governance & Quality

**Groups**: N → O → P → Q

- **Group N**: Automated Screening & Reporting
- **Group O**: Human Review & Oversight
- **Group P**: Algorithm Oversight & Transparency
- **Group Q**: Bias Detection & Compliance

## Testing

After each group is implemented, the orchestrator runs:

1. **Type Checking**: `npm run typecheck`
2. **Linting**: `npm run lint`
3. **Unit Tests**: `npm test`
4. **Build**: `npm run build`

If any test fails, the orchestrator stops and reports the error. You must fix the issues manually and re-run the orchestrator.

## Error Handling

### Common Issues

**1. Task Timeout**
```
[ERROR] Task A1 timed out after 3600s
```
- **Solution**: Increase `TASK_TIMEOUT` or investigate the stuck task
- Check the log file for details: `logs/orchestrator/phase1_groupA_A1_*.log`

**2. Test Failures**
```
[ERROR] Tests failed for Group B
```
- **Solution**: Review test output, fix issues, re-run orchestrator
- The orchestrator will resume from the failed group

**3. Git Push Failures**
```
[ERROR] Failed to push changes
```
- **Solution**: Check git credentials and remote configuration
- Manually push: `git push origin main`

**4. Claude Code Not Found**
```
[ERROR] Claude Code CLI not found!
```
- **Solution**: Install Claude Code or add it to PATH
- Verify: `which claude`

### Resuming After Failure

The orchestrator tracks completed groups in `status/completed_tasks.txt`. If it fails, you can:

1. Fix the issue manually
2. Re-run the orchestrator
3. It will skip completed groups and resume from where it left off

## Logs and Debugging

### Log Files

Each Claude Code instance writes to its own log file:

```bash
# View logs for a specific task
cat logs/orchestrator/phase1_groupA_A1_*.log

# View all logs for a group
cat logs/orchestrator/phase1_groupA_*.log

# Tail logs in real-time
tail -f logs/orchestrator/phase1_groupA_A1_*.log
```

### Status Files

Status files document what was implemented:

```bash
# View Phase 1 Group A status
cat PHASE1-GROUP-A-STATUS.md

# List all status files
ls -la PHASE*-GROUP-*-STATUS.md
```

### Tracking Files

Monitor progress with tracking files:

```bash
# See completed groups
cat status/completed_tasks.txt

# See in-progress work
cat status/in_progress_tasks.txt

# See all parsed tasks
cat status/roadmap_tasks.txt
```

## Manual Intervention

Sometimes you may want to:

### Skip a Group

Edit `status/completed_tasks.txt` and add the group:

```bash
echo "PHASE_1:B" >> status/completed_tasks.txt
```

### Manually Implement a Task

1. Implement the feature manually
2. Mark it complete: `echo "PHASE_X:Y" >> status/completed_tasks.txt`
3. Re-run orchestrator

### Rollback a Phase

```bash
# Remove group from completed list
sed -i '/PHASE_1:D/d' status/completed_tasks.txt

# Rollback git commits if needed
git reset --hard HEAD~1
```

## Best Practices

1. **Run in Clean State**: Ensure no uncommitted changes before starting
2. **Monitor Progress**: Watch logs in real-time to catch issues early
3. **Review Before Pushing**: The orchestrator auto-commits; review changes first
4. **Backup Branch**: Create a backup branch before running:
   ```bash
   git checkout -b backup-before-orchestrator
   git checkout main
   ./orchestrator.sh
   ```
5. **Test Thoroughly**: After each phase, manually test critical features
6. **Resource Monitoring**: Monitor system resources (CPU, memory) during parallel execution

## Advanced Usage

### Dry Run Mode

To see what would be executed without running Claude Code:

```bash
# Edit orchestrator.sh and add:
DRY_RUN=1

# Then in launch_claude_instance(), add:
if [[ "${DRY_RUN:-0}" == "1" ]]; then
    log_info "DRY RUN: Would launch Claude for $task_id"
    return 0
fi
```

### Custom Phase Range

To run only specific phases, modify the main loop:

```bash
# Instead of: for phase in {1..4}; do
for phase in {2..3}; do
```

### Single Group Execution

To test a single group:

```bash
# Create a test script
#!/bin/bash
source orchestrator.sh
launch_group_parallel 1 D
run_tests
```

## Troubleshooting

### Issue: Orchestrator stops unexpectedly

**Diagnosis**:
```bash
# Check last log entries
tail -100 logs/orchestrator/phase*.log | grep ERROR
```

**Solution**:
- Review error messages
- Check system resources
- Verify all prerequisites are met

### Issue: Tests fail after implementation

**Diagnosis**:
```bash
# Run tests manually
npm run typecheck
npm run lint
npm test
npm run build
```

**Solution**:
- Fix failing tests
- Update test expectations if needed
- Ensure migrations are applied: `npm run migrate`

### Issue: Git conflicts during push

**Diagnosis**:
```bash
git status
git log --oneline -5
```

**Solution**:
```bash
# Pull remote changes
git pull --rebase origin main

# Resolve conflicts
git add .
git rebase --continue

# Re-run orchestrator (will skip completed groups)
./orchestrator.sh
```

## Safety Features

The orchestrator includes several safety features:

1. **Automatic Backups**: Git commits preserve history
2. **Test Gating**: Won't proceed if tests fail
3. **Timeout Protection**: Tasks can't run indefinitely
4. **Error Logging**: Detailed logs for debugging
5. **Status Tracking**: Can resume after interruption
6. **Parallel Limits**: Prevents resource exhaustion

## Performance Tips

- **Faster Execution**: Increase `MAX_PARALLEL_AGENTS` (if system can handle it)
- **Longer Tasks**: Increase `TASK_TIMEOUT` for complex features
- **Reduce Logging**: Redirect logs to `/dev/null` if disk space is limited
- **Use SSD**: Store workspace on SSD for faster I/O

## Contributing

To improve the orchestrator:

1. Test changes on a feature branch
2. Document new features in this file
3. Add error handling for edge cases
4. Update logging for better debugging

## License

Part of the EduConnect Platform project. See main LICENSE file.

## Support

For issues with the orchestrator:

1. Check this documentation
2. Review log files
3. Search existing GitHub issues
4. Create a new issue with logs attached

---

**Last Updated**: 2026-01-09
**Version**: 1.0.0
**Maintained By**: EduConnect Development Team
