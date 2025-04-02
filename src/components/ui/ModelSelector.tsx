import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { InfoCircledIcon, ReloadIcon } from '@radix-ui/react-icons';
import { apiClient } from '@/lib/api-client';

// Model definition type
interface AIModel {
  id: string;
  name: string;
  capabilities: string[];
  max_tokens?: number;
  speed_rating?: number;
  accuracy_rating?: number;
}

// Model selection props
interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  autoSelect?: boolean;
  query?: string;
  documentCount?: number;
  showRecommendationButton?: boolean;
  className?: string;
  conversationId?: string;
}

/**
 * ModelSelector component for selecting AI models
 * 
 * This component provides a dropdown interface for selecting different
 * AI models, with optional automatic model recommendation based on the query.
 */
export function ModelSelector({
  selectedModel,
  onModelChange,
  autoSelect = false,
  query = '',
  documentCount = 0,
  showRecommendationButton = true,
  className = '',
  conversationId
}: ModelSelectorProps) {
  const [models, setModels] = useState<AIModel[]>([]);
  const [defaultModel, setDefaultModel] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRecommendationLoading, setIsRecommendationLoading] = useState<boolean>(false);
  const [recommendedModel, setRecommendedModel] = useState<string | null>(null);
  const [recommendationReason, setRecommendationReason] = useState<string | null>(null);
  
  // Fetch available models on component mount
  useEffect(() => {
    const fetchModels = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get('/models/available');
        setModels(response.data.models);
        setDefaultModel(response.data.default_model);
        
        // Set default model if none selected
        if (!selectedModel && response.data.default_model) {
          onModelChange(response.data.default_model);
        }
      } catch (error) {
        console.error('Error fetching models:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchModels();
  }, [selectedModel, onModelChange]);
  
  // Auto-select model based on query if autoSelect is enabled
  useEffect(() => {
    if (autoSelect && query && query.length > 10) {
      getModelRecommendation();
    }
  }, [autoSelect, query, documentCount]);
  
  // Get model recommendation based on query
  const getModelRecommendation = async () => {
    if (!query) return;
    
    setIsRecommendationLoading(true);
    try {
      const response = await apiClient.post('/models/select', {
        query,
        conversation_id: conversationId,
        document_count: documentCount,
        criteria: ['complexity', 'accuracy', 'cost']
      });
      
      setRecommendedModel(response.data.model);
      setRecommendationReason(response.data.selection_reason);
      
      // Auto-apply recommendation if autoSelect is enabled
      if (autoSelect && response.data.model !== selectedModel) {
        onModelChange(response.data.model);
      }
    } catch (error) {
      console.error('Error getting model recommendation:', error);
    } finally {
      setIsRecommendationLoading(false);
    }
  };
  
  // Get model details by ID
  const getModelById = (modelId: string): AIModel | undefined => {
    return models.find(model => model.id === modelId);
  };
  
  // Render capability badges for a model
  const renderCapabilityBadges = (capabilities: string[]) => {
    return capabilities.map(capability => (
      <Badge key={capability} variant="outline" className="mr-1 mb-1">
        {capability.replace('_', ' ')}
      </Badge>
    ));
  };
  
  // Get human-readable recommendation reason
  const getHumanReadableReason = (reason: string | null): string => {
    if (!reason) return '';
    
    const reasonMap: Record<string, string> = {
      'complexity_match': 'Best match for query complexity',
      'fast_response': 'Optimized for fast response',
      'cost_efficient': 'Most cost-effective option',
      'high_accuracy': 'Highest accuracy model',
      'user_preferred': 'Your preferred model',
      'context_length': 'Handles large context length',
      'fallback': 'Default selection'
    };
    
    return reasonMap[reason] || reason;
  };
  
  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-center gap-2">
        <Select
          value={selectedModel}
          onValueChange={onModelChange}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select Model" />
          </SelectTrigger>
          <SelectContent>
            {models.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                <div className="flex items-center">
                  {model.name}
                  {recommendedModel === model.id && (
                    <Badge variant="secondary" className="ml-2">
                      Recommended
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {showRecommendationButton && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={getModelRecommendation}
                  disabled={isRecommendationLoading || !query}
                >
                  {isRecommendationLoading ? (
                    <ReloadIcon className="h-4 w-4 animate-spin" />
                  ) : (
                    <InfoCircledIcon className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Get model recommendation for your query
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      
      {/* Selected model details */}
      {selectedModel && (
        <Card className="mt-2 p-2">
          <CardHeader className="p-2">
            <CardTitle className="text-sm">
              {getModelById(selectedModel)?.name}
            </CardTitle>
            {recommendedModel === selectedModel && recommendationReason && (
              <CardDescription className="text-xs">
                {getHumanReadableReason(recommendationReason)}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="p-2">
            <div className="flex flex-wrap gap-1">
              {getModelById(selectedModel)?.capabilities && 
                renderCapabilityBadges(getModelById(selectedModel)!.capabilities)}
            </div>
          </CardContent>
          {getModelById(selectedModel)?.speed_rating && (
            <CardFooter className="p-2 text-xs flex justify-between">
              <span>Speed: {getModelById(selectedModel)?.speed_rating}/5</span>
              <span>Accuracy: {getModelById(selectedModel)?.accuracy_rating}/5</span>
            </CardFooter>
          )}
        </Card>
      )}
    </div>
  );
} 