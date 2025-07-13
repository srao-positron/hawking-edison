import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL\!,
  process.env.SUPABASE_SERVICE_ROLE_KEY\!
)

async function testOrchestration() {
  console.log("Testing complete orchestration flow...")
  
  // First, check latest sessions
  const { data: sessions } = await supabase
    .from("orchestration_sessions")
    .select("id, status, created_at, error, final_response")
    .order("created_at", { ascending: false })
    .limit(3)
    
  console.log("Recent sessions:")
  sessions?.forEach(s => {
    console.log(`  ${s.id}: ${s.status} (${new Date(s.created_at).toLocaleTimeString()})`)
    if (s.error) console.log(`    Error: ${s.error}`)
    if (s.final_response) console.log(`    Has response: yes`)
  })
}

testOrchestration()
