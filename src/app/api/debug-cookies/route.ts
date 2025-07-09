import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  
  const cookieInfo = allCookies.map(cookie => ({
    name: cookie.name,
    value: cookie.value.substring(0, 50) + '...',
    hasValue: !!cookie.value
  }))
  
  // Also check headers
  const headers = Object.fromEntries(request.headers.entries())
  
  return NextResponse.json({
    cookies: cookieInfo,
    cookieHeader: request.headers.get('cookie'),
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    nodeEnv: process.env.NODE_ENV,
    headers: {
      origin: headers.origin,
      referer: headers.referer,
      host: headers.host
    }
  })
}