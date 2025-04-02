# Breadcrumb Navigation System

This document describes the breadcrumb navigation system implemented in the Legal AI System application. The breadcrumb navigation provides users with a clear hierarchical path to navigate the application.

## Components and Architecture

### Key Components

1. **BreadcrumbContext** (`frontend/src/contexts/BreadcrumbContext.tsx`)
   - Context provider for storing and updating breadcrumbs across the application
   - Exports `useBreadcrumbs` hook for accessing breadcrumb state
   - Exports `BreadcrumbProvider` for wrapping the application

2. **useBreadcrumbUpdate** (`frontend/src/hooks/useBreadcrumbUpdate.ts`)
   - Custom hook that makes it easy to update breadcrumbs when a component mounts
   - Cleans up breadcrumbs when a component unmounts

3. **Breadcrumb Utilities** (`frontend/src/utils/breadcrumbs.ts`)
   - Collection of helper functions to generate consistent breadcrumbs for different parts of the application
   - Ensures UI consistency across pages

4. **Header Component** (`frontend/src/components/Navigation/Header.tsx`)
   - Displays the breadcrumb navigation in the top header bar
   - Provides consistent navigation across the application

5. **Layout Component** (`frontend/src/components/Layout.tsx`)
   - Provides consistent page layout structure
   - Passes breadcrumb items to the BreadcrumbContext

## How It Works

1. The `BreadcrumbProvider` wraps the entire application in `App.tsx`
2. Each page component updates the breadcrumbs using the `useBreadcrumbUpdate` hook
3. The `Header` component displays the breadcrumbs from the BreadcrumbContext
4. Utility functions in `breadcrumbs.ts` generate consistent breadcrumb paths

## Usage

### Basic Usage in a Page Component

```tsx
import { useAuth } from '@/contexts/AuthContext';
import { useBreadcrumbUpdate } from '@/hooks/useBreadcrumbUpdate';
import { Layout } from '@/components/Layout';

export function ExamplePage() {
  const { user } = useAuth();
  
  // Define breadcrumbs for this page
  const breadcrumbs = [
    { label: 'Dashboard', href: `/lawyer/dashboard/${user?.id}` },
    { label: 'Current Page' }
  ];

  // Update breadcrumbs when component mounts
  useBreadcrumbUpdate(breadcrumbs);
  
  return (
    <Layout breadcrumbItems={breadcrumbs}>
      {/* Page title should now be included in the content, not in the Layout props */}
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Page Title</h1>
        {/* Page content */}
      </div>
    </Layout>
  );
}
```

### Using Utility Functions for Consistency

```tsx
import { useAuth } from '@/contexts/AuthContext';
import { useBreadcrumbUpdate } from '@/hooks/useBreadcrumbUpdate';
import { getClientBreadcrumbs } from '@/utils/breadcrumbs';
import { Layout } from '@/components/Layout';

export function ClientPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [client, setClient] = useState(null);
  
  // Use utility function to generate breadcrumbs
  const clientName = client ? `${client.first_name} ${client.last_name}` : undefined;
  const breadcrumbs = getClientBreadcrumbs(user?.id, id, clientName);

  // Update breadcrumbs when component mounts or client changes
  useBreadcrumbUpdate(breadcrumbs, [client?.first_name, client?.last_name]);
  
  return (
    <Layout breadcrumbItems={breadcrumbs}>
      <div className="container mx-auto py-8">
        {/* Page header with title */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            {clientName || 'Client'}
          </h1>
          {/* Action buttons */}
        </div>
        
        {/* Page content */}
      </div>
    </Layout>
  );
}
```

## Best Practices

1. Always include breadcrumb navigation for consistency
2. Use the breadcrumb utility functions to ensure consistent paths
3. Update breadcrumbs when relevant data changes (use the dependencies array in `useBreadcrumbUpdate`)
4. Include the user ID in dashboard links when available
5. Keep breadcrumb labels short and clear
6. Include page titles in the main content area, not in the Layout props
7. Place action buttons near the page title in the content area 