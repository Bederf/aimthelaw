import React from 'react';
import { Moon, Sun, Palette, Lock, Snowflake, Flower, Sun as SunIcon, Leaf } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { useTheme } from '@/theme/ThemeProvider';
import { ThemeVariant, ThemeMode } from '@/theme/themes';
import { applyTheme } from '@/theme/themeUtils';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from './ui/alert';

interface ThemeSelectorProps {
  className?: string;
}

export function ThemeSelector({ className }: ThemeSelectorProps) {
  const { mode, variant, setMode, setVariant, isSystemWide } = useTheme();
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';
  const isLocked = isSystemWide && !isAdmin;

  // Theme variants with display names and colors
  const variants: { value: ThemeVariant; name: string; primaryColor: string; accentColor: string; icon?: React.ReactNode }[] = [
    { value: 'default', name: 'Default', primaryColor: 'hsl(222.2 47.4% 11.2%)', accentColor: 'hsl(215.4 16.3% 46.9%)' },
    { value: 'purple', name: 'Purple', primaryColor: 'hsl(280 100% 50%)', accentColor: 'hsl(280 30% 45%)' },
    { value: 'blue', name: 'Blue', primaryColor: 'hsl(221.2 83.2% 53.3%)', accentColor: 'hsl(210 40% 98%)' },
    { value: 'green', name: 'Green', primaryColor: 'hsl(142.1 76.2% 36.3%)', accentColor: 'hsl(142.1 76.2% 36.3%)' },
    { value: 'vibrant', name: 'Vibrant', primaryColor: 'hsl(330 100% 50%)', accentColor: 'hsl(190 100% 50%)' },
    { value: 'premium', name: 'Premium', primaryColor: 'hsl(45 100% 50%)', accentColor: 'hsl(210 100% 35%)' },
    // Seasonal themes
    { 
      value: 'winter', 
      name: 'Winter', 
      primaryColor: 'hsl(210 100% 40%)', 
      accentColor: 'hsl(180 70% 85%)',
      icon: <Snowflake className="h-4 w-4 mr-1 text-blue-500" />
    },
    { 
      value: 'spring', 
      name: 'Spring', 
      primaryColor: 'hsl(130 70% 40%)', 
      accentColor: 'hsl(160 60% 85%)',
      icon: <Flower className="h-4 w-4 mr-1 text-green-500" />
    },
    { 
      value: 'summer', 
      name: 'Summer', 
      primaryColor: 'hsl(30 90% 50%)', 
      accentColor: 'hsl(20 90% 85%)',
      icon: <SunIcon className="h-4 w-4 mr-1 text-yellow-500" />
    },
    { 
      value: 'autumn', 
      name: 'Autumn', 
      primaryColor: 'hsl(25 90% 40%)', 
      accentColor: 'hsl(15 70% 85%)',
      icon: <Leaf className="h-4 w-4 mr-1 text-orange-500" />
    },
  ];

  // Handle mode change with immediate update
  const handleModeChange = (newMode: ThemeMode) => {
    setMode(newMode);
    // Force immediate update
    applyTheme(newMode, variant);
  };

  // Handle variant change with immediate update
  const handleVariantChange = (newVariant: ThemeVariant) => {
    setVariant(newVariant);
    // Force immediate update
    applyTheme(mode, newVariant);
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="pt-6">
        {isLocked && (
          <Alert className="mb-4 bg-muted">
            <Lock className="h-4 w-4 mr-2" />
            <AlertDescription>
              Theme settings are managed by your administrator
            </AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-3">Theme Mode</h3>
            <div className="flex items-center space-x-2">
              <Button
                variant={mode === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleModeChange('light')}
                className="flex items-center gap-2"
                disabled={isLocked}
              >
                <Sun className="h-4 w-4" />
                Light
              </Button>
              <Button
                variant={mode === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleModeChange('dark')}
                className="flex items-center gap-2"
                disabled={isLocked}
              >
                <Moon className="h-4 w-4" />
                Dark
              </Button>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-3">Theme Variant</h3>
            <RadioGroup
              value={variant}
              onValueChange={(value) => handleVariantChange(value as ThemeVariant)}
              className="grid grid-cols-1 sm:grid-cols-2 gap-2"
              disabled={isLocked}
            >
              {variants.map((item) => (
                <div
                  key={item.value}
                  className={cn(
                    "relative flex items-center space-x-2 rounded-md border p-3",
                    variant === item.value ? "border-primary bg-primary/10" : "border-input",
                    isLocked ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
                  )}
                  onClick={() => !isLocked && handleVariantChange(item.value)}
                >
                  <RadioGroupItem value={item.value} id={item.value} className="sr-only" disabled={isLocked} />
                  <div className="flex flex-1 items-center justify-between">
                    <Label
                      htmlFor={item.value}
                      className={cn("flex items-center gap-2", isLocked && "cursor-not-allowed")}
                    >
                      <div className="flex space-x-1 mr-2">
                        <div
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: item.primaryColor }}
                        />
                        <div
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: item.accentColor }}
                        />
                      </div>
                      <span className="flex items-center">
                        {item.icon}
                        {item.name}
                      </span>
                    </Label>
                    {variant === item.value && (
                      isLocked ? (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Palette className="h-4 w-4 text-primary" />
                      )
                    )}
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 