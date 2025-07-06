import { test, expect } from '@playwright/test'

test('has title', async ({ page }) => {
  await page.goto('/')

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Hawking Edison/)
})

test('shows main heading', async ({ page }) => {
  await page.goto('/')

  // Check main heading
  await expect(page.getByRole('heading', { name: 'Hawking Edison' })).toBeVisible()
  
  // Check subtitle - look for the paragraph containing the text
  const subtitle = page.locator('p').filter({ hasText: 'LLM-Orchestrated Multi-Agent Intelligence' })
  await expect(subtitle).toBeVisible()
})