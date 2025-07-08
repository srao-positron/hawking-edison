import { defineConfig } from '@playwright/test'
import baseConfig from './playwright.config'

/**
 * Production test configuration
 * Tests ONLY deployed features that are stable
 */
export default defineConfig({
  ...baseConfig,
  
  // Test directory for production tests
  testDir: './e2e/production',
  
  // Run only minimal tests in CI for now
  testMatch: process.env.CI ? ['**/minimal.spec.ts', '**/basic.spec.ts'] : undefined,
  
  // Use production URL in CI, local in development
  use: {
    ...baseConfig.use,
    baseURL: process.env.CI 
      ? 'https://hawking-edison.vercel.app'
      : 'http://localhost:3000',
  },

  // No webServer in CI (testing deployed app)
  webServer: process.env.CI ? undefined : baseConfig.webServer,

  // Simpler reporter for CI
  reporter: process.env.CI ? [['github'], ['html']] : [['list']],
  
  // More retries in production
  retries: process.env.CI ? 2 : 0,
  
  // Timeout for CI
  timeout: 60000,
})