import { useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

const DEBOUNCE_DELAY = 1000; // 1 second

export function useConversationService() {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastRequestRef = useRef<{ timestamp: number, promise: Promise<any> }>();

  const debouncedRequest = useCallback((fn: () => Promise<any>) => {
    const now = Date.now();
    
    // If there's a recent request with the same parameters, return its promise
    if (lastRequestRef.current && now - lastRequestRef.current.timestamp < DEBOUNCE_DELAY) {
      return lastRequestRef.current.promise;
    }

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Create new promise for this request
    const promise = new Promise((resolve, reject) => {
      timeoutRef.current = setTimeout(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, DEBOUNCE_DELAY);
    });

    // Store this request
    lastRequestRef.current = {
      timestamp: now,
      promise
    };

    return promise;
  }, []);

  const getActiveConversation = useCallback(async (clientId: string) => {
    return debouncedRequest(async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, title, status, created_at, updated_at')
        .eq('client_id', clientId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No active conversation found - this is not an error
          return null;
        }
        console.error('Error fetching active conversation:', error);
        throw error;
      }

      return data;
    });
  }, [debouncedRequest]);

  const createMessage = useCallback(async (message: {
    conversation_id: string;
    content: string;
    role: string;
    metadata?: Record<string, any>;
    token_usage?: Record<string, any>;
  }) => {
    return debouncedRequest(async () => {
      // Validate message structure
      if (!message.conversation_id || !message.content || !message.role) {
        throw new Error('Invalid message structure: missing required fields');
      }

      // Ensure role is valid
      if (!['user', 'assistant', 'system'].includes(message.role)) {
        throw new Error('Invalid message role');
      }

      const { data, error } = await supabase
        .from('conversation_messages')
        .insert({
          conversation_id: message.conversation_id,
          content: message.content,
          role: message.role,
          metadata: message.metadata || {},
          token_usage: message.token_usage || null,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating message:', error);
        throw error;
      }

      return data;
    });
  }, [debouncedRequest]);

  return {
    getActiveConversation,
    createMessage
  };
} 