-- Enable realtime for chat_threads table
BEGIN;

-- Drop existing publication if it exists
DROP PUBLICATION IF EXISTS supabase_realtime CASCADE;

-- Create publication with the required tables
CREATE PUBLICATION supabase_realtime;

-- Add tables to the publication
ALTER PUBLICATION supabase_realtime ADD TABLE chat_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE orchestration_sessions;

-- Enable Row Level Security for realtime to work properly
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestration_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist (users can only see their own data)
DO $$
BEGIN
    -- Policy for chat_threads
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_threads' AND policyname = 'Users can view their own threads') THEN
        CREATE POLICY "Users can view their own threads" ON chat_threads FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_threads' AND policyname = 'Users can update their own threads') THEN
        CREATE POLICY "Users can update their own threads" ON chat_threads FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    -- Policy for chat_messages
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'Users can view messages in their threads') THEN
        CREATE POLICY "Users can view messages in their threads" ON chat_messages FOR SELECT 
        USING (EXISTS (SELECT 1 FROM chat_threads WHERE chat_threads.id = chat_messages.thread_id AND chat_threads.user_id = auth.uid()));
    END IF;
    
    -- Policy for orchestration_sessions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orchestration_sessions' AND policyname = 'Users can view their own sessions') THEN
        CREATE POLICY "Users can view their own sessions" ON orchestration_sessions FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;

COMMIT;

-- Notify that realtime is now enabled
SELECT 'Realtime enabled for chat_threads, chat_messages, and orchestration_sessions tables';