# Hawking Edison v2 Development Standards & Rules

## Core Development Principles

### 1. No Shortcuts or Hacks
- **NO** fallback, fake, or mock implementations unless explicitly authorized
- **NO** workarounds without explicit approval
- **NO** "TODO: implement later" in production code
- Every feature must be fully functional before marking complete

### 2. Test-Driven Quality
- **REQUIRED**: Create an E2E test for every major feature before marking complete
- **FOCUS**: Feature-level testing over unit tests
- **COVERAGE**: Test the happy path and at least one error case
- **LOCATION**: Tests in `__tests__/features/` directory

### 3. Code Review Protocol
- **SELF-REVIEW**: Before marking any task complete:
  1. Run the feature test
  2. Use Claude to review the code for:
     - Security vulnerabilities
     - Performance issues
     - Code quality
     - Adherence to standards
  3. Fix all identified issues
  4. Document in CLAUDE.md

### 4. Documentation Requirements
- **CLAUDE.md**: Maintain a file with:
  - Common commands (lint, typecheck, test)
  - Project-specific patterns
  - Architecture decisions
  - Known issues and solutions
- **Feature Documentation**: Each feature needs:
  - Purpose and use case
  - API documentation (if applicable)
  - Example usage
  - Configuration options

## Technical Standards

### 1. Code Organization

```
/hawking-edison-v2
├── app/                    # Next.js app directory
│   ├── (auth)/            # Auth-required pages
│   ├── (marketing)/       # Public pages
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── features/         # Feature-specific components
│   └── layouts/          # Layout components
├── lib/                   # Core libraries
│   ├── supabase/         # Supabase client & types
│   ├── ai/               # AI/LLM integrations
│   ├── tools/            # Tool system
│   └── utils/            # Utilities
├── services/              # Business logic
│   ├── panels/           # Panel management
│   ├── knowledge/        # Knowledge base
│   └── simulations/      # Simulation engine
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript types
├── public/               # Static assets
└── __tests__/            # Test files
    └── features/         # Feature tests
```

### 2. TypeScript Standards

```typescript
// REQUIRED: Explicit types for all function parameters and returns
function createPanel(config: PanelConfig): Promise<Panel> {
  // Implementation
}

// REQUIRED: Use interfaces for object shapes
interface PanelConfig {
  name: string;
  type: PanelType;
  participants: ParticipantConfig[];
}

// AVOID: any type (use unknown and type guards)
// AVOID: Non-null assertions (!)
// PREFER: Optional chaining (?.) and nullish coalescing (??)
```

### 3. React/Next.js Standards

```typescript
// REQUIRED: Server Components by default
// Mark client components explicitly
'use client';

// REQUIRED: Proper error boundaries
export function ErrorBoundary({ error }: { error: Error }) {
  return <div>Error: {error.message}</div>;
}

// REQUIRED: Loading states
export function Loading() {
  return <div>Loading...</div>;
}

// PREFER: Composition over props drilling
// USE: Context for cross-cutting concerns
// AVOID: useEffect for data fetching (use server components)
```

### 4. Database Standards

```sql
-- REQUIRED: UUID primary keys
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- REQUIRED: Timestamps on all tables
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()

-- REQUIRED: RLS policies on all tables
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- REQUIRED: Indexes on foreign keys and frequently queried columns
CREATE INDEX idx_panels_user_id ON panels(user_id);
```

### 5. API Standards

```typescript
// REQUIRED: Consistent response format
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// REQUIRED: Proper HTTP status codes
// 200 - Success
// 201 - Created
// 400 - Bad Request
// 401 - Unauthorized
// 403 - Forbidden
// 404 - Not Found
// 500 - Internal Server Error

// REQUIRED: Request validation
const schema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['decision_support', 'code_review']),
});
```

### 6. Security Standards

- **NEVER** expose sensitive data in logs or responses
- **NEVER** store API keys in plain text
- **ALWAYS** validate user input
- **ALWAYS** use parameterized queries
- **ALWAYS** check permissions before operations
- **USE** Supabase RLS for data access control

### 7. Performance Standards

- **LAZY LOAD** components and routes
- **PAGINATE** large data sets (limit 50 items)
- **CACHE** expensive operations
- **OPTIMIZE** images (WebP, proper sizing)
- **MINIMIZE** client-side JavaScript
- **STREAM** responses when possible

## Development Workflow

### 1. Feature Development Checklist

- [ ] Create feature branch from main
- [ ] Write feature test FIRST
- [ ] Implement feature
- [ ] Run lint: `npm run lint`
- [ ] Run typecheck: `npm run typecheck`
- [ ] Run feature test: `npm test -- features/feature-name`
- [ ] Self-review with Claude
- [ ] Update CLAUDE.md if needed
- [ ] Create pull request

### 2. Before Marking Complete

```bash
# Required checks
npm run lint          # Must pass
npm run typecheck     # Must pass
npm test              # Feature test must pass

# Claude review prompt
"Review this code for security vulnerabilities, performance issues, 
and adherence to our development standards. Focus on:
1. SQL injection risks
2. XSS vulnerabilities  
3. Permission checks
4. Error handling
5. Performance bottlenecks"
```

### 3. Commit Standards

```
feat: Add panel creation from natural language
fix: Resolve streaming timeout in long panels
refactor: Simplify tool execution logic
docs: Update API documentation
test: Add simulation feature tests
chore: Update dependencies
```

## Error Handling Standards

```typescript
// REQUIRED: Proper error handling at all levels
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error) {
  console.error('Operation failed:', error);
  
  // User-friendly error
  return {
    success: false,
    error: {
      code: 'OPERATION_FAILED',
      message: 'Unable to complete operation. Please try again.',
    }
  };
}

// REQUIRED: Graceful degradation
if (!criticalService.available) {
  return alternativeImplementation();
}
```

## Testing Standards

### Feature Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Panel Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Setup
  });

  test('should create panel from natural language', async ({ page }) => {
    // Arrange
    await page.goto('/');
    await login(page);
    
    // Act
    await page.fill('[data-testid="chat-input"]', 'Create a code review panel');
    await page.press('[data-testid="chat-input"]', 'Enter');
    
    // Assert
    await expect(page.locator('[data-testid="panel-created"]')).toBeVisible();
  });
  
  test('should handle invalid input gracefully', async ({ page }) => {
    // Error case testing
  });
});
```

## Monitoring Standards

- **LOG** all errors with context
- **TRACK** feature usage metrics
- **MONITOR** API response times
- **ALERT** on critical failures
- **REVIEW** logs weekly

## Continuous Improvement

1. **Weekly Review**: Review logs and metrics
2. **Refactor Debt**: Address technical debt incrementally
3. **Update Standards**: Evolve standards based on learnings
4. **Share Knowledge**: Document patterns in CLAUDE.md

## Forbidden Practices

1. **NO** console.log in production code (use proper logging)
2. **NO** commented-out code in commits
3. **NO** hardcoded values (use environment variables)
4. **NO** synchronous file operations
5. **NO** infinite loops or recursion without limits
6. **NO** direct database queries in components
7. **NO** secret keys in code
8. **NO** bypassing security checks

## Required Practices

1. **ALWAYS** handle loading and error states
2. **ALWAYS** validate external data
3. **ALWAYS** use transactions for multi-step operations
4. **ALWAYS** clean up resources (subscriptions, timers)
5. **ALWAYS** test edge cases
6. **ALWAYS** document breaking changes
7. **ALWAYS** use semantic versioning

These standards ensure high-quality, secure, and maintainable code. Adherence is mandatory for all development work.