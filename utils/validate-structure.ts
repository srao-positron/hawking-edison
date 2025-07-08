#!/usr/bin/env tsx
/**
 * Project Structure Validation Script
 * 
 * Checks for common issues that cause test failures:
 * - Duplicate page routes
 * - API routes missing await cookies()
 * - Test files using deprecated patterns
 */

import { glob } from 'glob'
import { readFileSync } from 'fs'
import { relative } from 'path'

const ROOT = process.cwd()

async function validateStructure() {
  console.log('🔍 Validating project structure...\n')
  
  let hasErrors = false

  // 1. Check for duplicate page routes
  console.log('📁 Checking for duplicate page routes...')
  const pageFiles = await glob('src/app/**/page.tsx')
  const routeMap = new Map<string, string[]>()
  
  for (const file of pageFiles) {
    // Extract route from file path
    const route = file
      .replace('src/app/', '')
      .replace('/page.tsx', '')
      .replace(/\([^)]+\)\//g, '') // Remove route groups
      .replace(/^$/, '/') // Root route
    
    if (!routeMap.has(route)) {
      routeMap.set(route, [])
    }
    routeMap.get(route)!.push(file)
  }
  
  // Find duplicates
  for (const [route, files] of routeMap.entries()) {
    if (files.length > 1) {
      console.error(`❌ Duplicate route "${route}" found in:`)
      files.forEach(f => console.error(`   - ${relative(ROOT, f)}`))
      hasErrors = true
    }
  }
  
  if (!hasErrors) {
    console.log('✅ No duplicate routes found\n')
  } else {
    console.log()
  }

  // 2. Check API routes for proper cookie handling
  console.log('🍪 Checking API routes for proper cookie handling...')
  const apiRoutes = await glob('src/app/api/**/route.ts')
  let cookieErrors = false
  
  for (const file of apiRoutes) {
    const content = readFileSync(file, 'utf-8')
    
    // Check if file uses createClient
    if (content.includes('createClient(')) {
      // Check if it properly awaits cookies
      if (content.includes('createClient()') && !content.includes('// @skip-cookie-check')) {
        console.error(`❌ Missing cookie parameter in ${relative(ROOT, file)}`)
        console.error(`   Should be: const cookieStore = await cookies()`)
        console.error(`             const supabase = createClient(cookieStore)`)
        cookieErrors = true
        hasErrors = true
      }
      
      // Check if cookies is awaited
      if (content.includes('cookies()') && !content.includes('await cookies()')) {
        console.error(`❌ Missing await for cookies() in ${relative(ROOT, file)}`)
        cookieErrors = true
        hasErrors = true
      }
    }
  }
  
  if (!cookieErrors) {
    console.log('✅ All API routes handle cookies correctly\n')
  } else {
    console.log()
  }

  // 3. Check E2E tests for deprecated patterns
  console.log('🧪 Checking E2E tests for deprecated patterns...')
  const testFiles = await glob('e2e/**/*.spec.ts')
  let testErrors = false
  
  for (const file of testFiles) {
    const content = readFileSync(file, 'utf-8')
    const relativePath = relative(ROOT, file)
    
    // Check for Promise.all with waitForNavigation
    if (content.includes('Promise.all') && content.includes('waitForNavigation')) {
      console.error(`❌ Deprecated Promise.all pattern in ${relativePath}`)
      console.error(`   Use: await page.click(); await page.waitForURL()`)
      testErrors = true
      hasErrors = true
    }
    
    // Check for missing browserName handling
    if (content.includes('test(') && !content.includes('browserName')) {
      // Check if it has browser-specific logic that might need it
      if (content.includes('webkit') || content.includes('firefox') || content.includes('chromium')) {
        console.warn(`⚠️  Consider using browserName parameter in ${relativePath}`)
      }
    }
    
    // Check for brittle selectors
    if (content.match(/page\.locator\(['"]h1['"]\)/) && !content.includes('h1, h2')) {
      console.warn(`⚠️  Consider using flexible selectors in ${relativePath}`)
      console.warn(`   Use: page.locator('h1, h2').filter({ hasText: '...' })`)
    }
  }
  
  if (!testErrors) {
    console.log('✅ All E2E tests use modern patterns\n')
  } else {
    console.log()
  }

  // 4. Check for consistent route group usage
  console.log('📂 Checking route group consistency...')
  const authPages = await glob('src/app/**/(auth)/**/page.tsx')
  const withNavPages = await glob('src/app/**/(with-nav)/**/page.tsx')
  
  // Check if auth pages are outside (auth) group
  const loginSignupPages = pageFiles.filter(f => 
    (f.includes('login') || f.includes('signup') || f.includes('auth')) &&
    !f.includes('(auth)')
  )
  
  if (loginSignupPages.length > 0) {
    console.warn('⚠️  Auth pages found outside (auth) route group:')
    loginSignupPages.forEach(f => console.warn(`   - ${relative(ROOT, f)}`))
  }
  
  // Check if app pages are outside (with-nav) group
  const appPages = pageFiles.filter(f => 
    !f.includes('(auth)') && 
    !f.includes('(with-nav)') && 
    !f.includes('/api/') &&
    f !== 'src/app/page.tsx' // Allow root page
  )
  
  if (appPages.length > 0) {
    console.warn('⚠️  App pages found outside route groups:')
    appPages.forEach(f => console.warn(`   - ${relative(ROOT, f)}`))
  }
  
  console.log('✅ Route group check complete\n')

  // Summary
  console.log('━'.repeat(50))
  if (hasErrors) {
    console.error('\n❌ Validation failed! Fix the errors above before proceeding.\n')
    process.exit(1)
  } else {
    console.log('\n✅ All validation checks passed!\n')
  }
}

// Run validation
validateStructure().catch(err => {
  console.error('Error running validation:', err)
  process.exit(1)
})