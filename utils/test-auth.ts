#!/usr/bin/env tsx
// Test authentication flows

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { join } from 'path'

// Load environment variables
config({ path: join(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const testEmail = `test-${Date.now()}@example.com`
const testPassword = 'TestPassword123!'

console.log('🧪 Testing Supabase Auth flows...\n')

async function testSignUp() {
  console.log('1️⃣  Testing Sign Up...')
  
  const { data, error } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true // Auto-confirm for testing
  })

  if (error) {
    console.error('❌ Sign up failed:', error.message)
    return false
  }

  console.log('✅ User created:', data.user?.email)
  console.log('   ID:', data.user?.id)
  console.log('   Email confirmed:', data.user?.email_confirmed_at ? 'Yes' : 'No')
  return data.user?.id
}

async function testSignIn() {
  console.log('\n2️⃣  Testing Sign In...')
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  })

  if (error) {
    console.error('❌ Sign in failed:', error.message)
    return false
  }

  console.log('✅ Sign in successful')
  console.log('   Session:', data.session ? 'Created' : 'Not created')
  console.log('   Access token:', data.session?.access_token?.substring(0, 20) + '...')
  return true
}

async function testGetUser() {
  console.log('\n3️⃣  Testing Get User...')
  
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    console.error('❌ Get user failed:', error.message)
    return false
  }

  console.log('✅ User retrieved:', data.user?.email)
  return true
}

async function testSignOut() {
  console.log('\n4️⃣  Testing Sign Out...')
  
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('❌ Sign out failed:', error.message)
    return false
  }

  console.log('✅ Sign out successful')
  return true
}

async function testPasswordReset() {
  console.log('\n5️⃣  Testing Password Reset...')
  
  // Use service role to test password reset (doesn't require auth)
  const { error } = await supabase.auth.resetPasswordForEmail(testEmail, {
    redirectTo: 'http://localhost:3000/auth/reset-password'
  })

  if (error) {
    console.error('❌ Password reset failed:', error.message)
    console.log('   Note: This is expected if email delivery is not configured')
    return true // Don't fail the test for this
  }

  console.log('✅ Password reset email sent')
  return true
}

async function cleanupTestUser(userId: string) {
  console.log('\n🧹 Cleaning up test user...')
  
  const { error } = await supabase.auth.admin.deleteUser(userId)

  if (error) {
    console.error('❌ Cleanup failed:', error.message)
    return false
  }

  console.log('✅ Test user deleted')
  return true
}

async function testDatabaseAccess(userId: string) {
  console.log('\n6️⃣  Testing Database Access with RLS...')
  
  // Create a regular client (not admin) to test RLS
  const userSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Sign in to get a user session
  const { data: authData, error: authError } = await userSupabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  })

  if (authError) {
    console.error('❌ Failed to sign in for DB test:', authError.message)
    return false
  }

  console.log('   Signed in successfully for DB test')

  // Try to insert an interaction with the user's ID
  const { data, error } = await userSupabase
    .from('interactions')
    .insert({
      user_id: userId,  // Explicitly set user_id
      input: 'Test interaction',
      tool_calls: [],
      result: { test: true }
    })
    .select()
    .single()

  if (error) {
    console.error('❌ Database insert failed:', error.message)
    console.error('   Details:', error)
    return false
  }

  console.log('✅ Database insert successful')
  console.log('   Interaction ID:', data.id)
  
  // Verify we can read it back
  const { data: readData, error: readError } = await userSupabase
    .from('interactions')
    .select('*')
    .eq('id', data.id)
    .single()

  if (readError) {
    console.error('❌ Failed to read back interaction:', readError.message)
  } else {
    console.log('✅ Successfully read back interaction')
  }
  
  // Clean up
  await userSupabase.from('interactions').delete().eq('id', data.id)
  
  return true
}

// Run all tests
async function runTests() {
  console.log('Testing with email:', testEmail)
  console.log('=' + '='.repeat(59) + '\n')

  const userId = await testSignUp()
  if (!userId) return

  await testSignIn()
  await testGetUser()
  await testDatabaseAccess(userId)  // Pass userId
  await testSignOut()
  
  // Test password reset BEFORE deleting the user
  await testPasswordReset()
  
  // Clean up at the very end
  await cleanupTestUser(userId)

  console.log('\n' + '='.repeat(60))
  console.log('✅ All auth tests completed!\n')
}

runTests().catch(console.error)