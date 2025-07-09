// API proxy for API keys management - avoids cross-domain issues
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    console.log('[API Keys Route] Starting GET request')
    
    const cookieStore = await cookies()
    
    // Debug: Log all cookies
    console.log('[API Keys Route] All cookies:')
    cookieStore.getAll().forEach(cookie => {
      console.log(`  ${cookie.name}: ${cookie.value.substring(0, 50)}...`)
    })
    
    const supabase = createClient(cookieStore)
    
    // Verify authentication
    console.log('[API Keys Route] Checking authentication...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('[API Keys Route] Auth error:', authError)
    }
    
    if (!user) {
      console.log('[API Keys Route] No user found in session')
    } else {
      console.log('[API Keys Route] User authenticated:', user.id, user.email)
    }
    
    if (authError || !user) {
      return NextResponse.json(
        { 
          success: false, 
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } 
        },
        { status: 401 }
      )
    }
    
    // Make request to Edge Function with service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    console.log('[API Keys Route] Calling Edge Function:', `${supabaseUrl}/functions/v1/auth-api-keys`)
    
    // Get the user's session to pass their token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      console.error('[API Keys Route] Session error:', sessionError)
      return NextResponse.json(
        { 
          success: false, 
          error: { code: 'UNAUTHORIZED', message: 'No valid session' } 
        },
        { status: 401 }
      )
    }
    
    console.log('[API Keys Route] Using user token for Edge Function call')
    
    const response = await fetch(`${supabaseUrl}/functions/v1/auth-api-keys`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('[API Keys Route] Edge Function response status:', response.status)
    
    if (!response.ok) {
      const error = await response.json()
      console.error('[API Keys Route] Edge Function error:', error)
      return NextResponse.json(error, { status: response.status })
    }
    
    const data = await response.json()
    console.log('[API Keys Route] Success, returning', data.data?.length || 0, 'keys')
    return NextResponse.json(data)
    
  } catch (error: any) {
    console.error('[API Keys Route] Unexpected error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: { code: 'INTERNAL_ERROR', message: error.message } 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[API Keys Route] Starting POST request')
    
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('[API Keys Route] Auth error:', authError)
    }
    
    if (!user) {
      console.log('[API Keys Route] No user found in session')
    } else {
      console.log('[API Keys Route] User authenticated:', user.id, user.email)
    }
    
    if (authError || !user) {
      return NextResponse.json(
        { 
          success: false, 
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } 
        },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    console.log('[API Keys Route] Request body:', body)
    
    // Get the user's session to pass their token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      console.error('[API Keys Route] Session error:', sessionError)
      return NextResponse.json(
        { 
          success: false, 
          error: { code: 'UNAUTHORIZED', message: 'No valid session' } 
        },
        { status: 401 }
      )
    }
    
    // Make request to Edge Function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const response = await fetch(`${supabaseUrl}/functions/v1/auth-api-keys`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
    
    console.log('[API Keys Route] Edge Function response status:', response.status)
    
    if (!response.ok) {
      const error = await response.json()
      console.error('[API Keys Route] Edge Function error:', error)
      return NextResponse.json(error, { status: response.status })
    }
    
    const data = await response.json()
    console.log('[API Keys Route] Success')
    return NextResponse.json(data)
    
  } catch (error: any) {
    console.error('[API Keys Route] Unexpected error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: { code: 'INTERNAL_ERROR', message: error.message } 
      },
      { status: 500 }
    )
  }
}