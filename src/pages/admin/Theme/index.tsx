import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemeSelector } from '@/components/ThemeSelector';
import { useTheme } from '@/theme/ThemeProvider';
import { Palette, Check, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ThemeMode, ThemeVariant } from '@/theme/themes';
import { applyTheme } from '@/theme/themeUtils';
import { themeService } from '@/services/themeService';

export function ThemePage() {
  const { mode, variant, setMode, setVariant } = useTheme();
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSitewide, setSitewide] = useState(false);
  const [savedTheme, setSavedTheme] = useState({ mode, variant });

  const breadcrumbItems = [
    { label: 'Admin', href: '/admin/dashboard' },
    { label: 'Appearance Settings', href: '/admin/theme' },
  ];

  // Fetch saved theme settings
  useEffect(() => {
    fetchThemeSettings();
  }, []);

  // Update savedTheme when mode or variant changes
  useEffect(() => {
    // This ensures the preview updates when theme changes
    applyTheme(mode, variant);
  }, [mode, variant]);

  const fetchThemeSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .eq('id', 'theme')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Record not found, use current theme state
          console.log('No saved theme settings found, using current state');
          setSavedTheme({ mode, variant });
          setSitewide(false);
        } else {
          console.error('Error fetching theme settings:', error);
        }
      } else if (data && data.theme_config) {
        const themeConfig = data.theme_config;
        
        // Set the theme from the database
        if (themeConfig.mode) {
          setMode(themeConfig.mode as ThemeMode);
        }
        
        if (themeConfig.variant) {
          setVariant(themeConfig.variant as ThemeVariant);
        }
        
        setSavedTheme({
          mode: themeConfig.mode || 'light',
          variant: themeConfig.variant || 'default'
        });
        setSitewide(themeConfig.sitewide || false);
      }
    } catch (error) {
      console.error('Error fetching theme settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveThemeSettings = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      const themeConfig = {
        mode: mode,
        variant: variant,
        sitewide: isSitewide
      };
      
      // Update the database
      const { error } = await supabase
        .from('system_config')
        .upsert({
          id: 'theme',
          theme_config: themeConfig
        });
        
      if (error) {
        throw error;
      }
      
      // Update the cache
      await themeService.updateCache({
        adminTheme: variant,
        lawyerTheme: variant,
        updatedAt: new Date().toISOString(),
        mode: mode,
        variant: variant,
        sitewide: isSitewide
      });
      
      // If system-wide, apply the theme to all pages immediately
      if (isSitewide) {
        // Get the proper theme name based on the variant
        const themeVariantMap: Record<string, string> = {
          'default': 'winter',
          'premium': 'dark',
          'dark': 'dark',
          'light': 'winter',
          'winter': 'winter'
        };
        
        const themeToApply = themeVariantMap[variant] || 
                            (mode === 'dark' ? 'dark' : 'winter');
                            
        console.log(`Applying system-wide theme: ${themeToApply} to all pages (variant: ${variant}, mode: ${mode})`);
        
        // Update all data-theme attributes
        document.documentElement.setAttribute('data-theme', themeToApply);
        document.body.setAttribute('data-theme', themeToApply);
        
        // Apply the theme
        themeService.applyTheme(themeToApply);
      }
      
      toast({
        title: "Theme settings saved",
        description: "Your theme settings have been saved and applied.",
        variant: "default"
      });
    } catch (error) {
      console.error('Error saving theme settings:', error);
      toast({
        title: "Error",
        description: "There was an error saving your theme settings.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const setAsDefault = async () => {
    try {
      setIsSaving(true);
      
      // Save current theme as default
      await saveThemeSettings();
      
      // If sitewide is enabled, apply to all user profiles
      if (isSitewide) {
        try {
          // Use the theme service instead of direct RPC call
          const result = await themeService.updateAllUserThemes(mode, variant);
          
          if (result.success) {
            toast.success(result.message);
          } else {
            // Still a partial success since we saved the settings
            toast.success('Theme settings saved as system default');
            toast({
              title: 'Note',
              description: result.message,
              variant: 'default'
            });
          }
        } catch (themeError) {
          console.warn('Error updating all user themes:', themeError);
          // Fallback message
          toast.success('Theme settings saved as system default');
        }
      } else {
        toast.success('Theme settings saved as default');
      }
    } catch (error) {
      console.error('Error setting default theme:', error);
      toast.error('Failed to set as default theme');
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefault = () => {
    setMode('light');
    setVariant('default');
    // Force immediate update
    applyTheme('light', 'default');
    toast.info('Reset to default theme');
  };

  return (
    <Layout title="System Appearance Settings" breadcrumbItems={breadcrumbItems}>
      <div className="container py-8">
        <div className="flex flex-col gap-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">System Appearance Settings</h1>
              <p className="text-muted-foreground">
                Configure the default appearance for all users. When "Apply to all users" is enabled, 
                individual user theme preferences will be overridden.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={resetToDefault} disabled={isSaving}>
                <RotateCw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button onClick={saveThemeSettings} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 space-y-6">
              <ThemeSelector />
              
              <Card>
                <CardHeader>
                  <CardTitle>Global Settings</CardTitle>
                  <CardDescription>Control how themes apply across the system</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="sitewide">Apply to all users</Label>
                        <p className="text-sm text-muted-foreground">
                          Override individual user theme settings
                        </p>
                      </div>
                      <Switch
                        id="sitewide"
                        checked={isSitewide}
                        onCheckedChange={setSitewide}
                      />
                    </div>
                    
                    <Button 
                      className="w-full" 
                      variant="secondary" 
                      onClick={setAsDefault}
                      disabled={isSaving}
                    >
                      <Palette className="mr-2 h-4 w-4" />
                      Set as System Default
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Theme Preview</CardTitle>
                  <CardDescription>Preview how the selected theme will look</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="components">
                    <TabsList className="mb-4">
                      <TabsTrigger value="components">Components</TabsTrigger>
                      <TabsTrigger value="colors">Colors</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="components" className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Buttons</h4>
                          <div className="flex flex-wrap gap-2">
                            <Button variant="default">Default</Button>
                            <Button variant="secondary">Secondary</Button>
                            <Button variant="outline">Outline</Button>
                            <Button variant="ghost">Ghost</Button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Cards</h4>
                          <Card className="p-2">
                            <p className="text-xs">Card Example</p>
                          </Card>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Typography</h4>
                        <div className="space-y-2">
                          <h1 className="text-3xl font-bold">Heading 1</h1>
                          <h2 className="text-2xl font-bold">Heading 2</h2>
                          <h3 className="text-xl font-bold">Heading 3</h3>
                          <p className="text-base">Body text example</p>
                          <p className="text-sm text-muted-foreground">Muted text example</p>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="colors">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                          { name: 'Background', class: 'bg-background text-foreground' },
                          { name: 'Foreground', class: 'bg-foreground text-background' },
                          { name: 'Primary', class: 'bg-primary text-primary-foreground' },
                          { name: 'Secondary', class: 'bg-secondary text-secondary-foreground' },
                          { name: 'Accent', class: 'bg-accent text-accent-foreground' },
                          { name: 'Muted', class: 'bg-muted text-muted-foreground' },
                        ].map((color) => (
                          <div key={color.name} className="space-y-1.5">
                            <div className={`p-4 rounded-md ${color.class}`}>
                              {color.name}
                            </div>
                            <p className="text-xs">{color.name}</p>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 