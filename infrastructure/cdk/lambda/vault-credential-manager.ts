import { CloudFormationCustomResourceHandler, CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse } from 'aws-lambda'
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'
import * as https from 'https'
import { URL } from 'url'

const secretsManager = new SecretsManagerClient({ region: process.env.AWS_REGION })

const sendResponse = async (
  event: CloudFormationCustomResourceEvent,
  context: any,
  responseStatus: 'SUCCESS' | 'FAILED',
  responseData: any,
  physicalResourceId?: string
): Promise<void> => {
  const responseBody = JSON.stringify({
    Status: responseStatus,
    Reason: `See the details in CloudWatch Log Stream: ${context.logStreamName}`,
    PhysicalResourceId: physicalResourceId || context.logStreamName,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: responseData,
  })

  const parsedUrl = new URL(event.ResponseURL)
  const options = {
    hostname: parsedUrl.hostname,
    port: 443,
    path: parsedUrl.pathname + parsedUrl.search,
    method: 'PUT',
    headers: {
      'content-type': '',
      'content-length': responseBody.length.toString(),
    },
  }

  return new Promise<void>((resolve, reject) => {
    const request = https.request(options, (response: any) => {
      console.log(`Status code: ${response.statusCode}`)
      console.log(`Status message: ${response.statusMessage}`)
      resolve()
    })

    request.on('error', (error: Error) => {
      console.log('sendResponse Error:', error)
      reject(error)
    })

    request.write(responseBody)
    request.end()
  })
}

export const handler: CloudFormationCustomResourceHandler = async (event, context) => {
  console.log('Vault Credential Manager received event:', JSON.stringify(event, null, 2))
  
  const { RequestType, ResourceProperties } = event
  
  try {
    if (RequestType === 'Create' || RequestType === 'Update') {
      const { SecretArn } = ResourceProperties
      
      // Get credentials from environment and Secrets Manager
      const AccessKeyId = process.env.ACCESS_KEY_ID!
      const Region = process.env.REGION!
      const TopicArn = process.env.TOPIC_ARN!
      const SupabaseUrl = process.env.SUPABASE_URL!
      const SupabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
      
      // Retrieve the secret access key from Secrets Manager
      const command = new GetSecretValueCommand({ SecretId: SecretArn })
      const secretResponse = await secretsManager.send(command)
      const secretData = JSON.parse(secretResponse.SecretString || '{}')
      const SecretAccessKey = secretData.secretAccessKey
      
      // Call Vercel API to store credentials (which proxies to Supabase)
      console.log('Calling Vercel API to store AWS credentials in Vault...')
      
      // Use the Vercel app URL - in production this would be your custom domain
      const vercelUrl = process.env.VERCEL_URL || 'https://hawking-edison.vercel.app'
      const vaultStoreUrl = `${vercelUrl}/api/vault-store`
      const vaultStoreServiceKey = process.env.VAULT_STORE_SERVICE_KEY || SupabaseServiceRoleKey
      
      const response = await fetch(vaultStoreUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-service-key': vaultStoreServiceKey,
        },
        body: JSON.stringify({
          accessKeyId: AccessKeyId,
          secretAccessKey: SecretAccessKey,
          region: Region,
          topicArn: TopicArn,
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(`Edge Function failed: ${result.error || response.statusText}`)
      }
      
      console.log('Successfully stored AWS credentials in Vault via Edge Function')
      console.log('Result:', result)
      
      await sendResponse(event, context, 'SUCCESS', {
        Success: true,
        Message: 'Credentials stored in Vault'
      }, 'vault-credential-storage')
      
    } else if (RequestType === 'Delete') {
      // We don't delete credentials on stack deletion for safety
      console.log('Delete request received - credentials will remain in Vault for safety')
      const physicalId = (event as any).PhysicalResourceId || 'vault-credential-storage'
      await sendResponse(event, context, 'SUCCESS', {}, physicalId)
    } else {
      throw new Error(`Unknown request type: ${RequestType}`)
    }
    
  } catch (error) {
    console.error('Error in Vault Credential Manager:', error)
    const physicalId = (event as any).PhysicalResourceId || 'vault-credential-storage'
    await sendResponse(event, context, 'FAILED', {
      Error: error instanceof Error ? error.message : 'Unknown error'
    }, physicalId)
  }
}