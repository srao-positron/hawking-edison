# Hawking Edison v2: Master Development Plan
## LLM-Orchestrated Multi-Agent Intelligence with Memory

### Table of Contents
1. [Revolutionary Approach](#revolutionary-approach)
2. [Core Architecture](#core-architecture)
3. [The Tools (Including Memory)](#the-tools-including-memory)
4. [Implementation Guide](#implementation-guide)
5. [Three Killer Demos Revisited](#three-killer-demos-revisited)
6. [Development Timeline](#development-timeline)
7. [Key Principles](#key-principles)

---

## Revolutionary Approach

### The Paradigm Shift
We're not building a platform that understands requests and creates agents. We're giving an LLM powerful tools and letting it orchestrate everything - including whether agents should remember.

**Old Way**: Input → Parse Intent → Create Agents → Execute → Present  
**New Way**: Input → LLM with Tools → Magic Happens → Present

### Why This Changes Everything
1. **No Intent Extraction**: We don't parse what the user wants
2. **No Agent Types**: The LLM creates whatever agents make sense
3. **No Workflow Templates**: The LLM decides the flow
4. **Memory is Optional**: The LLM decides if agents need memory
5. **True Intelligence**: The LLM is the brain, not our code

---

## Core Architecture

### The Entire System

```typescript
class HawkingEdison {
  private orchestrator: LLMOrchestrator;
  
  async process(input: string, context?: Context): Promise<Result> {
    // That's it. The LLM does everything.
    return await this.orchestrator.run(input, context);
  }
}

class LLMOrchestrator {
  constructor(private tools: ToolKit) {}
  
  async run(input: string, context?: Context): Promise<Result> {
    // Give LLM the user's request and all tools
    return await llm.process({
      instructions: `
        Help the user with: ${input}
        Context: ${context}
        
        You have tools to:
        - Create agents (with or without memory)
        - Run interactions
        - Save and retrieve memories
        - Analyze data
        - Visualize results
        
        Figure out the best approach and execute it.
      `,
      tools: this.tools,
      stream: true
    });
  }
}
```

---

## The Tools (Including Memory)

### Core Tool Set

```typescript
const tools = {
  // Agent Creation (Ephemeral by default)
  createAgent: {
    description: "Create an agent with any persona, expertise, or perspective",
    execute: async (specification: string) => {
      return new Agent(await generatePersona(specification));
    }
  },
  
  // Memory Tools (NEW!)
  giveAgentMemory: {
    description: "Give an agent memory of previous interactions",
    parameters: {
      agent: "The agent to give memory to",
      memoryKey: "Identifier for this memory stream (e.g., 'sarah-analyst', 'project-alpha')"
    },
    execute: async (agent: Agent, memoryKey: string) => {
      const memories = await fetchMemories(memoryKey);
      agent.addContext(memories);
      return agent;
    }
  },
  
  saveAgentMemory: {
    description: "Save current interaction for future recall",
    parameters: {
      memoryKey: "Where to store this memory",
      content: "What to remember"
    },
    execute: async (memoryKey: string, content: any) => {
      await storeMemory(memoryKey, content);
    }
  },
  
  searchMemories: {
    description: "Search across all saved memories",
    parameters: {
      query: "What to search for"
    },
    execute: async (query: string) => {
      return await semanticMemorySearch(query);
    }
  },
  
  // Interaction Tools (Same as before)
  runDiscussion: {
    description: "Have agents discuss a topic together",
    execute: async (agents: Agent[], topic: string) => {
      return await facilitateDiscussion(agents, topic);
    }
  },
  
  gatherResponses: {
    description: "Get independent responses from many agents",
    execute: async (agents: Agent[], prompt: string) => {
      return await Promise.all(agents.map(a => a.respond(prompt)));
    }
  }
  
  // ... other tools remain the same
};
```

### How Memory Works

**User says**: "Continue our discussion about the acquisition"

**LLM recognizes** this needs continuity and:
```typescript
1. searchMemories("acquisition discussion")
2. createAgent("M&A specialist Sarah Chen")
3. giveAgentMemory(sarah, "acquisition-sarah-memory")
4. createAgent("CFO perspective")
5. giveAgentMemory(cfo, "acquisition-cfo-memory")
6. runDiscussion([sarah, cfo], "Continue acquisition analysis")
7. saveAgentMemory("acquisition-sarah-memory", newInsights)
```

**User says**: "What's the weather?"

**LLM recognizes** this needs no memory and:
```typescript
1. createAgent("weather assistant")
2. // No memory needed, just responds
```

---

## Implementation Guide

### Phase 1: Core Tools & Memory (Week 1-3)

#### Database Schema Update
```sql
-- Minimal schema with memory support
CREATE TABLE interactions (
  id UUID PRIMARY KEY,
  user_id UUID,
  input TEXT,
  tool_calls JSONB,
  result JSONB,
  created_at TIMESTAMPTZ
);

CREATE TABLE agent_memories (
  id UUID PRIMARY KEY,
  user_id UUID,
  memory_key TEXT,
  content JSONB,
  embedding vector(1536),
  created_at TIMESTAMPTZ,
  
  INDEX idx_memory_lookup (user_id, memory_key, created_at DESC)
);

CREATE TABLE knowledge (
  id UUID PRIMARY KEY,
  user_id UUID,
  content TEXT,
  embedding vector(1536),
  metadata JSONB
);
```

#### Memory Implementation
```typescript
// src/tools/memory.ts
export const memoryTools = {
  giveAgentMemory: {
    execute: async (agent: Agent, memoryKey: string) => {
      const memories = await supabase
        .from('agent_memories')
        .select('content')
        .eq('memory_key', memoryKey)
        .order('created_at', { ascending: false })
        .limit(10);
      
      agent.addContext({
        memories: memories.data,
        instruction: "You have access to these previous interactions"
      });
      
      return agent;
    }
  },
  
  saveAgentMemory: {
    execute: async (memoryKey: string, content: any) => {
      const embedding = await generateEmbedding(JSON.stringify(content));
      
      await supabase
        .from('agent_memories')
        .insert({
          memory_key: memoryKey,
          content: content,
          embedding: embedding
        });
    }
  }
};
```

### Phase 2-4: (Remain largely the same)
- Enhanced tools
- Visualization
- Production features

---

## Three Killer Demos Revisited

### Demo 1: "Should OpenAI buy Anthropic?" (With Memory)

**First interaction:**
```
User: "Should OpenAI buy Anthropic?"
LLM: Creates analysts, runs discussion, saves key insights
     saveAgentMemory("openai-anthropic-analysis", insights)
```

**Follow-up interaction:**
```
User: "What did our analysts think about the regulatory risks?"
LLM: searchMemories("openai anthropic regulatory")
     createAgent("Sarah Chen, our regulatory expert")
     giveAgentMemory(sarah, "openai-anthropic-analysis")
     "Sarah recalls our previous discussion..."
```

### Demo 2: "Review this GitHub PR" (Ephemeral)

Most code reviews don't need memory, so:
```
LLM: Creates fresh reviewers each time
     No memory tools used
     Clean, simple review
```

### Demo 3: "Continue testing the climate message" (With Memory)

```
User: "How is our climate message testing going?"
LLM: searchMemories("climate message testing")
     Shows previous results
     "Would you like to test with a new demographic?"
```

---

## Development Timeline

### Week 1-3: Foundation with Memory
- Basic tool implementations
- Memory tools (give, save, search)
- Simple LLM orchestrator
- Database with memory support

### Week 4-6: Intelligence Enhancement
- Sophisticated memory search
- Agent personality persistence
- Workspace concept
- Memory visualization

### Week 7-12: (Same as before)
- Production features
- Polish
- Launch

---

## Key Principles

### Development Mantras

1. **"Memory is just a tool"** - Not built into agents
2. **"Let the LLM decide"** - When to use memory
3. **"Agents are ephemeral"** - Unless given memory
4. **"No agent storage"** - Just memory storage

### What Success Looks Like

- One-off questions work perfectly without memory
- Ongoing projects maintain continuity naturally
- Named agents ("Sarah") persist across sessions when needed
- No hardcoded memory rules

---

## The Beautiful Simplicity

Agents are created fresh each time, but the LLM can give them memory when needed. This provides:

1. **Simplicity**: No complex agent lifecycle
2. **Flexibility**: Memory when useful, not when not
3. **Intelligence**: LLM decides what needs remembering
4. **Privacy**: Clear memory boundaries

The user never thinks about memory - it just works when it should.