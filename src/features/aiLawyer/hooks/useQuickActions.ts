import { useState, useCallback, useEffect, useRef } from 'react';
import { Message } from '@/types/ai';
import { MessageRole, MessageSender } from '@/types/chat';
import { useToast } from '@/components/ui/use-toast';
import { ConsolidatedAIService, ProcessState } from '@/services';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate, useLocation } from 'react-router-dom';

export interface UseQuickActionsOptions {
  clientId: string;
  getSelectedDocumentIds: () => string[];
  selectedModel: string;
  conversationId: string | null;
  aiService: ConsolidatedAIService;
  addMessage: (message: Message) => void;
}

export function useQuickActions({
  clientId,
  getSelectedDocumentIds,
  selectedModel,
  conversationId,
  aiService,
  addMessage
}: UseQuickActionsOptions) {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [quickActionLoading, setQuickActionLoading] = useState<string | null>(null);
  const [lastQuickActionResult, setLastQuickActionResult] = useState<any>(null);
  const [showResultDialog, setShowResultDialog] = useState<boolean>(false);
  
  // Add a state to track if we're currently in a quick action
  const [isInQuickAction, setIsInQuickAction] = useState<boolean>(false);
  
  // Use a ref to track abort controller for in-progress requests
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Helper to set global quick action state
  const setGlobalQuickActionState = useCallback((active: boolean, actionType?: string) => {
    if (active) {
      sessionStorage.setItem('QUICK_ACTION_IN_PROGRESS', 'true');
      if (actionType) {
        sessionStorage.setItem('QUICK_ACTION_TYPE', actionType);
      }
      sessionStorage.setItem('QUICK_ACTION_TIMESTAMP', Date.now().toString());
      setIsInQuickAction(true);
      
      // Save document IDs to session storage for recovery if needed
      const docIds = getSelectedDocumentIds();
      if (docIds.length > 0) {
        sessionStorage.setItem('QUICK_ACTION_SELECTED_DOCS', JSON.stringify(docIds));
      }
      
      // Preserve auth state during quick action
      sessionStorage.setItem('PRESERVE_AUTH_STATE', 'true');
      
      // Disable HMR to prevent refresh during action
      if (window.__HMR_DISABLED !== undefined) {
        window.__HMR_DISABLED = true;
      }
      window.dispatchEvent(new CustomEvent('quick-action-started'));
    } else {
      setIsInQuickAction(false);
      
      // Don't remove the session storage flags immediately
      // Let the visibility handler clean them up to ensure completion
      setTimeout(() => {
        sessionStorage.removeItem('QUICK_ACTION_IN_PROGRESS');
        sessionStorage.removeItem('QUICK_ACTION_TYPE');
        sessionStorage.removeItem('QUICK_ACTION_TIMESTAMP');
        
        // Keep auth state preserved for a bit longer
        setTimeout(() => {
          sessionStorage.removeItem('PRESERVE_AUTH_STATE');
        }, 5000);
        
        if (window.__HMR_DISABLED !== undefined) {
          window.__HMR_DISABLED = false;
        }
        window.dispatchEvent(new CustomEvent('quick-action-completed'));
      }, 2000); // Short delay to allow for TTS completion
    }
  }, [getSelectedDocumentIds]);
  
  // On mount, check if there's a persisted quick action in progress
  useEffect(() => {
    const quickActionInProgress = sessionStorage.getItem('QUICK_ACTION_IN_PROGRESS') === 'true';
    if (quickActionInProgress) {
      console.log('Detected existing quick action in progress on mount');
      setIsInQuickAction(true);
      
      // Create a new abort controller for potential cleanup
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      // Auto-cleanup stale quick actions
      const quickActionTimestamp = parseInt(sessionStorage.getItem('QUICK_ACTION_TIMESTAMP') || '0', 10);
      const currentTime = Date.now();
      
      // If the quick action has been running for more than 3 minutes, it's likely stuck
      if (quickActionTimestamp > 0 && (currentTime - quickActionTimestamp > 180000)) {
        console.warn('Detected a stale quick action - cleaning up');
        setGlobalQuickActionState(false);
      }
    }
    
    // Set up a listener for beforeunload to prevent navigation during quick actions
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isInQuickAction || sessionStorage.getItem('QUICK_ACTION_IN_PROGRESS') === 'true') {
        console.log('Blocking page unload during quick action');
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // If component is unmounting but quick action is still in progress,
      // make sure we don't lose track of it
      if (isInQuickAction) {
        console.log('Component unmounting during quick action - preserving global state');
        // We don't clear the global state here to ensure it persists across reloads
      }
      
      // Abort any in-progress requests
      if (abortControllerRef.current) {
        try {
          abortControllerRef.current.abort();
        } catch (e) {
          console.error('Error aborting request:', e);
        }
      }
    };
  }, [isInQuickAction, setGlobalQuickActionState]);
  
  // Add a listener for popstate events to prevent back/forward navigation during quick actions
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (isInQuickAction || sessionStorage.getItem('QUICK_ACTION_IN_PROGRESS') === 'true') {
        // Prevent navigation by pushing the current URL back onto the stack
        console.log('Preventing navigation during quick action');
        
        // Store the current URL path for restoration
        sessionStorage.setItem('QUICK_ACTION_PRESERVED_URL', location.pathname);
        
        // Put the current URL back on the stack to prevent navigation
        window.history.pushState(null, '', location.pathname);
        
        // Show a toast message to inform the user
        toast({
          title: "Navigation Blocked",
          description: "Please wait for the current action to complete.",
          variant: "destructive"
        });
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    
    // Enhanced navigation blocking - also prevent programmatic navigation
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    
    // Override pushState to block during quick actions
    window.history.pushState = function(...args) {
      if (isInQuickAction || sessionStorage.getItem('QUICK_ACTION_IN_PROGRESS') === 'true') {
        console.log('Blocking programmatic navigation via pushState during quick action');
        const quickActionType = sessionStorage.getItem('QUICK_ACTION_TYPE');
        // Only show toast for user-initiated navigations, not auto-navigations
        const isUserInitiated = !args[2] || (typeof args[2] === 'string' && !args[2].includes('auto'));
        
        if (isUserInitiated) {
          toast({
            title: "Navigation Blocked",
            description: `Please wait for the "${quickActionType}" action to complete.`,
            variant: "destructive",
            duration: 3000
          });
        }
        return;
      }
      return originalPushState.apply(this, args);
    };
    
    // Override replaceState to block during quick actions
    window.history.replaceState = function(...args) {
      if (isInQuickAction || sessionStorage.getItem('QUICK_ACTION_IN_PROGRESS') === 'true') {
        console.log('Blocking programmatic navigation via replaceState during quick action');
        return;
      }
      return originalReplaceState.apply(this, args);
    };
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      
      // Restore original history methods
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, [isInQuickAction, toast, location]);
  
  // Also listen for click events on anchor tags
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (isInQuickAction || sessionStorage.getItem('QUICK_ACTION_IN_PROGRESS') === 'true') {
        // Check if the click was on an anchor tag
        const target = e.target as HTMLElement;
        const anchor = target.closest('a');
        
        if (anchor && anchor.href && 
            !anchor.href.startsWith('javascript:') && 
            !anchor.classList.contains('force-navigation')) {
          
          // Check if it's a same-page navigation
          const currentPath = window.location.pathname;
          const targetPath = new URL(anchor.href, window.location.origin).pathname;
          
          // Allow navigation if it's within the same conversation
          if (currentPath === targetPath || 
              (conversationId && targetPath.includes(conversationId))) {
            return; // Allow the navigation
          }
          
          console.log('Blocking link navigation during quick action', {
            from: currentPath,
            to: targetPath
          });
          
          e.preventDefault();
          e.stopPropagation();
          
          const quickActionType = sessionStorage.getItem('QUICK_ACTION_TYPE');
          
          toast({
            title: "Navigation Blocked",
            description: `Please wait for the "${quickActionType}" action to complete.`,
            variant: "destructive",
            duration: 3000
          });
        }
      }
    };
    
    document.addEventListener('click', handleClick, true);
    
    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [isInQuickAction, conversationId, toast]);
  
  // Format dates into a readable markdown format
  const formatDates = useCallback((dates: any[]): string => {
    console.log('[formatDates] Formatting extracted dates:', dates);
    
    if (!Array.isArray(dates) || dates.length === 0) {
      return "## Dates Extracted\n\nNo dates were found in the selected documents.";
    }
    
    let content = `## Dates Extracted\n\nThe following dates were found in your documents:\n\n`;
    
    dates.forEach((date: any) => {
      if (typeof date === 'string') {
        content += `- **${date}**\n`;
      } else {
        const dateText = date.date || date.value || date.text || '';
        const description = date.description || date.event || date.context || '';
        const source = date.source || date.source_document || date.document || '';
        
        content += `- **${dateText}**`;
        if (description) content += `: ${description}`;
        if (source) content += ` (Source: ${source})`;
        content += '\n';
      }
    });
    
    return content;
  }, []);
  
  // Helper function to get messages for a specific conversation
  const getConversationMessagesFromState = useCallback((convId: string) => {
    try {
      // First check localStorage for any stored messages
      const storedMessages = localStorage.getItem(`CONVERSATION_MESSAGES_${convId}`);
      if (storedMessages) {
        return JSON.parse(storedMessages);
      }
      
      // If we have no stored messages, return an empty array
      return [];
    } catch (error) {
      console.error('[getConversationMessagesFromState] Error retrieving messages:', error);
      return [];
    }
  }, []);
  
  // Format JSON content into a nicely structured markdown document
  // This function takes a legal summary JSON object from the backend and transforms it
  // into a well-formatted markdown document for display in the UI. It handles different
  // sections of the legal summary including overview, key points, and legal analysis.
  const formatJsonContent = (jsonContent: any): string => {
    console.log('[formatJsonContent] Formatting JSON content:', jsonContent);

    // Create a nicely formatted summary from the JSON
    let formattedContent = "# Legal Document Summary\n\n";
    
    // Add document overview
    if (jsonContent.overview) {
      formattedContent += "## Document Overview\n\n";
      
      if (jsonContent.overview.purpose) {
        formattedContent += `${jsonContent.overview.purpose}\n\n`;
      }
      
      if (jsonContent.overview.document_type) {
        formattedContent += `**Document Type:** ${jsonContent.overview.document_type}\n\n`;
      }
      
      // Add parties if available
      if (jsonContent.overview.parties && jsonContent.overview.parties.length > 0) {
        formattedContent += "**Key Parties:**\n";
        jsonContent.overview.parties.forEach((party: string) => {
          formattedContent += `- ${party}\n`;
        });
        formattedContent += "\n";
      }
      
      // Add topics if available
      if (jsonContent.overview.topics && jsonContent.overview.topics.length > 0) {
        formattedContent += "**Primary Topics:**\n";
        jsonContent.overview.topics.forEach((topic: string) => {
          formattedContent += `- ${topic}\n`;
        });
        formattedContent += "\n";
      }
    }
    
    // Add key points
    if (jsonContent.key_points && jsonContent.key_points.length > 0) {
      formattedContent += "## Key Points\n\n";
      
      jsonContent.key_points.forEach((point: any) => {
        if (point.topic && point.details) {
          formattedContent += `### ${point.topic}\n${point.details}\n`;
          if (point.importance) {
            formattedContent += `**Importance:** ${point.importance}\n`;
          }
          formattedContent += "\n";
        }
      });
    }
    
    // Add legal analysis
    if (jsonContent.legal_analysis) {
      formattedContent += "## Legal Analysis\n\n";
      
      // Add applicable laws if available
      if (jsonContent.legal_analysis.applicable_laws && jsonContent.legal_analysis.applicable_laws.length > 0) {
        formattedContent += "**Applicable Laws:**\n";
        jsonContent.legal_analysis.applicable_laws.forEach((law: string) => {
          formattedContent += `- ${law}\n`;
        });
        formattedContent += "\n";
      }
      
      // Add requirements if available
      if (jsonContent.legal_analysis.requirements && jsonContent.legal_analysis.requirements.length > 0) {
        formattedContent += "**Legal Requirements:**\n";
        jsonContent.legal_analysis.requirements.forEach((req: string) => {
          formattedContent += `- ${req}\n`;
        });
        formattedContent += "\n";
      }
      
      // Add risks if available
      if (jsonContent.legal_analysis.risks && jsonContent.legal_analysis.risks.length > 0) {
        formattedContent += "**Identified Risks:**\n";
        jsonContent.legal_analysis.risks.forEach((risk: string) => {
          formattedContent += `- ${risk}\n`;
        });
        formattedContent += "\n";
      }
      
      // Add recommendations if available
      if (jsonContent.legal_analysis.recommendations && jsonContent.legal_analysis.recommendations.length > 0) {
        formattedContent += "**Recommendations:**\n";
        jsonContent.legal_analysis.recommendations.forEach((rec: string) => {
          formattedContent += `- ${rec}\n`;
        });
        formattedContent += "\n";
      }
    }
    
    return formattedContent;
  };
  
  // Helper to try to parse JSON from a string and format it
  const tryParseAndFormatJson = (jsonText: string): string | null => {
    try {
      // Handle the case where we might have JSON within a string field
      // First check if it's a straightforward JSON string
      if (typeof jsonText === 'string' && 
          (jsonText.trim().startsWith('{') && jsonText.trim().endsWith('}'))) {
        console.log('[tryParseAndFormatJson] Attempting to parse JSON string directly');
        try {
          const jsonContent = JSON.parse(jsonText.trim());
          
          // If it's valid JSON with our expected structure, format it nicely
          if (jsonContent && typeof jsonContent === 'object' && 
              (jsonContent.overview || jsonContent.key_points || jsonContent.legal_analysis)) {
            console.log('[tryParseAndFormatJson] Valid JSON structure found, formatting');
            return formatJsonContent(jsonContent);
          }
        } catch (parseError) {
          console.log('[tryParseAndFormatJson] JSON parsing failed:', parseError);
        }
      }
      
      // If direct parsing failed, try to extract JSON from the text
      // This handles cases where the JSON is embedded in a larger text
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch && jsonMatch[0]) {
        console.log('[tryParseAndFormatJson] Found potential JSON within text, attempting to parse');
        try {
          const extractedJson = jsonMatch[0];
          const jsonContent = JSON.parse(extractedJson);
          
          // If it's valid JSON with our expected structure, format it nicely
          if (jsonContent && typeof jsonContent === 'object' && 
              (jsonContent.overview || jsonContent.key_points || jsonContent.legal_analysis)) {
            console.log('[tryParseAndFormatJson] Valid JSON structure extracted, formatting');
            return formatJsonContent(jsonContent);
          }
        } catch (extractError) {
          console.log('[tryParseAndFormatJson] Extracted JSON parsing failed:', extractError);
        }
      }
      
      // If we couldn't parse or extract valid JSON, return null
      return null;
    } catch (e) {
      console.log('[tryParseAndFormatJson] General error in JSON processing:', e);
      return null;
    }
  };

  const formatContentAsMarkdown = useCallback((action: string, result: any, documentIds: string[]) => {
    // Log the result structure to help with debugging
    console.log(`[formatContentAsMarkdown] Formatting result for ${action}:`, result);

    // If result is null or undefined, return a helpful message
    if (!result) {
      return `## ${action}\n\nThe action completed, but no results were returned.`;
    }

    // Additional check specifically for Prepare for Court data
    if (action === 'Prepare for Court') {
      console.log(`[formatContentAsMarkdown] Specifically formatting Prepare for Court result`);
      
      // Check for prepared_content field which might contain the formatted output
      if (result.prepared_content && typeof result.prepared_content === 'string' && result.prepared_content.length > 20) {
        console.log(`[formatContentAsMarkdown] Using prepared_content field (${result.prepared_content.length} chars)`);
        return `## Prepare for Court\n\n${result.prepared_content}`;
      }
      
      // Check for court_preparation field
      if (result.court_preparation && typeof result.court_preparation === 'string' && result.court_preparation.length > 20) {
        console.log(`[formatContentAsMarkdown] Using court_preparation field (${result.court_preparation.length} chars)`);
        return `## Prepare for Court\n\n${result.court_preparation}`;
      }
      
      // Check for analysis field
      if (result.analysis && typeof result.analysis === 'string' && result.analysis.length > 20) {
        console.log(`[formatContentAsMarkdown] Using analysis field (${result.analysis.length} chars)`);
        return `## Prepare for Court\n\n${result.analysis}`;
      }
      
      // Check for raw_content field
      if (result.raw_content && typeof result.raw_content === 'string' && result.raw_content.length > 20) {
        console.log(`[formatContentAsMarkdown] Using raw_content field (${result.raw_content.length} chars)`);
        return `## Prepare for Court\n\n${result.raw_content}`;
      }
      
      // Handle standard result.data structured format
      if (result.data) {
        // Check if data has court_preparation, prepared_content, or summary fields
        const dataFields = ['court_preparation', 'prepared_content', 'summary', 'analysis', 'content'];
        for (const field of dataFields) {
          if (result.data[field] && typeof result.data[field] === 'string' && result.data[field].length > 20) {
            console.log(`[formatContentAsMarkdown] Using result.data.${field} (${result.data[field].length} chars)`);
            return `## Prepare for Court\n\n${result.data[field]}`;
          }
        }
      }
      
      // If we still haven't found content, try to extract it from any substantial string fields
      const contentFields = Object.entries(result)
        .filter(([key, value]) => 
          typeof value === 'string' && 
          value.length > 20 && 
          !key.includes('id') && 
          !key.includes('timestamp') && 
          !key.includes('model') &&
          !key.includes('token')
        );
        
      if (contentFields.length > 0) {
        console.log(`[formatContentAsMarkdown] Using generic content fields:`, contentFields.map(([key]) => key));
        const content = contentFields
          .map(([key, value]) => `### ${key.replace(/_/g, ' ').charAt(0).toUpperCase() + key.replace(/_/g, ' ').slice(1)}\n\n${value as string}`)
          .join('\n\n');
          
        return `## Prepare for Court\n\n${content}`;
      }
    }

    // Handle date extraction specifically
    if (action === 'Extract Dates' && result.dates && Array.isArray(result.dates)) {
      let content = `## Dates Extracted\n\nThe following dates were found in your documents:\n\n`;
      
      result.dates.forEach((date: any) => {
        if (typeof date === 'string') {
          content += `- **${date}**\n`;
        } else {
          const dateText = date.date || date.text || '';
          const description = date.description || date.event || date.context || '';
          const source = date.source || date.source_document || '';
          
          content += `- **${dateText}**`;
          if (description) content += `: ${description}`;
          if (source) content += ` (${source})`;
          content += '\n';
        }
      });
      
      return content;
    }

    // Special handling for summarization
    if (action === 'Summarize Document') {
      console.log('[formatContentAsMarkdown] Handling summarization result');
      
      // First, try to extract JSON data from any text field that might contain it
      // This is our best chance at providing a well-structured summary
      const jsonFields = [
        result.raw_text,
        result.data?.raw_text,
        result.content,
        result.summary,
        result.structured_summary,
        result.data?.structured_summary,
        result.data?.content,
        result.data?.summary,
        result.response,
        result.data?.response
      ].filter(Boolean);
      
      // Try to parse JSON from each field
      for (const field of jsonFields) {
        if (typeof field === 'string') {
          console.log('[formatContentAsMarkdown] Attempting to parse JSON from field:', 
            field.substring(0, 50) + (field.length > 50 ? '...' : ''));
          
          const parsedContent = tryParseAndFormatJson(field);
          if (parsedContent) {
            console.log('[formatContentAsMarkdown] Successfully parsed and formatted JSON content');
            return parsedContent;
          }
        } else if (field && typeof field === 'object') {
          // If we have an object, try to format it directly
          console.log('[formatContentAsMarkdown] Found object field, attempting to format directly');
          try {
            if (field.overview || field.key_points || field.legal_analysis) {
              console.log('[formatContentAsMarkdown] Object has expected structure, formatting directly');
              return formatJsonContent(field);
            }
          } catch (objError) {
            console.error('[formatContentAsMarkdown] Error formatting object:', objError);
          }
        }
      }
      
      // If JSON parsing failed, fall back to standard content extraction logic
      console.log('[formatContentAsMarkdown] JSON parsing failed, falling back to regular content extraction');
      
      // Check for content in various locations with detailed logging
      const possibleContentSources = [
        { name: 'raw_text', value: result.raw_text },
        { name: 'data.raw_text', value: result.data?.raw_text },
        { name: 'formatted_response', value: result.formatted_response },
        { name: 'content', value: result.content },
        { name: 'response', value: result.response },
        { name: 'summary', value: result.summary },
        { name: 'data.content', value: result.data?.content },
        { name: 'data.summary', value: result.data?.summary },
        { name: 'data.result', value: result.data?.result },
        { name: 'data.text', value: result.data?.text },
        { name: 'data.formatted_response', value: result.data?.formatted_response },
        { name: 'data.summaries', value: result.data?.summaries },
        { name: 'summaries', value: result.summaries }
      ];
      
      // Log available content sources
      possibleContentSources.forEach(source => {
        if (source.value) {
          console.log(`[formatContentAsMarkdown] Found content in ${source.name}:`, 
            typeof source.value === 'string' 
              ? `${source.value.substring(0, 50)}${source.value.length > 50 ? '...' : ''}`
              : typeof source.value
          );
        }
      });
      
      // Try to extract content from the result object
      let summaryContent = '';
      
      // Check for raw_text first, which is our new priority field
      if (result.raw_text) {
        console.log('[formatContentAsMarkdown] Using raw_text for content');
        
        // Try to parse and format as JSON if possible
        const formattedJson = tryParseAndFormatJson(result.raw_text);
        if (formattedJson) {
          return formattedJson;
        }
        
        summaryContent = result.raw_text;
      } else if (result.data?.raw_text) {
        console.log('[formatContentAsMarkdown] Using data.raw_text for content');
        
        // Try to parse and format as JSON if possible
        const formattedJson = tryParseAndFormatJson(result.data.raw_text);
        if (formattedJson) {
          return formattedJson;
        }
        
        summaryContent = result.data.raw_text;
      }
      // Then check if we have key_points with our special Summary Content
      else if (result.key_points && Array.isArray(result.key_points)) {
        const summaryPoint = result.key_points.find(point => 
          point.topic === 'Summary Content' && point.details
        );
        if (summaryPoint) {
          console.log('[formatContentAsMarkdown] Using key_points Summary Content');
          summaryContent = summaryPoint.details;
        }
      } else if (result.data?.key_points && Array.isArray(result.data.key_points)) {
        const summaryPoint = result.data.key_points.find(point => 
          point.topic === 'Summary Content' && point.details
        );
        if (summaryPoint) {
          console.log('[formatContentAsMarkdown] Using data.key_points Summary Content');
          summaryContent = summaryPoint.details;
        }
      }
      // First check direct properties if we still don't have content
      else if (result.formatted_response) {
        summaryContent = result.formatted_response;
      } else if (result.content) {
        summaryContent = result.content;
      } else if (result.response) {
        summaryContent = result.response;
      } else if (result.summary) {
        summaryContent = result.summary;
      } 
      // Then check in data object
      else if (result.data) {
        if (result.data.summary) {
          summaryContent = result.data.summary;
        } else if (result.data.content) {
          summaryContent = result.data.content;
        } else if (result.data.result) {
          summaryContent = result.data.result;
        } else if (result.data.text) {
          summaryContent = result.data.text;
        } else if (result.data.formatted_response) {
          summaryContent = result.data.formatted_response;
        } 
        // Check for summaries object
        else if (result.data.summaries) {
          const summaries = result.data.summaries;
          if (typeof summaries === 'string') {
            summaryContent = summaries;
          } else if (Array.isArray(summaries)) {
            summaryContent = summaries.join('\n\n');
          } else if (typeof summaries === 'object') {
            summaryContent = Object.values(summaries).join('\n\n');
          }
        }
      } 
      // Check for summaries at top level
      else if (result.summaries) {
        const summaries = result.summaries;
        if (typeof summaries === 'string') {
          summaryContent = summaries;
        } else if (Array.isArray(summaries)) {
          summaryContent = summaries.join('\n\n');
        } else if (typeof summaries === 'object') {
          summaryContent = Object.values(summaries).join('\n\n');
        }
      }
      
      // If we found content, format it as markdown
      if (summaryContent) {
        // If it doesn't already have a header, add one
        if (!summaryContent.startsWith('#')) {
          return `## Document Summary\n\n${summaryContent}`;
        }
        return summaryContent;
      }
      
      // Last resort: try to extract any string from the result
      const extractStringContent = (obj: any, depth = 0, maxDepth = 3): string | null => {
        if (depth > maxDepth) return null;
        if (!obj) return null;
        
        if (typeof obj === 'string' && obj.length > 10) {
          return obj;
        }
        
        if (typeof obj === 'object') {
          for (const key in obj) {
            const value = obj[key];
            if (typeof value === 'string' && value.length > 10) {
              return value;
            } else if (typeof value === 'object') {
              const result = extractStringContent(value, depth + 1, maxDepth);
              if (result) return result;
            }
          }
        }
        
        return null;
      };
      
      const extractedContent = extractStringContent(result);
      if (extractedContent) {
        return `## Document Summary\n\n${extractedContent}`;
      }
      
      // If we still don't have content, create a basic message
      return `## Document Summary\n\nThe summarization was completed, but no summary content could be retrieved. It appears the content may still be in the database but couldn't be rendered in this view. You can try viewing this document in the main chat interface.`;
    }
    
    // For other action types, create a generic formatted response
    let content = `## ${action} Results\n\n`;
    
    if (typeof result === 'string') {
      return content + result;
    }
    
    // Extract meaningful content from the result object
    if (result.content) {
      content = result.content;
    } else if (result.formatted_response) {
      content = result.formatted_response;
    } else if (result.response) {
      content = result.response;
    } else {
      content += `Action completed successfully.\n\nDocument count: ${documentIds.length}`;
    }
    
    // If we still don't have any content, create a basic message
    if (!content || content.trim().length < 10) {
      console.warn(`No valid display content found for ${action}, creating fallback message`);
      
      // Create a fallback message that shows whatever we received
      const rawResultStr = typeof result === 'string' 
        ? result 
        : JSON.stringify(result, null, 2);
      
      content = `## ${action}\n\n`;
      content += "The action completed.\n\n";
      
      // Add debugging information about the result
      content += "### Technical Details\n\n";
      content += `Result type: ${typeof result}\n`;
      content += `Available fields: ${Object.keys(result).join(', ')}\n\n`;
      
      // Show the raw result with some truncation for very large results
      if (rawResultStr.length > 1000) {
        content += "Raw result (truncated):\n```\n" + rawResultStr.substring(0, 1000) + "...\n```";
      } else {
        content += "Raw result:\n```\n" + rawResultStr + "\n```";
      }
    }
    
    return content;
  }, []);
  
  // Handle action result processing
  const handleActionResult = useCallback((action: string, result: any) => {
    // Log the structure for debugging
    console.log(`[useQuickActions] Processing ${action} result:`, result);
    console.log(`[useQuickActions] Result keys:`, Object.keys(result));
    
    // Store result for debugging
    try {
      localStorage.setItem(`LAST_${action.replace(/\s+/g, '_').toUpperCase()}_RESULT`, JSON.stringify(result));
    } catch (e) {
      console.warn('Could not store result in localStorage', e);
    }
    
    let content = '';
    let isError = false;
    
    try {
      // Process different action types
      if (action === 'Extract Dates') {
        const dates = result.dates || result.data?.dates || [];
        if (Array.isArray(dates) && dates.length > 0) {
          const dateList = dates.map((date: any) => {
            const dateStr = date.date || date.text || date;
            const desc = date.description || date.context || '';
            return `- **${dateStr}**: ${desc}`;
          }).join('\n');
          
          content = `### Extracted Dates\n${dateList}`;
        } else {
          content = '### No dates found in the document.';
        }
      } else if (action === 'Summarize Document') {
        // Check multiple possible response formats
        content = result.summary || result.content || result.formatted_response || result.response || '';
        if (!content && result.data) {
          content = result.data.summary || result.data.content || '';
        }
        
        if (!content) {
          content = '### No summary could be generated.';
        } else {
          content = `### Document Summary\n${content}`;
        }
      } else if (action === 'Prepare for Court') {
        console.log('[useQuickActions] Processing Prepare for Court result:', result);
        
        // Check for token limit errors
        const hasTokenLimitError = 
          (result.content && result.content.includes("Token limit exceeded")) ||
          (result.data?.preparation?.strategy && result.data.preparation.strategy.includes("Token limit exceeded"));
        
        if (hasTokenLimitError) {
          console.warn('[useQuickActions] Token limit error detected for Prepare for Court action');
          
          content = `## Court Preparation Error

**The documents you selected are too large for the model's token limit.**

${result.data?.preparation?.strategy || "Token limit exceeded. The AI couldn't process all the selected documents together."}

### How to fix this:
1. Try selecting fewer documents
2. Choose smaller documents
3. Process documents individually

You can still analyze these documents with other quick actions or by sending them to the chat one at a time.`;
        }
        // If not a token limit error, proceed with normal processing
        else {
          // Check for multiple possible response structures for court preparation
          let courtContent = '';
          
          // Try to extract content from various possible locations in the response
          if (result.content) {
            courtContent = result.content;
          } else if (result.court_preparation) {
            courtContent = result.court_preparation;
          } else if (result.formatted_response) {
            courtContent = result.formatted_response;
          } else if (result.response) {
            courtContent = result.response;
          } else if (result.data?.preparation?.strategy && 
                    typeof result.data.preparation.strategy === 'string' && 
                    !result.data.preparation.strategy.includes("Error")) {
            courtContent = result.data.preparation.strategy;
          } else if (result.data) {
            if (typeof result.data === 'string') {
              courtContent = result.data;
            } else {
              // Try to extract from data object
              courtContent = result.data.court_preparation || 
                            result.data.content || 
                            result.data.formatted_response ||
                            result.data.response ||
                            result.data.summary || '';
              
              // If data has a structured format with sections
              if (!courtContent && result.data.sections) {
                courtContent = Object.entries(result.data.sections)
                  .map(([key, value]) => `### ${key}\n${value}`)
                  .join('\n\n');
              }
            }
          }
          
          // If we still don't have content, try parsing the raw result
          if (!courtContent && typeof result === 'string') {
            try {
              // Try to parse if it's a JSON string
              const parsedResult = JSON.parse(result);
              courtContent = parsedResult.content || parsedResult.response || parsedResult;
              if (typeof courtContent !== 'string') {
                courtContent = JSON.stringify(courtContent, null, 2);
              }
            } catch (e) {
              // If it's not JSON, use the string directly
              courtContent = result;
            }
          }
          
          // If still no content, use a fallback
          if (!courtContent) {
            console.warn('[useQuickActions] Could not extract court preparation content from result', result);
            courtContent = 'The action completed successfully, but no detailed output was returned.\n\nTechnical details for debugging:\n```json\n' + JSON.stringify(result, null, 2) + '\n```';
          }
          
          content = `## Prepare for Court\n\n${courtContent}`;
        }
      } else if (action === 'Reply to Letter') {
        // ... existing code for Reply to Letter ...
      } else {
        // Generic handling for other actions
        content = result.content || result.formatted_response || result.response || JSON.stringify(result);
      }
    } catch (error) {
      console.error(`Error processing ${action} result:`, error);
      content = `Error processing result: ${error instanceof Error ? error.message : 'Unknown error'}`;
      isError = true;
    }
    
    // Create metadata for the message
    const metadata = {
      type: 'action_result',
      action,
      timestamp: new Date().toISOString(),
      token_usage: result.token_usage || result.usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      },
      isError
    };
    
    // Create the message object
    const message: Message = {
      id: uuidv4(),
      role: MessageRole.ASSISTANT,
      sender: MessageSender.AI,
      content,
      timestamp: new Date(),
      conversation_id: conversationId || 'pending',
      metadata
    };
    
    // Add to messages
    addMessage(message);
    
    return message;
  }, [addMessage, conversationId, formatDates, getConversationMessagesFromState]);
  
  // Main quick action handler
  const handleQuickAction = useCallback(async (action: string, event?: React.MouseEvent) => {
    // Prevent default behavior in all cases
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      // Use stopImmediatePropagation if available
      if ('stopImmediatePropagation' in event) {
        (event as any).stopImmediatePropagation();
      }
    }
    
    // Check the session storage directly to see if another quick action is running
    // If it's been more than 30 seconds, we'll consider it stale and proceed anyway
    const quickActionTimestamp = sessionStorage.getItem('QUICK_ACTION_TIMESTAMP');
    if (quickActionTimestamp) {
      const timeSinceLastAction = Date.now() - parseInt(quickActionTimestamp);
      // If more than 30 seconds have passed, consider it a stale session and clear it
      if (timeSinceLastAction > 30000) {
        console.log('Detected stale quick action session, clearing flags');
        sessionStorage.removeItem('QUICK_ACTION_IN_PROGRESS');
        sessionStorage.removeItem('QUICK_ACTION_TYPE');
        sessionStorage.removeItem('QUICK_ACTION_TIMESTAMP');
        sessionStorage.removeItem('QUICK_ACTION_SELECTED_DOCS');
        sessionStorage.removeItem('PRESERVE_PAGE_STATE');
        sessionStorage.removeItem('PRESERVE_AUTH_STATE');
      }
    }
    
    // If a quick action is already in progress, block this one
    if (quickActionLoading || isInQuickAction) {
      toast({
        title: "Action Already in Progress",
        description: "Please wait for the current action to complete.",
        variant: "destructive"
      });
      return;
    }
    
    console.log('Starting quick action:', action);
    setQuickActionLoading(true);
    setIsInQuickAction(true);
    
    // CRITICAL: Add this block to properly lock down HMR and prevent any refreshes
    if (typeof window !== 'undefined') {
      // Set session storage flags to prevent refreshes
      sessionStorage.setItem('QUICK_ACTION_IN_PROGRESS', 'true');
      sessionStorage.setItem('QUICK_ACTION_TYPE', action);
      sessionStorage.setItem('QUICK_ACTION_TIMESTAMP', Date.now().toString());
      sessionStorage.setItem('HMR_COMPLETELY_DISABLED', 'true');
      localStorage.setItem('ACTIVE_QUICK_ACTION', action);
      
      // Set window flags to prevent refreshes at runtime
      window.__HMR_DISABLED = true;
      window.__BLOCK_REFRESH_DURING_QUICK_ACTION = true;
      
      // Create a permanent observer to detect and prevent any DOM changes that would trigger a refresh
      const bodyObserver = new MutationObserver((mutations) => {
        if (sessionStorage.getItem('QUICK_ACTION_IN_PROGRESS') === 'true') {
          // Log any attempts to modify the DOM during a quick action
          console.log('DOM modification detected during quick action');
        }
      });
      
      // Start observing with a deep watch on the entire document
      bodyObserver.observe(document.documentElement, { 
        childList: true, 
        subtree: true,
        attributes: true,
        characterData: true 
      });
      
      // Disconnect after a timeout to prevent memory leaks
      setTimeout(() => {
        bodyObserver.disconnect();
        console.log('DOM observer disconnected after quick action');
      }, 30000); // 30 second safety timeout
    }
    // End of critical HMR blocking section
    
    // Get the current conversation messages to preserve them
    try {
      // Cache the current messages in local storage before action
      if (conversationId) {
        const allMessages = getConversationMessagesFromState(conversationId);
        if (allMessages && allMessages.length > 0) {
          localStorage.setItem(
            `QUICK_ACTION_PRE_MESSAGES_${conversationId}`, 
            JSON.stringify(allMessages)
          );
          console.log('Preserved conversation messages before quick action:', allMessages.length);
        }
      }
    } catch (error) {
      console.error('Error preserving messages before quick action:', error);
    }

    try {
      // Set global state to reflect we're in a quick action
      setGlobalQuickActionState(true, action);
      
      // Get the selected document IDs
      const documentIds = getSelectedDocumentIds();
      if (!documentIds || documentIds.length === 0) {
        throw new Error(`No documents were selected for the ${action} action.`);
      }
      
      console.log(`Executing ${action} on ${documentIds.length} documents:`, documentIds);
      
      // Create an abort controller for potential cancellation
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      // Execute the API call to the backend
      console.log(`Calling API for action: ${action} with ${documentIds.length} document IDs`);
      const result = await aiService.handleQuickAction(action, documentIds, selectedModel);
      
      // Log the structure of the result for debugging
      console.log(`[useQuickActions] Received result from ${action}:`, result);
      console.log(`[useQuickActions] Result type: ${typeof result}`);
      console.log(`[useQuickActions] Result keys: ${Object.keys(result).join(', ')}`);
      
      // Special logging for Prepare for Court action
      if (action === 'Prepare for Court') {
        console.log(`[useQuickActions] Court Preparation Result Structure:`);
        console.log(`- Has content: ${result.content !== undefined}`);
        console.log(`- Content length: ${result.content ? result.content.length : 0}`);
        console.log(`- Has data: ${result.data !== undefined}`);
        console.log(`- Data keys: ${result.data ? Object.keys(result.data).join(', ') : 'none'}`);
        console.log(`- Has court_preparation: ${result.court_preparation !== undefined}`);
        console.log(`- Has raw_content: ${result.raw_content !== undefined}`);
        
        // If result seems to be missing content, check all properties
        if (!result.content) {
          console.log(`[useQuickActions] Court preparation result is missing content. Examining all properties:`);
          for (const key in result) {
            const value = result[key];
            if (typeof value === 'string' && value.length > 50) {
              console.log(`- Property ${key} contains text (${value.length} chars): "${value.substring(0, 50)}..."`);
            } else if (typeof value === 'object' && value !== null) {
              console.log(`- Property ${key} is an object with keys: ${Object.keys(value).join(', ')}`);
            } else {
              console.log(`- Property ${key}: ${typeof value} ${value}`);
            }
          }
        }
      }
      
      console.log(`Received result from ${action}:`, result);
      
      // Store the result for debugging
      setLastQuickActionResult(result);
      
      // Process the result into a message
      handleActionResult(action, result);
      
      // Show result dialog if needed
      setShowResultDialog(true);
      
      // Clean up flags and state
      setQuickActionLoading(false);
      setIsInQuickAction(false);
      setGlobalQuickActionState(false);
      
      // Return the result for any further processing
      return result;
    } catch (error) {
      console.error(`Error in quick action ${action}:`, error);
      
      // Show an error toast
      toast({
        title: "Action Failed",
        description: error instanceof Error ? error.message : "An error occurred during the action.",
        variant: "destructive"
      });
      
      // Clean up flags
      setQuickActionLoading(false);
      setIsInQuickAction(false);
      setGlobalQuickActionState(false);
      
      // Re-throw the error for upstream handlers
      throw error;
    } finally {
      // Always reset loading state
      setQuickActionLoading(null);
      
      // Clear abort controller reference
      abortControllerRef.current = null;
    }
  }, [
    quickActionLoading, 
    isInQuickAction, 
    toast, 
    getSelectedDocumentIds, 
    aiService, 
    selectedModel, 
    handleActionResult, 
    setGlobalQuickActionState,
    addMessage,
    clientId,
    conversationId
  ]);
  
  // Function to manually cancel an in-progress quick action
  const cancelQuickAction = useCallback(() => {
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
        console.log('Quick action canceled by user');
        
        // Show a toast to indicate cancellation
        toast({
          title: "Quick Action Canceled",
          description: "The quick action was canceled",
          variant: "default",
        });
        
        // Add a system message about cancellation
        const cancelMessage: Message = {
          id: uuidv4(),
          role: MessageRole.SYSTEM,
          sender: MessageSender.SYSTEM,
          content: "Quick action was canceled by user.",
          timestamp: new Date(),
          conversation_id: conversationId || 'pending',
        };
        
        addMessage(cancelMessage);
        
        // Clear flags
        setQuickActionLoading(null);
        setGlobalQuickActionState(false);
      } catch (e) {
        console.error('Error canceling quick action:', e);
      }
    } else {
      console.log('No active quick action to cancel');
    }
  }, [addMessage, conversationId, setGlobalQuickActionState, toast]);
  
  // On unmount, clear event listeners and handle quick action state
  useEffect(() => {
    return () => {
      // Check if we're unmounting during a quick action
      if (isInQuickAction) {
        console.log('Component unmounting during quick action - preserving global state');
        
        // Ensure we preserve auth state
        sessionStorage.setItem('PRESERVE_AUTH_STATE', 'true');
        
        // Don't clear the quick action flags
        // This ensures they persist until the quick action is actually completed
        
        // Set a special flag to indicate controlled unmount
        sessionStorage.setItem('QUICK_ACTION_CONTROLLED_UNMOUNT', 'true');
        
        // Abort any in-progress requests
        if (abortControllerRef.current) {
          try {
            abortControllerRef.current.abort('Component unmounted during quick action');
          } catch (err) {
            console.error('Error aborting quick action:', err);
          }
        }
      } else {
        // Remove flags only if not in a quick action
        setGlobalQuickActionState(false);
      }
    };
  }, [isInQuickAction, setGlobalQuickActionState]);
  
  // Cleanup all quick action flags function
  const cleanupAllQuickActionFlags = useCallback((source: string = 'unknown') => {
    console.log(`Running comprehensive quick action cleanup (source: ${source})`);
    
    try {
      // Store the last cleanup time to prevent repeated cleanups
      const now = Date.now();
      localStorage.setItem('LAST_QUICK_ACTION_CLEANUP', now.toString());
      
      // Clean up session storage flags
      const sessionFlags = [
        'QUICK_ACTION_IN_PROGRESS',
        'QUICK_ACTION_TYPE',
        'QUICK_ACTION_TIMESTAMP',
        'QUICK_ACTION_SELECTED_DOCS',
        'PRESERVE_PAGE_STATE',
        'PRESERVE_AUTH_STATE',
        'QUICK_ACTION_CLEANUP_IN_PROGRESS',
        'HMR_COMPLETELY_DISABLED',
        'PREVENT_NEW_CHAT'
      ];
      
      sessionFlags.forEach(flag => {
        if (sessionStorage.getItem(flag)) {
          console.log(`Removing session storage flag: ${flag}`);
          sessionStorage.removeItem(flag);
        }
      });
      
      // Clean up local storage flags
      const localFlags = [
        'ACTIVE_QUICK_ACTION',
        'VITE_DISABLE_HMR'
      ];
      
      localFlags.forEach(flag => {
        if (localStorage.getItem(flag)) {
          console.log(`Removing local storage flag: ${flag}`);
          localStorage.removeItem(flag);
        }
      });
      
      // Clear window flags
      if (typeof window !== 'undefined') {
        console.log('Clearing window-level quick action flags');
        
        if (window.__HMR_DISABLED !== undefined) {
          window.__HMR_DISABLED = false;
        }
        
        if (window.__BLOCK_REFRESH_DURING_QUICK_ACTION !== undefined) {
          window.__BLOCK_REFRESH_DURING_QUICK_ACTION = false;
        }
        
        if (window.__QUICK_ACTION_IN_PROGRESS !== undefined) {
          window.__QUICK_ACTION_IN_PROGRESS = false;
        }
      }
      
      // Re-enable HMR
      console.log('Re-enabling HMR after cleanup');
      
      // Clear component state
      setQuickActionLoading(false);
      setIsInQuickAction(false);
      
      return true;
    } catch (error) {
      console.error('Error during quick action cleanup:', error);
      return false;
    }
  }, [setQuickActionLoading, setIsInQuickAction]);
  
  // Run cleanup on mount if needed (recovers from interrupted quick actions)
  useEffect(() => {
    // Check if there's a stale quick action that needs cleanup
    const quickActionTimestamp = sessionStorage.getItem('QUICK_ACTION_TIMESTAMP');
    
    if (quickActionTimestamp) {
      const timestamp = parseInt(quickActionTimestamp, 10);
      const now = Date.now();
      const timeSinceAction = now - timestamp;
      
      // If it's been more than 2 minutes, consider it stale
      if (timeSinceAction > 120000) {
        console.log('Detected stale quick action on mount, cleaning up');
        cleanupAllQuickActionFlags('mount-stale-detection');
      } else {
        console.log('Detected recent quick action on mount, preserving state');
      }
    }
    
    // Check for interrupted quick actions
    if (sessionStorage.getItem('QUICK_ACTION_IN_PROGRESS') === 'true' && 
        !isInQuickAction && 
        !quickActionLoading) {
      console.log('Detected interrupted quick action, cleaning up');
      cleanupAllQuickActionFlags('mount-interrupted-detection');
    }
    
    return () => {
      // On unmount, check if we need to clean up
      if (!isInQuickAction && !quickActionLoading) {
        cleanupAllQuickActionFlags('unmount');
      }
    };
  }, [cleanupAllQuickActionFlags, isInQuickAction, quickActionLoading]);
  
  return {
    quickActionLoading,
    lastQuickActionResult,
    showResultDialog,
    setShowResultDialog,
    handleQuickAction,
    cancelQuickAction,
    isInQuickAction,
    // All-in-one function that handles document selection and quick action
    processQuickAction: async (actionType: string, documentIdsOverride?: string[]) => {
      // Get documents - either from override or from current selection
      const documentIds = documentIdsOverride || getSelectedDocumentIds();
      if (!documentIds.length) {
        toast({ title: "No documents selected", description: "Please select at least one document to perform this action.", variant: "destructive" });
        return false;
      }
      
      // Execute the quick action with proper error handling
      try {
        await handleQuickAction(actionType);
        return true;
      } catch (error) {
        console.error(`Quick action ${actionType} failed:`, error);
        toast({ title: "Error", description: `Failed to process ${actionType}: ${error.message || 'Unknown error'}`, variant: "destructive" });
        return false;
      }
    }
  };
} 