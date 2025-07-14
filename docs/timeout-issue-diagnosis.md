# Orchestration Timeout Issue Diagnosis

## Problem
User sees "Request timed out" message in chat interface even though the orchestration Lambda is still running.

## Root Cause
There's a timeout mismatch between:
- **Lambda function**: 14 minutes timeout
- **Client-side**: 5 minutes timeout (hardcoded in ChatInterface.tsx line 568)

## What's Happening

1. User submits a complex request
2. Edge Function immediately returns with `sessionId` and `status: 'processing'`
3. Client shows "🤔 Thinking..." and subscribes to Realtime updates
4. Lambda processes the request (can take 5-14 minutes)
5. After 5 minutes, client timeout triggers:
   - Shows "Request timed out. Please try again."
   - Unsubscribes from Realtime channel
6. Lambda continues processing and eventually completes
7. User never sees the actual response

## Solutions

### Option 1: Increase Client Timeout (Quick Fix)
Change the timeout from 5 minutes to 13 minutes:
```typescript
// ChatInterface.tsx line 568
}, 13 * 60 * 1000) // 13 minutes instead of 5
```

### Option 2: Remove Client Timeout (Better)
Since we have Realtime subscriptions, we don't need a client timeout. The Lambda will either:
- Complete and send the response
- Fail and update the session status to 'failed'
- Hit its own 14-minute timeout

### Option 3: Show Progress Updates (Best)
- Keep a reasonable timeout (10-15 minutes)
- Show periodic progress updates from orchestration events
- Allow user to cancel/restart if needed

## Additional Issues to Check

1. **Realtime Connection**: Is the Realtime subscription staying connected?
2. **Session Updates**: Is the Lambda properly updating the session status?
3. **Network Issues**: Are there any proxy/firewall timeouts?

## Debugging Steps

1. Check browser console for Realtime subscription logs
2. Check orchestration_sessions table for status updates
3. Check Lambda CloudWatch logs for completion
4. Verify the orchestration events are being logged