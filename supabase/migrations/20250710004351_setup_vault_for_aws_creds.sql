-- Enable Vault extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- Create a function to store AWS credentials in Vault
-- This function can only be called with service role authentication
CREATE OR REPLACE FUNCTION store_aws_credentials(
  p_access_key_id TEXT,
  p_secret_access_key TEXT,
  p_region TEXT,
  p_topic_arn TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_secret_data JSONB;
  v_key_id UUID;
BEGIN
  -- Only allow service role to execute this
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: Only service role can store AWS credentials';
  END IF;

  -- Prepare the secret data
  v_secret_data := jsonb_build_object(
    'accessKeyId', p_access_key_id,
    'secretAccessKey', p_secret_access_key,
    'region', p_region,
    'topicArn', p_topic_arn,
    'updatedAt', now()
  );

  -- Check if secret already exists
  SELECT id INTO v_key_id
  FROM vault.secrets
  WHERE name = 'aws_edge_function_credentials';

  IF v_key_id IS NOT NULL THEN
    -- Update existing secret
    UPDATE vault.secrets
    SET 
      secret = v_secret_data::text,
      updated_at = now()
    WHERE id = v_key_id;
  ELSE
    -- Create new secret
    INSERT INTO vault.secrets (name, secret, description)
    VALUES (
      'aws_edge_function_credentials',
      v_secret_data::text,
      'AWS credentials for Edge Functions to publish to SNS'
    );
  END IF;
END;
$$;

-- Create a function to retrieve AWS credentials from Vault
-- This function can be called by Edge Functions with service role
CREATE OR REPLACE FUNCTION get_aws_credentials()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_secret_data TEXT;
BEGIN
  -- Only allow authenticated users or service role
  IF auth.role() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required';
  END IF;

  -- Retrieve the decrypted secret
  SELECT decrypted_secret INTO v_secret_data
  FROM vault.decrypted_secrets
  WHERE name = 'aws_edge_function_credentials';

  IF v_secret_data IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN v_secret_data::JSONB;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION store_aws_credentials TO service_role;
GRANT EXECUTE ON FUNCTION get_aws_credentials TO authenticated, service_role;