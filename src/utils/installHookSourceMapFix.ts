/**
 * React DevTools Source Map Fix
 * 
 * This utility fixes the common "installHook.js.map not found" error from React DevTools.
 * The error occurs because React DevTools includes source map references but doesn't actually 
 * provide the source maps, causing 404s and console errors.
 * 
 * This fix:
 * 1. Intercepts fetch requests for installHook.js.map
 * 2. Returns a minimal valid source map to prevent errors
 * 3. Directly adds the fake source map to React DevTools' source map cache
 */

// Source map structure (follows the Source Map v3 spec)
interface SourceMap {
  version: number;
  sources: string[];
  names: string[];
  mappings: string;
  file: string;
  sourceRoot?: string;
}

/**
 * Creates a simple fake source map that maps to the original file
 */
function createFakeSourceMap(): SourceMap {
  return {
    version: 3,
    sources: ['installHook.js'],
    names: [],
    mappings: '', // Empty string means "identity mapping"
    file: 'installHook.js'
  };
}

/**
 * Installs the patch to fix React DevTools source map errors
 */
export function installSourceMapFix(): void {
  // Only patch in development mode
  if (import.meta.env.MODE !== 'development') {
    return;
  }

  console.debug('[Dev] Installing React DevTools source map fix');

  // Store the fake source map
  const fakeSourceMap = createFakeSourceMap();
  
  // 1. Intercept fetch requests for the problematic source map
  const originalFetch = window.fetch;
  window.fetch = function(input, init) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input instanceof Request ? input.url : '';
    
    if (url.endsWith('installHook.js.map')) {
      console.debug('[Dev] Intercepted request for installHook.js.map, providing fake source map');
      
      return Promise.resolve(new Response(
        JSON.stringify(fakeSourceMap),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      ));
    }
    
    // Pass through other requests
    return originalFetch.apply(window, [input, init]);
  };
  
  // 2. Add the fake source map directly to the React DevTools cache if it exists
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    // Access the source map cache (this may break if DevTools changes their internal structure)
    const devTools = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    
    // If the cache exists, add our fake source map
    if (devTools._sourceMapsCache) {
      devTools._sourceMapsCache['installHook.js.map'] = fakeSourceMap;
      console.debug('[Dev] Added fake source map directly to React DevTools cache');
    }
  }
}

// Install the fix immediately
installSourceMapFix();

// Export in case we need to reference it elsewhere
export default installSourceMapFix;

// Add types for React DevTools global hook
declare global {
  interface Window {
    __REACT_DEVTOOLS_GLOBAL_HOOK__?: {
      _sourceMapsCache?: Record<string, SourceMap>;
      [key: string]: any;
    };
  }
} 