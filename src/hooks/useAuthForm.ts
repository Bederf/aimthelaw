
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const useAuthForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.message.includes("Invalid login credentials")) {
          toast({
            title: "Invalid credentials",
            description: "Please check your email and password",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: signInError.message,
            variant: "destructive",
          });
        }
        return;
      }

      if (data.user) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        if (profileError) {
          toast({
            title: "Error",
            description: "Could not fetch user profile",
            variant: "destructive",
          });
          return;
        }

        // Get the intended destination from the state, if any
        const from = location.state?.from?.pathname || getDefaultRoute(profileData.role);
        navigate(from, { replace: true });

        toast({
          title: "Welcome back!",
          description: "You have successfully logged in.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get the default route based on user role
  const getDefaultRoute = (role: string) => {
    switch (role) {
      case "admin":
        return "/admin/dashboard";
      case "lawyer":
        return "/lawyer/dashboard";
      case "client":
        return "/client/dashboard";
      default:
        return "/";
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    isLoading,
    handleAuth
  };
};
