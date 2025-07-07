-- Chat threads migration
-- Stores conversation threads for each user with messages and metadata

-- Create chat_threads table
CREATE TABLE IF NOT EXISTS chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  message_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  
  -- Indexes for performance
  CONSTRAINT chat_threads_user_id_idx FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  tokens_used INTEGER,
  model TEXT,
  
  -- Indexes for performance
  CONSTRAINT chat_messages_thread_id_idx FOREIGN KEY (thread_id) REFERENCES chat_threads(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_chat_threads_user_id ON chat_threads(user_id);
CREATE INDEX idx_chat_threads_updated_at ON chat_threads(updated_at DESC);
CREATE INDEX idx_chat_messages_thread_id ON chat_messages(thread_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- Create updated_at trigger for chat_threads
CREATE OR REPLACE FUNCTION update_chat_threads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_threads_updated_at
BEFORE UPDATE ON chat_threads
FOR EACH ROW
EXECUTE FUNCTION update_chat_threads_updated_at();

-- Create function to update thread metadata when message is added
CREATE OR REPLACE FUNCTION update_thread_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_threads 
  SET 
    message_count = message_count + 1,
    last_message_at = NEW.created_at,
    updated_at = now()
  WHERE id = NEW.thread_id;
  
  -- Auto-generate title from first user message if not set
  IF NEW.role = 'user' AND EXISTS (
    SELECT 1 FROM chat_threads 
    WHERE id = NEW.thread_id 
    AND title IS NULL
  ) THEN
    UPDATE chat_threads
    SET title = LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END
    WHERE id = NEW.thread_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_thread_on_message_insert
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_thread_on_message();

-- RLS policies
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat threads policies
CREATE POLICY "Users can view their own threads"
  ON chat_threads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own threads"
  ON chat_threads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own threads"
  ON chat_threads FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own threads"
  ON chat_threads FOR DELETE
  USING (auth.uid() = user_id);

-- Chat messages policies
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

-- Service role can do anything (for Edge Functions)
CREATE POLICY "Service role has full access to threads"
  ON chat_threads FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to messages"
  ON chat_messages FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');