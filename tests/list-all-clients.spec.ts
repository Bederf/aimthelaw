import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test to list all clients and test their AI Lawyer access
 */
test('List all clients and test AI Lawyer access', async ({ page }) => {
  // Ensure logs directory exists
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Create a log file
  const logFilePath = path.join(logsDir, 'all-clients-test.log');
  const log = (message: string) => {
    console.log(message);
    fs.appendFileSync(logFilePath, message + '\n');
  };
  
  log(`Starting client test at ${new Date().toISOString()}`);
  log('---------------------------------------------');
  
  // Login first
  await page.goto('http://localhost:8080/login');
  log('Navigated to login page');
  
  await page.fill('input[type="email"], input[placeholder*="email" i]', 'mike@law.com');
  await page.fill('input[type="password"], input[placeholder*="password" i]', 'LAW_SNOW_801010');
  await page.click('button[type="submit"], button:has-text("Sign In")');
  
  // Wait for login to complete
  await page.waitForTimeout(5000);
  log(`Logged in, current URL: ${page.url()}`);
  await page.screenshot({ path: path.join(logsDir, 'dashboard.png'), fullPage: true });
  
  // Navigate to clients page
  await page.goto('http://localhost:8080/lawyer/clients');
  log('Navigated to clients page');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(logsDir, 'clients-page.png'), fullPage: true });
  
  // Extract all client IDs and names from the table
  const clients = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table tr'));
    
    // Skip header row
    const dataRows = rows.slice(1);
    
    return dataRows.map(row => {
      const cells = Array.from(row.querySelectorAll('td'));
      if (cells.length < 5) return null;
      
      return {
        clientId: cells[0]?.textContent?.trim() || '',
        name: cells[1]?.textContent?.trim() || '',
        surname: cells[2]?.textContent?.trim() || '',
        email: cells[3]?.textContent?.trim() || '',
      };
    }).filter(item => item !== null && item.clientId !== 'N/A' && item.clientId !== '');
  });
  
  if (clients.length === 0) {
    log('No clients found on the page');
    return;
  }
  
  log(`Found ${clients.length} clients:`);
  clients.forEach((client, index) => {
    log(`${index + 1}. Client ID: ${client.clientId}, Name: ${client.name} ${client.surname}`);
  });
  
  // Save client info to a separate file for reference
  fs.writeFileSync(
    path.join(logsDir, 'all-clients.json'),
    JSON.stringify(clients, null, 2)
  );
  
  // Test direct AI Lawyer access for each client
  log('\nTesting direct AI Lawyer access for each client:');
  
  for (const client of clients) {
    log(`\nTesting client: ${client.name} ${client.surname} (${client.clientId})`);
    
    // Try to access AI Lawyer page directly
    await page.goto(`http://localhost:8080/lawyer/ai/${client.clientId}`);
    log(`Navigated to: http://localhost:8080/lawyer/ai/${client.clientId}`);
    await page.waitForTimeout(5000);
    
    // Take screenshot
    const screenshotPath = path.join(logsDir, `ai-lawyer-${client.clientId}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    
    // Check for AI Lawyer components and errors
    const pageInfo = await page.evaluate(() => {
      // Check for errors
      const errorMessages = [];
      const h2Error = Array.from(document.querySelectorAll('h2'))
        .find(h2 => (h2.textContent || '').toLowerCase().includes('error'));
      if (h2Error) errorMessages.push(h2Error.textContent);
      
      const errorElement = document.querySelector('.error-message, [role="alert"]');
      if (errorElement) errorMessages.push(errorElement.textContent);
      
      // Check for AI components
      return {
        url: window.location.href,
        title: document.title,
        hasError: errorMessages.length > 0,
        errorMessages: errorMessages,
        hasContainer: !!document.querySelector('.container'),
        hasChatInterface: !!document.querySelector('.chat-interface, [data-testid="chat-interface"]'),
        hasMessageInput: !!document.querySelector('textarea.message-input, [data-testid="message-input"]'),
        hasModelSelector: !!document.querySelector('.model-selector, [data-testid="model-selector"]')
      };
    });
    
    // Log the results
    if (pageInfo.hasError) {
      log(`❌ Client ${client.clientId} shows error: ${JSON.stringify(pageInfo.errorMessages)}`);
    } else if (pageInfo.hasChatInterface && pageInfo.hasMessageInput) {
      log(`✅ Client ${client.clientId} has AI Lawyer access`);
      log(`  - Chat interface: ${pageInfo.hasChatInterface ? 'Found' : 'Not found'}`);
      log(`  - Message input: ${pageInfo.hasMessageInput ? 'Found' : 'Not found'}`);
      log(`  - Model selector: ${pageInfo.hasModelSelector ? 'Found' : 'Not found'}`);
    } else {
      log(`❌ Client ${client.clientId} doesn't have AI Lawyer components`);
      log(`  - Container: ${pageInfo.hasContainer ? 'Found' : 'Not found'}`);
      log(`  - Chat interface: ${pageInfo.hasChatInterface ? 'Found' : 'Not found'}`);
      log(`  - Message input: ${pageInfo.hasMessageInput ? 'Found' : 'Not found'}`);
    }
  }
  
  log('\nAll client tests completed');
}); 