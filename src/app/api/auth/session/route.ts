import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

// This endpoint proxies the session from Supabase cookies to our domain
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    
    // Get the session from Supabase
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error || !session) {
      return NextResponse.json(
        { session: null },
        { status: 200 }
      )
    }
    
    // Return the session data
    return NextResponse.json({
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        user: session.user,
        expires_at: session.expires_at,
        expires_in: session.expires_in
      }
    })
  } catch (error) {
    console.error('[Auth Session] Error:', error)
    return NextResponse.json(
      { session: null },
      { status: 200 }
    )
  }
}