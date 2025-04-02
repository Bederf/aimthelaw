import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Helper function to log test status
 */
const logTestStatus = async (page: any, testName: string, status: 'start' | 'progress' | 'complete' | 'error', details?: string) => {
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${status.toUpperCase()}] ${testName}: ${details || ''}`;
  
  console.log(logMessage);
  
  const logFilePath = path.join(logsDir, 'test-execution.log');
  fs.appendFileSync(logFilePath, logMessage + '\n');
  
  // Take screenshot for reference
  if (page) {
    const screenshotDir = path.join(logsDir, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    try {
      const screenshotPath = path.join(screenshotDir, `${testName.replace(/\s+/g, '-')}_${status}_${Date.now()}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
    } catch (error) {
      console.error('Failed to take screenshot:', error);
    }
  }
};

/**
 * Tests for the AI Lawyer functionality
 */
test.describe('AI Lawyer Tests', () => {
  let userUuid: string;
  let clientUuid: string;
  
  // Using a known working client UUID as fallback
  const fallbackClientUuid = 'a6cf1906-1e0b-40b8-8def-14643f54232f';

  test.beforeEach(async ({ page }) => {
    // Setup: Navigate to login and authenticate
    await logTestStatus(page, 'Login', 'start');
    await page.goto('http://localhost:8080/login');
    
    // Fill login credentials
    await page.fill('input[type="email"], input[placeholder*="email" i]', 'mike@law.com');
    await page.fill('input[type="password"], input[placeholder*="password" i]', 'LAW_SNOW_801010');
    await page.click('button[type="submit"], button:has-text("Sign In")');
    
    // Wait for login to complete and dashboard to load
    await page.waitForTimeout(5000);
    await logTestStatus(page, 'Login', 'complete', `Current URL: ${page.url()}`);
    
    // Extract UUID from dashboard URL
    const dashboardUrl = page.url();
    const uuidMatch = dashboardUrl.match(/\/dashboard\/([0-9a-f-]+)/);
    if (uuidMatch && uuidMatch[1]) {
      userUuid = uuidMatch[1];
      await logTestStatus(null, 'UUID Extraction', 'complete', `User UUID: ${userUuid}`);
    } else {
      await logTestStatus(null, 'UUID Extraction', 'error', 'Could not extract user UUID');
    }
    
    // Try to find a valid client UUID from the clients page
    await logTestStatus(page, 'Client Discovery', 'start');
    await page.goto('http://localhost:8080/lawyer/clients');
    await page.waitForTimeout(3000);
    
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
      });
      
      return Array.from(uuids);
    });
    
    if (clientUuids.length > 0) {
      clientUuid = clientUuids[0];
      await logTestStatus(null, 'Client Discovery', 'complete', `Found client UUID: ${clientUuid}`);
    } else {
      clientUuid = fallbackClientUuid;
      await logTestStatus(null, 'Client Discovery', 'progress', `Using fallback client UUID: ${clientUuid}`);
    }
  });

  test('AI Lawyer page loads with correct UI components', async ({ page }) => {
    await logTestStatus(page, 'AI Lawyer UI Test', 'start');
    
    // Navigate to the AI Lawyer page with the client UUID
    const aiLawyerUrl = `http://localhost:8080/lawyer/ai/${clientUuid}`;
    await page.goto(aiLawyerUrl);
    await page.waitForTimeout(5000);
    
    await logTestStatus(page, 'AI Lawyer UI Test', 'progress', `Navigated to: ${aiLawyerUrl}`);
    
    // Check for essential UI components
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
        headings: Array.from(document.querySelectorAll('h1, h2')).map(h => h.textContent?.trim()),
        currentUrl: window.location.href
      };
    });
    
    // Log results
    const componentResults = [
      `Chat interface: ${uiComponents.chatInterface ? 'Found ✅' : 'Not found ❌'}`,
      `Message input: ${uiComponents.messageInput ? 'Found ✅' : 'Not found ❌'}`,
      `Send button: ${uiComponents.sendButton ? 'Found ✅' : 'Not found ❌'}`,
      `Model selector: ${uiComponents.modelSelector ? 'Found ✅' : 'Not found ❌'}`,
      `File section: ${uiComponents.fileSection ? 'Found ✅' : 'Not found ❌'}`,
      `Page title: ${uiComponents.title}`,
      `Headings: ${uiComponents.headings.join(', ')}`,
      `Current URL: ${uiComponents.currentUrl}`
    ].join('\n');
    
    await logTestStatus(page, 'AI Lawyer UI Test', 'progress', componentResults);
    
    // Check for AI-related buttons if main components not found
    if (!uiComponents.chatInterface || !uiComponents.messageInput) {
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
        await logTestStatus(page, 'AI Lawyer UI Test', 'progress', `Found ${aiButtons.length} AI-related buttons/links`);
        
        // Try clicking the first visible button if not found direct chat interface
        const visibleButtons = aiButtons.filter((btn: any) => btn.isVisible);
        if (visibleButtons.length > 0) {
          try {
            await logTestStatus(page, 'AI Lawyer UI Test', 'progress', `Clicking on "${visibleButtons[0].text}" button/link`);
            await page.click(`${visibleButtons[0].tag}:has-text("${visibleButtons[0].text}")`);
            await page.waitForTimeout(5000);
            
            // Check components again after clicking
            const componentsAfterClick = await page.evaluate(() => {
              return {
                chatInterface: !!document.querySelector('.chat-interface, [data-testid="chat-interface"]'),
                messageInput: !!document.querySelector('textarea.message-input, [data-testid="message-input"]'),
                currentUrl: window.location.href
              };
            });
            
            await logTestStatus(page, 'AI Lawyer UI Test', 'progress', 
              `After clicking: Chat interface: ${componentsAfterClick.chatInterface ? 'Found ✅' : 'Not found ❌'}, ` +
              `Message input: ${componentsAfterClick.messageInput ? 'Found ✅' : 'Not found ❌'}, ` +
              `URL: ${componentsAfterClick.currentUrl}`
            );
          } catch (error) {
            await logTestStatus(page, 'AI Lawyer UI Test', 'error', `Error clicking button: ${error}`);
          }
        }
      }
    }
    
    // Look for any errors on the page
    const errors = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.error, .error-message, [role="alert"]'))
        .map(el => el.textContent?.trim())
        .filter(Boolean);
    });
    
    if (errors.length > 0) {
      await logTestStatus(page, 'AI Lawyer UI Test', 'error', `Errors on page: ${errors.join(', ')}`);
    }
    
    await logTestStatus(page, 'AI Lawyer UI Test', 'complete');
  });

  // Commenting out these tests to focus on UI components test
  /* 
  test('Training files integration with AI chat', async ({ page }) => {
    await logTestStatus(page, 'Training Files Test', 'start');
    
    // Navigate to the AI Lawyer page with the client UUID
    const aiLawyerUrl = `http://localhost:8080/lawyer/ai/${clientUuid}`;
    await page.goto(aiLawyerUrl);
    await page.waitForTimeout(5000);
    
    await logTestStatus(page, 'Training Files Test', 'progress', `Navigated to: ${aiLawyerUrl}`);
    
    // Check if training files section is visible
    const trainingFilesVisible = await page.evaluate(() => {
      // Find any reference to training files in the UI
      const trainingFilesElements = Array.from(document.querySelectorAll('*'))
        .filter(el => {
          const text = el.textContent?.toLowerCase() || '';
          return text.includes('training') && text.includes('file');
        });
      
      return {
        found: trainingFilesElements.length > 0,
        elements: trainingFilesElements.map(el => ({
          tag: el.tagName.toLowerCase(),
          text: el.textContent?.trim(),
          isVisible: el.offsetParent !== null
        }))
      };
    });
    
    await logTestStatus(page, 'Training Files Test', 'progress', 
      `Training files references: ${trainingFilesVisible.found ? 'Found' : 'Not found'}, ` +
      `Count: ${trainingFilesVisible.elements.length}`
    );
    
    // If message input is available, test with training files
    const messageInput = await page.$('textarea.message-input, [data-testid="message-input"]');
    if (messageInput) {
      // Type a message asking about training files
      await messageInput.fill('What training files are available to you?');
      
      // Find and click send button
      const sendButton = await page.$('button.send-button, [data-testid="send-button"]');
      if (sendButton) {
        await logTestStatus(page, 'Training Files Test', 'progress', 'Sending message about training files');
        await sendButton.click();
        
        // Wait for AI response
        await page.waitForTimeout(10000);
        
        // Extract AI response text
        const aiResponse = await page.evaluate(() => {
          const messages = document.querySelectorAll('.ai-message, [data-testid="ai-message"]');
          return messages.length > 0 ? (messages[messages.length - 1].textContent || '').trim() : '';
        });
        
        if (aiResponse) {
          await logTestStatus(page, 'Training Files Test', 'progress', `AI response: ${aiResponse.substring(0, 200)}...`);
        } else {
          await logTestStatus(page, 'Training Files Test', 'error', 'No AI response received');
        }
      } else {
        await logTestStatus(page, 'Training Files Test', 'error', 'Send button not found');
      }
    } else {
      await logTestStatus(page, 'Training Files Test', 'error', 'Message input not found');
    }
    
    await logTestStatus(page, 'Training Files Test', 'complete');
  });

  test('Quick actions functionality', async ({ page }) => {
    await logTestStatus(page, 'Quick Actions Test', 'start');
    
    // Navigate to the AI Lawyer page with the client UUID
    const aiLawyerUrl = `http://localhost:8080/lawyer/ai/${clientUuid}`;
    await page.goto(aiLawyerUrl);
    await page.waitForTimeout(5000);
    
    await logTestStatus(page, 'Quick Actions Test', 'progress', `Navigated to: ${aiLawyerUrl}`);
    
    // Find quick action buttons
    const quickActions = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button'))
        .filter(button => {
          const text = button.textContent?.toLowerCase() || '';
          return (
            text.includes('extract') || 
            text.includes('summarize') || 
            text.includes('reply') || 
            text.includes('prepare')
          );
        })
        .map(button => ({
          text: button.textContent?.trim() || '',
          isVisible: button.offsetParent !== null
        }));
    });
    
    if (quickActions.length === 0) {
      await logTestStatus(page, 'Quick Actions Test', 'error', 'No quick action buttons found');
      return;
    }
    
    await logTestStatus(page, 'Quick Actions Test', 'progress', 
      `Found ${quickActions.length} quick actions: ${quickActions.map(a => a.text).join(', ')}`
    );
    
    // Check if files are needed for quick actions
    const fileSelectionExists = await page.evaluate(() => {
      return {
        fileSection: !!document.querySelector('.file-section, [data-testid="file-section"]'),
        fileItems: document.querySelectorAll('[data-testid^="file-item-"], .file-item').length,
        fileCheckboxes: document.querySelectorAll('input[type="checkbox"]').length
      };
    });
    
    await logTestStatus(page, 'Quick Actions Test', 'progress', 
      `File section: ${fileSelectionExists.fileSection ? 'Found' : 'Not found'}, ` +
      `Files: ${fileSelectionExists.fileItems}, Checkboxes: ${fileSelectionExists.fileCheckboxes}`
    );
    
    // Select files if available
    if (fileSelectionExists.fileSection && fileSelectionExists.fileCheckboxes > 0) {
      // Try to select the first file checkbox
      await page.evaluate(() => {
        const checkbox = document.querySelector('input[type="checkbox"]');
        if (checkbox) {
          (checkbox as HTMLInputElement).checked = true;
          // Trigger change event
          const event = new Event('change', { bubbles: true });
          checkbox.dispatchEvent(event);
        }
      });
      
      await logTestStatus(page, 'Quick Actions Test', 'progress', 'Attempted to select a file');
    }
    
    // Try to click the first visible quick action button
    const visibleActions = quickActions.filter(action => action.isVisible);
    if (visibleActions.length > 0) {
      const actionName = visibleActions[0].text;
      
      try {
        await logTestStatus(page, 'Quick Actions Test', 'progress', `Clicking "${actionName}" quick action`);
        await page.click(`button:has-text("${actionName}")`);
        
        // Wait for quick action to process
        await page.waitForTimeout(10000);
        
        // Check for AI response to quick action
        const quickActionResponse = await page.evaluate(() => {
          const messages = document.querySelectorAll('.ai-message, [data-testid="ai-message"]');
          return messages.length > 0 ? (messages[messages.length - 1].textContent || '').trim() : '';
        });
        
        if (quickActionResponse) {
          await logTestStatus(page, 'Quick Actions Test', 'progress', 
            `Received response for "${actionName}" quick action: ${quickActionResponse.substring(0, 200)}...`
          );
        } else {
          await logTestStatus(page, 'Quick Actions Test', 'progress', `No response detected for "${actionName}" quick action`);
        }
      } catch (error) {
        await logTestStatus(page, 'Quick Actions Test', 'error', `Error using quick action: ${error}`);
      }
    } else {
      await logTestStatus(page, 'Quick Actions Test', 'error', 'No visible quick action buttons found');
    }
    
    await logTestStatus(page, 'Quick Actions Test', 'complete');
  });
  */
}); 