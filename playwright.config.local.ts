import { defineConfig } from '@playwright/test'
import baseConfig from './playwright.config'

/**
 * Local development test configuration
 * Tests ALL features including those not yet deployed
 */
export default defineConfig({
  ...baseConfig,
  
  // Test directory for local development tests
  testDir: './e2e/local',
  
  // Always use local server
  use: {
    ...baseConfig.use,
    baseURL: 'http://localhost:3000',
  },

  // Local dev server
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },

  // More verbose output for local debugging
  reporter: [['html'], ['list']],
})