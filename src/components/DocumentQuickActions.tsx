const handleAnalyzeClick = async (documentId: string) => {
  try {
    console.log("QuickAction: Analyze clicked for document", documentId);
    const result = await handleQuickAction('analyze', documentId);
    console.log("Analysis result:", result);
    
    // Make sure we have something to display
    if (result) {
      // Create a safe object with required fields
      const safeResult = {
        ...result,
        analysis: result.analysis || result.response || "No analysis available",
      };
      
      setAnalysisData(safeResult);
      setShowAnalysisModal(true);
    } else {
      toast.error("No analysis available");
    }
  } catch (error) {
    console.error("Error in analyze quick action:", error);
    toast.error("Failed to analyze document");
  }
}; 