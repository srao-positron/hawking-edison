import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    
    // Get session
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams
    const limit = searchParams.get('limit') || '50'
    const offset = searchParams.get('offset') || '0'

    // Call Edge Function
    const { data, error } = await supabase.functions.invoke('chat-threads', {
      body: {
        method: 'GET',
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    })

    if (error) {
      console.error('Edge Function error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch threads' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('API route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    
    // Get session
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get request body
    const body = await request.json()

    // Call Edge Function
    const { data, error } = await supabase.functions.invoke('chat-threads', {
      body: {
        method: 'POST',
        ...body
      }
    })

    if (error) {
      console.error('Edge Function error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create thread' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('API route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}