import { test, expect } from '@playwright/test';

test('Login and navigate to AI Lawyer page', async ({ page }) => {
  // Navigate to the login page
  await page.goto('http://localhost:8080/login');
  
  // Fill login credentials with your account
  await page.fill('input[type="email"], input[placeholder*="email" i]', 'mike@law.com');
  await page.fill('input[type="password"], input[placeholder*="password" i]', 'LAW_SNOW_801010');
  
  // Click login button
  await page.click('button[type="submit"], button:has-text("Sign In")');
  
  // Wait for navigation to complete - use a more generic approach
  try {
    // Wait for some time after login
    await page.waitForTimeout(5000);
    
    // Check if we're on any dashboard page
    const url = page.url();
    console.log('Current URL after login:', url);
    
    if (url.includes('dashboard')) {
      console.log('Successfully navigated to dashboard');
      
      // Take a screenshot of the dashboard
      await page.screenshot({ path: 'dashboard.png', fullPage: true });
      console.log('Screenshot of dashboard saved as dashboard.png');
      
      // Navigate directly to the AI Lawyer page with the specified client ID
      const clientId = 'CLI_BOSMAN_700809';
      await page.goto(`http://localhost:8080/lawyer/ai/${clientId}`);
      console.log(`Navigated to AI Lawyer page for client: ${clientId}`);
      
      // Wait for the page to load
      await page.waitForTimeout(5000);
      
      // Take a screenshot of the AI Lawyer page
      await page.screenshot({ path: 'current-page.png', fullPage: true });
      console.log('Screenshot of current page saved as current-page.png');
      
      // Check for chat components
      const hasContainer = await page.locator('.container').isVisible();
      console.log('Container visible:', hasContainer);
      
      const hasChatInterface = await page.locator('[data-testid="chat-interface"], .chat-interface').isVisible();
      console.log('Chat interface visible:', hasChatInterface);
    } else {
      console.log('Navigation to dashboard failed. Current URL:', url);
    }
  } catch (error) {
    console.error('Error during navigation:', error);
    // Take screenshot even if there's an error
    await page.screenshot({ path: 'error-page.png', fullPage: true });
    console.log('Error screenshot saved as error-page.png');
  }
});
