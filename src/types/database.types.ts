export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      agent_memories: {
        Row: {
          content: Json
          created_at: string | null
          id: string
          interaction_id: string | null
          stream_name: string
          user_id: string
        }
        Insert: {
          content: Json
          created_at?: string | null
          id?: string
          interaction_id?: string | null
          stream_name: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string | null
          id?: string
          interaction_id?: string | null
          stream_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_memories_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "interactions"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string | null
          last_used: string | null
          name: string | null
          permissions: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix?: string | null
          last_used?: string | null
          name?: string | null
          permissions?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string | null
          last_used?: string | null
          name?: string | null
          permissions?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      interactions: {
        Row: {
          created_at: string | null
          id: string
          input: string
          result: Json | null
          tool_calls: Json | null
          user_id: string
          verification_results: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          input: string
          result?: Json | null
          tool_calls?: Json | null
          user_id: string
          verification_results?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          input?: string
          result?: Json | null
          tool_calls?: Json | null
          user_id?: string
          verification_results?: Json | null
        }
        Relationships: []
      }
      knowledge: {
        Row: {
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          metadata: Json | null
          url: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          url: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      orchestration_sessions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error: string | null
          error_count: number | null
          execution_count: number | null
          final_response: string | null
          id: string
          messages: Json
          started_at: string | null
          status: string
          tool_state: Json | null
          total_tokens: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          error_count?: number | null
          execution_count?: number | null
          final_response?: string | null
          id?: string
          messages?: Json
          started_at?: string | null
          status?: string
          tool_state?: Json | null
          total_tokens?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          error_count?: number | null
          execution_count?: number | null
          final_response?: string | null
          id?: string
          messages?: Json
          started_at?: string | null
          status?: string
          tool_state?: Json | null
          total_tokens?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      telemetry_events: {
        Row: {
          created_at: string | null
          event_data: Json
          event_type: string
          id: string
          session_id: string | null
          timestamp: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data: Json
          event_type: string
          id?: string
          session_id?: string | null
          timestamp: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json
          event_type?: string
          id?: string
          session_id?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tool_executions: {
        Row: {
          completed_at: string | null
          duration_ms: number | null
          id: string
          parameters: Json
          result: Json | null
          session_id: string | null
          started_at: string | null
          status: string
          tool_name: string
        }
        Insert: {
          completed_at?: string | null
          duration_ms?: number | null
          id?: string
          parameters: Json
          result?: Json | null
          session_id?: string | null
          started_at?: string | null
          status?: string
          tool_name: string
        }
        Update: {
          completed_at?: string | null
          duration_ms?: number | null
          id?: string
          parameters?: Json
          result?: Json | null
          session_id?: string | null
          started_at?: string | null
          status?: string
          tool_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_executions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "orchestration_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_logs: {
        Row: {
          created_at: string | null
          goal: string
          id: string
          interaction_id: string | null
          result: Json
          target_id: string
          verification_type: string
        }
        Insert: {
          created_at?: string | null
          goal: string
          id?: string
          interaction_id?: string | null
          result: Json
          target_id: string
          verification_type: string
        }
        Update: {
          created_at?: string | null
          goal?: string
          id?: string
          interaction_id?: string | null
          result?: Json
          target_id?: string
          verification_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_logs_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "interactions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      telemetry_metrics: {
        Row: {
          avg_duration: number | null
          event_count: number | null
          event_type: string | null
          hour: string | null
          total_tokens: number | null
          unique_users: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      search_knowledge: {
        Args: {
          user_uuid: string
          query_embedding: string
          match_threshold?: number
          match_count?: number
        }
        Returns: {
          id: string
          content: string
          url: string
          metadata: Json
          similarity: number
        }[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
