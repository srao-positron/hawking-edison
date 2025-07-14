# Hawking Edison v2: Immutable Development Rules
## These Rules Apply to EVERY Claude Session

### 🔴 CRITICAL: These Rules Are Non-Negotiable

These rules MUST be followed in every Claude session, regardless of context length or conversation history. If you're reading this file, these rules apply to you.

---

## Rule 1: Architecture Documents Are Law

**BEFORE writing any code**, you MUST read:
1. `API_FIRST_ARCHITECTURE.md` - Everything is an API
2. `MASTER_PLAN_V3.md` - System architecture
3. `TOOL_DESIGN_PRINCIPLES.md` - How to design tools
4. `DEVELOPMENT_STANDARDS_V2.md` - Code standards
5. `SYSTEM_PROMPTS.md` - Prompting strategy
6. `API_KEY_ARCHITECTURE.md` - Dual authentication system

**If a feature conflicts with these documents, STOP and DISCUSS.**

---

## Rule 2: TODO-Driven Development

When asked to build a feature, ALWAYS:

```typescript
// 1. Create TODOs immediately
TodoWrite([
  "Review existing codebase for similar features",
  "Check architecture documents", 
  "Design API endpoint",
  "Write test first",
  "Implement Edge Function",
  "Create browser API client",
  "Build UI (no logic)",
  "Create helper scripts",
  "Run tests and verify"
]);
```

---

## Rule 3: No Polling - Use Realtime Only

**ABSOLUTE RULE**: Never implement polling mechanisms.

### ❌ FORBIDDEN:
- `setInterval()` for checking updates
- `setTimeout()` recursion for status checks
- While loops waiting for completion
- Any form of periodic HTTP requests

### ✅ REQUIRED:
- Server-Sent Events (SSE) for streaming
- Supabase Realtime for database updates
- WebSockets for bidirectional communication
- Event-driven architectures (SNS/SQS)

**If you think you need polling, STOP and DISCUSS with the user.**

---

## Rule 4: Search Before You Build

**ALWAYS search the existing codebase first:**

```bash
# Use these tools BEFORE writing new code:
- Grep: Search for similar functionality
- Glob: Find related files
- Read: Examine existing implementations

# Ask yourself:
- "Does this feature already exist?"
- "Can I extend existing code?"
- "Is there a pattern I should follow?"
```

**DO NOT create duplicate functionality.**

---

## Rule 5: API-First, No Exceptions

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

**Every feature = Edge Function + API endpoint + Simple UI**

---

## Rule 6: Test-First Development

```typescript
// Write test BEFORE implementation
// __tests__/features/new-feature.test.ts

describe('New Feature', () => {
  it('should work via API', async () => {
    const result = await api.newFeature(input);
    expect(result.success).toBe(true);
  });
});

// Only AFTER test is written, implement feature
```

---

## Rule 7: Helper Scripts Required

For every feature, create helpers in `utils/`:

```typescript
// utils/test-feature.ts - Manual testing
// utils/seed-feature-data.ts - Test data
// utils/cleanup-feature.ts - Cleanup
```

---

## Rule 8: No Types, No Templates

```typescript
// ❌ NEVER create:
enum PanelType { }
interface SimulationTemplate { }
class SpecificAgentType { }

// ✅ ALWAYS create:
function createAgent(specification: string) // Flexible
function runInteraction(agents, instructions) // Natural language
```

---

## Rule 9: Authentication Always

```typescript
// Every API endpoint MUST support BOTH:
// 1. Session-based auth (Supabase)
// 2. API key auth (for programmatic access)

const user = await authenticate(request); // Handles both methods
if (!user) return 401;

// See API_KEY_ARCHITECTURE.md for implementation details
// No public endpoints (except auth itself)
```

---

## Rule 10: Consistent API Responses

```typescript
// ALWAYS return:
{
  success: boolean,
  data?: any,
  error?: {
    code: string,
    message: string
  }
}
```

---

## Rule 11: Document Tool Usage

When creating/modifying tools:
1. Rich parameter documentation
2. Multiple examples
3. Clear descriptions
4. No hidden behavior

---

## Workflow Checklist

### When You Receive: "Build feature X"

- [ ] 1. **Search existing code** (Grep, Glob, Read)
- [ ] 2. **Read architecture docs**
- [ ] 3. **Create TODOs** (TodoWrite)
- [ ] 4. **Find similar code** to extend
- [ ] 5. **Write test first**
- [ ] 6. **Design API endpoint**
- [ ] 7. **Implement Edge Function**
- [ ] 8. **Create browser API client**
- [ ] 9. **Build simple UI**
- [ ] 10. **Create helper scripts**
- [ ] 11. **Run tests**
- [ ] 12. **Verify architecture compliance**

---

## Red Flags That Require Discussion

**STOP and ask user if you're about to:**
- Put logic in the browser
- Create a type or template
- Skip authentication
- Build without searching existing code
- Implement without writing test first
- Create duplicate functionality
- Deviate from API-first architecture

---

## Session Persistence Note

**These rules apply even if:**
- This is a new conversation
- Context was reset
- You can't see previous messages
- User doesn't mention the rules

**The rules are in effect as long as you're in the `/hawking-edison` directory.**

---

## Quick Reference Card

```
Before coding:
1. Search existing code ✓
2. Read architecture ✓
3. Create TODOs ✓
4. Write test ✓

While coding:
- API first ✓
- No browser logic ✓
- Auth required ✓
- No types/templates ✓

After coding:
- Run tests ✓
- Create helpers ✓
- Verify standards ✓
```

**Remember: These aren't suggestions. They're requirements.**

---

## Rule 12: Delete Old Code - No Dead Code

**ALWAYS delete old, unused code when replacing features:**

```bash
# When replacing a feature:
1. Build the new feature
2. Verify it works with tests
3. DELETE all old code immediately
4. Push the clean version

# Examples:
- Old UI replaced? Delete ALL old components
- New API? Delete deprecated endpoints
- Changed architecture? Remove obsolete patterns
- New auth system? Delete old auth code
```

**NEVER keep "just in case" code:**
- Git history exists for a reason
- Dead code confuses developers
- Commented-out code is forbidden
- Multiple versions of same feature forbidden

**Before pushing, ask yourself:**
- "Is there any dead code?"
- "Did I delete the old implementation?"
- "Are there unused files?"

---

## Rule 13: Aggressive Logging for Debugging

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

// Log API calls
console.log('[API] Calling endpoint:', {
  method: 'POST',
  url: '/api/endpoint',
  payload: data
})

// Log errors with context
console.error('[Component] Error occurred:', {
  error: error.message,
  context: { userId, sessionId, action },
  stack: error.stack
})
```

**Logging Guidelines:**
- Use consistent prefixes: `[ComponentName]` or `[StoreName]`
- Log objects, not just strings - include relevant state
- Log BEFORE and AFTER state changes
- Log all branching decisions (if/else outcomes)
- Log all effect triggers with their dependencies
- Include timestamps for async operations
- Keep logs in production - they help diagnose user issues

**Good logging helps us:**
- Debug issues without reproducing them
- Understand user behavior patterns
- Track down race conditions
- Verify state management is working correctly

---

## Rule 14: No Pushing with Failing Tests

**NEVER push code with failing tests:**

```bash
# Before EVERY push:
npm run test:e2e  # Must pass
npm run test      # Must pass
npm run lint      # Must pass
npm run typecheck # Must pass

# If tests fail:
1. Fix the issue
2. Run tests again
3. Only push when GREEN
```

**This is why we have pre-push hooks. Respect them.**

---

## Rule 14: Test Email Addresses

**ALWAYS use @hawkingedison.com domain for test emails:**

```typescript
// ✅ CORRECT
const testEmail = `sid+he-testing-${Date.now()}@hawkingedison.com`
const testEmail = `sid+he-testing-auth-${timestamp}@hawkingedison.com`

// ❌ WRONG - These cause bouncebacks
const testEmail = `test@example.com`  // Blocked by Supabase
const testEmail = `test@gmail.com`    // Causes bouncebacks
```

**Format**: `sid+he-testing-<feature>-<timestamp>@hawkingedison.com`

This prevents email bouncebacks and maintains our sender reputation.

---

## Rule 15: Update Tests When UI Changes

**ALWAYS update tests when changing the user interface:**

```bash
# When you change UI components:
1. Update Playwright tests in e2e/
2. Update component tests if they exist
3. Run tests locally BEFORE pushing
4. Ensure all selectors match new UI

# Example workflow:
- Change button text from "Submit" to "Send"
- Update: e2e/auth.spec.ts to look for "Send"
- Run: npm run test:e2e
- Verify: All tests pass
```

**This includes:**
- Button text changes
- Form field names/placeholders
- Navigation changes
- Element IDs/classes used in tests
- Page routes
- Error messages

**Never push UI changes without updating tests!**

---

## Rule 16: Use Claude Code Helper for Code Generation

**ALWAYS use the Claude Code Helper tool with CodeLlama for routine code tasks:**

```bash
# Check if CodeLlama is available
npx tsx utils/claude-code-helper.ts check

# Generate boilerplate code
npx tsx utils/claude-code-helper.ts generate edge-function myFunction
npx tsx utils/claude-code-helper.ts generate react-component MyComponent
npx tsx utils/claude-code-helper.ts generate test my-feature
npx tsx utils/claude-code-helper.ts generate api-endpoint createUser

# Fix failing tests
npx tsx utils/claude-code-helper.ts fix-test "e2e/auth.spec.ts" "TimeoutError"

# Custom code generation
npx tsx utils/claude-code-helper.ts custom "Create a debounce hook"
```

**When to use Claude Code Helper:**
- Generating boilerplate code
- Creating new components/functions
- Fixing test failures
- Writing repetitive code
- Implementing standard patterns

**When NOT to use Claude Code Helper:**
- Architecture decisions
- Complex business logic
- Security-critical code
- Novel algorithms

**This saves Opus tokens for high-level thinking!**

---

## Rule 17: Separate Local and Production Tests

**ALWAYS use the appropriate test suite for your context:**

```bash
# For testing NEW features during development
npm run test:e2e:local

# For testing DEPLOYED features (CI/CD)
npm run test:e2e:prod

# For running unit tests
npm test

# For interactive debugging
npm run test:e2e:ui
```

**Test Organization:**
- `e2e/local/` - Tests for features in development
- `e2e/production/` - Tests for stable, deployed features
- `__tests__/` - Unit tests

**When developing:**
1. Write tests in `e2e/local/` for new features
2. Run `npm run test:e2e:local` before pushing
3. Move tests to `e2e/production/` after deployment
4. CI runs `npm run test:e2e:prod` against deployed app

**Never mix local and production tests!**

---

## Rule 18: Route Groups - Never Duplicate Pages

**ALWAYS check for existing routes before creating new pages:**

```bash
# Before creating ANY new page:
1. Run: Glob "**/**/page.tsx" to see all existing pages
2. Check if the route already exists in ANY route group
3. Never create duplicate pages in different route groups

# Example structure:
/app
  /(with-nav)      # Pages WITH navigation
    /settings      # ✅ Settings here
    /dashboard     # ✅ Dashboard here
  /(auth)          # Pages WITHOUT navigation  
    /login         # ✅ Auth pages here
    /signup        # ✅ Auth pages here
  /api             # API routes only

# ❌ NEVER:
/app/settings AND /app/(with-nav)/settings
/app/login AND /app/(auth)/login
```

**If you need to reorganize routes:**
1. Move the page.tsx file
2. Delete the old directory
3. Update ALL links and tests
4. Run tests to verify

---

## Rule 19: Cookie Handling in API Routes

**ALWAYS await cookies() in Next.js API routes:**

```typescript
// ❌ WRONG - Will cause runtime errors
import { cookies } from 'next/headers'
export async function GET() {
  const cookieStore = cookies()  // Missing await!
  const supabase = createClient(cookieStore)
}

// ✅ CORRECT
import { cookies } from 'next/headers'
export async function GET() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
}
```

**This applies to ALL Next.js server functions:**
- `cookies()` - Must await
- `headers()` - Must await  
- Built-in async functions that access request context

---

## Rule 20: Browser-Specific Test Handling

**ALWAYS handle browser differences in E2E tests:**

```typescript
// ✅ Add browser-specific handling
test('login flow', async ({ page, browserName }) => {
  // WebKit sometimes needs extra time for buttons
  if (browserName === 'webkit') {
    await page.waitForTimeout(500)
    await submitButton.click({ force: true })
  }
  
  // Firefox/WebKit need extra time after actions
  if (browserName === 'firefox' || browserName === 'webkit') {
    await page.waitForTimeout(1000)
  }
})

// ❌ NEVER use deprecated patterns:
await Promise.all([
  page.click('button'),
  page.waitForNavigation()
])

// ✅ ALWAYS use modern patterns:
await page.click('button')
await page.waitForURL('**/expected-path')
```

**Browser-specific issues to watch for:**
- WebKit: Form submissions may need force click
- Firefox/WebKit: Auth redirects need delays
- All browsers: Navigation can be interrupted
- Mobile viewports: Different UI behavior

---

## Rule 21: Flexible Test Selectors

**ALWAYS use flexible selectors that survive UI changes:**

```typescript
// ❌ WRONG - Too brittle
await expect(page.locator('h1')).toContainText('Settings')
await page.click('button.primary-btn')

// ✅ CORRECT - Survives UI updates
await expect(
  page.getByRole('heading', { name: 'Settings' })
).toBeVisible()

// ✅ BETTER - Multiple fallbacks
await expect(
  page.locator('h1, h2').filter({ hasText: 'Settings' })
).toBeVisible()

// ✅ Robust form selectors
await page.locator('input[type="email"], input[placeholder*="email" i]').fill(email)
await page.locator('button[type="submit"], button:has-text("Sign in")').click()
```

**Selector priority:**
1. Semantic roles (heading, button, link)
2. Accessible labels (aria-label, name)
3. Test IDs (data-testid) for complex cases
4. Multiple fallback selectors
5. Text content as last resort

---

## Rule 22: Test Maintenance Checklist

**ALWAYS follow this checklist when changing UI:**

```bash
# UI Change Checklist:
1. Search for element in tests: 
   Grep "old-text" "e2e/**/*.spec.ts"
   
2. Update ALL occurrences

3. Check for:
   - Heading levels (h1 vs h2 vs h3)
   - Button text changes
   - Link hrefs and navigation
   - Form labels and placeholders
   - Error message text
   - Page titles
   - CSS classes used in tests
   
# Common pitfall areas:
- Navigation components (sidebar, header)
- Form submissions
- Error states
- Loading indicators (.animate-bounce, etc)
- Mobile vs desktop views

# After changes:
npm run test:e2e:local -- --project=chromium  # Fast check
npm run test:e2e:local                        # Full cross-browser
```

---

## Rule 23: Project Structure Validation

**ALWAYS verify project structure consistency:**

```bash
# Before adding new directories/files:
1. Check for route groups: ls -la src/app/
2. Verify no duplicates: Glob "**/[feature]/**"
3. Maintain consistency:
   - Auth pages → /(auth) route group
   - App pages → /(with-nav) route group
   - API routes → /api only
   - Shared components → /components
   - Edge Functions → supabase/functions

# Common mistakes to avoid:
- Creating pages outside route groups
- Mixing API routes with pages
- Duplicate implementations
- Inconsistent file naming
```

---

## Rule 24: Login Helpers Must Be Robust

**ALWAYS use the robust login helper pattern in tests:**

```typescript
// ✅ CORRECT - Handles all browsers
async function loginAsTestUser(page: Page) {
  // Navigate with retry logic
  let retries = 3;
  while (retries > 0) {
    try {
      await page.goto('/auth/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
      break;
    } catch (error) {
      retries--;
      if (retries === 0) throw error;
      await page.waitForTimeout(1000);
    }
  }
  
  // Wait for any redirects to settle
  await page.waitForLoadState('networkidle');
  
  // Flexible heading detection
  const headingLocator = page.locator('h1, h2').filter({ hasText: /Welcome back/i });
  
  try {
    await expect(headingLocator.first()).toBeVisible({ timeout: 20000 });
  } catch (error) {
    // Check if already logged in
    if (page.url().includes('/chat')) {
      return;
    }
    throw error;
  }
  
  // Robust form filling
  await page.locator('input[type="email"], input[placeholder*="email" i]').fill(TEST_USER.email);
  await page.locator('input[type="password"]').fill(TEST_USER.password);
  
  // Browser-specific submit
  const submitButton = page.locator('button[type="submit"], button:has-text("Sign in")');
  const browserName = page.context().browser()?.browserType().name();
  if (browserName === 'webkit') {
    await page.waitForTimeout(500);
    await submitButton.click({ force: true });
  } else {
    await submitButton.click();
  }
  
  // Modern navigation wait
  await page.waitForURL('**/chat', { timeout: 20000 });
  await page.waitForLoadState('networkidle');
}
```

**Never use simplified login that breaks in some browsers!**

---

## Rule 25: Work Isn't Done Until CI Passes

**MANDATORY**: A feature or fix is NOT complete until:

```bash
# Local verification (BEFORE pushing):
1. npm run build          # Must pass
2. npm run test          # Must pass
3. npm run test:e2e      # Must pass
4. npm run lint          # Must pass
5. npm run typecheck     # Must pass

# After pushing:
6. Monitor GitHub Actions workflows
7. ALL workflows must be GREEN:
   - Deploy Frontend (Vercel deployment)
   - Deploy Lambda (AWS deployment)
   - Run Tests (Playwright tests)
8. Verify deployment succeeded in production
```

**DO NOT:**
- Claim a task is complete without CI passing
- Move to next feature with failing CI
- Disable tests to make them pass
- Ignore build warnings
- Push "hoping it will work" in CI

**ALWAYS:**
- Run full local verification before pushing
- Watch GitHub Actions after pushing
- Fix CI failures IMMEDIATELY
- Test the deployed feature in production

**If CI fails:**
1. Check the specific failure
2. Fix locally
3. Verify fix with local tests
4. Push fix
5. Monitor CI again
6. Repeat until GREEN

**Remember: "It works on my machine" doesn't count!**

---

## Rule 26: Database Type Synchronization MANDATORY

**ALWAYS sync TypeScript types after ANY database schema change:**

```bash
# After ANY database change (migrations, manual edits, column changes):
npx tsx utils/sync-database-types.ts

# This command:
1. Generates types from actual database schema
2. Updates src/types/database.types.ts
3. Checks for TypeScript errors
4. Shows what changed

# When to run:
- After creating new tables
- After adding/removing columns
- After changing column types
- After running migrations
- BEFORE committing schema changes
```

**Use generated types in your code:**
```typescript
// ❌ WRONG - Manual interface
interface ApiKey {
  id: string
  last_used_at: string  // Wrong column name!
}

// ✅ CORRECT - Use generated types
import { Database } from '@/types/database.types'
type ApiKey = Database['public']['Tables']['api_keys']['Row']
```

**This prevents:**
- Runtime errors from mismatched column names
- Type errors from wrong data types
- Failed deployments from schema mismatches
- Hours of debugging Edge Function failures

**CRITICAL: If you change the database schema without syncing types, Edge Functions WILL fail in production!**

---

## Rule 27: AWS Infrastructure Deployment - Use deploy.sh ONLY

**MANDATORY**: When deploying AWS infrastructure (CDK), you MUST use the deployment script:

```bash
# ✅ CORRECT - Uses deployment script
cd infrastructure/cdk
./deploy.sh

# ❌ WRONG - Never use these directly
npx cdk deploy        # Missing environment variables!
npm run deploy        # Missing environment variables!
cdk deploy           # Missing environment variables!
```

**The deployment script (`infrastructure/cdk/deploy.sh`):**
- Loads environment variables from `.env.local`
- Maps them to expected CDK environment variable names
- Ensures Lambda functions receive all required secrets:
  - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
  - `ANTHROPIC_API_KEY` and `OPENAI_API_KEY`
  - `VAULT_STORE_SERVICE_KEY`
  - All other API credentials
- Validates required variables before deployment
- Prevents Lambda functions from failing due to missing secrets

**Without using deploy.sh:**
- Lambda functions will be missing critical environment variables
- Orchestration will fail with "Cannot read properties of undefined"
- API calls will fail with authentication errors
- The entire system will be non-functional

**If deployment fails:**
1. Check that `.env.local` contains all required variables
2. Ensure `deploy.sh` has execute permissions: `chmod +x deploy.sh`
3. Review the deployment logs for specific errors
4. Verify AWS credentials are configured

**Remember: A Lambda without secrets is a broken Lambda!**