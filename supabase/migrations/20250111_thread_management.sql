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
CREATE INDEX idx_threads_user_id ON threads(user_id);
CREATE INDEX idx_threads_parent_thread_id ON threads(parent_thread_id);
CREATE INDEX idx_messages_thread_id ON messages(thread_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_agent_conversations_parent_thread ON agent_conversations(parent_thread_id);
CREATE INDEX idx_thread_hierarchy_parent ON thread_hierarchy(parent_thread_id);
CREATE INDEX idx_thread_hierarchy_child ON thread_hierarchy(child_thread_id);
CREATE INDEX idx_llm_thoughts_thread ON llm_thoughts(thread_id);
CREATE INDEX idx_visualizations_thread ON visualizations(thread_id);
CREATE INDEX idx_visualizations_tool_execution ON visualizations(tool_execution_id);

-- Enable Row Level Security
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_thoughts ENABLE ROW LEVEL SECURITY;
ALTER TABLE visualizations ENABLE ROW LEVEL SECURITY;

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

-- Enable realtime for all new tables
ALTER PUBLICATION supabase_realtime ADD TABLE threads;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE llm_thoughts;
ALTER PUBLICATION supabase_realtime ADD TABLE visualizations;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for threads table
CREATE TRIGGER update_threads_updated_at BEFORE UPDATE ON threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to auto-generate thread names
CREATE OR REPLACE FUNCTION generate_thread_name(first_message TEXT)
RETURNS TEXT AS $$
DECLARE
  truncated_message TEXT;
BEGIN
  -- Take first 50 characters of the message
  truncated_message := LEFT(first_message, 50);
  
  -- If truncated, add ellipsis
  IF LENGTH(first_message) > 50 THEN
    truncated_message := truncated_message || '...';
  END IF;
  
  RETURN truncated_message;
END;
$$ language 'plpgsql';

-- Grant permissions for service role
GRANT ALL ON threads TO service_role;
GRANT ALL ON messages TO service_role;
GRANT ALL ON agent_conversations TO service_role;
GRANT ALL ON thread_hierarchy TO service_role;
GRANT ALL ON llm_thoughts TO service_role;
GRANT ALL ON visualizations TO service_role;