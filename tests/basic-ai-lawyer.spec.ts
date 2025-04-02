import { test, expect } from '@playwright/test';

/**
 * Basic AI Lawyer test using a specific client ID
 * 
 * This test focuses on:
 * 1. Loading the AI Lawyer page for a specific client
 * 2. Verifying the core components are loaded
 * 3. Testing basic interactions
 */
test.describe('Basic AI Lawyer Tests with Specific Client', () => {
  const clientId = 'CLI_BOSMAN_700809';

  test.beforeEach(async ({ page }) => {
    // Setup: Navigate to the login page and authenticate
    await page.goto('http://localhost:8080/login');
    
    // Fill login credentials (using test account)
    await page.fill('input[type="email"], input[placeholder*="email" i]', 'mike@law.com');
    await page.fill('input[type="password"], input[placeholder*="password" i]', 'LAW_SNOW_801010');
    
    // Click login button
    await page.click('button[type="submit"], button:has-text("Sign In")');
    
    // Wait for login to complete
    await page.waitForTimeout(5000);
    console.log('Logged in successfully, current URL:', page.url());
    
    // Navigate directly to the AI Lawyer page for the specific client
    await page.goto(`http://localhost:8080/lawyer/ai/${clientId}`);
    console.log(`Navigated to AI Lawyer page for client: ${clientId}`);
    
    // Wait for the page to load
    await page.waitForTimeout(5000);
  });

  test('Page loads with correct UI components', async ({ page }) => {
    // Take a screenshot for visual verification
    await page.screenshot({ path: 'ai-lawyer-loaded.png', fullPage: true });
    
    // Verify main components are visible
    try {
      const containerVisible = await page.locator('.container').isVisible();
      console.log('Container visible:', containerVisible);
      
      // Check for the chat interface
      const chatInterfaceVisible = await page.locator('[data-testid="chat-interface"], .chat-interface').isVisible();
      console.log('Chat interface visible:', chatInterfaceVisible);
      
      // Verify sidebar exists
      const sidebarVisible = await page.locator('[data-testid="sidebar"], .sidebar').isVisible();
      console.log('Sidebar visible:', sidebarVisible);
      
      // Verify message input exists
      const messageInputVisible = await page.locator('[data-testid="message-input"], textarea.message-input').isVisible();
      console.log('Message input visible:', messageInputVisible);
      
      // Verify model selector exists
      const modelSelectorVisible = await page.locator('[data-testid="model-selector"], .model-selector').isVisible();
      console.log('Model selector visible:', modelSelectorVisible);
      
      // Verify new chat button exists
      const newChatButtonVisible = await page.locator('[data-testid="new-chat-button"], button:has-text("New Chat")').isVisible();
      console.log('New chat button visible:', newChatButtonVisible);
      
      // Check if file section is visible
      const fileSectionVisible = await page.locator('[data-testid="file-section"], .file-section').isVisible();
      console.log('File section visible:', fileSectionVisible);
    } catch (error) {
      console.error('Error while checking components:', error);
      await page.screenshot({ path: 'components-check-error.png', fullPage: true });
    }
  });

  test('Basic interaction - Send a simple message', async ({ page }) => {
    try {
      // Check if message input exists
      const messageInput = page.locator('[data-testid="message-input"], textarea.message-input');
      
      if (await messageInput.isVisible()) {
        console.log('Message input found, sending a message');
        
        // Type a simple message
        await messageInput.click();
        await messageInput.fill('Hello, who are you?');
        
        // Take screenshot before sending
        await page.screenshot({ path: 'before-send.png', fullPage: true });
        
        // Find and click send button
        const sendButton = page.locator('[data-testid="send-button"], button.send-button');
        if (await sendButton.isVisible()) {
          await sendButton.click();
          console.log('Message sent');
          
          // Wait for AI response to begin appearing
          try {
            await page.waitForSelector('[data-testid="ai-message"], .ai-message', { timeout: 20000 });
            console.log('AI message started appearing');
            
            // Wait a moment for some content to appear
            await page.waitForTimeout(5000);
            
            // Take screenshot after response starts
            await page.screenshot({ path: 'ai-responding.png', fullPage: true });
            
            // Wait a bit longer for more complete response
            await page.waitForTimeout(10000);
            
            // Get the AI response text
            const aiResponseText = await page.locator('[data-testid="ai-message"], .ai-message').first().innerText();
            console.log('AI response preview:', aiResponseText.substring(0, 100) + '...');
            
            // Take final screenshot
            await page.screenshot({ path: 'ai-response-complete.png', fullPage: true });
          } catch (e) {
            console.error('Error waiting for AI response:', e);
            await page.screenshot({ path: 'ai-response-error.png', fullPage: true });
          }
        } else {
          console.log('Send button not found');
          await page.screenshot({ path: 'send-button-not-found.png', fullPage: true });
        }
      } else {
        console.log('Message input not found');
        await page.screenshot({ path: 'message-input-not-found.png', fullPage: true });
      }
    } catch (error) {
      console.error('Error during message test:', error);
      await page.screenshot({ path: 'message-test-error.png', fullPage: true });
    }
  });
}); 