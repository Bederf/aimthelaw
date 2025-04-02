import { supabase } from "@/integrations/supabase/client";
import { api } from "@/lib/api";

interface LegalAnalysisResult {
  analysis: string;
  metadata?: {
    token_usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
    cost: number;
  };
}

interface LegalQueryResult {
  response: string;
  metadata?: {
    token_usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
    cost: number;
    sources?: Array<{
      id: string;
      content: string;
      metadata: {
        documentId: string;
        chunkIndex: number;
      };
    }>;
  };
}

export async function fetchClientFiles(clientId: string | undefined) {
  if (!clientId) throw new Error("Client ID is required");

  const { data, error } = await supabase
    .from("client_files")
    .select("*")
    .eq("client_id", clientId)
    .neq("status", "failed")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function analyzeLegalFile(fileId: string, clientId: string): Promise<LegalAnalysisResult> {
  const response = await api.post("/api/query", {
    query: "Perform a comprehensive legal analysis of the document",
    document_id: fileId,
    client_id: clientId,
    use_rag: true
  });
  return response;
}

export async function askLegalQuery(
  query: string,
  documentId: string | null,
  clientId: string
): Promise<LegalQueryResult> {
  const response = await api.post("/api/query", {
    query,
    documents: documentId ? [documentId] : undefined,
    client_id: clientId,
    use_rag: Boolean(documentId)
  });
  return response;
} 