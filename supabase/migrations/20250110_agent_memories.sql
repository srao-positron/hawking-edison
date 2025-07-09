-- Agent memories table for giving agents continuity across sessions
CREATE TABLE IF NOT EXISTS agent_memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_key TEXT NOT NULL,
  content JSONB NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}'::jsonb,
  session_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT agent_memories_user_id_memory_key_idx UNIQUE (user_id, memory_key, created_at)
);

-- Index for fast memory key lookups
CREATE INDEX idx_agent_memories_lookup ON agent_memories(user_id, memory_key, created_at DESC);

-- Index for vector similarity search
CREATE INDEX idx_agent_memories_embedding ON agent_memories USING ivfflat (embedding vector_cosine_ops);

-- Enable RLS
ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can read their own memories"
  ON agent_memories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memories"
  ON agent_memories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memories"
  ON agent_memories FOR DELETE
  USING (auth.uid() = user_id);

-- Function to search agent memories semantically
CREATE OR REPLACE FUNCTION search_agent_memories(
  query_embedding vector,
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10,
  filter_memory_keys text[] DEFAULT NULL,
  filter_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  memory_key text,
  content jsonb,
  metadata jsonb,
  similarity float,
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    am.id,
    am.memory_key,
    am.content,
    am.metadata,
    1 - (am.embedding <=> query_embedding) as similarity,
    am.created_at
  FROM agent_memories am
  WHERE 
    (filter_user_id IS NULL OR am.user_id = filter_user_id)
    AND (filter_memory_keys IS NULL OR am.memory_key = ANY(filter_memory_keys))
    AND 1 - (am.embedding <=> query_embedding) > match_threshold
  ORDER BY am.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to list memory streams with counts
CREATE OR REPLACE FUNCTION list_memory_streams(
  user_id uuid,
  pattern text DEFAULT NULL
)
RETURNS TABLE (
  memory_key text,
  memory_count bigint,
  first_created timestamptz,
  last_created timestamptz,
  sample_metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    am.memory_key,
    COUNT(*)::bigint as memory_count,
    MIN(am.created_at) as first_created,
    MAX(am.created_at) as last_created,
    (SELECT metadata FROM agent_memories 
     WHERE memory_key = am.memory_key AND user_id = $1 
     ORDER BY created_at DESC LIMIT 1) as sample_metadata
  FROM agent_memories am
  WHERE 
    am.user_id = $1
    AND (pattern IS NULL OR am.memory_key ILIKE '%' || pattern || '%')
  GROUP BY am.memory_key
  ORDER BY last_created DESC;
END;
$$;

-- Add verification results column to interactions table
ALTER TABLE interactions 
ADD COLUMN IF NOT EXISTS verification_results JSONB DEFAULT '[]'::jsonb;

-- Verification logs table
CREATE TABLE IF NOT EXISTS verification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  interaction_id UUID REFERENCES interactions(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL CHECK (verification_type IN ('agent', 'orchestrator', 'moderator', 'analysis', 'consensus', 'discussion', 'response', 'validation')),
  target_id TEXT NOT NULL,
  goal TEXT NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for verification logs
CREATE INDEX idx_verification_logs_interaction ON verification_logs(interaction_id);
CREATE INDEX idx_verification_logs_type ON verification_logs(verification_type);
CREATE INDEX idx_verification_logs_created ON verification_logs(created_at DESC);

-- Enable RLS on verification logs
ALTER TABLE verification_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for verification logs
CREATE POLICY "Users can read verification logs for their interactions"
  ON verification_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM interactions i 
      WHERE i.id = verification_logs.interaction_id 
      AND i.user_id = auth.uid()
    )
  );

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION search_agent_memories TO authenticated;
GRANT EXECUTE ON FUNCTION list_memory_streams TO authenticated;