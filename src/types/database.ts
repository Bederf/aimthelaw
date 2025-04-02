interface Tables {
  // ...existing code...
  conversations: {
    Row: {
      id: string;
      client_id: string;
      created_at: string;
      summary: string;
      // Add other fields as needed
    };
  };
  conversation_messages: {
    Row: {
      id: string;
      conversation_id: string;
      content: string;
      role: string;
      metadata: Record<string, unknown>;
      timestamp: string;
      // Add other fields as needed
    };
  };
  // ...existing code...
}
