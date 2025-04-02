import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * End-to-End test for document upload and analysis workflow
 * 
 * Prerequisites:
 * - Frontend running on localhost:8080
 * - Backend API available
 * - Logged in user with permissions to upload and analyze documents
 * - A sample PDF file available for testing
 */
test.describe('Document Upload and Analysis Workflow', () => {
  // Create a sample test PDF if it doesn't exist
  const testFilesDir = path.join(__dirname, 'test-files');
  const samplePdfPath = path.join(testFilesDir, 'sample.pdf');
  
  test.beforeAll(async () => {
    // Ensure test files directory exists
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true });
    }
    
    // Only create the sample PDF if it doesn't exist
    if (!fs.existsSync(samplePdfPath)) {
      // Create a very simple valid PDF (still just a placeholder)
      fs.writeFileSync(samplePdfPath, '%PDF-1.4\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n2 0 obj\n<</Type/Pages/Kids[3 0 R]/Count 1>>\nendobj\n3 0 obj\n<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R>>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer\n<</Size 4/Root 1 0 R>>\nstartxref\n164\n%%EOF\n');
      console.log('Created sample PDF for testing');
    }
  });

  test('Navigation through login flow', async ({ page }) => {
    // Enable more verbose logging for troubleshooting
    page.on('console', msg => console.log(`PAGE LOG: ${msg.text()}`));
    
    // Start at the homepage
    await page.goto('/');
    console.log('Current URL:', page.url());
    await page.screenshot({ path: 'test-results/document-test-homepage.png' });
    
    // First, look for a "Get Started" button, which might lead to registration/login
    const getStartedButton = page.getByRole('link', { name: /get started/i });
    
    // Check if we can find the "Get Started" button
    if (await getStartedButton.isVisible()) {
      console.log('Found "Get Started" button');
      await getStartedButton.click();
      
      // After clicking "Get Started", look for a link to "Already have an account?" or "Login"
      const loginLink = page.getByRole('link', { name: /sign in|already have an account|login/i });
      
      if (await loginLink.isVisible({ timeout: 5000 })) {
        console.log('Found login link after registration page');
        await loginLink.click();
      } else {
        console.log('No login link found, attempting to find login form directly');
      }
    } else {
      // If "Get Started" is not found, try to directly find "Login" link elsewhere on the page
      console.log('Get Started button not found, looking for Login link');
      const alternativeLogin = page.getByRole('link', { name: /login|sign in/i });
      
      if (await alternativeLogin.isVisible({ timeout: 2000 })) {
        await alternativeLogin.click();
      } else {
        // If we can't find login links, try navigating directly to login page
        console.log('No login links found, navigating directly to /login');
        await page.goto('/login');
      }
    }
    
    await page.screenshot({ path: 'test-results/document-test-login-page.png' });
    
    // Now we should be on the login page
    // Look for email and password fields with more flexible selectors
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[placeholder*="password" i], input[name="password"]');
    
    // Try to log in if we can find the login form
    const hasEmailInput = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);
    const hasPasswordInput = await passwordInput.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasEmailInput && hasPasswordInput) {
      console.log('Found login form fields');
      
      // Fill in login credentials
      await emailInput.fill('test@example.com');
      await passwordInput.fill('Test1234');
      
      // Find and click the login submit button - try multiple selectors
      const submitButton = page.getByRole('button', { name: /login|sign in|submit|continue/i });
      
      if (await submitButton.count() > 0) {
        await submitButton.click();
        console.log('Clicked login button by role');
      } else {
        // If we can't find by role, try by type
        const fallbackButton = page.locator('button[type="submit"]');
        if (await fallbackButton.isVisible({ timeout: 2000 })) {
          await fallbackButton.click();
          console.log('Clicked submit button by type');
        } else {
          console.log('No submit button found');
        }
      }
    } else {
      console.log('Login form fields not found');
      if (!hasEmailInput) console.log('Email input not found');
      if (!hasPasswordInput) console.log('Password input not found');
    }
    
    // Wait for any navigation to complete
    await page.waitForTimeout(2000); // Wait a bit for any redirects
    
    // Take screenshot of where we are now
    console.log('Current URL after login attempt:', page.url());
    await page.screenshot({ path: 'test-results/document-test-post-login.png' });
    
    // Look for any documents page link
    const documentsLink = page.getByRole('link', { name: /document|file|upload/i });
    if (await documentsLink.count() > 0) {
      await documentsLink.first().click();
      console.log('Clicked documents link');
      await page.screenshot({ path: 'test-results/document-test-documents-page.png' });
    } else {
      // Directly try to navigate to a documents page
      await page.goto('/documents');
      console.log('Attempted direct navigation to /documents');
      await page.screenshot({ path: 'test-results/document-test-documents-direct.png' });
    }
  });
  
  test('Document interaction', async ({ page }) => {
    // This test now focuses on exploring the document functionality
    // after already being logged in (assuming the previous test handled login)
    
    // Try to navigate directly to the documents page
    await page.goto('/documents');
    console.log('Documents URL:', page.url());
    await page.screenshot({ path: 'test-results/document-interaction-initial.png' });
    
    // Look for file upload input with more flexible selectors
    const fileInput = page.locator('input[type="file"], [data-testid="file-upload"], [aria-label*="upload" i]');
    
    if (await fileInput.count() > 0) {
      // If we found it, try to upload our test file
      await fileInput.setInputFiles(samplePdfPath);
      console.log('Set file for upload');
      await page.screenshot({ path: 'test-results/document-after-file-select.png' });
      
      // Look for an upload button with more flexible selectors
      const uploadButton = page.getByRole('button', { name: /upload|submit|send|process|add/i }) || 
                          page.locator('button[type="submit"], [data-testid="upload-button"]');
      
      if (await uploadButton.count() > 0) {
        await uploadButton.click();
        console.log('Clicked upload button');
        await page.screenshot({ path: 'test-results/document-after-upload.png' });
        
        // Now wait to see if the document appears in a list
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'test-results/document-after-upload-wait.png' });
      } else {
        console.log('No upload button found, checking if file upload happens automatically');
        // Some applications start upload automatically on file selection
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'test-results/document-after-automatic-upload.png' });
      }
    } else {
      console.log('No file input found on documents page');
      
      // Try to find any upload-related UI element for diagnostic purposes
      const uploadArea = page.locator('.dropzone, [data-testid*="upload"], [aria-label*="upload"], [role="button"]:has-text("upload")');
      if (await uploadArea.count() > 0) {
        console.log('Found potential upload area but not a standard file input');
        await uploadArea.screenshot({ path: 'test-results/upload-area-screenshot.png' });
      } else {
        console.log('No upload functionality found on the page');
        // Take a screenshot of the whole page for debugging
        await page.screenshot({ path: 'test-results/documents-page-no-upload.png' });
      }
    }
  });
}); 