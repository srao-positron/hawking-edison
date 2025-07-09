#!/usr/bin/env tsx
// Debug script for API keys authentication issue
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function debugAuth() {
  console.log('🔍 Debugging Authentication Issue\n')

  // Create Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  console.log('Environment Configuration:')
  console.log(`- SUPABASE_URL: ${SUPABASE_URL}`)
  console.log(`- Cookie Prefix: sb-${SUPABASE_URL.split('//')[1].split('.')[0]}-auth-token`)
  console.log(`- Production: ${process.env.NODE_ENV === 'production' ? 'Yes' : 'No'}`)
  console.log(`- Cookie Domain: ${process.env.NODE_ENV === 'production' ? '.hawkingedison.com' : 'localhost'}\n`)

  // Check if we can create a user or use existing
  console.log('Instructions for manual testing:\n')
  
  console.log('1. First, let\'s create a test user via Edge Function:')
  console.log('   Run this curl command:\n')
  
  console.log(`curl -X POST ${SUPABASE_URL}/functions/v1/auth-api-keys \\`)
  console.log(`  -H "Authorization: Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}" \\`)
  console.log(`  -H "Content-Type: application/json" \\`)
  console.log(`  -H "X-User-Id: 00000000-0000-0000-0000-000000000000" \\`)
  console.log(`  -d '{"action": "create", "name": "test-key"}'`)
  
  console.log('\n\n2. To test with your browser session:')
  console.log('   a. Log in at http://localhost:3001')
  console.log('   b. Open DevTools > Application > Cookies')
  console.log('   c. Look for cookies starting with "sb-"')
  console.log('   d. You should see cookies like:')
  console.log(`      - sb-${SUPABASE_URL.split('//')[1].split('.')[0]}-auth-token`)
  console.log(`      - sb-${SUPABASE_URL.split('//')[1].split('.')[0]}-auth-token.0`)
  console.log(`      - sb-${SUPABASE_URL.split('//')[1].split('.')[0]}-auth-token.1`)
  
  console.log('\n\n3. Copy ALL cookie values and test with curl:')
  console.log(`   curl -X GET http://localhost:3001/api/api-keys \\`)
  console.log(`     -H "Cookie: [paste all sb- cookies here]"`)

  console.log('\n\n4. Check server logs:')
  console.log('   The dev server should show detailed logs about:')
  console.log('   - Cookie parsing')
  console.log('   - User authentication')
  console.log('   - Edge function calls')
  
  console.log('\n\n5. Common issues to check:')
  console.log('   - Cookie domain mismatch (localhost vs .hawkingedison.com)')
  console.log('   - Cookie path issues')
  console.log('   - SameSite cookie restrictions')
  console.log('   - HttpOnly cookie settings')
  console.log('   - Secure cookie on HTTP')
}

debugAuth().catch(console.error)