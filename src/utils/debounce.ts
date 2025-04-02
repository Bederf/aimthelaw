/**
 * Creates a debounced function that delays invoking the provided function
 * until after the specified wait time has elapsed since the last time it was invoked.
 * 
 * @param func The function to debounce
 * @param wait The number of milliseconds to delay
 * @param immediate Whether to invoke the function immediately on the leading edge
 * @returns A debounced version of the function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate: boolean = false
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastCallTimestamp = 0;
  
  return function(this: any, ...args: Parameters<T>): void {
    const context = this;
    const now = Date.now();
    
    // Calculate remaining time from last call
    const remaining = lastCallTimestamp + wait - now;
    
    // Execute immediately if that's the desired behavior and there's no active timeout
    if (immediate && !timeout) {
      func.apply(context, args);
      lastCallTimestamp = now;
    }
    
    // Clear any existing timeout
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    
    // If we're past the wait period since the last call, execute immediately
    if (remaining <= 0 && !immediate) {
      func.apply(context, args);
      lastCallTimestamp = now;
      return;
    }
    
    // Otherwise, set up a new timeout
    timeout = setTimeout(() => {
      // Only execute if we're not in immediate mode or if the timeout completed
      if (!immediate) {
        func.apply(context, args);
      }
      
      lastCallTimestamp = Date.now();
      timeout = null;
    }, remaining > 0 ? remaining : wait);
  };
}

/**
 * Creates a throttled function that only invokes the provided function
 * at most once per the specified period.
 * 
 * @param func The function to throttle
 * @param limit The number of milliseconds to throttle invocations to
 * @returns A throttled version of the function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastCallTimestamp = 0;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(this: any, ...args: Parameters<T>): void {
    const context = this;
    const now = Date.now();
    
    // Calculate time since last execution
    const timeSinceLastCall = now - lastCallTimestamp;
    
    // If we haven't called in longer than our limit, call immediately
    if (timeSinceLastCall >= limit) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      
      func.apply(context, args);
      lastCallTimestamp = now;
    } else {
      // Otherwise, set up a deferred execution only if not already scheduled
      if (!timeout) {
        timeout = setTimeout(() => {
          func.apply(context, args);
          lastCallTimestamp = Date.now();
          timeout = null;
        }, limit - timeSinceLastCall);
      }
    }
  };
} 