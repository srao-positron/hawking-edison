import { serve } from 'https://deno.land/std@0.177.1/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Read migration SQL
    const migrationSQL = `
-- Thread Management Schema for Realtime Visualization
-- This migration creates tables for managing conversation threads,
-- sub-threads, agent conversations, and visualizations

-- Main conversation threads
CREATE TABLE IF NOT EXISTS threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL, -- Auto-generated or user-edited
  auto_generated_name TEXT, -- LLM-generated suggestion
  parent_thread_id UUID REFERENCES threads(id), -- For sub-threads
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Messages within threads
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID REFERENCES threads(id) NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  tool_calls JSONB, -- For tool invocations
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Agent conversations (sub-threads)
CREATE TABLE IF NOT EXISTS agent_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_thread_id UUID REFERENCES threads(id) NOT NULL,
  tool_execution_id UUID REFERENCES tool_executions(id),
  agent_specification TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of agent-LLM messages
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Thread hierarchy for navigation
CREATE TABLE IF NOT EXISTS thread_hierarchy (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_thread_id UUID REFERENCES threads(id) NOT NULL,
  child_thread_id UUID REFERENCES threads(id) NOT NULL,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('tool_execution', 'panel_discussion', 'visualization', 'analysis')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(parent_thread_id, child_thread_id)
);

-- Store LLM thinking process
CREATE TABLE IF NOT EXISTS llm_thoughts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID REFERENCES threads(id),
  thought_type TEXT NOT NULL CHECK (thought_type IN ('planning', 'reasoning', 'decision', 'reflection')),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Store generated visualizations
CREATE TABLE IF NOT EXISTS visualizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID REFERENCES threads(id),
  tool_execution_id UUID REFERENCES tool_executions(id),
  type TEXT NOT NULL CHECK (type IN ('chart', 'diagram', 'dashboard', 'graph', 'table', 'custom')),
  content TEXT NOT NULL, -- SVG/Markdown content
  generation_prompt TEXT, -- What was asked of the viz agent
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
`

    // Execute migration
    const { error } = await supabaseAdmin.rpc('exec_sql', {
      query: migrationSQL
    })

    if (error) {
      throw error
    }

    // Continue with remaining migration steps
    const additionalSQL = `
-- Add streaming support to orchestration_sessions
ALTER TABLE orchestration_sessions 
ADD COLUMN IF NOT EXISTS streaming_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ui_state JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES threads(id);

-- Add visualization metadata to tool_executions
ALTER TABLE tool_executions
ADD COLUMN IF NOT EXISTS produces_visualization BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS visualization_id UUID REFERENCES visualizations(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_threads_user_id ON threads(user_id);
CREATE INDEX IF NOT EXISTS idx_threads_parent_thread_id ON threads(parent_thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_parent_thread ON agent_conversations(parent_thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_hierarchy_parent ON thread_hierarchy(parent_thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_hierarchy_child ON thread_hierarchy(child_thread_id);
CREATE INDEX IF NOT EXISTS idx_llm_thoughts_thread ON llm_thoughts(thread_id);
CREATE INDEX IF NOT EXISTS idx_visualizations_thread ON visualizations(thread_id);
CREATE INDEX IF NOT EXISTS idx_visualizations_tool_execution ON visualizations(tool_execution_id);

-- Enable Row Level Security
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_thoughts ENABLE ROW LEVEL SECURITY;
ALTER TABLE visualizations ENABLE ROW LEVEL SECURITY;
`

    const { error: error2 } = await supabaseAdmin.rpc('exec_sql', {
      query: additionalSQL
    })

    if (error2) {
      throw error2
    }

    // RLS policies
    const rlsSQL = `
-- RLS Policies: Users can only see their own threads and related data
CREATE POLICY "Users can view own threads" ON threads
  FOR ALL USING (auth.uid() = user_id OR parent_thread_id IN (
    SELECT id FROM threads WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view messages in own threads" ON messages
  FOR ALL USING (thread_id IN (
    SELECT id FROM threads WHERE user_id = auth.uid() OR parent_thread_id IN (
      SELECT id FROM threads WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can view agent conversations in own threads" ON agent_conversations
  FOR ALL USING (parent_thread_id IN (
    SELECT id FROM threads WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view thread hierarchy for own threads" ON thread_hierarchy
  FOR ALL USING (
    parent_thread_id IN (SELECT id FROM threads WHERE user_id = auth.uid()) OR
    child_thread_id IN (SELECT id FROM threads WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view thoughts in own threads" ON llm_thoughts
  FOR ALL USING (thread_id IN (
    SELECT id FROM threads WHERE user_id = auth.uid() OR parent_thread_id IN (
      SELECT id FROM threads WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can view visualizations in own threads" ON visualizations
  FOR ALL USING (thread_id IN (
    SELECT id FROM threads WHERE user_id = auth.uid() OR parent_thread_id IN (
      SELECT id FROM threads WHERE user_id = auth.uid()
    )
  ));
`

    const { error: error3 } = await supabaseAdmin.rpc('exec_sql', {
      query: rlsSQL
    })

    if (error3) {
      console.error('RLS error:', error3)
      // Continue even if RLS fails (might already exist)
    }

    // Enable realtime
    const realtimeSQL = `
-- Enable realtime for all new tables
ALTER PUBLICATION supabase_realtime ADD TABLE threads;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE llm_thoughts;
ALTER PUBLICATION supabase_realtime ADD TABLE visualizations;
`

    const { error: error4 } = await supabaseAdmin.rpc('exec_sql', {
      query: realtimeSQL
    })

    if (error4) {
      console.error('Realtime error:', error4)
      // Continue even if realtime fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Thread management schema created successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})