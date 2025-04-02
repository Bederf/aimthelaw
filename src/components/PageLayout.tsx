import React from 'react';
import { Layout } from '@/components/Layout';
import { BreadcrumbItem } from '@/contexts/BreadcrumbContext';

interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  breadcrumbItems: BreadcrumbItem[];
  action?: React.ReactNode;
}

/**
 * PageLayout component that provides consistent styling across all pages
 * 
 * This component ensures that all pages follow the same layout structure:
 * - Header with title and optional description and action button
 * - Content area with proper spacing and styling
 * - Uses the dark theme with glass card effects
 */
export function PageLayout({
  children,
  title,
  description,
  breadcrumbItems,
  action
}: PageLayoutProps) {
  return (
    <Layout breadcrumbItems={breadcrumbItems}>
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">{title}</h1>
              {description && (
                <p className="text-muted-foreground">{description}</p>
              )}
            </div>
            {action && (
              <div>{action}</div>
            )}
          </div>
        </div>
        
        {/* Content Section */}
        <div className="space-y-8">
          {children}
        </div>
      </div>
    </Layout>
  );
}

export default PageLayout; 