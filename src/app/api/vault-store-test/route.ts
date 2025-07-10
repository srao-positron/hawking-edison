import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const hasServiceKey = !!process.env.VAULT_STORE_SERVICE_KEY
  const hasSupabaseKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
  
  return NextResponse.json({
    hasVaultStoreServiceKey: hasServiceKey,
    hasSupabaseServiceRoleKey: hasSupabaseKey,
    serviceKeyPrefix: process.env.VAULT_STORE_SERVICE_KEY?.substring(0, 10) || 'NOT_SET',
    message: 'Environment check complete',
    timestamp: new Date().toISOString()
  })
}