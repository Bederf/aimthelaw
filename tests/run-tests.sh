#!/bin/bash

# Script to run AI Lawyer tests with proper environment setup

# Print commands and exit on errors
set -e

echo "=== AI Lawyer Testing Setup ==="
echo "This script will activate the ai-law conda environment and run the tests."

# Check if conda is available
if ! command -v conda &> /dev/null; then
    echo "Error: conda is not installed or not in PATH"
    exit 1
fi

echo "Activating ai-law conda environment..."
# Source the conda base to ensure conda is fully available
source "$(conda info --base)/etc/profile.d/conda.sh"
conda activate ai-law

if [ $? -ne 0 ]; then
    echo "Error: Failed to activate ai-law conda environment"
    echo "Please ensure the ai-law environment exists. You can create it with:"
    echo "conda create -n ai-law python=3.9"
    exit 1
fi

echo "Checking for required npm packages..."
# Check if Playwright is installed
if ! npm list --depth=0 | grep -q "@playwright/test"; then
    echo "Installing Playwright dependencies..."
    npm install @playwright/test path fs url --save-dev
    npm install playwright
    npx playwright install
fi

# Get command line arguments
TEST_ARGS=$@
if [ -z "$TEST_ARGS" ]; then
    # Default to running all tests if no args provided
    TEST_ARGS="ai-lawyer-page-new.spec.ts"
fi

echo "=== Running Tests ==="
echo "Running with arguments: $TEST_ARGS"

# Run tests
npx playwright test $TEST_ARGS

# Check exit code
if [ $? -eq 0 ]; then
    echo "=== Tests completed successfully ==="
    
    # Show location of test results
    echo "Test logs are available in the logs directory:"
    echo "$(pwd)/logs"
    
    echo "Test reports are available at:"
    echo "$(pwd)/playwright-report"
else
    echo "=== Tests failed ==="
    echo "Check the logs for details."
fi

# Keep the conda environment active after script completion
echo "Test run complete. The ai-law conda environment is still active."
echo "To deactivate it when finished, run: conda deactivate" 