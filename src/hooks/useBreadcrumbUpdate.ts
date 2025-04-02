import { useEffect } from 'react';
import { useBreadcrumbs, BreadcrumbItem } from '@/contexts/BreadcrumbContext';

/**
 * Hook to update breadcrumbs when a component mounts
 * 
 * @param breadcrumbs - Array of breadcrumb items to set
 * @param dependencies - Optional array of dependencies to trigger breadcrumb updates
 */
export const useBreadcrumbUpdate = (
  breadcrumbs: BreadcrumbItem[],
  dependencies: any[] = []
) => {
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs(breadcrumbs);
    
    // Clean up when the component unmounts
    return () => {
      setBreadcrumbs([]);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setBreadcrumbs, ...dependencies]);
}; 