
export type Database = {
  public: {
    Tables: {
      admins: {
        Row: {
          id: string;
          admin_id: string;
          email: string;
          id_number: string;
          phone: string;
          address_line1: string;
          city: string;
          postal_code: string;
          status: string;
          created_at: string;
          role: string;
          photo_url: string | null;
          updated_at: string;
        };
        Insert: {
          admin_id: string;
          email: string;
          id_number: string;
          phone: string;
          address_line1: string;
          city: string;
          postal_code: string;
          status: string;
          role: string;
          photo_url?: string | null;
        };
        Update: Partial<{
          admin_id: string;
          email: string;
          id_number: string;
          phone: string;
          address_line1: string;
          city: string;
          postal_code: string;
          status: string;
          role: string;
          photo_url?: string | null;
          updated_at: string;
        }>;
      };
      client_files: {
        Row: {
          id: string;
          lawyer_id: string;
          file_name: string;
          file_path: string;
          file_type: string;
          file_size: number;
          category: string;
          subcategory: string;
          status: string;
          created_at: string;
          updated_at: string;
          tokens_used: number;
          processing_cost: number;
          client_id: string;
          metadata: Record<string, unknown>;
          description: string | null;
          title: string | null;
          chunks_count: number;
          uploaded_at: string;
        };
        Insert: {
          lawyer_id: string;
          file_name: string;
          file_path: string;
          file_type: string;
          file_size: number;
          category: string;
          subcategory: string;
          status: string;
          tokens_used: number;
          processing_cost: number;
          client_id: string;
          metadata: Record<string, unknown>;
          description?: string | null;
          title?: string | null;
          chunks_count: number;
          uploaded_at: string;
        };
        Update: Partial<{
          lawyer_id: string;
          file_name: string;
          file_path: string;
          file_type: string;
          file_size: number;
          category: string;
          subcategory: string;
          status: string;
          tokens_used: number;
          processing_cost: number;
          client_id: string;
          metadata: Record<string, unknown>;
          description?: string | null;
          title?: string | null;
          chunks_count: number;
          uploaded_at: string;
          updated_at: string;
        }>;
      };
      clients: {
        Row: {
          id: string;
          client_id: string;
          id_number: string;
          email: string;
          phone: string;
          status: string;
          created_at: string;
          role: string;
          photo_url: string | null;
          address_line1: string | null;
          city: string | null;
          postal_code: string | null;
          updated_at: string;
        };
        Insert: {
          client_id: string;
          id_number: string;
          email: string;
          phone: string;
          status: string;
          role: string;
          photo_url?: string | null;
          address_line1?: string | null;
          city?: string | null;
          postal_code?: string | null;
        };
        Update: Partial<{
          client_id: string;
          id_number: string;
          email: string;
          phone: string;
          status: string;
          role: string;
          photo_url?: string | null;
          address_line1?: string | null;
          city?: string | null;
          postal_code?: string | null;
          updated_at: string;
        }>;
      };
      conversation_messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: string;
          content: string;
          metadata: Record<string, unknown>;
          token_usage: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          conversation_id: string;
          role: string;
          content: string;
          metadata: Record<string, unknown>;
          token_usage: Record<string, unknown>;
        };
        Update: Partial<{
          conversation_id: string;
          role: string;
          content: string;
          metadata: Record<string, unknown>;
          token_usage: Record<string, unknown>;
        }>;
      };
      conversations: {
        Row: {
          id: string;
          client_id: string;
          title: string;
          summary: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          client_id: string;
          title: string;
          summary?: string | null;
        };
        Update: Partial<{
          client_id: string;
          title: string;
          summary?: string | null;
          updated_at: string;
        }>;
      };
      document_insights: {
        Row: {
          id: string;
          document_id: string;
          client_id: string;
          insight_type: string;
          content: Record<string, unknown>;
          confidence: number;
          extracted_at: string;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          document_id: string;
          client_id: string;
          insight_type: string;
          content: Record<string, unknown>;
          confidence: number;
          extracted_at: string;
          metadata: Record<string, unknown>;
        };
        Update: Partial<{
          document_id: string;
          client_id: string;
          insight_type: string;
          content: Record<string, unknown>;
          confidence: number;
          extracted_at: string;
          metadata: Record<string, unknown>;
          updated_at: string;
        }>;
      };
      lawyer_clients: {
        Row: {
          id: string;
          lawyer_id: string;
          client_id: string;
          status: string;
          created_at: string;
        };
        Insert: {
          lawyer_id: string;
          client_id: string;
          status: string;
        };
        Update: Partial<{
          lawyer_id: string;
          client_id: string;
          status: string;
        }>;
      };
      lawyers: {
        Row: {
          id: string;
          lawyer_id: string;
          id_number: string;
          email: string;
          phone: string;
          status: string;
          created_at: string;
          role: string;
          photo_url: string | null;
          address_line1: string | null;
          city: string | null;
          postal_code: string | null;
          updated_at: string;
        };
        Insert: {
          lawyer_id: string;
          id_number: string;
          email: string;
          phone: string;
          status: string;
          role: string;
          photo_url?: string | null;
          address_line1?: string | null;
          city?: string | null;
          postal_code?: string | null;
        };
        Update: Partial<{
          lawyer_id: string;
          id_number: string;
          email: string;
          phone: string;
          status: string;
          role: string;
          photo_url?: string | null;
          address_line1?: string | null;
          city?: string | null;
          postal_code?: string | null;
          updated_at: string;
        }>;
      };
      token_usage: {
        Row: {
          id: string;
          client_id: string;
          service: string;
          tokens_used: number;
          cost: number;
          model: string;
          created_at: string;
          metadata: Record<string, unknown>;
        };
        Insert: {
          client_id: string;
          service: string;
          tokens_used: number;
          cost: number;
          model: string;
          metadata: Record<string, unknown>;
        };
        Update: Partial<{
          client_id: string;
          service: string;
          tokens_used: number;
          cost: number;
          model: string;
          metadata: Record<string, unknown>;
        }>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
