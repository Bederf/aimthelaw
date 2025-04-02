
#!/bin/bash

# Compatible start script for development
echo "Starting application with compatible configuration..."

# Set environment variables
export NODE_ENV=development
export VITE_API_BASE_URL=http://localhost:8000
export VITE_API_URL=http://localhost:8000

# Run Vite with compatible configuration
npx vite --config src/compatible.vite.config.ts
