# Hawking Edison v2: Development Standards
## Tool-First Development Approach

### Core Philosophy
We're building tools for an LLM to orchestrate, not features for specific use cases. Every piece of code should be a simple, composable tool that the LLM can use creatively.

---

## Development Principles

### 1. Tools, Not Features
```typescript
// ❌ WRONG - Feature-specific
async function runCodeReviewPanel(pr: PullRequest) {
  const reviewers = createCodeReviewers();
  return runCodeReview(reviewers, pr);
}

// ✅ RIGHT - Generic tool
async function createAgent(specification: string) {
  return new Agent(specification);
}
```

### 2. No Hidden Intelligence
```typescript
// ❌ WRONG - Tool makes decisions
async function createOptimalPanel(topic: string) {
  if (topic.includes("code")) {
    return createCodeReviewers();
  } else if (topic.includes("business")) {
    return createBusinessAnalysts();
  }
}

// ✅ RIGHT - Tool does exactly what it says
async function createAgent(specification: string) {
  const persona = await generatePersona(specification);
  return new Agent(persona);
}
```

### 3. Natural Language Parameters
```typescript
// ❌ WRONG - Enums and types
enum AgentType {
  REVIEWER = "reviewer",
  ANALYST = "analyst",
  VOTER = "voter"
}

// ✅ RIGHT - Natural language
createAgent("security expert who is cautious about new code")
```

### 4. Composable Returns
```typescript
// ❌ WRONG - Returns formatted string
async function analyzeResponses(responses: Response[]): string {
  return `Analysis complete: ${summary}`;
}

// ✅ RIGHT - Returns data for further use
async function analyzeResponses(responses: Response[]): AnalysisResult {
  return {
    patterns: [...],
    insights: [...],
    statistics: {...}
  };
}
```

---

## Tool Development Standards

### Tool Structure
```typescript
interface ToolDefinition {
  name: string;
  description: string;  // Clear, specific description
  parameters: {
    [key: string]: {
      type: string;
      description: string;
      optional?: boolean;
      examples?: any[];
    }
  };
  execute: (...args: any[]) => Promise<any>;
}
```

### Tool Implementation Template
```typescript
export const toolName: ToolDefinition = {
  name: "toolName",
  description: "Does X without making assumptions",
  parameters: {
    param1: {
      type: "string",
      description: "Natural language description",
      examples: ["example 1", "example 2"]
    }
  },
  execute: async (param1: string) => {
    // Simple, predictable execution
    // No routing, no special cases
    // Just do what the description says
    
    return usefulData; // Not formatted strings
  }
};
```

### Testing Tools
```typescript
describe('Tool: createAgent', () => {
  it('creates agent from any specification', async () => {
    const agent = await createAgent("5 year old who loves dinosaurs");
    expect(agent).toBeDefined();
    expect(agent.respond).toBeFunction();
  });
  
  it('returns composable agent object', async () => {
    const agent = await createAgent("expert");
    const response = await agent.respond("test prompt");
    expect(response).toBeString(); // Can be used by other tools
  });
  
  it('has no hidden logic or routing', async () => {
    // Tool should not behave differently based on content
    const agent1 = await createAgent("code reviewer");
    const agent2 = await createAgent("food critic");
    expect(agent1.constructor).toBe(agent2.constructor);
  });
});
```

---

## Infrastructure Standards

### 1. Start with Supabase Only
```typescript
// Use Supabase for everything initially
- Database: PostgreSQL with pgvector
- Auth: Supabase Auth
- Storage: Supabase Storage
- Realtime: Supabase Realtime
- Edge Functions: For API endpoints

// Note: AWS resources available if needed later
// But prove the concept with Supabase first
```

### 2. Database Design
```sql
-- Minimal schema - let behavior emerge
CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  input TEXT,
  tool_calls JSONB, -- Track what LLM did
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  content TEXT,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- No agent storage - they're ephemeral
-- No templates or types tables
```

### 3. API Design
```typescript
// One primary endpoint
app.post('/api/interact', async (req, res) => {
  const { input, context } = req.body;
  const result = await orchestrator.run(input, context);
  res.json(result);
});

// Tool execution endpoint (for debugging)
app.post('/api/tools/:toolName', async (req, res) => {
  const tool = tools[req.params.toolName];
  const result = await tool.execute(...req.body.params);
  res.json(result);
});
```

---

## Code Quality Standards

### 1. Simplicity First
- Each tool < 100 lines
- Single responsibility
- No nested conditionals based on content
- Clear, obvious behavior

### 2. Type Safety
```typescript
// Use TypeScript but keep it simple
interface Agent {
  id: string;
  specification: string;
  respond: (input: any) => Promise<string>;
}

// Don't over-type with specific agent types
// ❌ interface CodeReviewer extends Agent
// ❌ interface Voter extends Agent
```

### 3. Error Handling
```typescript
// Tools should handle errors gracefully
async function createAgent(spec: string): Promise<Agent> {
  try {
    const persona = await generatePersona(spec);
    return new Agent(persona);
  } catch (error) {
    console.error('Agent creation failed:', error);
    // Return a basic agent rather than throwing
    return new Agent({ 
      specification: spec,
      fallback: true 
    });
  }
}
```

### 4. Logging
```typescript
// Log tool usage for debugging
function logToolUse(toolName: string, params: any, result: any) {
  console.log({
    timestamp: new Date().toISOString(),
    tool: toolName,
    params: summarize(params),
    resultType: typeof result,
    resultSize: JSON.stringify(result).length
  });
}
```

---

## Development Workflow

### 1. Adding a New Tool
```bash
# 1. Create tool file
touch src/tools/newTool.ts

# 2. Implement following template
# 3. Add to tool registry
# 4. Write tests
# 5. Document in TOOLS_SPECIFICATION.md
```

### 2. Tool Checklist
- [ ] Single, clear purpose
- [ ] Natural language parameters
- [ ] No hidden routing or logic
- [ ] Returns composable data
- [ ] Handles errors gracefully
- [ ] Well documented
- [ ] Tested with various inputs

### 3. Review Questions
Before merging any tool:
1. Could the LLM use this in unexpected ways? (Good!)
2. Does it make any assumptions about use case? (Bad!)
3. Is the behavior predictable from the description? (Required!)
4. Can the output be used by other tools? (Required!)

---

## Security Standards

### 1. Tool Sandboxing
```typescript
// Tools that execute code must be sandboxed
async function executeCode(code: string, language: string) {
  return await runInSandbox({
    code,
    language,
    timeout: 5000,
    memoryLimit: '128MB'
  });
}
```

### 2. Input Validation
```typescript
// Validate parameters but don't restrict content
function validateParams(params: any, schema: any) {
  // Check types and required fields
  // Don't check content or patterns
}
```

### 3. Resource Limits
```typescript
// Prevent resource exhaustion
const LIMITS = {
  maxAgents: 10000,
  maxDiscussionRounds: 100,
  maxResponseLength: 50000,
  maxExecutionTime: 300000 // 5 minutes
};
```

---

## Performance Standards

### 1. Tool Performance
- Single tool execution < 1 second
- Agent creation < 100ms
- Response generation < 2 seconds
- Visualization generation < 3 seconds

### 2. Optimization Guidelines
```typescript
// Cache personas, not agents
const personaCache = new Map();

// Batch operations where possible
async function createMultipleAgents(count: number, spec: string) {
  // Create in parallel, not series
  return Promise.all(
    Array(count).fill(0).map(() => createAgent(spec))
  );
}
```

---

## What NOT to Build

### 1. No Workflow Engines
```typescript
// ❌ WRONG
class CodeReviewWorkflow {
  async execute(pr: PullRequest) {
    // Hardcoded sequence
  }
}
```

### 2. No Type Systems
```typescript
// ❌ WRONG
enum PanelType {
  CODE_REVIEW,
  DECISION_SUPPORT,
  MESSAGE_TESTING
}
```

### 3. No Smart Routers
```typescript
// ❌ WRONG
function routeRequest(input: string) {
  if (input.includes("review")) {
    return "code_review_handler";
  }
}
```

### 4. No Template Libraries
```typescript
// ❌ WRONG
const templates = {
  codeReview: {
    agents: ["security", "performance"],
    flow: "discussion"
  }
};
```

---

## Success Metrics

### Tool Success
1. **Generality**: Works for any content
2. **Composability**: Output useful to other tools
3. **Predictability**: Does what description says
4. **Simplicity**: No hidden complexity

### System Success
1. **No hardcoded flows**: 0 workflow definitions
2. **No type enums**: 0 domain-specific types
3. **Emergent behavior**: LLM creates novel solutions
4. **User delight**: "How did it know to do that?"

---

## Final Rule

**When in doubt, make it simpler.**

If you're adding complexity to handle a specific case, stop. Let the LLM figure it out with simple tools.

Remember: We're building tools for intelligence, not encoding intelligence in tools.