# Orchestration Event Logging Fix

## Problem
The Lambda orchestrator was failing to log events to the `orchestration_events` table because it was using event types that aren't allowed by the database constraint.

## Root Cause
The `orchestration_events` table has a CHECK constraint that only allows specific event types:
- tool_call
- tool_result
- verification
- retry
- thinking
- status_update
- error
- context_compression

But the Lambda code was trying to use:
- `agent_created` (in tools/agent.ts)
- `agent_thought` (in tools/interaction.ts)
- `discussion_turn` (in tools/interaction.ts)

## Solution
Instead of modifying the database constraint (which would require a migration), we updated the Lambda code to use valid event types:

### 1. agent_created → tool_result
```typescript
// Before
p_event_type: 'agent_created',
p_event_data: {
  agent_id: agentId,
  name: args.name,
  ...
}

// After
p_event_type: 'tool_result',
p_event_data: {
  tool: 'createAgent',
  success: true,
  result: {
    agent_id: agentId,
    name: args.name,
    ...
  }
}
```

### 2. agent_thought → thinking
```typescript
// Before
p_event_type: 'agent_thought',
p_event_data: {
  agent_id: agent.id,
  thought: response.content,
  ...
}

// After
p_event_type: 'thinking',
p_event_data: {
  content: response.content,
  step: 'agent_discussion',
  agent_context: {
    agent_id: agent.id,
    ...
  }
}
```

### 3. discussion_turn → tool_result
```typescript
// Before
p_event_type: 'discussion_turn',
p_event_data: {
  agent_id: agent.id,
  message: finalContent,
  ...
}

// After
p_event_type: 'tool_result',
p_event_data: {
  tool: 'runDiscussion',
  success: true,
  result: {
    agent_id: agent.id,
    message: finalContent,
    ...
  }
}
```

## Files Modified
1. `/infrastructure/cdk/lambda/tools/agent.ts` - Fixed agent_created event
2. `/infrastructure/cdk/lambda/tools/interaction.ts` - Fixed agent_thought and discussion_turn events

## Verification
Created test scripts to verify the fixes:
- `/utils/test-orchestration-logging.ts` - Tests all event types
- `/utils/verify-orchestration-fixes.ts` - Verifies the specific fixes

## Next Steps
1. Deploy the updated Lambda code
2. Monitor orchestration_events table to ensure events are being logged
3. Consider adding a migration later if we need the original event type names

## Alternative Solution (Not Implemented)
If we need to keep the original event type names, we can create a migration:
```sql
-- /supabase/migrations/20250114_add_missing_event_types.sql
ALTER TABLE orchestration_events 
DROP CONSTRAINT orchestration_events_event_type_check;

ALTER TABLE orchestration_events 
ADD CONSTRAINT orchestration_events_event_type_check 
CHECK (event_type IN (
  -- existing types...
  'agent_created',
  'agent_thought',
  'discussion_turn'
));
```

But this requires resolving migration conflicts first.