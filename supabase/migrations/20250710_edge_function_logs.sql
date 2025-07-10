-- Create edge function logs table for debugging
CREATE TABLE IF NOT EXISTS edge_function_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  function_name TEXT NOT NULL,
  request_id UUID,
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  message TEXT NOT NULL,
  data JSONB,
  error JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_edge_logs_function_name ON edge_function_logs(function_name);
CREATE INDEX IF NOT EXISTS idx_edge_logs_request_id ON edge_function_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_edge_logs_level ON edge_function_logs(level);
CREATE INDEX IF NOT EXISTS idx_edge_logs_created_at ON edge_function_logs(created_at DESC);

-- Grant access to service role (Edge Functions use service role)
GRANT ALL ON edge_function_logs TO service_role;

-- Also add the missing metadata column to interactions
ALTER TABLE interactions 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add index for metadata queries
CREATE INDEX IF NOT EXISTS idx_interactions_metadata ON interactions USING GIN (metadata);