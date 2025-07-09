# Hawking Edison API Key Architecture

## Overview

Hawking Edison supports two authentication methods for API access:
1. **Session-based authentication** (via Supabase Auth) - for web users
2. **API key authentication** - for programmatic access

Both methods resolve to the same user identity and permissions in Supabase.

## Key Principles

### 1. Early Implementation
- Implement authentication layer BEFORE building feature APIs
- Prevents technical debt and retrofitting
- Ensures consistent auth patterns across all endpoints

### 2. Unified Identity
- Both auth methods map to the same Supabase user
- Single source of truth for user data and permissions
- Consistent authorization regardless of auth method

### 3. Developer First
- Clean, consistent API design
- Same endpoints work with both auth methods
- First-class support for CLI tools, CI/CD, mobile apps

## Architecture

### API Key Properties
```typescript
interface ApiKey {
  id: string
  user_id: string
  name: string  // User-friendly name (e.g., "CI/CD Key", "Development")
  key_hash: string  // Hashed API key (never store plain text)
  key_prefix: string  // First 8 chars for identification (e.g., "hke_live_")
  created_at: string
  last_used_at?: string
  expires_at?: string
  revoked_at?: string
  permissions?: string[]  // Optional: scope limitations
}
```

### Database Schema
```sql
-- API Keys table
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  permissions JSONB,
  
  -- Indexes
  UNIQUE(key_hash),
  INDEX(user_id),
  INDEX(key_prefix)
);

-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Users can only see/manage their own keys
CREATE POLICY "Users manage own API keys" ON api_keys
  FOR ALL USING (auth.uid() = user_id);
```

### Authentication Middleware

```typescript
// Unified auth middleware
async function authenticate(request: Request): Promise<User> {
  // Check for API key first (header or query param)
  const apiKey = getApiKey(request)
  if (apiKey) {
    return authenticateWithApiKey(apiKey)
  }
  
  // Fall back to session auth
  return authenticateWithSession(request)
}

// Usage in any API route
export async function handler(request: Request) {
  const user = await authenticate(request)
  // Both API key and session users handled identically
  // ...rest of handler
}
```

### API Key Format
- Pattern: `hke_{environment}_{random}`
- Example: `hke_live_abc123def456...`
- Components:
  - `hke_` - Hawking Edison prefix
  - `live`/`test` - Environment indicator
  - Random string - Cryptographically secure

## Implementation Details

### 1. Key Generation
- Use cryptographically secure random generation
- Hash keys before storage (using bcrypt or argon2)
- Return full key only once during creation
- Store only hash and prefix for identification

### 2. Key Authentication Flow
1. Extract API key from request (header or query)
2. Hash the provided key
3. Look up by hash in database
4. Check expiration and revocation status
5. Update last_used_at timestamp
6. Return associated user

### 3. Security Considerations
- Rate limit API key creation
- Implement key rotation policies
- Log API key usage for audit trails
- Support immediate revocation
- Optional IP allowlisting per key

### 4. Management UI
- List all API keys with last usage
- Create new keys with descriptive names
- Revoke keys immediately
- View usage statistics per key
- Set expiration dates

## Benefits

### For Developers
- **CLI Integration**: Build command-line tools
- **CI/CD**: Automate deployments and testing
- **Third-party Apps**: Enable ecosystem development
- **Webhooks**: Secure webhook authentication

### For the Platform
- **Consistent Auth**: Single pattern across all endpoints
- **Usage Tracking**: Monitor API usage per key
- **Rate Limiting**: Apply limits per key or user
- **Monetization**: Different tiers/limits per API key

## Example Usage

### Creating an API Key
```bash
# Via UI or API
POST /api/keys
{
  "name": "Production CI/CD",
  "expires_in_days": 90
}

Response:
{
  "id": "...",
  "key": "hke_live_abc123...",  // Only shown once!
  "name": "Production CI/CD",
  "expires_at": "2024-04-01T00:00:00Z"
}
```

### Using an API Key
```bash
# Header authentication
curl -H "Authorization: Bearer hke_live_abc123..." \
  https://api.hawking-edison.com/api/tasks

# Or API key header
curl -H "X-API-Key: hke_live_abc123..." \
  https://api.hawking-edison.com/api/tasks
```

## Migration Path

1. **Phase 1**: Implement API key infrastructure
   - Database tables
   - Key generation/management
   - Authentication middleware

2. **Phase 2**: Update existing endpoints
   - Add unified auth middleware
   - Test both auth methods
   - Update documentation

3. **Phase 3**: Enable for users
   - Add UI for key management
   - Document API usage
   - Monitor adoption

## Future Enhancements

- **Scoped Permissions**: Limit keys to specific operations
- **Team Keys**: Shared keys for organizations
- **OAuth2**: Full OAuth2 implementation for third-party apps
- **Key Analytics**: Detailed usage analytics per key
- **Automatic Rotation**: Enforce key rotation policies

---

## IMPORTANT: Implementation Order

1. **First**: Build this API key system
2. **Then**: Build all feature APIs with both auth methods supported
3. **Result**: Every API automatically works for both web users and API users

This prevents the need to retrofit authentication later and ensures a consistent, secure API from day one.