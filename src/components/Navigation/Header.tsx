import { LogOut } from 'lucide-react';
import { Button } from '../ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../ui/use-toast';
import { ThemeToggle } from '../ThemeToggle/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useBreadcrumbs } from '@/contexts/BreadcrumbContext';
import { ChevronRight } from 'lucide-react';

export function Header() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, userRole, user } = useAuth();
  const { breadcrumbs } = useBreadcrumbs();

  // Determine the appropriate home path based on user role
  const getHomePath = () => {
    if (!isAuthenticated || !userRole) return '/';
    
    switch (userRole) {
      case 'lawyer':
        return user?.id ? `/lawyer/dashboard/${user.id}` : '/';
      case 'admin':
        return '/admin/dashboard';
      case 'client':
        return '/client/dashboard';
      default:
        return '/';
    }
  };

  const handleLogout = async () => {
    try {
      // Dispatch the logout event to trigger message cleanup
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
    <header className="border-b">
      <div className="container mx-auto py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link to={getHomePath()} className="font-bold text-xl">
              Legal AI System
            </Link>
            
            {/* Breadcrumb navigation in the header - adjusted spacing */}
            {breadcrumbs.length > 0 && (
              <nav className="flex items-center space-x-1 text-sm text-muted-foreground ml-3">
                {breadcrumbs.map((item, index) => (
                  <div key={`${item.label}-${index}`} className="flex items-center">
                    {index > 0 && <ChevronRight className="h-3 w-3 mx-1" />}
                    {item.href ? (
                      <Link 
                        to={item.href} 
                        className="hover:text-foreground transition-colors"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span className="font-medium text-foreground">{item.label}</span>
                    )}
                  </div>
                ))}
              </nav>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {isAuthenticated && <ThemeToggle />}
            
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

