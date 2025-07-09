# Agent Memory Architecture
## A Fundamental Design Decision

### The Core Question
Should agents remember? This affects:
- Agent persistence vs ephemerality
- Database design
- Tool design
- User experience
- System complexity

### Three Possible Approaches

## Approach 1: Ephemeral Agents (Current Plan)
```typescript
// Every interaction creates fresh agents
const agent = await createAgent("McKinsey analyst");
// Agent exists only for this interaction
// No memory of previous conversations
```

**Pros:**
- Simple implementation
- No storage needed
- Predictable behavior
- Lower costs

**Cons:**
- No continuity
- Can't build on previous work
- Feels less intelligent
- Repetitive for users

## Approach 2: Persistent Agents with Memory
```typescript
// Agents have identity and memory
const agent = await createOrRetrieveAgent({
  specification: "McKinsey analyst named Sarah",
  persistenceId: "sarah-analyst"
});
// Agent remembers all previous interactions
```

**Pros:**
- Agents learn and improve
- Natural continuity
- Builds relationships
- More intelligent behavior

**Cons:**
- Complex state management
- Storage costs
- Privacy concerns
- Harder to debug

## Approach 3: Hybrid - Memory as a Tool
```typescript
// Memory is optional and controlled by LLM
const agent = await createAgent("McKinsey analyst");
await giveMemory(agent, "project-alpha-analyst");
// LLM decides when to use memory
```

**This is the way.**

### Recommended Architecture: Memory as a Tool

Instead of building memory into agents, we make memory another tool the LLM can use:

```typescript
// Core agent creation remains simple
const createAgent = {
  name: "createAgent",
  description: "Create an agent with any persona",
  execute: async (specification: string) => {
    return new Agent(specification); // Still ephemeral
  }
};

// Memory becomes a separate tool
const giveAgentMemory = {
  name: "giveAgentMemory",
  description: "Give an agent memory of previous interactions",
  parameters: {
    agent: "The agent to give memory to",
    memoryKey: "Unique identifier for this memory stream",
    scope: "What type of memories to include"
  },
  execute: async (agent: Agent, memoryKey: string, scope?: string) => {
    const memories = await fetchMemories(memoryKey, scope);
    agent.addContext(memories);
    return agent;
  }
};

// Saving memories is also a tool
const saveAgentMemory = {
  name: "saveAgentMemory",
  description: "Save an agent's current interaction for future recall",
  parameters: {
    agent: "The agent whose memory to save",
    memoryKey: "Where to store this memory",
    content: "What happened in this interaction"
  },
  execute: async (agent: Agent, memoryKey: string, content: any) => {
    await storeMemory(memoryKey, {
      agentSpec: agent.specification,
      interaction: content,
      timestamp: new Date()
    });
  }
};
```

### How This Works in Practice

**User**: "Continue our discussion about the acquisition"

**LLM thinks**: "They want to continue a previous discussion. I should create agents with memory."

**LLM does**:
```typescript
// Creates fresh agents
const analysts = await Promise.all([
  createAgent("M&A specialist"),
  createAgent("Financial analyst"),
  createAgent("Risk expert")
]);

// Gives them memory of previous discussion
for (const analyst of analysts) {
  await giveAgentMemory(analyst, "acquisition-discussion", "all");
}

// They now remember and can continue
await runDiscussion(analysts, "Continue analyzing the acquisition");

// Save new insights
await saveAgentMemory(analysts[0], "acquisition-discussion", discussion);
```

### Database Schema Update

```sql
-- Agents still not stored, but memories are
CREATE TABLE agent_memories (
  id UUID PRIMARY KEY,
  memory_key TEXT NOT NULL,
  agent_specification TEXT,
  content JSONB,
  embedding vector(1536), -- For semantic search
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  
  -- Index for fast retrieval
  INDEX idx_memory_key (memory_key, created_at DESC)
);
```

### Benefits of This Approach

1. **LLM Decides**: The LLM determines when memory is needed
2. **Flexible**: Can have memoryless agents or agents with deep history
3. **Composable**: Memory is just another tool to combine
4. **Searchable**: Can search across all memories semantically
5. **Privacy-Friendly**: Clear memory boundaries and deletion

### Example Scenarios

**Scenario 1: One-off question**
```
User: "What's 2+2?"
LLM: Creates simple agent, no memory needed
```

**Scenario 2: Ongoing project**
```
User: "Let's continue the product design discussion"
LLM: Creates designers, gives them memory of previous sessions
```

**Scenario 3: Mixed needs**
```
User: "Get Sarah's opinion on this new data"
LLM: Creates "Sarah" with her memory, creates new analysts without
```

### Implementation Impact

This changes our tool design:

```typescript
// Tool to find relevant memories
const searchMemories = {
  name: "searchMemories",
  description: "Search for relevant past interactions",
  parameters: {
    query: "What to search for",
    memoryKeys: "Optional specific memory streams"
  }
};

// Tool to list available memory streams
const listMemoryStreams = {
  name: "listMemoryStreams",
  description: "See what ongoing conversations/projects exist"
};

// Tool to create persistent workspaces
const createWorkspace = {
  name: "createWorkspace",
  description: "Create a space where agents can have ongoing memory",
  parameters: {
    name: "Workspace name",
    description: "What this workspace is for"
  }
};
```

### The Beautiful Emergence

With memory as a tool:
- **One-shot interactions**: Work perfectly, no complexity
- **Ongoing projects**: LLM creates continuity when needed
- **Named agents**: "Sarah the analyst" can persist across sessions
- **Team formation**: LLM can assemble recurring teams
- **Learning**: Agents can build knowledge over time

All without hardcoding any of these concepts!