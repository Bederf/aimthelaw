import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

// Get dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * End-to-End test for AI Lawyer Quick Actions
 * 
 * This test suite verifies that:
 * 1. The AI Lawyer page loads correctly
 * 2. Documents can be selected and uploaded
 * 3. Quick actions can be triggered (Extract Dates, Summarize Document, etc.)
 * 4. The AI responds correctly to each action
 * 5. Text-to-speech functionality works with the quick action response
 * 
 * Prerequisites:
 * - Frontend running on localhost:8080
 * - Backend API available and configured
 * - Test user account with proper permissions
 */
test.describe('AI Lawyer Quick Actions', () => {
  // Create a sample test PDF for uploading
  const testFilesDir = path.join(__dirname, 'test-files');
  const samplePdfPath = path.join(testFilesDir, 'test-contract.pdf');
  let clientId: string; // Will be populated during test setup
  let documentId: string; // Will track the uploaded document ID
  
  test.beforeAll(async () => {
    // Ensure test files directory exists
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true });
    }
    
    // Create a simple test PDF with mock contract text containing dates and key terms
    if (!fs.existsSync(samplePdfPath)) {
      // A more comprehensive PDF content with dates and key terms for testing quick actions
      const pdfContent = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj
4 0 obj<</Length 543>>stream
BT /F1 12 Tf 50 800 Td (CONTRACT AGREEMENT) Tj
0 -30 Td (Between Company A and Company B) Tj
0 -30 Td (Effective Date: January 15, 2023) Tj
0 -30 Td (Term: This Agreement shall commence on January 15, 2023 and) Tj
0 -20 Td (continue until December 31, 2024, unless terminated earlier.) Tj
0 -30 Td (Payment Terms: Company B shall pay Company A the amount of) Tj
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
      
      fs.writeFileSync(samplePdfPath, pdfContent);
      console.log('Created test contract PDF for quick action testing');
    }
  });

  test.beforeEach(async ({ page }) => {
    // Setup: Navigate to the login page and authenticate
    await page.goto('/login');
    
    // Fill login credentials
    await page.fill('input[type="email"], input[placeholder*="email" i]', 'mike@law.com');
    await page.fill('input[type="password"], input[placeholder*="password" i]', 'LAW_SNOW_801010');
    
    // Click login button
    await page.click('button[type="submit"], button:has-text("Sign In")');
    
    // Wait for navigation to complete and dashboard to load
    await page.waitForURL('**/lawyer/dashboard/**');
    console.log('Logged in successfully, dashboard loaded');
    
    // Navigate to the clients list
    await page.goto('/lawyer/clients');
    console.log('Navigated to clients list');
    
    // Wait for clients list to load
    await page.waitForTimeout(3000);

    // Business ID for client reference (for UI selection)
    const clientBusinessId = 'CLI_BOSMAN_700809';
    console.log(`Looking for client with business ID: ${clientBusinessId}`);
    
    // Find and click on the client in the table
    try {
      // Try to find the client by business ID in table rows
      await page.click(`tr:has-text("${clientBusinessId}")`);
      console.log(`Clicked on row for client ${clientBusinessId}`);
    } catch (e) {
      // If not found in a table, try direct navigation
      console.log(`Client row not found, navigating directly to client page`);
      await page.goto(`/lawyer/client/${clientBusinessId}`);
    }
    
    // Wait for client page to load
    await page.waitForTimeout(3000);
    
    // Extract the client UUID from the URL
    const currentUrl = page.url();
    const uuidMatch = currentUrl.match(/\/client\/([0-9a-f-]+)/i) || currentUrl.match(/\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    
    if (uuidMatch && uuidMatch[1]) {
      clientId = uuidMatch[1];
      console.log(`Extracted client UUID from URL: ${clientId}`);
    } else {
      // Fallback to business ID if UUID not found
      clientId = clientBusinessId;
      console.log(`Could not extract UUID, using business ID: ${clientId}`);
    }
    
    // Look for and click on the AI Lawyer / AI Assistant button
    try {
      // Try finding the button by text - various possible labels
      const aiButtonSelector = [
        'button:has-text("AI Lawyer")', 
        'button:has-text("AI Assistant")', 
        'button:has-text("Analyze with AI")',
        'a:has-text("AI-Powered Legal Assistant")',
        'a:has-text("AI Lawyer")',
        '[data-testid="ai-lawyer-button"]'
      ].join(', ');
      
      await page.click(aiButtonSelector);
      console.log('Clicked AI Lawyer button on client page');
    } catch (e) {
      // If button not found, navigate directly to AI Lawyer page for this client
      console.log('AI button not found, navigating directly to AI Lawyer page');
      await page.goto(`/lawyer/ai/${clientId}`);
    }
    
    // Wait for the AI Lawyer page to load completely
    try {
      await page.waitForSelector('[data-testid="ai-lawyer-page"]', { timeout: 10000 });
      console.log('AI Lawyer page loaded');
    } catch (e) {
      console.log('AI Lawyer page element not found, but continuing with test');
      await page.waitForTimeout(5000); // Wait a bit to ensure page has loaded
    }
  });

  test('Document upload and selection', async ({ page }) => {
    // Ensure file upload section is visible
    await page.waitForSelector('[data-testid="file-section"]', { timeout: 5000 });
    
    // Find the file upload input and upload our test document
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(samplePdfPath);
    
    // Click the upload button
    await page.click('[data-testid="upload-button"]');
    
    // Wait for the upload to complete and document to appear in the list
    await page.waitForSelector('[data-testid^="file-item-"]', { timeout: 15000 });
    
    // Capture the document ID from the rendered document item
    const documentElement = await page.locator('[data-testid^="file-item-"]').first();
    const dataTestId = await documentElement.getAttribute('data-testid');
    documentId = dataTestId?.replace('file-item-', '') || '';
    
    console.log(`Uploaded document ID: ${documentId}`);
    expect(documentId).toBeTruthy();
    
    // Select the document by clicking its checkbox
    await page.click(`[data-testid="file-checkbox-${documentId}"]`);
    
    // Verify that the document is selected
    await expect(page.locator(`[data-testid="file-checkbox-${documentId}"]`)).toBeChecked();
  });

  test('Extract Dates quick action', async ({ page }) => {
    // Skip if no document ID is available
    if (!documentId) {
      test.skip('No document available for testing');
    }
    
    // Select the document if not already selected
    const checkbox = page.locator(`[data-testid="file-checkbox-${documentId}"]`);
    if (await checkbox.isVisible() && !(await checkbox.isChecked())) {
      await checkbox.check();
    }
    
    // Open the quick actions menu
    await page.click('[data-testid="quick-actions-button"]');
    
    // Click the 'Extract Dates' action
    await page.click('[data-testid="quick-action-extract-dates"]');
    
    // Wait for AI response to load
    await page.waitForSelector('[data-testid="ai-message"]', { timeout: 30000 });
    const aiMessage = await page.locator('[data-testid="ai-message"]').innerText();
    
    // Verify the response contains date information
    expect(aiMessage).toContain('January 15, 2023');
    expect(aiMessage).toContain('December 31, 2024');
    
    // Verify text-to-speech component appears
    await page.waitForSelector('[data-testid="text-to-speech-container"]');
    
    // Verify the TTS play button exists
    await expect(page.locator('[data-testid="tts-play-button"]')).toBeVisible();
  });

  test('Summarize Document quick action', async ({ page }) => {
    // Skip if no document ID is available
    if (!documentId) {
      test.skip('No document available for testing');
    }
    
    // Select the document if not already selected
    const checkbox = page.locator(`[data-testid="file-checkbox-${documentId}"]`);
    if (await checkbox.isVisible() && !(await checkbox.isChecked())) {
      await checkbox.check();
    }
    
    // Open the quick actions menu
    await page.click('[data-testid="quick-actions-button"]');
    
    // Click the 'Summarize Document' action
    await page.click('[data-testid="quick-action-summarize-document"]');
    
    // Wait for AI response to load
    await page.waitForSelector('[data-testid="ai-message"]', { timeout: 30000 });
    const aiMessage = await page.locator('[data-testid="ai-message"]').innerText();
    
    // Verify the response contains summary information
    expect(aiMessage).toContain('contract');
    expect(aiMessage).toContain('agreement');
    
    // Verify text-to-speech component appears
    await page.waitForSelector('[data-testid="text-to-speech-container"]');
    
    // Verify the TTS play button exists
    await expect(page.locator('[data-testid="tts-play-button"]')).toBeVisible();
  });

  test('Reply to Letter quick action', async ({ page }) => {
    // Skip if no document ID is available
    if (!documentId) {
      test.skip('No document available for testing');
    }
    
    // Select the document if not already selected
    const checkbox = page.locator(`[data-testid="file-checkbox-${documentId}"]`);
    if (await checkbox.isVisible() && !(await checkbox.isChecked())) {
      await checkbox.check();
    }
    
    // Open the quick actions menu
    await page.click('[data-testid="quick-actions-button"]');
    
    // Click the 'Reply to Letter' action
    await page.click('[data-testid="quick-action-reply-to-letter"]');
    
    // Wait for AI response to load
    await page.waitForSelector('[data-testid="ai-message"]', { timeout: 30000 });
    const aiMessage = await page.locator('[data-testid="ai-message"]').innerText();
    
    // Verify the response contains reply content
    expect(aiMessage).toContain('Dear');
    expect(aiMessage).toContain('Sincerely');
    
    // Verify text-to-speech component appears
    await page.waitForSelector('[data-testid="text-to-speech-container"]');
    
    // Verify the TTS play button exists
    await expect(page.locator('[data-testid="tts-play-button"]')).toBeVisible();
  });

  test('Text-to-speech voice selection', async ({ page }) => {
    // Skip if no document ID is available
    if (!documentId) {
      test.skip('No document available for testing');
    }
    
    // Select the document if not already selected
    const checkbox = page.locator(`[data-testid="file-checkbox-${documentId}"]`);
    if (await checkbox.isVisible() && !(await checkbox.isChecked())) {
      await checkbox.check();
    }
    
    // Open the quick actions menu
    await page.click('[data-testid="quick-actions-button"]');
    
    // Click the 'Extract Dates' action
    await page.click('[data-testid="quick-action-extract-dates"]');
    
    // Wait for AI response to load
    await page.waitForSelector('[data-testid="ai-message"]', { timeout: 30000 });
    
    // Verify text-to-speech component appears
    await page.waitForSelector('[data-testid="text-to-speech-container"]');
    
    // Expand the TTS options if they're not visible
    const ttsOptions = page.locator('[data-testid="tts-options-button"]');
    if (await ttsOptions.isVisible()) {
      await ttsOptions.click();
    }
    
    // Open the voice selection dropdown if it exists
    const voiceSelect = page.locator('[data-testid="tts-voice-select"]');
    if (await voiceSelect.isVisible()) {
      await voiceSelect.click();
      
      // Select a different voice (e.g., 'echo')
      await page.click('[data-testid="tts-voice-echo"]');
      
      // Verify the voice selection changed
      await expect(voiceSelect).toContainText('Echo');
    } else {
      // If dropdown isn't visible, check for the compact voice indicator
      const voiceIndicator = page.locator('[data-testid="tts-voice-indicator"]');
      await expect(voiceIndicator).toBeVisible();
      
      // Default voice should be 'Alloy'
      await expect(voiceIndicator).toContainText('Alloy');
    }
  });

  test.afterAll(async () => {
    // Clean up - In a real implementation you might want to delete the test client and documents
    console.log('Test completed, cleaning up resources...');
  });
}); 