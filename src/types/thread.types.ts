// Thread Management Types
// These types match the database schema created in migration 20250111_thread_management.sql

export interface Thread {
  id: string
  user_id: string
  name: string
  auto_generated_name: string | null
  parent_thread_id: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  thread_id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  tool_calls: any | null
  metadata: any | null
  created_at: string
}

export interface AgentConversation {
  id: string
  parent_thread_id: string
  tool_execution_id: string | null
  agent_specification: string
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>
  created_at: string
}

export interface ThreadHierarchy {
  id: string
  parent_thread_id: string
  child_thread_id: string
  relationship_type: 'tool_execution' | 'panel_discussion' | 'visualization' | 'analysis'
  created_at: string
}

export interface LLMThought {
  id: string
  thread_id: string
  thought_type: 'planning' | 'reasoning' | 'decision' | 'reflection'
  content: string
  metadata: any | null
  created_at: string
}

export interface Visualization {
  id: string
  thread_id: string
  tool_execution_id: string | null
  type: 'chart' | 'diagram' | 'dashboard' | 'graph' | 'table' | 'custom'
  content: string // SVG or Markdown content
  generation_prompt: string | null
  metadata: any | null
  created_at: string
}

// Extended types for API responses
export interface ThreadWithCounts extends Thread {
  messages?: { count: number }[]
  visualizations?: { count: number }[]
  agent_conversations?: { count: number }[]
}

// Input types for API requests
export interface CreateThreadInput {
  input?: string
  name?: string
}

export interface UpdateThreadInput {
  name: string
}

// Realtime subscription payloads
export interface ThreadRealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Thread | null
  old: Thread | null
}

export interface MessageRealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Message | null
  old: Message | null
}

export interface VisualizationRealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Visualization | null
  old: Visualization | null
}