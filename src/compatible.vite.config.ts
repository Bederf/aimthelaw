
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Custom WebSocketServer implementation to avoid type errors
class SafeWebSocketServer {
  constructor(options: { noServer: boolean; path: string }) {
    // Simple constructor implementation
    console.log("Initializing WebSocket server with options:", options);
  }

  handleUpgrade(request: any, socket: any, head: any, callback: Function) {
    // Simple implementation
    console.log("Handling WebSocket upgrade");
    callback();
  }

  on(event: string, callback: Function) {
    // Simple implementation
    console.log(`Registering event listener for: ${event}`);
    return this;
  }

  emit(event: string, ...args: any[]) {
    // Simple implementation
    console.log(`Emitting event: ${event}`);
    return true;
  }
}

// Safe message handler with proper typing
function safeMessageHandler(payload: { socket: any; data: any }) {
  const { socket, data } = payload;
  // Handle WebSocket messages
  console.log("Received message:", data);
  
  // Echo back for confirmation
  if (socket && socket.send && typeof socket.send === 'function') {
    socket.send(JSON.stringify({
      type: 'confirm',
      message: 'Message received'
    }));
  }
}

// Custom plugin without WebSocket dependencies
const createCompatibleServer = () => {
  return {
    name: 'compatible-server',
    configureServer(server: any) {
      console.log("Configuring server with compatibility mode");
      
      // Skip WebSocket setup in compatibility mode
      console.log("WebSocket server initialization skipped in compatibility mode");
    }
  };
};

export default defineConfig({
  plugins: [
    react(),
    createCompatibleServer()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: process.env.NODE_ENV === 'development',
  },
  server: {
    port: 8080,
    host: true,
    hmr: true,
    watch: {
      usePolling: true,
      interval: 1000,
    },
  },
  define: {
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify('http://localhost:8000'),
    'import.meta.env.VITE_API_URL': JSON.stringify('http://localhost:8000'),
  },
  optimizeDeps: {
    exclude: ['lovable-tagger'] // Exclude problematic package
  }
});
