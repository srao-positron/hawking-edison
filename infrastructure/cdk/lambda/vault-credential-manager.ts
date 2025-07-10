import { CloudFormationCustomResourceHandler } from 'aws-lambda'
import { createClient } from '@supabase/supabase-js'

export const handler: CloudFormationCustomResourceHandler = async (event) => {
  console.log('Vault Credential Manager received event:', JSON.stringify(event, null, 2))
  
  const { RequestType, ResourceProperties } = event
  
  try {
    if (RequestType === 'Create' || RequestType === 'Update') {
      const {
        SupabaseUrl,
        SupabaseServiceRoleKey,
        AccessKeyId,
        SecretAccessKey,
        Region,
        TopicArn
      } = ResourceProperties
      
      // Create Supabase client
      const supabase = createClient(SupabaseUrl, SupabaseServiceRoleKey)
      
      // Store credentials in Vault
      console.log('Storing AWS credentials in Supabase Vault...')
      const { error } = await supabase.rpc('store_aws_credentials', {
        p_access_key_id: AccessKeyId,
        p_secret_access_key: SecretAccessKey,
        p_region: Region,
        p_topic_arn: TopicArn
      })
      
      if (error) {
        throw new Error(`Failed to store credentials in Vault: ${error.message}`)
      }
      
      console.log('Successfully stored AWS credentials in Vault')
      
      // Verify storage
      const { data: verifyData, error: verifyError } = await supabase.rpc('get_aws_credentials')
      
      if (verifyError) {
        console.warn('Could not verify credentials:', verifyError.message)
      } else if (verifyData) {
        console.log('Credentials verified successfully')
      }
      
      return {
        PhysicalResourceId: 'vault-credential-storage',
        Data: {
          Success: true,
          Message: 'Credentials stored in Vault'
        }
      }
    } else if (RequestType === 'Delete') {
      // We don't delete credentials on stack deletion for safety
      console.log('Delete request received - credentials will remain in Vault for safety')
      return {
        PhysicalResourceId: event.PhysicalResourceId || 'vault-credential-storage'
      }
    }
    
    throw new Error(`Unknown request type: ${RequestType}`)
  } catch (error) {
    console.error('Error in Vault Credential Manager:', error)
    throw error
  }
}