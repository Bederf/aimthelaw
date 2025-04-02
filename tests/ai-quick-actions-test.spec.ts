import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

/**
 * AI Lawyer Quick Actions Test Results and Recommendations
 * -------------------------------------------------------
 * 
 * SUMMARY OF FINDINGS:
 * 
 * 1. UI ELEMENTS
 *    - Quick Action buttons ("Extract Dates", "Summarize Document", etc.) are present and visible in the UI
 *    - All Quick Action buttons are permanently disabled
 *    - File selection UI elements are completely missing from the page
 * 
 * 2. DOCUMENT SELECTION FUNCTIONALITY
 *    - Console logs show that the `toggleDocumentSelection` function works internally
 *    - Document IDs are saved to session storage when toggled
 *    - However, this function is not accessible from the global window scope (not exported)
 *    - The file selection UI needed to trigger this function is missing
 * 
 * 3. API INTEGRATION
 *    - No API requests were captured when attempting to trigger Quick Actions
 *    - No direct method to call the backend with document IDs was found
 *    - URL parameters with document IDs did not trigger any API calls
 * 
 * 4. ROOT CAUSES
 *    - The primary issue is the missing file selection UI in the AILawyerPageNew component
 *    - File sidebar or document selection panel is not rendered, despite the code to handle it existing
 *    - The `handleQuickAction` function is not accessible, preventing direct triggering
 *    - Conditional rendering logic may be preventing file selection UI from appearing
 * 
 * RECOMMENDATIONS FOR FIXING:
 * 
 * 1. IMMEDIATE FIX FOR TESTING
 *    - Export toggleDocumentSelection and handleQuickAction as window methods for testing
 *    - Add a temporary UI element that shows currently selected document IDs
 *    - Add a temporary file selection UI that's always visible for testing purposes
 * 
 * 2. PROPER FIXES FOR PRODUCTION
 *    - Review AILawyerPageNew.tsx conditional rendering logic for the file selection sidebar
 *    - Check why the sidebar with Client Documents is not being displayed
 *    - Verify that client files are being loaded (logs show 3 files are loaded)
 *    - Fix the rendering condition that's preventing file selection UI from appearing
 *    - Add error handling to show a message when file selection UI cannot be displayed
 * 
 * 3. CODE LOCATION TO INVESTIGATE
 *    - AILawyerPageNew.tsx:122 - Check isInitialMount logic and rendering conditions
 *    - AILawyerPageNew.tsx:400 - Review client file loading process
 *    - AILawyerPageNew.tsx:782 - Check toggleDocumentSelection implementation
 *    - AILawyerPageNew.tsx:1683 - Review handleQuickAction implementation
 *
 * The tests below diagnose these issues in detail and attempt various workarounds.
 */

// Get dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test for AI Lawyer Quick Actions
 * 
 * This test diagnoses:
 * 1. Presence of quick action buttons 
 * 2. Their enabled/disabled state
 * 3. Requirements for using quick actions (file selection, etc.)
 */
test.describe('AI Lawyer Quick Actions Diagnostic', () => {
  // Known working client and conversation IDs from other tests
  const clientId = 'a6cf1906-1e0b-40b8-8def-14643f54232f';
  const conversationId = '07433dc8-4552-450e-82d3-db73fb70d9c8';
  
  // Ensure logs directory exists
  const logsDir = path.join(__dirname, 'logs');
  
  test.beforeAll(async () => {
    // Create the logs directory if it doesn't exist
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  });

  // Helper function to create a timestamped log message
  const log = (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(path.join(logsDir, 'quick-actions-diagnostic.log'), logMessage + '\n');
    return logMessage;
  };

  test('Diagnose Quick Actions UI and Requirements', async ({ page }) => {
    // Step 1: Login
    log('Starting login process');
    await page.goto('/login');
    
    // Fill login credentials
    await page.fill('input[type="email"], input[placeholder*="email" i]', 'mike@law.com');
    await page.fill('input[type="password"], input[placeholder*="password" i]', 'LAW_SNOW_801010');
    
    // Click login button
    await page.click('button[type="submit"], button:has-text("Sign In")');
    
    // Wait for login to complete and dashboard to load
    await page.waitForURL('**/lawyer/dashboard/**', { timeout: 30000 });
    log('Login successful, dashboard loaded');
    await page.screenshot({ path: path.join(logsDir, 'dashboard.png'), fullPage: true });
    
    // Step 2: Navigate to AI Lawyer page
    await page.goto(`/lawyer/ai/${clientId}/${conversationId}`);
    log(`Navigated to AI Lawyer page: /lawyer/ai/${clientId}/${conversationId}`);
    await page.waitForTimeout(5000);
    log('AI Lawyer page loaded');
    await page.screenshot({ path: path.join(logsDir, 'ai-lawyer-page.png'), fullPage: true });
    
    // Step 3: Check for all UI elements including Quick Actions
    log('Checking for UI elements on the page');
    
    const uiElements = await page.evaluate(() => {
      // Find all buttons on the page to look for quick action buttons
      const allButtons = Array.from(document.querySelectorAll('button'));
      
      // Extract quick action related buttons
      const quickActionButtons = allButtons
        .filter(btn => {
          const text = (btn.textContent || '').toLowerCase();
          return text.includes('quick action') || 
                 text.includes('extract') || 
                 text.includes('summarize') || 
                 text.includes('reply to') || 
                 text.includes('prepare');
        })
        .map(btn => ({
          text: btn.textContent?.trim() || '',
          disabled: btn.disabled,
          ariaDisabled: btn.getAttribute('aria-disabled') === 'true',
          classes: btn.className,
          visible: btn.offsetParent !== null
        }));
      
      // Look for document selection elements
      const fileSelectionElements = {
        uploadButton: !!document.querySelector('[data-testid="upload-button"]') || 
                     !!Array.from(document.querySelectorAll('button')).find(btn => 
                        btn.textContent?.toLowerCase().includes('upload')),
        fileInput: !!document.querySelector('input[type="file"]'),
        fileItems: Array.from(document.querySelectorAll('[data-testid^="file-item-"], .file-item'))
          .map(el => ({
            text: el.textContent?.trim() || '',
            id: el.getAttribute('data-testid') || '',
            classes: el.className
          })),
        checkboxes: Array.from(document.querySelectorAll('input[type="checkbox"]'))
          .map(el => ({
            id: el.id,
            name: el.name,
            checked: el.checked,
            disabled: el.disabled
          }))
      };
      
      // Check for error messages or instructions
      const textualElements = {
        h1Elements: Array.from(document.querySelectorAll('h1')).map(el => el.textContent?.trim()),
        h2Elements: Array.from(document.querySelectorAll('h2')).map(el => el.textContent?.trim()),
        paragraphs: Array.from(document.querySelectorAll('p')).map(el => el.textContent?.trim()),
        errorMessages: Array.from(document.querySelectorAll('.error, .error-message, [role="alert"]'))
          .map(el => el.textContent?.trim())
      };
      
      // Check for chat interface elements
      const chatElements = {
        chatContainer: !!document.querySelector('.chat-container, [data-testid="chat-container"]'),
        messageInput: !!document.querySelector('textarea.message-input, [data-testid="message-input"]'),
        sendButton: !!document.querySelector('button.send-button, [data-testid="send-button"]')
      };
      
      return {
        quickActionButtons,
        fileSelectionElements,
        textualElements,
        chatElements,
        url: window.location.href,
        title: document.title
      };
    });
    
    // Step 4: Log information about UI elements
    log(`Page title: ${uiElements.title}`);
    log(`Current URL: ${uiElements.url}`);
    
    // Log headings
    log('Headings:');
    if (uiElements.textualElements.h1Elements.length > 0) {
      uiElements.textualElements.h1Elements.forEach((h1, i) => {
        log(`- H1 #${i+1}: ${h1}`);
      });
    } else {
      log('- No H1 elements found');
    }
    
    if (uiElements.textualElements.h2Elements.length > 0) {
      uiElements.textualElements.h2Elements.forEach((h2, i) => {
        log(`- H2 #${i+1}: ${h2}`);
      });
    } else {
      log('- No H2 elements found');
    }
    
    // Log quick action buttons
    log('Quick Action Buttons:');
    if (uiElements.quickActionButtons.length > 0) {
      uiElements.quickActionButtons.forEach((btn, i) => {
        log(`- Button #${i+1}: "${btn.text}" | Disabled: ${btn.disabled || btn.ariaDisabled} | Visible: ${btn.visible}`);
      });
    } else {
      log('- No Quick Action buttons found');
    }
    
    // Log file selection elements
    log('File Selection Elements:');
    log(`- Upload button: ${uiElements.fileSelectionElements.uploadButton ? 'Found' : 'Not found'}`);
    log(`- File input: ${uiElements.fileSelectionElements.fileInput ? 'Found' : 'Not found'}`);
    
    if (uiElements.fileSelectionElements.fileItems.length > 0) {
      log(`- File items: ${uiElements.fileSelectionElements.fileItems.length} found`);
      uiElements.fileSelectionElements.fileItems.forEach((item, i) => {
        log(`  * Item #${i+1}: ${item.text} (ID: ${item.id})`);
      });
    } else {
      log('- No file items found');
    }
    
    if (uiElements.fileSelectionElements.checkboxes.length > 0) {
      log(`- Checkboxes: ${uiElements.fileSelectionElements.checkboxes.length} found`);
      uiElements.fileSelectionElements.checkboxes.forEach((checkbox, i) => {
        log(`  * Checkbox #${i+1}: ID=${checkbox.id}, Name=${checkbox.name}, Checked=${checkbox.checked}, Disabled=${checkbox.disabled}`);
      });
    } else {
      log('- No checkboxes found');
    }
    
    // Log chat elements
    log('Chat Interface Elements:');
    log(`- Chat container: ${uiElements.chatElements.chatContainer ? 'Found' : 'Not found'}`);
    log(`- Message input: ${uiElements.chatElements.messageInput ? 'Found' : 'Not found'}`);
    log(`- Send button: ${uiElements.chatElements.sendButton ? 'Found' : 'Not found'}`);
    
    // Log error messages or instructions
    if (uiElements.textualElements.errorMessages.length > 0) {
      log('Error Messages:');
      uiElements.textualElements.errorMessages.forEach((msg, i) => {
        log(`- Error #${i+1}: ${msg}`);
      });
    }
    
    // Log paragraphs that might contain instructions
    const relevantParagraphs = uiElements.textualElements.paragraphs.filter(p => 
      p && (p.toLowerCase().includes('document') || 
            p.toLowerCase().includes('file') || 
            p.toLowerCase().includes('select') || 
            p.toLowerCase().includes('action') ||
            p.toLowerCase().includes('required'))
    );
    
    if (relevantParagraphs.length > 0) {
      log('Relevant Instructions/Paragraphs:');
      relevantParagraphs.forEach((p, i) => {
        log(`- Paragraph #${i+1}: ${p}`);
      });
    }
    
    // Step 5: Try to interact with the Quick Actions button if found
    const quickActionsButton = page.locator('button:has-text("Quick Actions")');
    const isQuickActionsVisible = await quickActionsButton.isVisible().catch(() => false);
    
    if (isQuickActionsVisible) {
      log('Quick Actions button found, attempting to click it');
      await quickActionsButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(logsDir, 'after-quick-actions-click.png'), fullPage: true });
      
      // Check for dropdown or modal
      const dropdown = await page.locator('.dropdown-content, [role="menu"], .menu-content').isVisible().catch(() => false);
      if (dropdown) {
        log('Dropdown menu detected after clicking Quick Actions');
        
        // Look for specific action buttons
        const dropdownContent = await page.evaluate(() => {
          const container = document.querySelector('.dropdown-content, [role="menu"], .menu-content');
          if (!container) return { items: [] };
          
          return {
            items: Array.from(container.querySelectorAll('button, a, [role="menuitem"]'))
              .map(el => ({
                text: el.textContent?.trim() || '',
                disabled: el.disabled || el.getAttribute('aria-disabled') === 'true',
                visible: el.offsetParent !== null
              }))
          };
        });
        
        if (dropdownContent.items.length > 0) {
          log('Dropdown items:');
          dropdownContent.items.forEach((item, i) => {
            log(`- Item #${i+1}: "${item.text}" | Disabled: ${item.disabled} | Visible: ${item.visible}`);
          });
        } else {
          log('No items found in dropdown');
        }
      } else {
        log('No dropdown detected after clicking Quick Actions');
      }
    } else {
      log('Quick Actions button not found or not visible');
    }
    
    // Step 6: Check if there are document-related messages or tooltips
    const documentMessages = await page.locator('text=select file, text=upload document, text=select document first, text=file required')
      .all()
      .then(elements => elements.map(e => e.innerText()))
      .catch(() => []);
    
    if (documentMessages.length > 0) {
      log('Document-related messages found:');
      documentMessages.forEach((msg, i) => {
        log(`- Message #${i+1}: ${msg}`);
      });
    } else {
      log('No explicit document-related messages found');
    }
    
    // Final analysis
    log('Diagnostic completed. Summary:');
    log(`- Quick Action buttons found: ${uiElements.quickActionButtons.length > 0 ? 'Yes' : 'No'}`);
    log(`- File selection elements found: ${uiElements.fileSelectionElements.uploadButton || 
                                          uiElements.fileSelectionElements.fileInput || 
                                          uiElements.fileSelectionElements.fileItems.length > 0 || 
                                          uiElements.fileSelectionElements.checkboxes.length > 0 ? 'Yes' : 'No'}`);
    log(`- Chat interface present: ${uiElements.chatElements.chatContainer && 
                                   uiElements.chatElements.messageInput && 
                                   uiElements.chatElements.sendButton ? 'Yes' : 'No'}`);
    
    // Add conclusion about the issue
    log('');
    log('CONCLUSION:');
    log('The Quick Action buttons are present but disabled because they require file selection.');
    log('However, the file selection UI is missing from the page, making it impossible for users to select files.');
    log('This appears to be a bug in the implementation where the file selection component is not being rendered.');
    log('The page has instructions telling users to "select an action to analyze your documents"');
    log('but provides no way to select or upload documents first.');
  });

  test('File Selection and Extract Dates Quick Action', async ({ page }) => {
    // Step 1: Login
    log('Starting login process for file selection test');
    await page.goto('/login');
    
    // Fill login credentials
    await page.fill('input[type="email"], input[placeholder*="email" i]', 'mike@law.com');
    await page.fill('input[type="password"], input[placeholder*="password" i]', 'LAW_SNOW_801010');
    
    // Click login button
    await page.click('button[type="submit"], button:has-text("Sign In")');
    
    // Wait for login to complete and dashboard to load
    await page.waitForURL('**/lawyer/dashboard/**', { timeout: 30000 });
    log('Login successful for file selection test, dashboard loaded');
    
    // Step 2: Navigate to AI Lawyer page
    await page.goto(`/lawyer/ai/${clientId}/${conversationId}`);
    log(`Navigated to AI Lawyer page: /lawyer/ai/${clientId}/${conversationId}`);
    await page.waitForTimeout(5000);
    log('AI Lawyer page loaded');
    await page.screenshot({ path: path.join(logsDir, 'file-selection-initial.png'), fullPage: true });
    
    // Step 3: Check for file selection elements and select a file
    log('Looking for file selection elements');
    
    // Check for client document section
    const clientDocsSection = await page.locator('h2:text("Client Documents")').isVisible();
    log(`Client Documents section found: ${clientDocsSection}`);
    
    // Check for any file elements that can be selected
    const fileElements = await page.locator('[data-testid^="file-item-"], .file-item, div:has(input[type="checkbox"])').all();
    log(`Found ${fileElements.length} file elements that might be selectable`);
    
    if (fileElements.length > 0) {
      // Take a screenshot of the file elements before selection
      await page.screenshot({ path: path.join(logsDir, 'file-elements-before-selection.png'), fullPage: true });
      
      // Try to select the first file element
      try {
        // First try to find a checkbox within the file element
        const checkbox = await fileElements[0].locator('input[type="checkbox"]').first();
        const checkboxVisible = await checkbox.isVisible().catch(() => false);
        
        if (checkboxVisible) {
          // If checkbox is visible, click it to select the file
          log('Found checkbox for file selection, clicking it');
          await checkbox.click();
          log('Clicked on file checkbox');
        } else {
          // If no checkbox, try clicking the file element itself
          log('No checkbox found, clicking the file element itself');
          await fileElements[0].click();
          log('Clicked on file element');
        }
        
        // Take a screenshot after selection attempt
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(logsDir, 'after-file-selection-attempt.png'), fullPage: true });
        
        // Check for any visual confirmation of selection
        const fileStatusAfterClick = await page.evaluate(() => {
          const fileElements = document.querySelectorAll('[data-testid^="file-item-"], .file-item');
          return Array.from(fileElements).map(el => ({
            text: el.textContent?.trim() || '',
            classNames: el.className,
            selected: el.className.includes('selected') || el.getAttribute('aria-selected') === 'true'
          }));
        });
        
        log(`File elements after selection attempt: ${JSON.stringify(fileStatusAfterClick)}`);
      } catch (error) {
        log(`Error attempting to select file: ${error.message}`);
      }
    } else {
      log('No file elements found that could be selected');
      // Check for any file selection UI at all
      const anyFileUI = await page.locator('text="No files available", text="Upload files first", text="Select a document"').first().isVisible().catch(() => false);
      if (anyFileUI) {
        log('Found message about file selection/upload');
      }
    }
    
    // Step 4: Check if Quick Action buttons are enabled after selection attempt
    log('Checking if Quick Action buttons are enabled after selection attempt');
    
    const quickActionStatus = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button')).filter(btn => {
        const text = (btn.textContent || '').toLowerCase();
        return text.includes('extract dates') || 
               text.includes('summarize document') || 
               text.includes('reply to letter') || 
               text.includes('prepare for court');
      });
      
      return buttons.map(btn => ({
        text: btn.textContent?.trim() || '',
        disabled: btn.disabled || btn.getAttribute('aria-disabled') === 'true',
        visible: btn.offsetParent !== null
      }));
    });
    
    log(`Quick action buttons after selection attempt: ${JSON.stringify(quickActionStatus)}`);
    
    // Step 5: Try to click the Extract Dates action if it's enabled
    const extractDatesButton = await page.locator('button:has-text("Extract Dates")').first();
    const isButtonVisible = await extractDatesButton.isVisible().catch(() => false);
    
    if (isButtonVisible) {
      const isDisabled = await extractDatesButton.isDisabled().catch(() => true);
      log(`Extract Dates button found - Disabled: ${isDisabled}`);
      
      if (!isDisabled) {
        // Button is enabled, try clicking it
        log('Extract Dates button is enabled, clicking it');
        await extractDatesButton.click();
        log('Clicked Extract Dates button');
        
        // Wait for AI response
        await page.waitForTimeout(5000);
        await page.screenshot({ path: path.join(logsDir, 'after-extract-dates-click.png'), fullPage: true });
        
        // Check for AI response
        const aiResponse = await page.locator('[data-testid="ai-message"], .ai-message').isVisible().catch(() => false);
        log(`AI response visible: ${aiResponse}`);
        
        if (aiResponse) {
          const responseText = await page.locator('[data-testid="ai-message"], .ai-message').innerText();
          log(`AI response preview: ${responseText.substring(0, 100)}...`);
        }
      } else {
        log('Extract Dates button is disabled, cannot proceed with quick action');
      }
    } else {
      log('Extract Dates button not found or not visible');
    }
    
    // Final summary
    log('File selection and quick action test completed');
    log('Results:');
    log(`- File elements found: ${fileElements.length > 0 ? 'Yes' : 'No'}`);
    log(`- Extract Dates button enabled: ${isButtonVisible && !(await extractDatesButton.isDisabled().catch(() => true)) ? 'Yes' : 'No'}`);
    
    // Log information about the current page state for debugging
    const pageState = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        h1: Array.from(document.querySelectorAll('h1')).map(el => el.textContent?.trim()),
        h2: Array.from(document.querySelectorAll('h2')).map(el => el.textContent?.trim()),
        visibleButtons: Array.from(document.querySelectorAll('button')).filter(btn => btn.offsetParent !== null).map(btn => btn.textContent?.trim())
      };
    });
    
    log(`Current page state: ${JSON.stringify(pageState)}`);
  });

  test('Quick Actions Workflow: Extract Dates then Summarize', async ({ page }) => {
    // Step 1: Login
    log('Starting login process for quick actions workflow test');
    await page.goto('/login');
    
    // Fill login credentials
    await page.fill('input[type="email"], input[placeholder*="email" i]', 'mike@law.com');
    await page.fill('input[type="password"], input[placeholder*="password" i]', 'LAW_SNOW_801010');
    
    // Click login button
    await page.click('button[type="submit"], button:has-text("Sign In")');
    
    // Wait for login to complete and dashboard to load
    await page.waitForURL('**/lawyer/dashboard/**', { timeout: 30000 });
    log('Login successful, dashboard loaded');
    
    // Step 2: Navigate to AI Lawyer page
    await page.goto(`/lawyer/ai/${clientId}/${conversationId}`);
    log(`Navigated to AI Lawyer page: /lawyer/ai/${clientId}/${conversationId}`);
    await page.waitForTimeout(5000);
    log('AI Lawyer page loaded');
    
    // Take screenshot of initial state
    await page.screenshot({ path: path.join(logsDir, 'workflow-initial-state.png'), fullPage: true });

    // Step 3: Look for the sidebar and file selection elements
    log('Looking for sidebar elements');
    
    // First check if there's a sidebar or panel that might contain file selection
    const sidebarPanel = await page.locator('aside, .sidebar, [data-testid="sidebar"], nav, .panel').first();
    const sidebarExists = await sidebarPanel.isVisible().catch(() => false);
    
    if (sidebarExists) {
      log('Found sidebar/panel element that might contain file selection');
      await sidebarPanel.screenshot({ path: path.join(logsDir, 'sidebar-panel.png') });
      
      // Look for file elements within the sidebar
      const fileItems = await sidebarPanel.locator('[data-testid^="file-item-"], .file-item, div:has(input[type="checkbox"])').all();
      log(`Found ${fileItems.length} file items in the sidebar`);
      
      if (fileItems.length > 0) {
        // Try to select the first file
        try {
          // First check if there's a checkbox
          const checkbox = await fileItems[0].locator('input[type="checkbox"]').first();
          const checkboxVisible = await checkbox.isVisible().catch(() => false);
          
          if (checkboxVisible) {
            log('Found checkbox in the sidebar, selecting it');
            await checkbox.click();
            log('Selected file via checkbox');
          } else {
            // If no checkbox, try clicking the file item itself
            log('No checkbox found, clicking the file item directly');
            await fileItems[0].click();
            log('Clicked on file item');
          }
          
          // Take screenshot after selection
          await page.waitForTimeout(1000);
          await page.screenshot({ path: path.join(logsDir, 'after-file-selection.png'), fullPage: true });
          
          // Check if selection had any effect
          const extractButton = page.locator('button:has-text("Extract Dates")');
          const isDisabled = await extractButton.isDisabled().catch(() => true);
          log(`After selection attempt, Extract Dates button is ${isDisabled ? 'still disabled' : 'enabled'}`);
          
          // Step 4: Try using the Extract Dates quick action
          if (!isDisabled) {
            log('Extract Dates button is enabled, clicking it');
            await extractButton.click();
            log('Clicked Extract Dates button');
            
            // Wait for AI response
            await page.waitForTimeout(10000);
            await page.screenshot({ path: path.join(logsDir, 'after-extract-dates.png'), fullPage: true });
            
            // Check for AI response
            const aiResponse = await page.locator('[data-testid="ai-message"], .ai-message').isVisible().catch(() => false);
            log(`AI response for Extract Dates visible: ${aiResponse}`);
            
            if (aiResponse) {
              const responseText = await page.locator('[data-testid="ai-message"], .ai-message').innerText();
              log(`Extract Dates result preview: ${responseText.substring(0, 200)}...`);
              
              // Step 5: Now try the Summarize Document quick action
              const summarizeButton = page.locator('button:has-text("Summarize Document")');
              const isSummarizeDisabled = await summarizeButton.isDisabled().catch(() => true);
              
              if (!isSummarizeDisabled) {
                log('Summarize Document button is enabled, clicking it');
                await summarizeButton.click();
                log('Clicked Summarize Document button');
                
                // Wait for AI response
                await page.waitForTimeout(10000);
                await page.screenshot({ path: path.join(logsDir, 'after-summarize.png'), fullPage: true });
                
                // Check for AI response (the newest message)
                const allAiMessages = await page.locator('[data-testid="ai-message"], .ai-message').all();
                
                if (allAiMessages.length > 1) {
                  const latestResponse = await allAiMessages[allAiMessages.length - 1].innerText();
                  log(`Summarize Document result preview: ${latestResponse.substring(0, 200)}...`);
                  
                  // Step 6: Try to ask a question about the summary
                  const messageInput = page.locator('textarea.message-input, [data-testid="message-input"]');
                  const isMessageInputVisible = await messageInput.isVisible().catch(() => false);
                  
                  if (isMessageInputVisible) {
                    log('Message input found, asking a question about the summary');
                    await messageInput.fill('Can you provide more details about the document?');
                    
                    const sendButton = page.locator('button.send-button, [data-testid="send-button"]');
                    if (await sendButton.isVisible()) {
                      await sendButton.click();
                      log('Sent follow-up question');
                      
                      // Wait for AI response
                      await page.waitForTimeout(10000);
                      await page.screenshot({ path: path.join(logsDir, 'after-followup-question.png'), fullPage: true });
                      
                      // Check for the newest AI response
                      const updatedMessages = await page.locator('[data-testid="ai-message"], .ai-message').all();
                      if (updatedMessages.length > allAiMessages.length) {
                        const followupResponse = await updatedMessages[updatedMessages.length - 1].innerText();
                        log(`Follow-up response preview: ${followupResponse.substring(0, 200)}...`);
                      } else {
                        log('No response detected for the follow-up question');
                      }
                    } else {
                      log('Send button not found or not visible');
                    }
                  } else {
                    log('Message input not found or not visible for follow-up question');
                  }
                } else {
                  log('Could not find new AI message after Summarize Document action');
                }
              } else {
                log('Summarize Document button is disabled, cannot proceed with second quick action');
              }
            } else {
              log('No AI response detected after Extract Dates');
            }
          } else {
            log('Extract Dates button remains disabled even after file selection attempt');
            
            // Try to find any console errors or messages that might explain the issue
            const errors = await page.evaluate(() => {
              return {
                errors: (window as any).errors || [],
                messages: (window as any).console_messages || [],
                documentState: document.querySelectorAll('[data-testid^="file-item-"], .file-item').length,
                selectedState: Array.from(document.querySelectorAll('input[type="checkbox"]')).filter(cb => cb.checked).length
              };
            });
            
            log(`Debug info: ${JSON.stringify(errors)}`);
          }
        } catch (error) {
          log(`Error during file selection workflow: ${error.message}`);
          await page.screenshot({ path: path.join(logsDir, 'error-during-workflow.png'), fullPage: true });
        }
      } else {
        log('No file items found in the sidebar');
        
        // Check if there's any clue about where file selection might be
        const documentSections = await page.locator('h2:has-text("Documents"), h2:has-text("Files"), h3:has-text("Documents"), section:has-text("Documents")').all();
        
        if (documentSections.length > 0) {
          log(`Found ${documentSections.length} potential document sections, but no selectable files`);
          for (let i = 0; i < documentSections.length; i++) {
            await documentSections[i].screenshot({ path: path.join(logsDir, `document-section-${i}.png`) });
          }
        }
      }
    } else {
      log('No sidebar or panel found for file selection');
      
      // Try to find any UI element that might be related to file selection
      const potentialFileSelectors = [
        'button:has-text("Select Files")',
        'button:has-text("Files")',
        'button:has-text("Documents")',
        '[data-testid="file-section"]',
        '.file-section',
        'h2:has-text("Client Documents")'
      ].join(', ');
      
      const anyFileUI = await page.locator(potentialFileSelectors).first().isVisible().catch(() => false);
      
      if (anyFileUI) {
        log('Found potential file selection UI element, but not in a sidebar');
        await page.locator(potentialFileSelectors).first().screenshot({ path: path.join(logsDir, 'potential-file-ui.png') });
      }
    }
    
    // Final summary
    log('Quick actions workflow test completed');
    log('Summary:');
    log(`- Sidebar/panel found: ${sidebarExists ? 'Yes' : 'No'}`);
    
    // Check the final state of the quick action buttons
    const finalButtonStates = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button')).filter(btn => {
        const text = (btn.textContent || '').toLowerCase();
        return text.includes('extract dates') || 
               text.includes('summarize document') || 
               text.includes('reply to letter') || 
               text.includes('prepare for court');
      });
      
      return buttons.map(btn => ({
        text: btn.textContent?.trim() || '',
        disabled: btn.disabled || btn.getAttribute('aria-disabled') === 'true'
      }));
    });
    
    log(`- Final button states: ${JSON.stringify(finalButtonStates)}`);

    // Document the current page state
    log('Current page structure:');
    const pageStructure = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        h1: Array.from(document.querySelectorAll('h1')).map(el => el.textContent?.trim()),
        h2: Array.from(document.querySelectorAll('h2')).map(el => el.textContent?.trim()),
        mainContentInnerHTML: document.querySelector('main')?.innerHTML.substring(0, 500) + '...',
        chatMessages: Array.from(document.querySelectorAll('[data-testid="ai-message"], .ai-message, [data-testid="user-message"], .user-message')).length
      };
    });
    
    log(`Page structure: ${JSON.stringify(pageStructure)}`);
  });

  test('Target Documents by ID and Use Quick Actions', async ({ page }) => {
    // Document IDs seen in the console logs
    const documentIds = [
      '02a754f2-92fe-4742-a90a-6c577118ab4b',
      '3dbac2dd-af9e-4bbc-a7a0-c0e4c319169e',
      'bdc63d1b-c11b-481f-9cae-7693a68ab92a'
    ];
    
    // Step 1: Login
    log('Starting login for targeted document test');
    await page.goto('/login');
    
    // Fill login credentials
    await page.fill('input[type="email"], input[placeholder*="email" i]', 'mike@law.com');
    await page.fill('input[type="password"], input[placeholder*="password" i]', 'LAW_SNOW_801010');
    
    // Click login button
    await page.click('button[type="submit"], button:has-text("Sign In")');
    
    // Wait for login to complete and dashboard to load
    await page.waitForURL('**/lawyer/dashboard/**', { timeout: 30000 });
    log('Login successful, dashboard loaded');
    
    // Step 2: Navigate to AI Lawyer page
    await page.goto(`/lawyer/ai/${clientId}/${conversationId}`);
    log(`Navigated to AI Lawyer page: /lawyer/ai/${clientId}/${conversationId}`);
    await page.waitForTimeout(5000);
    log('AI Lawyer page loaded');
    
    // Enable console log capture to help debug document loading
    page.on('console', msg => {
      if (msg.text().includes('document') || 
          msg.text().includes('file') || 
          msg.text().includes('select') || 
          msg.text().includes('AILawyer')) {
        log(`Console log: ${msg.text()}`);
      }
    });
    
    // Take screenshot of initial state
    await page.screenshot({ path: path.join(logsDir, 'targeted-doc-initial.png'), fullPage: true });
    
    // Step 3: Try to directly inject click events to select documents by ID
    log('Attempting to select documents by direct ID access');
    
    // First try to find document elements by data-id attributes
    for (const docId of documentIds) {
      log(`Looking for document with ID: ${docId}`);
      
      const hasDocElement = await page.evaluate((id) => {
        // Try various ways of finding the document element by ID
        const selectors = [
          `[data-id="${id}"]`, 
          `[data-document-id="${id}"]`,
          `[data-testid="file-item-${id}"]`,
          `[data-testid="file-checkbox-${id}"]`,
          `#document-${id}`,
          `[id*="${id}"]`
        ];
        
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element) {
            console.log(`Found document element with selector: ${selector}`);
            return { found: true, selector };
          }
        }
        
        // If not found by direct ID, look for any checkbox elements
        const checkboxElements = Array.from(document.querySelectorAll('input[type="checkbox"]'));
        if (checkboxElements.length > 0) {
          console.log(`Found ${checkboxElements.length} checkbox elements, but not by document ID`);
          return { found: false, checkboxes: checkboxElements.length };
        }
        
        return { found: false };
      }, docId);
      
      if (hasDocElement.found) {
        log(`Found document element with ID: ${docId}, using selector: ${hasDocElement.selector}`);
        
        // Try to click the document element
        try {
          await page.click(hasDocElement.selector);
          log(`Clicked on document element with ID: ${docId}`);
          
          // Pause to allow state to update
          await page.waitForTimeout(1000);
          
          // Check if the quick action buttons became enabled
          const quickActionEnabled = await page.evaluate(() => {
            const extractButton = Array.from(document.querySelectorAll('button')).find(
              btn => btn.textContent?.includes('Extract Dates')
            );
            return extractButton ? !extractButton.disabled : false;
          });
          
          log(`After clicking document ${docId}, Extract Dates button enabled: ${quickActionEnabled}`);
          
          if (quickActionEnabled) {
            // Document selection worked, proceed with quick action
            break; 
          }
        } catch (error) {
          log(`Error clicking document element: ${error.message}`);
        }
      } else if (hasDocElement.checkboxes > 0) {
        log(`No direct match for document ID ${docId}, but found ${hasDocElement.checkboxes} checkboxes`);
      } else {
        log(`Document element with ID ${docId} not found in the DOM`);
      }
    }
    
    // If direct ID access didn't work, try a more generic approach to find and click any document selection elements
    const quickActionEnabled = await page.evaluate(() => {
      const extractButton = Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent?.includes('Extract Dates')
      );
      return extractButton ? !extractButton.disabled : false;
    });
    
    if (!quickActionEnabled) {
      log('Direct document selection did not enable quick actions, trying alternative approaches');
      
      // Try to execute document selection directly via JS
      const selectionResult = await page.evaluate(() => {
        // Check if toggleDocumentSelection function is accessible in window scope
        if (typeof (window as any).toggleDocumentSelection === 'function') {
          try {
            (window as any).toggleDocumentSelection('02a754f2-92fe-4742-a90a-6c577118ab4b');
            return { success: true, method: 'window.toggleDocumentSelection' };
          } catch (e) {
            console.error('Error calling toggleDocumentSelection:', e);
          }
        }
        
        // Try to click any file items or checkboxes we can find
        const fileItems = document.querySelectorAll('[class*="file-item"], [data-testid*="file-item"]');
        if (fileItems.length > 0) {
          (fileItems[0] as HTMLElement).click();
          return { success: true, method: 'fileItems[0].click()', count: fileItems.length };
        }
        
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        if (checkboxes.length > 0) {
          (checkboxes[0] as HTMLInputElement).click();
          return { success: true, method: 'checkboxes[0].click()', count: checkboxes.length };
        }
        
        return { success: false };
      });
      
      log(`Alternative document selection result: ${JSON.stringify(selectionResult)}`);
      
      // Take a screenshot after selection attempt
      await page.screenshot({ path: path.join(logsDir, 'after-alternative-selection.png'), fullPage: true });
    }
    
    // Step 4: Check if Quick Action buttons are enabled after all our attempts
    const finalButtonStates = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button')).filter(btn => {
        const text = (btn.textContent || '').toLowerCase();
        return text.includes('extract dates') || 
               text.includes('summarize document') || 
               text.includes('reply to letter') || 
               text.includes('prepare for court');
      });
      
      return buttons.map(btn => ({
        text: btn.textContent?.trim() || '',
        disabled: btn.disabled,
        ariaDisabled: btn.getAttribute('aria-disabled') === 'true',
        visible: btn.offsetParent !== null
      }));
    });
    
    log(`Final button states after selection attempts: ${JSON.stringify(finalButtonStates)}`);
    
    // Step 5: Try to click the Extract Dates button if it's enabled
    const extractButton = page.locator('button:has-text("Extract Dates")');
    if (await extractButton.isVisible()) {
      const isDisabled = await extractButton.isDisabled().catch(() => true);
      
      if (!isDisabled) {
        log('Extract Dates button is enabled, clicking it');
        await extractButton.click();
        log('Clicked Extract Dates button');
        
        // Wait for AI response
        await page.waitForTimeout(10000);
        await page.screenshot({ path: path.join(logsDir, 'after-extract-dates-click.png'), fullPage: true });
        
        // Check for AI response
        const aiResponse = await page.locator('[data-testid="ai-message"], .ai-message').isVisible().catch(() => false);
        log(`AI response visible: ${aiResponse}`);
        
        if (aiResponse) {
          const responseText = await page.locator('[data-testid="ai-message"], .ai-message').innerText();
          log(`Extract Dates result preview: ${responseText.substring(0, 200)}...`);
          
          // Step 6: Now try the Summarize Document quick action
          const summarizeButton = page.locator('button:has-text("Summarize Document")');
          const isSummarizeDisabled = await summarizeButton.isDisabled().catch(() => true);
          
          if (!isSummarizeDisabled) {
            log('Summarize Document button is enabled, clicking it');
            await summarizeButton.click();
            log('Clicked Summarize Document button');
            
            // Wait for AI response
            await page.waitForTimeout(10000);
            await page.screenshot({ path: path.join(logsDir, 'after-summarize-click.png'), fullPage: true });
            
            // Check for new AI response
            const allMessages = await page.locator('[data-testid="ai-message"], .ai-message').all();
            if (allMessages.length > 1) {
              const latestResponse = await allMessages[allMessages.length - 1].innerText();
              log(`Summarize Document result preview: ${latestResponse.substring(0, 200)}...`);
            } else {
              log('No new message found after Summarize Document action');
            }
          } else {
            log('Summarize Document button is disabled after Extract Dates');
          }
        } else {
          log('No AI response detected after Extract Dates action');
        }
      } else {
        log('Extract Dates button remains disabled despite document selection attempts');
      }
    } else {
      log('Extract Dates button not visible');
    }
    
    // Final summary
    log('Targeted document test completed');
    
    // Document the DOM structure to help debug the file selection issue
    const domStructure = await page.evaluate(() => {
      function describeNode(node, depth = 0) {
        if (!node) return '';
        
        const indent = ' '.repeat(depth * 2);
        let description = `${indent}${node.nodeName.toLowerCase()}`;
        
        if (node.id) description += `#${node.id}`;
        
        if (node.className && typeof node.className === 'string') {
          const classes = node.className.split(' ').filter(c => c.trim()).join('.');
          if (classes) description += `.${classes}`;
        }
        
        if (node.hasAttribute('data-testid')) {
          description += ` [data-testid="${node.getAttribute('data-testid')}"]`;
        }
        
        if (node.nodeType === 1 && (node.nodeName === 'INPUT' || node.nodeName === 'BUTTON')) {
          description += ` [${node.disabled ? 'disabled' : 'enabled'}]`;
          if (node.type === 'checkbox') {
            description += ` [${node.checked ? 'checked' : 'unchecked'}]`;
          }
        }
        
        // Don't include text content for brevity
        
        let childrenDescription = '';
        if (node.nodeType === 1) {
          for (let i = 0; i < node.childNodes.length; i++) {
            const childNode = node.childNodes[i];
            if (childNode.nodeType === 1) { // Element nodes only
              childrenDescription += describeNode(childNode, depth + 1);
            }
          }
        }
        
        return `\n${description}${childrenDescription}`;
      }
      
      // Focus on areas likely to contain file selection
      const significantAreas = [
        document.querySelector('.sidebar'), 
        document.querySelector('[data-testid="sidebar"]'),
        document.querySelector('aside'),
        document.querySelector('h2:contains("Client Documents")'),
        document.querySelector('h2:contains("Documents")'),
        // Find all file related sections
        ...Array.from(document.querySelectorAll('[class*="file"], [data-testid*="file"]'))
      ].filter(Boolean);
      
      if (significantAreas.length === 0) {
        // If no specific areas found, return the main content
        return describeNode(document.querySelector('main') || document.body);
      }
      
      // Return description of all significant areas
      return significantAreas.map(area => describeNode(area)).join('\n');
    });
    
    log('DOM Structure of key areas:');
    log(domStructure);
  });

  test('Directly Inject Selected Documents into Session Storage', async ({ page }) => {
    // Document IDs seen in the console logs
    const documentIds = [
      '02a754f2-92fe-4742-a90a-6c577118ab4b',
      '3dbac2dd-af9e-4bbc-a7a0-c0e4c319169e',
      'bdc63d1b-c11b-481f-9cae-7693a68ab92a'
    ];
    
    // Step 1: Login
    log('Starting login for session storage injection test');
    await page.goto('/login');
    
    // Fill login credentials
    await page.fill('input[type="email"], input[placeholder*="email" i]', 'mike@law.com');
    await page.fill('input[type="password"], input[placeholder*="password" i]', 'LAW_SNOW_801010');
    
    // Click login button
    await page.click('button[type="submit"], button:has-text("Sign In")');
    
    // Wait for login to complete and dashboard to load
    await page.waitForURL('**/lawyer/dashboard/**', { timeout: 30000 });
    log('Login successful, dashboard loaded');
    
    // Step 2: Navigate to AI Lawyer page
    await page.goto(`/lawyer/ai/${clientId}/${conversationId}`);
    log(`Navigated to AI Lawyer page: /lawyer/ai/${clientId}/${conversationId}`);
    await page.waitForTimeout(5000);
    log('AI Lawyer page loaded');
    
    // Take screenshot of initial state
    await page.screenshot({ path: path.join(logsDir, 'session-storage-initial.png'), fullPage: true });
    
    // Step 3: Check initial state of Quick Action buttons
    const initialButtonStates = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button')).filter(btn => {
        const text = (btn.textContent || '').toLowerCase();
        return text.includes('extract dates') || 
               text.includes('summarize document') || 
               text.includes('reply to letter') || 
               text.includes('prepare for court');
      });
      
      return buttons.map(btn => ({
        text: btn.textContent?.trim() || '',
        disabled: btn.disabled,
        ariaDisabled: btn.getAttribute('aria-disabled') === 'true',
        visible: btn.offsetParent !== null
      }));
    });
    
    log(`Initial button states: ${JSON.stringify(initialButtonStates)}`);
    
    // Step 4: Directly inject selected files into session storage
    const injectionResult = await page.evaluate((docId) => {
      try {
        // Create the key for selected documents in the current session
        const storageKey = 'selected_documents';
        
        // Log what's currently stored
        const currentValue = sessionStorage.getItem(storageKey);
        console.log(`Current session storage for ${storageKey}: ${currentValue}`);
        
        // Store the document ID in session storage
        sessionStorage.setItem(storageKey, JSON.stringify([docId]));
        console.log(`Injected document ID ${docId} into session storage`);
        
        // Verify the value was set
        const newValue = sessionStorage.getItem(storageKey);
        console.log(`Updated session storage for ${storageKey}: ${newValue}`);
        
        // Try to dispatch a storage event for the app to detect the change
        try {
          const event = new StorageEvent('storage', {
            key: storageKey,
            newValue: JSON.stringify([docId]),
            oldValue: currentValue,
            storageArea: sessionStorage
          });
          window.dispatchEvent(event);
          console.log('Dispatched storage event');
        } catch (e) {
          console.error('Error dispatching storage event:', e);
        }
        
        // If the app has a function for refreshing selected documents, try to call it
        if (typeof (window as any).refreshSelectedDocuments === 'function') {
          (window as any).refreshSelectedDocuments();
          console.log('Called refreshSelectedDocuments()');
        }
        
        // Try to find any React components that might need to update
        if (typeof (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ === 'object') {
          console.log('React DevTools hook found, React is running on this page');
        }
        
        return { 
          success: true, 
          newStorage: newValue,
          storageItemCount: Object.keys(sessionStorage).length,
          allStorageKeys: Object.keys(sessionStorage)
        };
      } catch (e) {
        console.error('Error injecting into session storage:', e);
        return { success: false, error: e.message };
      }
    }, documentIds[0]);
    
    log(`Session storage injection result: ${JSON.stringify(injectionResult)}`);
    
    // Step 5: Attempt to force a re-render or state update
    await page.evaluate(() => {
      // Try clicking somewhere on the page to trigger event handlers
      document.body.click();
      
      // Try to simulate a keypress
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      document.dispatchEvent(new KeyboardEvent('keyup', { key: 'a' }));
      
      // Try refreshing via history API without a full page reload
      const currentUrl = window.location.href;
      window.history.pushState({}, '', currentUrl + '?refresh=1');
      window.history.pushState({}, '', currentUrl);
      
      console.log('Attempted to force UI updates');
    });
    
    // Wait a moment for any state updates to apply
    await page.waitForTimeout(2000);
    
    // Alternatively, try a soft refresh
    await page.evaluate(() => {
      // Get a reference to the root React element if possible
      const rootElement = document.getElementById('root') || document.getElementById('app');
      console.log(`Found root element: ${rootElement ? 'Yes' : 'No'}`);
      
      // If we find the toggleDocumentSelection function, call it directly
      if (typeof (window as any).toggleDocumentSelection === 'function') {
        try {
          console.log('Found toggleDocumentSelection function, calling it');
          (window as any).toggleDocumentSelection('02a754f2-92fe-4742-a90a-6c577118ab4b');
          return { tried: 'toggleDocumentSelection' };
        } catch (e) {
          console.error('Error calling toggleDocumentSelection:', e);
        }
      }
      
      return { tried: 'refresh techniques' };
    });
    
    // Take screenshot after injection and refresh attempts
    await page.screenshot({ path: path.join(logsDir, 'after-session-storage-injection.png'), fullPage: true });
    
    // Step 6: Check if buttons are now enabled
    const updatedButtonStates = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button')).filter(btn => {
        const text = (btn.textContent || '').toLowerCase();
        return text.includes('extract dates') || 
               text.includes('summarize document') || 
               text.includes('reply to letter') || 
               text.includes('prepare for court');
      });
      
      return buttons.map(btn => ({
        text: btn.textContent?.trim() || '',
        disabled: btn.disabled,
        ariaDisabled: btn.getAttribute('aria-disabled') === 'true',
        visible: btn.offsetParent !== null
      }));
    });
    
    log(`Button states after injection: ${JSON.stringify(updatedButtonStates)}`);
    
    // Verify if session storage change had any effect
    const buttonStateChanged = JSON.stringify(initialButtonStates) !== JSON.stringify(updatedButtonStates);
    log(`Button state changed after injection: ${buttonStateChanged}`);
    
    // Step 7: Try direct method call to the handler for Extract Dates
    const directMethodResult = await page.evaluate(() => {
      try {
        // See if we can access the handler directly from the window/global scope
        if (typeof (window as any).handleQuickAction === 'function') {
          console.log('Found handleQuickAction function, calling it directly');
          (window as any).handleQuickAction('extract_dates');
          return { success: true, method: 'window.handleQuickAction' };
        }
        
        // Try to find action handlers on button elements
        const extractButton = Array.from(document.querySelectorAll('button')).find(
          btn => btn.textContent?.includes('Extract Dates')
        );
        
        if (extractButton) {
          // Look for onclick or similar handlers
          const hasHandler = extractButton.onclick || 
                            extractButton.getAttribute('onClick') || 
                            extractButton.getAttribute('data-action');
          
          if (hasHandler) {
            console.log('Found handler on Extract Dates button');
            return { foundHandler: true };
          }
          
          // Try to get React event handlers
          const reactKey = Object.keys(extractButton).find(key => key.startsWith('__reactEvents$'));
          if (reactKey) {
            console.log('Found React event handlers on Extract Dates button');
            return { foundReactHandler: true };
          }
          
          return { foundButton: true, noHandlers: true };
        }
        
        return { noButton: true };
      } catch (e) {
        return { error: e.message };
      }
    });
    
    log(`Direct method call result: ${JSON.stringify(directMethodResult)}`);
    
    // Step 8: Test direct URL triggering of extract dates action
    log('Testing direct URL parameters for quick actions');
    await page.goto(`/lawyer/ai/${clientId}/${conversationId}?action=extract_dates&documentId=${documentIds[0]}`);
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(logsDir, 'direct-url-action.png'), fullPage: true });
    
    // Check if this triggered any action
    const aiResponseVisible = await page.locator('[data-testid="ai-message"], .ai-message').isVisible().catch(() => false);
    log(`AI response visible after direct URL action: ${aiResponseVisible}`);
    
    if (aiResponseVisible) {
      const responseText = await page.locator('[data-testid="ai-message"], .ai-message').innerText();
      log(`Response from direct URL action: ${responseText.substring(0, 200)}...`);
    }
    
    // Final analysis
    log('Session storage injection test completed');
    log('Summary:');
    log(`- Session storage injection successful: ${injectionResult.success}`);
    log(`- Button state changed after injection: ${buttonStateChanged}`);
    log(`- Direct method call attempted: ${JSON.stringify(directMethodResult)}`);
    log(`- Direct URL action triggered response: ${aiResponseVisible}`);
    
    // Check the console logs to see what happened during our test
    const consoleLogs = await page.evaluate(() => {
      if (typeof (window as any).console_logs === 'object') {
        return (window as any).console_logs;
      }
      return null;
    });
    
    if (consoleLogs) {
      log('Found console logs from application:');
      log(JSON.stringify(consoleLogs).substring(0, 500) + '...');
    }
    
    // Capture any Redux state if available
    const reduxState = await page.evaluate(() => {
      if (typeof (window as any).__REDUX_STATE__ === 'object') {
        return (window as any).__REDUX_STATE__;
      }
      return null;
    });
    
    if (reduxState) {
      log('Found Redux state:');
      log(JSON.stringify(reduxState).substring(0, 500) + '...');
    }
  });

  test('Verify Document IDs Sent to Backend API', async ({ page }) => {
    // Document IDs seen in the console logs
    const documentIds = [
      '02a754f2-92fe-4742-a90a-6c577118ab4b',
      '3dbac2dd-af9e-4bbc-a7a0-c0e4c319169e',
      'bdc63d1b-c11b-481f-9cae-7693a68ab92a'
    ];
    
    // Step 1: Login
    log('Starting login for backend API test');
    await page.goto('/login');
    
    // Fill login credentials
    await page.fill('input[type="email"], input[placeholder*="email" i]', 'mike@law.com');
    await page.fill('input[type="password"], input[placeholder*="password" i]', 'LAW_SNOW_801010');
    
    // Click login button
    await page.click('button[type="submit"], button:has-text("Sign In")');
    
    // Wait for login to complete and dashboard to load
    await page.waitForURL('**/lawyer/dashboard/**', { timeout: 30000 });
    log('Login successful, dashboard loaded');
    
    // Step 2: Navigate to AI Lawyer page
    await page.goto(`/lawyer/ai/${clientId}/${conversationId}`);
    log(`Navigated to AI Lawyer page: /lawyer/ai/${clientId}/${conversationId}`);
    await page.waitForTimeout(5000);
    log('AI Lawyer page loaded');
    
    // Setup network request monitoring
    const apiRequests = [];
    page.on('request', request => {
      const url = request.url();
      // Filter for API requests
      if (url.includes('/api/') && request.method() === 'POST') {
        try {
          apiRequests.push({
            url,
            method: request.method(),
            headers: request.headers(),
            postData: request.postData()
          });
          log(`Captured API request to: ${url}`);
        } catch (e) {
          log(`Error capturing request details: ${e.message}`);
        }
      }
    });
    
    // Step 3: Get the initial state
    const initialState = await page.evaluate(() => {
      return {
        // Check session storage
        selectedDocuments: JSON.parse(sessionStorage.getItem('selected_documents') || 'null'),
        allStorageKeys: Object.keys(sessionStorage),
        
        // Check if quick action handlers exist
        hasHandleQuickAction: typeof (window as any).handleQuickAction === 'function',
        hasToggleDocumentSelection: typeof (window as any).toggleDocumentSelection === 'function',
        
        // Check quick action buttons
        quickActionButtons: Array.from(document.querySelectorAll('button'))
          .filter(btn => {
            const text = (btn.textContent || '').toLowerCase();
            return text.includes('extract dates') || 
                   text.includes('summarize document') || 
                   text.includes('reply to letter') || 
                   text.includes('prepare for court');
          })
          .map(btn => ({
            text: btn.textContent?.trim() || '',
            disabled: btn.disabled,
            visible: btn.offsetParent !== null
          }))
      };
    });
    
    log(`Initial state: ${JSON.stringify(initialState)}`);
    
    // Step 4: Try to access the AILawyerPageNew component's internal state directly
    const componentState = await page.evaluate(() => {
      // Try to access the React fiber tree to get component state
      try {
        // First attempt to find the root element
        const root = document.getElementById('root') || document.getElementById('app');
        if (!root) return { error: 'No root element found' };
        
        // Get the React internal instance
        const key = Object.keys(root).find(key => key.startsWith('__reactInternalInstance$'));
        if (!key) return { error: 'No React internal instance found' };
        
        // Get fiber node
        const internalInstance = root[key];
        if (!internalInstance) return { error: 'Internal instance is null' };
        
        // Try to find the AILawyerPageNew component
        let fiber = internalInstance;
        let found = false;
        let path = [];
        
        // Try to extract state from debugger
        const reactDevTools = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
        if (reactDevTools) {
          return { reactDevToolsFound: true };
        }
        
        return { error: 'Could not access component state directly' };
      } catch (e) {
        return { error: e.message };
      }
    });
    
    log(`Component state access attempt: ${JSON.stringify(componentState)}`);
    
    // Step 5: Inject document ID directly into the state and monitor API calls
    log('Attempting to modify state and trigger an API call with documents');
    
    // First try to call toggleDocumentSelection if it exists
    if (initialState.hasToggleDocumentSelection) {
      log('Found toggleDocumentSelection function, calling it directly');
      
      await page.evaluate((docId) => {
        console.log(`Calling toggleDocumentSelection with document ID: ${docId}`);
        (window as any).toggleDocumentSelection(docId);
      }, documentIds[0]);
      
      // Take screenshot after toggling selection
      await page.screenshot({ path: path.join(logsDir, 'after-direct-toggle.png'), fullPage: true });
      
      // Check if the state was updated
      const afterToggleState = await page.evaluate(() => {
        return {
          selectedDocuments: JSON.parse(sessionStorage.getItem('selected_documents') || 'null'),
          buttonStates: Array.from(document.querySelectorAll('button'))
            .filter(btn => {
              const text = (btn.textContent || '').toLowerCase();
              return text.includes('extract dates');
            })
            .map(btn => ({
              text: btn.textContent?.trim() || '',
              disabled: btn.disabled
            }))
        };
      });
      
      log(`State after toggle: ${JSON.stringify(afterToggleState)}`);
      
      // Try to click the Extract Dates button if it exists and is enabled
      const extractButton = page.locator('button:has-text("Extract Dates")');
      if (await extractButton.isVisible()) {
        const isDisabled = await extractButton.isDisabled().catch(() => true);
        
        if (!isDisabled) {
          log('Extract Dates button is enabled, clicking it');
          
          // Start monitoring network traffic more intensely
          const requestPayloads = [];
          page.on('request', async request => {
            if (request.url().includes('/api/') && request.method() === 'POST') {
              try {
                const postData = request.postData();
                if (postData) {
                  const parsedData = JSON.parse(postData);
                  requestPayloads.push({
                    url: request.url(),
                    data: parsedData
                  });
                  
                  // Check if any document IDs are included in the request
                  if (parsedData.documentIds || parsedData.documents || parsedData.documentId || parsedData.file_ids) {
                    log('Found document IDs in the request payload:');
                    log(JSON.stringify(parsedData));
                  }
                }
              } catch (e) {
                // Ignore parsing errors
              }
            }
          });
          
          // Click the button
          await extractButton.click();
          log('Clicked Extract Dates button');
          
          // Wait for any API requests to be sent
          await page.waitForTimeout(5000);
          
          // Take screenshot after clicking
          await page.screenshot({ path: path.join(logsDir, 'after-clicking-extract-dates.png'), fullPage: true });
          
          // Log any captured payloads
          log(`Captured ${requestPayloads.length} request payloads after clicking Extract Dates`);
          requestPayloads.forEach((payload, i) => {
            log(`Request #${i+1} to ${payload.url}:`);
            log(JSON.stringify(payload.data).substring(0, 500));
          });
        } else {
          log('Extract Dates button is disabled');
        }
      } else {
        log('Extract Dates button not found');
      }
    } else {
      log('toggleDocumentSelection function not found in window scope');
    }
    
    // Step 6: Try an alternative approach - modify the DOM directly
    log('Trying alternative approach - manipulating DOM and intercepting requests');
    
    // Establish request interception to monitor for document IDs being sent
    const networkRequests = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/ai') || url.includes('/extract_dates') || url.includes('/summarize')) {
        try {
          const postData = request.postData();
          networkRequests.push({
            url,
            method: request.method(),
            postData
          });
          log(`Intercepted request to ${url}`);
          if (postData) {
            log(`Request data: ${postData.substring(0, 200)}...`);
          }
        } catch (e) {
          log(`Error capturing request: ${e.message}`);
        }
      }
    });
    
    // Try to directly execute handleQuickAction with document IDs
    if (initialState.hasHandleQuickAction) {
      log('Found handleQuickAction function, trying to call it with document IDs');
      
      const handleQuickActionResult = await page.evaluate((docId) => {
        try {
          console.log(`Calling handleQuickAction with document ID: ${docId}`);
          // First try session storage setup
          sessionStorage.setItem('selected_documents', JSON.stringify([docId]));
          // Then call handleQuickAction
          (window as any).handleQuickAction('extract_dates');
          return { success: true };
        } catch (e) {
          console.error('Error calling handleQuickAction:', e);
          return { error: e.message };
        }
      }, documentIds[0]);
      
      log(`handleQuickAction direct call result: ${JSON.stringify(handleQuickActionResult)}`);
      
      // Wait for any API requests to complete
      await page.waitForTimeout(5000);
    } else {
      log('handleQuickAction not found in window scope');
    }
    
    // Step 7: Navigate with URL parameters as a last resort
    log('Trying URL parameters for quick action with document ID');
    
    const navUrl = `/lawyer/ai/${clientId}/${conversationId}?action=extract_dates&documentIds=${documentIds[0]}`;
    await page.goto(navUrl);
    log(`Navigated to: ${navUrl}`);
    await page.waitForTimeout(5000);
    
    // Check if any API request was sent with document IDs
    log(`Network requests captured: ${networkRequests.length}`);
    
    // Step 8: Check if we can deduce how the app sends document IDs to the backend
    // Look at available functions and their parameters in window scope
    const availableFunctions = await page.evaluate(() => {
      const functions = [];
      
      // Try to find relevant functions in window scope
      for (const key in window) {
        try {
          const value = window[key];
          if (typeof value === 'function') {
            // Convert function to string to inspect parameters
            const fnStr = value.toString();
            if (fnStr.includes('document') || fnStr.includes('file') || 
                fnStr.includes('extract') || fnStr.includes('action')) {
              functions.push({
                name: key,
                params: fnStr.substring(0, fnStr.indexOf('{')).trim()
              });
            }
          }
        } catch (e) {
          // Skip inaccessible properties
        }
      }
      
      // Try to identify any API client or service
      const hasApiClient = typeof (window as any).apiClient === 'object';
      const hasAiService = typeof (window as any).aiService === 'object';
      
      return {
        functions,
        hasApiClient,
        hasAiService
      };
    });
    
    log(`Available functions that might send document IDs: ${JSON.stringify(availableFunctions)}`);
    
    // Final analysis
    log('Backend API test completed');
    log('Summary:');
    log(`- toggleDocumentSelection function available: ${initialState.hasToggleDocumentSelection}`);
    log(`- handleQuickAction function available: ${initialState.hasHandleQuickAction}`);
    log(`- API requests captured: ${apiRequests.length}`);
    log(`- Network requests to AI endpoints: ${networkRequests.length}`);
    
    // Export the network request data to a file for further analysis
    if (apiRequests.length > 0 || networkRequests.length > 0) {
      const requestsData = JSON.stringify({ apiRequests, networkRequests }, null, 2);
      fs.writeFileSync(path.join(logsDir, 'api-requests.json'), requestsData);
      log('Exported API requests data to api-requests.json for further analysis');
    }
    
    log('Document IDs that should be sent to backend:');
    documentIds.forEach(id => log(`- ${id}`));
  });
}); 