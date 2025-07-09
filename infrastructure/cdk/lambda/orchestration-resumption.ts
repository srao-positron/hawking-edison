import { Handler } from 'aws-lambda'
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns'
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'
import { createClient } from '@supabase/supabase-js'

const sns = new SNSClient({ region: process.env.AWS_REGION })
const secretsManager = new SecretsManagerClient({ region: process.env.AWS_REGION })

// Get Supabase credentials from Secrets Manager
async function getSupabaseCredentials(): Promise<{ url: string; serviceRoleKey: string }> {
  const command = new GetSecretValueCommand({
    SecretId: 'hawking-edison/api-keys'
  })
  
  const response = await secretsManager.send(command)
  const secrets = JSON.parse(response.SecretString || '{}')
  
  return {
    url: secrets.SUPABASE_URL,
    serviceRoleKey: secrets.SUPABASE_SERVICE_ROLE_KEY
  }
}

interface ResumptionEvent {
  sessionIds?: string[]
  checkPending?: boolean
}

export const handler: Handler<ResumptionEvent> = async (event) => {
  console.log('Resumption handler invoked', event)
  
  try {
    // Get Supabase credentials
    const { url, serviceRoleKey } = await getSupabaseCredentials()
    const supabase = createClient(url, serviceRoleKey)
    
    let sessionsToResume: Array<{ id: string; user_id: string }> = []
    
    if (event.sessionIds && event.sessionIds.length > 0) {
      // Resume specific sessions
      const { data, error } = await supabase
        .from('orchestration_sessions')
        .select('id, user_id')
        .in('id', event.sessionIds)
        .eq('status', 'resuming')
      
      if (!error && data) {
        sessionsToResume = data
      }
    } else if (event.checkPending) {
      // Check for any pending/resuming sessions (called manually or on-demand)
      const { data: pendingSessions, error: pendingError } = await supabase
        .from('orchestration_sessions')
        .select('id, user_id')
        .in('status', ['pending', 'resuming'])
        .order('created_at', { ascending: true })
        .limit(10)
      
      if (!pendingError && pendingSessions) {
        sessionsToResume = pendingSessions
      }
    }
    
    console.log(`Found ${sessionsToResume.length} sessions to process`)
    
    // Publish each session to SNS
    for (const session of sessionsToResume) {
      try {
        // Update status to prevent duplicate processing
        const { error: updateError } = await supabase
          .from('orchestration_sessions')
          .update({ status: 'queued' })
          .eq('id', session.id)
          .in('status', ['pending', 'resuming'])
        
        if (updateError) {
          console.error(`Failed to update session ${session.id}:`, updateError)
          continue
        }
        
        // Publish to SNS
        const command = new PublishCommand({
          TopicArn: process.env.ORCHESTRATION_TOPIC_ARN,
          Message: JSON.stringify({
            sessionId: session.id,
            action: session.id in event.sessionIds ? 'resume' : 'start',
            userId: session.user_id
          })
        })
        
        await sns.send(command)
        console.log(`Published session ${session.id} to SNS`)
        
      } catch (sessionError) {
        console.error(`Failed to process session ${session.id}:`, sessionError)
      }
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        processed: sessionsToResume.length,
        sessionIds: sessionsToResume.map(s => s.id)
      })
    }
    
  } catch (error) {
    console.error('Resumption handler error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}