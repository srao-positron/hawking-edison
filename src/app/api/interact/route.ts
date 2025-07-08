import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

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
    const { data, error } = await supabase.functions.invoke('interact', {
      body: {
        ...body,
        userId: session.user.id
      }
    })

    if (error) {
      console.error('Edge Function error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to process request' },
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