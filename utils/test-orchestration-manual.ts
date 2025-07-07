#!/usr/bin/env node
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

console.log(`
🧪 Manual Test Instructions for Orchestration

Since we're hitting email rate limits, here's how to manually test the orchestration:

1️⃣ **Sign in to the web app:**
   URL: https://hawking-edison.vercel.app
   
   Use an existing account or create one if you haven't hit the rate limit.

2️⃣ **Open browser developer tools:**
   - Go to Network tab
   - Filter by "interact"

3️⃣ **Send a test message in the chat:**
   Try: "This is a test of the orchestration system. Please respond."

4️⃣ **Check the response:**
   
   If async orchestration is working, you should see:
   {
     "data": {
       "sessionId": "uuid-here",
       "status": "processing",
       "message": "Your request is being processed...",
       "realtime": {
         "channel": "orchestration:uuid-here",
         "event": "orchestration_sessions",
         "filter": "id=eq.uuid-here"
       }
     }
   }
   
   If not working (sync mode), you'll see:
   {
     "data": {
       "interactionId": "uuid-here",
       "response": "Direct LLM response...",
       "usage": { ... }
     }
   }

5️⃣ **Monitor orchestration progress:**
   
   In the browser console, run:
   
   const sessionId = 'YOUR_SESSION_ID_HERE';
   const checkStatus = async () => {
     const res = await fetch(\`${supabaseUrl}/rest/v1/orchestration_sessions?id=eq.\${sessionId}\`, {
       headers: {
         'apikey': '${supabaseAnonKey}',
         'Authorization': 'Bearer ' + (await supabase.auth.getSession()).data.session?.access_token
       }
     });
     const data = await res.json();
     console.log('Session status:', data[0]?.status);
     console.log('Execution count:', data[0]?.execution_count);
     if (data[0]?.final_response) {
       console.log('Final response:', data[0].final_response);
     }
   };
   
   // Check every 5 seconds
   setInterval(checkStatus, 5000);

6️⃣ **Check AWS CloudWatch Logs:**
   
   Go to AWS Console > CloudWatch > Log groups:
   - /aws/lambda/hawking-edison-dev-Orchestrator
   - /aws/lambda/hawking-edison-dev-OrchestrationPoller
   
   Look for:
   - "Processing orchestration event"
   - "Found X pending sessions"
   - "Session X completed successfully"

7️⃣ **Check Supabase Logs:**
   
   Dashboard: https://supabase.com/dashboard/project/bknpldydmkzupsfagnva/logs/edge-functions
   
   Look for:
   - "Created orchestration session"
   - ENABLE_ORCHESTRATION value

📝 **Expected Flow:**
1. User sends message
2. Edge Function creates orchestration session (if async mode enabled)
3. Poller Lambda picks it up within 1 minute
4. Orchestrator Lambda processes the request
5. Final response saved to database
6. User can poll or subscribe to get updates

🔍 **Debugging Tips:**
- If you get sync responses, ENABLE_ORCHESTRATION might not be set
- Check if orchestration_sessions table has your request
- Lambda poller runs every minute, so wait at least 60 seconds
- Check CloudWatch for any Lambda errors

`)

console.log('\n🚀 Ready to test! Follow the instructions above.')
console.log('\n💡 Pro tip: You can also use the test with a Hawking Edison API key:')
console.log('   1. Go to https://hawking-edison.vercel.app/api-keys')
console.log('   2. Create an API key')
console.log('   3. Use it with curl:')
console.log(`
curl -X POST ${supabaseUrl}/functions/v1/interact \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \\
  -d '{"input": "Test orchestration", "mode": "async"}'
`)