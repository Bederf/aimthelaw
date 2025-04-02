/**
 * Environment detection utilities
 */

/**
 * Checks if the current environment is likely to be Windows Subsystem for Linux (WSL)
 * This is a heuristic based on user agent and platform information
 */
export const isWSLEnvironment = (): boolean => {
  // Check if running in browser environment
  if (typeof window === 'undefined') return false;
  
  // Method 1: Check for Linux UserAgent with Windows platform
  const isLinuxUA = window.navigator.userAgent.toLowerCase().includes('linux');
  const hasWindowsPlatform = window.navigator.platform.toLowerCase().includes('win');
  
  // Method 2: Check for audio playback errors previously recorded
  const hasAudioErrors = !!localStorage.getItem('has-audio-playback-errors');
  
  // Method 3: Check for 'wsl' in the user agent string (sometimes present)
  const hasWSLInUA = window.navigator.userAgent.toLowerCase().includes('wsl');
  
  // Method 4: Check for memory errors commonly occurring in WSL browsers
  const hasMemoryErrors = localStorage.getItem('memory-errors') === 'true';
  
  // Method 5: Check if explicit WSL mode has been enabled by the user
  const explicitWSLMode = localStorage.getItem('explicit-wsl-mode') === 'true';
  
  return (isLinuxUA && hasWindowsPlatform) || 
         hasAudioErrors || 
         hasWSLInUA || 
         hasMemoryErrors || 
         explicitWSLMode;
};

/**
 * Get the user's preference for WSL mode (download instead of autoplay)
 * Defaults to auto-detection if not explicitly set
 */
export const getWSLPreference = (): boolean => {
  const storedPref = localStorage.getItem('wsl-download-mode');
  
  // If user has explicitly set a preference, use that
  if (storedPref === 'true') return true;
  if (storedPref === 'false') return false;
  
  // Otherwise auto-detect
  return isWSLEnvironment();
};

/**
 * Set the user's preference for WSL mode
 */
export const setWSLPreference = (useWSLMode: boolean): void => {
  localStorage.setItem('wsl-download-mode', useWSLMode.toString());
  
  // If user is explicitly enabling WSL mode, record this separately
  if (useWSLMode) {
    localStorage.setItem('explicit-wsl-mode', 'true');
  }
};

/**
 * Get the user's preference for iframe playback mode
 */
export const getIframePlaybackPreference = (): boolean => {
  const storedPref = localStorage.getItem('tts-iframe-mode');
  
  // If user has explicitly set a preference, use that
  if (storedPref === 'true') return true;
  if (storedPref === 'false') return false;
  
  // Default to true (iframe mode) for WSL environments
  return isWSLEnvironment() ? true : false;
};

/**
 * Set the user's preference for iframe playback mode
 */
export const setIframePlaybackPreference = (useIframeMode: boolean): void => {
  localStorage.setItem('tts-iframe-mode', useIframeMode.toString());
};

/**
 * Record an audio playback error to help with future detection
 */
export const recordAudioPlaybackError = (error: any): void => {
  console.warn('Audio playback error recorded:', error);
  localStorage.setItem('has-audio-playback-errors', 'true');
  localStorage.setItem('last-audio-error', JSON.stringify({
    message: error.message || String(error),
    timestamp: new Date().toISOString()
  }));
  
  // If this is a memory error, also record that specifically
  if (error.message && (
      error.message.includes('out of memory') || 
      error.message.includes('memory limit') ||
      error.message.includes('allocation failed')
    )) {
    localStorage.setItem('memory-errors', 'true');
  }
};

/**
 * Clear all environment detection data and reset to defaults
 */
export const resetEnvironmentDetection = (): void => {
  localStorage.removeItem('wsl-download-mode');
  localStorage.removeItem('has-audio-playback-errors');
  localStorage.removeItem('last-audio-error');
  localStorage.removeItem('memory-errors');
  localStorage.removeItem('explicit-wsl-mode');
  localStorage.removeItem('tts-iframe-mode');
  
  console.log('Environment detection data reset to defaults');
}; 