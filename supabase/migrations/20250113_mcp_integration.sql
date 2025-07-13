-- MCP (Model Context Protocol) Integration Schema

-- 1. MCP Servers table - stores configured MCP servers per user
CREATE TABLE IF NOT EXISTS mcp_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('http', 'websocket', 'stdio')),
  url TEXT,
  config JSONB NOT NULL, -- Full MCP configuration including headers, auth config
  is_active BOOLEAN DEFAULT true,
  is_oauth BOOLEAN DEFAULT false, -- Whether this uses OAuth vs manual config
  oauth_provider TEXT, -- e.g., 'github', 'google', etc.
  last_connected_at TIMESTAMPTZ,
  connection_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- 2. OAuth tokens table - stores encrypted OAuth tokens
CREATE TABLE IF NOT EXISTS mcp_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mcp_server_id UUID NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL, -- Will be encrypted using Supabase Vault
  refresh_token TEXT, -- Will be encrypted using Supabase Vault
  expires_at TIMESTAMPTZ,
  token_type TEXT DEFAULT 'Bearer',
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mcp_server_id) -- One token per server
);

-- 3. MCP tools table - caches available tools from each server
CREATE TABLE IF NOT EXISTS mcp_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mcp_server_id UUID NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  schema JSONB NOT NULL, -- Tool parameter schema
  category TEXT, -- e.g., 'repository', 'search', 'file'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mcp_server_id, name)
);

-- 4. MCP data sources table - caches available data sources
CREATE TABLE IF NOT EXISTS mcp_data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mcp_server_id UUID NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  schema JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mcp_server_id, name)
);

-- 5. MCP execution logs - tracks all MCP tool executions
CREATE TABLE IF NOT EXISTS mcp_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES orchestration_sessions(id) ON DELETE CASCADE,
  thread_id TEXT REFERENCES chat_threads(id) ON DELETE CASCADE,
  mcp_server_id UUID NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  request JSONB NOT NULL,
  response JSONB,
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'error', 'timeout')),
  error TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_mcp_servers_user_id ON mcp_servers(user_id);
CREATE INDEX idx_mcp_servers_is_active ON mcp_servers(is_active);
CREATE INDEX idx_mcp_tools_server_id ON mcp_tools(mcp_server_id);
CREATE INDEX idx_mcp_data_sources_server_id ON mcp_data_sources(mcp_server_id);
CREATE INDEX idx_mcp_execution_logs_session_id ON mcp_execution_logs(session_id);
CREATE INDEX idx_mcp_execution_logs_created_at ON mcp_execution_logs(created_at DESC);

-- Enable RLS
ALTER TABLE mcp_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_execution_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own MCP servers
CREATE POLICY "Users can view their own MCP servers" 
  ON mcp_servers FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own MCP servers" 
  ON mcp_servers FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own MCP servers" 
  ON mcp_servers FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own MCP servers" 
  ON mcp_servers FOR DELETE 
  USING (auth.uid() = user_id);

-- OAuth tokens are only accessible via service role (for security)
CREATE POLICY "Service role only for OAuth tokens" 
  ON mcp_oauth_tokens FOR ALL 
  USING (auth.role() = 'service_role');

-- Users can view tools/data sources for their servers
CREATE POLICY "Users can view tools for their servers" 
  ON mcp_tools FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM mcp_servers 
    WHERE mcp_servers.id = mcp_tools.mcp_server_id 
    AND mcp_servers.user_id = auth.uid()
  ));

CREATE POLICY "Users can view data sources for their servers" 
  ON mcp_data_sources FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM mcp_servers 
    WHERE mcp_servers.id = mcp_data_sources.mcp_server_id 
    AND mcp_servers.user_id = auth.uid()
  ));

-- Users can view execution logs for their sessions
CREATE POLICY "Users can view their execution logs" 
  ON mcp_execution_logs FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM orchestration_sessions 
    WHERE orchestration_sessions.id = mcp_execution_logs.session_id 
    AND orchestration_sessions.user_id = auth.uid()
  ));

-- Enable realtime for execution logs
ALTER PUBLICATION supabase_realtime ADD TABLE mcp_execution_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE mcp_servers;

-- Function to safely update OAuth tokens
CREATE OR REPLACE FUNCTION update_mcp_oauth_token(
  p_server_id UUID,
  p_access_token TEXT,
  p_refresh_token TEXT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_token_id UUID;
BEGIN
  -- Verify the server belongs to the calling user
  IF NOT EXISTS (
    SELECT 1 FROM mcp_servers 
    WHERE id = p_server_id 
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Upsert the token
  INSERT INTO mcp_oauth_tokens (
    mcp_server_id,
    access_token,
    refresh_token,
    expires_at
  ) VALUES (
    p_server_id,
    p_access_token,
    p_refresh_token,
    p_expires_at
  )
  ON CONFLICT (mcp_server_id) 
  DO UPDATE SET
    access_token = EXCLUDED.access_token,
    refresh_token = COALESCE(EXCLUDED.refresh_token, mcp_oauth_tokens.refresh_token),
    expires_at = EXCLUDED.expires_at,
    updated_at = NOW()
  RETURNING id INTO v_token_id;
  
  -- Update server last connected time
  UPDATE mcp_servers 
  SET last_connected_at = NOW(),
      connection_error = NULL
  WHERE id = p_server_id;
  
  RETURN v_token_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_mcp_oauth_token TO authenticated;