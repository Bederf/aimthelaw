import React, { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Users,
  FileText,
  Activity,
  Calendar,
  DollarSign,
  Bot,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PageLayout } from '@/components/PageLayout';
import { PageSection } from '@/components/PageSection';
import { StatsGrid, StatItem } from '@/components/StatsGrid';
import { FeatureGrid, FeatureItem } from '@/components/FeatureGrid';
import { getDashboardBreadcrumb } from '@/utils/breadcrumbs';

// Define mock data for demonstration
const mockStats: StatItem[] = [
  { title: "Total Clients", value: 24, icon: Users },
  { title: "Active Cases", value: 8, icon: Activity },
  { title: "This Month", value: "$4,287", icon: DollarSign, description: "+12% from last month" },
  { title: "Pending Tasks", value: 6, icon: Calendar, description: "Due this week" },
];

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Features configuration with dynamic links that include user ID
  const features: FeatureItem[] = useMemo(() => [
    {
      title: 'Client Management',
      description: 'View, add, and manage all your clients in one place.',
      icon: Users,
      link: '/lawyer/clients',
      disabled: false
    },
    {
      title: 'Cost Management',
      description: 'Manage billing, invoices, and track payments efficiently.',
      icon: DollarSign,
      link: '/lawyer/costs',
      disabled: false
    },
    {
      title: 'Calendar',
      description: 'Schedule and manage your appointments and deadlines.',
      icon: Calendar,
      link: '#',
      disabled: true
    },
    {
      title: 'Document Manager',
      description: 'Organize and access all your legal documents securely.',
      icon: FileText,
      link: '#',
      disabled: true
    },
    {
      title: 'Cases Overview',
      description: 'Track progress on your active and pending cases.',
      icon: Activity,
      link: '#',
      disabled: true
    },
    {
      title: 'AI Legal Assistant',
      description: 'Get AI-powered assistance for legal research and document analysis.',
      icon: Bot,
      link: '/lawyer/ai',
      disabled: false,
      isNew: true
    }
  ], []);

  // Setup breadcrumbs
  const breadcrumbItems = [
    getDashboardBreadcrumb(user?.id)
  ];

  return (
    <PageLayout 
      title={`Welcome back${user?.email ? `, ${user.email.split('@')[0]}` : ''}`}
      description="Here's an overview of your legal practice today."
      breadcrumbItems={breadcrumbItems}
    >
      {/* Stats Section */}
      <PageSection title="Dashboard Overview" variant="default">
        <StatsGrid stats={mockStats} columns={4} />
      </PageSection>

      {/* Features Section */}
      <PageSection title="Legal Practice Tools" variant="default">
        <FeatureGrid features={features} columns={3} />
      </PageSection>
    </PageLayout>
  );
};

export default Index; 