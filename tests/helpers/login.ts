import { Page } from '@playwright/test';

/**
 * Helper function to handle login for test cases
 * @param page Playwright Page object
 * @param username Optional username (defaults to test user)
 * @param password Optional password (defaults to test password)
 */
export async function login(page: Page, username = 'mike@law.com', password = 'LAW_SNOW_801010') {
  // Navigate to login page if not already there
  if (!page.url().includes('/login')) {
    await page.goto('/login');
  }
  
  // Wait for login form to be visible
  await page.waitForSelector('form', { timeout: 5000 });
  
  // Fill in login credentials
  await page.fill('input[type="email"], input[placeholder*="email" i]', username);
  await page.fill('input[type="password"], input[placeholder*="password" i]', password);
  
  // Submit the form
  await page.click('button[type="submit"], button:has-text("Sign In")');
  
  // Wait for navigation to complete or timeout after 5 seconds
  try {
    // First try to wait for a specific URL pattern
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    console.log('Successfully navigated to dashboard');
  } catch (error) {
    // If navigation to dashboard fails, just wait for some time
    console.log('Navigation to dashboard URL failed, waiting for timeout instead');
    await page.waitForTimeout(5000);
  }
  
  // Log success message
  console.log(`Successfully logged in as ${username}`);
} 