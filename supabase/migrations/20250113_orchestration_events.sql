-- Create table for storing orchestration events and interim messages
CREATE TABLE IF NOT EXISTS orchestration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES orchestration_sessions(id) ON DELETE CASCADE,
  thread_id TEXT REFERENCES chat_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'tool_call',        -- Tool being called
    'tool_result',      -- Tool execution result
    'verification',     -- Verification attempt
    'retry',           -- Retry attempt
    'thinking',        -- LLM thinking/reasoning
    'status_update',   -- Status change (running, completed, etc)
    'error',          -- Error occurred
    'context_compression' -- Context was compressed
  )),
  event_data JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_orchestration_events_session_id ON orchestration_events(session_id);
CREATE INDEX idx_orchestration_events_thread_id ON orchestration_events(thread_id);
CREATE INDEX idx_orchestration_events_user_id ON orchestration_events(user_id);
CREATE INDEX idx_orchestration_events_created_at ON orchestration_events(created_at DESC);
CREATE INDEX idx_orchestration_events_event_type ON orchestration_events(event_type);

-- Enable RLS
ALTER TABLE orchestration_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own orchestration events" 
  ON orchestration_events FOR SELECT 
  USING (auth.uid() = user_id);

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE orchestration_events;

-- Function to log orchestration events
CREATE OR REPLACE FUNCTION log_orchestration_event(
  p_session_id UUID,
  p_event_type TEXT,
  p_event_data JSONB,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_thread_id TEXT;
  v_event_id UUID;
BEGIN
  -- Get user_id and thread_id from session
  SELECT user_id, tool_state->>'thread_id' 
  INTO v_user_id, v_thread_id
  FROM orchestration_sessions 
  WHERE id = p_session_id;
  
  -- Insert event
  INSERT INTO orchestration_events (
    session_id, 
    thread_id, 
    user_id, 
    event_type, 
    event_data, 
    metadata
  ) VALUES (
    p_session_id,
    v_thread_id,
    v_user_id,
    p_event_type,
    p_event_data,
    p_metadata
  ) RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION log_orchestration_event TO authenticated;

-- Example event data structures:
COMMENT ON TABLE orchestration_events IS 'Stores detailed orchestration events for transparency. Example event_data structures:

tool_call: {
  "tool": "createAgent",
  "arguments": {...},
  "tool_call_id": "...",
  "timestamp": "..."
}

tool_result: {
  "tool": "createAgent",
  "tool_call_id": "...",
  "success": true,
  "result": {...},
  "duration_ms": 1234
}

verification: {
  "goal": "Create haiku about rabbit",
  "achieved": true,
  "confidence": 0.95,
  "issues": []
}

thinking: {
  "content": "I need to use the createAgent tool to...",
  "step": "planning"
}

status_update: {
  "from": "pending",
  "to": "running",
  "message": "Starting orchestration..."
}';