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
      _migrations: {
        Row: {
          applied_at: string | null
          name: string
        }
        Insert: {
          applied_at?: string | null
          name: string
        }
        Update: {
          applied_at?: string | null
          name?: string
        }
        Relationships: []
      }
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
          photo_url: string | null
          postal_code: string | null
          role: string
          status: string | null
          updated_at: string | null
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
          photo_url?: string | null
          postal_code?: string | null
          role?: string
          status?: string | null
          updated_at?: string | null
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
          photo_url?: string | null
          postal_code?: string | null
          role?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_history: {
        Row: {
          chat_id: string
          created_at: string | null
          embedding: string | null
          id: string
          role: string
          text: string
        }
        Insert: {
          chat_id: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          role: string
          text: string
        }
        Update: {
          chat_id?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          role?: string
          text?: string
        }
        Relationships: []
      }
      client_chronology: {
        Row: {
          client_id: string
          confidence: number | null
          created_at: string | null
          date: string | null
          description: string | null
          id: string
          is_pinned: boolean | null
          lawyer_id: string | null
          source: string | null
          source_document: string | null
          source_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          client_id: string
          confidence?: number | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: string
          is_pinned?: boolean | null
          lawyer_id?: string | null
          source?: string | null
          source_document?: string | null
          source_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          confidence?: number | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: string
          is_pinned?: boolean | null
          lawyer_id?: string | null
          source?: string | null
          source_document?: string | null
          source_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      client_files: {
        Row: {
          category: string | null
          chunks_count: number | null
          client_id: string | null
          created_at: string | null
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          lawyer_id: string
          metadata: Json | null
          processing_cost: number | null
          status: string | null
          subcategory: string | null
          title: string | null
          tokens_used: number | null
          updated_at: string | null
          uploaded_at: string | null
        }
        Insert: {
          category?: string | null
          chunks_count?: number | null
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          lawyer_id: string
          metadata?: Json | null
          processing_cost?: number | null
          status?: string | null
          subcategory?: string | null
          title?: string | null
          tokens_used?: number | null
          updated_at?: string | null
          uploaded_at?: string | null
        }
        Update: {
          category?: string | null
          chunks_count?: number | null
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          lawyer_id?: string
          metadata?: Json | null
          processing_cost?: number | null
          status?: string | null
          subcategory?: string | null
          title?: string | null
          tokens_used?: number | null
          updated_at?: string | null
          uploaded_at?: string | null
        }
        Relationships: []
      }
      client_maintenance_data: {
        Row: {
          bankbalance: number | null
          client_id: string
          created_at: string | null
          debtrepayments: number | null
          education: number | null
          groceries: number | null
          grosssalary: number | null
          housing: number | null
          id: string
          insurance: number | null
          medical: number | null
          metadata: Json | null
          otherexpenses: number | null
          otherincome: number | null
          savingsinvestments: number | null
          totalexpenses: number | null
          totalincome: number | null
          transport: number | null
          updated_at: string | null
          utilities: number | null
        }
        Insert: {
          bankbalance?: number | null
          client_id: string
          created_at?: string | null
          debtrepayments?: number | null
          education?: number | null
          groceries?: number | null
          grosssalary?: number | null
          housing?: number | null
          id?: string
          insurance?: number | null
          medical?: number | null
          metadata?: Json | null
          otherexpenses?: number | null
          otherincome?: number | null
          savingsinvestments?: number | null
          totalexpenses?: number | null
          totalincome?: number | null
          transport?: number | null
          updated_at?: string | null
          utilities?: number | null
        }
        Update: {
          bankbalance?: number | null
          client_id?: string
          created_at?: string | null
          debtrepayments?: number | null
          education?: number | null
          groceries?: number | null
          grosssalary?: number | null
          housing?: number | null
          id?: string
          insurance?: number | null
          medical?: number | null
          metadata?: Json | null
          otherexpenses?: number | null
          otherincome?: number | null
          savingsinvestments?: number | null
          totalexpenses?: number | null
          totalincome?: number | null
          transport?: number | null
          updated_at?: string | null
          utilities?: number | null
        }
        Relationships: []
      }
      client_transactions: {
        Row: {
          amount: number
          category: string
          client_id: string
          created_at: string | null
          date: string
          description: string
          document_id: string | null
          id: string
          metadata: Json | null
          type: string
        }
        Insert: {
          amount: number
          category: string
          client_id: string
          created_at?: string | null
          date: string
          description: string
          document_id?: string | null
          id?: string
          metadata?: Json | null
          type: string
        }
        Update: {
          amount?: number
          category?: string
          client_id?: string
          created_at?: string | null
          date?: string
          description?: string
          document_id?: string | null
          id?: string
          metadata?: Json | null
          type?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address_line1: string | null
          city: string | null
          client_id: string | null
          created_at: string | null
          email: string
          id: string
          id_number: string
          phone: string | null
          photo_url: string | null
          postal_code: string | null
          role: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          address_line1?: string | null
          city?: string | null
          client_id?: string | null
          created_at?: string | null
          email: string
          id: string
          id_number: string
          phone?: string | null
          photo_url?: string | null
          postal_code?: string | null
          role?: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          address_line1?: string | null
          city?: string | null
          client_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          id_number?: string
          phone?: string | null
          photo_url?: string | null
          postal_code?: string | null
          role?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      conversation_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
          updated_at: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_states: {
        Row: {
          awaiting_human_input: boolean | null
          client_id: string
          completed_nodes: Json | null
          context: Json | null
          conversation_id: string
          cost: number | null
          created_at: string | null
          current_node: string | null
          feedback_session_id: string | null
          id: string
          messages: Json | null
          token_usage: Json | null
          updated_at: string | null
          workflow_id: string | null
        }
        Insert: {
          awaiting_human_input?: boolean | null
          client_id: string
          completed_nodes?: Json | null
          context?: Json | null
          conversation_id: string
          cost?: number | null
          created_at?: string | null
          current_node?: string | null
          feedback_session_id?: string | null
          id?: string
          messages?: Json | null
          token_usage?: Json | null
          updated_at?: string | null
          workflow_id?: string | null
        }
        Update: {
          awaiting_human_input?: boolean | null
          client_id?: string
          completed_nodes?: Json | null
          context?: Json | null
          conversation_id?: string
          cost?: number | null
          created_at?: string | null
          current_node?: string | null
          feedback_session_id?: string | null
          id?: string
          messages?: Json | null
          token_usage?: Json | null
          updated_at?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_states_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          status: string
          summary: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          summary?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          summary?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      document_embeddings: {
        Row: {
          client_id: string | null
          content: string | null
          created_at: string | null
          embedding: string | null
          file_id: string
          id: string
          metadata: Json | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          content?: string | null
          created_at?: string | null
          embedding?: string | null
          file_id: string
          id?: string
          metadata?: Json | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          content?: string | null
          created_at?: string | null
          embedding?: string | null
          file_id?: string
          id?: string
          metadata?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      document_insights: {
        Row: {
          client_id: string
          confidence: number
          content: Json
          created_at: string | null
          extracted_at: string | null
          file_id: string
          id: string
          insight_type: string
          metadata: Json | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          confidence: number
          content: Json
          created_at?: string | null
          extracted_at?: string | null
          file_id: string
          id?: string
          insight_type: string
          metadata?: Json | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          confidence?: number
          content?: Json
          created_at?: string | null
          extracted_at?: string | null
          file_id?: string
          id?: string
          insight_type?: string
          metadata?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_insights_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "client_files"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_sessions: {
        Row: {
          answers: Json | null
          client_id: string
          completed_at: string | null
          conversation_id: string
          created_at: string | null
          id: string
          initial_analysis: string | null
          questions: Json
          status: string
          workflow_id: string | null
        }
        Insert: {
          answers?: Json | null
          client_id: string
          completed_at?: string | null
          conversation_id: string
          created_at?: string | null
          id?: string
          initial_analysis?: string | null
          questions: Json
          status?: string
          workflow_id?: string | null
        }
        Update: {
          answers?: Json | null
          client_id?: string
          completed_at?: string | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          initial_analysis?: string | null
          questions?: Json
          status?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_sessions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
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
          address_line1: string | null
          city: string | null
          created_at: string | null
          email: string
          id: string
          id_number: string
          lawyer_id: string | null
          phone: string | null
          photo_url: string | null
          postal_code: string | null
          role: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          address_line1?: string | null
          city?: string | null
          created_at?: string | null
          email: string
          id: string
          id_number: string
          lawyer_id?: string | null
          phone?: string | null
          photo_url?: string | null
          postal_code?: string | null
          role: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          address_line1?: string | null
          city?: string | null
          created_at?: string | null
          email?: string
          id?: string
          id_number?: string
          lawyer_id?: string | null
          phone?: string | null
          photo_url?: string | null
          postal_code?: string | null
          role?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      legal_embeddings: {
        Row: {
          created_at: string | null
          embedding: string | null
          id: string
          knowledge_id: string | null
        }
        Insert: {
          created_at?: string | null
          embedding?: string | null
          id?: string
          knowledge_id?: string | null
        }
        Update: {
          created_at?: string | null
          embedding?: string | null
          id?: string
          knowledge_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_embeddings_knowledge_id_fkey"
            columns: ["knowledge_id"]
            isOneToOne: false
            referencedRelation: "legal_knowledge"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_files: {
        Row: {
          content: string | null
          created_at: string | null
          description: string | null
          document_type: string
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          metadata: Json | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          description?: string | null
          document_type: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          metadata?: Json | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          description?: string | null
          document_type?: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          metadata?: Json | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      legal_knowledge: {
        Row: {
          content: string
          created_at: string | null
          file_id: string | null
          id: string
          level: string
          metadata: Json | null
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          file_id?: string | null
          id?: string
          level: string
          metadata?: Json | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          file_id?: string | null
          id?: string
          level?: string
          metadata?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_knowledge_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "legal_files"
            referencedColumns: ["id"]
          },
        ]
      }
      letter_workflows: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          id: string
          state: Json
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at: string
          created_by: string
          id: string
          state: Json
          status: string
          updated_at: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          id?: string
          state?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      model_costs: {
        Row: {
          active: boolean | null
          completion_rate: number
          created_at: string | null
          description: string | null
          id: string
          model: string
          prompt_rate: number
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          completion_rate: number
          created_at?: string | null
          description?: string | null
          id?: string
          model: string
          prompt_rate: number
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          completion_rate?: number
          created_at?: string | null
          description?: string | null
          id?: string
          model?: string
          prompt_rate?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      model_selection_history: {
        Row: {
          alternatives: Json | null
          client_id: string
          confidence: number | null
          conversation_id: string
          created_at: string | null
          id: string
          query: string
          reasoning: string | null
          selected_model: string
        }
        Insert: {
          alternatives?: Json | null
          client_id: string
          confidence?: number | null
          conversation_id: string
          created_at?: string | null
          id?: string
          query: string
          reasoning?: string | null
          selected_model: string
        }
        Update: {
          alternatives?: Json | null
          client_id?: string
          confidence?: number | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          query?: string
          reasoning?: string | null
          selected_model?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_selection_history_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: []
      }
      receipt_items: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          description: string
          id: string
          is_child_expense: boolean | null
          receipt_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          description: string
          id?: string
          is_child_expense?: boolean | null
          receipt_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          description?: string
          id?: string
          is_child_expense?: boolean | null
          receipt_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipt_items_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          client_id: string
          created_at: string
          date: string
          id: string
          status: string
          store_name: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          date: string
          id?: string
          status?: string
          store_name: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          date?: string
          id?: string
          status?: string
          store_name?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      system_config: {
        Row: {
          created_at: string | null
          id: string
          theme_config: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          theme_config?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          theme_config?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          action: string
          client_id: string | null
          created_at: string | null
          error: string | null
          id: string
          level: string
          message: string
          metadata: Json | null
          service: string
          timestamp: string | null
        }
        Insert: {
          action: string
          client_id?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          level: string
          message: string
          metadata?: Json | null
          service: string
          timestamp?: string | null
        }
        Update: {
          action?: string
          client_id?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          level?: string
          message?: string
          metadata?: Json | null
          service?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      token_balances: {
        Row: {
          balance: number | null
          client_id: string | null
          cost: number | null
          created_at: string | null
          id: string
          tokens_used: number | null
          total_cost: number | null
          total_tokens: number | null
          updated_at: string | null
        }
        Insert: {
          balance?: number | null
          client_id?: string | null
          cost?: number | null
          created_at?: string | null
          id?: string
          tokens_used?: number | null
          total_cost?: number | null
          total_tokens?: number | null
          updated_at?: string | null
        }
        Update: {
          balance?: number | null
          client_id?: string | null
          cost?: number | null
          created_at?: string | null
          id?: string
          tokens_used?: number | null
          total_cost?: number | null
          total_tokens?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_balances_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      token_costs: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          model: string
          rate: number
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          model?: string
          rate: number
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          model?: string
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
          metadata: Json | null
          service: string
          tokens_used: number
          total_cost: number
        }
        Insert: {
          client_id: string
          cost_per_token: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          service: string
          tokens_used: number
          total_cost: number
        }
        Update: {
          client_id?: string
          cost_per_token?: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          service?: string
          tokens_used?: number
          total_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "token_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      token_usage: {
        Row: {
          client_id: string
          completion_tokens: number
          cost: number
          created_at: string
          id: string
          metadata: Json | null
          model: string
          prompt_tokens: number
          service: string | null
          timestamp: string
          tokens_used: number
          total_tokens: number
        }
        Insert: {
          client_id: string
          completion_tokens?: number
          cost?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          model: string
          prompt_tokens?: number
          service?: string | null
          timestamp?: string
          tokens_used?: number
          total_tokens?: number
        }
        Update: {
          client_id?: string
          completion_tokens?: number
          cost?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          model?: string
          prompt_tokens?: number
          service?: string | null
          timestamp?: string
          tokens_used?: number
          total_tokens?: number
        }
        Relationships: []
      }
      training_files: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          error_message: string | null
          file_path: string
          file_size: number
          id: string
          indexed: boolean | null
          metadata: Json | null
          status: Database["public"]["Enums"]["document_status"] | null
          subcategory: string | null
          title: string
          type: Database["public"]["Enums"]["document_type"]
          updated_at: string | null
          uploaded_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          error_message?: string | null
          file_path: string
          file_size: number
          id?: string
          indexed?: boolean | null
          metadata?: Json | null
          status?: Database["public"]["Enums"]["document_status"] | null
          subcategory?: string | null
          title: string
          type: Database["public"]["Enums"]["document_type"]
          updated_at?: string | null
          uploaded_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          error_message?: string | null
          file_path?: string
          file_size?: number
          id?: string
          indexed?: boolean | null
          metadata?: Json | null
          status?: Database["public"]["Enums"]["document_status"] | null
          subcategory?: string | null
          title?: string
          type?: Database["public"]["Enums"]["document_type"]
          updated_at?: string | null
          uploaded_at?: string | null
        }
        Relationships: []
      }
      untracked_token_usage: {
        Row: {
          client_id_text: string
          cost: number
          created_at: string | null
          id: string
          metadata: Json | null
          model: string
          service: string
          tokens: number
        }
        Insert: {
          client_id_text: string
          cost?: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          model: string
          service: string
          tokens: number
        }
        Update: {
          client_id_text?: string
          cost?: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          model?: string
          service?: string
          tokens?: number
        }
        Relationships: []
      }
      workflows: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          id: string
          metadata: Json | null
          state: Json
          status: string
          updated_at: string
          workflow_type: string
        }
        Insert: {
          client_id: string
          created_at: string
          created_by: string
          id: string
          metadata?: Json | null
          state: Json
          status: string
          updated_at: string
          workflow_type: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          id?: string
          metadata?: Json | null
          state?: Json
          status?: string
          updated_at?: string
          workflow_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aggregate_document_insights: {
        Args: {
          document_ids: string[]
          insight_type: string
        }
        Returns: Json
      }
      binary_quantize:
        | {
            Args: {
              "": string
            }
            Returns: unknown
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
          }
      calculate_document_tokens: {
        Args: {
          p_file_size: number
        }
        Returns: number
      }
      check_function_exists: {
        Args: {
          function_name: string
        }
        Returns: boolean
      }
      check_table_exists: {
        Args: {
          table_name: string
        }
        Returns: boolean
      }
      check_vector_extension: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      cleanup_old_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_token_usage: {
        Args: {
          days_to_keep?: number
        }
        Returns: undefined
      }
      create_vector_extension: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      execute_sql: {
        Args: {
          sql_query: string
        }
        Returns: undefined
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
      generate_user_identifier: {
        Args: {
          p_id: string
          p_role: string
        }
        Returns: string
      }
      get_client_receipts: {
        Args: {
          p_client_id: string
        }
        Returns: Json[]
      }
      get_document_embeddings: {
        Args: {
          doc_ids: string[]
        }
        Returns: {
          embedding: string
          content: string
          document_id: string
          chunk_index: number
          metadata: Json
          client_id: string
        }[]
      }
      get_document_processing_status: {
        Args: {
          p_file_id: string
        }
        Returns: Json
      }
      get_document_text: {
        Args: {
          document_id_param: string
        }
        Returns: string
      }
      get_table_columns: {
        Args: {
          table_name: string
        }
        Returns: {
          column_name: string
          data_type: string
        }[]
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
      halfvec_avg: {
        Args: {
          "": number[]
        }
        Returns: unknown
      }
      halfvec_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      halfvec_send: {
        Args: {
          "": unknown
        }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
      hnsw_bit_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnswhandler: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      insert_client_file: {
        Args: {
          p_client_id: string
          p_lawyer_id: string
          p_file_name: string
          p_file_path: string
          p_file_type: string
          p_file_size: number
          p_category: string
          p_subcategory: string
          p_status: string
        }
        Returns: Json
      }
      is_admin: {
        Args: {
          uid: string
        }
        Returns: boolean
      }
      ivfflat_bit_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ivfflathandler: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      l2_norm:
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
      l2_normalize:
        | {
            Args: {
              "": string
            }
            Returns: string
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
          }
      match_document_embeddings:
        | {
            Args: {
              client_id_param: string
              document_id_param: string
              match_count: number
              query_embedding: string
              similarity_threshold?: number
            }
            Returns: {
              id: string
              content: string
              metadata: Json
              similarity: number
            }[]
          }
        | {
            Args: {
              client_id_param: string
              file_id_param: string
              query_embedding: string
              similarity_threshold?: number
              match_count?: number
            }
            Returns: {
              id: string
              content: string
              metadata: Json
              similarity: number
            }[]
          }
        | {
            Args: {
              query_embedding: string
              match_threshold: number
              match_count: number
              client_id_param?: string
              document_id_param?: string
            }
            Returns: {
              id: string
              source_id: string
              source_type: string
              similarity: number
              content: string
              metadata: Json
            }[]
          }
      match_document_embeddings_v2:
        | {
            Args: {
              client_id_param: string
              document_id_param: string
              match_count: number
              match_threshold: number
              query_embedding: string
            }
            Returns: {
              id: string
              chunk_id: string
              content: string
              document_id: string
              metadata: Json
              chunk_index: number
              similarity: number
            }[]
          }
        | {
            Args: {
              query_embedding: string
              match_threshold: number
              match_count: number
              client_id_param?: string
              document_id_param?: string
              include_training_docs?: boolean
            }
            Returns: {
              chunk_id: string
              similarity: number
              is_training_doc: boolean
            }[]
          }
      match_document_embeddings_v3: {
        Args: {
          query_embedding: string
          match_threshold: number
          match_count: number
          client_id_param?: string
          document_id_param?: string
        }
        Returns: {
          chunk_id: string
          content: string
          document_id: string
          metadata: Json
          similarity: number
        }[]
      }
      match_document_insights:
        | {
            Args: {
              document_ids: string[]
              insight_types: string[]
              confidence_threshold?: number
              max_results?: number
            }
            Returns: {
              document_id: string
              insight_type: string
              content: Json
              confidence: number
              metadata: Json
            }[]
          }
        | {
            Args: {
              document_ids?: string[]
              insight_types?: string[]
              confidence_threshold?: number
              max_results?: number
            }
            Returns: {
              document_id: string
              insight_id: string
              insight_type: string
              content: string
              metadata: Json
              confidence: number
              relevance: number
            }[]
          }
      match_documents: {
        Args: {
          query_embedding: string
          client_id: string
          doc_id?: string
          match_count?: number
        }
        Returns: {
          content: string
          metadata: Json
          document_id: string
          similarity: number
        }[]
      }
      match_embeddings: {
        Args: {
          query_embedding: string
          match_threshold: number
          match_count: number
        }
        Returns: {
          id: string
          file_id: string
          chunk_index: number
          chunk_text: string
          similarity: number
        }[]
      }
      match_legal_knowledge:
        | {
            Args: {
              query_embedding: string
              match_threshold: number
              match_count: number
            }
            Returns: {
              id: string
              file_id: string
              summary: string
              key_concepts: string
              legal_insights: string
              similarity_raw_text: number
              similarity_summary: number
              similarity_concepts: number
              similarity_insights: number
            }[]
          }
        | {
            Args: {
              query_embedding: string
              match_threshold?: number
              match_count?: number
            }
            Returns: {
              content: string
              similarity: number
              level: string
              metadata: Json
              file_id: string
            }[]
          }
      match_training_embeddings: {
        Args: {
          query_embedding: string
          similarity_threshold?: number
          match_count?: number
        }
        Returns: {
          id: string
          source_id: string
          source_type: string
          similarity: number
          content: string
          metadata: Json
        }[]
      }
      process_document_chunks: {
        Args: {
          document_id: string
          client_id: string
          chunk_size?: number
          chunk_overlap?: number
        }
        Returns: Json
      }
      process_document_workflow: {
        Args: {
          p_file_id: string
          p_client_id: string
        }
        Returns: Json
      }
      queue_embedding_jobs: {
        Args: {
          p_document_id: string
          p_client_id: string
        }
        Returns: Json
      }
      recalculate_token_balance: {
        Args: {
          p_client_id: string
        }
        Returns: undefined
      }
      record_token_usage:
        | {
            Args: {
              p_client_id: string
              p_tokens_used: number
              p_cost: number
              p_service?: string
              p_model?: string
              p_metadata?: Json
            }
            Returns: string
          }
        | {
            Args: {
              p_client_id: string
              p_tokens_used: number
              p_service?: string
              p_model?: string
              p_cost?: number
              p_metadata?: Json
            }
            Returns: undefined
          }
      safe_update_token_balance: {
        Args: {
          p_client_id: string
          p_tokens: number
          p_cost?: number
        }
        Returns: undefined
      }
      search_document_embeddings:
        | {
            Args: {
              query_embedding: string
              client_id_param?: string
              file_id_param?: string
              match_count?: number
              similarity_threshold?: number
            }
            Returns: {
              id: string
              source_id: string
              source_type: string
              similarity: number
              content: string
              metadata: Json
            }[]
          }
        | {
            Args: {
              search_query: string
              client_id_param?: string
              document_id_param?: string
              match_count?: number
            }
            Returns: {
              id: string
              content: string
              document_id: string
              metadata: Json
              client_id: string
              similarity: number
            }[]
          }
      search_training_embeddings: {
        Args: {
          query_embedding: string
          similarity_threshold?: number
          match_count?: number
        }
        Returns: {
          id: string
          source_id: string
          source_type: string
          similarity: number
          content: string
          metadata: Json
        }[]
      }
      sparsevec_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      sparsevec_send: {
        Args: {
          "": unknown
        }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
      update_all_user_theme_settings: {
        Args: {
          theme_mode: string
          theme_variant: string
        }
        Returns: undefined
      }
      vector_avg: {
        Args: {
          "": number[]
        }
        Returns: string
      }
      vector_dims:
        | {
            Args: {
              "": string
            }
            Returns: number
          }
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
      vector_norm: {
        Args: {
          "": string
        }
        Returns: number
      }
      vector_out: {
        Args: {
          "": string
        }
        Returns: unknown
      }
      vector_send: {
        Args: {
          "": string
        }
        Returns: string
      }
      vector_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
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
      document_status: "processing" | "active" | "error" | "partial"
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
      document_type: "act" | "law" | "regulation"
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
