import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Shield, Mail, Database, Bot } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface SystemSettings {
  maintenanceMode: boolean;
  maxTokensPerUser: number;
  emailNotifications: boolean;
  backupFrequency: number;
}

export function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SystemSettings>({
    maintenanceMode: false,
    maxTokensPerUser: 100000,
    emailNotifications: true,
    backupFrequency: 24,
  });

  const breadcrumbItems = [
    { label: 'Admin', href: '/admin/dashboard' },
    { label: 'Settings' }
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .single();

      if (error) throw new Error('Failed to fetch system settings');

      if (data) {
        setSettings(data);
      }

    } catch (err) {
      console.error('Error fetching settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch settings');
      toast.error('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (key: keyof SystemSettings, value: any) => {
    try {
      setError(null);

      const { error } = await supabase
        .from('system_settings')
        .update({ [key]: value })
        .eq('id', 1); // Assuming we have a single row for system settings

      if (error) throw new Error('Failed to update settings');

      setSettings(prev => ({ ...prev, [key]: value }));
      toast.success('Settings updated successfully');

    } catch (err) {
      console.error('Error updating settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update settings');
      toast.error('Failed to update settings');
    }
  };

  return (
    <Layout breadcrumbItems={breadcrumbItems}>
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">System Settings</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <Bot className="h-4 w-4 text-muted-foreground mr-2" />
              <CardTitle className="text-lg font-medium">AI Training</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Manage AI training documents and system configuration
                </p>
                <Button asChild>
                  <Link to="/admin/settings/system">
                    Configure AI Training
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <Shield className="h-4 w-4 text-muted-foreground mr-2" />
              <CardTitle className="text-lg font-medium">System Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Disable all non-admin access to the system
                  </p>
                </div>
                <Switch
                  checked={settings.maintenanceMode}
                  onCheckedChange={(checked) => updateSettings('maintenanceMode', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <Settings className="h-4 w-4 text-muted-foreground mr-2" />
              <CardTitle className="text-lg font-medium">Usage Limits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Max Tokens Per User</Label>
                <Input
                  type="number"
                  value={settings.maxTokensPerUser}
                  onChange={(e) => updateSettings('maxTokensPerUser', parseInt(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">
                  Maximum number of tokens a user can consume per month
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <Mail className="h-4 w-4 text-muted-foreground mr-2" />
              <CardTitle className="text-lg font-medium">Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send system alerts via email
                  </p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => updateSettings('emailNotifications', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <Database className="h-4 w-4 text-muted-foreground mr-2" />
              <CardTitle className="text-lg font-medium">Backup Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Backup Frequency (hours)</Label>
                <Input
                  type="number"
                  value={settings.backupFrequency}
                  onChange={(e) => updateSettings('backupFrequency', parseInt(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">
                  How often to create system backups
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
} 