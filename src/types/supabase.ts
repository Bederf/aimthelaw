Need to install the following packages:
supabase@2.15.8
Ok to proceed? (y) 

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
        Insert: Omit<Row, 'id'|'created_at'|'updated_at'>;
        Update: Partial<Row>;
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
        Insert: Omit<Row, 'id'|'created_at'|'updated_at'>;
        Update: Partial<Row>;
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
        Insert: Omit<Row, 'id'|'created_at'|'updated_at'>;
        Update: Partial<Row>;
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
        Insert: Omit<Row, 'id'|'created_at'>;
        Update: Partial<Row>;
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
        Insert: Omit<Row, 'id'|'created_at'|'updated_at'>;
        Update: Partial<Row>;
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
        Insert: Omit<Row, 'id'|'created_at'|'updated_at'>;
        Update: Partial<Row>;
      };
      lawyer_clients: {
        Row: {
          id: string;
          lawyer_id: string;
          client_id: string;
          status: string;
          created_at: string;
        };
        Insert: Omit<Row, 'id'|'created_at'>;
        Update: Partial<Row>;
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
        Insert: Omit<Row, 'id'|'created_at'|'updated_at'>;
        Update: Partial<Row>;
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
        Insert: Omit<Row, 'id'|'created_at'>;
        Update: Partial<Row>;
      };
    };
    Views: {
      // Add view definitions if needed
    };
    Functions: {
      // Add function definitions if needed
    };
    Enums: {
      // Add enum definitions if needed
    };
  };
}; 