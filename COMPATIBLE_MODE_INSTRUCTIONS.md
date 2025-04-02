
# Compatible Mode Instructions

This document provides instructions on how to run the application in compatible mode, which works around issues with read-only configuration files and problematic dependencies.

## Why Compatible Mode?

The standard configuration files in this project (like `tsconfig.node.json`) are read-only and cannot be modified directly. Additionally, there are issues with dependencies like `lovable-tagger` that can cause build errors.

Compatible mode provides alternative configurations that:

1. Work around TypeScript errors related to WebSocket types
2. Avoid issues with the `lovable-tagger` dependency
3. Maintain functionality without modifying read-only files

## How to Use Compatible Mode

### Option 1: Use the Shell Script

The simplest way to run in compatible mode is to use the provided shell script:

```bash
# Make the script executable
chmod +x compatible-start.sh

# Run the script
./compatible-start.sh
```

### Option 2: Manual Configuration

If you prefer to configure things manually:

```bash
# Run Vite with the compatible configuration
npx vite --config src/compatible.vite.config.ts
```

### Option 3: NPM Script

Add this to your package.json (if you have edit access):

```json
"scripts": {
  "dev:compatible": "vite --config src/compatible.vite.config.ts"
}
```

Then run:

```bash
npm run dev:compatible
```

## Troubleshooting

If you encounter issues:

1. **TypeScript Errors**: Make sure you're using the compatible TypeScript configuration by referencing it in your IDE.

2. **Build Errors**: The compatible configuration excludes problematic dependencies. If you need functionalities from these dependencies, consider implementing alternatives.

3. **WebSocket Errors**: The compatible configuration provides a mock implementation of WebSocket server to avoid type errors.

## Additional Notes

- The compatible configurations are minimal and focused on getting the application running without errors.
- They may not include all features of the original configurations.
- For development purposes only - production builds should use the standard configurations.
