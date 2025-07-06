// Auth callback handler for email verification and OAuth
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Successful verification - redirect to home
      return NextResponse.redirect(new URL('/', requestUrl.origin))
    }
  }

  // Error or no code - redirect to login
  return NextResponse.redirect(new URL('/auth/login', requestUrl.origin))
}