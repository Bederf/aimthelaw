import React from 'react';
import { Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { RegisterPage } from "@/pages/Register";
import { LoginPage } from "@/pages/Login";
import LandingPage from "@/pages/LandingPage";
import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { AdminCostManagementPage } from "@/pages/admin/AdminCostManagementPage";
import { ClientDashboard } from "@/pages/client/ClientDashboard";
import { LawyerDashboard } from "@/pages/lawyer/LawyerDashboard";
import LawyerDashboardPage from '@/pages/lawyer/LawyerDashboardPage';
import { ListClientsPage } from "@/pages/lawyer/ListClientsPage";
import { CreateClientPage } from "@/pages/lawyer/CreateClientPage";
import { ViewSingleClientPage } from "@/pages/lawyer/ViewSingleClientPage";
import { EditClientPage } from "@/pages/lawyer/EditClientPage";
import { LawyerCostManagementPage } from "@/pages/lawyer/LawyerCostManagementPage";
import { ClientBillingPage } from "@/pages/lawyer/ClientBillingPage";
import DateExtractionPage from '@/pages/lawyer/DateExtractionPage';
import ReceiptScannerPage from '@/pages/lawyer/ReceiptScannerPage';
import { useAuth } from "@/contexts/AuthContext";
import { navigateByRole } from "@/utils/auth";
import { LawyerDirectory } from "@/pages/admin/Lawyers";
import { ThemePage } from "@/pages/admin/Theme";
import { AdminAnalyticsPage } from "@/pages/admin/AdminAnalytics";
import { AdminSettingsPage } from "@/pages/admin/AdminSettings";
import { SystemSettingsPage } from "@/pages/admin/SystemSettingsPage";
import TokenUsageStats from "@/pages/admin/TokenUsageStats";
import { DocumentsPage } from "@/pages/lawyer/DocumentsPage";
import { CasesPage } from "@/pages/lawyer/CasesPage";
import { useEffect } from "react";
import MaintenanceCalculationPage from '../pages/lawyer/MaintenanceCalculationPage';
import { ClientSelectionPage } from '@/pages/lawyer/ClientSelectionPage';
import AILawyerPage from '@/pages/lawyer/AILawyerPage';

// Simple NotFoundPage component
const NotFoundPage = ({ navigateTo }: { navigateTo: (path: string) => void }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-600 mb-4">Page Not Found</h2>
        <p className="mb-6 text-gray-500">The page you're looking for doesn't exist or has been moved.</p>
        <button 
          onClick={() => navigateTo('/')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Go Home
        </button>
      </div>
    </div>
  );
};

// Simple ForgotPasswordPage component
const ForgotPasswordPage = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Reset Password</h1>
        <p className="mb-6 text-gray-500">Enter your email address and we'll send you a link to reset your password.</p>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="email">Email</label>
          <input 
            className="w-full p-2 border border-gray-300 rounded" 
            id="email" 
            type="email" 
            placeholder="your@email.com" 
          />
        </div>
        <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
          Send Reset Link
        </button>
        <div className="mt-4 text-center">
          <a href="/login" className="text-blue-600 hover:underline">Back to Login</a>
        </div>
      </div>
    </div>
  );
};

// Simple ResetPasswordPage component
const ResetPasswordPage = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Set New Password</h1>
        <p className="mb-6 text-gray-500">Create a new password for your account.</p>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="password">New Password</label>
          <input 
            className="w-full p-2 border border-gray-300 rounded" 
            id="password" 
            type="password" 
            placeholder="New password" 
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 mb-2" htmlFor="confirm-password">Confirm Password</label>
          <input 
            className="w-full p-2 border border-gray-300 rounded" 
            id="confirm-password" 
            type="password" 
            placeholder="Confirm new password" 
          />
        </div>
        <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
          Reset Password
        </button>
        <div className="mt-4 text-center">
          <a href="/login" className="text-blue-600 hover:underline">Back to Login</a>
        </div>
      </div>
    </div>
  );
};

// Simple Terms and Privacy components
const TermsPage = () => (
  <div className="container mx-auto px-4 py-8">
    <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
    <p className="mb-4">These are the Terms of Service for the AI Law Platform.</p>
    <p>Please add the actual terms content here.</p>
  </div>
);

const PrivacyPage = () => (
  <div className="container mx-auto px-4 py-8">
    <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
    <p className="mb-4">This is the Privacy Policy for the AI Law Platform.</p>
    <p>Please add the actual privacy policy content here.</p>
  </div>
);

// Redirect component that preserves params in the new path
function RedirectWithParams({ fromPath, toPath }: { fromPath: string, toPath: string }) {
  const params = useParams();
  
  // Replace parameter placeholders with actual values
  const finalPath = Object.entries(params).reduce((path, [key, value]) => {
    return path.replace(`:${key}`, value || '');
  }, toPath);
  
  console.log(`Redirecting from ${fromPath} to ${finalPath}`);
  return <Navigate to={finalPath} replace />;
}

export function AppRoutes() {
  const { isAuthenticated, userRole, isLoading, user } = useAuth();
  const location = useLocation();

  // Protected route wrapper
  const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
    console.log('ProtectedRoute render:', {
      isAuthenticated,
      userRole,
      isLoading,
      allowedRoles,
      pathname: location.pathname,
      userId: user?.id
    });

    // First, if the user is authenticated but role is null, let's check if we have a cached role
    useEffect(() => {
      if (isAuthenticated && !userRole && user?.id && !isLoading) {
        console.log('User authenticated but role is null, checking cache...');
        // Try to retrieve the role from localStorage
        try {
          const cacheData = localStorage.getItem('user_role_cache');
          if (cacheData) {
            const cache = JSON.parse(cacheData);
            if (cache[user.id]) {
              console.log('Found cached role in protected route:', cache[user.id]);
              
              // Skip redirection for specific paths that should be accessible
              if (location.pathname.includes('/lawyer/ai/') || 
                  location.pathname.includes('/lawyer/documents/') ||
                  location.pathname.includes('/lawyer/clients/') ||
                  location.pathname.includes('/lawyer/maintenance')) {
                console.log(`Skipping redirection for protected path: ${location.pathname}`);
                return;
              }
              
              // Force navigate to the appropriate dashboard
              const path = cache[user.id] === 'lawyer' 
                ? `/lawyer/dashboard/${user.id}`
                : cache[user.id] === 'admin' 
                  ? '/admin/dashboard' 
                  : '/client/dashboard';
              
              // Only navigate if we're not already on this path
              if (location.pathname !== path) {
                console.log('Direct navigation from cached role to:', path);
                window.location.href = path;
              } else {
                console.log('Already on target path:', path, ', not navigating');
              }
              return;
            }
          }
        } catch (error) {
          console.error('Error retrieving cached role:', error);
        }
      }
    }, [isAuthenticated, userRole, user, isLoading, location.pathname]);

    // If still loading auth state, show loading indicator
    if (isLoading) {
      console.log('Auth state is loading, showing spinner...');
      return (
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    // If not authenticated, redirect to login with return path
    if (!isAuthenticated) {
      console.log('User not authenticated, redirecting to login with return path:', location.pathname);
      return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    }

    // If role check fails but we have a userId, let's get the role from cache before redirecting
    if (allowedRoles && !allowedRoles.includes(userRole || '') && user?.id) {
      console.log('Role check failed:', { userRole, allowedRoles, userId: user?.id });
      
      // Skip redirection for specific paths that should be accessible
      if (location.pathname.includes('/lawyer/ai/') || 
          location.pathname.includes('/lawyer/documents/') ||
          location.pathname.includes('/lawyer/clients/') ||
          location.pathname.includes('/lawyer/maintenance')) {
        console.log(`Skipping redirection for protected path: ${location.pathname}`);
        return <>{children}</>;
      }
      
      // Try to get role from localStorage
      try {
        const cacheData = localStorage.getItem('user_role_cache');
        if (cacheData) {
          const cache = JSON.parse(cacheData);
          if (cache[user.id]) {
            console.log('Using cached role for navigation:', cache[user.id]);
            
            // Direct navigation with browser API for more reliability
            const path = cache[user.id] === 'lawyer' 
              ? `/lawyer/dashboard/${user.id}`
              : cache[user.id] === 'admin' 
                ? '/admin/dashboard' 
                : '/client/dashboard';
            
            // Only navigate if we're not already on this path
            if (location.pathname !== path) {
              console.log('Navigating directly to:', path);
              window.location.href = path;
            } else {
              console.log('Already on target path:', path, ', not navigating');
            }
            return null;
          }
        }
      } catch (error) {
        console.error('Error using cached role:', error);
      }
      
      // Create a wrapper function for Navigate
      const navigateWrapper = (path: string) => {
        console.log('Navigate wrapper called with path:', path);
        // Only navigate if we're not already on this path
        if (location.pathname === path) {
          console.log('Already on target path:', path, ', not navigating');
          return <>{children}</>;
        }
        return <Navigate to={path} replace />;
      };
      
      // Use the utility function to determine the correct route
      console.log('Calling navigateByRole with:', userRole, user?.id);
      const result = navigateByRole(userRole, user?.id, navigateWrapper);
      console.log('navigateByRole returned result:', result);
      return result;
    }

    console.log('Role check passed, rendering children for path:', location.pathname);
    return <>{children}</>;
  };

  // Utility function to check if a navigation should be allowed
  function shouldAllowNavigation(targetPath: string, currentPath: string): boolean {
    // Don't prevent navigation to the same path
    if (targetPath === currentPath) {
      return true;
    }
    
    // Check if a quick action is in progress
    const isQuickActionInProgress = sessionStorage.getItem('QUICK_ACTION_IN_PROGRESS') === 'true';
    
    // If a quick action is in progress, only allow navigation within the same conversation
    if (isQuickActionInProgress) {
      console.log('Quick action in progress, checking if navigation should be allowed');
      
      // Special case: if we're in an AI Lawyer page, don't navigate away
      if (currentPath.includes('/lawyer/ai/')) {
        console.log('In AI Lawyer page during quick action, preventing navigation');
        
        // If trying to navigate to another part of the same conversation, that's okay
        const currentPathBase = currentPath.split('/').slice(0, 4).join('/');
        const targetPathBase = targetPath.split('/').slice(0, 4).join('/');
        
        if (currentPathBase === targetPathBase) {
          console.log('Navigation within the same conversation is allowed');
          return true;
        }
        
        // Store the current URL for potential restoration
        sessionStorage.setItem('QUICK_ACTION_PRESERVED_URL', currentPath);
        
        // Show a message or handle the prevention
        if (window.showToast) {
          window.showToast({
            title: "Navigation Blocked",
            description: "Please wait for the current quick action to complete before navigating away.",
            variant: "warning"
          });
        }
        
        return false;
      }
    }
    
    // By default, allow navigation
    return true;
  }

  // Navigation wrapper that prevents navigation during quick actions
  const navigateWrapper = (path: string) => {
    const currentPath = window.location.pathname;
    
    if (shouldAllowNavigation(path, currentPath)) {
      window.location.href = path;
    } else {
      console.log(`Navigation to ${path} blocked due to active quick action`);
    }
  };

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />

      {/* Lawyer routes */}
      <Route path="/lawyer">
        <Route
          index
          element={
            <ProtectedRoute allowedRoles={['lawyer']}>
              <Navigate to={`/lawyer/dashboard/${user?.id}`} replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="dashboard/:id"
          element={
            <ProtectedRoute allowedRoles={['lawyer']}>
              <LawyerDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="ai"
          element={
            <ProtectedRoute allowedRoles={['lawyer']}>
              <ClientSelectionPage 
                title="AI Legal Assistant" 
                description="Select a client to use the AI Legal Assistant with" 
                redirectPath="/lawyer/ai-new/:clientId" 
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="ai-new"
          element={
            <ProtectedRoute allowedRoles={['lawyer']}>
              <ClientSelectionPage 
                title="AI Legal Assistant" 
                description="Select a client to use the AI Legal Assistant with" 
                redirectPath="/lawyer/ai-new/:clientId" 
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="ai/:clientId"
          element={
            <ProtectedRoute allowedRoles={['lawyer']}>
              <RedirectWithParams 
                fromPath="/lawyer/ai/:clientId" 
                toPath="/lawyer/ai-new/:clientId" 
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="ai/:clientId/:conversationId"
          element={
            <ProtectedRoute allowedRoles={['lawyer']}>
              <RedirectWithParams 
                fromPath="/lawyer/ai/:clientId/:conversationId" 
                toPath="/lawyer/ai-new/:clientId/:conversationId" 
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="ai-new/:clientId"
          element={
            <ProtectedRoute allowedRoles={['lawyer']}>
              <AILawyerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="ai-new/:clientId/:conversationId"
          element={
            <ProtectedRoute allowedRoles={['lawyer']}>
              <AILawyerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="costs"
          element={
            <ProtectedRoute allowedRoles={['lawyer']}>
              <LawyerCostManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="clients"
          element={
            <ProtectedRoute allowedRoles={['lawyer']}>
              <ListClientsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="clients/new"
          element={
            <ProtectedRoute allowedRoles={['lawyer']}>
              <CreateClientPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="clients/:id"
          element={
            <ProtectedRoute allowedRoles={['lawyer']}>
              <ViewSingleClientPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="clients/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['lawyer']}>
              <EditClientPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="clients/:id/billing"
          element={
            <ProtectedRoute allowedRoles={['lawyer']}>
              <ClientBillingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="documents"
          element={
            <ProtectedRoute allowedRoles={['lawyer']}>
              <DocumentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="cases"
          element={
            <ProtectedRoute allowedRoles={['lawyer']}>
              <CasesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="clients/:clientId/dates"
          element={
            <ProtectedRoute allowedRoles={['lawyer']}>
              <DateExtractionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="clients/:clientId/receipts"
          element={
            <ProtectedRoute allowedRoles={['lawyer']}>
              <ReceiptScannerPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Maintenance calculation route - accessible from any client view */}
      <Route
        path="/clients/:clientId/maintenance"
        element={
          <ProtectedRoute allowedRoles={['admin', 'lawyer']}>
            <MaintenanceCalculationPage />
          </ProtectedRoute>
        }
      />

      {/* Additional route for consistency with other lawyer routes */}
      <Route
        path="/lawyer/clients/:clientId/maintenance"
        element={
          <ProtectedRoute allowedRoles={['admin', 'lawyer']}>
            <MaintenanceCalculationPage />
          </ProtectedRoute>
        }
      />
      
      {/* Maintenance dashboard route */}
      <Route
        path="/lawyer/maintenance"
        element={
          <ProtectedRoute allowedRoles={['admin', 'lawyer']}>
            <ClientSelectionPage 
              title="Maintenance Calculation" 
              description="Select a client to view or calculate maintenance" 
              redirectPath="/lawyer/clients/:clientId/maintenance" 
            />
          </ProtectedRoute>
        }
      />

      {/* Admin routes */}
      <Route path="/admin">
        <Route
          path="dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="costs"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminCostManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="tokens"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <TokenUsageStats />
            </ProtectedRoute>
          }
        />
        <Route
          path="theme"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ThemePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="settings/system"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <SystemSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="lawyers"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <LawyerDirectory />
            </ProtectedRoute>
          }
        />
        <Route
          path="analytics"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminAnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminSettingsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Client routes */}
      <Route
        path="/client/dashboard"
        element={
          <ProtectedRoute allowedRoles={['client']}>
            <ClientDashboard />
          </ProtectedRoute>
        }
      />

      {/* Catch all route */}
      <Route path="*" element={<NotFoundPage navigateTo={navigateWrapper} />} />
    </Routes>
  );
}
