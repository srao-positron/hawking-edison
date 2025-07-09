#!/usr/bin/env tsx
// Debug Supabase cookie format
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'
import fs from 'fs'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

async function debugCookieFormat() {
  console.log('🔍 Debugging Supabase Cookie Format\n')

  // Load test user
  const testUserPath = resolve(__dirname, '../.test-user.json')
  const testUser = JSON.parse(fs.readFileSync(testUserPath, 'utf-8'))

  // Create Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Sign in
  console.log('Signing in...')
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: testUser.email,
    password: testUser.password
  })

  if (error) {
    console.error('Sign in failed:', error)
    return
  }

  console.log('✅ Signed in successfully\n')

  // Check how Supabase stores the session
  console.log('Checking Supabase session storage...')
  
  // Get the session
  const { data: { session } } = await supabase.auth.getSession()
  
  console.log('\nSession structure:')
  console.log('- access_token:', session?.access_token?.substring(0, 50) + '...')
  console.log('- refresh_token:', session?.refresh_token?.substring(0, 50) + '...')
  console.log('- expires_in:', session?.expires_in)
  console.log('- expires_at:', session?.expires_at)
  console.log('- token_type:', session?.token_type)
  console.log('- user:', session?.user?.id, session?.user?.email)

  console.log('\n📝 Cookie Information:')
  console.log('For Supabase SSR, cookies should be chunked if > 3600 chars')
  console.log('Cookie names for custom domain (service.hawkingedison.com):')
  console.log('- sb-service-auth-token (main cookie)')
  console.log('- sb-service-auth-token.0 (chunk 0)')
  console.log('- sb-service-auth-token.1 (chunk 1)')
  console.log('- etc.')

  console.log('\n💡 The cookie value should be the session object:')
  const cookieValue = {
    access_token: session?.access_token,
    token_type: session?.token_type || 'bearer',
    expires_in: session?.expires_in,
    expires_at: session?.expires_at,
    refresh_token: session?.refresh_token,
    user: session?.user
  }
  
  console.log('\nCookie value structure:')
  console.log(JSON.stringify(cookieValue, null, 2).substring(0, 500) + '...')
  
  console.log('\n🔧 To test manually:')
  console.log('1. Open http://localhost:3001 in Chrome')
  console.log('2. Sign in with the test user')
  console.log('3. Open DevTools > Application > Cookies')
  console.log('4. Look for sb-service-auth-token cookies')
  console.log('5. Copy their values and compare with above')

  await supabase.auth.signOut()
}

debugCookieFormat().catch(console.error)