import { ReactNode } from 'react';
import { Header } from './Navigation/Header';
import { useAuth } from '@/contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
  breadcrumbItems?: Array<{ label: string; href?: string }>;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
  gradient?: boolean;
}

export function Layout({ 
  children, 
  breadcrumbItems = [],
  title, 
  subtitle, 
  actions,
  className = '',
  gradient = false
}: LayoutProps) {
  const { isAuthenticated } = useAuth();
  
  return (
    <div className={`min-h-screen bg-background flex flex-col w-full ${className}`}>
      <Header />
      
      <main className="flex-1 flex flex-col overflow-auto w-full">
        {children}
      </main>
    </div>
  );
}
