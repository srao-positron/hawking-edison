#!/usr/bin/env tsx
// Deploy Edge Functions to production

import { config } from 'dotenv'
import { join } from 'path'

// Load environment variables
config({ path: join(process.cwd(), '.env.local') })

console.log('🚀 Deploying Edge Functions to Supabase...\n')

console.log('Since we cannot use Supabase CLI without authentication,')
console.log('you need to deploy Edge Functions manually:\n')

console.log('1. Go to: https://supabase.com/dashboard/project/bknpldydmkzupsfagnva/functions')
console.log('2. Click "Create a new function"')
console.log('3. Create each function with these names:')
console.log('   - interact')
console.log('   - databank')  
console.log('   - memories')
console.log('   - auth-api-keys')
console.log('\n4. For each function:')
console.log('   a. Copy the code from supabase/functions/[function-name]/index.ts')
console.log('   b. Also upload the shared utilities from supabase/functions/_shared/')
console.log('   c. Set the following environment variables:')
console.log('      - ANTHROPIC_API_KEY')
console.log('      - OPENAI_API_KEY')
console.log('\n5. Deploy each function')
console.log('\n6. The functions will be available at:')
console.log('   - https://bknpldydmkzupsfagnva.supabase.co/functions/v1/interact')
console.log('   - https://bknpldydmkzupsfagnva.supabase.co/functions/v1/databank')
console.log('   - https://bknpldydmkzupsfagnva.supabase.co/functions/v1/memories')
console.log('   - https://bknpldydmkzupsfagnva.supabase.co/functions/v1/auth-api-keys')
console.log('\nAlternatively, if you have Supabase CLI access token:')
console.log('1. Run: supabase login')
console.log('2. Run: supabase link --project-ref bknpldydmkzupsfagnva')
console.log('3. Run: supabase functions deploy')