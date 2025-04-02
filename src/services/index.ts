// Export all AI service types
export { AIService } from './aiService';
/** @deprecated Use getAIService() from utils/serviceInitializer instead */
export { ModernAIService } from './modernAIService';
/** @deprecated Use getAIService() from utils/serviceInitializer instead */
export { LocalAIService } from './localAIService';
export { LangchainService } from './langchainService';
export { tokenService } from './tokenService';
export { loggingService } from './loggingService';

// Export the consolidated service
export { 
  ConsolidatedAIService,
  ProcessState
} from './consolidatedAIService';

// Instead of creating instances directly, import from serviceInitializer
// This ensures we maintain service instance caching and prevent duplication
import { getAIService, getAdaptedAIService } from '@/utils/serviceInitializer';

// Re-export the interface definitions directly to avoid module resolution issues
import { ProcessState } from './consolidatedAIService';
export interface ProcessProgress {
  state: ProcessState;
  progress?: number; // 0-100
  detail?: string;
  error?: string;
}

export interface AIProcessingOptions {
  forceDocumentAnalysis?: boolean;
  skipSemanticSearch?: boolean;
  analyzeFullDocument?: boolean;
  isQuickAction?: boolean;
  customSystemPrompt?: string;
  includeDocumentContent?: boolean;
  progressCallback?: (progress: ProcessProgress) => void;
}

// Define ModuleOutput interface to avoid the export error
export interface ModuleOutput {
  status: string;
  message?: string;
  progress?: number;
  data?: any;
  error?: string;
}

// Export the adapter for backward compatibility
export {
  UnifiedAIService,
} from './aiServicesAdapter';

// Export singleton instances from the service initializer
// This ensures we're using the cached instances throughout the app
export { 
  getAIService,
  getAdaptedAIService, 
  getAppropriateAIService,
  clearServiceCache
} from '@/utils/serviceInitializer';

// Create singleton instances for compatibility with old code
// These will be initialized only once and then cached
export const consolidatedAIService = getAIService('00000000-0000-0000-0000-000000000000');
export const unifiedAIService = getAdaptedAIService('00000000-0000-0000-0000-000000000000'); 