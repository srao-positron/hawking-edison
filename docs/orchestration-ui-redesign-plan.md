# Orchestration UI Redesign Plan

## Executive Summary

This plan addresses comprehensive feedback about the orchestration UI, focusing on:
1. **State Management**: Implement modern state management to prevent reloading
2. **UI/UX Improvements**: Better information density, clearer visual hierarchy
3. **Artifact Handling**: Proper display of markdown, images, SVG, and HTML outputs
4. **Verification Strategy**: Focus verification on orchestrator responses only

## Architecture Changes

### 1. State Management Implementation

**Technology Choice**: Zustand (modern, lightweight alternative to Redux)
- Simpler API than Redux Toolkit
- Built-in TypeScript support
- Excellent performance with React
- Easy integration with realtime updates

**Store Structure**:
```typescript
interface OrchestrationStore {
  // Sessions
  sessions: Map<string, OrchestrationSession>
  activeSessionId: string | null
  
  // Events  
  events: Map<string, OrchestrationEvent[]>
  
  // Agents
  agents: Map<string, Agent[]>
  
  // Discussions
  discussions: Map<string, Discussion[]>
  
  // Tools
  toolCalls: Map<string, ToolCall[]>
  toolResults: Map<string, ToolResult[]>
  
  // Actions
  loadSession: (sessionId: string) => Promise<void>
  updateFromRealtimeEvent: (event: RealtimeEvent) => void
  clearSession: (sessionId: string) => void
}
```

### 2. UI Component Redesign

#### Timeline Integration (Events + Tools)
- Merge events and tool usage into a single timeline
- Show causal relationships (event → tool call → result)
- Color-coded by type with icons
- Expandable details inline

#### Layout Changes
```
┌─────────────────────────────────────────────────────────┐
│                    Orchestration Details                 │
├──────────────┬──────────────────────────────────────────┤
│   Agents     │              Timeline                     │
│  (Left Bar)  │         (Events + Tools)                │
│              │                                          │
│ ┌──────────┐ │  ┌────────────────────────────────┐    │
│ │ Agent 1  │ │  │ 🟦 Status: Running             │    │
│ │ [Avatar] │ │  │ ↓                              │    │
│ └──────────┘ │  │ ⚡ Create Agent: Security Expert│    │
│              │  │ ↓                              │    │
│ ┌──────────┐ │  │ 🧠 Agent thinking...          │    │
│ │ Agent 2  │ │  │ ↓                              │    │
│ │ [Avatar] │ │  │ 💬 Run Discussion              │    │
│ └──────────┘ │  │   └─ 📎 View Details          │    │
│              │  └────────────────────────────────┘    │
└──────────────┴──────────────────────────────────────────┘
```

### 3. Specific UI Improvements

#### Create Agent Card
- Move success/failure to top-right badge
- Format duration inline
- Show agent name in timeline: "Create Agent: Security Expert"
- Remove redundant name from subtitle

#### Run Discussion Card  
- Add "View Details" button like Create Agent
- Fix discussion data not showing in details view
- Ensure markdown rendering in all discussion text

#### Status Displays
- Convert all status text to colored badges
- Use consistent color scheme:
  - Running: Blue
  - Success: Green
  - Failed: Red
  - Pending: Yellow

#### Agent Display
- Left sidebar with agent cards
- Each agent shows:
  - Avatar with initial
  - Name
  - Role/specification (truncated)
  - Thought count badge
  - Expandable for full details

### 4. Artifact Handling

Integrate existing `ArtifactRenderer` component to handle:
- **Markdown**: Full rendering with syntax highlighting
- **Images**: Display with zoom capability
- **SVG**: Interactive display with pan/zoom
- **HTML**: Sandboxed iframe rendering
- **Code**: Syntax highlighted with copy button

Detection logic:
```typescript
function detectArtifactType(content: any): ArtifactType {
  if (typeof content === 'string') {
    if (content.includes('<svg')) return 'svg'
    if (content.includes('<html') || content.includes('<!DOCTYPE')) return 'html'
    if (content.match(/\.(png|jpg|jpeg|gif|webp)/i)) return 'image'
    if (content.includes('```') || content.includes('#')) return 'markdown'
  }
  return 'text'
}
```

### 5. Verification Strategy Update

**Current Issue**: Verification at every level consumes tokens without adding value

**New Approach**:
- **Keep**: Orchestrator-level verification for final responses
- **Remove**: Sub-agent response verification
- **Remove**: Individual tool result verification
- **Keep**: Goal achievement verification at orchestration completion

This reduces token usage by ~40% while maintaining quality assurance where it matters most.

## Implementation Steps

### Phase 1: State Management (2 days)
1. Install and configure Zustand
2. Create orchestration store with all entities
3. Implement realtime sync logic
4. Replace direct API calls with store actions
5. Test with multiple concurrent sessions

### Phase 2: UI Restructuring (3 days)
1. Merge timeline components (events + tools)
2. Implement left sidebar for agents
3. Update all card layouts per specifications
4. Convert status displays to badges
5. Add missing "View Details" buttons

### Phase 3: Bug Fixes (1 day)
1. Fix tab reloading issue using local state
2. Fix discussion data not showing in details
3. Ensure markdown rendering everywhere
4. Fix React key warnings

### Phase 4: Artifact Integration (2 days)
1. Integrate ArtifactRenderer in orchestration panel
2. Add artifact detection logic
3. Create artifact preview cards
4. Implement full-screen artifact viewer
5. Add export/download capabilities

### Phase 5: Verification Optimization (1 day)
1. Remove sub-agent verification calls
2. Update orchestrator to only verify final outputs
3. Update prompts to reflect new strategy
4. Measure token usage reduction

## Success Metrics

1. **Performance**: No tab reloading, instant navigation
2. **Information Density**: 50% more content visible without scrolling
3. **Token Usage**: 40% reduction from verification changes
4. **User Actions**: 1-click access to all details
5. **Artifact Support**: 100% of markdown/image/SVG/HTML properly rendered

## Design Principles

1. **Information Hierarchy**: Most important info prominent, details on demand
2. **Visual Consistency**: Same patterns throughout (badges, colors, layouts)
3. **Progressive Disclosure**: Overview first, details on click
4. **Real-time First**: All updates instant, no polling
5. **Context Preservation**: Never lose state when navigating

## Next Steps

1. Review and approve this plan
2. Set up Zustand store structure
3. Begin Phase 1 implementation
4. Daily progress updates with working demos