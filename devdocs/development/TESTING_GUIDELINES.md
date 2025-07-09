# Testing Guidelines

## Test Email Addresses

When writing tests that require email addresses, **ALWAYS** use the `@hawkingedison.com` domain to prevent bouncebacks and maintain our email sender reputation.

### Format

```
sid+he-testing-<feature>-<timestamp>@hawkingedison.com
```

### Examples

```typescript
// Auth tests
const testEmail = `sid+he-testing-auth-${Date.now()}@hawkingedison.com`

// API key tests  
const testEmail = `sid+he-testing-apikey-${Date.now()}@hawkingedison.com`

// Monitoring tests
const testEmail = `sid+he-testing-monitor-${Date.now()}@hawkingedison.com`

// Jest tests
const testEmail = `sid+he-testing-jest-${Date.now()}@hawkingedison.com`
```

### Why This Matters

1. **Prevents Bouncebacks**: Using real domains like `@gmail.com` causes email bouncebacks when Supabase tries to send verification emails
2. **Avoids Rate Limiting**: Supabase blocks common test domains like `@example.com` 
3. **Maintains Sender Reputation**: Too many bouncebacks can hurt our ability to send emails
4. **Enables Tracking**: The `sid+he-testing-*` format allows us to identify and manage test emails

### What NOT to Use

```typescript
// ❌ WRONG - These will fail or cause bouncebacks
const testEmail = `test@example.com`     // Blocked by Supabase
const testEmail = `test@gmail.com`        // Real domain - causes bouncebacks
const testEmail = `test123@hotmail.com`   // Real domain - causes bouncebacks
const testEmail = `user@test.com`         // May be blocked
```

### Implementation Locations

These email formats are used in:
- `/e2e/auth.spec.ts` - Playwright end-to-end tests
- `/e2e/basic-auth.spec.ts` - Basic auth flow tests
- `/utils/test-*.ts` - All test utility scripts
- `/__tests__/**/*.test.ts` - Jest unit tests

### CI/CD Considerations

These email addresses work in both:
- Local development (no actual emails sent)
- CI/CD pipelines (GitHub Actions)
- Production testing (Supabase will attempt delivery)

The format ensures that even if emails are sent, they go to a domain we control and don't bounce back.