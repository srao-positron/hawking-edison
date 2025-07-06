# Hawking Edison - TODO

## CI/CD Improvements

### Enable Playwright Tests in CI
Currently disabled in `.github/workflows/test.yml` because tests need a running server.

Options to fix:
1. **Build and run Next.js in CI** (preferred for true E2E testing)
   - Add build step: `npm run build`
   - Start server in background: `npm run start &`
   - Wait for server to be ready
   - Run tests against local server

2. **Deploy to Vercel and test against preview URLs**
   - Set up Vercel deployment
   - Use preview URLs for PR tests
   - Use production URL for main branch tests

3. **Mock the backend for Playwright tests**
   - Use Playwright's route mocking
   - Test UI behavior without real backend

To re-enable, remove `if: false` from the `test-playwright` job in `.github/workflows/test.yml`.

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