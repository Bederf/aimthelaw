import { useState, useEffect } from 'react';

// Update to include Claude and Deepseek models
export type AIModel = 
  | 'gpt-4o-mini' 
  | 'gpt-4o' 
  | 'gpt-4-turbo' 
  | 'claude-3-7-sonnet' 
  | 'deepseek-coder';

export interface ModelOption {
  id: AIModel;
  name: string;
  description: string;
}

// Update model options to include Claude and Deepseek
export const MODEL_OPTIONS: ModelOption[] = [
  { id: 'gpt-4o-mini', name: 'GPT-4o mini', description: 'Fast & Efficient' },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'Powerful & Accurate' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Advanced Reasoning' },
  { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet', description: 'Excellent Legal Analysis' },
  { id: 'deepseek-coder', name: 'Deepseek Coder', description: 'Code & Technical Analysis' }
];

export function useModelSelection(defaultModel: AIModel = 'gpt-4o-mini') {
  const [selectedModel, setSelectedModel] = useState<AIModel>(defaultModel);

  // Load saved model preference from localStorage on mount
  useEffect(() => {
    const savedModel = localStorage.getItem('selectedAIModel') as AIModel;
    // Only use the saved model if it's in our current options
    if (savedModel && MODEL_OPTIONS.some(option => option.id === savedModel)) {
      setSelectedModel(savedModel);
    } else {
      // If the saved model is no longer valid, reset to default
      localStorage.setItem('selectedAIModel', defaultModel);
    }
  }, [defaultModel]);

  // Save model preference to localStorage when it changes
  const handleModelChange = (model: AIModel) => {
    setSelectedModel(model);
    localStorage.setItem('selectedAIModel', model);
  };

  return {
    selectedModel,
    setSelectedModel: handleModelChange,
    modelOptions: MODEL_OPTIONS
  };
} 