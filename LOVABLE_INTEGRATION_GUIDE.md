# Lovable Integration Guide for AI Law Frontend

This guide provides a path for integrating Lovable Tagger into the AI Law frontend application without modifying any existing files.

## Overview

Lovable Tagger is a UI inspection and modification tool that helps developers and designers collaborate on UI improvements. This integration approach allows you to run Lovable in a separate environment while keeping your production code intact.

## Prerequisites

- Node.js >= 16.0.0
- npm >= 8.0.0
- Access to your Lovable project key

## Files Provided

All integration files have been created with the prefix `lovable.` to avoid conflicts with existing files:

1. **Type Definitions**:
   - `src/lovable.d.ts` - TypeScript declarations for Lovable Tagger

2. **Integration Files**:
   - `src/lovable.hooks.tsx` - React hooks for Lovable integration
   - `src/lovable.AILawyerContext.tsx` - Modified context provider with Lovable integration
   - `src/lovable.html` - Custom HTML entry point with Lovable scripts
   - `src/lovable.main.tsx` - Custom application entry point

3. **Configuration**:
   - `src/lovable.vite.config.ts` - Custom Vite configuration
   - `src/lovable.tsconfig.json` - Custom TypeScript configuration
   - `src/lovable.package.json` - Reference package.json with Lovable scripts

## Integration Steps

### 1. Install Dependencies

Add WebSocket types for the server component:

```bash
npm install --save-dev @types/ws
```

### 2. Run in Lovable Mode

Add the following script to your package.json:

```json
"lovable": "vite --config src/lovable.vite.config.ts",
```

Then run:

```bash
npm run lovable
```

This will:
- Start the application using the custom Vite configuration
- Load the custom HTML file with Lovable Tagger
- Initialize the application with Lovable hooks and context

### 3. Connect with Lovable.dev

1. Log in to your Lovable.dev account
2. Create a new project or use an existing one
3. Connect to your running local instance (typically at http://localhost:3000)
4. Lovable will automatically detect components and allow UI modifications

## How It Works

### No-Modification Architecture

This integration approach is designed to work **without** modifying any existing files:

- Custom entry points (`lovable.html` and `lovable.main.tsx`) load Lovable scripts
- Custom context provider wraps the original provider while adding Lovable hooks
- Custom hooks provide utilities for tagging and tracking components
- TypeScript configurations relaxed specifically for Lovable integration

### TypeScript Issues Workarounds

The integration solves TypeScript errors in several ways:

1. **Explicit Type Annotations**: Using `any` type for WebSocket-related variables
2. **Function Call Patterns**: Using `call()` instead of `apply()` in WebSocket handlers
3. **Mock Class Definitions**: Providing a basic implementation of WebSocketServer to avoid imports
4. **Relaxed TypeScript Config**: Temporarily disabling strict type checking for the Lovable integration

## Usage Tips

### Component Tagging

Components can be tagged for Lovable in three ways:

1. **Automatic Detection**: Lovable will attempt to detect React components
2. **Manual Tagging**: Use the `useLovableTagging` hook:
   ```tsx
   useLovableTagging('MyComponent', 'element-id');
   ```
3. **Data Attributes**: Add `data-lovable-component="ComponentName"` to elements

### Debugging

Enable console logging in the browser to see Lovable integration status and events.

### Development Workflow

1. Run the application in Lovable mode
2. Make UI modifications in Lovable.dev
3. Export the changes from Lovable
4. Apply changes to your actual components

## Security Considerations

- The Lovable integration should only be used in development environments
- The WebSocket server is configured without authentication for simplicity
- Production builds should not include Lovable Tagger

## Next Steps

Once Lovable has helped improve your UI:

1. Export the modified component code from Lovable.dev
2. Apply changes to the original components
3. Test in your regular development environment
4. Commit changes to your repository

## Support

For issues with Lovable integration, contact support@lovable.dev
For project-specific integration questions, refer to your organization's documentation 