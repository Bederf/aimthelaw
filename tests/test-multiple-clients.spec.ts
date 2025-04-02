import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test multiple client IDs with AI Lawyer
 */
test('Test multiple client IDs with AI Lawyer', async ({ page }) => {
  // Ensure logs directory exists
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Log file path
  const logFilePath = path.join(logsDir, 'client-test-results.log');
  
  // Client IDs to test
  const clientIds = [
    'CLI_SMITH_821010',
    'CLI_THOMSON_771213',
    'CLI_BOSMAN_700809'
  ];
  
  // Helper function to log results
  const log = (message: string) => {
    console.log(message);
    fs.appendFileSync(logFilePath, message + '\n');
  };
  
  log(`Starting client ID tests at ${new Date().toISOString()}`);
  log('---------------------------------------------');
  
  // Login first
  await page.goto('http://localhost:8080/login');
  await page.fill('input[type="email"], input[placeholder*="email" i]', 'mike@law.com');
  await page.fill('input[type="password"], input[placeholder*="password" i]', 'LAW_SNOW_801010');
  await page.click('button[type="submit"], button:has-text("Sign In")');
  await page.waitForTimeout(5000);
  
  log(`Logged in, dashboard URL: ${page.url()}`);
  
  // Test each client ID
  for (const clientId of clientIds) {
    log(`\nTesting client ID: ${clientId}`);
    
    // Navigate to AI Lawyer page for this client
    await page.goto(`http://localhost:8080/lawyer/ai/${clientId}`);
    log(`Navigated to AI Lawyer URL for client ${clientId}`);
    
    // Wait for the page to load
    await page.waitForTimeout(5000);
    
    // Take screenshot
    const screenshotPath = path.join(logsDir, `ai-lawyer-${clientId}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    log(`Screenshot saved to ${screenshotPath}`);
    
    // Check for error messages - using separate selectors
    const errorText = await page.evaluate(() => {
      const errorMessages = [
        document.querySelector('h2')?.textContent || '',
        document.querySelector('.error-message')?.textContent || '',
        document.querySelector('[role="alert"]')?.textContent || ''
      ];
      
      return errorMessages.join(' ').trim();
    });
    
    if (errorText.includes('wrong') || errorText.includes('error') || errorText.includes('failed')) {
      log(`❌ Client ${clientId} shows error message: "${errorText}"`);
    } else {
      // Check for the presence of key AI Lawyer components
      const components = await page.evaluate(() => {
        return {
          container: !!document.querySelector('.container'),
          chatInterface: !!document.querySelector('[data-testid="chat-interface"], .chat-interface'),
          messageInput: !!document.querySelector('[data-testid="message-input"], textarea.message-input'),
          modelSelector: !!document.querySelector('[data-testid="model-selector"], .model-selector'),
          fileSection: !!document.querySelector('[data-testid="file-section"], .file-section')
        };
      });
      
      if (components.container && components.chatInterface && components.messageInput) {
        log(`✅ Client ${clientId} works with AI Lawyer!`);
        log(`  - Chat interface: ${components.chatInterface ? 'Found' : 'Not found'}`);
        log(`  - Message input: ${components.messageInput ? 'Found' : 'Not found'}`);
        log(`  - Model selector: ${components.modelSelector ? 'Found' : 'Not found'}`);
        log(`  - File section: ${components.fileSection ? 'Found' : 'Not found'}`);
        
        // Try to see if we can find client documents
        const documentCount = await page.evaluate(() => {
          const fileItems = document.querySelectorAll('[data-testid^="file-item-"], [class*="file-item"]');
          return fileItems.length;
        });
        
        log(`  - Found ${documentCount} documents for this client`);
      } else {
        log(`❌ Client ${clientId} doesn't show AI Lawyer components`);
        log(`  - Container: ${components.container ? 'Found' : 'Not found'}`);
        log(`  - Chat interface: ${components.chatInterface ? 'Found' : 'Not found'}`);
        log(`  - Message input: ${components.messageInput ? 'Found' : 'Not found'}`);
        log(`  - Model selector: ${components.modelSelector ? 'Found' : 'Not found'}`);
        log(`  - File section: ${components.fileSection ? 'Found' : 'Not found'}`);
      }
    }
  }
  
  log('\nCompleted client ID tests');
}); 