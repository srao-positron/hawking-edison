-- Add metadata column to chat_messages if it doesn't exist
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create index for metadata
CREATE INDEX IF NOT EXISTS idx_chat_messages_metadata ON chat_messages USING GIN (metadata);

-- Update existing messages to include orchestration_session_id from chat_threads
UPDATE chat_messages cm
SET metadata = COALESCE(cm.metadata, '{}') || 
    jsonb_build_object('orchestration_session_id', ct.metadata->>'orchestration_session_id')
FROM chat_threads ct
WHERE cm.thread_id = ct.id
  AND ct.metadata ? 'orchestration_session_id'
  AND (cm.metadata IS NULL OR NOT cm.metadata ? 'orchestration_session_id');