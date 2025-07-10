-- Migration to support human-readable thread IDs
-- Changes chat_threads.id from UUID to TEXT

-- Drop existing policies that depend on the columns we're changing
DROP POLICY IF EXISTS "Users can view messages in their threads" ON chat_messages;
DROP POLICY IF EXISTS "Users can create messages in their threads" ON chat_messages;

-- Drop constraints that reference the UUID column
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_thread_id_fkey;
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_thread_id_idx;

-- Change the id column type in chat_threads
ALTER TABLE chat_threads ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- Change the thread_id column type in chat_messages
ALTER TABLE chat_messages ALTER COLUMN thread_id TYPE TEXT USING thread_id::TEXT;

-- Re-add the foreign key constraint
ALTER TABLE chat_messages 
  ADD CONSTRAINT chat_messages_thread_id_fkey 
  FOREIGN KEY (thread_id) REFERENCES chat_threads(id) ON DELETE CASCADE;

-- Recreate the policies
CREATE POLICY "Users can view messages in their threads"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_threads
      WHERE chat_threads.id = chat_messages.thread_id
      AND chat_threads.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in their threads"
  ON chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM chat_threads
      WHERE chat_threads.id = thread_id
      AND chat_threads.user_id = auth.uid()
    )
  );

-- Add comment explaining the change
COMMENT ON COLUMN chat_threads.id IS 'Human-readable thread identifier like "sunny-river-123"';