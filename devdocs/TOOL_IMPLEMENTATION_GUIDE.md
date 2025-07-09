# Tool Implementation Guide
## How Each Tool Was Built

### Table of Contents
1. [Overview](#overview)
2. [Agent Tools](#agent-tools)
3. [Interaction Tools](#interaction-tools)
4. [Analysis Tools](#analysis-tools)
5. [Memory Tools](#memory-tools)
6. [Verification System](#verification-system)
7. [Architecture Decisions](#architecture-decisions)

---

## Overview

The Hawking Edison orchestration system uses a tool-based architecture where an LLM (Claude or GPT-4) orchestrates various tools to accomplish user goals. Each tool is designed to be:

- **Simple**: Single-purpose with clear inputs/outputs
- **Composable**: Can be combined with other tools
- **Flexible**: Accepts natural language parameters
- **Verifiable**: Includes goal achievement verification

### Core Components

1. **Lambda Functions** (`infrastructure/cdk/lambda/`)
   - `orchestrator.ts`: Main orchestration loop
   - `llm-client.ts`: LLM integration (Claude & OpenAI)
   - `tools/`: Individual tool implementations

2. **Database** (`supabase/migrations/`)
   - `agent_memories`: Stores agent memory across sessions
   - `verification_logs`: Tracks verification results

---

## Agent Tools

### createAgent

**Purpose**: Create an agent with any persona, expertise, or perspective.

**Location**: `infrastructure/cdk/lambda/tools/agent.ts`

**Implementation**:
```typescript
{
  name: 'createAgent',
  description: 'Create an agent with any persona...',
  parameters: {
    specification: string,  // Natural language description
    name?: string          // Optional agent name
  },
  execute: async (args) => {
    // 1. Generate unique ID
    const agentId = `agent_${Date.now()}_${Math.random()...}`
    
    // 2. Use LLM to expand specification into rich persona
    const personaResponse = await callLLMWithTools([
      { role: 'system', content: 'Expand into detailed persona...' },
      { role: 'user', content: `Create persona for: ${specification}` }
    ])
    
    // 3. Return agent object
    return {
      id: agentId,
      name: args.name,
      specification: args.specification,
      persona: personaResponse.content
    }
  }
}
```

**Key Design Decisions**:
- No predefined agent types or templates
- LLM generates unique personas from natural language
- Agents are ephemeral by default (no storage)
- Simple structure allows infinite agent varieties

### createMultipleAgents

**Purpose**: Create diverse populations for simulations or panels.

**Implementation**:
```typescript
{
  name: 'createMultipleAgents',
  parameters: {
    count: number,
    populationDescription: string,
    variations?: string[]  // e.g., ['age', 'perspective']
  },
  execute: async (args) => {
    // 1. Use LLM to generate diverse specifications
    const specificationsResponse = await callLLMWithTools([
      { 
        role: 'system', 
        content: `Generate ${count} unique agent specifications...
                  Ensure variation in: ${variations}` 
      }
    ])
    
    // 2. Create each agent with unique specification
    for (const spec of specifications) {
      const agent = await createAgent.execute({ specification: spec })
      agents.push(agent)
    }
    
    return { agents, count, populationDescription }
  }
}
```

**Design Rationale**:
- LLM ensures diversity based on population description
- Variations parameter guides but doesn't constrain
- Scales from small panels to large simulations

---

## Interaction Tools

### runDiscussion

**Purpose**: Facilitate multi-agent discussions with various styles.

**Location**: `infrastructure/cdk/lambda/tools/interaction.ts`

**Implementation**:
```typescript
{
  name: 'runDiscussion',
  parameters: {
    agents: Agent[],
    topic: string,
    style?: string,     // 'debate', 'brainstorm', etc.
    rounds?: number
  },
  execute: async (args) => {
    const discussion = []
    
    // System prompt sets discussion context
    const messages = [{
      role: 'system',
      content: `Facilitate ${style} discussion about: ${topic}
                Participants: ${agents.map(a => a.persona)}`
    }]
    
    // Run discussion rounds
    for (let round = 0; round < rounds; round++) {
      for (const agent of agents) {
        // Generate each agent's contribution
        const response = await callLLMWithTools([
          ...messages,
          { 
            role: 'user', 
            content: `What does ${agent.name} say next?` 
          }
        ])
        
        discussion.push({
          agent: agent.name,
          content: response.content,
          round: round + 1
        })
        
        // Add to context for next speaker
        messages.push({
          role: 'assistant',
          content: `${agent.name}: ${response.content}`
        })
      }
    }
    
    return { topic, style, discussion, participants }
  }
}
```

**Key Features**:
- Maintains discussion context across turns
- Supports different discussion styles
- Each agent responds based on their persona
- Natural conversation flow

### gatherIndependentResponses

**Purpose**: Collect responses without cross-influence (surveys, voting).

**Implementation**:
```typescript
{
  name: 'gatherIndependentResponses',
  parameters: {
    agents: Agent[],
    prompt: string,
    structured?: boolean
  },
  execute: async (args) => {
    // Parallel processing for independence
    const responsePromises = agents.map(async (agent) => {
      const systemPrompt = structured
        ? `Respond with: reaction, key points, concerns, recommendation`
        : `Respond naturally as ${agent.persona}`
      
      const response = await callLLMWithTools([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ])
      
      return {
        agent: agent.name,
        response: response.content
      }
    })
    
    // Wait for all responses
    return await Promise.all(responsePromises)
  }
}
```

**Design Choices**:
- Parallel execution ensures true independence
- Structured option for consistent analysis
- No agent sees other responses

### conductInterview

**Purpose**: One agent interviews another with follow-ups.

**Implementation**:
```typescript
{
  name: 'conductInterview',
  parameters: {
    interviewer: Agent,
    interviewee: Agent,
    topic: string,
    depth?: number  // Number of follow-up questions
  },
  execute: async (args) => {
    const interview = []
    
    // Generate initial question
    const initialQ = await generateQuestion(interviewer, topic)
    interview.push({ type: 'question', content: initialQ })
    
    // Interview loop with follow-ups
    for (let i = 0; i < depth + 1; i++) {
      // Get answer
      const answer = await generateAnswer(interviewee, lastQuestion)
      interview.push({ type: 'answer', content: answer })
      
      // Generate follow-up if not last round
      if (i < depth) {
        const followUp = await generateFollowUp(interviewer, answer)
        interview.push({ type: 'follow-up', content: followUp })
      }
    }
    
    return { interviewer, interviewee, topic, transcript: interview }
  }
}
```

---

## Analysis Tools

### analyzeResponses

**Purpose**: Extract patterns, themes, and insights from responses.

**Location**: `infrastructure/cdk/lambda/tools/analysis.ts`

**Implementation**:
```typescript
{
  name: 'analyzeResponses',
  parameters: {
    responses: any[],
    focusAreas?: string[],  // ['sentiment', 'themes', 'consensus']
    groupBy?: string        // e.g., 'agent.demographics.age'
  },
  execute: async (args) => {
    // Create analysis prompt
    const analysisPrompt = `
      Analyze these ${responses.length} responses:
      ${JSON.stringify(responses)}
      
      Focus on: ${focusAreas.join(', ')}
      ${groupBy ? `Group by: ${groupBy}` : ''}
      
      Provide:
      1. Overall patterns
      2. Analysis of each focus area
      3. Key insights
      4. Outliers
    `
    
    // Get analysis from LLM
    const analysis = await callLLMWithTools([
      { role: 'system', content: 'You are an expert analyst...' },
      { role: 'user', content: analysisPrompt }
    ])
    
    // Verify analysis achieved its goal
    const verification = await verify(
      analysis,
      `Analyze ${responses.length} responses focusing on ${focusAreas}`,
      'analysis'
    )
    
    // Retry if verification failed
    if (!verification.goalAchieved && verification.confidence < 0.7) {
      // Retry with specific feedback
      const retry = await callLLMWithTools([
        { role: 'system', content: 'Previous analysis incomplete...' },
        { role: 'user', content: `${analysisPrompt}\nAddress: ${verification.issues}` }
      ])
      analysis.revised = retry.content
    }
    
    return { analysis, verification, metadata }
  }
}
```

**Verification Integration**:
- Every analysis is verified for completeness
- Low-confidence results trigger retry
- Verification feedback improves second attempt

### findConsensus

**Purpose**: Identify agreement and disagreement patterns.

**Implementation**:
```typescript
{
  name: 'findConsensus',
  parameters: {
    discussion: any,
    threshold?: number  // 0.7 = 70% agreement needed
  },
  execute: async (args) => {
    const consensusPrompt = `
      Find consensus with ${threshold * 100}% agreement threshold:
      
      Identify:
      1. Strong consensus (most/all agree)
      2. Partial consensus (many agree)
      3. Points of disagreement
      4. Nuanced positions
      5. Key insights from diversity
    `
    
    const consensus = await analyzeFull(discussion, consensusPrompt)
    const verification = await verify(consensus, goalDescription)
    
    return { consensus, threshold, verification }
  }
}
```

---

## Memory Tools

### giveAgentMemory

**Purpose**: Provide agents with context from previous interactions.

**Location**: `infrastructure/cdk/lambda/tools/memory.ts`

**Implementation**:
```typescript
{
  name: 'giveAgentMemory',
  parameters: {
    agent: Agent,
    memoryKey: string,      // e.g., 'sarah-analyst-project-alpha'
    scope?: string          // 'all', 'recent', or specific topic
  },
  execute: async (args) => {
    // 1. Fetch memories from database
    let query = supabase
      .from('agent_memories')
      .select('*')
      .eq('memory_key', memoryKey)
      .order('created_at', { ascending: false })
    
    if (scope === 'recent') {
      query = query.limit(10)
    }
    
    const { data: memories } = await query
    
    // 2. Create memory context
    const memoryContext = {
      memoryKey,
      memories: memories || [],
      instruction: `You have ${memories.length} previous interactions...`
    }
    
    // 3. Generate memory summary using LLM
    if (memories.length > 0) {
      const summary = await summarizeMemories(memories, agent)
      memoryContext.summary = summary
    }
    
    // 4. Return agent with memory
    return {
      ...agent,
      memoryContext,
      hasMemory: true
    }
  }
}
```

**Design Philosophy**:
- Memory is optional and tool-controlled
- LLM decides when agents need memory
- Supports different memory scopes
- Maintains agent ephemerality by default

### saveAgentMemory

**Purpose**: Persist interactions for future recall.

**Implementation**:
```typescript
{
  name: 'saveAgentMemory',
  parameters: {
    memoryKey: string,
    content: any,
    metadata?: any
  },
  execute: async (args) => {
    // 1. Generate embedding for semantic search
    const embedding = await generateEmbedding(JSON.stringify(content))
    
    // 2. Save to database
    const { data } = await supabase
      .from('agent_memories')
      .insert({
        user_id: context.userId,
        memory_key: memoryKey,
        content: content,
        embedding: embedding,
        metadata: metadata,
        session_id: context.sessionId
      })
    
    return { success: true, memoryId: data.id }
  }
}
```

### searchMemories

**Purpose**: Semantic search across all memories.

**Implementation**:
```typescript
{
  name: 'searchMemories',
  parameters: {
    query: string,
    memoryKeys?: string[],
    limit?: number
  },
  execute: async (args) => {
    // Generate query embedding
    const embedding = await generateEmbedding(query)
    
    // Semantic search (simplified for now)
    const results = await supabase
      .from('agent_memories')
      .select('*')
      .eq('user_id', context.userId)
      .limit(limit)
    
    return { query, results, count: results.length }
  }
}
```

---

## Verification System

### Core Verification Function

**Location**: `infrastructure/cdk/lambda/tools/verification.ts`

**Implementation**:
```typescript
export async function verify(
  result: any,
  goal: string,
  resultType: string
): Promise<VerificationResult> {
  // Create type-specific verification prompt
  const verificationPrompt = getVerificationPrompt(resultType, goal, result)
  
  // Use LLM to verify
  const response = await callLLMWithTools([
    {
      role: 'system',
      content: `Verify output achieves goal.
                Return JSON: {
                  goalAchieved: boolean,
                  confidence: 0-1,
                  issues: [],
                  suggestions: []
                }`
    },
    { role: 'user', content: verificationPrompt }
  ])
  
  return JSON.parse(response.content)
}
```

### Verification Integration Points

1. **Tool Level**: Each tool verifies its output
2. **Orchestrator Level**: Final response verification
3. **Retry Logic**: Failed verifications trigger retries

### Verification Prompts by Type

```typescript
function getVerificationPrompt(type, goal, result) {
  switch (type) {
    case 'agent':
      return `Verify agent matches specification...`
    case 'analysis':
      return `Verify analysis covers all areas...`
    case 'orchestrator':
      return `Verify user's intent was fulfilled...`
  }
}
```

---

## Architecture Decisions

### 1. No Types or Templates
- **Decision**: Use natural language for all specifications
- **Rationale**: Enables infinite flexibility
- **Example**: `createAgent("5 year old who loves dinosaurs")`

### 2. Ephemeral Agents with Optional Memory
- **Decision**: Agents don't persist by default
- **Rationale**: Simplicity and privacy
- **Implementation**: Memory is a separate tool

### 3. Tool Composability
- **Decision**: Each tool has single purpose
- **Rationale**: LLM can combine creatively
- **Example**: Create agents → Give memory → Run discussion

### 4. Verification at Every Level
- **Decision**: All outputs are verified
- **Rationale**: Ensures reliability
- **Cost**: Additional LLM calls

### 5. Parallel Execution
- **Decision**: Independent operations run in parallel
- **Rationale**: Performance optimization
- **Example**: `gatherIndependentResponses` uses Promise.all

### 6. Natural Language Parameters
- **Decision**: No enums or fixed options
- **Rationale**: LLM interprets intent
- **Example**: style: "heated debate" vs "collaborative brainstorm"

---

## Database Schema

### agent_memories Table
```sql
CREATE TABLE agent_memories (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  memory_key TEXT NOT NULL,      -- Groups related memories
  content JSONB NOT NULL,        -- Flexible content storage
  embedding vector(1536),        -- For semantic search
  metadata JSONB DEFAULT '{}',
  session_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX ON agent_memories(user_id, memory_key, created_at DESC);
CREATE INDEX ON agent_memories USING ivfflat (embedding vector_cosine_ops);
```

### verification_logs Table
```sql
CREATE TABLE verification_logs (
  id UUID PRIMARY KEY,
  interaction_id UUID,
  verification_type TEXT,        -- 'agent', 'analysis', etc.
  target_id TEXT,
  goal TEXT,
  result JSONB,                  -- VerificationResult
  created_at TIMESTAMPTZ
);
```

---

## Testing the Tools

### Unit Test Pattern
```typescript
describe('createAgent', () => {
  it('creates agent from specification', async () => {
    const agent = await createAgent.execute({
      specification: 'Security expert focused on web vulnerabilities'
    })
    
    expect(agent.id).toBeDefined()
    expect(agent.specification).toContain('Security expert')
    expect(agent.persona).toBeDefined()
  })
})
```

### Integration Test Pattern
```typescript
it('creates agents, gives memory, runs discussion', async () => {
  // Create agents
  const agents = await createMultipleAgents.execute({
    count: 3,
    populationDescription: 'Software architects'
  })
  
  // Give them memory
  for (const agent of agents) {
    await giveAgentMemory.execute({
      agent,
      memoryKey: 'architecture-discussion'
    })
  }
  
  // Run discussion
  const discussion = await runDiscussion.execute({
    agents,
    topic: 'Microservices vs Monolith',
    style: 'debate'
  })
  
  // Verify results
  expect(discussion.discussion.length).toBeGreaterThan(0)
})
```

---

## Common Patterns

### Pattern 1: Panel Discussion
```typescript
// LLM orchestrates:
const experts = await createMultipleAgents(5, "Industry experts")
const discussion = await runDiscussion(experts, topic, "panel", 3)
const consensus = await findConsensus(discussion)
const report = await generateReport(consensus)
```

### Pattern 2: Survey with Analysis
```typescript
// LLM orchestrates:
const population = await createMultipleAgents(100, "Target customers")
const responses = await gatherIndependentResponses(population, question)
const analysis = await analyzeResponses(responses, ["sentiment", "intent"])
```

### Pattern 3: Ongoing Project
```typescript
// LLM orchestrates:
const sarah = await createAgent("Sarah Chen, our analyst")
await giveAgentMemory(sarah, "q4-project")
const analysis = await sarah.analyze(newData)
await saveAgentMemory("q4-project", analysis)
```

---

## Future Enhancements

1. **Vector Embeddings**: Real semantic search implementation
2. **Streaming**: Real-time updates during long operations
3. **Visualization Tools**: Chart/graph generation
4. **External Data**: Web scraping, API integration
5. **Advanced Memory**: Summarization, forgetting strategies