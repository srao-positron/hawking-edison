# API-First Architecture with Supabase
## Complete Design for Hawking Edison v2

### Core Principle
**Everything is an API**. The browser is just one client. MCP is another. Future mobile apps are others.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Clients                              │
├─────────────────┬───────────────┬─────────────┬────────────┤
│   Browser App   │      MCP      │   Mobile    │    CLI     │
└────────┬────────┴───────┬───────┴──────┬──────┴─────┬──────┘
         │                │               │            │
         └────────────────┴───────────────┴────────────┘
                                 │
                          [Authentication]
                                 │
┌─────────────────────────────────▼───────────────────────────┐
│                     API Layer (Edge Functions)              │
├─────────────────────────────────────────────────────────────┤
│  POST /api/interact      - Main orchestration endpoint      │
│  POST /api/tools/*       - Individual tool execution        │
│  GET  /api/databank      - Search user's knowledge         │
│  POST /api/databank      - Add to knowledge base           │
│  GET  /api/memories      - List memory streams             │
│  POST /api/memories      - Save/retrieve memories          │
└─────────────────────────────────────────────────────────────┘
                                 │
┌─────────────────────────────────▼───────────────────────────┐
│                    Business Logic Layer                     │
├─────────────────────────────────────────────────────────────┤
│  • LLM Orchestrator     • Tool Execution Engine            │
│  • Agent Management     • Memory System                     │
│  • Databank Search      • Visualization Generator          │
└─────────────────────────────────────────────────────────────┘
                                 │
┌─────────────────────────────────▼───────────────────────────┐
│                 Supabase Infrastructure                     │
├─────────────────────────────────────────────────────────────┤
│  • PostgreSQL + pgvector  • Row Level Security             │
│  • Supabase Auth          • Realtime subscriptions         │
│  • Edge Functions         • Storage (if needed)            │
└─────────────────────────────────────────────────────────────┘
```

### API Design Standards

#### 1. Authentication Required for Everything
```typescript
// Every API endpoint requires authentication
export const requireAuth = async (req: Request) => {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return new Response(JSON.stringify({ 
      error: 'No authorization token provided' 
    }), { 
      status: 401 
    });
  }
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return new Response(JSON.stringify({ 
      error: 'Invalid token' 
    }), { 
      status: 401 
    });
  }
  
  return user;
};
```

#### 2. Consistent API Response Format
```typescript
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    requestId: string;
    timestamp: string;
    version: string;
  };
}
```

#### 3. RESTful Endpoints (Not GraphQL for v1)
```typescript
// Main orchestration endpoint
POST /api/interact
{
  "input": "Create a panel to discuss AI safety",
  "context": {
    "previousInteractionId": "uuid",
    "workspace": "ai-research"
  }
}

// Individual tool endpoints (for debugging/direct access)
POST /api/tools/create-agent
{
  "specification": "AI safety researcher"
}

POST /api/tools/search-databank
{
  "query": "AI alignment papers"
}

// Databank management
GET  /api/databank/search?q=sarah+chen
POST /api/databank/add
DELETE /api/databank/:id

// Memory management
GET  /api/memories?stream=project-alpha
POST /api/memories
DELETE /api/memories/:stream
```

### Edge Functions Implementation

#### Directory Structure
```
supabase/functions/
├── _shared/
│   ├── auth.ts         # Authentication middleware
│   ├── cors.ts         # CORS handling
│   ├── types.ts        # Shared types
│   └── utils.ts        # Utilities
├── interact/           # Main orchestration
│   └── index.ts
├── tools-create-agent/ # Tool: Create agent
│   └── index.ts
├── tools-search-databank/ # Tool: Search databank
│   └── index.ts
├── databank-search/    # Databank search API
│   └── index.ts
├── databank-add/       # Add to databank
│   └── index.ts
└── memories/           # Memory management
    └── index.ts
```

#### Example Edge Function
```typescript
// supabase/functions/interact/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { LLMOrchestrator } from '../_shared/orchestrator.ts';

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    // Authenticate
    const user = await requireAuth(req);
    if (user instanceof Response) return user;
    
    // Parse request
    const { input, context } = await req.json();
    
    // Create Supabase client with user context
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! }
        }
      }
    );
    
    // Initialize orchestrator
    const orchestrator = new LLMOrchestrator(supabase, user);
    
    // Process request
    const result = await orchestrator.process(input, context);
    
    // Return response
    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        metadata: {
          requestId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
    
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message
        }
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      }
    );
  }
});
```

### Browser App Architecture

#### NO Business Logic in Browser
```typescript
// ❌ WRONG - Business logic in browser
const createAgentInBrowser = async (spec: string) => {
  const persona = generatePersona(spec); // NO!
  const agent = new Agent(persona); // NO!
  return agent;
};

// ✅ RIGHT - Call API
const createAgent = async (spec: string) => {
  const response = await fetch('/api/tools/create-agent', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ specification: spec })
  });
  
  return response.json();
};
```

#### Browser App Structure
```typescript
// app/lib/api.ts - API client
export class HawkingAPI {
  constructor(private token: string) {}
  
  async interact(input: string, context?: any) {
    return this.post('/api/interact', { input, context });
  }
  
  async searchDatabank(query: string) {
    return this.get(`/api/databank/search?q=${encodeURIComponent(query)}`);
  }
  
  private async post(endpoint: string, body: any) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    
    return response.json();
  }
}

// app/components/Chat.tsx - UI only
export function Chat() {
  const [input, setInput] = useState('');
  const api = useAPI(); // Hook that provides authenticated API client
  
  const handleSubmit = async () => {
    const result = await api.interact(input);
    // Display result
  };
  
  // Just UI, no logic
  return (
    <div>
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={handleSubmit}>Send</button>
    </div>
  );
}
```

### MCP Integration

```typescript
// MCP just wraps our APIs
export class HawkingMCP {
  constructor(private apiKey: string, private baseUrl: string) {}
  
  async query(input: string) {
    // MCP calls our standard API
    const response = await fetch(`${this.baseUrl}/api/interact`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ input })
    });
    
    return response.json();
  }
}
```

### Security with Supabase

#### 1. Row Level Security (RLS)
```sql
-- All user data is protected by RLS
CREATE POLICY "Users can only see their own data" ON databank
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only see their own memories" ON agent_memories
  FOR ALL USING (auth.uid() = user_id);
```

#### 2. API Key Management
```typescript
// For external API access (not browser)
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  key_hash TEXT NOT NULL, -- bcrypt hash
  name TEXT,
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

// Validate API key in Edge Function
const validateAPIKey = async (key: string) => {
  // Hash and check against database
  const keyHash = await bcrypt.hash(key);
  const { data } = await supabase
    .from('api_keys')
    .select('user_id')
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .single();
    
  return data?.user_id;
};
```

### Rate Limiting

```typescript
// Simple rate limiting in Edge Functions
const RATE_LIMITS = {
  '/api/interact': { requests: 100, window: 60 }, // 100 per minute
  '/api/databank': { requests: 1000, window: 60 }, // 1000 per minute
};

const checkRateLimit = async (userId: string, endpoint: string) => {
  const key = `rate_limit:${userId}:${endpoint}`;
  const limit = RATE_LIMITS[endpoint];
  
  // Use Supabase to track (or Redis if needed)
  // Return true if within limits
};
```

### Development Workflow

1. **Define API First**
   - Design endpoint
   - Define request/response schema
   - Document in OpenAPI/Swagger

2. **Implement in Edge Function**
   - All logic in Edge Function
   - Use Supabase client with user context
   - Return consistent responses

3. **Call from Browser**
   - Simple API calls
   - No business logic
   - Just UI state management

4. **Test APIs Independently**
   - Use Postman/Insomnia
   - Test with different auth tokens
   - Verify RLS works

### Benefits of This Architecture

1. **Single Source of Truth**: All logic in APIs
2. **Multiple Clients**: Browser, MCP, mobile, CLI can all use same APIs
3. **Security**: Authentication and RLS protect all data
4. **Scalability**: Edge Functions scale automatically
5. **Maintainability**: Change logic once, all clients get updates
6. **Monetization**: Easy to add usage tracking and billing

### Critical Rules

1. **NO business logic in browser** - Just UI and API calls
2. **ALWAYS require authentication** - Every endpoint
3. **USE RLS** - Additional security layer
4. **CONSISTENT responses** - Same format everywhere
5. **VERSION APIs** - Plan for backwards compatibility
6. **DOCUMENT everything** - OpenAPI spec for all endpoints

This architecture ensures we can offer APIs to customers, wrap with MCP, build mobile apps, and maintain security and consistency across all clients.