import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    // Verify service key
    const serviceKey = request.headers.get('x-service-key')
    const expectedServiceKey = process.env.VAULT_STORE_SERVICE_KEY || 'EY2LySQVi9ZOHzvKmkkMCR6sGCdc25G3KIO0oVzBbYM'
    
    if (!serviceKey || serviceKey !== expectedServiceKey) {
      console.error('Service key mismatch:', {
        provided: serviceKey?.substring(0, 10),
        expected: expectedServiceKey?.substring(0, 10)
      })
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Parse the request body
    const body = await request.json()
    const { accessKeyId, secretAccessKey, region, topicArn } = body
    
    if (!accessKeyId || !secretAccessKey || !region || !topicArn) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }
    
    // Create Supabase client with service role
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore, {
      serviceRole: true
    })
    
    // Store credentials in database table (not Vault)
    console.log('Storing AWS credentials in database...')
    const { error } = await supabase.rpc('store_aws_credentials', {
      p_access_key_id: accessKeyId,
      p_secret_access_key: secretAccessKey,
      p_region: region,
      p_topic_arn: topicArn
    })
    
    if (error) {
      console.error('Failed to store credentials:', error)
      return NextResponse.json(
        { error: `Failed to store credentials: ${error.message}` },
        { status: 500 }
      )
    }
    
    console.log('Successfully stored AWS credentials in database')
    
    // Verify storage
    const { data: verifyData, error: verifyError } = await supabase.rpc('get_aws_credentials')
    
    if (verifyError) {
      console.warn('Could not verify credentials:', verifyError.message)
    } else if (verifyData) {
      console.log('Credentials verified successfully')
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Credentials stored in database',
      verified: !!verifyData 
    })
    
  } catch (error) {
    console.error('Error in vault-store proxy:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}