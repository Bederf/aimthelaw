import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from 'lovable-tagger';

// Custom plugin to prevent HMR on tab focus - DISABLED due to refresh issues
const preventHmrOnTabFocus = () => {
  return {
    name: 'prevent-hmr-on-tab-focus',
    configureServer(server) {
      // This plugin is now disabled to prevent refresh issues
      console.log('[vite] HMR tab focus prevention plugin is disabled');
      return;
      
      // Store the original HMR handler
      const originalHandle = server.ws.send;
      
      // Last tab focus time
      let lastTabFocusTime = 0;
      
      // Override the WebSocket send method - FIXED TypeScript error by adding type and using call
      server.ws.send = function(payload: any) {
        // Check if this is an HMR update
        if (typeof payload === 'object' && payload.type === 'update') {
          // Get current time
          const now = Date.now();
          
          // If it's within 5 seconds of a tab focus event, block it
          if (now - lastTabFocusTime < 5000) {
            console.log('[vite] Blocked HMR update due to recent tab focus');
            return; // Don't send the update
          }
        }
        
        // Use call instead of apply to fix the TypeScript error
        return originalHandle.call(this, payload);
      };
      
      // Listen for connection events to track tab focus - FIXED WebSocket type errors
      // by adding explicit types
      server.ws.on('connection', (socket: any) => {
        socket.on('message', (data: any) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.event === 'tab-focus') {
              lastTabFocusTime = Date.now();
              console.log('[vite] Tab focus event received, blocking HMR for 5s');
            }
          } catch (e) {
            // Ignore parsing errors
          }
        });
      });
    }
  };
};

export default defineConfig({
  plugins: [
    react(),
    // preventHmrOnTabFocus(), // Disabled to prevent refresh issues
    componentTagger() // Add Lovable component tagger plugin
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: process.env.NODE_ENV === 'development',
    rollupOptions: {
      output: {
        sourcemapExcludeSources: true
      }
    }
  },
  server: {
    port: 8080,
    host: true,
    hmr: false, // Completely disable HMR to prevent page refreshes
    strictPort: true,
    watch: {
      usePolling: true,
      interval: 1000,
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'lovable-tagger'],
  },
  define: {
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify('http://localhost:8000'),  // Backend URL
    'import.meta.env.VITE_API_URL': JSON.stringify('http://localhost:8000'),  // Backend URL
  },
}); 