#!/usr/bin/env npx tsx

// Test script to debug API key authentication issue
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

console.log('=== API Key Authentication Test ===')
console.log('Supabase URL:', supabaseUrl)
console.log('Anon Key (first 20 chars):', supabaseAnonKey.substring(0, 20) + '...')

async function testAuth() {
  try {
    // 1. Create Supabase client
    console.log('\n1. Creating Supabase client...')
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // 2. Check current session
    console.log('\n2. Checking current session...')
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Session error:', sessionError)
      return
    }
    
    if (!session) {
      console.log('No active session found. Please log in first.')
      console.log('\nTo test with authentication:')
      console.log('1. Run the app with: npm run dev')
      console.log('2. Log in at http://localhost:3000')
      console.log('3. Run this script again')
      return
    }
    
    console.log('Session found!')
    console.log('User ID:', session.user.id)
    console.log('User email:', session.user.email)
    console.log('Access token (first 20 chars):', session.access_token.substring(0, 20) + '...')
    
    // 3. Test direct Edge Function call
    console.log('\n3. Testing direct Edge Function call...')
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/auth-api-keys`
    console.log('Edge Function URL:', edgeFunctionUrl)
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Edge Function error:', errorText)
      
      // Try parsing as JSON
      try {
        const errorJson = JSON.parse(errorText)
        console.error('Error details:', errorJson)
      } catch {
        // Not JSON
      }
    } else {
      const data = await response.json()
      console.log('Success! API keys:', data)
    }
    
    // 4. Test with API client approach
    console.log('\n4. Testing API client approach...')
    try {
      // Simulate the API client's getAuthHeaders method
      const getAuthHeaders = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.access_token) {
          throw new Error('Not authenticated')
        }
        
        return {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      }
      
      const headers = await getAuthHeaders()
      console.log('Auth headers obtained successfully')
      console.log('Authorization header:', headers.Authorization.substring(0, 30) + '...')
    } catch (err) {
      console.error('API client auth error:', err)
    }
    
    // 5. Check cookies
    console.log('\n5. Checking browser context...')
    console.log('Note: Cookies are only available in browser context.')
    console.log('In production, ensure:')
    console.log('- Cookies have domain=.hawkingedison.com')
    console.log('- Cookies have secure=true')
    console.log('- Cookies have sameSite=lax')
    console.log('- Both hawkingedison.com and service.hawkingedison.com can access cookies')
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

// Run the test
testAuth().catch(console.error)