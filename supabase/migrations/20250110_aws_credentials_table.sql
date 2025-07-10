-- Create a simple table for AWS credentials
CREATE TABLE IF NOT EXISTS aws_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_key_id TEXT NOT NULL,
  secret_access_key TEXT NOT NULL,
  region TEXT NOT NULL,
  topic_arn TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only keep the latest credentials
CREATE UNIQUE INDEX idx_aws_credentials_singleton ON aws_credentials ((true));

-- RLS policies
ALTER TABLE aws_credentials ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write
CREATE POLICY "Service role only" ON aws_credentials
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create simple functions to store and retrieve
CREATE OR REPLACE FUNCTION store_aws_credentials(
  p_access_key_id TEXT,
  p_secret_access_key TEXT,
  p_region TEXT,
  p_topic_arn TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete any existing credentials
  DELETE FROM aws_credentials;
  
  -- Insert new credentials
  INSERT INTO aws_credentials (access_key_id, secret_access_key, region, topic_arn)
  VALUES (p_access_key_id, p_secret_access_key, p_region, p_topic_arn);
END;
$$;

-- Drop the old Vault function first
DROP FUNCTION IF EXISTS get_aws_credentials();

CREATE OR REPLACE FUNCTION get_aws_credentials()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'accessKeyId', access_key_id,
    'secretAccessKey', secret_access_key,
    'region', region,
    'topicArn', topic_arn,
    'updatedAt', updated_at
  ) INTO v_result
  FROM aws_credentials
  LIMIT 1;
  
  RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION store_aws_credentials TO service_role;
GRANT EXECUTE ON FUNCTION get_aws_credentials TO service_role, authenticated;