import { test, expect } from '@playwright/test'
import { loginUser } from '../helpers/login-helper'

test.describe('API Keys Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    const testEmail = process.env.TEST_USER_EMAIL || 'sid+he-testing-pwr@hawkingedison.com'
    const testPassword = process.env.TEST_USER_PASSWORD || 'securepassword123'
    
    await loginUser(page, testEmail, testPassword)
    
    // Wait for navigation to complete
    await page.waitForURL('**/chat')
  })

  test('can access API keys page', async ({ page }) => {
    // Navigate to API keys page
    await page.goto('/settings/api-keys')
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle')
    
    // Check if we see the API Keys heading
    await expect(page.getByRole('heading', { name: 'API Keys' })).toBeVisible()
    
    // Check if the description is visible
    await expect(page.getByText('Manage your API keys for programmatic access')).toBeVisible()
    
    // Check if the create button is visible
    await expect(page.getByRole('button', { name: 'Create New API Key' })).toBeVisible()
  })

  test('can create a new API key', async ({ page }) => {
    await page.goto('/settings/api-keys')
    await page.waitForLoadState('networkidle')
    
    // Click create button
    await page.getByRole('button', { name: 'Create New API Key' }).click()
    
    // Fill in the form
    await page.getByPlaceholder('e.g., Production App').fill('Test API Key')
    await page.getByPlaceholder('e.g., 90').fill('30')
    
    // Create the key
    await page.getByRole('button', { name: 'Create Key' }).click()
    
    // Check for success message
    await expect(page.getByText('API Key Created Successfully!')).toBeVisible()
    
    // Check that the key is displayed
    await expect(page.getByText(/hke_/)).toBeVisible()
    
    // Close the success message
    await page.getByText('Close').click()
    
    // Verify the key appears in the list
    await expect(page.getByText('Test API Key')).toBeVisible()
  })

  test('shows error when API fails to load', async ({ page }) => {
    // Mock API failure
    await page.route('**/api/keys', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to load API keys' }
        })
      })
    })
    
    await page.goto('/settings/api-keys')
    
    // Should show error message
    await expect(page.getByText('Failed to load API keys')).toBeVisible()
  })
})