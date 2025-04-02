import { useState } from 'react';
import { Button } from '../button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../dialog';
import { CheckCircle, RefreshCcw, Trash2, Bug, Settings, LifeBuoy } from 'lucide-react';
import { Checkbox } from '../checkbox';
import { Label } from '../label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../tabs';
import { Separator } from '../separator';
import { clearSupabaseState, cleanupApplicationState, performFullReset } from '@/utils/app-cleanup';

/**
 * Dev Tools menu for troubleshooting and development.
 * Only shows in development mode by default.
 */
export function DevToolsMenu() {
  // Don't show in production mode unless forced
  const isDev = import.meta.env.DEV;
  const [open, setOpen] = useState(false);
  
  // State for cleanup options
  const [clearOptions, setClearOptions] = useState({
    localStorage: true,
    sessionStorage: true,
    caches: false,
    cookies: false
  });
  
  // Toggle option checkboxes
  const toggleOption = (option: keyof typeof clearOptions) => {
    setClearOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };
  
  // Run cleanup with selected options
  const runCleanup = () => {
    cleanupApplicationState({
      clearLocalStorage: clearOptions.localStorage,
      clearSessionStorage: clearOptions.sessionStorage,
      clearCaches: clearOptions.caches,
      clearCookies: clearOptions.cookies
    });
    setOpen(false);
  };
  
  // Only show in development or when forced
  if (!isDev) return null;
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="icon"
          className="fixed right-6 bottom-6 h-12 w-12 rounded-full shadow-md"
        >
          <Bug className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Developer Tools
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="cleanup">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="cleanup">Cleanup</TabsTrigger>
            <TabsTrigger value="debug">Debug</TabsTrigger>
            <TabsTrigger value="info">Info</TabsTrigger>
          </TabsList>
          
          <TabsContent value="cleanup" className="space-y-4">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="cleanup-options">
                <AccordionTrigger>Cleanup Options</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="localStorage" 
                        checked={clearOptions.localStorage}
                        onCheckedChange={() => toggleOption('localStorage')}
                      />
                      <Label htmlFor="localStorage">Clear LocalStorage (Auth & Settings)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="sessionStorage" 
                        checked={clearOptions.sessionStorage}
                        onCheckedChange={() => toggleOption('sessionStorage')}
                      />
                      <Label htmlFor="sessionStorage">Clear SessionStorage (Temporary data)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="caches" 
                        checked={clearOptions.caches}
                        onCheckedChange={() => toggleOption('caches')}
                      />
                      <Label htmlFor="caches">Clear Caches (API responses)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="cookies" 
                        checked={clearOptions.cookies}
                        onCheckedChange={() => toggleOption('cookies')}
                      />
                      <Label htmlFor="cookies">Clear Cookies (Authentication)</Label>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant="secondary" 
                className="flex items-center" 
                onClick={runCleanup}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Run Cleanup
              </Button>
              
              <Button 
                variant="secondary" 
                className="flex items-center" 
                onClick={() => clearSupabaseState()}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Fix Auth
              </Button>
              
              <Button 
                variant="destructive" 
                className="flex items-center col-span-2" 
                onClick={() => performFullReset()}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Full Reset
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="debug" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Connection Status</h3>
              
              <div className="rounded-lg border p-4 text-sm">
                <p><strong>Backend:</strong> {window.location.hostname}:8000</p>
                <p><strong>Network Online:</strong> {navigator.onLine ? 'Yes' : 'No'}</p>
                <p><strong>Supabase Connected:</strong> {window.__SUPABASE_CONNECTION?.isConnected ? 'Yes' : 'No'}</p>
              </div>
              
              <h3 className="text-sm font-medium">Error Monitoring</h3>
              <Button 
                variant="outline" 
                onClick={() => console.log('Global state:', window.__SUPABASE_CONNECTION)}
              >
                Log Connection State
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="info" className="space-y-4">
            <div className="rounded-lg border p-4 text-sm space-y-2">
              <p><strong>Environment:</strong> {import.meta.env.MODE}</p>
              <p><strong>Version:</strong> {import.meta.env.VITE_APP_VERSION || 'development'}</p>
              <p><strong>Build Date:</strong> {new Date().toLocaleDateString()}</p>
            </div>
            
            <Button 
              variant="outline"
              className="w-full"
              onClick={() => {
                window.open('/docs', '_blank');
              }}
            >
              <LifeBuoy className="mr-2 h-4 w-4" />
              Open API Documentation
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default DevToolsMenu; 