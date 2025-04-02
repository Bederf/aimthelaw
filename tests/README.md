# AI Lawyer Testing

This directory contains end-to-end tests for the AI Lawyer functionality. The tests ensure that the application's key features work correctly, including the AI chat functionality, training files integration, and quick actions.

## Setup

### Environment Setup

**Important**: Before running any tests, make sure to activate the `ai-law` conda environment:

```bash
conda activate ai-law
```

This environment contains all the necessary dependencies for both the application and the testing framework.

### Dependencies Installation

Make sure you have installed the necessary dependencies:

```bash
npm install @playwright/test path fs url --save-dev
npm install playwright
npx playwright install
```

## Test Files

- **ai-lawyer-page-new.spec.ts**: Tests for the AILawyerPageNew component, which is the main component for the AI Lawyer functionality.
- **run-tests.sh**: Helper script for automatically setting up the environment and running tests

## Running Tests

### Using the Automated Script (Recommended)

The easiest way to run tests is using the provided script, which handles environment activation automatically:

```bash
# From the frontend/tests directory:

# Run all AI Lawyer tests
./run-tests.sh

# Run with headed browser (visible UI)
./run-tests.sh --headed

# Run a specific test
./run-tests.sh -g "Training files integration"
```

The script will:
1. Activate the ai-law conda environment
2. Install any missing dependencies
3. Run the tests with the specified options
4. Display the location of test results and logs

### Manual Execution

If you prefer to run tests manually, first ensure the ai-law conda environment is active, then run:

```bash
npx playwright test ai-lawyer-page-new.spec.ts
```

To run with a headed browser (visible UI):

```bash
npx playwright test ai-lawyer-page-new.spec.ts --headed
```

To run a specific test:

```bash
npx playwright test ai-lawyer-page-new.spec.ts -g "Training files integration with AI chat"
```

## Test Coverage

The tests cover:

1. **UI Components**: Verifying that all UI components load correctly
2. **File Management**: 
   - Client file upload and selection
   - Automatic loading of global training files
   - File selection UI interactions

3. **AI Chat Core Functionality**:
   - Sending and receiving messages
   - Proper utilization of global training files
   - Maintaining conversation context across messages
   - Model selection

4. **Quick Actions**:
   - Extract Dates functionality
   - Summarize Document functionality
   - Reply to Letter functionality (single file restriction)
   - Prepare for Court functionality

5. **Error Handling**:
   - Proper error messages when no files are selected
   - Graceful handling of invalid requests

## Test Logs and Debugging

All test runs generate logs and screenshots in the `logs` directory for debugging purposes. The logs include:

- Step-by-step test progress
- Screenshots at key points in the test
- Captured AI responses
- Error information when tests fail

## Test Data

The tests create sample PDF documents for testing in the `test-files` directory:

- `test-contract.pdf`: A sample contract with dates and payment terms
- `test-legal-letter.pdf`: A sample legal demand letter

## Important Notes

1. **Training Files**: The system loads training files globally from the database. These files are shared across all clients and are always available for context in AI interactions.

2. **Quick Actions**:
   - Extract Dates and Summarize Document can use multiple client files
   - Reply to Letter can only use a single client file
   - Prepare for Court uses the OpenManus agent

3. **Test Prerequisites**:
   - Frontend running on localhost:8080
   - Backend API available and configured
   - Test user account with proper permissions
   - **ai-law** conda environment activated 