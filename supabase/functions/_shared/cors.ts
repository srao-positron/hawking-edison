// CORS headers for Edge Functions
export const corsHeaders = (origin?: string) => {
  // Allow requests from hawkingedison.com and its subdomains
  const allowedOrigins = [
    'https://hawkingedison.com',
    'https://www.hawkingedison.com',
    'http://localhost:3000',
    'http://localhost:3001'
  ]
  
  // Check if origin is allowed
  const isAllowed = origin && (
    allowedOrigins.includes(origin) ||
    origin.endsWith('.hawkingedison.com') ||
    origin.includes('localhost')
  )
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://hawkingedison.com',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true'
  }
}