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
      agent_conversations: {
        Row: {
          agent_specification: string
          created_at: string | null
          id: string
          messages: Json
          parent_thread_id: string
          tool_execution_id: string | null
        }
        Insert: {
          agent_specification: string
          created_at?: string | null
          id?: string
          messages?: Json
          parent_thread_id: string
          tool_execution_id?: string | null
        }
        Update: {
          agent_specification?: string
          created_at?: string | null
          id?: string
          messages?: Json
          parent_thread_id?: string
          tool_execution_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_conversations_parent_thread_id_fkey"
            columns: ["parent_thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_conversations_tool_execution_id_fkey"
            columns: ["tool_execution_id"]
            isOneToOne: false
            referencedRelation: "tool_executions"
            referencedColumns: ["id"]
          },
        ]
      }
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
      aws_credentials: {
        Row: {
          access_key_id: string
          created_at: string | null
          id: string
          region: string
          secret_access_key: string
          topic_arn: string
          updated_at: string | null
        }
        Insert: {
          access_key_id: string
          created_at?: string | null
          id?: string
          region: string
          secret_access_key: string
          topic_arn: string
          updated_at?: string | null
        }
        Update: {
          access_key_id?: string
          created_at?: string | null
          id?: string
          region?: string
          secret_access_key?: string
          topic_arn?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          model: string | null
          role: string
          thread_id: string
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          model?: string | null
          role: string
          thread_id: string
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          model?: string | null
          role?: string
          thread_id?: string
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          message_count: number
          metadata: Json | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          message_count?: number
          metadata?: Json | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          message_count?: number
          metadata?: Json | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      interactions: {
        Row: {
          created_at: string | null
          id: string
          input: string
          metadata: Json | null
          result: Json | null
          tool_calls: Json | null
          user_id: string
          verification_results: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          input: string
          metadata?: Json | null
          result?: Json | null
          tool_calls?: Json | null
          user_id: string
          verification_results?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          input?: string
          metadata?: Json | null
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
      llm_thoughts: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          thought_type: string
          thread_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          thought_type: string
          thread_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          thought_type?: string
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "llm_thoughts_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_data_sources: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          mcp_server_id: string
          metadata: Json | null
          name: string
          schema: Json | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          mcp_server_id: string
          metadata?: Json | null
          name: string
          schema?: Json | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          mcp_server_id?: string
          metadata?: Json | null
          name?: string
          schema?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "mcp_data_sources_mcp_server_id_fkey"
            columns: ["mcp_server_id"]
            isOneToOne: false
            referencedRelation: "mcp_servers"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_execution_logs: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          error: string | null
          id: string
          mcp_server_id: string
          request: Json
          response: Json | null
          session_id: string
          status: string
          thread_id: string | null
          tool_name: string
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          mcp_server_id: string
          request: Json
          response?: Json | null
          session_id: string
          status: string
          thread_id?: string | null
          tool_name: string
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          mcp_server_id?: string
          request?: Json
          response?: Json | null
          session_id?: string
          status?: string
          thread_id?: string | null
          tool_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_execution_logs_mcp_server_id_fkey"
            columns: ["mcp_server_id"]
            isOneToOne: false
            referencedRelation: "mcp_servers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcp_execution_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "orchestration_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcp_execution_logs_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_oauth_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          expires_at: string | null
          id: string
          mcp_server_id: string
          refresh_token: string | null
          scope: string | null
          token_type: string | null
          updated_at: string | null
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          mcp_server_id: string
          refresh_token?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          mcp_server_id?: string
          refresh_token?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mcp_oauth_tokens_mcp_server_id_fkey"
            columns: ["mcp_server_id"]
            isOneToOne: true
            referencedRelation: "mcp_servers"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_servers: {
        Row: {
          config: Json
          connection_error: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_oauth: boolean | null
          last_connected_at: string | null
          name: string
          oauth_provider: string | null
          type: string
          updated_at: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          config: Json
          connection_error?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_oauth?: boolean | null
          last_connected_at?: string | null
          name: string
          oauth_provider?: string | null
          type: string
          updated_at?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          config?: Json
          connection_error?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_oauth?: boolean | null
          last_connected_at?: string | null
          name?: string
          oauth_provider?: string | null
          type?: string
          updated_at?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mcp_tools: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          mcp_server_id: string
          metadata: Json | null
          name: string
          schema: Json
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          mcp_server_id: string
          metadata?: Json | null
          name: string
          schema: Json
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          mcp_server_id?: string
          metadata?: Json | null
          name?: string
          schema?: Json
        }
        Relationships: [
          {
            foreignKeyName: "mcp_tools_mcp_server_id_fkey"
            columns: ["mcp_server_id"]
            isOneToOne: false
            referencedRelation: "mcp_servers"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
          thread_id: string
          tool_calls: Json | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
          thread_id: string
          tool_calls?: Json | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          thread_id?: string
          tool_calls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      orchestration_events: {
        Row: {
          created_at: string | null
          event_data: Json
          event_type: string
          id: string
          metadata: Json | null
          session_id: string
          thread_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_data: Json
          event_type: string
          id?: string
          metadata?: Json | null
          session_id: string
          thread_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_data?: Json
          event_type?: string
          id?: string
          metadata?: Json | null
          session_id?: string
          thread_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orchestration_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "orchestration_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orchestration_events_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
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
          streaming_enabled: boolean | null
          thread_id: string | null
          tool_state: Json | null
          total_tokens: number | null
          ui_state: Json | null
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
          streaming_enabled?: boolean | null
          thread_id?: string | null
          tool_state?: Json | null
          total_tokens?: number | null
          ui_state?: Json | null
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
          streaming_enabled?: boolean | null
          thread_id?: string | null
          tool_state?: Json | null
          total_tokens?: number | null
          ui_state?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orchestration_sessions_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
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
      thread_hierarchy: {
        Row: {
          child_thread_id: string
          created_at: string | null
          id: string
          parent_thread_id: string
          relationship_type: string
        }
        Insert: {
          child_thread_id: string
          created_at?: string | null
          id?: string
          parent_thread_id: string
          relationship_type: string
        }
        Update: {
          child_thread_id?: string
          created_at?: string | null
          id?: string
          parent_thread_id?: string
          relationship_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_hierarchy_child_thread_id_fkey"
            columns: ["child_thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_hierarchy_parent_thread_id_fkey"
            columns: ["parent_thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      threads: {
        Row: {
          auto_generated_name: string | null
          created_at: string | null
          id: string
          name: string
          parent_thread_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_generated_name?: string | null
          created_at?: string | null
          id?: string
          name: string
          parent_thread_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_generated_name?: string | null
          created_at?: string | null
          id?: string
          name?: string
          parent_thread_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "threads_parent_thread_id_fkey"
            columns: ["parent_thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_executions: {
        Row: {
          completed_at: string | null
          duration_ms: number | null
          id: string
          parameters: Json
          produces_visualization: boolean | null
          result: Json | null
          session_id: string | null
          started_at: string | null
          status: string
          tool_name: string
          visualization_id: string | null
        }
        Insert: {
          completed_at?: string | null
          duration_ms?: number | null
          id?: string
          parameters: Json
          produces_visualization?: boolean | null
          result?: Json | null
          session_id?: string | null
          started_at?: string | null
          status?: string
          tool_name: string
          visualization_id?: string | null
        }
        Update: {
          completed_at?: string | null
          duration_ms?: number | null
          id?: string
          parameters?: Json
          produces_visualization?: boolean | null
          result?: Json | null
          session_id?: string | null
          started_at?: string | null
          status?: string
          tool_name?: string
          visualization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tool_executions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "orchestration_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_executions_visualization_id_fkey"
            columns: ["visualization_id"]
            isOneToOne: false
            referencedRelation: "visualizations"
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
      visualizations: {
        Row: {
          content: string
          created_at: string | null
          generation_prompt: string | null
          id: string
          metadata: Json | null
          thread_id: string | null
          tool_execution_id: string | null
          type: string
        }
        Insert: {
          content: string
          created_at?: string | null
          generation_prompt?: string | null
          id?: string
          metadata?: Json | null
          thread_id?: string | null
          tool_execution_id?: string | null
          type: string
        }
        Update: {
          content?: string
          created_at?: string | null
          generation_prompt?: string | null
          id?: string
          metadata?: Json | null
          thread_id?: string | null
          tool_execution_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "visualizations_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visualizations_tool_execution_id_fkey"
            columns: ["tool_execution_id"]
            isOneToOne: false
            referencedRelation: "tool_executions"
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
      generate_thread_name: {
        Args: { first_message: string }
        Returns: string
      }
      get_aws_credentials: {
        Args: Record<PropertyKey, never>
        Returns: Json
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
      log_orchestration_event: {
        Args: {
          p_session_id: string
          p_event_type: string
          p_event_data: Json
          p_metadata?: Json
        }
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
      store_aws_credentials: {
        Args: {
          p_access_key_id: string
          p_secret_access_key: string
          p_region: string
          p_topic_arn: string
        }
        Returns: undefined
      }
      update_mcp_oauth_token: {
        Args: {
          p_server_id: string
          p_access_token: string
          p_refresh_token?: string
          p_expires_at?: string
        }
        Returns: string
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
