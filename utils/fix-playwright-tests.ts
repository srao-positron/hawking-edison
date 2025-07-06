#!/usr/bin/env node
/**
 * Script to fix Playwright test selectors based on actual UI
 */

import * as fs from 'fs/promises'
import * as path from 'path'

async function fixTests() {
  // Fix patterns in test files
  const fixes = [
    // Fix email input selectors
    {
      from: /input\[type="email"\]/g,
      to: 'input[placeholder="your@email.com"]',
      reason: 'Login page uses text input with email placeholder'
    },
    // Fix alert selectors
    {
      from: /\.mantine-Alert-root/g,
      to: '[role="alert"]',
      reason: 'Use role selector for better compatibility'
    },
    // Fix heading selectors
    {
      from: /h1:has-text\("Hawking Edison"\)/g,
      to: 'h1:text("Hawking Edison")',
      reason: 'Use simpler text selector'
    },
    // Fix protected route check
    {
      from: /await expect\(page.locator\('h1:text\("Hawking Edison"\)'\)\)\.toBeVisible\(\)/g,
      to: 'await expect(page.locator(\'h1\').first()).toContainText(\'Hawking Edison\')',
      reason: 'Be more specific with heading selector'
    }
  ]
  
  const testFiles = [
    'e2e/auth.spec.ts',
    'e2e/basic-auth.spec.ts',
    'e2e/example.spec.ts'
  ]
  
  for (const file of testFiles) {
    const filePath = path.join(process.cwd(), file)
    try {
      let content = await fs.readFile(filePath, 'utf-8')
      let modified = false
      
      for (const fix of fixes) {
        if (fix.from.test(content)) {
          content = content.replace(fix.from, fix.to)
          modified = true
          console.log(`✓ Fixed ${file}: ${fix.reason}`)
        }
      }
      
      if (modified) {
        await fs.writeFile(filePath, content)
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error)
    }
  }
  
  console.log('\nTest fixes complete!')
}

fixTests().catch(console.error)