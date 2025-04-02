/**
 * Format a date to ISO 8601 format with consistent formatting
 * This ensures dates are properly formatted to avoid parsing issues
 * 
 * @param date The date to format (defaults to current date if not provided)
 * @param includeMilliseconds Whether to include milliseconds (default: false)
 * @returns A properly formatted ISO 8601 date string
 */
export function formatISODate(date?: Date, includeMilliseconds = false): string {
  const dateObj = date || new Date();
  
  if (includeMilliseconds) {
    // Force milliseconds to have exactly 3 digits
    const baseISO = dateObj.toISOString();
    const withoutMilliseconds = baseISO.slice(0, 19); // YYYY-MM-DDTHH:MM:SS
    const timezone = baseISO.slice(23);  // Z or timezone offset
    const milliseconds = dateObj.getMilliseconds().toString().padStart(3, '0');
    
    return `${withoutMilliseconds}.${milliseconds}${timezone}`;
  } else {
    // Remove milliseconds entirely
    return dateObj.toISOString().replace(/\.\d+/, '');
  }
}

/**
 * Parse an ISO date string safely, handling various formats
 * 
 * @param dateString The ISO date string to parse
 * @returns A Date object or null if parsing fails
 */
export function parseISODate(dateString: string): Date | null {
  if (!dateString) return null;
  
  try {
    // Handle dates with or without timezone
    let normalizedDateString = dateString;
    
    // Add Z if no timezone is specified
    if (!dateString.endsWith('Z') && !dateString.includes('+') && !dateString.includes('-', 10)) {
      normalizedDateString = `${dateString}Z`;
    }
    
    // Replace Z with +00:00 for better compatibility
    normalizedDateString = normalizedDateString.replace('Z', '+00:00');
    
    return new Date(normalizedDateString);
  } catch (error) {
    console.error('Error parsing ISO date:', error);
    return null;
  }
} 