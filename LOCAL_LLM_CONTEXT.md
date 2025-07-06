# Hawking Edison Code Generation Context

## CRITICAL: You are generating code for the Hawking Edison v2 project. Follow these rules EXACTLY.

## Project Overview
- **What**: LLM-orchestrated multi-agent intelligence platform
- **Architecture**: Tool-based, no hardcoded workflows
- **Philosophy**: Give LLM powerful tools, let it figure out solutions

## MANDATORY RULES

### Rule 1: NO TYPES, NO TEMPLATES, NO ENUMS
```typescript
// ❌ NEVER create:
enum PanelType { REVIEW, DECISION, ANALYSIS }
interface SimulationTemplate { }
class SpecificAgentType { }

// ✅ ALWAYS create:
function createAgent(specification: string)  // Natural language
function runInteraction(agents, instructions)  // Flexible
```

### Rule 2: API-FIRST ARCHITECTURE
```typescript
// ❌ NEVER: Business logic in browser
function calculateInBrowser(data) {
  return complexLogic(data); // NO!
}

// ✅ ALWAYS: Call API
async function calculate(data) {
  return await api.post('/api/calculate', data);
}
```

### Rule 3: DUAL AUTHENTICATION
Every API endpoint MUST support both:
1. Session-based auth (Supabase)
2. API key auth

```typescript
const user = await authenticate(request); // Handles both methods
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

### Rule 4: CONSISTENT API RESPONSES
```typescript
// ALWAYS return this format:
{
  success: boolean,
  data?: any,
  error?: {
    code: string,
    message: string
  }
}
```

### Rule 5: NO COMMENTS
Do not add ANY comments to the code unless explicitly requested.

## Technology Stack
- **Frontend**: Next.js 15 (App Router), React, TypeScript, Mantine UI
- **Backend**: Supabase Edge Functions (Deno), PostgreSQL
- **Auth**: Supabase Auth (dual mode: session + API keys)
- **Async**: AWS Lambda, SNS/SQS
- **Testing**: Jest, Playwright

## File Structure Patterns

### API Routes (Next.js App Router)
```typescript
// src/app/api/[feature]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  // validation
})

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validated = schema.parse(body)

    // Implementation here

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors } },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 }
    )
  }
}
```

### Supabase Edge Functions
```typescript
// supabase/functions/[function-name]/index.ts
import { serve } from 'https://deno.land/std@0.196.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing authorization' } }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Implementation here

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

### React Components
```typescript
// src/components/[ComponentName].tsx
'use client'

import { useState } from 'react'
import { Button, Card, Stack, Text } from '@mantine/core'
import { api } from '@/lib/api-client'

interface ComponentNameProps {
  // props
}

export function ComponentName({ ...props }: ComponentNameProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAction = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await api.someMethod(data)
      // Handle success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      {/* UI here */}
    </Card>
  )
}
```

### Database Migrations
```sql
-- supabase/migrations/[timestamp]_[description].sql
CREATE TABLE table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_table_name_user_id ON table_name(user_id);

ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own records" ON table_name
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access" ON table_name
  FOR ALL USING (auth.role() = 'service_role');
```

### API Client Methods
```typescript
// src/lib/api-client.ts additions
async someMethod(data: any) {
  return this.post('/api/endpoint', data)
}
```

### Tests
```typescript
// __tests__/features/[feature].test.ts
import { api } from '@/lib/api-client'

describe('Feature Name', () => {
  it('should work correctly', async () => {
    const result = await api.someMethod({ test: 'data' })
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
  })
})
```

## Tool Creation Pattern
```typescript
// src/tools/[category].ts
export const toolName = {
  name: 'toolName',
  description: 'Clear, specific description of what this tool does',
  parameters: {
    paramName: {
      type: 'string',
      description: 'What this parameter controls',
      required: true,
      example: 'Example value'
    }
  },
  execute: async (params) => {
    // Simple implementation
    // No routing or special cases
    return composableResult
  }
}
```

## IMPORTANT PATTERNS

### Always Use Natural Language
```typescript
// ❌ WRONG:
createAgent({ type: 'reviewer', expertise: 'security' })

// ✅ RIGHT:
createAgent('Security reviewer who is paranoid about bugs and vulnerabilities')
```

### No Hardcoded Workflows
```typescript
// ❌ WRONG:
if (request.type === 'codeReview') {
  createReviewPanel()
  runReviewWorkflow()
}

// ✅ RIGHT:
// Let the LLM decide what tools to use based on the request
```

### Flexible Parameters
```typescript
// ❌ WRONG:
function runSimulation(agents: Agent[], rounds: number, topic: Topic)

// ✅ RIGHT:
function runSimulation(specification: string)
// LLM provides: "Run a 5-round simulation with 3 experts discussing climate change"
```

## Code Style Requirements
1. Use early returns for error cases
2. Prefer const over let
3. Use async/await over promises
4. Use optional chaining (?.) and nullish coalescing (??)
5. NO COMMENTS unless explicitly requested
6. Use meaningful variable names that self-document

## Common Imports
```typescript
// Next.js API routes
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Supabase
import { createClient } from '@/lib/supabase-server'
import { createClient as createBrowserClient } from '@/lib/supabase'

// UI Components
import { Button, Card, Stack, Text, TextInput, Select } from '@mantine/core'
import { IconCheck, IconX } from '@tabler/icons-react'

// Utilities
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
```

## Response Examples

### Success Response
```json
{
  "success": true,
  "data": {
    "id": "123",
    "result": "whatever the API returns"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [...]
  }
}
```

## REMEMBER
1. We manage all LLM API keys - users don't provide their own
2. Every API supports both session and API key auth
3. No business logic in the browser
4. No types, no templates, no enums
5. Trust the LLM to figure things out with tools
6. Natural language everywhere
7. Composable, flexible tools

When generating code, follow these patterns EXACTLY. Do not deviate.