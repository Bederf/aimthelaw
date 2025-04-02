import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test to find all AI-related features in the application
 */
test('Find all AI-related features', async ({ page }) => {
  // Ensure logs directory exists
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Create a log file
  const logFilePath = path.join(logsDir, 'ai-features.log');
  const log = (message: string) => {
    console.log(message);
    fs.appendFileSync(logFilePath, message + '\n');
  };
  
  log(`Starting AI feature search at ${new Date().toISOString()}`);
  log('---------------------------------------------');
  
  // Login
  await page.goto('http://localhost:8080/login');
  log('Navigated to login page');
  
  await page.fill('input[type="email"], input[placeholder*="email" i]', 'mike@law.com');
  await page.fill('input[type="password"], input[placeholder*="password" i]', 'LAW_SNOW_801010');
  await page.click('button[type="submit"], button:has-text("Sign In")');
  
  // Wait for login to complete
  await page.waitForTimeout(5000);
  log(`Logged in, current URL: ${page.url()}`);
  await page.screenshot({ path: path.join(logsDir, 'dashboard.png'), fullPage: true });
  
  // Check the dashboard for AI features
  log('\n--- Checking dashboard for AI features ---');
  
  // Find all AI-related elements on the page
  const aiRelated = await page.evaluate(() => {
    const aiElements = [];
    
    // Find elements that contain 'ai', 'assistant', 'lawyer' in text or attributes
    const allElements = document.querySelectorAll('*');
    for (const element of allElements) {
      const text = element.textContent?.toLowerCase() || '';
      const id = element.id?.toLowerCase() || '';
      const className = (element.className && typeof element.className === 'string') ? element.className.toLowerCase() : '';
      const href = element instanceof HTMLAnchorElement ? element.href.toLowerCase() : '';
      
      if (
        text.includes('ai') || 
        text.includes('assistant') || 
        text.includes('chat') ||
        id.includes('ai') || 
        className.includes('ai') || 
        href.includes('/ai/') ||
        href.includes('/assistant')
      ) {
        const tagName = element.tagName.toLowerCase();
        aiElements.push({
          tagName,
          text: element.textContent?.trim().substring(0, 50) || '',
          id: element.id || '',
          className: typeof element.className === 'string' ? element.className : '',
          href: element instanceof HTMLAnchorElement ? element.href : '',
          isVisible: element.offsetParent !== null
        });
      }
    }
    
    return aiElements;
  });
  
  if (aiRelated.length > 0) {
    log(`Found ${aiRelated.length} AI-related elements on dashboard:`);
    aiRelated.forEach((el, i) => {
      log(`${i+1}. ${el.tagName} - "${el.text}" | href: ${el.href} | visible: ${el.isVisible}`);
    });
    
    // Save AI elements to file
    fs.writeFileSync(
      path.join(logsDir, 'dashboard-ai-elements.json'),
      JSON.stringify(aiRelated, null, 2)
    );
  } else {
    log('No AI-related elements found on dashboard');
  }
  
  // Check the menu/navigation elements
  log('\n--- Checking navigation/menu for AI features ---');
  const navElements = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('nav a, button, .nav-item, .sidebar a, header a'))
      .map(el => ({
        tagName: el.tagName.toLowerCase(),
        text: el.textContent?.trim() || '',
        href: el instanceof HTMLAnchorElement ? el.href : '',
        onClick: el.hasAttribute('onClick') || el.hasAttribute('onclick'),
        isVisible: el.offsetParent !== null
      }))
      .filter(el => el.isVisible);
  });
  
  log(`Found ${navElements.length} navigation elements:`);
  navElements.forEach((el, i) => {
    log(`${i+1}. ${el.tagName} - "${el.text}" | href: ${el.href}`);
  });
  
  // Navigate to specific pages and check for AI features
  const pagesToCheck = [
    { name: 'Clients Page', url: 'http://localhost:8080/lawyer/clients' },
    { name: 'Client Profile', url: 'http://localhost:8080/lawyer/client/CLI_SMITH_821010' },
    { name: 'Documents', url: 'http://localhost:8080/lawyer/documents' },
    { name: 'Dashboard', url: 'http://localhost:8080/lawyer/dashboard' },
    { name: 'AI Test', url: 'http://localhost:8080/lawyer/ai' },
    { name: 'Assistant', url: 'http://localhost:8080/lawyer/assistant' }
  ];
  
  for (const pageInfo of pagesToCheck) {
    log(`\n--- Checking ${pageInfo.name} ---`);
    try {
      await page.goto(pageInfo.url);
      log(`Navigated to ${pageInfo.url}`);
      await page.waitForTimeout(3000);
      
      // Take screenshot
      await page.screenshot({ 
        path: path.join(logsDir, `page-${pageInfo.name.toLowerCase().replace(/\s+/g, '-')}.png`), 
        fullPage: true 
      });
      
      // Look for AI-related buttons or links
      const aiButtons = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button, a'))
          .filter(el => {
            const text = el.textContent?.toLowerCase() || '';
            return text.includes('ai') || text.includes('assistant') || text.includes('chat');
          })
          .map(el => ({
            tagName: el.tagName.toLowerCase(),
            text: el.textContent?.trim() || '',
            href: el instanceof HTMLAnchorElement ? el.href : '',
            isVisible: el.offsetParent !== null
          }));
      });
      
      if (aiButtons.length > 0) {
        log(`Found ${aiButtons.length} AI-related buttons/links on ${pageInfo.name}:`);
        aiButtons.forEach((btn, i) => {
          log(`${i+1}. ${btn.tagName} - "${btn.text}" | href: ${btn.href} | visible: ${btn.isVisible}`);
        });
        
        // Try to click the first visible AI button/link
        const visibleButtons = aiButtons.filter(btn => btn.isVisible);
        if (visibleButtons.length > 0) {
          const buttonText = visibleButtons[0].text;
          log(`Clicking on "${buttonText}" button`);
          
          try {
            // Try to click by text
            await page.click(`button:has-text("${buttonText}"), a:has-text("${buttonText}")`);
            await page.waitForTimeout(5000);
            
            // Take screenshot after clicking
            await page.screenshot({ 
              path: path.join(logsDir, `after-clicking-${buttonText.toLowerCase().replace(/\s+/g, '-')}.png`), 
              fullPage: true 
            });
            
            log(`Current URL after clicking: ${page.url()}`);
            
            // Check if this page has chat components
            const hasChatComponents = await page.evaluate(() => {
              return {
                hasChatInterface: !!document.querySelector('.chat-interface, [data-testid="chat-interface"]'),
                hasMessageInput: !!document.querySelector('textarea.message-input, [data-testid="message-input"]'),
                hasModelSelector: !!document.querySelector('.model-selector, [data-testid="model-selector"]')
              };
            });
            
            if (hasChatComponents.hasChatInterface || hasChatComponents.hasMessageInput) {
              log(`✅ Found AI chat interface after clicking "${buttonText}"`);
              log(`  - Chat interface: ${hasChatComponents.hasChatInterface ? 'Found' : 'Not found'}`);
              log(`  - Message input: ${hasChatComponents.hasMessageInput ? 'Found' : 'Not found'}`);
              log(`  - Model selector: ${hasChatComponents.hasModelSelector ? 'Found' : 'Not found'}`);
              
              // Extract the URL pattern for future use
              const urlPattern = page.url().replace(/[0-9a-f-]{36}/g, '{UUID}');
              log(`URL pattern for AI feature: ${urlPattern}`);
            } else {
              log(`❌ No chat interface found after clicking "${buttonText}"`);
            }
          } catch (error) {
            log(`Error clicking button: ${error.message}`);
          }
        }
      } else {
        log(`No AI-related buttons/links found on ${pageInfo.name}`);
      }
    } catch (error) {
      log(`Error accessing ${pageInfo.url}: ${error.message}`);
    }
  }
  
  // Try direct URL patterns that might work
  log('\n--- Trying direct URL patterns ---');
  const urlPatterns = [
    'http://localhost:8080/lawyer/ai',
    'http://localhost:8080/lawyer/assistant',
    'http://localhost:8080/lawyer/chat',
    'http://localhost:8080/lawyer/ai-lawyer',
    'http://localhost:8080/lawyer/ai-assistant',
    'http://localhost:8080/ai/lawyer'
  ];
  
  for (const url of urlPatterns) {
    try {
      log(`Trying URL: ${url}`);
      await page.goto(url);
      await page.waitForTimeout(3000);
      
      // Take screenshot
      const urlName = url.split('/').pop() || 'base';
      await page.screenshot({ 
        path: path.join(logsDir, `direct-url-${urlName}.png`), 
        fullPage: true 
      });
      
      // Check if this page has chat components
      const hasChatComponents = await page.evaluate(() => {
        return {
          title: document.title,
          h1Text: Array.from(document.querySelectorAll('h1')).map(h => h.textContent?.trim()).join(', '),
          hasChatInterface: !!document.querySelector('.chat-interface, [data-testid="chat-interface"]'),
          hasMessageInput: !!document.querySelector('textarea.message-input, [data-testid="message-input"]'),
          hasModelSelector: !!document.querySelector('.model-selector, [data-testid="model-selector"]')
        };
      });
      
      if (hasChatComponents.hasChatInterface || hasChatComponents.hasMessageInput) {
        log(`✅ Found AI chat interface at URL: ${url}`);
        log(`  - Title: ${hasChatComponents.title}`);
        log(`  - H1: ${hasChatComponents.h1Text}`);
        log(`  - Chat interface: ${hasChatComponents.hasChatInterface ? 'Found' : 'Not found'}`);
        log(`  - Message input: ${hasChatComponents.hasMessageInput ? 'Found' : 'Not found'}`);
        log(`  - Model selector: ${hasChatComponents.hasModelSelector ? 'Found' : 'Not found'}`);
      } else {
        log(`❌ No chat interface found at URL: ${url}`);
        log(`  - Title: ${hasChatComponents.title}`);
        log(`  - H1: ${hasChatComponents.h1Text}`);
      }
    } catch (error) {
      log(`Error accessing ${url}: ${error.message}`);
    }
  }
  
  log('\nAI feature search completed');
}); 