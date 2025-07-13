# MCP (Model Context Protocol) Integration Design

## Overview

This document outlines the design for integrating MCP servers into the Hawking Edison platform, enabling users to bring their own tools and data sources to multi-agent orchestration scenarios.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│                 │     │                  │     │                 │
│  User Browser   │────▶│  Edge Functions  │────▶│ Orchestrator    │
│  (Settings UI)  │     │  (MCP Config)   │     │ (Lambda)        │
│                 │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
         │                       │                          │
         │                       │                          │
         ▼                       ▼                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│                 │     │                  │     │                 │
│  OAuth Provider │     │    Supabase DB   │     │   MCP Servers   │
│  (GitHub, etc)  │     │  (Tokens, Config)│     │  (External)     │
│                 │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Database Schema

### 1. `mcp_servers` table
```sql
CREATE TABLE mcp_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('http', 'websocket', 'stdio')),
  url TEXT,
  config JSONB NOT NULL, -- Full MCP configuration
  is_active BOOLEAN DEFAULT true,
  last_connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);
```

### 2. `mcp_oauth_tokens` table
```sql
CREATE TABLE mcp_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mcp_server_id UUID NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL, -- Encrypted
  refresh_token TEXT, -- Encrypted
  expires_at TIMESTAMPTZ,
  token_type TEXT,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. `mcp_tools` table (cached tool definitions)
```sql
CREATE TABLE mcp_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mcp_server_id UUID NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  schema JSONB NOT NULL, -- Tool parameter schema
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mcp_server_id, name)
);
```

### 4. `mcp_data_sources` table
```sql
CREATE TABLE mcp_data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mcp_server_id UUID NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  schema JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mcp_server_id, name)
);
```

### 5. `mcp_execution_logs` table
```sql
CREATE TABLE mcp_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES orchestration_sessions(id) ON DELETE CASCADE,
  mcp_server_id UUID NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  request JSONB NOT NULL,
  response JSONB,
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'error', 'timeout')),
  error TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Key Components

### 1. Settings UI Component (`/settings/mcp-servers`)
- List configured MCP servers
- Add new MCP server (OAuth or manual config)
- Edit/Delete existing servers
- Test connection button
- Show cached tools/data sources

### 2. OAuth Flow
```typescript
// OAuth flow for MCP servers
1. User clicks "Connect GitHub MCP" (or other OAuth provider)
2. Redirect to OAuth provider with callback URL
3. Handle callback, exchange code for tokens
4. Store encrypted tokens in database
5. Enumerate tools/data sources from MCP server
6. Cache tool definitions
```

### 3. MCP Proxy in Orchestrator
```typescript
// In Lambda orchestrator
interface MCPToolCall {
  serverId: string
  toolName: string
  parameters: any
}

async function executeMCPTool(toolCall: MCPToolCall, context: ToolExecutionContext) {
  // 1. Get MCP server config and tokens
  // 2. Make authenticated request to MCP server
  // 3. Handle response/errors
  // 4. Log execution
  // 5. Return formatted response
}
```

### 4. Token Refresh Mechanism
```typescript
// Automatic token refresh
async function refreshMCPToken(serverId: string) {
  // 1. Check if token is expired
  // 2. Use refresh token to get new access token
  // 3. Update database
  // 4. If refresh fails, mark server as disconnected
}
```

## UI/UX Design

### Settings Page Layout
```
┌─────────────────────────────────────────────┐
│  MCP Servers                           [+ Add]│
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ 🔗 GitHub MCP Server        [Test] [Edit]│ │
│ │ Status: ✅ Connected                     │ │
│ │ Tools: 15 | Data Sources: 3             │ │
│ │ Last sync: 2 minutes ago                 │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 🔧 Custom API Server         [Test] [Edit]│ │
│ │ Status: ❌ Disconnected                  │ │
│ │ Tools: 0 | Data Sources: 0              │ │
│ │ Error: Token expired                     │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Chat Interface with MCP Output
```
┌─────────────────────────┬─────────────────────┐
│                         │                     │
│    Chat Messages        │   MCP Tool Output   │
│                         │                     │
│ User: Search GitHub     │ ┌─────────────────┐ │
│       for React hooks   │ │ 📊 Search Results│ │
│                         │ ├─────────────────┤ │
│ AI: I'll search GitHub  │ │ ▼ useAuth()     │ │
│     for React hooks...  │ │   ★ 1.2k        │ │
│                         │ │   Auth hook...   │ │
│ [Executing: github.     │ │                 │ │
│  search_repos]          │ │ ▼ useDebounce() │ │
│                         │ │   ★ 890         │ │
│                         │ │   Debounce...    │ │
│                         │ └─────────────────┘ │
└─────────────────────────┴─────────────────────┘
```

## Implementation Steps

### Phase 1: Database and Core Infrastructure
1. Create database migrations
2. Set up encryption for tokens
3. Create Supabase RLS policies
4. Enable realtime for mcp_execution_logs

### Phase 2: MCP Configuration UI
1. Create settings page component
2. Implement OAuth flow handlers
3. Build manual configuration form
4. Add connection testing

### Phase 3: Tool Enumeration and Caching
1. Create Edge Function for MCP communication
2. Implement tool/data source discovery
3. Cache tool definitions in database
4. Set up periodic refresh

### Phase 4: Orchestrator Integration
1. Extend tool registry to include MCP tools
2. Implement MCP proxy in Lambda
3. Add error handling and retries
4. Log all executions

### Phase 5: UI Enhancements
1. Create right panel for tool outputs
2. Implement JSON tree viewer
3. Add Markdown renderer
4. Support downloadable content

### Phase 6: Token Management
1. Implement token refresh logic
2. Handle expired tokens gracefully
3. Notify users of disconnections
4. Auto-reconnect where possible

## Security Considerations

1. **Token Storage**: Encrypt all OAuth tokens at rest
2. **Request Validation**: Validate all MCP requests before proxying
3. **Rate Limiting**: Implement per-user rate limits for MCP calls
4. **Sandboxing**: Execute MCP responses in sandboxed environment
5. **Audit Logging**: Log all MCP interactions for security review

## Error Handling

1. **Connection Errors**: Retry with exponential backoff
2. **Token Expiration**: Automatic refresh, user notification on failure
3. **MCP Server Errors**: Graceful degradation, clear error messages
4. **Network Timeouts**: Configurable timeouts, user feedback

## Testing Strategy

1. **Unit Tests**: Test each component in isolation
2. **Integration Tests**: Test OAuth flows end-to-end
3. **Mock MCP Server**: Create mock server for testing
4. **Error Scenarios**: Test all failure modes
5. **Performance Tests**: Ensure no impact on core functionality

## Future Enhancements

1. **MCP Server Marketplace**: Pre-configured popular MCP servers
2. **Custom Tool Builder**: UI for creating custom MCP tools
3. **Collaborative MCP**: Share MCP servers across teams
4. **Analytics**: Usage statistics for MCP tools
5. **Caching Strategy**: Smart caching of MCP responses