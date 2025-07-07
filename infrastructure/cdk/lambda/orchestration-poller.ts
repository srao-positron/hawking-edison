import { ScheduledHandler } from 'aws-lambda'
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

export const handler: ScheduledHandler = async (event) => {
  console.log('Polling for pending orchestration sessions')
  
  try {
    // Get Supabase credentials
    const { url, serviceRoleKey } = await getSupabaseCredentials()
    const supabase = createClient(url, serviceRoleKey)
    
    // Find pending orchestration sessions
    const { data: pendingSessions, error } = await supabase
      .from('orchestration_sessions')
      .select('id, user_id')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10) // Process up to 10 at a time
    
    if (error) {
      console.error('Failed to fetch pending sessions:', error)
      return
    }
    
    if (!pendingSessions || pendingSessions.length === 0) {
      console.log('No pending sessions found')
      return
    }
    
    console.log(`Found ${pendingSessions.length} pending sessions`)
    
    // Publish each session to SNS
    for (const session of pendingSessions) {
      try {
        // Update status to prevent duplicate processing
        const { error: updateError } = await supabase
          .from('orchestration_sessions')
          .update({ status: 'queued' })
          .eq('id', session.id)
          .eq('status', 'pending') // Only update if still pending
        
        if (updateError) {
          console.error(`Failed to update session ${session.id}:`, updateError)
          continue
        }
        
        // Publish to SNS
        const command = new PublishCommand({
          TopicArn: process.env.ORCHESTRATION_TOPIC_ARN,
          Message: JSON.stringify({
            sessionId: session.id,
            action: 'start',
            userId: session.user_id
          })
        })
        
        await sns.send(command)
        console.log(`Published session ${session.id} to SNS`)
        
      } catch (sessionError) {
        console.error(`Failed to process session ${session.id}:`, sessionError)
      }
    }
    
    // Also check for sessions that need resuming
    const { data: resumingSessions, error: resumeError } = await supabase
      .from('orchestration_sessions')
      .select('id, user_id')
      .eq('status', 'resuming')
      .order('updated_at', { ascending: true })
      .limit(5)
    
    if (!resumeError && resumingSessions && resumingSessions.length > 0) {
      console.log(`Found ${resumingSessions.length} sessions to resume`)
      
      for (const session of resumingSessions) {
        try {
          const command = new PublishCommand({
            TopicArn: process.env.ORCHESTRATION_TOPIC_ARN,
            Message: JSON.stringify({
              sessionId: session.id,
              action: 'resume',
              userId: session.user_id
            })
          })
          
          await sns.send(command)
          console.log(`Published resume for session ${session.id}`)
          
        } catch (sessionError) {
          console.error(`Failed to resume session ${session.id}:`, sessionError)
        }
      }
    }
    
  } catch (error) {
    console.error('Poller error:', error)
  }
}