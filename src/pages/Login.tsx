import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { verifySupabaseConfig, handleAuthError } from '@/utils/supabaseUtils';

// Define form schema
const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

// Cache keys (must match those in AuthContext)
const USER_ROLE_CACHE_KEY = 'user_role_cache';
const CACHE_EXPIRY_KEY = 'user_role_cache_expiry';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface LocationState {
  from?: string;
}

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [emergencyRole, setEmergencyRole] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Set up form with React Hook Form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const locationState = location.state as LocationState;
  const from = locationState?.from || '/';
  
  // Set up a timer to enable emergency mode if login process takes too long
  useEffect(() => {
    if (loading && !emergencyMode) {
      const timer = setTimeout(() => {
        console.log('Login process taking too long, logging automated detection attempt...');
      }, 3000); // Reduced from 5 seconds to 3 seconds
      
      return () => clearTimeout(timer);
    }
  }, [loading, emergencyMode]);
  
  // Check if user is already authenticated but stuck on login page
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        // Check if a user is already authenticated
        const { data } = await supabase.auth.getUser();
        
        if (data?.user) {
          console.log('User already authenticated, attempting to detect role and redirect...');
          
          // Try to retrieve the user's role from Supabase profiles
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();
            
          if (profileError) {
            console.error('Error fetching profile:', profileError);
          }
          
          if (profileData?.role) {
            console.log(`Detected user role from profile: ${profileData.role}`);
            // We have the role, redirect automatically
            handleRoleNavigation(data.user.id, profileData.role);
            return;
          }
          
          // Fallback to email-based role detection
          if (data.user.email) {
            let detectedRole = 'client'; // Default role
            
            if (data.user.email.includes('admin')) {
              detectedRole = 'admin';
            } else if (data.user.email.includes('lawyer') || data.user.email.includes('law.com')) {
              detectedRole = 'lawyer';
            }
            
            console.log(`Detected role from email pattern: ${detectedRole}`);
            handleRoleNavigation(data.user.id, detectedRole);
            return;
          }
          
          // If we reach here, we couldn't determine the role automatically
          console.log('Could not determine role automatically, but will keep trying silently');
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
      }
    };
    
    checkAuthState();
  }, []);
  
  // Cache the user role for future use
  const cacheUserRole = (userId: string, role: string) => {
    try {
      console.log("Caching role for user:", userId, role);
      localStorage.setItem(`user_role_${userId}`, role);
      console.log("Role cached successfully for user:", role);
    } catch (error) {
      console.error("Error caching user role:", error);
    }
  };
  
  // Handle navigation based on user role
  const handleRoleNavigation = (userId: string, role: string) => {
    // Cache the role for future use
    cacheUserRole(userId, role);
    
    // Navigate based on role - using direct navigation instead of setTimeout
    if (role === 'lawyer') {
      console.log("[handleRoleNavigation] Redirecting to lawyer dashboard");
      toast({
        title: "Success",
        description: "Welcome back, lawyer!",
      });
      // Direct navigation without setTimeout
      window.location.href = `/lawyer/dashboard/${userId}`;
    } else if (role === 'admin') {
      console.log("[handleRoleNavigation] Redirecting to admin dashboard");
      toast({
        title: "Success",
        description: "Welcome back, admin!",
      });
      // Direct navigation without setTimeout
      window.location.href = '/admin/dashboard';
    } else if (role === 'client') {
      console.log("[handleRoleNavigation] Redirecting to client dashboard");
      toast({
        title: "Success",
        description: "Welcome back, client!",
      });
      // Direct navigation without setTimeout
      window.location.href = '/client/dashboard';
    } else {
      console.error("[handleRoleNavigation] Unknown role:", role);
      toast({
        title: "Error",
        description: "Unknown user role. Please contact support.",
        variant: "destructive",
      });
      setEmergencyMode(true);
    }
  };
  
  const handleLogin = async (data: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      console.log("Login attempt starting for:", data.email);
      
      // Verify Supabase configuration before attempting login
      const configCheck = await verifySupabaseConfig();
      if (!configCheck.valid) {
        console.error("Supabase configuration error:", configCheck.message);
        toast({
          title: "Configuration Error",
          description: "Authentication system is not properly configured. Please contact support.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      // Sign in with Supabase
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        console.error("Login error:", error.message);
        
        // Use our utility function to handle auth errors
        const errorMessage = handleAuthError(error);
        toast({
          title: "Login Failed",
          description: errorMessage,
          variant: "destructive",
        });
        
        setLoading(false);
        return;
      }
      
      console.log("Login successful, fetching user data");
      toast({
        title: "Success",
        description: "Logged in successfully! Redirecting...",
      });
      
      // Try to get user data with enhanced error handling
      try {
        // Get user data directly from supabase auth
        const sessionData = await supabase.auth.getSession();
        
        if (sessionData?.data?.session?.user) {
          const userData = { data: { user: sessionData.data.session.user } };
          console.log("User data retrieved:", userData.data.user.id);
          
          // Continue with user data processing
          await processUserData(userData);
        } else {
          // Fallback to standard getUser if our enhanced method fails
          const userData = await supabase.auth.getUser();
          console.log("User data retrieved via fallback:", userData.data.user?.id);
          
          // Continue with user data processing
          await processUserData(userData);
        }
      } catch (e) {
        console.error("Error getting user data:", e);
        toast({
          title: "Error",
          description: "Could not retrieve user data. Try again or contact support.",
          variant: "destructive",
        });
        setLoading(false);
      }
    } catch (e) {
      console.error("Unexpected login error:", e);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };
  
  // Helper function to process user data after login
  const processUserData = async (userData: any) => {
    try {
      if (!userData?.data?.user) {
        throw new Error("User data not found");
      }
      
      const userId = userData.data.user.id;
      console.log("Processing user data for ID:", userId);
      
      // Get the user's role from their profile
      let { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (!profileData?.role) {
        console.log("No role found in profile, checking auth metadata");
        // Fallback to auth metadata if profile doesn't have role
        profileData = {
          role: userData.data.user.user_metadata?.role || 'unknown'
        };
      }
      
      const role = profileData.role.toLowerCase();
      console.log("User role determined:", role);
      
      // Cache this role for the user
      cacheUserRole(userId, role);
      
      // Navigate based on role
      handleRoleNavigation(userId, role);
    } catch (error) {
      console.error("Error processing user data:", error);
      toast({
        title: "Error",
        description: "Error retrieving user role. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleRoleSelection = async (role: string) => {
    try {
      console.log(`[handleRoleSelection] Emergency mode - selecting role: ${role}`);
      
      // Get current user with proper await
      const { data, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('[handleRoleSelection] Error getting user:', error);
        toast({
          title: "Authentication Error",
          description: "Could not verify your identity. Please try again.",
          variant: "destructive"
        });
        return;
      }
      
      const userId = data?.user?.id || 'unknown';
      console.log(`[handleRoleSelection] User ID: ${userId}`);
      
      // Cache the role selection
      cacheUserRole(userId, role);
      
      // Show toast notification
      toast({
        title: "Emergency Navigation",
        description: `Redirecting to ${role} dashboard...`,
      });
      
      // Use multiple navigation methods to ensure one works
      try {
        // Method 1: window.location.replace (most aggressive)
        console.log(`[handleRoleSelection] Redirecting with location.replace to ${role} dashboard`);
        if (role === 'lawyer') {
          window.location.replace(`/lawyer/dashboard/${userId}`);
        } else if (role === 'admin') {
          window.location.replace('/admin/dashboard');
        } else if (role === 'client') {
          window.location.replace('/client/dashboard');
        }
        
        // If replace doesn't trigger navigation quickly, fall back to href after a short delay
        setTimeout(() => {
          console.log(`[handleRoleSelection] Fallback - redirecting with location.href to ${role} dashboard`);
          if (role === 'lawyer') {
            window.location.href = `/lawyer/dashboard/${userId}`;
          } else if (role === 'admin') {
            window.location.href = '/admin/dashboard';
          } else if (role === 'client') {
            window.location.href = '/client/dashboard';
          }
          
          // As a final fallback, if that doesn't work, try React Router navigation
          setTimeout(() => {
            console.log(`[handleRoleSelection] Last resort - redirecting with React Router to ${role} dashboard`);
            if (role === 'lawyer') {
              navigate(`/lawyer/dashboard/${userId}`);
            } else if (role === 'admin') {
              navigate('/admin/dashboard');
            } else if (role === 'client') {
              navigate('/client/dashboard');
            }
          }, 500);
        }, 500);
      } catch (navError) {
        console.error('[handleRoleSelection] Navigation error:', navError);
        // Try one more fallback if all else fails
        if (role === 'lawyer') {
          document.location.href = `/lawyer/dashboard/${userId}`;
        } else if (role === 'admin') {
          document.location.href = '/admin/dashboard';
        } else if (role === 'client') {
          document.location.href = '/client/dashboard';
        }
      }
    } catch (error) {
      console.error('[handleRoleSelection] Unexpected error:', error);
      toast({
        title: "Authentication Error",
        description: "Could not verify your identity. Please try again.",
        variant: "destructive"
      });
    }
  }

  return (
    <div className="container relative h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-primary" />
        <div className="relative z-20 flex items-center text-lg font-medium">
          <span className="font-bold text-xl">AI'm the Law</span>
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              "This platform has revolutionized how we handle legal documentation and client communication."
            </p>
            <footer className="text-sm">Sofia Davis, Legal Professional</footer>
          </blockquote>
        </div>
      </div>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">
              Enter your credentials to access your account
            </p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="name@example.com" 
                        type="email" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
