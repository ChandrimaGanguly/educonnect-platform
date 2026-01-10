#!/bin/bash
# Quick status checker for orchestrator

clear
cat << 'HEADER'
╔════════════════════════════════════════════════════════════════╗
║          EDUCONNECT ORCHESTRATOR - STATUS REPORT               ║
╚════════════════════════════════════════════════════════════════╝
HEADER

echo "Report Generated: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

# Check if orchestrator is running
echo "=== ORCHESTRATOR ==="
if ps aux | grep -q "[o]rchestrator.sh"; then
    echo "✅ Status: RUNNING"
    echo "   Started: 2026-01-09 22:02:32 UTC"
    runtime=$(($(date +%s) - $(date -d "2026-01-09 22:02:32 UTC" +%s 2>/dev/null || echo 1767996152)))
    echo "   Runtime: $((runtime / 60)) minutes $((runtime % 60)) seconds"
    echo "   Timeout: At 23:02:32 UTC (~60 min from start)"
else
    echo "❌ Status: STOPPED"
    if [[ -f orchestrator-run.log ]]; then
        echo ""
        echo "Last 5 lines of log:"
        tail -5 orchestrator-run.log | sed 's/\x1b\[[0-9;]*m//g'
    fi
fi

echo ""
echo "=== CLAUDE INSTANCES ==="
claude_count=$(ps aux | grep "claude.*print.*permission" | grep -v grep | wc -l)
echo "Active: $claude_count instances"
if [[ $claude_count -gt 0 ]]; then
    echo "Details:"
    ps aux | grep "claude.*print.*permission.*Group F" | grep -v grep | awk '{printf "  - PID %s: CPU %.1f%%, MEM %.1f%%\n", $2, $3, $4}' | head -4
fi

echo ""
echo "=== PROGRESS ==="
echo "Completed Groups:"
cat status/completed_tasks.txt 2>/dev/null | sed 's/^/  ✅ /' || echo "  (none)"

echo ""
echo "Git Commits (last 3):"
git log --oneline -3 | sed 's/^/  /'

echo ""
echo "Uncommitted Changes:"
uncommitted=$(git status --short | wc -l)
echo "  Files: $uncommitted"
if [[ $uncommitted -gt 0 ]]; then
    echo ""
    echo "  New Services Generated:"
    git status --short | grep "src/services/.*service.ts$" | sed 's/^/    /' | head -10
fi

echo ""
echo "=== GENERATED CODE ==="
if [[ -d src/services ]]; then
    total_services=$(ls -1 src/services/*.service.ts 2>/dev/null | wc -l)
    total_size=$(du -sh src/services 2>/dev/null | awk '{print $1}')
    echo "Services: $total_services files ($total_size)"
    
    if [[ -d src/services/content-handlers ]]; then
        handler_count=$(ls -1 src/services/content-handlers/*.ts 2>/dev/null | wc -l)
        echo "Content Handlers: $handler_count files"
    fi
fi

echo ""
echo "=== NEXT STEPS ==="
if ps aux | grep -q "[o]rchestrator.sh"; then
    echo "⏳ Orchestrator is still running"
    echo "   - Wait for tasks to complete or timeout"
    echo "   - Check back in 15-30 minutes"
    echo "   - Run this script again: ./check-orchestrator-status.sh"
else
    if tail -20 orchestrator-run.log 2>/dev/null | grep -q "SUCCESS.*All tests passing"; then
        echo "✅ TASKS COMPLETED SUCCESSFULLY!"
        echo "   - Review: git log -1"
        echo "   - See changes: git show HEAD"
        echo "   - Orchestrator should have continued to next group"
    elif tail -20 orchestrator-run.log 2>/dev/null | grep -q "ERROR"; then
        echo "⚠️  TASKS FAILED OR TIMED OUT"
        echo "   - Review errors: tail -50 orchestrator-run.log"
        echo "   - Check uncommitted code: git status"
        echo "   - Test manually: npm run typecheck && npm test"
        echo "   - If code is good, commit and restart orchestrator"
    else
        echo "❓ STATUS UNCLEAR"
        echo "   - Check log: cat orchestrator-run.log"
        echo "   - Check processes: ps aux | grep claude"
    fi
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
