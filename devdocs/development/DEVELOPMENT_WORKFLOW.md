# Development Workflow

## Pre-Push Checklist

Before pushing any code changes, **ALWAYS** run through this checklist:

### 1. Run All Tests Locally

```bash
# Run unit tests
npm test

# Run Playwright E2E tests (REQUIRED before push)
npm run test:e2e

# Run auth-specific tests
npm run test:auth

# Test LLM API keys
npm run test:llm
```

### 2. Verify Code Quality

```bash
# Type checking (when available)
npm run typecheck

# Linting (when available)
npm run lint

# Build verification
npm run build
```

### 3. Test Key Features Manually

1. **Auth Flow**:
   - Sign up with new email
   - Verify email works
   - Login/logout works
   - Password reset works

2. **API Endpoints**:
   ```bash
   # Test Edge Functions locally
   npm run test:api
   ```

3. **Database Operations**:
   ```bash
   # Verify database structure
   npm run check:db
   ```

## Playwright Test Requirements

Since Playwright tests are disabled in CI (temporarily), it's **CRITICAL** that you:

1. **Always run Playwright tests locally** before pushing
2. **Fix any failing tests** before committing
3. **Add new tests** for new features

### Running Playwright Tests

```bash
# Run in headed mode (see browser)
npm run test:e2e -- --headed

# Run specific test file
npm run test:e2e auth.spec.ts

# Run in debug mode
npm run test:e2e -- --debug

# Update snapshots if needed
npm run test:e2e -- --update-snapshots
```

### Common Playwright Issues

1. **Server not running**: Make sure `npm run dev` is running
2. **Port conflicts**: Check nothing else is on port 3000
3. **Environment variables**: Ensure `.env.local` has all required vars

## Git Workflow

```bash
# 1. Stage changes
git add .

# 2. Review changes
git status
git diff --cached

# 3. Run tests (REQUIRED)
npm run test:e2e

# 4. Commit with descriptive message
git commit -m "feat: add new feature

- Detail 1
- Detail 2

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# 5. Push to GitHub
git push origin main
```

## When Tests Fail

If Playwright tests fail:

1. **DO NOT PUSH** - Fix the issues first
2. Run tests in headed mode to see what's happening
3. Check browser console for errors
4. Verify all environment variables are set
5. Ensure database migrations are applied

## Future Improvements

Once we have deployment infrastructure:
- Re-enable Playwright in CI
- Add pre-commit hooks for automatic testing
- Set up branch protection rules requiring tests to pass

Remember: **Local Playwright tests are our safety net until CI E2E tests are re-enabled!**