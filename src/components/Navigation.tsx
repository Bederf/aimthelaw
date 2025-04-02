import { Calendar, CreditCard, Home, LogOut, Users, FileText, Bot, ChevronRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "./ThemeToggle/ThemeToggle";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "./ui/use-toast";

const Navigation = () => {
  const location = useLocation();
  const { breadcrumbs } = useBreadcrumbs();
  const { isAuthenticated, userRole, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Define primary navigation links
  const primaryLinks = [
    { name: "Dashboard", icon: Home, path: "/dashboard" },
    { name: "Clients", icon: Users, path: "/lawyer/clients" },
    { name: "Calendar", icon: Calendar, path: "/calendar" },
    { name: "Billing", icon: CreditCard, path: "/lawyer/costs" },
    { name: "AI Assistant", icon: Bot, path: "/lawyer/ai" }
  ];
  
  const isLoggedIn = isAuthenticated && location.pathname !== '/' && location.pathname !== '/login' && location.pathname !== '/register';
  
  // Determine the appropriate home path based on user role
  const getHomePath = () => {
    if (!isAuthenticated || !userRole) return '/';
    
    switch (userRole) {
      case 'lawyer':
        return user?.id ? `/lawyer/dashboard/${user.id}` : '/dashboard';
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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to={getHomePath()} className="flex items-center gap-2 text-lg font-semibold">
            <span className="text-primary">AI'm</span> the Law
          </Link>
          
          {isLoggedIn && (
            <>
              <div className="hidden md:flex items-center gap-6">
                {primaryLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                      location.pathname.startsWith(link.path)
                        ? "text-primary"
                        : "text-muted-foreground hover:text-primary"
                    }`}
                  >
                    <link.icon className="h-4 w-4" />
                    {link.name}
                  </Link>
                ))}
              </div>
              
              {/* Breadcrumb navigation */}
              {breadcrumbs.length > 0 && (
                <nav className="hidden md:flex items-center space-x-1 text-sm text-muted-foreground ml-3">
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
            </>
          )}
        </div>
        
        {/* Auth buttons and theme toggle */}
        <div className="flex items-center gap-2">
          {isLoggedIn && <ThemeToggle />}
          
          {isLoggedIn ? (
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden md:inline">Logout</span>
            </Button>
          ) : (
            <div className="flex items-center gap-4">
              <Link 
                to="/login"
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                Login
              </Link>
              <Link 
                to="/register"
                className="text-sm font-medium bg-primary text-white px-3 py-1 rounded-md hover:bg-primary/90 transition-colors"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
