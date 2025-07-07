# Orchestration Architecture

## Overview

The orchestration system manages long-running conversations between users and the LLM, where the LLM can execute tools that may run for hours (e.g., panel discussions, multi-round simulations).

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Vercel    │────▶│  Supabase    │────▶│    SNS      │
│  Frontend   │     │Edge Function │     │   Topic     │
└─────────────┘     └──────────────┘     └─────────────┘
                            │                     │
                            ▼                     ▼
                    ┌──────────────┐     ┌─────────────┐
                    │  Supabase    │     │    SQS      │
                    │  Database    │     │   Queue     │
                    └──────────────┘     └─────────────┘
                            ▲                     │
                            │                     ▼
                            │            ┌─────────────┐
                            └────────────│   Lambda    │
                                        │Orchestrator │
                                        └─────────────┘
```

## Flow

1. **User Request** → Edge Function creates orchestration session in DB → Publishes to SNS
2. **Lambda Picks Up** → Loads session state → Begins/resumes orchestration
3. **Orchestration Loop**:
   - Call LLM with conversation history + available tools
   - If LLM requests tool execution:
     - Execute tool (may take minutes/hours)
     - Store result in session
     - Continue conversation
   - If approaching timeout (14 min):
     - Save state to DB
     - Queue resumption message
     - Gracefully exit
4. **Resumption** → New Lambda instance picks up where previous left off
5. **Completion** → Final response stored → User notified via Realtime

## Database Schema

```sql
-- Orchestration sessions
CREATE TABLE orchestration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL, -- 'pending', 'running', 'resuming', 'completed', 'failed'
  
  -- Conversation state
  messages JSONB NOT NULL DEFAULT '[]',
  tool_state JSONB DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Results
  final_response TEXT,
  total_tokens INTEGER DEFAULT 0,
  execution_count INTEGER DEFAULT 0, -- How many Lambda executions
  
  -- Error handling
  error TEXT,
  error_count INTEGER DEFAULT 0
);

-- Tool executions
CREATE TABLE tool_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES orchestration_sessions(id),
  tool_name TEXT NOT NULL,
  parameters JSONB NOT NULL,
  status TEXT NOT NULL, -- 'pending', 'running', 'completed', 'failed'
  result JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);
```

## Lambda Orchestrator Structure

```typescript
// lambda/orchestrator.ts
interface OrchestrationEvent {
  sessionId: string
  action: 'start' | 'resume'
  userId: string
  input?: string  // Only for 'start'
}

export async function handler(event: SQSEvent) {
  const startTime = Date.now()
  const TIMEOUT_BUFFER = 60000 // 1 minute before Lambda timeout
  const MAX_EXECUTION_TIME = 14 * 60 * 1000 // 14 minutes
  
  for (const record of event.Records) {
    const message: OrchestrationEvent = JSON.parse(record.body)
    
    try {
      // Load or create session
      const session = await loadSession(message.sessionId)
      
      // Update status
      await updateSession(session.id, { 
        status: 'running',
        execution_count: session.execution_count + 1 
      })
      
      // Main orchestration loop
      while (true) {
        // Check if we're approaching timeout
        if (Date.now() - startTime > MAX_EXECUTION_TIME - TIMEOUT_BUFFER) {
          await handleTimeout(session)
          return
        }
        
        // Get next LLM action
        const response = await callLLMWithTools(session.messages)
        
        if (response.toolCalls) {
          // Execute tools
          for (const toolCall of response.toolCalls) {
            const result = await executeToolWithTimeout(
              toolCall,
              MAX_EXECUTION_TIME - (Date.now() - startTime)
            )
            
            // Add to conversation
            session.messages.push({
              role: 'assistant',
              content: null,
              toolCalls: [toolCall]
            })
            session.messages.push({
              role: 'tool',
              toolCallId: toolCall.id,
              content: result
            })
            
            // Save progress
            await saveSession(session)
          }
        } else {
          // LLM is done - save final response
          await completeSession(session, response.content)
          return
        }
      }
    } catch (error) {
      await handleError(message.sessionId, error)
    }
  }
}

async function handleTimeout(session: Session) {
  // Save current state
  await updateSession(session.id, {
    status: 'resuming',
    messages: session.messages,
    tool_state: session.tool_state
  })
  
  // Queue resumption
  await sns.publish({
    TopicArn: process.env.ORCHESTRATION_TOPIC_ARN,
    Message: JSON.stringify({
      sessionId: session.id,
      action: 'resume',
      userId: session.user_id
    })
  })
}
```

## Tool Implementation Pattern

```typescript
// tools/panel-discussion.ts
export const panelDiscussionTool = {
  name: 'runPanelDiscussion',
  description: 'Run a panel discussion with multiple agents',
  parameters: {
    agents: { type: 'array', description: 'Agent specifications' },
    topic: { type: 'string', description: 'Discussion topic' },
    rounds: { type: 'number', description: 'Number of discussion rounds' }
  },
  
  async execute(params: any, context: ToolContext) {
    // This could run for hours!
    const { agents, topic, rounds } = params
    
    // Create execution record
    const execution = await context.db.createToolExecution({
      session_id: context.sessionId,
      tool_name: 'runPanelDiscussion',
      parameters: params,
      status: 'running'
    })
    
    const results = []
    
    for (let round = 0; round < rounds; round++) {
      // Check if we should yield (approaching timeout)
      if (context.shouldYield()) {
        // Save partial state
        await context.saveToolState({
          execution_id: execution.id,
          current_round: round,
          partial_results: results
        })
        
        // Tool will be resumed in next Lambda execution
        return { 
          status: 'partial',
          message: `Completed ${round} of ${rounds} rounds`,
          partial_results: results
        }
      }
      
      // Run discussion round
      const roundResult = await runDiscussionRound(agents, topic, round)
      results.push(roundResult)
    }
    
    // Complete execution
    await context.db.updateToolExecution(execution.id, {
      status: 'completed',
      result: results,
      completed_at: new Date()
    })
    
    return {
      status: 'completed',
      results
    }
  }
}
```

## Key Features

1. **Resumable**: Can pause and resume at any point
2. **Fault Tolerant**: Handles Lambda timeouts gracefully
3. **Stateful**: All conversation state persisted
4. **Scalable**: Each orchestration runs independently
5. **Observable**: Full audit trail of all executions
6. **Tool Agnostic**: Tools can run for any duration

## Edge Function Changes

```typescript
// supabase/functions/interact/index.ts
Deno.serve(async (req) => {
  // ... auth and validation ...
  
  // Create orchestration session
  const { data: session } = await supabase
    .from('orchestration_sessions')
    .insert({
      user_id: user.id,
      status: 'pending',
      messages: [{
        role: 'user',
        content: input
      }]
    })
    .select()
    .single()
  
  // Publish to SNS to start orchestration
  await publishToSNS({
    sessionId: session.id,
    action: 'start',
    userId: user.id,
    input
  })
  
  // Return immediately with session ID
  // User can subscribe to updates via Realtime
  return createResponse({
    sessionId: session.id,
    status: 'processing',
    message: 'Your request is being processed. Subscribe to updates using the session ID.'
  })
})
```

## Realtime Updates

Users subscribe to their orchestration session for live updates:

```typescript
// Frontend
const subscription = supabase
  .channel(`orchestration:${sessionId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'orchestration_sessions',
    filter: `id=eq.${sessionId}`
  }, (payload) => {
    if (payload.new.status === 'completed') {
      // Show final response
      displayResponse(payload.new.final_response)
    } else {
      // Show progress
      updateProgress(payload.new)
    }
  })
  .subscribe()
```

## Benefits

1. **No Timeouts**: Can run indefinitely by resuming
2. **Cost Efficient**: Only pay for actual execution time
3. **Resilient**: Handles failures gracefully
4. **Transparent**: Users see progress in real-time
5. **Flexible**: Tools can be simple or complex

This architecture enables true long-running AI orchestrations!