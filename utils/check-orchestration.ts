import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkSessions() {
  const { data, error } = await supabase
    .from('orchestration_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  console.log('Recent orchestration sessions:')
  data?.forEach(session => {
    console.log({
      id: session.id,
      status: session.status,
      created: new Date(session.created_at).toLocaleString(),
      updated: new Date(session.updated_at).toLocaleString(),
      hasResponse: !!session.final_response,
      error: session.error,
      metadata: session.metadata,
      messages: session.messages?.length || 0
    })
    console.log('---')
  })
}

checkSessions()