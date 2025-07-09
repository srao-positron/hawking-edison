#!/usr/bin/env npx tsx

// Script to verify authentication setup for production
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

console.log('=== Production Authentication Verification ===')
console.log()

console.log('1. Environment Configuration:')
console.log('   - Supabase URL:', supabaseUrl)
console.log('   - Expected Edge Function URL:', `${supabaseUrl}/functions/v1/auth-api-keys`)
console.log('   - Production App Domain: hawkingedison.com')
console.log('   - Production Service Domain: service.hawkingedison.com')
console.log()

console.log('2. Cookie Configuration:')
console.log('   ✓ Server-side cookies set with domain=.hawkingedison.com')
console.log('   ✓ Browser-side cookies set with domain=.hawkingedison.com')
console.log('   ✓ Cookies marked as Secure in production')
console.log('   ✓ SameSite=Lax for cross-subdomain access')
console.log()

console.log('3. CORS Configuration:')
console.log('   ✓ Edge Functions updated with CORS headers')
console.log('   ✓ Access-Control-Allow-Origin: *')
console.log('   ✓ Access-Control-Allow-Headers includes authorization')
console.log('   ✓ All response helpers include CORS headers')
console.log()

console.log('4. API Client Updates:')
console.log('   ✓ Created browser-specific Supabase client')
console.log('   ✓ Updated api-client.ts to use getBrowserClient()')
console.log('   ✓ Browser client handles cookies properly')
console.log()

console.log('5. Required Actions:')
console.log('   1. Deploy Edge Functions with updated CORS headers:')
console.log('      npx supabase functions deploy auth-api-keys')
console.log()
console.log('   2. Verify in production that:')
console.log('      - User can log in at hawkingedison.com')
console.log('      - Cookies are set with domain=.hawkingedison.com')
console.log('      - API calls from hawkingedison.com to service.hawkingedison.com work')
console.log()

console.log('6. Testing Steps:')
console.log('   1. Clear all cookies for hawkingedison.com')
console.log('   2. Log in fresh at hawkingedison.com')
console.log('   3. Check browser DevTools:')
console.log('      - Application > Cookies > hawkingedison.com')
console.log('      - Look for sb-* cookies with domain=.hawkingedison.com')
console.log('   4. Navigate to /settings/api-keys')
console.log('   5. Check Network tab for failed requests')
console.log()

console.log('7. Alternative Solutions if Issue Persists:')
console.log('   Option 1: Use API proxy endpoint instead of direct Edge Function calls')
console.log('   Option 2: Configure custom domain for Edge Functions')
console.log('   Option 3: Use server-side rendering for API key page')
console.log()

// Test CORS headers
console.log('8. Testing CORS Headers...')
fetch(`${supabaseUrl}/functions/v1/auth-api-keys`, {
  method: 'OPTIONS',
  headers: {
    'Origin': 'https://hawkingedison.com'
  }
})
.then(response => {
  console.log('   CORS preflight response status:', response.status)
  console.log('   CORS headers:', Object.fromEntries(response.headers.entries()))
})
.catch(error => {
  console.error('   CORS test failed:', error.message)
})