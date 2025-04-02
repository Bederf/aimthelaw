export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admins: {
        Row: {
          address_line1: string | null
          admin_id: string | null
          city: string | null
          created_at: string | null
          email: string
          id: string
          id_number: string
          phone: string | null
          postal_code: string | null
          status: string | null
        }
        Insert: {
          address_line1?: string | null
          admin_id?: string | null
          city?: string | null
          created_at?: string | null
          email: string
          id: string
          id_number: string
          phone?: string | null
          postal_code?: string | null
          status?: string | null
        }
        Update: {
          address_line1?: string | null
          admin_id?: string | null
          city?: string | null
          created_at?: string | null
          email?: string
          id?: string
          id_number?: string
          phone?: string | null
          postal_code?: string | null
          status?: string | null
        }
        Relationships: []
      }
      client_files: {
        Row: {
          category: string | null
          client_id: string | null
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          lawyer_id: string | null
          processing_cost: number | null
          status: string | null
          subcategory: string | null
          tokens_used: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          client_id?: string | null
          created_at?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          lawyer_id?: string | null
          processing_cost?: number | null
          status?: string | null
          subcategory?: string | null
          tokens_used?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          client_id?: string | null
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          lawyer_id?: string | null
          processing_cost?: number | null
          status?: string | null
          subcategory?: string | null
          tokens_used?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_files_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "lawyers"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          client_id: string | null
          created_at: string | null
          email: string
          id: string
          id_number: string
          phone: string | null
          photo_url: string | null
          role: string
          status: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          email: string
          id: string
          id_number: string
          phone?: string | null
          photo_url?: string | null
          role: string
          status?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          id_number?: string
          phone?: string | null
          photo_url?: string | null
          role?: string
          status?: string | null
        }
        Relationships: []
      }
      lawyer_clients: {
        Row: {
          client_id: string | null
          created_at: string | null
          id: string
          lawyer_id: string | null
          status: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          lawyer_id?: string | null
          status?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          lawyer_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lawyer_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      lawyers: {
        Row: {
          created_at: string | null
          email: string
          id: string
          id_number: string
          lawyer_id: string | null
          phone: string | null
          photo_url: string | null
          role: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          id_number: string
          lawyer_id?: string | null
          phone?: string | null
          photo_url?: string | null
          role: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          id_number?: string
          lawyer_id?: string | null
          phone?: string | null
          photo_url?: string | null
          role?: string
          status?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          first_name: string | null
          id: string
          last_name: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_client_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      token_balances: {
        Row: {
          balance: number | null
          client_id: string
          created_at: string | null
          id: string
          last_updated: string | null
          total_cost: number | null
          total_tokens: number | null
        }
        Insert: {
          balance?: number | null
          client_id: string
          created_at?: string | null
          id?: string
          last_updated?: string | null
          total_cost?: number | null
          total_tokens?: number | null
        }
        Update: {
          balance?: number | null
          client_id?: string
          created_at?: string | null
          id?: string
          last_updated?: string | null
          total_cost?: number | null
          total_tokens?: number | null
        }
        Relationships: []
      }
      token_costs: {
        Row: {
          created_at: string | null
          id: string
          rate: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          rate: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          rate?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      token_transactions: {
        Row: {
          client_id: string
          cost_per_token: number
          created_at: string | null
          id: string
          service: string
          tokens_used: number
          total_cost: number
        }
        Insert: {
          client_id: string
          cost_per_token: number
          created_at?: string | null
          id?: string
          service: string
          tokens_used: number
          total_cost: number
        }
        Update: {
          client_id?: string
          cost_per_token?: number
          created_at?: string | null
          id?: string
          service?: string
          tokens_used?: number
          total_cost?: number
        }
        Relationships: []
      }
      token_usage: {
        Row: {
          client_id: string
          cost: number
          created_at: string | null
          id: string
          metadata: Json | null
          model: string
          service: string
          timestamp: string | null
          tokens_used: number
        }
        Insert: {
          client_id: string
          cost: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          model: string
          service: string
          timestamp?: string | null
          tokens_used: number
        }
        Update: {
          client_id?: string
          cost?: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          model?: string
          service?: string
          timestamp?: string | null
          tokens_used?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_document_tokens: {
        Args: {
          p_file_size: number
        }
        Returns: number
      }
      generate_client_id: {
        Args: {
          p_surname: string
          p_id_number: string
        }
        Returns: string
      }
      generate_lawyer_id: {
        Args: {
          p_surname: string
          p_id_number: string
        }
        Returns: string
      }
      get_token_usage: {
        Args: {
          p_start_date: string
          p_end_date: string
          p_user_id?: string
          p_client_id?: string
        }
        Returns: Json
      }
      is_admin: {
        Args: {
          user_id: string
        }
        Returns: boolean
      }
      verify_unique_id_number: {
        Args: {
          p_id_number: string
          p_role: string
        }
        Returns: boolean
      }
    }
    Enums: {
      document_category:
        | "legal_documents"
        | "financial_records"
        | "correspondence"
        | "evidence"
        | "court_filings"
        | "personal_documents"
        | "other"
      document_subcategory:
        | "contracts"
        | "agreements"
        | "invoices"
        | "statements"
        | "letters"
        | "emails"
        | "photos"
        | "videos"
        | "pleadings"
        | "motions"
        | "identification"
        | "certificates"
        | "miscellaneous"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
