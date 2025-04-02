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

test('Test document selection for AI quick actions', async ({ page }) => {
  await logTestStatus(page, 'Document Selection Test', 'start');
  
  // Navigate to the login page
  await page.goto('http://localhost:8080/login');
  
  // Fill login credentials
  await page.fill('input[type="email"], input[placeholder*="email" i]', 'mike@law.com');
  await page.fill('input[type="password"], input[placeholder*="password" i]', 'LAW_SNOW_801010');
  await page.click('button[type="submit"], button:has-text("Sign In")');
  
  // Wait for login to complete and dashboard to load
  await page.waitForTimeout(5000);
  
  // Extract UUID from dashboard URL
  const dashboardUrl = page.url();
  const uuidMatch = dashboardUrl.match(/\/dashboard\/([0-9a-f-]+)/);
  let userUuid = '';
  let clientUuid = '';
  
  if (uuidMatch && uuidMatch[1]) {
    userUuid = uuidMatch[1];
    await logTestStatus(null, 'Document Selection Test', 'progress', `User UUID: ${userUuid}`);
  }
  
  // Navigate to the clients page
  await page.goto('http://localhost:8080/lawyer/clients');
  await page.waitForTimeout(3000);
  
  // Find any client UUID
  const clientUuids = await page.evaluate(() => {
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const links = Array.from(document.querySelectorAll('a'));
    const uuids = new Set();
    
    links.forEach(link => {
      if (link.href) {
        const match = link.href.match(uuidPattern);
        if (match) {
          uuids.add(match[0]);
        }
      }
    });
    
    return Array.from(uuids);
  });
  
  if (clientUuids.length > 0) {
    clientUuid = clientUuids[0];
    await logTestStatus(null, 'Document Selection Test', 'progress', `Found client UUID: ${clientUuid}`);
  } else {
    // Use a known client ID as fallback
    clientUuid = '664f725c-33d9-4b67-99f7-063d73beeb66';
    await logTestStatus(null, 'Document Selection Test', 'progress', `Using fallback client UUID: ${clientUuid}`);
  }
  
  // Navigate to the client documents page - try different possible URL patterns
  await logTestStatus(page, 'Document Selection Test', 'progress', 'Trying to navigate to client documents page');
  
  // Try first URL pattern: direct client page
  await page.goto(`http://localhost:8080/lawyer/client/${clientUuid}`);
  await page.waitForTimeout(3000);
  
  // Check if we're on the documents page by looking for document-related elements
  let documentsFound = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('*'))
      .some(el => {
        const text = el.textContent?.toLowerCase() || '';
        return (text.includes('document') || text.includes('file')) && 
               (text.includes('list') || text.includes('upload') || text.includes('view'));
      });
  });
  
  if (!documentsFound) {
    // Try second pattern: documents tab
    await page.goto(`http://localhost:8080/lawyer/clients/${clientUuid}/documents`);
    await page.waitForTimeout(3000);
    
    documentsFound = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('*'))
        .some(el => {
          const text = el.textContent?.toLowerCase() || '';
          return (text.includes('document') || text.includes('file')) && 
                 (text.includes('list') || text.includes('upload') || text.includes('view'));
        });
    });
  }
  
  if (!documentsFound) {
    // Try third pattern: direct documents page
    await page.goto(`http://localhost:8080/lawyer/documents/${clientUuid}`);
    await page.waitForTimeout(3000);
  }
  
  await logTestStatus(page, 'Document Selection Test', 'progress', `Current URL after document page navigation: ${page.url()}`);
  
  // Look for document checkboxes or selection elements
  const documentSelectionElements = await page.evaluate(() => {
    // Look for elements that might be document selection controls
    const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'))
      .filter(cb => {
        const closest = (cb as HTMLElement).closest('div, tr, li');
        if (closest) {
          const text = closest.textContent?.toLowerCase() || '';
          return text.includes('document') || text.includes('file') || text.includes('.pdf') || 
                 text.includes('.doc') || text.includes('.txt');
        }
        return false;
      });
    
    // Look for clickable document links/elements
    const documentLinks = Array.from(document.querySelectorAll('a, div[role="button"], button'))
      .filter(el => {
        const text = el.textContent?.toLowerCase() || '';
        return (text.includes('.pdf') || text.includes('.doc') || text.includes('.txt')) ||
               ((text.includes('document') || text.includes('file')) && 
                (text.includes('view') || text.includes('select') || text.includes('open')));
      })
      .map(el => ({
        text: el.textContent?.trim(),
        tag: el.tagName.toLowerCase()
      }));
    
    return {
      checkboxes: checkboxes.length,
      documentLinks: documentLinks
    };
  });
  
  await logTestStatus(page, 'Document Selection Test', 'progress', 
    `Found ${documentSelectionElements.checkboxes} document checkboxes and ` +
    `${documentSelectionElements.documentLinks.length} document links`
  );
  
  // If we found document links, try clicking the first one
  if (documentSelectionElements.documentLinks.length > 0) {
    const firstDocLink = documentSelectionElements.documentLinks[0];
    await logTestStatus(page, 'Document Selection Test', 'progress', `Attempting to click document: ${firstDocLink.text}`);
    
    try {
      await page.click(`${firstDocLink.tag}:has-text("${firstDocLink.text}")`);
      await page.waitForTimeout(3000);
      
      await logTestStatus(page, 'Document Selection Test', 'progress', `Clicked document, current URL: ${page.url()}`);
    } catch (error) {
      await logTestStatus(page, 'Document Selection Test', 'error', `Error clicking document: ${error}`);
    }
  } else if (documentSelectionElements.checkboxes > 0) {
    // If checkboxes were found, try to select the first one
    await logTestStatus(page, 'Document Selection Test', 'progress', 'Attempting to check document checkbox');
    
    try {
      // Find and click the first checkbox related to documents
      await page.evaluate(() => {
        const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'))
          .filter(cb => {
            const closest = (cb as HTMLElement).closest('div, tr, li');
            if (closest) {
              const text = closest.textContent?.toLowerCase() || '';
              return text.includes('document') || text.includes('file') || text.includes('.pdf') || 
                    text.includes('.doc') || text.includes('.txt');
            }
            return false;
          });
        
        if (checkboxes.length > 0) {
          (checkboxes[0] as HTMLInputElement).checked = true;
          const event = new Event('change', { bubbles: true });
          checkboxes[0].dispatchEvent(event);
          return true;
        }
        return false;
      });
      
      await page.waitForTimeout(1000);
      await logTestStatus(page, 'Document Selection Test', 'progress', 'Document checkbox selected');
    } catch (error) {
      await logTestStatus(page, 'Document Selection Test', 'error', `Error selecting document checkbox: ${error}`);
    }
  }
  
  // Now navigate to the AI Lawyer page to see if document selection affected the UI
  await page.goto(`http://localhost:8080/lawyer/ai/${clientUuid}`);
  await page.waitForTimeout(5000);
  
  // Check for quick action buttons status
  const quickActionStatus = await page.evaluate(() => {
    // Find all quick action buttons
    const quickActionButtons = Array.from(document.querySelectorAll('button'))
      .filter(button => {
        const text = button.textContent?.toLowerCase() || '';
        return text.includes('extract') || text.includes('summarize') || 
               text.includes('reply') || text.includes('prepare');
      });
    
    return quickActionButtons.map(button => ({
      text: button.textContent?.trim() || '',
      isEnabled: !(button as HTMLButtonElement).disabled,
      isVisible: button.offsetParent !== null
    }));
  });
  
  await logTestStatus(page, 'Document Selection Test', 'progress', 
    `Quick action buttons status: ${JSON.stringify(quickActionStatus, null, 2)}`
  );
  
  // Try clicking any enabled quick action button
  const enabledButtons = quickActionStatus.filter(button => button.isEnabled && button.isVisible);
  if (enabledButtons.length > 0) {
    const buttonToClick = enabledButtons[0];
    await logTestStatus(page, 'Document Selection Test', 'progress', `Attempting to click "${buttonToClick.text}" button`);
    
    try {
      await page.click(`button:has-text("${buttonToClick.text}")`);
      await page.waitForTimeout(10000);
      
      // Check if any response appeared
      const response = await page.evaluate(() => {
        const responseElements = document.querySelectorAll('.response, .ai-response, .result, .output');
        return responseElements.length > 0 ? 
          Array.from(responseElements).map(el => el.textContent?.trim()).join('\n') : 
          '';
      });
      
      if (response) {
        await logTestStatus(page, 'Document Selection Test', 'progress', `Received response: ${response.substring(0, 200)}...`);
      } else {
        await logTestStatus(page, 'Document Selection Test', 'progress', 'No response detected');
      }
    } catch (error) {
      await logTestStatus(page, 'Document Selection Test', 'error', `Error clicking button: ${error}`);
    }
  }
  
  await logTestStatus(page, 'Document Selection Test', 'complete');
}); 