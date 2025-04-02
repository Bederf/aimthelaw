import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test dashboard loading and AI Lawyer navigation
 */
test('Check dashboard and AI Lawyer link', async ({ page }) => {
  // Ensure logs directory exists
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Login first
  await page.goto('http://localhost:8080/login');
  await page.fill('input[type="email"], input[placeholder*="email" i]', 'mike@law.com');
  await page.fill('input[type="password"], input[placeholder*="password" i]', 'LAW_SNOW_801010');
  await page.click('button[type="submit"], button:has-text("Sign In")');
  await page.waitForTimeout(5000);
  
  console.log('Logged in, dashboard URL:', page.url());
  
  // Take screenshot of dashboard
  await page.screenshot({ path: path.join(logsDir, 'dashboard-view.png'), fullPage: true });
  
  // Get all links on the dashboard
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a'))
      .map(a => ({
        text: a.textContent?.trim() || '',
        href: a.getAttribute('href') || '',
        visible: a.offsetParent !== null,
        classes: a.className
      }))
      .filter(link => link.href && link.visible);
  });
  
  console.log('Found links on dashboard:');
  links.forEach(link => {
    console.log(`- ${link.text || '(no text)'} | href: ${link.href}`);
  });
  
  // Find AI Lawyer related links
  const aiLawyerLinks = links.filter(link => 
    link.text.toLowerCase().includes('ai') || 
    link.href.includes('/ai/') || 
    link.href.includes('/lawyer/ai')
  );
  
  console.log('\nAI Lawyer related links:');
  if (aiLawyerLinks.length > 0) {
    aiLawyerLinks.forEach(link => {
      console.log(`- ${link.text || '(no text)'} | href: ${link.href}`);
    });
    
    // Save screenshot of AI section
    await page.screenshot({ path: path.join(logsDir, 'ai-section.png'), fullPage: true });
    
    // Try to click the first AI Lawyer link
    if (aiLawyerLinks[0].href) {
      try {
        // Check if it's a relative or absolute URL
        const url = aiLawyerLinks[0].href.startsWith('http') 
          ? aiLawyerLinks[0].href 
          : `http://localhost:8080${aiLawyerLinks[0].href}`;
          
        console.log(`Navigating to AI Lawyer link: ${url}`);
        await page.goto(url);
        await page.waitForTimeout(5000);
        
        // Save screenshot of AI Lawyer page
        await page.screenshot({ path: path.join(logsDir, 'ai-lawyer-from-link.png'), fullPage: true });
        console.log('Current URL after clicking AI Lawyer link:', page.url());
        
        // Check page content
        const pageContent = await page.evaluate(() => {
          return {
            title: document.title,
            h1: Array.from(document.querySelectorAll('h1')).map(h => h.textContent?.trim()).join(', '),
            h2: Array.from(document.querySelectorAll('h2')).map(h => h.textContent?.trim()).join(', '),
            errorMessage: document.querySelector('.error-message, [role="alert"]')?.textContent?.trim() || '',
            hasContainer: !!document.querySelector('.container'),
            hasChatInterface: !!document.querySelector('.chat-interface, [data-testid="chat-interface"]'),
            hasMessageInput: !!document.querySelector('textarea.message-input, [data-testid="message-input"]')
          };
        });
        
        console.log('Page content:', pageContent);
      } catch (error) {
        console.error('Error navigating to AI Lawyer link:', error);
      }
    }
  } else {
    console.log('No AI Lawyer links found on dashboard');
  }
  
  // Check if there's a direct section for AI on the dashboard
  const aiSection = await page.evaluate(() => {
    const sections = Array.from(document.querySelectorAll('section, div, article'))
      .filter(section => {
        const text = section.textContent?.toLowerCase() || '';
        return text.includes('ai') || text.includes('assistant') || text.includes('lawyer');
      });
    
    return sections.map(section => ({
      text: section.textContent?.trim().substring(0, 100) || '',
      classes: section.className,
      id: section.id,
      children: section.children.length
    }));
  });
  
  if (aiSection.length > 0) {
    console.log('\nFound AI-related sections on dashboard:');
    aiSection.forEach(section => {
      console.log(`- ${section.text}... | classes: ${section.classes} | children: ${section.children}`);
    });
  } else {
    console.log('\nNo AI-specific sections found on dashboard');
  }
}); 