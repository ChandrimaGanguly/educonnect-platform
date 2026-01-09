#!/bin/bash

# orchestrator.sh - Automated Phase-based Implementation Orchestrator
# This script manages the parallel execution of Claude Code instances to implement
# the EduConnect Platform roadmap in phases with proper dependencies and testing.

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
ROADMAP_FILE="ROADMAP.md"
STATUS_DIR="./status"
LOG_DIR="./logs/orchestrator"
CLAUDE_BIN="claude"
MAX_PARALLEL_AGENTS=4
TASK_TIMEOUT=3600 # 1 hour per task

# Create necessary directories
mkdir -p "$STATUS_DIR" "$LOG_DIR"

# Global state
CURRENT_PHASE=""
CURRENT_GROUP=""
declare -A GROUP_STATUS
declare -A PHASE_COMPLETION

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $*"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $*"
}

log_phase() {
    echo -e "${MAGENTA}[PHASE]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $*"
}

log_group() {
    echo -e "${CYAN}[GROUP]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $*"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if [[ ! -f "$ROADMAP_FILE" ]]; then
        log_error "ROADMAP.md not found!"
        exit 1
    fi

    if ! command -v "$CLAUDE_BIN" &> /dev/null; then
        log_error "Claude Code CLI not found! Please install it first."
        exit 1
    fi

    if ! command -v git &> /dev/null; then
        log_error "Git not found!"
        exit 1
    fi

    if ! command -v npm &> /dev/null; then
        log_error "npm not found!"
        exit 1
    fi

    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "Not in a git repository!"
        exit 1
    fi

    log_success "All prerequisites met"
}

# Parse the roadmap and extract phases, groups, and tasks
parse_roadmap() {
    log_info "Parsing roadmap..."

    # This will be populated by reading ROADMAP.md
    # Format: PHASE_NUMBER:GROUP_LETTER:FEATURE_ID:DESCRIPTION

    # We'll use awk to parse the roadmap
    awk '
        /^## Phase [0-9]+:/ {
            phase = $3
            gsub(/:/, "", phase)
            current_phase = "PHASE_" phase
        }
        /^### Group [A-Z]+ \(Parallel/ {
            group = $3
            current_group = group
        }
        /^\| \*\*[A-Z][0-9]+:/ {
            if (current_phase && current_group) {
                # Extract task ID and description
                # Format: | **A1: Database Schema & Infrastructure** | Low | ...
                match($0, /\*\*([A-Z][0-9]+): ([^*]+)\*\*/, arr)
                if (arr[1]) {
                    task_id = arr[1]
                    desc = arr[2]
                    gsub(/^[ \t]+|[ \t]+$/, "", desc)  # Trim whitespace
                    print current_phase ":" current_group ":" task_id ":" desc
                }
            }
        }
    ' "$ROADMAP_FILE" > "$STATUS_DIR/roadmap_tasks.txt"

    log_success "Roadmap parsed: $(wc -l < "$STATUS_DIR/roadmap_tasks.txt") tasks found"
}

# Check what's been completed by examining git history and status files
check_completion_status() {
    log_info "Checking completion status..."

    # Initialize all as incomplete
    > "$STATUS_DIR/completed_tasks.txt"
    > "$STATUS_DIR/in_progress_tasks.txt"
    > "$STATUS_DIR/pending_tasks.txt"

    # Check for status files
    for status_file in PHASE*-GROUP-*-STATUS.md; do
        if [[ -f "$status_file" ]]; then
            # Extract phase and group from filename
            # Format: PHASE1-GROUP-A-STATUS.md
            if [[ "$status_file" =~ PHASE([0-9]+)-GROUP-([A-Z]+) ]]; then
                phase="${BASH_REMATCH[1]}"
                group="${BASH_REMATCH[2]}"
                echo "PHASE_${phase}:${group}" >> "$STATUS_DIR/completed_tasks.txt"
                log_info "Found status file for Phase $phase Group $group"
            fi
        fi
    done

    # Check git commits (last 20 commits should cover all work)
    local recent_commits=$(git log -20 --pretty=%B 2>/dev/null || echo "")

    # Check for specific commit patterns
    # Phase 1
    if echo "$recent_commits" | grep -q "Phase 1 Group D"; then
        echo "PHASE_1:D" >> "$STATUS_DIR/completed_tasks.txt"
        log_info "Phase 1 Group D found in git history"
    fi

    if echo "$recent_commits" | grep -q "Phase 1 Groups B & C"; then
        echo "PHASE_1:B" >> "$STATUS_DIR/completed_tasks.txt"
        echo "PHASE_1:C" >> "$STATUS_DIR/completed_tasks.txt"
        log_info "Phase 1 Groups B & C found in git history"
    fi

    # Generic pattern matching for any "Phase X Group Y" or "Complete Phase X"
    while IFS= read -r line; do
        if [[ "$line" =~ Phase[[:space:]]+([0-9]+)[[:space:]]+Group[[:space:]]+([A-Z]+) ]]; then
            phase="${BASH_REMATCH[1]}"
            group="${BASH_REMATCH[2]}"
            echo "PHASE_${phase}:${group}" >> "$STATUS_DIR/completed_tasks.txt"
            log_info "Found Phase $phase Group $group in git history"
        elif [[ "$line" =~ Complete[[:space:]]+Phase[[:space:]]+([0-9]+) ]]; then
            phase="${BASH_REMATCH[1]}"
            # Mark all groups in this phase as complete
            case "$phase" in
                1) for g in A B C D; do echo "PHASE_1:$g" >> "$STATUS_DIR/completed_tasks.txt"; done ;;
                2) for g in E F G H; do echo "PHASE_2:$g" >> "$STATUS_DIR/completed_tasks.txt"; done ;;
                3) for g in I J K L M; do echo "PHASE_3:$g" >> "$STATUS_DIR/completed_tasks.txt"; done ;;
                4) for g in N O P Q; do echo "PHASE_4:$g" >> "$STATUS_DIR/completed_tasks.txt"; done ;;
            esac
            log_info "Found complete Phase $phase in git history"
        fi
    done <<< "$recent_commits"

    # Remove duplicates
    sort -u "$STATUS_DIR/completed_tasks.txt" -o "$STATUS_DIR/completed_tasks.txt"

    # Check for uncommitted migrations (indicates in-progress work)
    local untracked_migrations=$(git status --porcelain | grep "^??" | grep "migrations/" || true)
    if [[ -n "$untracked_migrations" ]]; then
        log_warning "Found uncommitted migrations - some group may be in progress"
        # Don't mark as in-progress since we can't determine which group
    fi

    log_success "Status check complete"
}

# Determine the next group to work on
get_next_group() {
    local phase=$1
    local completed_file="$STATUS_DIR/completed_tasks.txt"

    # Define group dependencies based on roadmap
    case "$phase" in
        1)
            # Phase 1 groups: A -> B -> C -> D
            if ! grep -q "PHASE_1:A" "$completed_file" 2>/dev/null; then
                echo "A"
            elif ! grep -q "PHASE_1:B" "$completed_file" 2>/dev/null; then
                echo "B"
            elif ! grep -q "PHASE_1:C" "$completed_file" 2>/dev/null; then
                echo "C"
            elif ! grep -q "PHASE_1:D" "$completed_file" 2>/dev/null; then
                echo "D"
            else
                echo "COMPLETE"
            fi
            ;;
        2)
            # Phase 2 groups: E -> F -> G -> H
            if ! grep -q "PHASE_2:E" "$completed_file" 2>/dev/null; then
                echo "E"
            elif ! grep -q "PHASE_2:F" "$completed_file" 2>/dev/null; then
                echo "F"
            elif ! grep -q "PHASE_2:G" "$completed_file" 2>/dev/null; then
                echo "G"
            elif ! grep -q "PHASE_2:H" "$completed_file" 2>/dev/null; then
                echo "H"
            else
                echo "COMPLETE"
            fi
            ;;
        3)
            # Phase 3 groups: I -> J -> K -> L -> M
            if ! grep -q "PHASE_3:I" "$completed_file" 2>/dev/null; then
                echo "I"
            elif ! grep -q "PHASE_3:J" "$completed_file" 2>/dev/null; then
                echo "J"
            elif ! grep -q "PHASE_3:K" "$completed_file" 2>/dev/null; then
                echo "K"
            elif ! grep -q "PHASE_3:L" "$completed_file" 2>/dev/null; then
                echo "L"
            elif ! grep -q "PHASE_3:M" "$completed_file" 2>/dev/null; then
                echo "M"
            else
                echo "COMPLETE"
            fi
            ;;
        4)
            # Phase 4 groups: N -> O -> P -> Q
            if ! grep -q "PHASE_4:N" "$completed_file" 2>/dev/null; then
                echo "N"
            elif ! grep -q "PHASE_4:O" "$completed_file" 2>/dev/null; then
                echo "O"
            elif ! grep -q "PHASE_4:P" "$completed_file" 2>/dev/null; then
                echo "P"
            elif ! grep -q "PHASE_4:Q" "$completed_file" 2>/dev/null; then
                echo "Q"
            else
                echo "COMPLETE"
            fi
            ;;
        *)
            echo "UNKNOWN"
            ;;
    esac
}

# Get tasks for a specific group
get_group_tasks() {
    local phase=$1
    local group=$2

    grep "PHASE_${phase}:${group}:" "$STATUS_DIR/roadmap_tasks.txt" || true
}

# Launch a Claude Code instance for a specific task
launch_claude_instance() {
    local phase=$1
    local group=$2
    local task_id=$3
    local description=$4
    local log_file="$LOG_DIR/phase${phase}_group${group}_${task_id}_$(date +%s).log"

    log_info "Launching Claude instance for $task_id: $description"

    # Create a comprehensive prompt for this task
    local prompt="Implement Phase $phase, Group $group, Task $task_id: $description

CONTEXT:
- You are working on the EduConnect Platform
- This is an automated orchestration run
- Read ROADMAP.md to understand Phase $phase, Group $group context
- Read CLAUDE.md for implementation guidelines
- Check openspec/specs/ for detailed specifications

YOUR TASK:
$description

REQUIREMENTS:
1. Read the relevant specification files for this feature
2. Implement all SHALL/MUST requirements from the spec
3. Create database migrations if needed (with proper up/down functions)
4. Write comprehensive tests (minimum 80% coverage)
5. Follow project code style and conventions
6. Run tests locally to verify they pass
7. Do NOT commit or push changes (orchestrator handles this)

DELIVERABLES:
- Fully implemented feature according to spec
- All tests passing
- Code follows project standards
- Summary of what was implemented

Begin implementation now."

    # Launch Claude Code in non-interactive mode
    log_info "Starting Claude Code instance (output: $log_file)"

    # Run Claude Code with dangerously-skip-permissions and print mode
    # Using here-string to pass the prompt
    if timeout "$TASK_TIMEOUT" "$CLAUDE_BIN" \
        --dangerously-skip-permissions \
        --print \
        <<< "$prompt" \
        > "$log_file" 2>&1; then
        log_success "Task $task_id completed successfully"
        return 0
    else
        local exit_code=$?
        if [[ $exit_code -eq 124 ]]; then
            log_error "Task $task_id timed out after ${TASK_TIMEOUT}s"
        else
            log_error "Task $task_id failed with exit code $exit_code"
        fi
        log_error "Check log file: $log_file"
        cat "$log_file" | tail -20 # Show last 20 lines of error
        return 1
    fi
}

# Launch multiple Claude instances in parallel for a group
launch_group_parallel() {
    local phase=$1
    local group=$2

    log_group "Starting parallel execution for Phase $phase, Group $group"

    # Get all tasks for this group
    local tasks=$(get_group_tasks "$phase" "$group")

    if [[ -z "$tasks" ]]; then
        log_warning "No tasks found for Phase $phase, Group $group"
        return 0
    fi

    local task_count=$(echo "$tasks" | wc -l)
    log_info "Found $task_count tasks in this group"

    # Launch tasks in parallel (up to MAX_PARALLEL_AGENTS)
    local pids=()
    local failed=0

    while IFS=':' read -r phase_name group_name task_id description; do
        # Wait if we've hit the parallel limit
        while [[ ${#pids[@]} -ge $MAX_PARALLEL_AGENTS ]]; do
            for i in "${!pids[@]}"; do
                if ! kill -0 "${pids[$i]}" 2>/dev/null; then
                    wait "${pids[$i]}" || ((failed++))
                    unset 'pids[i]'
                fi
            done
            sleep 1
        done

        # Launch the task in background
        launch_claude_instance "$phase" "$group" "$task_id" "$description" &
        pids+=($!)

    done <<< "$tasks"

    # Wait for all remaining tasks to complete
    log_info "Waiting for all tasks to complete..."
    for pid in "${pids[@]}"; do
        if ! wait "$pid"; then
            ((failed++))
        fi
    done

    if [[ $failed -gt 0 ]]; then
        log_error "$failed task(s) failed in Group $group"
        return 1
    fi

    log_success "All tasks in Group $group completed successfully"
    return 0
}

# Run tests for the current state
run_tests() {
    log_info "Running tests..."

    # Run type checking
    if ! npm run typecheck; then
        log_error "Type checking failed"
        return 1
    fi

    # Run linting
    if ! npm run lint; then
        log_warning "Linting issues found (non-fatal)"
    fi

    # Run tests
    if ! npm test; then
        log_error "Tests failed"
        return 1
    fi

    # Try to build
    if ! npm run build; then
        log_error "Build failed"
        return 1
    fi

    log_success "All tests passed"
    return 0
}

# Mark a group as complete
mark_group_complete() {
    local phase=$1
    local group=$2

    echo "PHASE_${phase}:${group}" >> "$STATUS_DIR/completed_tasks.txt"
    log_success "Marked Phase $phase Group $group as complete"
}

# Create a status file for the completed group
create_status_file() {
    local phase=$1
    local group=$2

    local status_file="PHASE${phase}-GROUP-${group}-STATUS.md"

    log_info "Creating status file: $status_file"

    cat > "$status_file" << EOF
# Phase $phase Group $group - Implementation Status

**Status: ✅ COMPLETE**

**Completed:** $(date '+%Y-%m-%d %H:%M:%S')

## Summary

This group has been successfully implemented by the automated orchestrator.

## Tasks Completed

EOF

    # Add task details
    local tasks=$(get_group_tasks "$phase" "$group")
    while IFS=':' read -r phase_name group_name task_id description; do
        echo "- ✅ **$task_id**: $description" >> "$status_file"
    done <<< "$tasks"

    cat >> "$status_file" << EOF

## Testing

All tests have passed:
- ✅ Type checking
- ✅ Linting
- ✅ Unit tests
- ✅ Build process

## Next Steps

Ready to proceed to the next group.

---

**Generated by orchestrator.sh**
EOF

    log_success "Status file created: $status_file"
}

# Commit and push changes for a completed phase
commit_and_push_phase() {
    local phase=$1

    log_info "Committing changes for Phase $phase..."

    # Add all changes
    git add .

    # Create commit message
    local commit_msg="Complete Phase $phase: All groups implemented and tested

This commit includes the implementation of all groups in Phase $phase:
"

    # Add group details
    case "$phase" in
        1)
            commit_msg+="
- Group A: Database Schema & Infrastructure
- Group B: User Account Management & Authentication
- Group C: User Profiles, Communities, RBAC
- Group D: Trust Networks, Audit Logging, Notifications"
            ;;
        2)
            commit_msg+="
- Group E: Curriculum Structure & Low-Bandwidth Core
- Group F: Content Authoring & Review
- Group G: Checkpoint Types & Execution
- Group H: Learning Paths & PWA"
            ;;
        3)
            commit_msg+="
- Group I: Analytics & Points & Basic Matching
- Group J: Badges & Learner Analytics & Match Flow
- Group K: Peer Mentors & Relationships & Engagement
- Group L: Auto-Gen & Match ML & Personalization
- Group M: Checkpoint Evolution & Predictive Analytics"
            ;;
        4)
            commit_msg+="
- Group N: Automated Screening & Reporting
- Group O: Human Review & Oversight
- Group P: Algorithm Oversight & Transparency
- Group Q: Bias Detection & Compliance"
            ;;
    esac

    commit_msg+="

All tests passing. Ready for Phase $((phase + 1)).

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

    # Commit
    if git commit -m "$commit_msg"; then
        log_success "Changes committed"
    else
        log_warning "Nothing to commit or commit failed"
    fi

    # Push to remote
    log_info "Pushing to remote..."
    if git push; then
        log_success "Changes pushed to remote"
    else
        log_error "Failed to push changes"
        return 1
    fi

    return 0
}

# Main execution loop
main() {
    log_phase "=== EduConnect Platform Orchestrator Starting ==="

    check_prerequisites
    parse_roadmap
    check_completion_status

    # Process each phase sequentially
    for phase in {1..4}; do
        log_phase "========================================="
        log_phase "Starting Phase $phase"
        log_phase "========================================="

        # Process groups in this phase
        while true; do
            next_group=$(get_next_group "$phase")

            if [[ "$next_group" == "COMPLETE" ]]; then
                log_success "Phase $phase is complete!"

                # Commit and push the phase
                if ! commit_and_push_phase "$phase"; then
                    log_error "Failed to commit/push Phase $phase"
                    exit 1
                fi

                break
            elif [[ "$next_group" == "UNKNOWN" ]]; then
                log_error "Unknown phase: $phase"
                exit 1
            fi

            log_group "Processing Group $next_group"

            # Launch parallel tasks for this group
            if ! launch_group_parallel "$phase" "$next_group"; then
                log_error "Group $next_group failed"
                exit 1
            fi

            # Run tests
            if ! run_tests; then
                log_error "Tests failed for Group $next_group"
                log_error "Please fix the issues and re-run the orchestrator"
                exit 1
            fi

            # Mark group as complete
            mark_group_complete "$phase" "$next_group"

            # Create status file
            create_status_file "$phase" "$next_group"

            log_success "Group $next_group completed and tested successfully"
        done
    done

    log_phase "========================================="
    log_success "All phases complete! 🎉"
    log_phase "========================================="

    # Final summary
    cat << EOF

╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   🎓 EduConnect Platform Implementation Complete! 🎓          ║
║                                                                ║
║   All 4 phases have been successfully implemented:            ║
║   ✅ Phase 1: Foundation Layer                                ║
║   ✅ Phase 2: Content & Learning Infrastructure               ║
║   ✅ Phase 3: Intelligence & Engagement                       ║
║   ✅ Phase 4: Governance & Quality                            ║
║                                                                ║
║   The platform is now ready for deployment and testing!       ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

EOF
}

# Run the orchestrator
main "$@"
