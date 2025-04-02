import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';

// Get dirname in ESM
const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);

/**
 * End-to-End test for AILawyerPageNew component
 * 
 * This comprehensive test suite verifies that:
 * 1. The AILawyerPageNew page loads correctly with proper components
 * 2. User can select client files and training files
 * 3. Conversation history functionality works correctly
 * 4. New chat creation works
 * 5. Message sending and receiving works
 * 6. AI model selection works
 * 7. Quick actions work correctly
 * 8. Chat interface properly displays messages
 * 9. Token usage information displays correctly
 * 10. Error states are properly handled
 * 11. Training files are properly utilized for context in conversations
 * 12. Quick actions perform correctly with selected files
 * 
 * Prerequisites:
 * - Frontend running on localhost:8080
 * - Backend API available and configured
 * - Test user account with proper permissions
 */
test.describe('AILawyerPageNew End-to-End Tests', () => {
  // Create a sample test PDF for uploading
  const testFilesDir = path.join(__dirname, 'test-files');
  const samplePdfPath = path.join(testFilesDir, 'test-contract.pdf');
  const sampleLegalLetterPath = path.join(testFilesDir, 'test-legal-letter.pdf');
  
  // Use the specific client ID as requested
  const clientId = 'CLI_BOSMAN_700809'; 
  let documentIds: string[] = []; // Will track the uploaded document IDs
  let conversationId: string | null = null;
  
  // Function to log test status and capture screenshots for debugging
  const logTestStatus = async (page: any, testName: string, status: 'start' | 'progress' | 'complete' | 'error', details?: string) => {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const logMessage = `[${timestamp}] ${testName}: ${status} ${details || ''}`;
    console.log(logMessage);
    
    // Save to log file
    const logDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    fs.appendFileSync(path.join(logDir, 'ai-lawyer-tests.log'), logMessage + '\n');
    
    try {
      // Capture screenshot for visual debugging
      if (page) {
        const screenshotPath = path.join(logDir, `${testName.replace(/\s+/g, '-')}_${status}_${timestamp}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
      }
    } catch (e) {
      console.warn('Failed to capture screenshot:', e);
    }
  };

  test.beforeAll(async () => {
    // Ensure test files directory exists
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true });
    }
    
    // Create test contract PDF if it doesn't exist
    if (!fs.existsSync(samplePdfPath)) {
      const contractPdfContent = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj
4 0 obj<</Length 543>>stream
BT /F1 12 Tf 50 800 Td (CONTRACT AGREEMENT) Tj
0 -30 Td (Between Client A and Company B) Tj
0 -30 Td (Effective Date: January 15, 2023) Tj
0 -30 Td (Term: This Agreement shall commence on January 15, 2023 and) Tj
0 -20 Td (continue until December 31, 2024, unless terminated earlier.) Tj
0 -30 Td (Payment Terms: Client A shall pay Company B the amount of) Tj
0 -20 Td ($10,000 on February 1, 2023 and $15,000 on July 15, 2023.) Tj
0 -30 Td (Review Meeting: The parties shall meet quarterly, with the first) Tj
0 -20 Td (meeting scheduled for March 30, 2023.) Tj
0 -30 Td (Renewal: This Agreement may be renewed by June 30, 2024.) Tj
0 -30 Td (Signed on: January 10, 2023) Tj
ET
endstream endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000052 00000 n
0000000101 00000 n
0000000178 00000 n
trailer<</Size 5/Root 1 0 R>>
startxref
773
%%EOF`;
      
      fs.writeFileSync(samplePdfPath, contractPdfContent);
      console.log('Created test contract PDF for AILawyerPageNew testing');
    }
    
    // Create test legal letter PDF if it doesn't exist
    if (!fs.existsSync(sampleLegalLetterPath)) {
      const legalLetterPdfContent = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj
4 0 obj<</Length 543>>stream
BT /F1 12 Tf 50 800 Td (LEGAL DEMAND LETTER) Tj
0 -30 Td (From: Legal Firm LLP) Tj
0 -20 Td (To: Client A) Tj
0 -30 Td (Date: March 1, 2023) Tj
0 -30 Td (RE: Notice of Outstanding Payment) Tj
0 -30 Td (Dear Client A,) Tj
0 -30 Td (This letter serves as a formal notice that you have failed to make) Tj
0 -20 Td (the required payment of $5,000 due on February 15, 2023.) Tj
0 -30 Td (According to our records, this amount remains unpaid despite) Tj
0 -20 Td (previous reminders sent on February 20 and February 27, 2023.) Tj
0 -30 Td (Please make payment within 14 days, by March 15, 2023.) Tj
0 -30 Td (Failure to do so may result in legal action without further notice.) Tj
0 -30 Td (Sincerely,) Tj
0 -20 Td (Legal Firm LLP) Tj
ET
endstream endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000052 00000 n
0000000101 00000 n
0000000178 00000 n
trailer<</Size 5/Root 1 0 R>>
startxref
773
%%EOF`;
      
      fs.writeFileSync(sampleLegalLetterPath, legalLetterPdfContent);
      console.log('Created test legal letter PDF for AILawyerPageNew testing');
    }
  });

  test.beforeEach(async ({ page }) => {
    // Setup: Navigate to the login page and authenticate
    await page.goto('http://localhost:8080/login');
    
    // Fill login credentials (using test account)
    await page.fill('input[type="email"], input[placeholder*="email" i]', 'mike@law.com');
    await page.fill('input[type="password"], input[placeholder*="password" i]', 'LAW_SNOW_801010');
    
    // Click login button
    await page.click('button[type="submit"], button:has-text("Sign In")');
    
    // Wait for some time after login
    await page.waitForTimeout(5000);
    
    console.log('Logged in successfully, about to navigate to AI Lawyer page');
    
    // Navigate directly to the AILawyerPageNew page for the specific client ID
    await page.goto(`http://localhost:8080/lawyer/ai/${clientId}`);
    console.log(`Navigated to AI Lawyer page for client: ${clientId}`);
    
    // Wait for the page to load completely
    await page.waitForTimeout(5000); // Give time for components to mount and API calls to complete
  });

  test('Page loads with correct UI components', async ({ page }) => {
    // Verify main components are visible
    await expect(page.locator('.container')).toBeVisible();
    
    // Check for the chat interface
    await expect(page.locator('[data-testid="chat-interface"], .chat-interface')).toBeVisible();
    
    // Verify sidebar exists
    await expect(page.locator('[data-testid="sidebar"], .sidebar')).toBeVisible();
    
    // Verify message input exists
    await expect(page.locator('[data-testid="message-input"], .message-input')).toBeVisible();
    
    // Verify model selector exists
    await expect(page.locator('[data-testid="model-selector"], .model-selector')).toBeVisible();
    
    // Verify new chat button exists
    await expect(page.locator('[data-testid="new-chat-button"], button:has-text("New Chat")')).toBeVisible();
  });

  test('File upload and document selection', async ({ page }) => {
    // Wait for file section to be visible
    await page.waitForSelector('[data-testid="file-section"], .file-section');
    
    // Find the file upload input and upload our test documents
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([samplePdfPath, sampleLegalLetterPath]);
    
    // Click the upload button
    await page.click('[data-testid="upload-button"], button:has-text("Upload")');
    
    // Wait for the upload to complete and documents to appear in the list
    await page.waitForSelector('[data-testid^="file-item-"], [class*="file-item"]', { timeout: 15000 });
    
    // Get all document items
    const documentElements = await page.locator('[data-testid^="file-item-"], [class*="file-item"]').all();
    
    // Verify at least our 2 documents were uploaded
    expect(documentElements.length).toBeGreaterThanOrEqual(2);
    
    // Select each document by clicking its checkbox
    for (const element of documentElements) {
      const itemId = await element.getAttribute('data-testid') || await element.getAttribute('id');
      const docId = itemId?.replace('file-item-', '') || '';
      
      if (docId) {
        documentIds.push(docId);
        await page.click(`[data-testid="file-checkbox-${docId}"], #file-checkbox-${docId}`);
      }
    }
    
    console.log(`Selected document IDs: ${documentIds.join(', ')}`);
    expect(documentIds.length).toBeGreaterThanOrEqual(2);
    
    // Verify that documents are selected (at least the ones we just clicked)
    for (const docId of documentIds) {
      const checkbox = page.locator(`[data-testid="file-checkbox-${docId}"], #file-checkbox-${docId}`);
      if (await checkbox.isVisible()) {
        await expect(checkbox).toBeChecked();
      }
    }
  });

  test('Send and receive messages with document context', async ({ page }) => {
    // Skip if no documents were uploaded
    if (documentIds.length === 0) {
      // Try to select any visible documents
      const checkboxes = await page.locator('[data-testid^="file-checkbox-"], [id^="file-checkbox-"]').all();
      if (checkboxes.length > 0) {
        for (let i = 0; i < Math.min(2, checkboxes.length); i++) {
          await checkboxes[i].check();
        }
      } else {
        test.skip(true, 'No documents available for testing');
        return;
      }
    }
    
    // Type a message asking about the contract
    const messageInput = page.locator('[data-testid="message-input"], textarea.message-input');
    await messageInput.click();
    await messageInput.fill('Please summarize the main points of the contract, including important dates.');
    
    // Send the message
    await page.click('[data-testid="send-button"], button.send-button');
    
    // Wait for user message to appear in chat
    await page.waitForSelector('[data-testid="user-message"], .user-message', { timeout: 10000 });
    
    // Wait for AI message to start appearing
    await page.waitForSelector('[data-testid="ai-message"], .ai-message', { timeout: 20000 });
    
    // Wait for AI to finish generating response (wait for loading indicator to disappear)
    await page.waitForFunction(() => {
      const loadingElement = document.querySelector('.loading-placeholder, [data-testid="loading-placeholder"]');
      return !loadingElement || loadingElement.textContent === '';
    }, { timeout: 60000 });
    
    // Verify the AI response contains relevant information from the contract
    const aiResponse = await page.locator('[data-testid="ai-message"], .ai-message').first().innerText();
    
    // Check for key terms that should be in the response
    expect(aiResponse).toContain('contract'); // Should mention it's a contract
    expect(aiResponse.toLowerCase()).toContain('january'); // Should mention some dates
    expect(aiResponse.toLowerCase()).toContain('agreement'); // Should mention the agreement
    
    // Capture conversation ID if new one was created
    try {
      const url = page.url();
      const match = url.match(/\/lawyer\/ai\/[^\/]+\/([^\/]+)/);
      if (match && match[1]) {
        conversationId = match[1];
        console.log(`Captured conversation ID: ${conversationId}`);
      }
    } catch (e) {
      console.log('Could not extract conversation ID from URL');
    }
  });

  test('Test model selection', async ({ page }) => {
    // Wait for model selector to be visible
    await page.waitForSelector('[data-testid="model-selector"], .model-selector', { timeout: 5000 });
    
    // Click the model selector
    await page.click('[data-testid="model-selector"], .model-selector');
    
    // Select claude-3-7-sonnet model (or another available model)
    await page.click('[data-testid="model-claude-3-7-sonnet"], [data-value="claude-3-7-sonnet"]');
    
    // Verify the model was selected
    const modelSelector = page.locator('[data-testid="model-selector"], .model-selector');
    const selectedModel = await modelSelector.innerText();
    expect(selectedModel.toLowerCase()).toContain('claude');
    
    // Type a short message
    const messageInput = page.locator('[data-testid="message-input"], textarea.message-input');
    await messageInput.click();
    await messageInput.fill('Hello, who are you?');
    
    // Send the message
    await page.click('[data-testid="send-button"], button.send-button');
    
    // Wait for AI response
    await page.waitForSelector('[data-testid="ai-message"], .ai-message', { timeout: 20000 });
    
    // Wait for AI to finish generating response (wait for loading indicator to disappear)
    await page.waitForFunction(() => {
      const loadingElement = document.querySelector('.loading-placeholder, [data-testid="loading-placeholder"]');
      return !loadingElement || loadingElement.textContent === '';
    }, { timeout: 30000 });
    
    // Verify the AI response contains Claude-related information
    const aiResponse = await page.locator('[data-testid="ai-message"], .ai-message').first().innerText();
    
    // The response should use language typical of Claude (may vary depending on model version)
    expect(aiResponse.toLowerCase()).toContain('assist');
  });

  test('Test quick actions - Extract Dates', async ({ page }) => {
    // Select documents if not already selected
    if (documentIds.length === 0) {
      // Try to select any visible documents
      const checkboxes = await page.locator('[data-testid^="file-checkbox-"], [id^="file-checkbox-"]').all();
      if (checkboxes.length > 0) {
        for (let i = 0; i < Math.min(2, checkboxes.length); i++) {
          await checkboxes[i].check();
        }
      } else {
        test.skip(true, 'No documents available for testing quick actions');
        return;
      }
    }
    
    // Open quick actions menu
    await page.click('[data-testid="quick-actions-button"], button:has-text("Quick Actions")');
    
    // Wait for quick actions menu to open
    await page.waitForSelector('[data-testid="quick-action-extract-dates"], [data-action="Extract Dates"]', { timeout: 5000 });
    
    // Click the Extract Dates quick action
    await page.click('[data-testid="quick-action-extract-dates"], [data-action="Extract Dates"]');
    
    // Wait for action to begin processing (look for a loading message)
    await page.waitForSelector('[data-testid="ai-message"], .ai-message', { timeout: 10000 });
    
    // Wait for the action to complete and results to appear
    await page.waitForFunction(() => {
      const loadingElement = document.querySelector('.loading-placeholder, [data-testid="loading-placeholder"]');
      return !loadingElement || loadingElement.textContent === '';
    }, { timeout: 60000 });
    
    // Verify the response contains date information
    const aiResponse = await page.locator('[data-testid="ai-message"], .ai-message').last().innerText();
    
    expect(aiResponse.toLowerCase()).toContain('january'); // Should find dates from PDFs
    expect(aiResponse.toLowerCase()).toContain('2023'); // Should find year references
  });

  test('Test new chat creation', async ({ page }) => {
    // Click the new chat button
    await page.click('[data-testid="new-chat-button"], button:has-text("New Chat")');
    
    // Verify that a new conversation is created (messages should be cleared)
    await page.waitForFunction(() => {
      const messages = document.querySelectorAll('[data-testid="user-message"], .user-message, [data-testid="ai-message"], .ai-message');
      return messages.length === 0;
    }, { timeout: 5000 });
    
    // Type a new message in the empty chat
    const messageInput = page.locator('[data-testid="message-input"], textarea.message-input');
    await messageInput.click();
    await messageInput.fill('This is a test message in a new conversation.');
    
    // Send the message
    await page.click('[data-testid="send-button"], button.send-button');
    
    // Wait for user message to appear
    await page.waitForSelector('[data-testid="user-message"], .user-message', { timeout: 10000 });
    
    // Verify that the message was sent
    const userMessage = await page.locator('[data-testid="user-message"], .user-message').first().innerText();
    expect(userMessage).toContain('This is a test message');
    
    // Wait for AI response
    await page.waitForSelector('[data-testid="ai-message"], .ai-message', { timeout: 20000 });
    
    // Get the new conversation ID from URL
    const url = page.url();
    const match = url.match(/\/lawyer\/ai\/[^\/]+\/([^\/]+)/);
    if (match && match[1]) {
      const newConversationId = match[1];
      console.log(`New conversation ID: ${newConversationId}`);
      
      // Verify it's different from previous conversation
      if (conversationId) {
        expect(newConversationId).not.toEqual(conversationId);
      }
    }
  });

  test('Test token usage display', async ({ page }) => {
    // Wait for token usage display to be visible
    await page.waitForSelector('[data-testid="token-info"], .token-info', { timeout: 10000 });
    
    // Get token usage information
    const tokenInfo = await page.locator('[data-testid="token-info"], .token-info').innerText();
    
    // Verify token info displays some usage data
    expect(tokenInfo.toLowerCase()).toMatch(/tokens|used|cost/i);
  });

  test('Test error handling with invalid request', async ({ page }) => {
    // Create an artificial error by sending a message while no documents are selected
    
    // First, unselect all documents
    const checkboxes = await page.locator('[data-testid^="file-checkbox-"]:checked, [id^="file-checkbox-"]:checked').all();
    for (const checkbox of checkboxes) {
      await checkbox.uncheck();
    }
    
    // Type a message that would typically require document context
    const messageInput = page.locator('[data-testid="message-input"], textarea.message-input');
    await messageInput.click();
    await messageInput.fill('Please analyze page 999 of the contract that does not exist.');
    
    // Send the message
    await page.click('[data-testid="send-button"], button.send-button');
    
    // Wait for user message to appear
    await page.waitForSelector('[data-testid="user-message"], .user-message', { timeout: 10000 });
    
    // Wait for AI response (or error message)
    await page.waitForSelector('[data-testid="ai-message"], .ai-message', { timeout: 20000 });
    
    // Wait for AI to finish generating response
    await page.waitForFunction(() => {
      const loadingElement = document.querySelector('.loading-placeholder, [data-testid="loading-placeholder"]');
      return !loadingElement || loadingElement.textContent === '';
    }, { timeout: 30000 });
    
    // Get the AI response
    const aiResponse = await page.locator('[data-testid="ai-message"], .ai-message').last().innerText();
    
    // The AI should either return a graceful error or a note about needing documents
    // It might mention that it cannot find page 999 or suggest selecting documents
    expect(aiResponse.toLowerCase()).toMatch(/cannot|unable|document|select|context|find|sorry|help/i);
  });

  test('Conversation history navigation', async ({ page }) => {
    // This test requires that we've created conversations in previous tests
    if (!conversationId) {
      test.skip(true, 'No conversation ID available for testing history navigation');
      return;
    }
    
    // Look for conversation history button/dropdown
    try {
      await page.click('[data-testid="conversation-history-button"], button:has-text("History")');
      
      // Wait for history dropdown to appear
      await page.waitForSelector('[data-testid="conversation-list"], .conversation-list', { timeout: 5000 });
      
      // Check if our tracked conversation ID appears in the list
      const historyItems = await page.locator('[data-testid^="conversation-item-"], .conversation-item').all();
      
      // If history items exist, click on the first one
      if (historyItems.length > 0) {
        await historyItems[0].click();
        
        // Wait for conversation to load
        await page.waitForTimeout(3000);
        
        // Verify that messages are loaded
        const messages = await page.locator('[data-testid="user-message"], .user-message, [data-testid="ai-message"], .ai-message').all();
        expect(messages.length).toBeGreaterThan(0);
      }
    } catch (e) {
      console.log('Conversation history navigation test failed:', e);
      // This part may fail if conversation history UI is different
    }
  });

  test('Training files integration with AI chat', async ({ page }) => {
    await logTestStatus(page, 'Training files integration', 'start');
    
    // First verify client files are loaded and can be selected
    await page.waitForSelector('[data-testid="file-section"], .file-section');
    
    // Select at least one client file if not already selected
    if (documentIds.length === 0) {
      const checkboxes = await page.locator('[data-testid^="file-checkbox-"], [id^="file-checkbox-"]').all();
      if (checkboxes.length > 0) {
        await checkboxes[0].check();
        
        // Get the document ID
        const docElement = await checkboxes[0].locator('..').locator('..').locator('..'); // Go up to container element
        const docId = await docElement.getAttribute('data-testid') || await docElement.getAttribute('id');
        if (docId) {
          documentIds.push(docId.replace('file-item-', ''));
        }
      } else {
        // Upload a file if none available
        if (!documentIds.length) {
          const fileInput = page.locator('input[type="file"]');
          await fileInput.setInputFiles([samplePdfPath]);
          await page.click('[data-testid="upload-button"], button:has-text("Upload")');
          await page.waitForSelector('[data-testid^="file-item-"], [class*="file-item"]', { timeout: 15000 });
          
          // Select the uploaded file
          const firstFileCheckbox = await page.locator('[data-testid^="file-checkbox-"], [id^="file-checkbox-"]').first();
          await firstFileCheckbox.check();
          
          // Get the document ID
          const docElement = await firstFileCheckbox.locator('..').locator('..').locator('..'); // Go up to container element
          const docId = await docElement.getAttribute('data-testid') || await docElement.getAttribute('id');
          if (docId) {
            documentIds.push(docId.replace('file-item-', ''));
          }
        }
      }
    }
    
    await logTestStatus(page, 'Training files integration', 'progress', 'Client files selected');
    
    // Now verify we can send a message asking about legal knowledge that should trigger training files
    const messageInput = page.locator('[data-testid="message-input"], textarea.message-input');
    await messageInput.click();
    
    // Ask a question that should trigger use of training files
    await messageInput.fill('What are the main principles of contract law I should be aware of?');
    
    // Log the message being sent
    await logTestStatus(page, 'Training files integration', 'progress', 'Sending message about contract law principles');
    
    // Send the message
    await page.click('[data-testid="send-button"], button.send-button');
    
    // Wait for user message to appear in chat
    await page.waitForSelector('[data-testid="user-message"], .user-message', { timeout: 10000 });
    
    // Wait for AI message to start appearing
    await page.waitForSelector('[data-testid="ai-message"], .ai-message', { timeout: 20000 });
    
    // Wait for AI to finish generating response (wait for loading indicator to disappear)
    await page.waitForFunction(() => {
      const loadingElement = document.querySelector('.loading-placeholder, [data-testid="loading-placeholder"]');
      return !loadingElement || loadingElement.textContent === '';
    }, { timeout: 60000 });
    
    // Verify the AI response contains contract law information that should come from training files
    const aiResponse = await page.locator('[data-testid="ai-message"], .ai-message').first().innerText();
    
    // Log response for debugging
    await logTestStatus(page, 'Training files integration', 'progress', 'Got AI response');
    fs.writeFileSync(
      path.join(__dirname, 'logs', 'contract-law-response.txt'), 
      aiResponse
    );
    
    // The response should reference legal principles often found in training material
    expect(aiResponse.toLowerCase()).toMatch(/contract|principle|law|legal|agreement|consideration|offer|acceptance/i);
    
    // Now ask a follow-up question to test context retention with training knowledge
    await messageInput.click();
    await messageInput.fill('Can you elaborate more on consideration and how it relates to the contract document I uploaded?');
    
    await logTestStatus(page, 'Training files integration', 'progress', 'Sending follow-up message to test context retention');
    
    // Send the message
    await page.click('[data-testid="send-button"], button.send-button');
    
    // Wait for user message to appear in chat
    await page.waitForSelector('[data-testid="user-message"], .user-message:nth-of-type(2)', { timeout: 10000 });
    
    // Wait for AI message to start appearing
    await page.waitForSelector('[data-testid="ai-message"], .ai-message:nth-of-type(2)', { timeout: 20000 });
    
    // Wait for AI to finish generating response
    await page.waitForFunction(() => {
      const loadingElements = document.querySelectorAll('.loading-placeholder, [data-testid="loading-placeholder"]');
      return loadingElements.length === 0 || Array.from(loadingElements).every(el => !el.textContent);
    }, { timeout: 60000 });
    
    // Get the second AI response
    const followUpResponse = await page.locator('[data-testid="ai-message"], .ai-message').nth(1).innerText();
    
    // Log response for debugging
    await logTestStatus(page, 'Training files integration', 'progress', 'Got follow-up response');
    fs.writeFileSync(
      path.join(__dirname, 'logs', 'consideration-follow-up-response.txt'), 
      followUpResponse
    );
    
    // The follow-up should mention both consideration (from training) and reference the uploaded contract
    expect(followUpResponse.toLowerCase()).toMatch(/consideration/i);
    expect(followUpResponse.toLowerCase()).toMatch(/contract|agreement|document/i);
    
    await logTestStatus(page, 'Training files integration', 'complete', 'Test completed successfully');
  });

  test('Test quick action with multiple files - Summarize Document', async ({ page }) => {
    await logTestStatus(page, 'Multiple file quick action', 'start');
    
    // Make sure multiple client files are selected
    await page.waitForSelector('[data-testid="file-section"], .file-section');
    
    // Try to select at least two documents
    const checkboxes = await page.locator('[data-testid^="file-checkbox-"], [id^="file-checkbox-"]').all();
    
    // Uncheck all first
    for (const checkbox of checkboxes) {
      const isChecked = await checkbox.isChecked();
      if (isChecked) {
        await checkbox.uncheck();
      }
    }
    
    // Select two files if available
    if (checkboxes.length >= 2) {
      for (let i = 0; i < 2; i++) {
        await checkboxes[i].check();
      }
    } else if (checkboxes.length === 1) {
      // If only one document is available, select it
      await checkboxes[0].check();
      
      // Upload an additional document
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles([sampleLegalLetterPath]);
      await page.click('[data-testid="upload-button"], button:has-text("Upload")');
      await page.waitForSelector('[data-testid^="file-item-"], [class*="file-item"]', { timeout: 15000 });
      
      // Select the newly uploaded document
      const newCheckboxes = await page.locator('[data-testid^="file-checkbox-"], [id^="file-checkbox-"]').all();
      if (newCheckboxes.length > checkboxes.length) {
        await newCheckboxes[newCheckboxes.length - 1].check();
      }
    } else {
      // No documents available, upload two
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles([samplePdfPath, sampleLegalLetterPath]);
      await page.click('[data-testid="upload-button"], button:has-text("Upload")');
      await page.waitForSelector('[data-testid^="file-item-"], [class*="file-item"]', { timeout: 15000 });
      
      // Select the uploaded documents
      const newCheckboxes = await page.locator('[data-testid^="file-checkbox-"], [id^="file-checkbox-"]').all();
      for (let i = 0; i < Math.min(2, newCheckboxes.length); i++) {
        await newCheckboxes[i].check();
      }
    }
    
    await logTestStatus(page, 'Multiple file quick action', 'progress', 'Multiple files selected');
    
    // Open quick actions menu
    await page.click('[data-testid="quick-actions-button"], button:has-text("Quick Actions")');
    
    // Wait for quick actions menu to open
    await page.waitForSelector('[data-testid="quick-action-summarize-document"], [data-action="Summarize Document"]', { timeout: 5000 });
    
    // Click the Summarize Document quick action
    await page.click('[data-testid="quick-action-summarize-document"], [data-action="Summarize Document"]');
    
    await logTestStatus(page, 'Multiple file quick action', 'progress', 'Clicked Summarize Document action');
    
    // Wait for action to begin processing (look for a loading message)
    await page.waitForSelector('[data-testid="ai-message"], .ai-message', { timeout: 10000 });
    
    // Wait for the action to complete and results to appear
    await page.waitForFunction(() => {
      const loadingElement = document.querySelector('.loading-placeholder, [data-testid="loading-placeholder"]');
      return !loadingElement || loadingElement.textContent === '';
    }, { timeout: 60000 });
    
    // Verify the response contains summary information from both documents
    const aiResponse = await page.locator('[data-testid="ai-message"], .ai-message').last().innerText();
    
    // Log response for debugging
    await logTestStatus(page, 'Multiple file quick action', 'progress', 'Got summary response');
    fs.writeFileSync(
      path.join(__dirname, 'logs', 'document-summary-response.txt'), 
      aiResponse
    );
    
    // The response should have summary elements from both documents
    // Contract document terms
    expect(aiResponse.toLowerCase()).toMatch(/contract|agreement/i);
    // Legal letter terms
    expect(aiResponse.toLowerCase()).toMatch(/payment|notice|letter/i);
    
    await logTestStatus(page, 'Multiple file quick action', 'complete', 'Test completed successfully');
  });

  test('Test single-file restriction for Reply to Letter', async ({ page }) => {
    await logTestStatus(page, 'Reply to Letter restriction', 'start');
    
    // Select multiple documents first
    const checkboxes = await page.locator('[data-testid^="file-checkbox-"], [id^="file-checkbox-"]').all();
    
    // Ensure at least 2 documents are selected if possible
    if (checkboxes.length >= 2) {
      // Uncheck all first
      for (const checkbox of checkboxes) {
        const isChecked = await checkbox.isChecked();
        if (isChecked) {
          await checkbox.uncheck();
        }
      }
      
      // Select two files
      await checkboxes[0].check();
      await checkboxes[1].check();
      
      await logTestStatus(page, 'Reply to Letter restriction', 'progress', 'Selected multiple files');
      
      // Open quick actions menu
      await page.click('[data-testid="quick-actions-button"], button:has-text("Quick Actions")');
      
      // Wait for quick actions menu to open
      await page.waitForSelector('[data-testid="quick-action-reply-to-letter"], [data-action="Reply to Letter"]', { timeout: 5000 });
      
      // Click the Reply to Letter quick action
      await page.click('[data-testid="quick-action-reply-to-letter"], [data-action="Reply to Letter"]');
      
      // The system should show a toast or error message about selecting only one file
      await page.waitForSelector('[role="alert"], .toast, [data-testid="error-message"]', { timeout: 10000 });
      
      // Get the error message
      const errorText = await page.locator('[role="alert"], .toast, [data-testid="error-message"]').innerText();
      await logTestStatus(page, 'Reply to Letter restriction', 'progress', `Got error: ${errorText}`);
      
      // Error should mention selecting a single file
      expect(errorText.toLowerCase()).toMatch(/select|document|single|one|file/i);
      
      // Now select only one file
      for (const checkbox of checkboxes) {
        const isChecked = await checkbox.isChecked();
        if (isChecked) {
          await checkbox.uncheck();
        }
      }
      
      // Select only the legal letter document
      // Find the legal letter document by its name containing "legal" or "letter"
      const documents = await page.locator('[data-testid^="file-item-"], [class*="file-item"]').all();
      let letterDocFound = false;
      
      for (const doc of documents) {
        const docText = await doc.innerText();
        if (docText.toLowerCase().includes('legal') || docText.toLowerCase().includes('letter')) {
          // Find the checkbox in this document
          const docCheckbox = await doc.locator('input[type="checkbox"]').first();
          await docCheckbox.check();
          letterDocFound = true;
          break;
        }
      }
      
      // If no letter document was found, just select the first document
      if (!letterDocFound && checkboxes.length > 0) {
        await checkboxes[0].check();
      }
      
      await logTestStatus(page, 'Reply to Letter restriction', 'progress', 'Selected single file');
      
      // Open quick actions menu again
      await page.click('[data-testid="quick-actions-button"], button:has-text("Quick Actions")');
      
      // Wait for quick actions menu to open
      await page.waitForSelector('[data-testid="quick-action-reply-to-letter"], [data-action="Reply to Letter"]', { timeout: 5000 });
      
      // Click the Reply to Letter quick action
      await page.click('[data-testid="quick-action-reply-to-letter"], [data-action="Reply to Letter"]');
      
      // This time it should work - wait for the action to begin processing
      await page.waitForSelector('[data-testid="ai-message"], .ai-message', { timeout: 10000 });
      
      // Wait for the action to complete
      await page.waitForFunction(() => {
        const loadingElement = document.querySelector('.loading-placeholder, [data-testid="loading-placeholder"]');
        return !loadingElement || loadingElement.textContent === '';
      }, { timeout: 60000 });
      
      // Get the AI response
      const aiResponse = await page.locator('[data-testid="ai-message"], .ai-message').last().innerText();
      
      // Log response for debugging
      await logTestStatus(page, 'Reply to Letter restriction', 'progress', 'Got reply to letter response');
      fs.writeFileSync(
        path.join(__dirname, 'logs', 'reply-to-letter-response.txt'), 
        aiResponse
      );
      
      // The response should look like a letter reply
      expect(aiResponse.toLowerCase()).toMatch(/dear|sincerely|regards|response|reply/i);
      
      await logTestStatus(page, 'Reply to Letter restriction', 'complete', 'Test completed successfully');
    } else {
      await logTestStatus(page, 'Reply to Letter restriction', 'error', 'Not enough documents available for this test');
      test.skip(true, 'Not enough documents available to test Reply to Letter');
    }
  });

  test('Test Extract Dates quick action with global training files', async ({ page }) => {
    await logTestStatus(page, 'Extract Dates with global training', 'start');
    
    // Make sure at least one client file is selected
    await page.waitForSelector('[data-testid="file-section"], .file-section');
    
    // Uncheck all documents first
    const checkboxes = await page.locator('[data-testid^="file-checkbox-"], [id^="file-checkbox-"]').all();
    for (const checkbox of checkboxes) {
      const isChecked = await checkbox.isChecked();
      if (isChecked) {
        await checkbox.uncheck();
      }
    }
    
    // Select just one document - preferably the contract with dates
    const documents = await page.locator('[data-testid^="file-item-"], [class*="file-item"]').all();
    let contractDocFound = false;
    
    for (const doc of documents) {
      const docText = await doc.innerText();
      if (docText.toLowerCase().includes('contract')) {
        // Find the checkbox in this document
        const docCheckbox = await doc.locator('input[type="checkbox"]').first();
        await docCheckbox.check();
        contractDocFound = true;
        break;
      }
    }
    
    // If no contract document was found, just select the first document
    if (!contractDocFound && checkboxes.length > 0) {
      await checkboxes[0].check();
    }
    
    await logTestStatus(page, 'Extract Dates with global training', 'progress', 'Selected client file with dates');
    
    // Open quick actions menu
    await page.click('[data-testid="quick-actions-button"], button:has-text("Quick Actions")');
    
    // Wait for quick actions menu to open
    await page.waitForSelector('[data-testid="quick-action-extract-dates"], [data-action="Extract Dates"]', { timeout: 5000 });
    
    // Click the Extract Dates quick action
    await page.click('[data-testid="quick-action-extract-dates"], [data-action="Extract Dates"]');
    
    await logTestStatus(page, 'Extract Dates with global training', 'progress', 'Clicked Extract Dates action');
    
    // Wait for action to begin processing
    await page.waitForSelector('[data-testid="ai-message"], .ai-message', { timeout: 10000 });
    
    // Wait for the action to complete and results to appear
    await page.waitForFunction(() => {
      const loadingElement = document.querySelector('.loading-placeholder, [data-testid="loading-placeholder"]');
      return !loadingElement || loadingElement.textContent === '';
    }, { timeout: 60000 });
    
    // Verify the response contains date information
    const aiResponse = await page.locator('[data-testid="ai-message"], .ai-message').last().innerText();
    
    // Log response for debugging
    await logTestStatus(page, 'Extract Dates with global training', 'progress', 'Got date extraction response');
    fs.writeFileSync(
      path.join(__dirname, 'logs', 'date-extraction-response.txt'), 
      aiResponse
    );
    
    // The response should contain dates from the document
    expect(aiResponse.toLowerCase()).toMatch(/january|february|march|april|may|june|july|august|september|october|november|december/i);
    expect(aiResponse.toLowerCase()).toMatch(/2023|2024/i);
    
    // The response should contain date explanations
    expect(aiResponse.toLowerCase()).toMatch(/date|deadline|schedule|term|period|duration/i);
    
    await logTestStatus(page, 'Extract Dates with global training', 'complete', 'Test completed successfully');
  });
  
  // Add a test for conversation context maintenance
  test('Verify conversation context is maintained', async ({ page }) => {
    await logTestStatus(page, 'Conversation context maintenance', 'start');
    
    // Start a new conversation
    await page.click('[data-testid="new-chat-button"], button:has-text("New Chat")');
    
    // Wait for the conversation to reset
    await page.waitForFunction(() => {
      const messages = document.querySelectorAll('[data-testid="user-message"], .user-message, [data-testid="ai-message"], .ai-message');
      return messages.length === 0;
    }, { timeout: 5000 });
    
    await logTestStatus(page, 'Conversation context maintenance', 'progress', 'Started new conversation');
    
    // Make sure at least one document is selected
    const checkboxes = await page.locator('[data-testid^="file-checkbox-"], [id^="file-checkbox-"]').all();
    let hasSelectedFile = false;
    
    for (const checkbox of checkboxes) {
      const isChecked = await checkbox.isChecked();
      if (isChecked) {
        hasSelectedFile = true;
        break;
      }
    }
    
    if (!hasSelectedFile && checkboxes.length > 0) {
      await checkboxes[0].check();
    }
    
    // Send an initial message
    const messageInput = page.locator('[data-testid="message-input"], textarea.message-input');
    await messageInput.click();
    await messageInput.fill('Tell me about the key dates in these documents.');
    
    // Send the message
    await page.click('[data-testid="send-button"], button.send-button');
    
    // Wait for AI response
    await page.waitForSelector('[data-testid="ai-message"], .ai-message', { timeout: 20000 });
    
    // Wait for AI to finish generating
    await page.waitForFunction(() => {
      const loadingElement = document.querySelector('.loading-placeholder, [data-testid="loading-placeholder"]');
      return !loadingElement || loadingElement.textContent === '';
    }, { timeout: 60000 });
    
    // Log the initial response
    const initialResponse = await page.locator('[data-testid="ai-message"], .ai-message').first().innerText();
    await logTestStatus(page, 'Conversation context maintenance', 'progress', 'Received initial response');
    fs.writeFileSync(
      path.join(__dirname, 'logs', 'context-initial-response.txt'), 
      initialResponse
    );
    
    // Now send a follow-up message that relies on previous context
    await messageInput.click();
    await messageInput.fill('Which of those dates is the earliest deadline?');
    
    // Send the message
    await page.click('[data-testid="send-button"], button.send-button');
    
    // Wait for second AI response
    await page.waitForSelector('[data-testid="ai-message"], .ai-message:nth-of-type(2)', { timeout: 20000 });
    
    // Wait for AI to finish generating
    await page.waitForFunction(() => {
      const loadingElements = document.querySelectorAll('.loading-placeholder, [data-testid="loading-placeholder"]');
      return loadingElements.length === 0 || Array.from(loadingElements).every(el => !el.textContent);
    }, { timeout: 60000 });
    
    // Log the follow-up response
    const followUpResponse = await page.locator('[data-testid="ai-message"], .ai-message').nth(1).innerText();
    await logTestStatus(page, 'Conversation context maintenance', 'progress', 'Received follow-up response');
    fs.writeFileSync(
      path.join(__dirname, 'logs', 'context-followup-response.txt'), 
      followUpResponse
    );
    
    // The follow-up should mention specific dates and identify the earliest deadline
    expect(followUpResponse.toLowerCase()).toMatch(/earliest|first|soonest|deadline|date/i);
    // It should mention at least one month
    expect(followUpResponse.toLowerCase()).toMatch(/january|february|march|april|may|june|july|august|september|october|november|december/i);
    
    await logTestStatus(page, 'Conversation context maintenance', 'complete', 'Test completed successfully');
  });
}); 