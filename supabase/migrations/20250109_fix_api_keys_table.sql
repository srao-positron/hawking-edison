-- Fix API keys table - add missing columns if they don't exist

-- Add key_prefix column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'api_keys' 
        AND column_name = 'key_prefix'
    ) THEN
        ALTER TABLE api_keys ADD COLUMN key_prefix TEXT;
    END IF;
END $$;

-- Add permissions column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'api_keys' 
        AND column_name = 'permissions'
    ) THEN
        ALTER TABLE api_keys ADD COLUMN permissions JSONB DEFAULT '[]'::JSONB;
    END IF;
END $$;

-- Recreate indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

-- Update existing records to have a key_prefix based on their name
UPDATE api_keys 
SET key_prefix = 'hke_' || lower(substring(name, 1, 4))
WHERE key_prefix IS NULL;