#!/bin/bash

# test-orchestrator.sh - Test the orchestrator without running Claude Code
# This script validates the orchestrator's parsing and status detection

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Testing Orchestrator Components${NC}\n"

# Test 1: Check prerequisites
echo -e "${YELLOW}Test 1: Checking Prerequisites${NC}"
missing=0

if [[ ! -f "ROADMAP.md" ]]; then
    echo "❌ ROADMAP.md not found"
    ((missing++))
else
    echo "✅ ROADMAP.md found"
fi

if ! command -v claude &> /dev/null; then
    echo "⚠️  Claude Code CLI not found (will need for actual run)"
else
    echo "✅ Claude Code CLI found: $(which claude)"
fi

if ! command -v git &> /dev/null; then
    echo "❌ Git not found"
    ((missing++))
else
    echo "✅ Git found"
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm not found"
    ((missing++))
else
    echo "✅ npm found"
fi

if [[ $missing -gt 0 ]]; then
    echo -e "\n❌ Missing $missing required prerequisites"
    exit 1
fi

echo -e "\n${GREEN}✅ All prerequisites met${NC}\n"

# Test 2: Parse roadmap
echo -e "${YELLOW}Test 2: Parsing Roadmap${NC}"

mkdir -p ./test-status

# Parse roadmap
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
            match($0, /\*\*([A-Z][0-9]+): ([^*]+)\*\*/, arr)
            if (arr[1]) {
                task_id = arr[1]
                desc = arr[2]
                gsub(/^[ \t]+|[ \t]+$/, "", desc)
                print current_phase ":" current_group ":" task_id ":" desc
            }
        }
    }
' ROADMAP.md > ./test-status/parsed_tasks.txt

task_count=$(wc -l < ./test-status/parsed_tasks.txt)
echo "Found $task_count tasks in roadmap"

if [[ $task_count -eq 0 ]]; then
    echo "❌ No tasks parsed from roadmap"
    exit 1
fi

# Show sample tasks
echo -e "\nSample tasks:"
head -5 ./test-status/parsed_tasks.txt | while read -r line; do
    echo "  - $line"
done

echo -e "\n${GREEN}✅ Roadmap parsed successfully${NC}\n"

# Test 3: Detect completed work
echo -e "${YELLOW}Test 3: Detecting Completed Work${NC}"

> ./test-status/completed.txt

# Check status files
if [[ -f "PHASE1-GROUP-A-STATUS.md" ]]; then
    echo "PHASE_1:A" >> ./test-status/completed.txt
    echo "✅ Phase 1 Group A: COMPLETE (status file exists)"
else
    echo "⚠️  Phase 1 Group A: NO STATUS FILE"
fi

# Check git commits (check all recent commits, not just last)
recent_commits=$(git log -10 --pretty=%B 2>/dev/null || echo "")

# Phase 1 Group D
if echo "$recent_commits" | grep -q "Phase 1 Group D"; then
    echo "PHASE_1:D" >> ./test-status/completed.txt
    echo "✅ Phase 1 Group D: COMPLETE (found in git)"
else
    echo "⚠️  Phase 1 Group D: NO COMMIT FOUND"
fi

# Phase 1 Groups B & C
if echo "$recent_commits" | grep -q "Phase 1 Groups B & C"; then
    echo "PHASE_1:B" >> ./test-status/completed.txt
    echo "PHASE_1:C" >> ./test-status/completed.txt
    echo "✅ Phase 1 Groups B & C: COMPLETE (found in git)"
else
    echo "⚠️  Phase 1 Groups B & C: NO COMMIT FOUND"
fi

# Check for uncommitted migrations (indicates in-progress)
untracked_migrations=$(git status --porcelain | grep "^??" | grep "migrations/" || true)
if [[ -n "$untracked_migrations" ]]; then
    echo "⚠️  Found uncommitted migrations:"
    echo "$untracked_migrations" | sed 's/^/    /'
    echo "   This suggests Group D may be in progress"
fi

completed_count=$(wc -l < ./test-status/completed.txt 2>/dev/null || echo 0)
echo -e "\n${GREEN}Detected $completed_count completed groups${NC}\n"

# Test 4: Determine next group
echo -e "${YELLOW}Test 4: Determining Next Group${NC}"

determine_next_group() {
    local phase=$1
    local completed_file="./test-status/completed.txt"

    case "$phase" in
        1)
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
        *)
            echo "NOT_STARTED"
            ;;
    esac
}

for phase in {1..4}; do
    next_group=$(determine_next_group "$phase")
    if [[ "$next_group" == "COMPLETE" ]]; then
        echo "Phase $phase: ${GREEN}COMPLETE${NC}"
    elif [[ "$next_group" == "NOT_STARTED" ]]; then
        echo "Phase $phase: Next group is first group of phase (waiting for previous phase)"
    else
        echo "Phase $phase: ${YELLOW}Next group is $next_group${NC}"

        # Show tasks for next group
        tasks=$(grep "PHASE_${phase}:${next_group}:" ./test-status/parsed_tasks.txt || true)
        task_count=$(echo "$tasks" | wc -l)
        echo "         ($task_count tasks in this group)"
    fi
done

echo -e "\n${GREEN}✅ Next group determined successfully${NC}\n"

# Test 5: Validate git setup
echo -e "${YELLOW}Test 5: Validating Git Setup${NC}"

if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Not in a git repository"
    exit 1
else
    echo "✅ Git repository detected"
fi

current_branch=$(git branch --show-current)
echo "Current branch: $current_branch"

if git diff --quiet && git diff --cached --quiet; then
    echo "✅ Working directory clean"
else
    echo "⚠️  Uncommitted changes detected:"
    git status --short | head -10
fi

remote_url=$(git config --get remote.origin.url || echo "none")
echo "Remote: $remote_url"

echo -e "\n${GREEN}✅ Git setup validated${NC}\n"

# Test 6: Test suite availability
echo -e "${YELLOW}Test 6: Checking Test Suite${NC}"

if [[ ! -f "package.json" ]]; then
    echo "❌ package.json not found"
    exit 1
fi

# Check npm scripts
echo "Available npm scripts:"
npm run 2>&1 | grep -E "(typecheck|lint|test|build)" || echo "  (none found)"

if npm run | grep -q "typecheck"; then
    echo "✅ typecheck script available"
fi

if npm run | grep -q "lint"; then
    echo "✅ lint script available"
fi

if npm run | grep -q "test"; then
    echo "✅ test script available"
fi

if npm run | grep -q "build"; then
    echo "✅ build script available"
fi

echo -e "\n${GREEN}✅ Test suite validated${NC}\n"

# Summary
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${GREEN}All Orchestrator Components Validated!${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""
echo "Summary:"
echo "  - Roadmap parsed: $task_count tasks"
echo "  - Completed groups: $completed_count"
echo "  - Current branch: $current_branch"
echo ""
echo "Ready to run: ${GREEN}./orchestrator.sh${NC}"
echo ""
echo "Tip: Review ORCHESTRATOR.md for usage instructions"
echo ""

# Cleanup
rm -rf ./test-status

exit 0
