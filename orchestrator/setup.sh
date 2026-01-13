#!/bin/bash
# Setup script for the orchestrator

set -e

echo "=================================================="
echo "EduConnect Orchestrator Setup"
echo "=================================================="
echo

# Check Python version
echo "Checking Python version..."
python_version=$(python3 --version 2>&1 | awk '{print $2}')
required_version="3.11"

if ! python3 -c "import sys; exit(0 if sys.version_info >= (3, 11) else 1)"; then
    echo "❌ Python 3.11+ required (found: $python_version)"
    exit 1
fi

echo "✓ Python version: $python_version"
echo

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment already exists"
fi
echo

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate
echo "✓ Virtual environment activated"
echo

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip setuptools wheel
echo "✓ pip upgraded"
echo

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt
echo "✓ Dependencies installed"
echo

# Install orchestrator in development mode
echo "Installing orchestrator..."
pip install -e .
echo "✓ Orchestrator installed"
echo

# Verify installation
echo "Verifying installation..."
if command -v orchestrate &> /dev/null; then
    echo "✓ orchestrate command available"
    orchestrate --help
else
    echo "❌ orchestrate command not found"
    exit 1
fi

echo
echo "=================================================="
echo "Setup complete!"
echo "=================================================="
echo
echo "Next steps:"
echo "  1. Activate virtual environment:"
echo "     source venv/bin/activate"
echo
echo "  2. Validate configuration:"
echo "     orchestrate validate"
echo
echo "  3. View execution plan:"
echo "     orchestrate plan"
echo
echo "  4. Run Phase 1:"
echo "     orchestrate run --phase 1"
echo
echo "Or run the example script:"
echo "  ./example_run.sh"
echo "=================================================="
