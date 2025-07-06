#!/usr/bin/env tsx
// Check database structure on hosted Supabase

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { join } from 'path'

// Load environment variables
config({ path: join(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkDatabase() {
  console.log('🔍 Checking database structure...\n')
  
  try {
    // 1. Check if interactions table exists
    console.log('1️⃣  Checking interactions table...')
    const { data: interactions, error: interactionsError } = await supabase
      .from('interactions')
      .select('*')
      .limit(1)
    
    if (interactionsError) {
      if (interactionsError.code === '42P01') {
        console.error('❌ Table "interactions" does not exist!')
        console.log('   The database migrations have not been applied.')
        return
      }
      console.error('❌ Error checking interactions table:', interactionsError.message)
    } else {
      console.log('✅ Interactions table exists')
    }
    
    // 2. Check if knowledge table exists
    console.log('\n2️⃣  Checking knowledge table...')
    const { data: knowledge, error: knowledgeError } = await supabase
      .from('knowledge')
      .select('*')
      .limit(1)
    
    if (knowledgeError) {
      if (knowledgeError.code === '42P01') {
        console.error('❌ Table "knowledge" does not exist!')
      } else {
        console.error('❌ Error checking knowledge table:', knowledgeError.message)
      }
    } else {
      console.log('✅ Knowledge table exists')
    }
    
    // 3. Check if agent_memories table exists
    console.log('\n3️⃣  Checking agent_memories table...')
    const { data: memories, error: memoriesError } = await supabase
      .from('agent_memories')
      .select('*')
      .limit(1)
    
    if (memoriesError) {
      if (memoriesError.code === '42P01') {
        console.error('❌ Table "agent_memories" does not exist!')
      } else {
        console.error('❌ Error checking agent_memories table:', memoriesError.message)
      }
    } else {
      console.log('✅ Agent memories table exists')
    }
    
    // 4. Check if api_keys table exists
    console.log('\n4️⃣  Checking api_keys table...')
    const { data: apiKeys, error: apiKeysError } = await supabase
      .from('api_keys')
      .select('*')
      .limit(1)
    
    if (apiKeysError) {
      if (apiKeysError.code === '42P01') {
        console.error('❌ Table "api_keys" does not exist!')
      } else {
        console.error('❌ Error checking api_keys table:', apiKeysError.message)
      }
    } else {
      console.log('✅ API keys table exists')
    }
    
    // 5. Check extensions
    console.log('\n5️⃣  Checking required extensions...')
    const { data: extensions, error: extError } = await supabase.rpc('pg_available_extensions')
    
    if (!extError && extensions) {
      const requiredExtensions = ['uuid-ossp', 'vector']
      const installedExtensions = extensions.filter((ext: any) => ext.installed_version !== null)
      
      requiredExtensions.forEach(ext => {
        const isInstalled = installedExtensions.some((e: any) => e.name === ext)
        if (isInstalled) {
          console.log(`✅ Extension "${ext}" is installed`)
        } else {
          console.error(`❌ Extension "${ext}" is NOT installed`)
        }
      })
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('\n⚠️  If tables are missing, you need to run the migrations manually')
    console.log('   in the Supabase dashboard SQL editor.\n')
    
  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message)
  }
}

checkDatabase()