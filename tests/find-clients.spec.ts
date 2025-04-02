import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test to find valid client IDs
 */
test('Find valid client IDs', async ({ page }) => {
  // Ensure logs directory exists
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Navigate to the login page
  await page.goto('http://localhost:8080/login');
  
  // Fill login credentials
  await page.fill('input[type="email"], input[placeholder*="email" i]', 'mike@law.com');
  await page.fill('input[type="password"], input[placeholder*="password" i]', 'LAW_SNOW_801010');
  
  // Click login button
  await page.click('button[type="submit"], button:has-text("Sign In")');
  
  // Wait for login to complete
  await page.waitForTimeout(5000);
  console.log('Logged in successfully, current URL:', page.url());
  
  // Navigate to the clients page
  await page.goto('http://localhost:8080/lawyer/clients');
  console.log('Navigated to clients page');
  
  // Wait for the page to load
  await page.waitForTimeout(5000);
  
  // Take screenshot of the clients page
  await page.screenshot({ path: path.join(logsDir, 'clients-page.png'), fullPage: true });
  
  // Extract client information from the page
  const clientInfo = await page.evaluate(() => {
    const clients = [];
    
    // Look for client links in various formats
    const clientElements = document.querySelectorAll('a[href*="/lawyer/client/"], tr a, .client-item a, [data-client-id]');
    
    for (const element of clientElements) {
      const href = element.getAttribute('href') || '';
      const text = element.textContent?.trim() || '';
      const dataClientId = element.getAttribute('data-client-id') || '';
      
      let clientId = '';
      
      // Try to extract client ID from href
      if (href) {
        const match = href.match(/\/lawyer\/client\/([^\/]+)/);
        if (match && match[1]) {
          clientId = match[1];
        }
      }
      
      // If no client ID from href, use data attribute
      if (!clientId && dataClientId) {
        clientId = dataClientId;
      }
      
      if (clientId) {
        clients.push({
          id: clientId,
          name: text,
          href: href
        });
      }
    }
    
    // Look for client IDs in any other format
    const allElements = document.querySelectorAll('*');
    for (const element of allElements) {
      const id = element.id || '';
      const text = element.textContent?.trim() || '';
      
      if (id.match(/^client-/i) || id.match(/cli_/i)) {
        // Found potential client ID
        clients.push({
          id: id.replace(/^client-/i, ''),
          name: text,
          source: 'element-id'
        });
      }
      
      // Check for client ID pattern in text content
      if (text.match(/CLI_[A-Z0-9]+_\d+/)) {
        const match = text.match(/(CLI_[A-Z0-9]+_\d+)/);
        if (match && match[1]) {
          clients.push({
            id: match[1],
            context: text.substring(0, 50),
            source: 'text-content'
          });
        }
      }
    }
    
    return clients;
  });
  
  // Print and save client information
  console.log('\nFound clients:');
  if (clientInfo.length > 0) {
    clientInfo.forEach((client, index) => {
      console.log(`${index + 1}. ID: ${client.id}, Name: ${client.name || 'N/A'}`);
    });
    
    // Save client info to file
    fs.writeFileSync(
      path.join(logsDir, 'client-ids.json'), 
      JSON.stringify(clientInfo, null, 2)
    );
  } else {
    console.log('No clients found on the page');
    
    // Extract and log the page structure to see what's there
    console.log('\nPage structure:');
    const pageStructure = await page.evaluate(() => {
      const result = [];
      
      function traverse(element, depth = 0) {
        if (!element) return;
        
        const indent = ' '.repeat(depth * 2);
        const tag = element.tagName.toLowerCase();
        const id = element.id ? `#${element.id}` : '';
        const classes = element.className && typeof element.className === 'string' 
          ? `.${element.className.split(' ').join('.')}` 
          : '';
        const text = element.textContent?.trim().substring(0, 30) || '';
        
        result.push(`${indent}${tag}${id}${classes}${text ? ` "${text}${text.length > 30 ? '...' : ''}"` : ''}`);
        
        for (const child of element.children) {
          traverse(child, depth + 1);
        }
      }
      
      traverse(document.body);
      return result;
    });
    
    // Print first 50 lines of structure
    pageStructure.slice(0, 50).forEach(line => console.log(line));
    
    // Save full structure to file
    fs.writeFileSync(
      path.join(logsDir, 'page-structure.txt'), 
      pageStructure.join('\n')
    );
  }
  
  // Try to find a specific way to get to clients
  const navigationLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a, button'))
      .filter(el => {
        const text = el.textContent?.toLowerCase() || '';
        return text.includes('client') || text.includes('matter') || 
               text.includes('case') || text.includes('dashboard');
      })
      .map(el => ({
        text: el.textContent?.trim() || '',
        href: el.getAttribute('href') || '',
        classes: el.className
      }));
  });
  
  console.log('\nNavigation links:');
  navigationLinks.forEach(link => {
    console.log(`- ${link.text} | href: ${link.href}`);
  });
  
  console.log('\nSearch complete. Check the logs directory for detailed information.');
}); 