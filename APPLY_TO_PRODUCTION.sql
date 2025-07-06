-- Hawking Edison Database Schema
-- Apply this to your Supabase project at:
-- https://supabase.com/dashboard/project/bknpldydmkzupsfagnva/sql/new

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create interactions table
CREATE TABLE IF NOT EXISTS interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  tool_calls JSONB DEFAULT '[]'::jsonb,
  result JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create knowledge (databank) table
CREATE TABLE IF NOT EXISTS knowledge (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  url TEXT NOT NULL,
  embedding vector(1536), -- OpenAI embedding dimension
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create agent_memories table
CREATE TABLE IF NOT EXISTS agent_memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_id UUID REFERENCES interactions(id) ON DELETE CASCADE,
  stream_name TEXT NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create API keys table for external access
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT,
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON interactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_knowledge_user_id ON knowledge(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_embedding ON knowledge USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_knowledge_created_at ON knowledge(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_memories_user_id ON agent_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_memories_interaction_id ON agent_memories(interaction_id);
CREATE INDEX IF NOT EXISTS idx_agent_memories_stream_name ON agent_memories(stream_name);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

-- Enable Row Level Security
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own interactions" ON interactions;
DROP POLICY IF EXISTS "Users can create own interactions" ON interactions;
DROP POLICY IF EXISTS "Users can update own interactions" ON interactions;
DROP POLICY IF EXISTS "Users can delete own interactions" ON interactions;

DROP POLICY IF EXISTS "Users can view own knowledge" ON knowledge;
DROP POLICY IF EXISTS "Users can create own knowledge" ON knowledge;
DROP POLICY IF EXISTS "Users can update own knowledge" ON knowledge;
DROP POLICY IF EXISTS "Users can delete own knowledge" ON knowledge;

DROP POLICY IF EXISTS "Users can view own agent memories" ON agent_memories;
DROP POLICY IF EXISTS "Users can create own agent memories" ON agent_memories;
DROP POLICY IF EXISTS "Users can update own agent memories" ON agent_memories;
DROP POLICY IF EXISTS "Users can delete own agent memories" ON agent_memories;

DROP POLICY IF EXISTS "Users can view own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can create own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can update own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can delete own API keys" ON api_keys;

-- RLS Policies
-- Interactions: Users can only see their own
CREATE POLICY "Users can view own interactions" ON interactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own interactions" ON interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own interactions" ON interactions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own interactions" ON interactions
  FOR DELETE USING (auth.uid() = user_id);

-- Knowledge: Users can only see their own
CREATE POLICY "Users can view own knowledge" ON knowledge
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own knowledge" ON knowledge
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own knowledge" ON knowledge
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own knowledge" ON knowledge
  FOR DELETE USING (auth.uid() = user_id);

-- Agent memories: Users can only see their own
CREATE POLICY "Users can view own agent memories" ON agent_memories
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own agent memories" ON agent_memories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own agent memories" ON agent_memories
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own agent memories" ON agent_memories
  FOR DELETE USING (auth.uid() = user_id);

-- API keys: Users can only see their own
CREATE POLICY "Users can view own API keys" ON api_keys
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own API keys" ON api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own API keys" ON api_keys
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own API keys" ON api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- Function for semantic search in knowledge base
CREATE OR REPLACE FUNCTION search_knowledge(
  user_uuid UUID,
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  url TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    k.id,
    k.content,
    k.url,
    k.metadata,
    1 - (k.embedding <=> query_embedding) AS similarity
  FROM knowledge k
  WHERE k.user_id = user_uuid
    AND 1 - (k.embedding <=> query_embedding) > match_threshold
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Add verification_results column for goal verification architecture
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS verification_results JSONB DEFAULT '[]'::jsonb;

-- Create verification logs table
CREATE TABLE IF NOT EXISTS verification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  interaction_id UUID REFERENCES interactions(id),
  verification_type TEXT NOT NULL, -- 'agent', 'orchestrator', 'moderator'
  target_id TEXT NOT NULL, -- agent name or tool call id
  goal TEXT NOT NULL,
  result JSONB NOT NULL, -- VerificationResult
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_logs_interaction ON verification_logs(interaction_id);
CREATE INDEX IF NOT EXISTS idx_verification_logs_type ON verification_logs(verification_type);

-- Enable RLS on verification_logs
ALTER TABLE verification_logs ENABLE ROW LEVEL SECURITY;

-- Verification logs policies
DROP POLICY IF EXISTS "Users can view verification logs for own interactions" ON verification_logs;
DROP POLICY IF EXISTS "Users can create verification logs for own interactions" ON verification_logs;

CREATE POLICY "Users can view verification logs for own interactions" ON verification_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM interactions 
      WHERE interactions.id = verification_logs.interaction_id 
      AND interactions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create verification logs for own interactions" ON verification_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM interactions 
      WHERE interactions.id = verification_logs.interaction_id 
      AND interactions.user_id = auth.uid()
    )
  );

-- Success message
SELECT 'Database schema applied successfully!' as message;