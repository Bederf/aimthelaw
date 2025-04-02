# Lovable Integration Guide

This document provides guidance for integrating our frontend code with Lovable while addressing TypeScript errors and compatibility issues.

## Overview

Our frontend codebase has several TypeScript errors that stem from:

1. Missing utility modules
2. Type inconsistencies
3. API interface mismatches
4. Component prop type errors

We've taken steps to make the codebase more compatible with Lovable by:

1. Creating utility modules in `src/lib/`
2. Providing a more lenient `tsconfig.json`
3. Adding type-compatibility layers

## Working with the Codebase

### Recommended Approach

1. **Focus on UI Improvements First**: Rather than fixing all TypeScript errors immediately, focus on UI and UX improvements.

2. **Use Type Assertion When Needed**: For components with type errors, use type assertions (`as any`) temporarily to make progress.

3. **Keep Backend API Compatible**: Ensure any UI changes maintain compatibility with our existing backend API structure.

4. **Create Type Definitions as Needed**: When you encounter missing type definitions, create them in the appropriate files.

### Directory Structure

The main directories to focus on:

- `src/components/ui/`: Contains UI components used throughout the application
- `src/features/aiLawyer/`: Contains the AI lawyer feature components
- `src/pages/lawyer/`: Contains lawyer-specific pages and components
- `src/services/`: Contains service layers for API interactions
- `src/types/`: Contains TypeScript type definitions

### Component Structure

Our components generally follow this pattern:

1. Hook into context providers (e.g., `useAILawyer`, `useAuth`)
2. Fetch and manage state
3. Handle user interactions
4. Render UI

## Key Components to Focus On

### 1. Lawyer Dashboard

The dashboard displays statistics and provides navigation to different parts of the application. Improve:

- Visual design of stat cards
- Overall layout and spacing
- Navigation elements

### 2. AI Lawyer Interface

The AI chat interface allows lawyers to interact with AI. Improve:

- Chat bubble design and layout
- Document selection interface
- Quick actions panel appearance

### 3. Client Management

Client listing and details screens. Improve:

- Client cards and table layout
- Detail view organization
- Form design for creating/editing clients

## Handling TypeScript Errors

### Strategy 1: Utility Library

We've added `src/lib/utils.ts` with common utilities to resolve many import errors.

### Strategy 2: API Wrapper

We've added `src/lib/api.ts` with type-compatible wrappers for API functions.

### Strategy 3: Use Type Assertions

When necessary, use type assertions to bypass TypeScript errors:

```tsx
// Before
const client: Client = getClient();

// After
const client = getClient() as any;
```

### Strategy 4: Temporarily Disable Type Checking

In particularly problematic files, you can add:

```tsx
// @ts-nocheck
```

at the top of the file to temporarily disable type checking.

## Making UI Improvements

When improving the UI, focus on:

1. **Modern Design Elements**: Use subtle shadows, gradients, and rounded corners
2. **Improved Layout**: Better spacing, alignment, and visual hierarchy
3. **Consistent Components**: Ensure all components follow a consistent style
4. **Responsive Design**: Make sure all components work well on different screen sizes
5. **Smooth Animations**: Add subtle animations for transitions and interactions

## Testing Your Changes

Always test your changes in the context of our working features:

1. **Document Selection**: Can users still select documents correctly?
2. **Quick Actions**: Do quick actions still work properly?
3. **Chat Interface**: Does the chat interface properly display messages?
4. **Navigation**: Does navigation between pages work correctly?

## Deployment Notes

Our frontend is designed to work with our existing backend API. All API endpoints expect specific request formats and return specific responses. Be careful not to change these interfaces without corresponding backend changes.

## Questions?

If you have questions about specific components or APIs, please reach out to our team. We're happy to provide additional context and guidance to ensure a successful integration. 