import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test various ways to access the AI Lawyer directly
 */
test('Test direct access to AI Lawyer page', async ({ page }) => {
  // Ensure logs directory exists
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Create a log file
  const logFilePath = path.join(logsDir, 'direct-ai-lawyer.log');
  const log = (message: string) => {
    console.log(message);
    fs.appendFileSync(logFilePath, message + '\n');
  };
  
  log(`Starting direct AI Lawyer test at ${new Date().toISOString()}`);
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
  
  // Extract UUID from the dashboard URL
  const dashboardUrl = page.url();
  let userUuid = '';
  const uuidMatch = dashboardUrl.match(/\/dashboard\/([0-9a-f-]+)/);
  if (uuidMatch && uuidMatch[1]) {
    userUuid = uuidMatch[1];
    log(`Extracted user UUID: ${userUuid}`);
  } else {
    log('Could not extract user UUID from dashboard URL');
  }
  
  // Try different URL patterns for AI Lawyer
  const urlPatternsToTry = [
    'http://localhost:8080/lawyer/ai',
    userUuid ? `http://localhost:8080/lawyer/ai/${userUuid}` : null,
    'http://localhost:8080/lawyer/assistant',
    'http://localhost:8080/ai-lawyer',
    'http://localhost:8080/lawyer/ai/CLI_SMITH_821010',
    'http://localhost:8080/lawyer/ai/assistant',
    'http://localhost:8080/lawyer/chat',
    'http://localhost:8080/lawyer/ai-chat',
    'http://localhost:8080/lawyer/dashboard/ai'
  ].filter(Boolean); // Remove null entries
  
  // Helper function to check the page
  const checkPage = async (url: string) => {
    log(`\nTrying URL: ${url}`);
    await page.goto(url);
    await page.waitForTimeout(5000);
    
    // Take screenshot
    const urlName = url.split('/').pop() || 'base';
    await page.screenshot({ 
      path: path.join(logsDir, `direct-${urlName}.png`), 
      fullPage: true 
    });
    
    // Check the page content
    const pageInfo = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        h1: Array.from(document.querySelectorAll('h1')).map(h => h.textContent?.trim()).join(', '),
        h2: Array.from(document.querySelectorAll('h2')).map(h => h.textContent?.trim()).join(', '),
        hasChatInterface: !!document.querySelector('.chat-interface, [data-testid="chat-interface"]'),
        hasMessageInput: !!document.querySelector('textarea.message-input, [data-testid="message-input"]'),
        hasModelSelector: !!document.querySelector('.model-selector, [data-testid="model-selector"]'),
        hasFileSection: !!document.querySelector('.file-section, [data-testid="file-section"]')
      };
    });
    
    log(`URL after navigation: ${pageInfo.url}`);
    log(`Title: ${pageInfo.title}`);
    log(`H1: ${pageInfo.h1}`);
    log(`H2: ${pageInfo.h2}`);
    
    if (pageInfo.hasChatInterface || pageInfo.hasMessageInput) {
      log(`✅ Found AI Lawyer interface at URL: ${url}`);
      log(`  - Chat interface: ${pageInfo.hasChatInterface ? 'Found' : 'Not found'}`);
      log(`  - Message input: ${pageInfo.hasMessageInput ? 'Found' : 'Not found'}`);
      log(`  - Model selector: ${pageInfo.hasModelSelector ? 'Found' : 'Not found'}`);
      log(`  - File section: ${pageInfo.hasFileSection ? 'Found' : 'Not found'}`);
      return true;
    } else {
      log(`❌ No AI Lawyer interface found at URL: ${url}`);
      return false;
    }
  };
  
  // Try all URL patterns
  for (const url of urlPatternsToTry) {
    try {
      const found = await checkPage(url);
      if (found) {
        // Found the AI Lawyer interface, attempt interaction
        log('Attempting to interact with the chat interface');
        
        try {
          // Type a message
          await page.fill('textarea.message-input, [data-testid="message-input"]', 'Hello, I need legal advice.');
          log('Typed a message');
          
          // Take screenshot before sending
          await page.screenshot({ path: path.join(logsDir, 'before-send.png'), fullPage: true });
          
          // Find and click send button
          await page.click('button.send-button, [data-testid="send-button"]');
          log('Clicked send button');
          
          // Wait for response
          await page.waitForTimeout(10000);
          
          // Take screenshot after sending
          await page.screenshot({ path: path.join(logsDir, 'after-send.png'), fullPage: true });
          
          // Check for AI response
          const aiResponse = await page.evaluate(() => {
            const messages = document.querySelectorAll('.ai-message, [data-testid="ai-message"]');
            return messages.length > 0 ? (messages[messages.length - 1].textContent || '').trim() : '';
          });
          
          if (aiResponse) {
            log('Received AI response:');
            log(aiResponse.substring(0, 200) + (aiResponse.length > 200 ? '...' : ''));
          } else {
            log('No AI response detected');
          }
        } catch (error) {
          log(`Error interacting with chat: ${error.message}`);
          await page.screenshot({ path: path.join(logsDir, 'chat-error.png'), fullPage: true });
        }
        
        // No need to check more URLs once we found the right one
        break;
      }
    } catch (error) {
      log(`Error accessing ${url}: ${error.message}`);
    }
  }
  
  // Check if the dashboard has any AI buttons/links
  log('\nChecking dashboard for AI buttons/links');
  await page.goto('http://localhost:8080/lawyer/dashboard');
  await page.waitForTimeout(3000);
  
  const dashboardAiButtons = await page.evaluate(() => {
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
  
  if (dashboardAiButtons.length > 0) {
    log(`Found ${dashboardAiButtons.length} AI-related buttons/links on dashboard:`);
    dashboardAiButtons.forEach((btn, i) => {
      log(`${i+1}. ${btn.tagName} - "${btn.text}" | href: ${btn.href} | visible: ${btn.isVisible}`);
    });
  } else {
    log('No AI-related buttons/links found on dashboard');
  }
  
  log('Direct AI Lawyer test completed');
}); 