#!/usr/bin/env npx tsx
// Clear test threads from the database

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function clearTestThreads() {
  console.log('🧹 Clearing test threads...')
  
  try {
    // Get test user from auth
    const testEmail = 'siddhartha.s.rao@gmail.com'
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers()
    
    if (userError) {
      console.error('Could not list users:', userError)
      return
    }
    
    const user = users.find(u => u.email === testEmail)
    if (!user) {
      console.error('Could not find test user')
      return
    }
    
    const userId = user.id
    console.log(`Found user: ${userId} (${user.email})`)
    
    // Delete all messages for this user's threads
    const { error: messagesError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('user_id', userId)
    
    if (messagesError) {
      console.error('Error deleting messages:', messagesError)
    } else {
      console.log('✅ Deleted chat messages')
    }
    
    // Delete all threads for this user
    const { error: threadsError } = await supabase
      .from('chat_threads')
      .delete()
      .eq('user_id', userId)
    
    if (threadsError) {
      console.error('Error deleting threads:', threadsError)
    } else {
      console.log('✅ Deleted chat threads')
    }
    
    // Delete all interactions for this user
    const { error: interactionsError } = await supabase
      .from('interactions')
      .delete()
      .eq('user_id', userId)
    
    if (interactionsError) {
      console.error('Error deleting interactions:', interactionsError)
    } else {
      console.log('✅ Deleted interactions')
    }
    
    console.log('🎉 Test data cleared successfully!')
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

clearTestThreads()