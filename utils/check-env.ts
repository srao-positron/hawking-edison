#!/usr/bin/env tsx
// Environment checker - ensures all required environment variables are set

import { config } from 'dotenv'
import { join } from 'path'

// Load .env.local
config({ path: join(process.cwd(), '.env.local') })

interface EnvCheck {
  name: string
  required: boolean
  description: string
}

const envChecks: EnvCheck[] = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    description: 'Supabase project URL'
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    description: 'Supabase anonymous key for browser'
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    description: 'Supabase service role key for server'
  },
  {
    name: 'SUPABASE_JWT_SECRET',
    required: true,
    description: 'Supabase JWT secret for token verification'
  },
  {
    name: 'DATABASE_PASSWORD',
    required: true,
    description: 'PostgreSQL database password'
  },
  {
    name: 'ANTHROPIC_API_KEY',
    required: false,
    description: 'Anthropic API key for Claude models'
  },
  {
    name: 'OPENAI_API_KEY',
    required: false,
    description: 'OpenAI API key for GPT models'
  }
]

console.log('🔍 Checking environment variables...\n')

let hasErrors = false
let hasWarnings = false

for (const check of envChecks) {
  const value = process.env[check.name]
  
  if (!value && check.required) {
    console.error(`❌ ${check.name} - MISSING (required)`)
    console.error(`   ${check.description}`)
    hasErrors = true
  } else if (!value && !check.required) {
    console.warn(`⚠️  ${check.name} - not set (optional)`)
    console.warn(`   ${check.description}`)
    hasWarnings = true
  } else {
    const maskedValue = value!.substring(0, 8) + '...'
    console.log(`✅ ${check.name} - set (${maskedValue})`)
  }
}

console.log('\n' + '='.repeat(60))

if (hasErrors) {
  console.error('\n❌ Environment check failed! Missing required variables.')
  console.error('Please check your .env.local file.\n')
  process.exit(1)
} else if (hasWarnings) {
  console.warn('\n⚠️  Environment check passed with warnings.')
  console.warn('Some optional features may not work.\n')
} else {
  console.log('\n✅ All environment variables are properly configured!\n')
}

// Additional checks
console.log('📋 Additional checks:')

// Check Supabase URL format
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
if (supabaseUrl && !supabaseUrl.includes('.supabase.co')) {
  console.warn('⚠️  Supabase URL might be incorrect (should include .supabase.co)')
}

// Check key lengths
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (anonKey && anonKey.length < 100) {
  console.warn('⚠️  Anon key seems too short')
}

console.log('\nDone! 🚀\n')