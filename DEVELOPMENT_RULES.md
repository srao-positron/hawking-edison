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

## Rule 3: Search Before You Build

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

## Rule 4: API-First, No Exceptions

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

## Rule 5: Test-First Development

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

## Rule 6: Helper Scripts Required

For every feature, create helpers in `utils/`:

```typescript
// utils/test-feature.ts - Manual testing
// utils/seed-feature-data.ts - Test data
// utils/cleanup-feature.ts - Cleanup
```

---

## Rule 7: No Types, No Templates

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

## Rule 8: Authentication Always

```typescript
// Every API endpoint MUST:
const user = await requireAuth(request);
if (!user) return 401;

// No public endpoints (except auth itself)
```

---

## Rule 9: Consistent API Responses

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

## Rule 10: Document Tool Usage

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