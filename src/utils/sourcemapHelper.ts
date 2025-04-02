/**
 * Utility to help handle source map errors and warnings
 */

// Store original console methods
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Source map error patterns to suppress
const SOURCEMAP_ERROR_PATTERNS = [
  'Failed to parse source map',
  'Could not load content for',
  'Source map error:',
  'Error: request failed with status 404',
  'Error: ENOENT: no such file',
  '.map: Not Found'
];

// Filter console warnings related to source maps
console.warn = function(...args: any[]) {
  if (args.length > 0 && typeof args[0] === 'string') {
    const message = args[0];
    
    // Check if this is a source map error we want to suppress
    const isSourceMapError = SOURCEMAP_ERROR_PATTERNS.some(pattern => message.includes(pattern));
    
    if (isSourceMapError) {
      // If in development, log a more subtle message
      if (import.meta.env.DEV) {
        console.debug('[Dev] Suppressed source map warning:', message.slice(0, 150) + '...');
      }
      return;
    }
  }
  
  // Pass through other warnings
  originalConsoleWarn.apply(console, args);
};

// Filter console errors related to source maps
console.error = function(...args: any[]) {
  if (args.length > 0 && typeof args[0] === 'string') {
    const message = args[0];
    
    // Check if this is a source map error we want to suppress
    const isSourceMapError = SOURCEMAP_ERROR_PATTERNS.some(pattern => message.includes(pattern));
    
    if (isSourceMapError) {
      // If in development, log a more subtle message
      if (import.meta.env.DEV) {
        console.debug('[Dev] Suppressed source map error:', message.slice(0, 150) + '...');
      }
      return;
    }
  }
  
  // Pass through other errors
  originalConsoleError.apply(console, args);
};

// Additional helper to track source map issues during development
if (import.meta.env.DEV) {
  let sourceMapIssueCount = 0;
  
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0]?.toString() || '';
    
    // Monitor requests for source maps that fail
    if (url.endsWith('.map')) {
      return originalFetch.apply(window, args)
        .then(response => {
          if (!response.ok && response.status === 404) {
            sourceMapIssueCount++;
            console.debug(`[Dev] Source map 404 (${sourceMapIssueCount} total):`, url);
          }
          return response;
        })
        .catch(err => {
          if (SOURCEMAP_ERROR_PATTERNS.some(pattern => err.message.includes(pattern))) {
            sourceMapIssueCount++;
            console.debug(`[Dev] Source map fetch error (${sourceMapIssueCount} total):`, url);
          }
          throw err;
        });
    }
    
    return originalFetch.apply(window, args);
  };
} 