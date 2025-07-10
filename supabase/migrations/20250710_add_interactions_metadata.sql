-- Add metadata column to interactions table
ALTER TABLE interactions 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add index for metadata queries (GIN index for JSONB)
CREATE INDEX IF NOT EXISTS idx_interactions_metadata ON interactions USING GIN (metadata);

-- Update the service role to ensure it can use the new column
-- (Service role already has full access, but this ensures cache is refreshed)
NOTIFY pgrst, 'reload schema';