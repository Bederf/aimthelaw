/**
 * TTS (Text-to-Speech) Utility Functions
 * 
 * This file contains helper functions for text-to-speech related functionality,
 * including error handling, content summarization, and audio playback.
 */

import React from 'react';
import { toast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';
import * as React from 'react';

/**
 * Summarizes content for text-to-speech to improve reliability
 * @param content The original content to summarize
 * @param maxLength Maximum character length for TTS (default: 800)
 * @returns A shortened version of the content suitable for TTS
 */
export const summarizeForTTS = (content: string, maxLength = 800): string => {
  try {
    if (!content) return '';
    
    // If content is already short, return it as is
    if (content.length < 500) return content;
    
    // Clean the content (remove markdown formatting)
    let cleaned = content
      // Remove headings
      .replace(/#+\s+(.*?)(?:\n|$)/g, '$1\n')
      // Remove bold
      .replace(/\*\*(.*?)\*\*/g, '$1')
      // Remove italic
      .replace(/\*(.*?)\*/g, '$1')
      // Remove code blocks
      .replace(/```(.|\n)*?```/g, '')
      // Remove inline code
      .replace(/`(.*?)`/g, '$1')
      // Remove links
      .replace(/\[(.*?)\]\(.*?\)/g, '$1');
    
    // Split into paragraphs
    const paragraphs = cleaned.split(/\n\s*\n/);
    
    // Take the first 2-3 paragraphs
    let summary = paragraphs.slice(0, paragraphs.length > 2 ? 3 : 2).join('\n\n');
    
    // If still too long, truncate
    if (summary.length > maxLength) {
      summary = summary.substring(0, maxLength);
      
      // Try to end at a sentence boundary
      const lastPeriod = summary.lastIndexOf('.');
      if (lastPeriod > maxLength * 0.8) {
        summary = summary.substring(0, lastPeriod + 1);
      }
      
      summary += ' [...]';
    }
    
    // If summary is significantly shorter than original, add a lead-in phrase
    if (summary.length < content.length * 0.8) {
      return `Here's a summary: ${summary}`;
    }
    
    return summary;
  } catch (error) {
    console.error('Error summarizing for TTS:', error);
    // Fallback to simple truncation
    return content.length > maxLength 
      ? content.substring(0, maxLength) + ' [...]' 
      : content;
  }
};

/**
 * Handles TTS playback errors and provides a retry mechanism
 * @param error The error that occurred
 * @param messageId Optional ID of the message that failed
 * @param audioSource Optional audio source for retry
 */
export const handleTTSError = (
  error: any, 
  messageId?: string, 
  audioSource?: string
): void => {
  console.error('TTS playback error:', error);
  
  // Store the failed message ID and audio source for potential retry
  sessionStorage.setItem('FAILED_TTS_MESSAGE_ID', messageId || '');
  if (audioSource) {
    sessionStorage.setItem('FAILED_TTS_AUDIO_SOURCE', audioSource);
  }
  
  // Determine error type for better user feedback
  let errorMessage = 'Failed to play audio';
  
  if (error?.message) {
    if (error.message.includes("Failed to open media")) {
      errorMessage = 'Failed to open audio file. The API may have returned an invalid audio format.';
      
      // Log additional diagnostics
      console.warn("Audio playback diagnostics:", {
        messageId,
        audioType: audioSource?.substring(0, 50) + "...",
        isQuickAction: isQuickActionActive(),
        quickActionType: sessionStorage.getItem('QUICK_ACTION_TYPE') || 'unknown'
      });
    } else if (error.message.includes("timeout")) {
      errorMessage = 'Audio playback timed out';
    } else {
      errorMessage = `Error: ${error.message}`;
    }
  }
  
  // Show toast notification with retry option
  toast({
    title: 'Audio Playback Error',
    description: errorMessage,
    variant: 'destructive',
    action: React.createElement(ToastAction, {
      altText: 'Retry',
      onClick: () => retryTTS(messageId || '', audioSource)
    }, 'Retry')
  });
};

/**
 * Attempts to retry playing TTS audio for a specific message
 * @param messageId ID of the message to retry
 * @param audioSource Optional audio source to use
 */
export const retryTTS = (messageId: string, audioSource?: string): void => {
  console.log(`Retrying TTS for message ${messageId}`);
  
  // If we have the audio source, try to play it directly
  if (audioSource) {
    const audio = new Audio(audioSource);
    audio.onerror = (e) => {
      console.error('Retry failed:', e);
      handleTTSError(e, messageId, audioSource);
    };
    audio.play().catch(err => {
      console.error('Retry play failed:', err);
      handleTTSError(err, messageId, audioSource);
    });
  } else {
    // Otherwise we need to regenerate
    toast({
      title: 'Regenerating audio',
      description: 'Please wait while we regenerate the audio...'
    });
    
    // This will trigger the component to regenerate the audio
    sessionStorage.removeItem(`TTS_AUDIO_${messageId}`);
    
    // Reload the page to trigger regeneration
    // This is a simple approach - in a more sophisticated app, 
    // we would use a state management system to trigger regeneration
    window.location.reload();
  }
};

/**
 * Check if a quick action is currently active
 */
export function isQuickActionActive(): boolean {
  const quickActionStatus = sessionStorage.getItem('QUICK_ACTION_IN_PROGRESS');
  const timestamp = sessionStorage.getItem('QUICK_ACTION_TIMESTAMP');
  
  // Parse timestamp if it exists
  const actionTimestamp = timestamp ? parseInt(timestamp, 10) : 0;
  // Consider quick actions active for 5 minutes after they were initiated
  const isRecent = actionTimestamp && (Date.now() - actionTimestamp < 5 * 60 * 1000);
  
  return quickActionStatus === 'true' && isRecent;
}

/**
 * Check if a message is a result of a quick action
 */
export function isMessageFromQuickAction(message: any): boolean {
  // Check message metadata
  if (message?.metadata) {
    if (
      message.metadata.source === 'quick_action' || 
      message.metadata.action_type || 
      message.metadata.is_quick_action
    ) {
      return true;
    }
  }
  
  // Check if message content mentions specific quick actions
  if (message?.content && typeof message.content === 'string') {
    const content = message.content.toLowerCase();
    const quickActionIndicators = [
      'extracted dates',
      'date extraction',
      'summarized document',
      'document summary',
      'document analysis'
    ];
    
    if (quickActionIndicators.some(indicator => content.includes(indicator))) {
      return true;
    }
  }
  
  return false;
}
