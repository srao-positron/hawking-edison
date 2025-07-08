#!/usr/bin/env node
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

async function debugPlaywright() {
  console.log('🔍 Playwright Debug Information\n')

  // Environment info
  console.log('📍 Environment:')
  console.log('   CI:', process.env.CI === 'true' ? 'Yes' : 'No')
  console.log('   NODE_ENV:', process.env.NODE_ENV || 'not set')
  console.log('   Platform:', process.platform)
  console.log('   Node version:', process.version)
  console.log('')

  // Test user info
  console.log('👤 Test User:')
  console.log('   Email:', process.env.TEST_USER_EMAIL ? '✅ Set' : '❌ Not set')
  console.log('   Password:', process.env.TEST_USER_PASSWORD ? '✅ Set' : '❌ Not set')
  console.log('')

  // Supabase configuration
  console.log('🔐 Supabase Configuration:')
  console.log('   URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Not set')
  console.log('   Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not set')
  console.log('   Service Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Not set')
  console.log('')

  // Test URLs
  const baseUrl = process.env.CI 
    ? 'https://hawking-edison.vercel.app'
    : 'http://localhost:3000'
  
  console.log('🌐 Test URLs:')
  console.log('   Base URL:', baseUrl)
  console.log('   Login URL:', `${baseUrl}/auth/login`)
  console.log('   Chat URL:', `${baseUrl}/chat`)
  console.log('')

  // Test connectivity
  console.log('🔗 Testing connectivity...')
  
  try {
    // Test base URL
    console.log('   Testing base URL...')
    const baseResponse = await fetch(baseUrl, { 
      method: 'HEAD',
      redirect: 'manual' // Don't follow redirects
    })
    console.log('   Base URL status:', baseResponse.status)
    
    // Test login page
    console.log('   Testing login page...')
    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      headers: {
        'User-Agent': 'Playwright Debug Script'
      }
    })
    console.log('   Login page status:', loginResponse.status)
    console.log('   Content-Type:', loginResponse.headers.get('content-type'))
    
    // Check if HTML contains expected elements
    if (loginResponse.status === 200) {
      const html = await loginResponse.text()
      console.log('   Has "Welcome back":', html.includes('Welcome back') ? 'Yes' : 'No')
      console.log('   Has email input:', html.includes('your@email.com') ? 'Yes' : 'No')
      console.log('   HTML length:', html.length)
    }
    
  } catch (error) {
    console.error('❌ Connectivity test failed:', (error as Error).message)
  }

  // Playwright config info
  console.log('\n🎭 Playwright Configuration:')
  console.log('   Config file:', process.env.CI ? 'playwright.config.prod.ts' : 'playwright.config.ts')
  console.log('   Test directory:', process.env.CI ? './e2e/production' : './e2e')
  console.log('   Retries:', process.env.CI ? '2' : '0')
  console.log('   Workers:', process.env.CI ? '1' : 'default')
  
  // Common issues
  console.log('\n⚠️  Common CI Issues:')
  console.log('   1. Test user not in production database')
  console.log('   2. Environment variables not set in GitHub secrets')
  console.log('   3. Vercel deployment not ready')
  console.log('   4. Auth redirect timing issues')
  console.log('   5. Browser-specific timing differences')
  
  console.log('\n✅ Debug information complete!')
}

// Run debug
debugPlaywright()