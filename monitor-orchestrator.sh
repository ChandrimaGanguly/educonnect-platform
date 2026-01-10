#!/bin/bash
# Monitor orchestrator progress

echo "=== Orchestrator Monitor Started ==="
echo "Started at: $(date)"
echo "Tasks launched at: ~22:02 UTC"
echo "Expected completion/timeout: ~23:02 UTC"
echo ""

while true; do
    clear
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║         ORCHESTRATOR MONITOR - $(date +'%H:%M:%S UTC')              ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    
    # Check if orchestrator is still running
    if ps aux | grep -q "[o]rchestrator.sh"; then
        echo "✅ Orchestrator: RUNNING"
    else
        echo "❌ Orchestrator: STOPPED"
    fi
    
    # Count Claude instances
    claude_count=$(ps aux | grep "claude.*print.*permission" | grep -v grep | wc -l)
    echo "🤖 Claude instances: $claude_count"
    
    # Check log file size
    if [[ -f orchestrator-run.log ]]; then
        log_size=$(wc -l < orchestrator-run.log)
        echo "📝 Log lines: $log_size"
        echo ""
        echo "--- Last 10 lines of orchestrator log ---"
        tail -10 orchestrator-run.log | sed 's/\x1b\[[0-9;]*m//g'
    fi
    
    echo ""
    echo "--- Git Status ---"
    git log --oneline -1
    
    echo ""
    echo "--- Uncommitted Changes ---"
    git status --short | head -5
    
    echo ""
    echo "Next check in 2 minutes..."
    echo "Press Ctrl+C to stop monitoring"
    
    sleep 120
done
