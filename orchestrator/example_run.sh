#!/bin/bash
# Example orchestrator execution script
# This demonstrates the typical workflow for running the orchestrator

set -e  # Exit on error

echo "=================================================="
echo "EduConnect Test Coverage & CI/CD Orchestrator"
echo "Example Execution Script"
echo "=================================================="
echo

# Check if virtual environment is activated
if [[ -z "$VIRTUAL_ENV" ]]; then
    echo "⚠️  Virtual environment not activated!"
    echo "Run: source venv/bin/activate"
    exit 1
fi

# Step 1: Validate configuration
echo "Step 1: Validating configuration..."
orchestrate validate
echo "✓ Configuration valid"
echo

# Step 2: Display execution plan
echo "Step 2: Displaying execution plan..."
orchestrate plan
echo

# Step 3: Check current status
echo "Step 3: Checking current status..."
orchestrate status
echo

# Ask user if they want to proceed
read -p "Do you want to proceed with Phase 1? (yes/no): " response
if [[ "$response" != "yes" ]]; then
    echo "Aborted by user"
    exit 0
fi

# Step 4: Dry run Phase 1
echo
echo "Step 4: Running Phase 1 (dry run)..."
orchestrate run --phase 1 --dry-run
echo

# Ask user if they want to execute for real
read -p "Execute Phase 1 for real? (yes/no): " response
if [[ "$response" != "yes" ]]; then
    echo "Aborted by user"
    exit 0
fi

# Step 5: Execute Phase 1
echo
echo "Step 5: Executing Phase 1..."
orchestrate run --phase 1
echo

# Step 6: Show updated status
echo "Step 6: Checking updated status..."
orchestrate status
echo

echo "=================================================="
echo "Phase 1 complete!"
echo "Next steps:"
echo "  1. Review changes with: git status"
echo "  2. Run tests: npm test"
echo "  3. Continue with: orchestrate run --phase 2"
echo "=================================================="
