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
 * Function to check for chat interface elements
 */
const checkForChatInterface = async (page: any, location: string) => {
  const chatComponents = await page.evaluate(() => {
    // Look for chat-related elements
    const chatElements = {
      chatContainer: !!document.querySelector('.chat-container, .chat, [data-testid="chat-container"]'),
      messageInput: !!document.querySelector('textarea, input[type="text"], [data-testid="message-input"], .message-input'),
      sendButton: !!document.querySelector('button[type="submit"], button.send-button, [data-testid="send-button"]'),
      messageHistory: !!document.querySelector('.messages, .message-history, [data-testid="message-history"]'),
      
      // Find potential chat-related elements by text content
      potentialChatElements: Array.from(document.querySelectorAll('div, section, article'))
        .filter(el => {
          const text = el.textContent?.toLowerCase() || '';
          return (text.includes('chat') || text.includes('message') || text.includes('conversation')) &&
                 !(text.includes('login') || text.includes('sign in'));
        })
        .map(el => ({
          tag: el.tagName.toLowerCase(),
          classNames: el.className,
          text: el.textContent?.trim().substring(0, 100)
        })),
      
      // Find input fields that might be for chat
      inputFields: Array.from(document.querySelectorAll('textarea, input[type="text"]'))
        .map(el => ({
          tag: el.tagName.toLowerCase(),
          placeholder: (el as HTMLInputElement | HTMLTextAreaElement).placeholder,
          classNames: el.className
        })),
      
      // Find buttons that might be for sending messages
      sendButtons: Array.from(document.querySelectorAll('button'))
        .filter(btn => {
          const text = btn.textContent?.toLowerCase() || '';
          return text.includes('send') || text.includes('submit') || text.includes('message');
        })
        .map(btn => ({
          text: btn.textContent?.trim(),
          isEnabled: !(btn as HTMLButtonElement).disabled
        }))
    };
    
    return chatElements;
  });
  
  await logTestStatus(page, 'Chat Interface Search', 'progress', 
    `Location: ${location}\n` +
    `Chat container: ${chatComponents.chatContainer ? 'Found ✅' : 'Not found ❌'}\n` +
    `Message input: ${chatComponents.messageInput ? 'Found ✅' : 'Not found ❌'}\n` +
    `Send button: ${chatComponents.sendButton ? 'Found ✅' : 'Not found ❌'}\n` +
    `Message history: ${chatComponents.messageHistory ? 'Found ✅' : 'Not found ❌'}\n` +
    `Potential chat elements: ${chatComponents.potentialChatElements.length}\n` +
    `Input fields: ${chatComponents.inputFields.length}\n` +
    `Send buttons: ${chatComponents.sendButtons.length}`
  );
  
  // Log details about potential chat elements if found
  if (chatComponents.potentialChatElements.length > 0) {
    await logTestStatus(page, 'Chat Interface Search', 'progress', 
      `Potential chat elements found: ${JSON.stringify(chatComponents.potentialChatElements, null, 2)}`
    );
  }
  
  // Log details about input fields if found
  if (chatComponents.inputFields.length > 0) {
    await logTestStatus(page, 'Chat Interface Search', 'progress', 
      `Input fields found: ${JSON.stringify(chatComponents.inputFields, null, 2)}`
    );
  }
  
  // Log details about send buttons if found
  if (chatComponents.sendButtons.length > 0) {
    await logTestStatus(page, 'Chat Interface Search', 'progress', 
      `Send buttons found: ${JSON.stringify(chatComponents.sendButtons, null, 2)}`
    );
  }
  
  // Return true if any chat components were found
  return chatComponents.chatContainer || 
         chatComponents.messageInput || 
         chatComponents.sendButton || 
         chatComponents.messageHistory ||
         chatComponents.potentialChatElements.length > 0;
};

test('Search for chat interface across various routes', async ({ page }) => {
  await logTestStatus(page, 'Chat Interface Search', 'start');
  
  // Navigate to the login page
  await page.goto('http://localhost:8080/login');
  
  // Fill login credentials
  await page.fill('input[type="email"], input[placeholder*="email" i]', 'mike@law.com');
  await page.fill('input[type="password"], input[placeholder*="password" i]', 'LAW_SNOW_801010');
  await page.click('button[type="submit"], button:has-text("Sign In")');
  
  // Wait for login to complete and dashboard to load
  await page.waitForTimeout(5000);
  await logTestStatus(page, 'Chat Interface Search', 'progress', `Logged in, current URL: ${page.url()}`);
  
  // Extract UUIDs
  const dashboardUrl = page.url();
  const userUuidMatch = dashboardUrl.match(/\/dashboard\/([0-9a-f-]+)/);
  const userUuid = userUuidMatch ? userUuidMatch[1] : '';
  
  if (userUuid) {
    await logTestStatus(page, 'Chat Interface Search', 'progress', `Found user UUID: ${userUuid}`);
  }
  
  // Get client UUID
  await page.goto('http://localhost:8080/lawyer/clients');
  await page.waitForTimeout(3000);
  
  const clientUuid = await page.evaluate(() => {
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const links = Array.from(document.querySelectorAll('a'));
    
    for (const link of links) {
      if (link.href) {
        const match = link.href.match(uuidPattern);
        if (match) {
          return match[0];
        }
      }
    }
    
    return '';
  });
  
  if (clientUuid) {
    await logTestStatus(page, 'Chat Interface Search', 'progress', `Found client UUID: ${clientUuid}`);
  } else {
    await logTestStatus(page, 'Chat Interface Search', 'error', 'Could not find any client UUID');
  }
  
  // Check for chat interface on various routes
  const routesToCheck = [
    { path: '/', name: 'Homepage' },
    { path: '/lawyer/dashboard', name: 'Dashboard' },
    { path: `/lawyer/dashboard/${userUuid}`, name: 'User Dashboard' },
    { path: `/lawyer/ai/${clientUuid || 'a6cf1906-1e0b-40b8-8def-14643f54232f'}`, name: 'AI Lawyer' },
    { path: `/lawyer/ai-chat/${clientUuid || 'a6cf1906-1e0b-40b8-8def-14643f54232f'}`, name: 'AI Chat' },
    { path: `/lawyer/chat/${clientUuid || 'a6cf1906-1e0b-40b8-8def-14643f54232f'}`, name: 'Lawyer Chat' },
    { path: '/lawyer/ai', name: 'General AI' },
    { path: '/chat', name: 'Chat' },
    { path: '/ai', name: 'AI' }
  ];
  
  let foundChatInterface = false;
  let chatInterfaceLocation = '';
  
  // Check each route for chat interface
  for (const route of routesToCheck) {
    await page.goto(`http://localhost:8080${route.path}`);
    await page.waitForTimeout(3000);
    
    await logTestStatus(page, 'Chat Interface Search', 'progress', 
      `Checking ${route.name} at ${route.path}, current URL: ${page.url()}`
    );
    
    const foundChat = await checkForChatInterface(page, route.name);
    if (foundChat) {
      foundChatInterface = true;
      chatInterfaceLocation = route.name;
      await logTestStatus(page, 'Chat Interface Search', 'progress', 
        `Found potential chat interface at ${route.name} (${route.path})`
      );
      
      // Try to interact with chat interface
      const canInteract = await page.evaluate(() => {
        // Look for input fields
        const inputField = document.querySelector('textarea, input[type="text"], [data-testid="message-input"], .message-input');
        if (inputField) {
          try {
            (inputField as HTMLInputElement | HTMLTextAreaElement).value = 'Hello, this is a test message';
            return true;
          } catch (error) {
            return false;
          }
        }
        return false;
      });
      
      if (canInteract) {
        await logTestStatus(page, 'Chat Interface Search', 'progress', 'Successfully interacted with input field');
        
        // Try to send a message using a more reliable method
        await page.evaluate(() => {
          // Find send button by text content
          const buttons = Array.from(document.querySelectorAll('button'));
          const sendButton = buttons.find(btn => {
            const text = btn.textContent?.toLowerCase() || '';
            return text.includes('send') || text.includes('submit');
          });
          
          if (sendButton) {
            sendButton.click();
            return true;
          }
          return false;
        }).catch(error => {
          console.error('Error clicking send button:', error);
        });
        
        await page.waitForTimeout(5000);
        await logTestStatus(page, 'Chat Interface Search', 'progress', 'Attempted to click send button');
        
        // Check if a response appeared
        const responseReceived = await page.evaluate(() => {
          const messages = document.querySelectorAll('.message, .ai-message, .response');
          return messages.length > 1;
        });
        
        if (responseReceived) {
          await logTestStatus(page, 'Chat Interface Search', 'progress', 'Received a response from chat interface');
        } else {
          await logTestStatus(page, 'Chat Interface Search', 'progress', 'No response received from chat interface');
        }
      }
    }
  }
  
  // Check the Legal AI System button if available
  await page.goto(`http://localhost:8080/lawyer/ai/${clientUuid || 'a6cf1906-1e0b-40b8-8def-14643f54232f'}`);
  await page.waitForTimeout(3000);
  
  // Find the Legal AI System button using text content
  const legalAiSystemButton = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('a, button'));
    const legalAiButton = buttons.find(btn => 
      btn.textContent?.trim().toLowerCase().includes('legal ai system')
    );
    
    return legalAiButton ? {
      tag: legalAiButton.tagName.toLowerCase(),
      text: legalAiButton.textContent?.trim(),
      href: legalAiButton instanceof HTMLAnchorElement ? legalAiButton.href : null
    } : null;
  });
  
  if (legalAiSystemButton) {
    await logTestStatus(page, 'Chat Interface Search', 'progress', 
      `Found Legal AI System button (${legalAiSystemButton.tag}): ${legalAiSystemButton.text}, clicking it`
    );
    
    try {
      if (legalAiSystemButton.tag === 'a' && legalAiSystemButton.href) {
        await page.goto(legalAiSystemButton.href);
      } else {
        // Find and click using a more reliable method
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('a, button'));
          const legalAiButton = buttons.find(btn => 
            btn.textContent?.trim().toLowerCase().includes('legal ai system')
          );
          
          if (legalAiButton) {
            legalAiButton.click();
          }
        });
      }
      
      await page.waitForTimeout(3000);
      
      await logTestStatus(page, 'Chat Interface Search', 'progress', 
        `After clicking Legal AI System button, current URL: ${page.url()}`
      );
      
      const foundChat = await checkForChatInterface(page, 'After Legal AI System button');
      if (foundChat) {
        foundChatInterface = true;
        chatInterfaceLocation = 'After Legal AI System button';
        await logTestStatus(page, 'Chat Interface Search', 'progress', 
          `Found potential chat interface after clicking Legal AI System button`
        );
      }
    } catch (error) {
      await logTestStatus(page, 'Chat Interface Search', 'error', `Error clicking Legal AI System button: ${error}`);
    }
  }
  
  // Final summary
  if (foundChatInterface) {
    await logTestStatus(page, 'Chat Interface Search', 'complete', 
      `Found chat interface at ${chatInterfaceLocation}`
    );
  } else {
    await logTestStatus(page, 'Chat Interface Search', 'complete', 
      'No functional chat interface found across tested routes'
    );
  }
}); 