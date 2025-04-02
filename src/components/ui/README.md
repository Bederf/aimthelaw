# UI Component Library

This directory contains a collection of reusable UI components designed to maintain a consistent look and feel across the application. These components are built using Material-UI and follow the design system established for the application.

## Core Components

### PageHeader

A consistent header component for all pages with support for titles, subtitles, gradient backgrounds, breadcrumb navigation, and action buttons.

```tsx
import PageHeader from '@/components/ui/PageHeader';

// Basic usage
<PageHeader 
  title="Page Title" 
  subtitle="Optional subtitle or description"
/>

// With gradient background
<PageHeader 
  title="Page Title" 
  subtitle="Optional subtitle or description"
  gradient={true}
/>

// With breadcrumbs
<PageHeader 
  title="Edit Client"
  breadcrumbs={[
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Clients', href: '/clients' },
    { label: 'Edit Client' } // Current page (no href)
  ]}
/>

// With actions
<PageHeader 
  title="Clients"
  actions={
    <Button variant="contained" onClick={handleAddNew}>
      Add New Client
    </Button>
  }
/>
```

### ContentCard

A flexible container component for content sections, with support for titles, subtitles, actions, and footer actions.

```tsx
import ContentCard from '@/components/ui/ContentCard';

// Basic usage
<ContentCard>
  <Typography>Your content here</Typography>
</ContentCard>

// With title and subtitle
<ContentCard 
  title="Card Title" 
  subtitle="Optional subtitle or description"
>
  <Typography>Your content here</Typography>
</ContentCard>

// With actions in header
<ContentCard 
  title="Card Title"
  actions={
    <Button variant="text">View All</Button>
  }
>
  <Typography>Your content here</Typography>
</ContentCard>

// With footer actions
<ContentCard 
  title="Card Title"
  footerActions={
    <>
      <Button variant="outlined">Cancel</Button>
      <Button variant="contained">Save</Button>
    </>
  }
>
  <Typography>Your content here</Typography>
</ContentCard>
```

### FormLayout

A standardized layout for forms with consistent styling, spacing, and behavior for form fields, buttons, and validation messages.

```tsx
import FormLayout from '@/components/ui/FormLayout';

// Basic usage
<FormLayout
  title="Form Title"
  subtitle="Form description"
  submitText="Submit"
  cancelText="Cancel"
  onSubmit={handleSubmit}
  onCancel={handleCancel}
>
  <TextField label="Field 1" fullWidth />
  <TextField label="Field 2" fullWidth />
</FormLayout>

// With columns
<FormLayout
  title="Form Title"
  submitText="Submit"
  columns={2} // Display fields in 2 columns
>
  <TextField label="First Name" fullWidth />
  <TextField label="Last Name" fullWidth />
  <TextField label="Email" fullWidth />
  <TextField label="Phone" fullWidth />
</FormLayout>

// With error handling
<FormLayout
  title="Form Title"
  submitText="Submit"
  isLoading={isSubmitting}
  error={errorMessage}
>
  <TextField label="Field 1" fullWidth />
</FormLayout>
```

## Usage Guidelines

1. **Consistency**: Use these components consistently throughout the application to maintain a unified look and feel.

2. **Customization**: While these components provide default styling, they also accept style overrides through the `sx` prop for customization when needed.

3. **Accessibility**: These components are designed with accessibility in mind. Maintain proper contrast, focus states, and semantic structure when using them.

4. **Responsive Design**: All components are responsive by default. Test your UI across different screen sizes to ensure a good user experience.

5. **Performance**: Avoid nesting too many components unnecessarily to prevent performance issues.

## Example Pages

For complete examples of how to use these components in context, refer to the following example implementations:

- `frontend/src/examples/RefactoredEditClientPage.tsx` - Example of editing a client
- `frontend/src/examples/RefactoredListClientsPage.tsx` - Example of listing clients
- `frontend/src/examples/RefactoredNewClientPage.tsx` - Example of creating a new client 