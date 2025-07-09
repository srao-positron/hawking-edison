// Admin Supabase client for server-side operations
import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

// Create a Supabase client with the service role key for admin operations
export function createAdminClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Create a Supabase client that bypasses RLS for a specific user
export function createUserClient(userId: string) {
  const admin = createAdminClient()
  
  // Return a client that adds the user context to all queries
  return {
    from: (table: string) => {
      return admin.from(table).rpc('set_request_user', { user_id: userId })
    },
    auth: admin.auth,
    storage: admin.storage,
    functions: admin.functions,
    realtime: admin.realtime
  }
}