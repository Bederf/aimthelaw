import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Debug test to inspect the page structure
 */
test('Inspect page structure for client', async ({ page }) => {
  // Ensure logs directory exists
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Navigate to the login page
  await page.goto('http://localhost:8080/login');
  console.log('On login page');
  
  // Fill login credentials
  await page.fill('input[type="email"], input[placeholder*="email" i]', 'mike@law.com');
  await page.fill('input[type="password"], input[placeholder*="password" i]', 'LAW_SNOW_801010');
  
  // Click login button
  await page.click('button[type="submit"], button:has-text("Sign In")');
  
  // Wait for login to complete
  await page.waitForTimeout(5000);
  console.log('Logged in successfully, current URL:', page.url());
  await page.screenshot({ path: path.join(logsDir, 'dashboard.png'), fullPage: true });
  
  // Navigate directly to the AI Lawyer page for the specific client
  const clientId = 'CLI_BOSMAN_700809';
  await page.goto(`http://localhost:8080/lawyer/ai/${clientId}`);
  console.log(`Navigated to AI Lawyer page for client: ${clientId}`);
  
  // Wait for the page to load
  await page.waitForTimeout(5000);
  
  // Take screenshot of the page
  await page.screenshot({ path: path.join(logsDir, 'ai-lawyer-page.png'), fullPage: true });
  
  // Get the HTML structure of the page
  const htmlContent = await page.content();
  fs.writeFileSync(path.join(logsDir, 'page-html.html'), htmlContent);
  
  // Print basic page information
  console.log('Page title:', await page.title());
  
  // List all major elements on the page
  console.log('\n--- Page Structure ---');
  const elements = await page.evaluate(() => {
    const result = [];
    const selectors = [
      'nav', 'header', 'main', 'aside', 'footer', 
      '.container', '.sidebar', '.chat-interface', 
      '[data-testid]', 'button', 'input', 'textarea', 
      'h1', 'h2', 'h3', '.error-message', '.loading'
    ];
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        result.push(`${selector}: ${elements.length} elements`);
        
        // Get details for first 5 elements of each type
        const details = [];
        for (let i = 0; i < Math.min(5, elements.length); i++) {
          const el = elements[i];
          const text = el.textContent?.trim().substring(0, 50) || '';
          const classes = el.className || '';
          const id = el.id || '';
          const dataTestId = el.getAttribute('data-testid') || '';
          
          details.push(`  - ${i}: ${text}${text ? ' | ' : ''}classes="${classes}" id="${id}" data-testid="${dataTestId}"`);
        }
        
        result.push(...details);
      }
    }
    
    return result;
  });
  
  elements.forEach(element => console.log(element));
  
  // Check console logs
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push(`${msg.type()}: ${msg.text()}`);
  });
  
  // Evaluate some JavaScript to see if there are any errors
  console.log('\n--- Console Errors ---');
  const errors = await page.evaluate(() => {
    return (window as any).errors || [];
  });
  
  if (errors.length > 0) {
    console.log('Errors found:', errors);
  } else {
    console.log('No errors found in window.errors');
  }
  
  // Check if key URLs are loaded
  console.log('\n--- Network Activity ---');
  const apiUrlCheck = await page.evaluate(() => {
    return fetch('/api/health').then(res => res.ok ? 'API is healthy' : 'API health check failed')
      .catch(err => `Error checking API: ${err.message}`);
  });
  
  console.log('API health check:', apiUrlCheck);
  
  // Write all logs to file
  fs.writeFileSync(path.join(logsDir, 'page-inspection.log'), 
    `URL: ${page.url()}\n` +
    `Title: ${await page.title()}\n\n` +
    `Page Structure:\n${elements.join('\n')}\n\n` +
    `Console Logs:\n${consoleLogs.join('\n')}\n`
  );
  
  console.log('\nInspection complete. Check the logs directory for detailed information.');
}); 