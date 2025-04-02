import { Moon, Sun } from 'lucide-react';
import { Button } from '../ui/button';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export function ThemeToggle() {
  const { mode, toggleMode } = useTheme();
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={toggleMode}>
          {mode === "light" ? (
            <Moon className="mr-2 h-4 w-4" />
          ) : (
            <Sun className="mr-2 h-4 w-4" />
          )}
          <span>{mode === "light" ? "Dark" : "Light"} mode</span>
        </DropdownMenuItem>
        
        {/* Only show theme settings option for admin users */}
        {isAdmin && (
          <DropdownMenuItem 
            onClick={() => window.location.href = '/admin/theme'}
          >
            <span>Theme settings</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 