# Claude Development Reference
## Hawking Edison v2 - Tool-Based Architecture

### 📚 Documentation Hub
All technical documentation has been organized in the [`devdocs/`](./devdocs/) directory:

#### Main Guides
- **[Tool Implementation Guide](./devdocs/TOOL_IMPLEMENTATION_GUIDE.md)** - How each tool was built ⭐
- **[Tool Verification Checklist](./devdocs/TOOL_VERIFICATION_CHECKLIST.md)** - Verification against specs
- **[Tool System Diagram](./devdocs/TOOL_SYSTEM_DIAGRAM.md)** - Visual architecture
- **[Tool Usage Examples](./devdocs/TOOL_USAGE_EXAMPLES.md)** - Real code examples
- **[Realtime Visualization Plan](./devdocs/development/REALTIME_VISUALIZATION_PLAN.md)** - Two-panel UI implementation 🆕

#### Directory Structure
- **[`devdocs/architecture/`](./devdocs/architecture/)** - Core system architecture
  - Complete architecture, API-first design, async processing, memory system
- **[`devdocs/tools/`](./devdocs/tools/)** - Tool specifications and design
  - Tool specs, design principles, parameterization guides
- **[`devdocs/demos/`](./devdocs/demos/)** - Demo specifications
  - Code review, business decisions, message testing examples
- **[`devdocs/development/`](./devdocs/development/)** - Development guides
  - **IMPORTANT**: [DEVELOPMENT_RULES.md](./devdocs/development/DEVELOPMENT_RULES.md) - Read this first!

**Quick Access**: The [devdocs README](./devdocs/README.md) provides a complete index of all documentation.

### 🚨 STOP! Use Camille BEFORE You Code!

**Every Claude session MUST start with:**
```typescript
// 1. Check what's been done before
mcp__camille__recall_previous_discussions("what you're working on")

// 2. Search existing code patterns  
mcp__camille__search_code("feature or bug you're addressing")

// 3. Get full context when needed
mcp__camille__retrieve_memory_chunk("chunk-id")
```

**Camille remembers EVERYTHING across all sessions. Not using it wastes time and causes duplicate work!**

### Quick Start
You're building a system where an LLM orchestrates tools to solve any user request. No types, no templates, no workflows - just intelligent tool use.

### Project Overview
**What**: LLM-orchestrated multi-agent intelligence platform  
**How**: Give LLM powerful tools, let it figure out solutions  
**Why**: Infinite flexibility, emergent behavior, true intelligence  
**For**: Non-technical users (like Sarah, PM with English Lit degree)

### 🔍 CRITICAL: Use Camille Tools FIRST!

**Before writing ANY code, searching files, or implementing features, ALWAYS use Camille to:**

1. **Search Previous Discussions**
   ```typescript
   // ALWAYS start with this - we've likely solved similar problems before!
   mcp__camille__recall_previous_discussions("feature or bug description")
   ```

2. **Search Code Semantically**
   ```typescript
   // Better than grep - finds conceptually related code
   mcp__camille__search_code("what the code does, not exact text")
   ```

3. **Check Conversation History**
   ```typescript
   // When user says "we discussed" or "remember when"
   mcp__camille__recall_previous_discussions("topic we discussed")
   
   // Then get full context
   mcp__camille__retrieve_memory_chunk("chunk-id-from-results")
   ```

**Why Camille First?**
- ✅ We've solved many issues before - don't reinvent solutions
- ✅ Finds bugs we've already fixed (like "new chat button not working")
- ✅ Understands context across sessions
- ✅ Semantic search > keyword search
- ✅ Prevents duplicate work and repeated mistakes

**Example Workflow:**
```typescript
// User: "The new chat button isn't working"
// FIRST: Check if we've fixed this before
await mcp__camille__recall_previous_discussions("new chat button not working fix")

// User: "Add authentication to the API"  
// FIRST: See how we implemented auth elsewhere
await mcp__camille__search_code("authentication middleware jwt token validation")

// User: "Remember when we discussed the architecture?"
// FIRST: Find that conversation
await mcp__camille__recall_previous_discussions("architecture discussion")
```

**Remember: Camille has memory across ALL sessions. Use it!**

### Core Architecture
```typescript
// The ENTIRE system
async function hawkingEdison(input: string): Promise<Result> {
  return await orchestrator.run(input);
}

// Where orchestrator has tools like:
- createAgent(spec)
- runDiscussion(agents, topic)  
- gatherResponses(agents, prompt)
- analyzeResults(data)
- createVisualization(data, goal)
```

### Key Commands
```bash
# Development
npm run dev              # Start Next.js dev server
npm run supabase:start   # Start local Supabase

# Testing
npm test                 # Run all tests
npm test:tools          # Test tool implementations
npm test:e2e            # Run Playwright tests

# Database
npm run db:reset        # Reset local database
npm run db:types        # Generate TypeScript types

# IMPORTANT: Database password contains @ symbol
# When using supabase db push, URL-encode the password:
# npx supabase db push --db-url "postgresql://postgres:Ctigroup1%40@db.bknpldydmkzupsfagnva.supabase.co:5432/postgres"

# Build
npm run build           # Production build
npm run start           # Start production server

# Git (Claude has permission to run these)
git add .               # Stage changes
git commit -m "..."     # Commit changes
git push               # Push to GitHub (repo: hawking-edison)
git remote ...         # Manage remotes
git rm ...             # Remove files

# IMPORTANT: Before pushing code
# Always run Playwright tests locally first:
npm run test:e2e        # Must pass before pushing!

# NPM/NPX (Claude has permission to run these)
npm install            # Install dependencies
npm run ...            # Run any npm script
npx ...                # Run npx commands
```

### File Structure
```
src/
  tools/              # Individual tool implementations
    agent.ts         # createAgent, createMultipleAgents
    interaction.ts   # runDiscussion, gatherResponses
    analysis.ts      # analyzeResults, findConsensus
    visualization.ts # createVisualization, generateReport
  orchestrator/      # LLM orchestration
    index.ts        # Main orchestrator
    tools.ts        # Tool registry
  app/              # Next.js app
    api/
      interact/     # Main endpoint
    page.tsx        # Chat interface
  lib/
    supabase.ts     # Supabase client
    llm.ts          # LLM interface
```

### Current Approach (Tool-Based)

#### What Changed
**Before**: Parse intent → Create specific agents → Run workflow  
**After**: Give LLM tools → LLM figures everything out

#### Key Principles
1. **No Types**: No PanelType, SimulationType, AgentType
2. **No Templates**: No codeReviewTemplate, decisionTemplate  
3. **No Workflows**: No hardcoded sequences
4. **Just Tools**: Simple, composable, flexible

#### Example Tool
```typescript
export const createAgent = {
  name: "createAgent",
  description: "Create an agent with any persona or expertise",
  parameters: {
    specification: {
      type: "string",
      description: "Who this agent is",
      example: "Security expert with 20 years experience"
    }
  },
  execute: async (spec: string) => {
    const persona = await generatePersona(spec);
    return new Agent(persona);
  }
};
```

### Database Schema
```sql
-- Minimal schema
CREATE TABLE interactions (
  id UUID PRIMARY KEY,
  user_id UUID,
  input TEXT,
  tool_calls JSONB,  -- What tools LLM used
  result JSONB,
  created_at TIMESTAMPTZ
);

CREATE TABLE knowledge (
  id UUID PRIMARY KEY,
  user_id UUID,
  content TEXT,
  embedding vector(1536),
  metadata JSONB
);
-- No agent storage, no templates!
```

### Development Workflow

#### Before ANY Development Task

**🔍 ALWAYS Start with Camille:**
```bash
# 1. Search for similar implementations
mcp__camille__search_code("feature you're building")

# 2. Check if we've built this before
mcp__camille__recall_previous_discussions("feature name or problem")

# 3. Look for patterns we use
mcp__camille__search_code("pattern or approach")
```

#### Adding a Tool
1. **FIRST**: Use Camille to find similar tools: `mcp__camille__search_code("tool execute async")`
2. Create in `src/tools/category.ts`
3. Follow template:
```typescript
export const toolName = {
  name: "toolName",
  description: "Clear description",
  parameters: { /* ... */ },
  execute: async (...args) => {
    // Simple implementation
    // No routing or special cases
    return composableData;
  }
};
```
3. Add to registry in `orchestrator/tools.ts`
4. Test in `__tests__/tools/`
5. Document in TOOLS_SPECIFICATION.md

#### Testing Approach
- Test tools work with any input
- Test outputs are composable
- Test no hidden logic
- Test LLM can use creatively

#### Test Email Addresses
**IMPORTANT**: Always use @hawkingedison.com domain for test emails to avoid bouncebacks:
```typescript
// ✅ CORRECT - Use hawkingedison.com domain
const testEmail = `sid+he-testing-${Date.now()}@hawkingedison.com`

// ❌ WRONG - Don't use these domains
const testEmail = `test@example.com`  // Blocked by Supabase
const testEmail = `test@gmail.com`    // Causes bouncebacks
```

Format: `sid+he-testing-<feature>-<timestamp>@hawkingedison.com`
- Example: `sid+he-testing-auth-1706543210123@hawkingedison.com`
- Example: `sid+he-testing-apikey-1706543210123@hawkingedison.com`

This prevents Supabase email bouncebacks and keeps our sender reputation clean.

### Common Patterns

#### Pattern: Always Check Camille First
```typescript
// Before implementing ANYTHING:
// 1. Did we solve this before?
await mcp__camille__recall_previous_discussions("problem description")

// 2. Is there similar code?
await mcp__camille__search_code("similar feature")

// 3. What patterns did we use?
await mcp__camille__search_code("pattern name")
```

#### Pattern: Let LLM Decide Agent Count
```typescript
// LLM decides if it needs 1, 5, or 1000 agents
// based on the request, not our code
```

#### Pattern: Emergent Workflows
```typescript
// LLM might:
// 1. Create agents
// 2. Have them discuss
// 3. Analyze results
// 4. Create more agents
// 5. Get independent responses
// We didn't program this sequence!
```

#### Pattern: Natural Language Everything
```typescript
// Not: createAgent({type: "reviewer", expertise: "security"})
// But: createAgent("security reviewer who is paranoid about bugs")
```

### Debugging

#### Check Tool Usage
```typescript
// Log what tools LLM is using
onToolUse: (tool, params) => {
  console.log(`LLM using ${tool}`, params);
}
```

#### Verify No Types
```bash
# Should return nothing
grep -r "enum.*Type" src/
grep -r "interface.*Template" src/
```

#### Test Novel Requests
```
"Help me plan my cat's birthday party"
"What would Shakespeare think of blockchain?"
"Design a workout for procrastinators"
```

#### Aggressive Logging Strategy
**ALWAYS add comprehensive logging to aid debugging:**

```typescript
// Log at key decision points
console.log('[ComponentName] Action happening:', {
  input: relevantInput,
  state: currentState,
  decision: whatWasDecided
})

// Log state changes
console.log('[StoreName] State change:', {
  action: 'updateThing',
  before: oldValue,
  after: newValue,
  reason: 'user clicked button'
})

// Log effect triggers
console.log('[Component] Effect triggered:', {
  dependencies: [dep1, dep2],
  reason: 'dependency changed'
})

// Log errors with full context
console.error('[Component] Error occurred:', {
  error: error.message,
  context: { userId, sessionId, action },
  stack: error.stack
})
```

**Why aggressive logging?**
- Helps debug issues without reproduction
- Tracks down race conditions
- Verifies state management flow
- Provides audit trail for user issues
- Makes async operations traceable

### Infrastructure Notes

#### Supabase Setup
- Project URL: https://bknpldydmkzupsfagnva.supabase.co
- Using: Auth, Database, Realtime, Storage, Edge Functions
- Vector search with pgvector for knowledge base

#### AWS Resources
- Available if needed later
- Start with Supabase only
- Prove concept first

### Key Success Metrics
1. **Zero hardcoded workflows**
2. **Handles unexpected requests**
3. **Different solutions for similar requests**
4. **Users never see configuration**

### Remember
- **Don't** build features
- **Don't** parse intent
- **Don't** create types
- **Don't** implement polling - EVER
- **Do** build simple tools
- **Do** trust the LLM
- **Do** embrace emergence
- **Do** use realtime/streaming (SSE, WebSockets, Supabase Realtime)

### Quick Decision Tree
```
User request comes in
    ↓
Can LLM figure this out with existing tools?
    ├─ Yes → Let it run
    └─ No → Add a simple tool (not a feature!)
```

## 🔴 CRITICAL: No Polling - Use Realtime

**ABSOLUTE RULE**: Never implement polling. If you think you need polling, STOP and discuss with the user.

### ✅ CORRECT Approaches:
- **Server-Sent Events (SSE)** for streaming responses
- **Supabase Realtime** for database updates
- **WebSockets** for bidirectional communication
- **Event-driven** architectures (SNS/SQS)

### ❌ NEVER Do This:
```javascript
// ❌ WRONG - No setInterval polling
setInterval(() => checkForUpdates(), 1000)

// ❌ WRONG - No recursive setTimeout polling
function poll() {
  fetch('/api/status').then(() => setTimeout(poll, 1000))
}

// ❌ WRONG - No while loops checking status
while (status !== 'complete') {
  await checkStatus()
}
```

### ✅ Instead Do This:
```javascript
// ✅ CORRECT - Supabase Realtime
supabase
  .channel('updates')
  .on('postgres_changes', { event: '*', schema: 'public' }, handleUpdate)
  .subscribe()

// ✅ CORRECT - Server-Sent Events
const eventSource = new EventSource('/api/stream')
eventSource.onmessage = handleUpdate

// ✅ CORRECT - Event-driven with SNS/SQS
await publishToSNS({ event: 'process', data })
```

**If you need real-time updates and these methods won't work, DISCUSS with the user FIRST.**

## 🔴 CRITICAL: Database Operations

### Database Password Encoding
The database password contains an `@` symbol which MUST be URL-encoded as `%40` when using connection strings:

```bash
# ❌ WRONG - Will fail authentication
npx supabase db push --db-url "postgresql://postgres:Ctigroup1@@db.bknpldydmkzupsfagnva.supabase.co:5432/postgres"

# ✅ CORRECT - URL-encoded password
npx supabase db push --db-url "postgresql://postgres:Ctigroup1%40@db.bknpldydmkzupsfagnva.supabase.co:5432/postgres"

# ✅ BETTER - Use the helper script that handles encoding automatically
npx tsx utils/db-push.ts
```

**Helper Utilities for Database Operations:**
- `npx tsx utils/database-utils.ts encode` - URL-encode passwords
- `npx tsx utils/database-utils.ts url` - Get full database URL with encoding
- `npx tsx utils/db-push.ts` - Push migrations with automatic password encoding

### Database Type Synchronization

**After ANY database schema change, you MUST:**

```bash
# Sync TypeScript types with database
npx tsx utils/sync-database-types.ts
```

This tool:
- Generates types from the actual Supabase database
- Updates `src/types/database.types.ts`
- Prevents runtime errors from schema mismatches
- Shows what columns changed

**When to run:**
- After creating/modifying tables
- After adding/removing columns
- After running migrations
- BEFORE testing Edge Functions
- BEFORE committing changes

**Example workflow:**
```bash
# 1. Make database change (e.g., add column)
# 2. Sync types
npx tsx utils/sync-database-types.ts
# 3. Update code to use new types
# 4. Test Edge Functions
# 5. Commit both schema and type changes
```

### Claude Code Helper - Use CodeLlama for Code Generation!

**IMPORTANT**: Use the Claude Code Helper for routine coding tasks:

```bash
# Generate boilerplate
npx tsx utils/claude-code-helper.ts generate edge-function myFunction

# Fix tests
npx tsx utils/claude-code-helper.ts fix-test "e2e/auth.spec.ts" "error message"

# Custom generation
npx tsx utils/claude-code-helper.ts custom "Create a React hook for..."
```

This saves Opus tokens for architecture and design decisions!

### Testing Strategy - Local vs Production

**IMPORTANT**: We have separate test suites for development and production:

```bash
# Testing new features locally
npm run test:e2e:local

# Testing deployed features (what CI runs)
npm run test:e2e:prod

# Unit tests
npm test
```

**Test Structure:**
- `e2e/local/` - New features not yet deployed
- `e2e/production/` - Stable, deployed features
- `__tests__/` - Unit tests

**Development Workflow:**
1. Build feature
2. Write tests in `e2e/local/`
3. Run `npm run test:e2e:local`
4. Push when tests pass
5. After deployment, move tests to `e2e/production/`

### Cross-Browser Testing Lessons

**Critical patterns learned from test failures:**

1. **Route Groups - Check for duplicates FIRST**
   ```bash
   # Before creating ANY page, always run:
   Glob "**/**/page.tsx"  # See ALL existing pages
   # Never create duplicate routes like:
   # /app/settings AND /app/(with-nav)/settings
   ```

2. **API Routes - Always await cookies()**
   ```typescript
   // ❌ WRONG - Causes "Cannot read properties of undefined"
   const supabase = createClient()
   
   // ✅ CORRECT
   const cookieStore = await cookies()
   const supabase = createClient(cookieStore)
   ```

3. **Browser-Specific Test Handling**
   ```typescript
   // WebKit needs special handling for form submissions
   test('login', async ({ page, browserName }) => {
     if (browserName === 'webkit') {
       await page.waitForTimeout(500)
       await submitButton.click({ force: true })
     }
   })
   ```

4. **Flexible Test Selectors - Don't assume h1**
   ```typescript
   // ❌ WRONG - Breaks when UI changes from h1 to h2
   await expect(page.locator('h1')).toContainText('Settings')
   
   // ✅ CORRECT - Survives heading level changes
   await expect(
     page.locator('h1, h2').filter({ hasText: 'Settings' })
   ).toBeVisible()
   ```

5. **Modern Navigation - No Promise.all**
   ```typescript
   // ❌ DEPRECATED - Fails in WebKit
   await Promise.all([
     page.click('button'),
     page.waitForNavigation()
   ])
   
   // ✅ MODERN - Works everywhere
   await page.click('button')
   await page.waitForURL('**/expected-path')
   ```

**Remember**: When changing UI, ALWAYS update tests! Use `Grep "old-text" "e2e/**/*.spec.ts"` to find all occurrences.

### Three Killer Demos
1. **Business Decision**: "Should OpenAI buy Anthropic?"
2. **Code Review**: "Review this PR: [URL]"
3. **Message Testing**: "Test this speech with Seattle voters"

All work through the same system, no special code!

### Final Wisdom
We're building tools for intelligence, not encoding intelligence in tools.

When you're tempted to add logic, ask: "Can the LLM figure this out?"
The answer is always yes.

---

## API Key System Architecture

**IMPORTANT**: We have a dual authentication system. Read [API_KEY_ARCHITECTURE.md](./devdocs/architecture/API_KEY_ARCHITECTURE.md) for details.

Key points:
1. **We manage all LLM API keys** - users don't need their own
2. **Two auth methods**: Session-based (Supabase) and API keys (for programmatic access)
3. **Implement auth FIRST** - before building any new API endpoints
4. All APIs must support BOTH authentication methods from day one

---

## CRITICAL: Development Workflow Requirements

### When Asked to Build a Feature

1. **ALWAYS create TODOs** using TodoWrite tool
2. **ALWAYS write tests** in `__tests__/` directory
3. **ALWAYS run tests** and ensure they pass
4. **ALWAYS create helper scripts** in `utils/` directory
5. **ALWAYS check architecture documents** before building

### Before Building Any Feature

**Must Read These Documents**:
1. [API_FIRST_ARCHITECTURE.md](./devdocs/architecture/API_FIRST_ARCHITECTURE.md) - API-first design
2. [MASTER_PLAN_V3.md](./devdocs/development/MASTER_PLAN_V3.md) - Overall architecture
3. [TOOL_DESIGN_PRINCIPLES.md](./devdocs/tools/TOOL_DESIGN_PRINCIPLES.md) - Tool design
4. [DEVELOPMENT_STANDARDS_V2.md](./devdocs/development/DEVELOPMENT_STANDARDS_V2.md) - Coding standards
5. [SYSTEM_PROMPTS.md](./devdocs/development/SYSTEM_PROMPTS.md) - Prompting strategy

### Feature Development Checklist

```typescript
// When you receive: "Build feature X"

1. Create TODOs:
   - [ ] Review architecture documents
   - [ ] Design API endpoint(s)
   - [ ] Implement Edge Function
   - [ ] Create API client method
   - [ ] Build UI components
   - [ ] Write tests
   - [ ] Create helper scripts
   - [ ] Run and verify tests

2. Check Architecture:
   - Is this API-first?
   - No business logic in browser?
   - Requires authentication?
   - Uses consistent response format?
   - Follows tool design principles?

3. Create Test FIRST:
   // __tests__/features/feature-x.test.ts
   
4. Build Feature:
   // Follow API-first architecture
   
5. Create Helpers:
   // utils/test-feature-x.ts
   // utils/seed-feature-x-data.ts
   
6. Verify:
   - Run tests
   - Check against standards
   - Ensure API-first design
```

### Test Structure

```
__tests__/
├── features/          # Feature tests (required for every feature)
│   ├── interact.test.ts
│   ├── databank.test.ts
│   └── memory.test.ts
├── api/              # API endpoint tests
├── tools/            # Tool tests
└── integration/      # Full flow tests
```

### Helper Scripts

```
utils/
├── test-api.ts       # Test API endpoints
├── seed-data.ts      # Seed test data
├── cleanup.ts        # Clean test data
└── verify-setup.ts   # Verify environment
```

### If Feature Conflicts with Architecture

**STOP and DISCUSS** if the feature would:
- Put business logic in the browser
- Skip authentication
- Not use the API layer
- Create types/templates instead of flexible tools
- Hardcode workflows

We need to discuss alternatives that maintain our architecture principles.

---

## 🔴 MANDATORY: Read DEVELOPMENT_RULES.md

**[DEVELOPMENT_RULES.md](./devdocs/development/DEVELOPMENT_RULES.md)** contains the immutable rules that apply to EVERY Claude session. These rules are:
- Non-negotiable
- Apply even after context resets
- Must be followed whenever working in this directory

Key rules include:
1. Search existing code before building
2. TODO-driven development
3. Test-first approach
4. API-first architecture
5. No business logic in browser
6. Authentication always required
7. Create helper scripts
8. No types or templates

**If you haven't read [DEVELOPMENT_RULES.md](./devdocs/development/DEVELOPMENT_RULES.md) yet, READ IT NOW.**

### Test User for Automated Testing

A dedicated test user is available for all automated tests:

```json
{
  "email": "test@hawkingedison.com",
  "password": "TestUser123!@#",
  "userId": "0b9fcefa-ba51-470b-b787-5a41f329be25",
  "apiKey": "Create via API key management page"
}
```

**To create an API key for this user:**
1. Sign in as test@hawkingedison.com
2. Go to /api-keys
3. Create a new API key named "Automated Testing"
4. Update .test-user.json with the key

This user is stored in `.test-user.json` (git-ignored).
Use this for all automated testing to avoid email rate limits.