-- Add missing event types that Lambda tools are trying to use
ALTER TABLE orchestration_events 
DROP CONSTRAINT orchestration_events_event_type_check;

ALTER TABLE orchestration_events 
ADD CONSTRAINT orchestration_events_event_type_check 
CHECK (event_type IN (
  'tool_call',          -- Tool being called
  'tool_result',        -- Tool execution result
  'verification',       -- Verification attempt
  'retry',             -- Retry attempt
  'thinking',          -- LLM thinking/reasoning
  'status_update',     -- Status change (running, completed, etc)
  'error',             -- Error occurred
  'context_compression', -- Context was compressed
  'agent_created',      -- Agent was created
  'agent_thought',      -- Agent generated a thought
  'discussion_turn'     -- Discussion turn occurred
));

-- Update the comment to include new event type examples
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

agent_created: {
  "agent_id": "...",
  "name": "...",
  "expertise": "...",
  "personality": "..."
}

agent_thought: {
  "agent_id": "...",
  "thought": "...",
  "context": "..."
}

discussion_turn: {
  "discussion_id": "...",
  "agent_id": "...",
  "message": "...",
  "turn_number": 1
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