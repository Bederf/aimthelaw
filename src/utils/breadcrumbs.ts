import { BreadcrumbItem } from '@/contexts/BreadcrumbContext';

/**
 * A utility to generate consistent breadcrumbs across the application
 */

// Helper function to generate dashboard breadcrumb
export const getDashboardBreadcrumb = (userId?: string): BreadcrumbItem => ({
  label: 'Dashboard',
  href: userId ? `/lawyer/dashboard/${userId}` : '/dashboard',
});

// Helper function to generate clients breadcrumb
export const getClientsBreadcrumb = (): BreadcrumbItem => ({
  label: 'Clients',
  href: '/lawyer/clients',
});

// Helper function to generate AI breadcrumb
export const getAIBreadcrumb = (): BreadcrumbItem => ({
  label: 'Legal AI Assistant',
  href: '/lawyer/ai',
});

// Helper function to generate costs breadcrumb
export const getCostsBreadcrumb = (): BreadcrumbItem => ({
  label: 'Cost Management',
  href: '/lawyer/costs',
});

// Generate breadcrumbs for a specific client
export const getClientBreadcrumbs = (
  userId?: string,
  clientId?: string, 
  clientName?: string
): BreadcrumbItem[] => [
  getDashboardBreadcrumb(userId),
  getClientsBreadcrumb(),
  {
    label: clientName || 'Client',
    href: clientId ? `/lawyer/clients/${clientId}` : undefined,
  },
];

// Generate breadcrumbs for editing a client
export const getEditClientBreadcrumbs = (
  userId?: string,
  clientId?: string, 
  clientName?: string
): BreadcrumbItem[] => [
  ...getClientBreadcrumbs(userId, clientId, clientName),
  { label: 'Edit' },
];

// Generate breadcrumbs for AI with a specific client
export const getAIClientBreadcrumbs = (
  userId?: string,
  clientId?: string, 
  clientName?: string
): BreadcrumbItem[] => [
  getDashboardBreadcrumb(userId),
  getAIBreadcrumb(),
  {
    label: clientName || `Client ${clientId}`,
    href: clientId ? `/lawyer/clients/${clientId}` : undefined,
  },
];

// Generate breadcrumbs for cost management
export const getCostsBreadcrumbs = (
  userId?: string,
): BreadcrumbItem[] => [
  getDashboardBreadcrumb(userId),
  getCostsBreadcrumb(),
]; 