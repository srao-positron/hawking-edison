import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-unified'
import { generateApiKey } from '@/lib/api-key-utils'
import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { z } from 'zod'

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  expiresInDays: z.number().min(1).max(365).optional(),
  environment: z.enum(['live', 'test']).default('live')
})

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    
    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, created_at, last_used_at, expires_at, revoked_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (error) {
      return NextResponse.json(
        { success: false, error: { code: 'DATABASE_ERROR', message: 'Failed to fetch API keys' } },
        { status: 500 }
      )
    }
    
    const formattedKeys = keys.map(key => ({
      ...key,
      isActive: !key.revoked_at && (!key.expires_at || new Date(key.expires_at) > new Date()),
      isExpired: key.expires_at && new Date(key.expires_at) <= new Date(),
      isRevoked: !!key.revoked_at
    }))
    
    return NextResponse.json({
      success: true,
      data: { keys: formattedKeys }
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

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const validated = createKeySchema.parse(body)
    
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    
    const { data: existingKeys } = await supabase
      .from('api_keys')
      .select('id')
      .eq('user_id', user.id)
      .eq('revoked_at', null)
    
    if (existingKeys && existingKeys.length >= 10) {
      return NextResponse.json(
        { success: false, error: { code: 'LIMIT_EXCEEDED', message: 'Maximum of 10 active API keys allowed' } },
        { status: 400 }
      )
    }
    
    const { key, hash, prefix } = generateApiKey(validated.environment)
    
    let expiresAt = null
    if (validated.expiresInDays) {
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + validated.expiresInDays)
      expiresAt = expiryDate.toISOString()
    }
    
    const { data: apiKey, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: user.id,
        name: validated.name,
        key_hash: hash,
        key_prefix: prefix,
        expires_at: expiresAt
      })
      .select('id, name, key_prefix, created_at, expires_at')
      .single()
    
    if (error) {
      return NextResponse.json(
        { success: false, error: { code: 'DATABASE_ERROR', message: 'Failed to create API key' } },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: {
        ...apiKey,
        key
      }
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors } },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 }
    )
  }
}