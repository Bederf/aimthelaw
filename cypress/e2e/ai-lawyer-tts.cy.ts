/**
 * E2E Test for AI Lawyer Page with Text-to-Speech Quick Action
 * 
 * This test verifies that:
 * 1. The AILawyerNew page loads correctly
 * 2. A file can be selected
 * 3. A quick action can be triggered
 * 4. The text-to-speech component appears and works
 */

describe('AILawyerNew Page Text-to-Speech Tests', () => {
  // We'll need a test client and document for this test
  let testClientId: string;
  let testDocumentId: string;
  
  before(() => {
    // Setup test data - this would typically call an API to create test data
    cy.task('createTestClient').then((clientData: any) => {
      testClientId = clientData.id;
      
      // Upload a test document for this client
      cy.task('uploadTestDocument', { clientId: testClientId }).then((documentData: any) => {
        testDocumentId = documentData.id;
      });
    });
  });
  
  beforeEach(() => {
    // Login before each test
    cy.login();
    
    // Visit the AI Lawyer page with our test client
    cy.visit(`/lawyer/${testClientId}`);
    
    // Wait for the page to load
    cy.contains('AI Assistant').should('be.visible');
  });
  
  it('should show the text-to-speech component after using a quick action', () => {
    // Ensure the file section is visible
    cy.get('[data-testid="file-section"]').should('be.visible');
    
    // Select the test document
    cy.get(`[data-testid="file-checkbox-${testDocumentId}"]`).click();
    
    // Open quick actions menu
    cy.get('[data-testid="quick-actions-button"]').click();
    
    // Click the "Extract Dates" quick action
    cy.get('[data-testid="quick-action-extract-dates"]').click();
    
    // Wait for the AI to respond
    cy.get('[data-testid="ai-message"]').should('be.visible');
    
    // Check that the text-to-speech component appears
    cy.get('[data-testid="text-to-speech-container"]').should('be.visible');
    
    // Verify the play button exists
    cy.get('[data-testid="tts-play-button"]').should('be.visible');
  });
  
  it('should handle different voices in text-to-speech', () => {
    // Select the test document
    cy.get(`[data-testid="file-checkbox-${testDocumentId}"]`).click();
    
    // Open quick actions menu
    cy.get('[data-testid="quick-actions-button"]').click();
    
    // Click the "Summarize Document" quick action
    cy.get('[data-testid="quick-action-summarize-document"]').click();
    
    // Wait for the AI to respond
    cy.get('[data-testid="ai-message"]').should('be.visible');
    
    // Check that the text-to-speech component appears
    cy.get('[data-testid="text-to-speech-container"]').should('be.visible');
    
    // Open the voice selection dropdown
    cy.get('[data-testid="tts-voice-select"]').click();
    
    // Select a different voice
    cy.get('[data-testid="tts-voice-alloy"]').click();
    
    // Verify the voice label changed
    cy.get('[data-testid="tts-voice-select"]').should('contain', 'Alloy');
  });
  
  it('should allow downloading the audio file', () => {
    // Select the test document
    cy.get(`[data-testid="file-checkbox-${testDocumentId}"]`).click();
    
    // Open quick actions menu
    cy.get('[data-testid="quick-actions-button"]').click();
    
    // Click the "Legal Analysis" quick action
    cy.get('[data-testid="quick-action-legal-analysis"]').click();
    
    // Wait for the AI to respond
    cy.get('[data-testid="ai-message"]').should('be.visible');
    
    // Check that the text-to-speech component appears
    cy.get('[data-testid="text-to-speech-container"]').should('be.visible');
    
    // Click the download button
    cy.get('[data-testid="tts-download-button"]').click();
    
    // Verify a file was downloaded (this might need adjustments based on how your app handles downloads)
    cy.task('verifyDownloadedFile', { glob: '*.mp3' }).should('be.true');
  });
  
  it('should show the text-to-speech controls when enabled in settings', () => {
    // This test assumes you'll implement the system_settings table
    // and add the text-to-speech settings there
    
    // First, set the TTS settings to show controls
    cy.task('updateSystemSettings', {
      key: 'text_to_speech',
      value: {
        defaultVoice: 'nova',
        enableByDefault: true,
        showControls: true,
        includeQuestion: true
      }
    });
    
    // Reload the page
    cy.reload();
    
    // Select the test document
    cy.get(`[data-testid="file-checkbox-${testDocumentId}"]`).click();
    
    // Open quick actions menu
    cy.get('[data-testid="quick-actions-button"]').click();
    
    // Click the "Extract Dates" quick action
    cy.get('[data-testid="quick-action-extract-dates"]').click();
    
    // Check that the text-to-speech component has controls
    cy.get('[data-testid="tts-voice-select"]').should('be.visible');
  });
  
  it('should not show the text-to-speech controls when disabled in settings', () => {
    // Set the TTS settings to hide controls
    cy.task('updateSystemSettings', {
      key: 'text_to_speech',
      value: {
        defaultVoice: 'nova',
        enableByDefault: true,
        showControls: false,
        includeQuestion: true
      }
    });
    
    // Reload the page
    cy.reload();
    
    // Select the test document
    cy.get(`[data-testid="file-checkbox-${testDocumentId}"]`).click();
    
    // Open quick actions menu
    cy.get('[data-testid="quick-actions-button"]').click();
    
    // Click the "Extract Dates" quick action
    cy.get('[data-testid="quick-action-extract-dates"]').click();
    
    // Check that the text-to-speech component doesn't have voice controls
    cy.get('[data-testid="tts-voice-select"]').should('not.exist');
  });
  
  after(() => {
    // Clean up test data
    cy.task('deleteTestDocument', { documentId: testDocumentId });
    cy.task('deleteTestClient', { clientId: testClientId });
  });
}); 