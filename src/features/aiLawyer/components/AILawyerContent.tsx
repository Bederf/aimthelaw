import React from 'react';
import { useAILawyer } from '../context/AILawyerContext';
import { DocumentSelector } from './DocumentSelector';
import { QuickActionsPanel } from './QuickActions/QuickActionsPanel';
import { ResultDialog } from './QuickActions/ResultDialog';
import ChatInterface from './ChatInterface';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { ModelSelector } from '@/components/ModelSelector';

// The actual content of the AI Lawyer page - this component must be used within AILawyerProvider
const AILawyerContent = () => {
  const { 
    sidebarOpen, 
    handleNewChat, 
    selectedModel, 
    setSelectedModel, 
    tokenInfo,
    clientName,
    clientBusinessId
  } = useAILawyer();
  
  return (
    <div className="container mx-auto py-4 h-full flex flex-col overflow-hidden">
      {/* Beta Version Notification - Removed */}
      
      <div className="flex flex-col h-[calc(100vh-140px)] overflow-hidden rounded-lg border flex-1">
        {/* Header with AI Assistant title, Quick Actions, Model Selector, and New Chat button */}
        <div className="border-b flex items-center p-3">
          {/* Left side - AI Assistant title and client info */}
          <div className="flex items-center gap-2 min-w-fit">
            <h1 className="text-xl font-bold">AI Assistant</h1>
            {clientName && <span className="text-sm text-muted-foreground">- {clientName}</span>}
            {clientBusinessId && <span className="ml-2 px-2 py-1 bg-primary/10 rounded text-xs font-mono">{clientBusinessId}</span>}
          </div>
          
          {/* Middle - Quick Actions Panel - fixed width */}
          <div className="flex-1 flex justify-center mx-4">
            <QuickActionsPanel />
          </div>
          
          {/* Right side - Token info, Model selector, and New Chat button */}
          <div className="flex items-center gap-3 min-w-fit">
            {/* Token display - showing only token count */}
            <div className="text-xs text-muted-foreground">
              Tokens: <span className="font-mono">{tokenInfo.totalTokens.toLocaleString()}</span>
            </div>
            
            {/* Model selector with label */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Model:</span>
              <ModelSelector 
                selectedModel={selectedModel} 
                onModelChange={setSelectedModel}
                className="h-8 min-w-[160px] text-xs bg-muted/20"
              />
            </div>
            
            {/* New Chat button */}
            <Button
              onClick={handleNewChat}
              variant="default"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center h-8 px-3"
            >
              <PlusCircle className="h-3.5 w-3.5 mr-1" />
              New Chat
            </Button>
          </div>
        </div>
        
        <div className="flex h-full flex-1 overflow-hidden">
          {/* Left side: Document Selector */}
          <DocumentSelector />
          
          {/* Right side: Chat Interface */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <ChatInterface />
          </div>
        </div>
      </div>
      
      {/* Quick Actions Result Dialog */}
      <ResultDialog />
    </div>
  );
};

export default AILawyerContent; 