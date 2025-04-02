import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test natural navigation flow to AI Lawyer
 */
test('Natural navigation flow to AI Lawyer', async ({ page }) => {
  // Ensure logs directory exists
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Login first
  await page.goto('http://localhost:8080/login');
  console.log('On login page');
  await page.screenshot({ path: path.join(logsDir, '01-login-page.png'), fullPage: true });
  
  await page.fill('input[type="email"], input[placeholder*="email" i]', 'mike@law.com');
  await page.fill('input[type="password"], input[placeholder*="password" i]', 'LAW_SNOW_801010');
  await page.click('button[type="submit"], button:has-text("Sign In")');
  
  // Wait for login to complete
  await page.waitForTimeout(5000);
  console.log('Logged in, dashboard URL:', page.url());
  await page.screenshot({ path: path.join(logsDir, '02-dashboard.png'), fullPage: true });
  
  // Navigate to clients page
  await page.goto('http://localhost:8080/lawyer/clients');
  console.log('Navigated to clients page');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(logsDir, '03-clients-page.png'), fullPage: true });
  
  // Extract client information from the page
  const clientInfo = await page.evaluate(() => {
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
        viewButton: !!row.querySelector('button[title="View Details"]')
      };
    }).filter(item => item !== null && item.clientId !== 'N/A' && item.clientId !== '');
  });
  
  console.log('Found clients:');
  if (clientInfo.length > 0) {
    clientInfo.forEach((client, index) => {
      console.log(`${index + 1}. Client ID: ${client.clientId}, Name: ${client.name} ${client.surname}`);
    });
    
    // Find a client view button and click it
    console.log('Clicking on first client view button');
    await page.click('button[title="View Details"]');
    await page.waitForTimeout(3000);
    
    // Take screenshot of client page
    console.log('On client details page');
    await page.screenshot({ path: path.join(logsDir, '04-client-details.png'), fullPage: true });
    
    // Look for AI Lawyer button or link
    const aiLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a, button'))
        .filter(el => {
          const text = el.textContent?.toLowerCase() || '';
          return text.includes('ai') && text.includes('lawyer');
        })
        .map(el => ({
          text: el.textContent?.trim() || '',
          href: el.getAttribute('href') || '',
          isButton: el.tagName.toLowerCase() === 'button'
        }));
    });
    
    console.log('AI Lawyer links/buttons on client page:');
    aiLinks.forEach(link => {
      console.log(`- ${link.text} | href: ${link.href} | isButton: ${link.isButton}`);
    });
    
    // Try to navigate to AI Lawyer page
    if (aiLinks.length > 0) {
      // If it's a direct link, navigate to it
      if (aiLinks[0].href) {
        const url = aiLinks[0].href.startsWith('http') 
          ? aiLinks[0].href 
          : `http://localhost:8080${aiLinks[0].href}`;
        
        console.log(`Navigating to AI Lawyer URL: ${url}`);
        await page.goto(url);
      } else {
        // Otherwise click the button
        console.log('Clicking AI Lawyer button');
        await page.click(`button:has-text("${aiLinks[0].text}")`);
      }
      
      // Wait for AI Lawyer page to load
      await page.waitForTimeout(5000);
      await page.screenshot({ path: path.join(logsDir, '05-ai-lawyer-page.png'), fullPage: true });
      
      // Check for page components - FIXED SELECTOR
      const components = await page.evaluate(() => {
        // Check for errors first
        const h2Elements = Array.from(document.querySelectorAll('h2'));
        const hasError = h2Elements.some(el => 
          (el.textContent || '').toLowerCase().includes('wrong') || 
          (el.textContent || '').toLowerCase().includes('error')
        );
        
        // Get error text from various possible elements
        let errorText = '';
        const h2Error = h2Elements.find(el => 
          (el.textContent || '').toLowerCase().includes('wrong') || 
          (el.textContent || '').toLowerCase().includes('error')
        );
        if (h2Error) errorText = h2Error.textContent || '';
        
        const errorElement = document.querySelector('.error-message');
        if (errorElement && !errorText) errorText = errorElement.textContent || '';
        
        const alertElement = document.querySelector('[role="alert"]');
        if (alertElement && !errorText) errorText = alertElement.textContent || '';
        
        return {
          url: window.location.href,
          title: document.title,
          hasContainer: !!document.querySelector('.container'),
          hasChatInterface: !!document.querySelector('.chat-interface, [data-testid="chat-interface"]'),
          hasMessageInput: !!document.querySelector('textarea.message-input, [data-testid="message-input"]'),
          hasError: hasError,
          errorText: errorText
        };
      });
      
      console.log('AI Lawyer page components:', components);
    } else {
      console.log('No AI Lawyer links found on client page');
      
      // Try clicking the "AI Assistant" button
      try {
        console.log('Trying to click "AI Assistant" button');
        
        await page.click('button:has-text("AI Assistant")');
        await page.waitForTimeout(5000);
        
        // Take screenshot of the page after clicking
        await page.screenshot({ path: path.join(logsDir, '05-ai-assistant-page.png'), fullPage: true });
        
        // Get current URL and page components - FIXED SELECTOR
        const aiAssistantInfo = await page.evaluate(() => {
          // Check for errors first
          const h2Elements = Array.from(document.querySelectorAll('h2'));
          const hasError = h2Elements.some(el => 
            (el.textContent || '').toLowerCase().includes('wrong') || 
            (el.textContent || '').toLowerCase().includes('error')
          );
          
          // Get error text from various possible elements
          let errorText = '';
          const h2Error = h2Elements.find(el => 
            (el.textContent || '').toLowerCase().includes('wrong') || 
            (el.textContent || '').toLowerCase().includes('error')
          );
          if (h2Error) errorText = h2Error.textContent || '';
          
          const errorElement = document.querySelector('.error-message');
          if (errorElement && !errorText) errorText = errorElement.textContent || '';
          
          const alertElement = document.querySelector('[role="alert"]');
          if (alertElement && !errorText) errorText = alertElement.textContent || '';
          
          return {
            url: window.location.href,
            title: document.title,
            hasContainer: !!document.querySelector('.container'),
            hasChatInterface: !!document.querySelector('.chat-interface, [data-testid="chat-interface"]'),
            hasMessageInput: !!document.querySelector('textarea.message-input, [data-testid="message-input"]'),
            hasError: hasError,
            errorText: errorText
          };
        });
        
        console.log('After clicking AI Assistant button:', aiAssistantInfo);
        
        // If this looks like an error page, try "Analyze with AI" button
        if (aiAssistantInfo.hasError || !aiAssistantInfo.hasChatInterface) {
          console.log('AI Assistant page shows error or no chat interface, trying "Analyze with AI" button');
          
          // Go back to client page
          await page.goBack();
          await page.waitForTimeout(3000);
          
          // Click "Analyze with AI" button
          await page.click('button:has-text("Analyze with AI")');
          await page.waitForTimeout(5000);
          
          // Take screenshot of Analyze with AI page
          await page.screenshot({ path: path.join(logsDir, '06-analyze-with-ai-page.png'), fullPage: true });
          
          // Get current URL and page components - FIXED SELECTOR
          const analyzeWithAIInfo = await page.evaluate(() => {
            // Check for errors first
            const h2Elements = Array.from(document.querySelectorAll('h2'));
            const hasError = h2Elements.some(el => 
              (el.textContent || '').toLowerCase().includes('wrong') || 
              (el.textContent || '').toLowerCase().includes('error')
            );
            
            // Get error text from various possible elements
            let errorText = '';
            const h2Error = h2Elements.find(el => 
              (el.textContent || '').toLowerCase().includes('wrong') || 
              (el.textContent || '').toLowerCase().includes('error')
            );
            if (h2Error) errorText = h2Error.textContent || '';
            
            const errorElement = document.querySelector('.error-message');
            if (errorElement && !errorText) errorText = errorElement.textContent || '';
            
            const alertElement = document.querySelector('[role="alert"]');
            if (alertElement && !errorText) errorText = alertElement.textContent || '';
            
            return {
              url: window.location.href,
              title: document.title,
              hasContainer: !!document.querySelector('.container'),
              hasChatInterface: !!document.querySelector('.chat-interface, [data-testid="chat-interface"]'),
              hasMessageInput: !!document.querySelector('textarea.message-input, [data-testid="message-input"]'),
              hasError: hasError,
              errorText: errorText
            };
          });
          
          console.log('After clicking Analyze with AI button:', analyzeWithAIInfo);
        }
      } catch (error) {
        console.error('Error clicking AI buttons:', error);
      }
    }
  } else {
    console.log('No clients found on the page');
    
    // Try checking for any content on the page
    const pageContent = await page.evaluate(() => {
      return {
        tableRows: document.querySelectorAll('table tr').length,
        text: document.body.textContent?.trim().substring(0, 500) || ''
      };
    });
    
    console.log('Page content:', pageContent);
  }
}); 