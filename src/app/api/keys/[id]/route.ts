import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-unified'
import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    
    const { data: apiKey, error: fetchError } = await supabase
      .from('api_keys')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()
    
    if (fetchError || !apiKey) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'API key not found' } },
        { status: 404 }
      )
    }
    
    const { error: deleteError } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', id)
    
    if (deleteError) {
      return NextResponse.json(
        { success: false, error: { code: 'DATABASE_ERROR', message: 'Failed to delete API key' } },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: { message: 'API key deleted successfully' }
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const body = await request.json()
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    
    const { data: apiKey, error: fetchError } = await supabase
      .from('api_keys')
      .select('id, revoked_at')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()
    
    if (fetchError || !apiKey) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'API key not found' } },
        { status: 404 }
      )
    }
    
    if (apiKey.revoked_at) {
      return NextResponse.json(
        { success: false, error: { code: 'ALREADY_REVOKED', message: 'API key is already revoked' } },
        { status: 400 }
      )
    }
    
    if (body.action === 'revoke') {
      const { error: updateError } = await supabase
        .from('api_keys')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', id)
      
      if (updateError) {
        return NextResponse.json(
          { success: false, error: { code: 'DATABASE_ERROR', message: 'Failed to revoke API key' } },
          { status: 500 }
        )
      }
      
      return NextResponse.json({
        success: true,
        data: { message: 'API key revoked successfully' }
      })
    }
    
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_ACTION', message: 'Invalid action' } },
      { status: 400 }
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 }
    )
  }
}