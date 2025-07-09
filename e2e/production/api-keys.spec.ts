import { test, expect } from '@playwright/test'

test.describe('API Keys Management - Production', () => {
  test.beforeEach(async ({ page }) => {
    // Login with test user
    const testEmail = process.env.TEST_USER_EMAIL || 'sid+he-testing-pwr@hawkingedison.com'
    const testPassword = process.env.TEST_USER_PASSWORD || 'securepassword123'
    
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')
    
    // Fill login form
    await page.getByLabel('Email').fill(testEmail)
    await page.getByLabel('Password').fill(testPassword)
    
    // Submit form
    await page.getByRole('button', { name: 'Sign in' }).click()
    
    // Wait for redirect to chat
    await page.waitForURL('**/chat', { timeout: 30000 })
  })

  test('can access API keys page without errors', async ({ page }) => {
    // Navigate to API keys page
    await page.goto('/settings/api-keys')
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle')
    
    // Check that we don't see authentication errors
    await expect(page.locator('text=Authentication required')).not.toBeVisible()
    await expect(page.locator('text=Failed to load API keys')).not.toBeVisible()
    
    // Check if we see the API Keys heading
    await expect(page.getByRole('heading', { name: 'API Keys' })).toBeVisible()
    
    // Check if the description is visible
    await expect(page.getByText('Manage your API keys for programmatic access')).toBeVisible()
    
    // Check if the create button is visible
    await expect(page.getByRole('button', { name: 'Create New API Key' })).toBeVisible()
  })

  test('can create and view API key', async ({ page }) => {
    await page.goto('/settings/api-keys')
    await page.waitForLoadState('networkidle')
    
    // Click create button
    await page.getByRole('button', { name: 'Create New API Key' }).click()
    
    // Fill in the form with a unique name
    const keyName = `Test Key ${Date.now()}`
    await page.getByPlaceholder('e.g., Production App').fill(keyName)
    
    // Create the key
    await page.getByRole('button', { name: 'Create Key' }).click()
    
    // Check for success message
    await expect(page.getByText('API Key Created Successfully!')).toBeVisible({ timeout: 10000 })
    
    // Check that the key is displayed (starts with hke_)
    const keyElement = page.locator('code').filter({ hasText: /hke_/ })
    await expect(keyElement).toBeVisible()
    
    // Close the success message
    await page.getByText('Close').click()
    
    // Verify the key appears in the list
    await expect(page.getByText(keyName)).toBeVisible()
    
    // Clean up - delete the key
    const keyRow = page.locator('div').filter({ hasText: keyName }).first()
    await keyRow.getByRole('button', { name: 'Delete key' }).click()
    
    // Confirm deletion in dialog
    await page.on('dialog', dialog => dialog.accept())
  })
})