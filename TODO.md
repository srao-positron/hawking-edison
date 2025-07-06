# Hawking Edison - TODO

## CI/CD Improvements

### ✅ Playwright Tests in CI - FIXED
Playwright tests now run in CI against the Vercel deployment URL.

- Tests use `https://hawking-edison.vercel.app` in CI
- Tests use `http://localhost:3000` for local development
- Configuration is automatic based on `process.env.CI`

## Pending Features

### From Architecture Documents
- [ ] Implement actual tools in the orchestrator (createAgent, runDiscussion, etc.)
- [ ] Implement Supabase Realtime for live updates
- [ ] Create metrics/telemetry foundation
- [ ] Set up health check endpoints
- [ ] Implement Hawking Edison API Keys system (in progress)

### Development Experience
- [ ] Set up Vercel deployment for preview environments
- [ ] Add pre-commit hooks for linting and type checking
- [ ] Create development seed data scripts
- [ ] Add Storybook for component development