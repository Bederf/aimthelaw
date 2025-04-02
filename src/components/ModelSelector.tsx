import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AIModel, ModelOption, MODEL_OPTIONS } from '@/hooks/useModelSelection';

interface ModelSelectorProps {
  selectedModel: AIModel;
  onModelChange: (model: AIModel) => void;
  className?: string;
}

export function ModelSelector({ selectedModel, onModelChange, className }: ModelSelectorProps) {
  // Find the current model option
  const currentModel = MODEL_OPTIONS.find(option => option.id === selectedModel);

  return (
    <Select
      value={selectedModel}
      onValueChange={(value) => onModelChange(value as AIModel)}
    >
      <SelectTrigger className={className}>
        <SelectValue>
          {currentModel ? `${currentModel.name} (${currentModel.description})` : 'Select Model'}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {MODEL_OPTIONS.map((option: ModelOption) => (
          <SelectItem key={option.id} value={option.id}>
            {option.name} ({option.description})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 