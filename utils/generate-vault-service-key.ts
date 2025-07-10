#!/usr/bin/env npx tsx
// Generate a secure service key for the vault-store Edge Function

import { randomBytes } from 'crypto'

const serviceKey = randomBytes(32).toString('base64url')

console.log('🔐 Generated Vault Store Service Key:')
console.log('')
console.log(serviceKey)
console.log('')
console.log('📋 Add this to your environment:')
console.log('')
console.log('1. For local development (.env.local):')
console.log(`   VAULT_STORE_SERVICE_KEY=${serviceKey}`)
console.log('')
console.log('2. For Supabase Edge Functions:')
console.log(`   npx supabase secrets set VAULT_STORE_SERVICE_KEY="${serviceKey}"`)
console.log('')
console.log('3. For CDK deployment (add to deploy.sh):')
console.log(`   export VAULT_STORE_SERVICE_KEY="${serviceKey}"`)
console.log('')
console.log('4. For GitHub Actions (add as repository secret):')
console.log('   Name: VAULT_STORE_SERVICE_KEY')
console.log(`   Value: ${serviceKey}`)