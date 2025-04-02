
import React, { ReactNode, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Home,
  Users,
  FileText,
  MessageSquare,
  Calendar,
  Settings,
  Menu,
  LogOut,
  ChevronRight,
  X
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle/ThemeToggle';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './ui/use-toast';

interface SidebarLayoutProps {
  children: ReactNode;
}

export const SidebarLayout: React.FC<SidebarLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { isAuthenticated, user, userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const sidebarItems = [
    {
      icon: Home,
      label: 'Dashboard',
      href: user?.id ? `/lawyer/dashboard/${user.id}` : '/dashboard',
    },
    {
      icon: Users,
      label: 'Clients',
      href: '/lawyer/clients',
    },
    {
      icon: FileText,
      label: 'Documents',
      href: '/lawyer/documents',
    },
    {
      icon: MessageSquare,
      label: 'AI Assistant',
      href: '/lawyer/ai',
    },
    {
      icon: Calendar,
      label: 'Calendar',
      href: '/lawyer/calendar',
    },
    {
      icon: Settings,
      label: 'Settings',
      href: '/lawyer/settings',
    },
  ];

  const handleLogout = async () => {
    try {
      window.dispatchEvent(new CustomEvent('user-logout'));
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to log out"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r transition-all duration-300 fixed h-screen z-10`}>
        <div className="h-16 border-b px-4 flex items-center justify-between">
          <Link to="/" className={`flex items-center ${!sidebarOpen && 'justify-center'}`}>
            {sidebarOpen ? (
              <>
                <span className="text-primary font-bold text-xl">AI'm</span>
                <span className="font-bold text-xl"> the Law</span>
              </>
            ) : (
              <span className="text-primary font-bold text-xl">AI</span>
            )}
          </Link>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-8 w-8"
          >
            {sidebarOpen ? <ChevronRight className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        <div className="px-2 py-6">
          <ul className="space-y-1">
            {sidebarItems.map((item) => (
              <li key={item.label}>
                <Link
                  to={item.href}
                  className="flex items-center px-3 py-3 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <item.icon className={`h-5 w-5 text-gray-600 ${!sidebarOpen && 'mx-auto'}`} />
                  {sidebarOpen && <span className="ml-3 text-gray-700">{item.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="absolute bottom-0 w-full border-t p-4">
          {sidebarOpen ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium line-clamp-1">{user?.email || 'User'}</p>
                  <p className="text-xs text-gray-500 capitalize">{userRole || 'User'}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleLogout} 
                className="h-8 w-8 text-gray-500"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleLogout} 
                className="h-8 w-8 text-gray-500"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300`}>
        <div className="py-6 px-6">
          {children}
        </div>
      </div>
    </div>
  );
};
