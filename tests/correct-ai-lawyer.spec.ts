import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test for accessing the AI Lawyer page with the correct client UUID format
 * Based on logs showing the proper format and path
 */
test('Access AI Lawyer with correct client UUID', async ({ page }) => {
  // Ensure logs directory exists
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Create a log file
  const logFilePath = path.join(logsDir, 'correct-ai-lawyer.log');
  const log = (message: string) => {
    console.log(message);
    fs.appendFileSync(logFilePath, message + '\n');
  };
  
  log(`Starting correct AI Lawyer test at ${new Date().toISOString()}`);
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
    return;
  }
  
  // Get client IDs
  log('Fetching client information...');
  
  // Navigate to clients page to find real client IDs
  await page.goto('http://localhost:8080/lawyer/clients');
  log('Navigated to clients page');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(logsDir, 'clients-page.png'), fullPage: true });
  
  // Look for client UUIDs in the page
  const clientUuids = await page.evaluate(() => {
    // Try to find UUIDs in link hrefs
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const links = Array.from(document.querySelectorAll('a'));
    const uuids = new Set();
    
    // Look in href attributes
    links.forEach(link => {
      if (link.href) {
        const match = link.href.match(uuidPattern);
        if (match) {
          uuids.add(match[0]);
        }
      }
    });
    
    // Also try to find client UUIDs in buttons or data attributes
    const elements = Array.from(document.querySelectorAll('[data-id], [id], button'));
    elements.forEach(el => {
      const attrs = ['data-id', 'data-client-id', 'id', 'value'];
      attrs.forEach(attr => {
        const value = el.getAttribute(attr);
        if (value && uuidPattern.test(value)) {
          uuids.add(value.match(uuidPattern)[0]);
        }
      });
      
      // Also try onclick attributes that might contain UUIDs
      const onclick = el.getAttribute('onclick');
      if (onclick && uuidPattern.test(onclick)) {
        uuids.add(onclick.match(uuidPattern)[0]);
      }
    });
    
    return Array.from(uuids);
  });
  
  // Test with known working client UUID if no UUIDs found
  let testClientId = 'a6cf1906-1e0b-40b8-8def-14643f54232f'; // Known working ID from logs
  
  if (clientUuids.length > 0) {
    log(`Found ${clientUuids.length} client UUIDs on the page:`);
    clientUuids.forEach((uuid, i) => {
      log(`${i + 1}. ${uuid}`);
    });
    testClientId = clientUuids[0]; // Use the first found UUID
  } else {
    log('No client UUIDs found, using the known working UUID from logs');
  }
  
  // Navigate directly to the AI Lawyer page with the client UUID
  const aiLawyerUrl = `http://localhost:8080/lawyer/ai/${testClientId}`;
  log(`Navigating to AI Lawyer page with URL: ${aiLawyerUrl}`);
  
  await page.goto(aiLawyerUrl);
  await page.waitForTimeout(5000);
  
  // Take screenshot of the AI Lawyer page
  await page.screenshot({ path: path.join(logsDir, 'ai-lawyer-page.png'), fullPage: true });
  
  // Check for essential UI components
  log('Checking for AI Lawyer UI components...');
  
  const uiComponents = await page.evaluate(() => {
    return {
      // Primary components
      chatInterface: !!document.querySelector('.chat-interface, [data-testid="chat-interface"]'),
      messageInput: !!document.querySelector('textarea.message-input, [data-testid="message-input"]'),
      sendButton: !!document.querySelector('button.send-button, [data-testid="send-button"]'),
      modelSelector: !!document.querySelector('.model-selector, [data-testid="model-selector"]'),
      fileSection: !!document.querySelector('.file-section, [data-testid="file-section"]'),
      
      // Secondary elements
      title: document.title,
      heading: Array.from(document.querySelectorAll('h1, h2')).map(h => h.textContent?.trim()).join(', '),
      fileCount: document.querySelectorAll('[data-testid^="file-item-"], .file-item').length,
      messageCount: document.querySelectorAll('.message, [data-testid^="message-"]').length
    };
  });
  
  // Log the results
  log('AI Lawyer UI components check results:');
  log(`- Chat interface: ${uiComponents.chatInterface ? 'Found ✅' : 'Not found ❌'}`);
  log(`- Message input: ${uiComponents.messageInput ? 'Found ✅' : 'Not found ❌'}`);
  log(`- Send button: ${uiComponents.sendButton ? 'Found ✅' : 'Not found ❌'}`);
  log(`- Model selector: ${uiComponents.modelSelector ? 'Found ✅' : 'Not found ❌'}`);
  log(`- File section: ${uiComponents.fileSection ? 'Found ✅' : 'Not found ❌'}`);
  log(`- Page title: ${uiComponents.title}`);
  log(`- Heading: ${uiComponents.heading}`);
  log(`- File count: ${uiComponents.fileCount}`);
  log(`- Message count: ${uiComponents.messageCount}`);
  
  // Try to interact with the chat if components are found
  if (uiComponents.messageInput && uiComponents.sendButton) {
    log('Chat interface found, attempting to interact with it');
    
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
  }
  
  // Also test quick actions if UI components are present
  if (uiComponents.chatInterface) {
    log('\nChecking for quick action buttons...');
    
    const quickActions = await page.evaluate(() => {
      const actionButtons = Array.from(document.querySelectorAll('button'))
        .filter(button => {
          const text = button.textContent?.toLowerCase() || '';
          return (
            text.includes('extract') || 
            text.includes('summarize') || 
            text.includes('reply') || 
            text.includes('prepare')
          );
        })
        .map(button => button.textContent?.trim() || '');
      
      return actionButtons;
    });
    
    if (quickActions.length > 0) {
      log(`Found ${quickActions.length} quick action buttons:`);
      quickActions.forEach((action, i) => {
        log(`${i + 1}. ${action}`);
      });
      
      // Try clicking the first quick action
      if (quickActions.length > 0) {
        try {
          log(`Attempting to click "${quickActions[0]}" quick action`);
          await page.click(`button:has-text("${quickActions[0]}")`);
          
          // Wait for quick action to process
          await page.waitForTimeout(10000);
          
          // Take screenshot after quick action
          await page.screenshot({ path: path.join(logsDir, 'after-quick-action.png'), fullPage: true });
          
          // Check for AI response to quick action
          const quickActionResponse = await page.evaluate(() => {
            const messages = document.querySelectorAll('.ai-message, [data-testid="ai-message"]');
            return messages.length > 0 ? (messages[messages.length - 1].textContent || '').trim() : '';
          });
          
          if (quickActionResponse) {
            log(`Received response for "${quickActions[0]}" quick action:`);
            log(quickActionResponse.substring(0, 200) + (quickActionResponse.length > 200 ? '...' : ''));
          } else {
            log(`No response detected for "${quickActions[0]}" quick action`);
          }
        } catch (error) {
          log(`Error using quick action: ${error.message}`);
          await page.screenshot({ path: path.join(logsDir, 'quick-action-error.png'), fullPage: true });
        }
      }
    } else {
      log('No quick action buttons found');
    }
  }
  
  log('\nCorrect AI Lawyer test completed');
}); 