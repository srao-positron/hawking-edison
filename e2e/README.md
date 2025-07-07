# E2E Testing Setup

## Test User Configuration

The E2E tests require a test user to be configured. This can be done in two ways:

### 1. Local Development (.test-user.json)

For local development, create a `.test-user.json` file in the project root:

```json
{
  "email": "test@hawkingedison.com",
  "password": "TestUser123!@#"
}
```

This file is ignored by git and should not be committed.

### 2. CI/CD Environment Variables

For CI/CD environments, set these environment variables:

- `TEST_USER_EMAIL`: The test user's email (e.g., `test@hawkingedison.com`)
- `TEST_USER_PASSWORD`: The test user's password (e.g., `TestUser123!@#`)

In GitHub Actions, add these as repository secrets:
1. Go to Settings → Secrets and variables → Actions
2. Add `TEST_USER_EMAIL` with value `test@hawkingedison.com`
3. Add `TEST_USER_PASSWORD` with value `TestUser123!@#`

## Test Structure

- `local/`: Tests for features in development
- `production/`: Tests for stable, deployed features

## Running Tests

```bash
# Run all tests
npm run test:e2e

# Run local tests only
npm run test:e2e:local

# Run production tests only
npm run test:e2e:prod

# Run tests with UI
npm run test:e2e:ui
```

## Test User Requirements

The test user must:
- Have a verified email address
- Be created in the Supabase project
- Have appropriate permissions for testing

## Troubleshooting

If tests fail with "Test user credentials not found":
1. Check that environment variables are set correctly
2. Verify the `.test-user.json` file exists (for local development)
3. Ensure the test user exists in the database