import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Debug test for AI Lawyer page
 */
test('Debug AI Lawyer page', async ({ page }) => {
  // Ensure logs directory exists
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Collect console logs
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(text);
    console.log(text);
  });
  
  // Collect page errors
  const pageErrors: string[] = [];
  page.on('pageerror', error => {
    const text = `[ERROR] ${error.message}`;
    pageErrors.push(text);
    console.error(text);
  });
  
  // Login first
  await page.goto('http://localhost:8080/login');
  await page.fill('input[type="email"], input[placeholder*="email" i]', 'mike@law.com');
  await page.fill('input[type="password"], input[placeholder*="password" i]', 'LAW_SNOW_801010');
  await page.click('button[type="submit"], button:has-text("Sign In")');
  
  // Wait for login to complete
  await page.waitForTimeout(5000);
  console.log('Logged in, dashboard URL:', page.url());
  
  // Navigate directly to the AI Lawyer page with the client ID we found
  const clientId = 'f4b37694-45b2-41f2-9f8e-328b266f93a9';
  await page.goto(`http://localhost:8080/lawyer/ai/${clientId}`);
  console.log(`Navigated to AI Lawyer page for client: ${clientId}`);
  
  // Wait for the page to load
  await page.waitForTimeout(5000);
  await page.screenshot({ path: path.join(logsDir, 'debug-ai-lawyer-page.png'), fullPage: true });
  
  // Capture network requests
  const requestUrls: string[] = [];
  page.on('request', request => {
    const url = request.url();
    if (url.includes('/api/') || url.includes('/lawyer/ai/')) {
      requestUrls.push(`${request.method()} ${url}`);
    }
  });
  
  // Capture network responses with errors
  const responseErrors: string[] = [];
  page.on('response', async response => {
    const url = response.url();
    if ((url.includes('/api/') || url.includes('/lawyer/ai/')) && !response.ok()) {
      try {
        const text = await response.text();
        responseErrors.push(`[${response.status()}] ${url}: ${text.substring(0, 100)}`);
      } catch (e) {
        responseErrors.push(`[${response.status()}] ${url}: Failed to get response text`);
      }
    }
  });
  
  // Get the document structure
  const documentStructure = await page.evaluate(() => {
    function getElementDetails(element: Element, depth = 0): any {
      if (!element) return null;
      
      // Basic information
      const tagName = element.tagName.toLowerCase();
      const id = element.id ? `#${element.id}` : '';
      const classes = element.className && typeof element.className === 'string' 
        ? `.${element.className.split(' ').join('.')}` 
        : '';
      const textContent = element.textContent?.trim().substring(0, 50) || '';
      
      // Get children
      const children = Array.from(element.children).map(child => 
        getElementDetails(child, depth + 1)
      );
      
      return {
        selector: `${tagName}${id}${classes}`,
        text: textContent,
        children: children.filter(Boolean)  // Remove null entries
      };
    }
    
    // Start from body
    return getElementDetails(document.body);
  });
  
  // Get the main content div
  const mainContent = await page.evaluate(() => {
    const main = document.querySelector('main');
    if (!main) return 'No main element found';
    return main.innerHTML;
  });
  
  // Check for specific components
  const components = await page.evaluate(() => {
    return {
      url: window.location.href,
      title: document.title,
      hasContainer: !!document.querySelector('.container'),
      hasChatInterface: !!document.querySelector('.chat-interface, [data-testid="chat-interface"]'),
      hasMessageInput: !!document.querySelector('textarea.message-input, [data-testid="message-input"]'),
      hasModelSelector: !!document.querySelector('.model-selector, [data-testid="model-selector"]'),
      hasNewChatButton: !!document.querySelector('button:has-text("New Chat")'),
      hasFileSection: !!document.querySelector('.file-section, [data-testid="file-section"]'),
      mainElementCount: document.querySelectorAll('main').length,
      bodyClassList: document.body.className,
      bodyChildren: Array.from(document.body.children).map(child => child.tagName + (child.id ? `#${child.id}` : '')),
      reactRoot: !!document.getElementById('root')
    };
  });
  
  console.log('Page components:', components);
  
  // Check for any error messages on the page
  const errorMessages = await page.evaluate(() => {
    // Check various error elements
    const h2Elements = Array.from(document.querySelectorAll('h2'));
    const errorH2 = h2Elements.find(el => 
      (el.textContent || '').toLowerCase().includes('error') || 
      (el.textContent || '').toLowerCase().includes('wrong')
    );
    
    const errorElements = Array.from(document.querySelectorAll('.error-message, [role="alert"], .error, .alert-error'));
    
    return {
      h2Error: errorH2 ? errorH2.textContent : null,
      otherErrors: errorElements.map(el => el.textContent?.trim())
    };
  });
  
  console.log('Error messages on page:', errorMessages);
  
  // Save all debug info to files
  fs.writeFileSync(
    path.join(logsDir, 'debug-console-logs.txt'), 
    consoleLogs.join('\n')
  );
  
  fs.writeFileSync(
    path.join(logsDir, 'debug-page-errors.txt'), 
    pageErrors.join('\n')
  );
  
  fs.writeFileSync(
    path.join(logsDir, 'debug-request-urls.txt'), 
    requestUrls.join('\n')
  );
  
  fs.writeFileSync(
    path.join(logsDir, 'debug-response-errors.txt'), 
    responseErrors.join('\n')
  );
  
  fs.writeFileSync(
    path.join(logsDir, 'debug-document-structure.json'), 
    JSON.stringify(documentStructure, null, 2)
  );
  
  fs.writeFileSync(
    path.join(logsDir, 'debug-main-content.html'), 
    mainContent
  );
  
  // Try using the client ID we found in our tests with other client IDs
  console.log('\nTrying to use client ID from the clients page...');
  
  // Navigate to clients page
  await page.goto('http://localhost:8080/lawyer/clients');
  console.log('Navigated to clients page');
  await page.waitForTimeout(3000);
  
  // Get client IDs from the table
  const clientIds = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table tr'));
    
    // Skip header row
    const dataRows = rows.slice(1);
    
    return dataRows.map(row => {
      const cell = row.querySelector('td');
      return cell ? cell.textContent?.trim() : null;
    }).filter(Boolean);  // Remove null/empty values
  });
  
  console.log('Found client IDs:', clientIds);
  
  // Try the first client ID
  if (clientIds.length > 0) {
    const firstClientId = clientIds[0];
    console.log(`Trying client ID: ${firstClientId}`);
    
    await page.goto(`http://localhost:8080/lawyer/ai/${firstClientId}`);
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(logsDir, `debug-ai-lawyer-${firstClientId}.png`), fullPage: true });
    
    // Check components
    const components2 = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        hasContainer: !!document.querySelector('.container'),
        hasChatInterface: !!document.querySelector('.chat-interface, [data-testid="chat-interface"]'),
        hasMessageInput: !!document.querySelector('textarea.message-input, [data-testid="message-input"]')
      };
    });
    
    console.log(`Components for client ID ${firstClientId}:`, components2);
  }
  
  console.log('Debug test completed');
}); 