import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/Layout';
import { Sun, Moon, Leaf, Flower2 } from 'lucide-react';
import { toast } from 'sonner';
import { themeService } from '@/services/themeService';
import { PageHeader } from '@/components/PageHeader';

const themes = [
  { 
    name: 'dark', 
    icon: Moon, 
    label: 'Dark Theme',
    color: '#1E1E1E' // Dark gray
  },
  { 
    name: 'light', 
    icon: Sun, 
    label: 'Light Theme',
    color: '#FFFFFF' // White
  },
  { 
    name: 'winter', 
    icon: Moon, 
    label: 'Winter Theme',
    color: '#3498DB' // Deep ice blue (more saturated)
  },
  { 
    name: 'summer', 
    icon: Sun, 
    label: 'Summer Theme',
    color: '#F1C40F' // Sunny yellow
  },
  { 
    name: 'autumn', 
    icon: Leaf, 
    label: 'Autumn Theme',
    color: '#E67E22' // Autumn orange
  },
  { 
    name: 'spring', 
    icon: Flower2, 
    label: 'Spring Theme',
    color: '#2ECC71' // Spring green
  },
] as const;

type Theme = typeof themes[number]['name'];

export function ThemeConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedLawyerTheme, setSelectedLawyerTheme] = useState<Theme>('winter');
  const [currentLawyerTheme, setCurrentLawyerTheme] = useState<Theme>('winter');
  const [currentAdminTheme, setCurrentAdminTheme] = useState<Theme>('winter');

  // Add breadcrumb items for consistent navigation
  const breadcrumbItems = [
    { label: 'Admin', href: '/admin/dashboard' },
    { label: 'Theme Configuration' }
  ];

  useEffect(() => {
    async function loadThemes() {
      try {
        const config = await themeService.getCurrentTheme();
        setSelectedLawyerTheme(config.lawyerTheme as Theme);
        setCurrentLawyerTheme(config.lawyerTheme as Theme);
        setCurrentAdminTheme(config.adminTheme as Theme);
      } catch (error) {
        console.error('Error loading themes:', error);
        toast.error('Failed to load current themes');
      } finally {
        setLoading(false);
      }
    }

    loadThemes();
  }, []);

  // Preview theme in the preview section
  useEffect(() => {
    const previewSection = document.querySelector('[data-preview-section]');
    if (previewSection) {
      previewSection.setAttribute('data-theme', selectedLawyerTheme);
      
      // Apply preview styles
      themeService.previewTheme(selectedLawyerTheme);
    }

    // Cleanup - reset preview when component unmounts
    return () => {
      if (previewSection) {
        previewSection.setAttribute('data-theme', currentLawyerTheme);
        themeService.applyThemeForCurrentPath();
      }
    };
  }, [selectedLawyerTheme, currentLawyerTheme]);

  async function handleSaveTheme() {
    if (!selectedLawyerTheme) return;

    try {
      setSaving(true);
      await themeService.updateTheme(selectedLawyerTheme, 'lawyer');
      setCurrentLawyerTheme(selectedLawyerTheme);
      toast.success('Lawyer theme updated successfully');
    } catch (error) {
      console.error('Error saving theme:', error);
      toast.error('Failed to save theme');
    } finally {
      setSaving(false);
    }
  }

  function handleThemeSelect(theme: Theme) {
    setSelectedLawyerTheme(theme);
  }

  function getContrastColor(hexColor: string): string {
    // Convert hex to RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return black or white depending on luminance
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  }

  if (loading) {
    return (
      <Layout breadcrumbItems={breadcrumbItems}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading theme configuration...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout breadcrumbItems={breadcrumbItems}>
      <PageHeader
        title="Theme Configuration"
        description="Customize the appearance of the system"
      />
      
      <div className="container py-6">
        <Card className="p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Interface Themes</h2>
            <p className="text-muted-foreground mb-6">
              Configure the theme for the lawyer interface. Changes will be previewed below but won't affect the admin interface.
              The admin interface will maintain its current theme ({currentAdminTheme}).
            </p>

            <div className="space-y-4">
              <h3 className="text-md font-medium">Lawyer Interface Theme</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {themes.map(({ name, icon: Icon, label, color }) => (
                  <Button
                    key={name}
                    variant={selectedLawyerTheme === name ? 'default' : 'outline'}
                    onClick={() => handleThemeSelect(name)}
                    style={{
                      backgroundColor: selectedLawyerTheme === name ? color : 'transparent',
                      borderColor: color,
                      color: selectedLawyerTheme === name ? getContrastColor(color) : color
                    }}
                    className="w-full h-20 flex flex-col items-center justify-center gap-2 transition-all duration-200"
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-sm">{label}</span>
                  </Button>
                ))}
              </div>

              <div className="flex justify-end mt-6">
                <Button
                  onClick={handleSaveTheme}
                  disabled={saving || selectedLawyerTheme === currentLawyerTheme}
                >
                  {saving ? 'Saving...' : 'Apply Theme'}
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t pt-6" data-preview-section>
            <h2 className="text-lg font-semibold mb-4">Theme Preview</h2>
            <div className="grid gap-4">
              <Card className="p-4">
                <h3 className="font-medium mb-2">Sample Card</h3>
                <p className="text-muted-foreground">
                  This preview shows how the lawyer interface will look with the selected theme.
                </p>
              </Card>

              <div className="flex gap-2">
                <Button variant="default">Primary Button</Button>
                <Button variant="secondary">Secondary Button</Button>
                <Button variant="outline">Outline Button</Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-4 bg-muted rounded">Muted Background</div>
                <div className="p-4 bg-accent text-accent-foreground rounded">
                  Accent Background
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
