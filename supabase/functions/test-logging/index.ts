import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  console.log('=== TEST LOGGING FUNCTION CALLED ===')
  console.log('Method:', req.method)
  console.log('URL:', req.url)
  console.log('Headers:', Object.fromEntries(req.headers.entries()))
  
  // Test different logging methods
  console.log('Regular console.log')
  console.error('Console.error message')
  console.warn('Console.warn message')
  console.info('Console.info message')
  
  // Test JSON logging
  console.log(JSON.stringify({
    type: 'json_log',
    timestamp: new Date().toISOString(),
    message: 'This is a JSON log entry'
  }))
  
  // Test Deno.core.print
  Deno.core.print('Deno.core.print message\n')
  
  return new Response(JSON.stringify({ 
    message: 'Check the logs!',
    timestamp: new Date().toISOString()
  }), {
    headers: { 'Content-Type': 'application/json' }
  })
})