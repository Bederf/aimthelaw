import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test to check the AI-Powered Legal Assistant link on client profile
 */
test('Check AI-Powered Legal Assistant link', async ({ page }) => {
  // Ensure logs directory exists
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Create a log file
  const logFilePath = path.join(logsDir, 'ai-lawyer-link.log');
  const log = (message: string) => {
    console.log(message);
    fs.appendFileSync(logFilePath, message + '\n');
  };
  
  log(`Starting AI Lawyer link test at ${new Date().toISOString()}`);
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
  
  // Navigate to the first client's profile
  await page.goto('http://localhost:8080/lawyer/client/CLI_SMITH_821010');
  log('Navigated to client profile page');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(logsDir, 'client-profile.png'), fullPage: true });
  
  // Look for the AI Lawyer link
  const aiLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a'))
      .filter(a => {
        const text = a.textContent?.toLowerCase() || '';
        return (
          text.includes('ai') && 
          (text.includes('lawyer') || text.includes('legal') || text.includes('assistant'))
        );
      })
      .map(a => ({
        text: a.textContent?.trim() || '',
        href: a.href,
        isVisible: a.offsetParent !== null
      }));
  });
  
  if (aiLinks.length === 0) {
    log('No AI Lawyer links found on client profile page');
    return;
  }
  
  log(`Found ${aiLinks.length} AI-related links on client profile page:`);
  aiLinks.forEach((link, i) => {
    log(`${i+1}. "${link.text}" | href: ${link.href} | visible: ${link.isVisible}`);
  });
  
  // Click on the AI Lawyer link
  const aiLawyerLink = aiLinks.find(link => 
    link.text.toLowerCase().includes('assistant') || 
    link.text.toLowerCase().includes('lawyer')
  );
  
  if (!aiLawyerLink) {
    log('No specific AI Lawyer link found to click');
    return;
  }
  
  log(`Clicking on link: "${aiLawyerLink.text}"`);
  
  // Use page.goto with the href instead of clicking to avoid potential navigation issues
  await page.goto(aiLawyerLink.href);
  log(`Navigated to ${aiLawyerLink.href}`);
  await page.waitForTimeout(5000);
  
  // Take screenshot of the AI Lawyer page
  await page.screenshot({ path: path.join(logsDir, 'ai-lawyer-page.png'), fullPage: true });
  
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
  
  log('AI Lawyer page info:');
  log(`- URL: ${pageInfo.url}`);
  log(`- Title: ${pageInfo.title}`);
  log(`- H1: ${pageInfo.h1}`);
  log(`- H2: ${pageInfo.h2}`);
  log(`- Chat interface: ${pageInfo.hasChatInterface ? 'Found' : 'Not found'}`);
  log(`- Message input: ${pageInfo.hasMessageInput ? 'Found' : 'Not found'}`);
  log(`- Model selector: ${pageInfo.hasModelSelector ? 'Found' : 'Not found'}`);
  log(`- File section: ${pageInfo.hasFileSection ? 'Found' : 'Not found'}`);
  
  // Try to interact with the chat if components are found
  if (pageInfo.hasMessageInput) {
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
  
  log('AI Lawyer link test completed');
}); 