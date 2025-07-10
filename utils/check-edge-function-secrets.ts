#!/usr/bin/env npx tsx
// Check what AWS secrets are configured in Edge Functions

import { config } from 'dotenv'
config({ path: '.env.local' })

const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 Checking Edge Function AWS configuration...\n')

console.log('To check Edge Function secrets:')
console.log('1. Go to https://supabase.com/dashboard')
console.log('2. Select your project')
console.log('3. Go to Edge Functions > Secrets')
console.log('4. Check if these are set:')
console.log('   - AWS_ACCESS_KEY_ID')
console.log('   - AWS_SECRET_ACCESS_KEY')
console.log('   - AWS_REGION (should be us-east-1)')
console.log('   - AWS_SNS_TOPIC_ARN')
console.log('\nThe CDK deployment created new AWS credentials.')
console.log('These need to be manually added to Supabase Edge Function secrets.')
console.log('\nTo get the new credentials:')
console.log('1. Check GitHub Actions deployment logs')
console.log('2. Or check AWS Secrets Manager for "hawking-edison/edge-function-creds"')
console.log('3. Update the Edge Function secrets in Supabase dashboard')
console.log('\nWithout these secrets, Edge Functions cannot publish to SNS,')
console.log('which means Lambda functions never get triggered.')