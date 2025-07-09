# Hawking Edison v2: Complete Architecture
## LLM Orchestration + Memory + Personal Databank

### The Three Pillars

```
1. LLM Orchestrator with Tools
   └── Decides everything

2. Agent Memory System  
   └── Agents can remember when needed

3. User Databank
   └── Personal knowledge base for creating and informing agents
```

### How They Work Together

```typescript
// User says: "Get Sarah Chen's take on this acquisition, she should review the latest research"

// LLM Orchestrates:
1. searchDatabank("Sarah Chen") // Find her profile
2. createAgentFromProfile("Sarah Chen") // Create agent based on real person
3. giveAgentMemory(sarah, "sarah-acquisition-history") // Give her memory
4. searchDatabank("acquisition research") // Find relevant research  
5. giveAgentDatabank(sarah, "latest M&A research") // Give her access
6. sarah.analyze(acquisitionProposal) // Get her informed opinion
7. saveAgentMemory("sarah-acquisition-history", newInsights) // Remember for next time
```

### Complete Tool Set

```typescript
// Databank Tools (Personal Knowledge Base)
- addToDatabank(content, metadata)
- searchDatabank(query, filters?)
- createAgentFromProfile(profileQuery)
- giveAgentDatabank(agent, query)
- importFromURL(url) // For browser extension

// Memory Tools (Agent Continuity)
- giveAgentMemory(agent, memoryKey)
- saveAgentMemory(memoryKey, content)
- searchMemories(query)
- listMemoryStreams()

// Core Agent Tools
- createAgent(specification)
- createMultipleAgents(count, description)

// Interaction Tools
- runDiscussion(agents, topic)
- gatherIndependentResponses(agents, prompt)
- conductInterview(interviewer, interviewee, topic)

// Analysis & Visualization Tools
- analyzeResponses(responses)
- createVisualization(data, goal)
- generateReport(title, sections)
```

### Database Schema

```sql
-- User's Personal Databank
CREATE TABLE databank (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB, -- type, source, tags, name
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Memories
CREATE TABLE agent_memories (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  memory_key TEXT,
  content JSONB,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interactions (for tracking)
CREATE TABLE interactions (
  id UUID PRIMARY KEY,
  user_id UUID,
  input TEXT,
  tool_calls JSONB,
  result JSONB,
  created_at TIMESTAMPTZ
);

-- No agent storage - they're created fresh each time!
```

### The Magic: Everything is Emergent

**Scenario 1: One-off Question**
```
User: "What's the capital of France?"
LLM: createAgent("geography assistant") // No memory or databank needed
```

**Scenario 2: Recurring Expert**
```
User: "What does Sarah think about this?"
LLM: searchDatabank("Sarah") → createAgentFromProfile() → giveAgentMemory()
```

**Scenario 3: Research Panel**
```
User: "Analyze this paper with top ML researchers"
LLM: searchDatabank("ML researchers") → create multiple agents → give them paper access
```

**Scenario 4: Company Simulation**
```
User: "How would my team react?"
LLM: searchDatabank(filters: {tags: ["team"]}) → create team → give company context
```

### Browser Extension Role

```typescript
// Simple: Import anything to databank
chrome.action.onClicked.addListener(async () => {
  const content = await extractPageContent();
  const type = detectType(); // LinkedIn, research, article
  
  await api.addToDatabank(content, {
    type: type,
    url: tab.url,
    title: tab.title
  });
  
  showNotification("Added to your Hawking Edison databank!");
});
```

### Why This Architecture Works

1. **Simple Core**: Just LLM + Tools
2. **Optional Complexity**: Memory and databank used only when needed
3. **Natural Usage**: Import profiles → Create realistic agents
4. **Growing Intelligence**: More data = Better agents
5. **Privacy First**: Your data shapes your agents

### User Journey

1. **New User**: Works immediately with generic agents
2. **First Import**: Adds a LinkedIn profile, agents become more realistic
3. **Building Knowledge**: Adds research papers, agents become informed
4. **Ongoing Projects**: Agents remember previous discussions
5. **Power User**: Rich databank + memory = incredibly intelligent agents

### Implementation Priority

**Week 1-2: Core + Databank**
- Basic orchestrator
- Databank tools (critical from day 1)
- Simple agent creation

**Week 3-4: Memory + Intelligence** 
- Memory tools
- Profile-based agents
- Databank search

**Week 5-6: Full Integration**
- Browser extension
- Advanced orchestration
- Optimization

### The Beautiful Simplicity

Users just:
1. Import profiles and documents naturally
2. Ask questions in plain English
3. Get intelligent responses from realistic agents

The system handles all complexity:
- Creating agents from real profiles
- Giving them relevant knowledge
- Maintaining continuity when needed
- Presenting results perfectly

No configuration. No templates. Just intelligence augmented by personal knowledge.