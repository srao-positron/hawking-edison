#\!/usr/bin/env node
// Test script to verify orchestration UI behavior
// Run with: node utils/test-orchestration-ui.ts

console.log(`
🧪 Testing Orchestration UI Behavior
===================================

Current Issue:
- Details button shows on first run ✅
- Details button disappears on page refresh ❌

Root Cause:
- checkActiveOrchestrations() only looks for ACTIVE sessions
- On refresh, completed orchestrations aren't found
- Details button visibility depends on finding active orchestration

Solution:
- Details button should ALWAYS show when message has orchestrationSessionId
- Don't depend on orchestration status (active/completed)
- The metadata is correctly stored and retrieved

To Fix:
1. Remove dependency on active orchestration check for Details visibility
2. Rely solely on message.orchestrationSessionId presence
3. Load orchestration events regardless of status when Details clicked

Test Steps:
1. Run a query that triggers orchestration
2. See Details button appear ✅
3. Refresh the page
4. Details button should still be visible ✅ (currently fails)
`)
EOF < /dev/null