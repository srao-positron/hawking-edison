# Asynchronous Task Architecture

## Overview

Long-running tasks like simulations and panel discussions will be handled by AWS Lambda functions triggered by SQS/SNS events. This allows us to:

1. **Scale independently** from the web server
2. **Handle failures gracefully** with retry policies
3. **Track progress** via Supabase Realtime
4. **Manage costs** with pay-per-execution

## Architecture Flow

```
User Request → Vercel API → SNS Topic → SQS Queue → Lambda Function
                                ↓                          ↓
                         Supabase (Task Record)    Supabase Realtime
                                                          ↓
                                                    Client Updates
```

## Components

### 1. **SNS Topic** (`hawking-edison-tasks`)
- Receives task requests from Vercel
- Fans out to multiple SQS queues if needed
- Enables future expansion (multiple workers, priority queues)

### 2. **SQS Queue** (`hawking-edison-task-queue`)
- Buffers tasks for Lambda processing
- Provides retry logic
- Dead Letter Queue (DLQ) for failed tasks
- Visibility timeout: 15 minutes
- Max retries: 3

### 3. **Lambda Functions**
- **Primary**: `hawking-edison-task-processor`
  - Handles simulations, panels, discussions
  - 15 minute timeout (Lambda max)
  - 3GB memory for LLM operations
  - Environment variables for Supabase/LLM access

### 4. **Supabase Integration**
- **Tasks Table**: Track task status, progress, results
- **Realtime**: Push updates to clients
- **Edge Functions**: Validate and enqueue tasks

## Task Lifecycle

1. **Creation**
   ```typescript
   // Vercel API endpoint
   POST /api/tasks
   {
     type: "simulation",
     config: { agents: 5, topic: "..." }
   }
   ```

2. **Queueing**
   ```typescript
   // Send to SNS
   await sns.publish({
     TopicArn: process.env.SNS_TOPIC_ARN,
     Message: JSON.stringify({
       taskId,
       userId,
       type,
       config
     })
   })
   ```

3. **Processing**
   ```typescript
   // Lambda handler
   export async function handler(event: SQSEvent) {
     for (const record of event.Records) {
       const task = JSON.parse(record.body)
       await processTask(task)
     }
   }
   ```

4. **Updates**
   ```typescript
   // Update task progress
   await supabase
     .from('tasks')
     .update({ 
       status: 'processing',
       progress: 0.5,
       updated_at: new Date()
     })
     .eq('id', taskId)
   ```

5. **Completion**
   ```typescript
   // Store results and notify
   await supabase
     .from('tasks')
     .update({
       status: 'completed',
       result: simulationResult,
       completed_at: new Date()
     })
     .eq('id', taskId)
   ```

## Security

1. **IAM Roles**
   - Vercel: Permission to publish to SNS only
   - Lambda: Read from SQS, write to CloudWatch
   - No direct AWS access from browser

2. **API Keys**
   - Stored in AWS Secrets Manager
   - Accessed by Lambda at runtime
   - Rotated regularly

3. **Task Validation**
   - User authentication required
   - Rate limiting per user
   - Task size limits

## Local Development

1. **LocalStack** for AWS services
2. **Docker Compose** setup
3. **Offline Lambda** testing
4. **SQS polling simulator**

## Monitoring

1. **CloudWatch Logs** for Lambda execution
2. **X-Ray** for distributed tracing
3. **Supabase Dashboard** for task status
4. **Alarms** for DLQ messages

## Cost Optimization

1. **Reserved Concurrency**: Limit max Lambda instances
2. **SQS Long Polling**: Reduce API calls
3. **Batch Processing**: Multiple tasks per Lambda
4. **Spot Instances**: For development/testing

## Future Enhancements

1. **Priority Queues**: Paid users get faster processing
2. **GPU Lambdas**: For ML-intensive tasks
3. **Step Functions**: Complex multi-step workflows
4. **EventBridge**: Schedule recurring tasks