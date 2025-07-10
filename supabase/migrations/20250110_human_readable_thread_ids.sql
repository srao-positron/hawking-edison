-- Migration to support human-readable thread IDs
-- Changes chat_threads.id from UUID to TEXT

-- First, we need to drop constraints that reference the UUID column
ALTER TABLE chat_messages DROP CONSTRAINT chat_messages_thread_id_fkey;

-- Change the thread_id column type in chat_messages
ALTER TABLE chat_messages ALTER COLUMN thread_id TYPE TEXT USING thread_id::TEXT;

-- Change the id column type in chat_threads
ALTER TABLE chat_threads ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- Re-add the foreign key constraint
ALTER TABLE chat_messages 
  ADD CONSTRAINT chat_messages_thread_id_fkey 
  FOREIGN KEY (thread_id) REFERENCES chat_threads(id) ON DELETE CASCADE;

-- Also update the interactions table if it references threads
ALTER TABLE interactions ALTER COLUMN metadata TYPE JSONB USING metadata::JSONB;

-- Add comment explaining the change
COMMENT ON COLUMN chat_threads.id IS 'Human-readable thread identifier like "sunny-river-123"';