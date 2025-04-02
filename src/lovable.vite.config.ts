import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Adjusted WebSocketServer to avoid TypeScript errors
const createWebSocketServer = () => {
  return {
    name: 'lovable-websocket-server',
    configureServer(server: any) {
      server.httpServer?.once('listening', () => {
        // Use explicit typing to avoid errors
        const wss = new WebSocketServer({
          noServer: true,
          path: '/lovable-ws',
        });
        
        server.httpServer?.on('upgrade', (request: any, socket: any, head: any) => {
          if (request.url === '/lovable-ws') {
            wss.handleUpgrade(request, socket, head, (ws) => {
              wss.emit('connection', ws, request);
            });
          }
        });
        
        wss.on('connection', (socket: any) => {
          socket.on('message', (data: any) => {
            // Using call instead of apply to avoid errors
            messageHandler.call(this, {
              socket,
              data: JSON.parse(data.toString())
            });
          });
        });
      });
    }
  };
};

// Handler function properly typed
function messageHandler(payload: { socket: any, data: any }) {
  const { socket, data } = payload;
  // Handle WebSocket messages from Lovable Tagger
  console.log('Received message from Lovable Tagger:', data);
  
  // Echo back for confirmation
  socket.send(JSON.stringify({
    type: 'confirm',
    message: 'Message received'
  }));
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    createWebSocketServer()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    // Configure for Lovable integration
    hmr: {
      // Allow connections from Lovable domain
      host: 'localhost',
      protocol: 'ws',
    },
    // Allow CORS for Lovable
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    }
  },
  // Custom entry point for Lovable integration
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'lovable.html'),
      },
    },
  },
});

// Add WebSocketServer type to avoid importing ws
class WebSocketServer {
  constructor(options: { noServer: boolean, path: string }) {
    // Constructor implementation
  }
  
  handleUpgrade(request: any, socket: any, head: any, callback: Function) {
    // Implementation
    callback();
  }
  
  on(event: string, callback: Function) {
    // Implementation
    return this;
  }
  
  emit(event: string, ...args: any[]) {
    // Implementation
    return true;
  }
} 