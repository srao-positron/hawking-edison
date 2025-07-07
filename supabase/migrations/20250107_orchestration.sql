-- Create orchestration_sessions table
CREATE TABLE orchestration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'running', 'resuming', 'completed', 'failed')),
  
  -- Conversation state
  messages JSONB NOT NULL DEFAULT '[]',
  tool_state JSONB DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Results
  final_response TEXT,
  total_tokens INTEGER DEFAULT 0,
  execution_count INTEGER DEFAULT 0, -- How many Lambda executions
  
  -- Error handling
  error TEXT,
  error_count INTEGER DEFAULT 0
);

-- Create tool_executions table
CREATE TABLE tool_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES orchestration_sessions(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  parameters JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  result JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

-- Create indexes for performance
CREATE INDEX idx_orchestration_sessions_user_id ON orchestration_sessions(user_id);
CREATE INDEX idx_orchestration_sessions_status ON orchestration_sessions(status);
CREATE INDEX idx_orchestration_sessions_created_at ON orchestration_sessions(created_at DESC);

CREATE INDEX idx_tool_executions_session_id ON tool_executions(session_id);
CREATE INDEX idx_tool_executions_status ON tool_executions(status);
CREATE INDEX idx_tool_executions_tool_name ON tool_executions(tool_name);

-- Enable RLS
ALTER TABLE orchestration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_executions ENABLE ROW LEVEL SECURITY;

-- RLS policies for orchestration_sessions
CREATE POLICY "Users can view their own orchestration sessions"
  ON orchestration_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orchestration sessions"
  ON orchestration_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all orchestration sessions"
  ON orchestration_sessions FOR ALL
  USING (auth.role() = 'service_role');

-- RLS policies for tool_executions
CREATE POLICY "Users can view tool executions for their sessions"
  ON tool_executions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orchestration_sessions
      WHERE orchestration_sessions.id = tool_executions.session_id
      AND orchestration_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all tool executions"
  ON tool_executions FOR ALL
  USING (auth.role() = 'service_role');

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orchestration_sessions_updated_at
  BEFORE UPDATE ON orchestration_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for orchestration updates
ALTER PUBLICATION supabase_realtime ADD TABLE orchestration_sessions;

-- Comments for documentation
COMMENT ON TABLE orchestration_sessions IS 'Stores long-running orchestration sessions that can span multiple Lambda executions';
COMMENT ON TABLE tool_executions IS 'Tracks individual tool executions within an orchestration session';
COMMENT ON COLUMN orchestration_sessions.execution_count IS 'Number of Lambda executions for this session (for resumable operations)';
COMMENT ON COLUMN orchestration_sessions.tool_state IS 'Persistent state for tools that can be resumed across executions';