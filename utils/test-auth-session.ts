#!/usr/bin/env node

// Test Authentication Session Helper
// Usage: npm run test:auth-session

import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing required environment variables. Please check .env.local')
  process.exit(1)
}

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function testAuthSession() {
  log('\n🔐 Testing Authentication Session\n', 'blue')

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  // Check if we have a session
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error) {
    log(`Error getting session: ${error.message}`, 'red')
    return
  }

  if (!session) {
    log('No active session found', 'yellow')
    log('\nTo authenticate, please:', 'yellow')
    log('1. Go to http://localhost:3000 in your browser', 'blue')
    log('2. Log in with your account', 'blue')
    log('3. Then try accessing /settings/api-keys again', 'blue')
    return
  }

  log('✓ Active session found', 'green')
  log(`  User ID: ${session.user.id}`, 'blue')
  log(`  Email: ${session.user.email}`, 'blue')
  log(`  Token expires: ${new Date(session.expires_at! * 1000).toLocaleString()}`, 'blue')

  // Test if we can access the API with this session
  log('\nTesting API access with session token...', 'yellow')
  
  const response = await fetch('http://localhost:3000/api/keys', {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  })

  if (response.ok) {
    log('✓ API access successful', 'green')
    const data = await response.json()
    log(`  Found ${data.data?.keys?.length || 0} API keys`, 'blue')
  } else {
    log(`✗ API access failed: ${response.status} ${response.statusText}`, 'red')
    const error = await response.text()
    log(`  Error: ${error}`, 'red')
  }
}

testAuthSession().catch(error => {
  log(`\n❌ Test failed: ${error.message}`, 'red')
  process.exit(1)
})