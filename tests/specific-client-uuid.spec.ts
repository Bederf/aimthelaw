import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test specifically using the client UUID found in the logs
 */
test('Access AI Lawyer with specific client UUID from logs', async ({ page }) => {
  // Ensure logs directory exists
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Create a log file
  const logFilePath = path.join(logsDir, 'specific-client-uuid.log');
  const log = (message: string) => {
    console.log(message);
    fs.appendFileSync(logFilePath, message + '\n');
  };
  
  log(`Starting specific client UUID test at ${new Date().toISOString()}`);
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
  
  // Use the specific client UUID found in the logs
  const specificClientId = 'a6cf1906-1e0b-40b8-8def-14643f54232f';
  log(`Using specific client UUID from logs: ${specificClientId}`);
  
  // Navigate directly to the AI Lawyer page with the known client UUID
  const aiLawyerUrl = `http://localhost:8080/lawyer/ai/${specificClientId}`;
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
      h1: Array.from(document.querySelectorAll('h1')).map(h => h.textContent?.trim()).join(', '),
      h2: Array.from(document.querySelectorAll('h2')).map(h => h.textContent?.trim()).join(', '),
      fileCount: document.querySelectorAll('[data-testid^="file-item-"], .file-item').length,
      messageCount: document.querySelectorAll('.message, [data-testid^="message-"]').length,
      
      // HTML structure for debugging
      bodyClasses: document.body.className,
      mainContent: document.querySelector('main')?.innerHTML?.substring(0, 500),
      errors: Array.from(document.querySelectorAll('.error, .error-message, [role="alert"]')).map(e => e.textContent)
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
  log(`- H1: ${uiComponents.h1}`);
  log(`- H2: ${uiComponents.h2}`);
  log(`- File count: ${uiComponents.fileCount}`);
  log(`- Message count: ${uiComponents.messageCount}`);
  
  if (uiComponents.errors.length > 0) {
    log('Errors found on page:');
    uiComponents.errors.forEach((error, i) => {
      log(`  ${i+1}. ${error}`);
    });
  }
  
  // Also capture the page URL in case of redirects
  log(`Current URL after navigation: ${page.url()}`);
  
  // Get console logs to diagnose issues
  page.on('console', msg => {
    log(`Console ${msg.type()}: ${msg.text()}`);
  });
  
  // Get navigation events
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) {
      log(`Navigation occurred to: ${frame.url()}`);
    }
  });
  
  // Try clicking any AI Assistant or AI Lawyer buttons if found
  const aiButtons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button, a'))
      .filter(el => {
        const text = el.textContent?.toLowerCase() || '';
        return text.includes('ai') || text.includes('assistant') || text.includes('lawyer');
      })
      .map(el => ({
        text: el.textContent?.trim() || '',
        tag: el.tagName.toLowerCase(),
        href: el instanceof HTMLAnchorElement ? el.href : null,
        isVisible: el.offsetParent !== null
      }));
  });
  
  if (aiButtons.length > 0) {
    log(`Found ${aiButtons.length} AI-related buttons/links on page:`);
    aiButtons.forEach((btn, i) => {
      log(`${i+1}. ${btn.tag} "${btn.text}" | href: ${btn.href} | visible: ${btn.isVisible}`);
    });
    
    // Try clicking the first visible button
    const visibleButtons = aiButtons.filter(btn => btn.isVisible);
    if (visibleButtons.length > 0) {
      try {
        log(`Clicking on "${visibleButtons[0].text}" button/link`);
        await page.click(`${visibleButtons[0].tag}:has-text("${visibleButtons[0].text}")`);
        await page.waitForTimeout(5000);
        
        // Take screenshot after clicking
        await page.screenshot({ path: path.join(logsDir, 'after-clicking-ai-button.png'), fullPage: true });
        log(`URL after clicking: ${page.url()}`);
        
        // Check UI components again
        const componentsAfterClick = await page.evaluate(() => {
          return {
            chatInterface: !!document.querySelector('.chat-interface, [data-testid="chat-interface"]'),
            messageInput: !!document.querySelector('textarea.message-input, [data-testid="message-input"]'),
            sendButton: !!document.querySelector('button.send-button, [data-testid="send-button"]')
          };
        });
        
        log('Components after clicking:');
        log(`- Chat interface: ${componentsAfterClick.chatInterface ? 'Found ✅' : 'Not found ❌'}`);
        log(`- Message input: ${componentsAfterClick.messageInput ? 'Found ✅' : 'Not found ❌'}`);
        log(`- Send button: ${componentsAfterClick.sendButton ? 'Found ✅' : 'Not found ❌'}`);
      } catch (error) {
        log(`Error clicking AI button: ${error.message}`);
      }
    }
  }
  
  log('\nSpecific client UUID test completed');
}); 