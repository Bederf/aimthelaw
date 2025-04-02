import { RealTimeAITab } from "@/pages/lawyer/components/RealTimeAITab";

<div className="flex-1">
  <Tabs defaultValue="chat">
    <div className="border-b px-4">
      <TabsList>
        <TabsTrigger value="chat">Chat</TabsTrigger>
        <TabsTrigger value="realtime">Real-time Query</TabsTrigger>
      </TabsList>
    </div>
    
    <TabsContent value="chat" className="flex-1 h-full">
      <AILawyerContent 
        client={client}
        clientId={clientId || ''}
        selectedModel={selectedModel}
        selectedDocuments={selectedFiles}
        documents={documents}
      />
    </TabsContent>
    
    <TabsContent value="realtime" className="flex-1 h-full">
      <RealTimeAITab 
        clientId={clientId || ''}
        selectedDocuments={selectedFiles}
        documentsAvailable={documents.length > 0}
      />
    </TabsContent>
  </Tabs>
</div> 