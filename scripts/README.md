# Frontend Utility Scripts

This directory contains utility scripts for managing and maintaining the frontend codebase.

## Available Scripts

### `cleanup.js`

A script that helps maintain a clean frontend directory structure by:
- Moving backup files to the `/backups` directory
- Moving documentation files to the `/docs` directory
- Checking for code organization issues (e.g., scripts in the root directory, multiple package manager lock files)

**Usage:**
```bash
npm run cleanup
```

### `manage-env.js`

A tool for managing environment variable files:
- Create backups of environment files
- Validate environment files for required variables

**Usage:**
```bash
npm run env
```

### `api-test.js`

A utility for testing API endpoints manually.

**Usage:**
```bash
node scripts/api-test.js
```

### `cleanup_npm.sh`

A shell script for cleaning up npm dependencies.

**Usage:**
```bash
./scripts/cleanup_npm.sh
```

## Best Practices

1. **Keep scripts organized**: All utility scripts should be placed in this directory rather than the root directory.

2. **Document your scripts**: Each script should have a clear description at the top of the file explaining what it does.

3. **Add npm commands**: For frequently used scripts, add a corresponding command to the `scripts` section in `package.json`.

4. **Maintain modularity**: Keep scripts focused on a single task or related set of tasks.

5. **Use JavaScript for cross-platform compatibility**: Prefer Node.js scripts over bash scripts for better cross-platform support. 