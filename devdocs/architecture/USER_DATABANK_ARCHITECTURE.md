# User Databank Architecture
## Personal Knowledge Base for Agents and Orchestration

### Core Concept
Every user has a personal databank where they store:
- LinkedIn profiles for agent creation
- Research papers for agent knowledge
- Documents, notes, and references
- Web pages and articles
- Any text-based information

Both the LLM orchestrator and the agents it creates can access this databank.

### How It's Different from Agent Memory

**Agent Memory**: What agents remember from interactions
**User Databank**: Source material for creating agents and answering questions

```
User Databank
├── LinkedIn Profiles → Create agents based on real people
├── Research Papers → Agents can cite and use
├── Company Docs → Context for decisions
├── Web Articles → Background knowledge
└── Personal Notes → User's own insights
```

### Architecture: Databank as Tools

```typescript
// Tools for managing the databank
const addToDatabank = {
  name: "addToDatabank",
  description: "Store information in user's personal knowledge base",
  parameters: {
    content: {
      type: "string",
      description: "Information to store (text, document, profile)"
    },
    metadata: {
      type: "object",
      description: "Information about this content",
      example: {
        type: "linkedin_profile",
        name: "Sarah Chen",
        source: "https://linkedin.com/in/sarahchen",
        tags: ["M&A", "consultant", "McKinsey"]
      }
    }
  },
  execute: async (content: string, metadata: object) => {
    const embedding = await generateEmbedding(content);
    await storeInDatabank(content, embedding, metadata);
  }
};

const searchDatabank = {
  name: "searchDatabank",
  description: "Search user's personal knowledge base",
  parameters: {
    query: {
      type: "string",
      description: "What to search for"
    },
    filters: {
      type: "object",
      description: "Optional filters",
      optional: true,
      example: { type: "linkedin_profile", tags: ["consultant"] }
    }
  },
  execute: async (query: string, filters?: object) => {
    return await semanticSearch(query, filters);
  }
};

const createAgentFromProfile = {
  name: "createAgentFromProfile",
  description: "Create an agent based on a profile in the databank",
  parameters: {
    profileQuery: {
      type: "string",
      description: "Description of who to base the agent on",
      example: "Sarah Chen from McKinsey"
    },
    additionalContext: {
      type: "string",
      description: "Additional personality traits or focus areas",
      optional: true
    }
  },
  execute: async (profileQuery: string, additionalContext?: string) => {
    // Search databank for matching profile
    const profiles = await searchDatabank(profileQuery, { type: "profile" });
    
    if (profiles.length > 0) {
      const profile = profiles[0];
      const agentSpec = await generateAgentFromProfile(profile, additionalContext);
      return createAgent(agentSpec);
    } else {
      // Fallback to generic agent
      return createAgent(profileQuery);
    }
  }
};

const giveAgentDatabank = {
  name: "giveAgentDatabank",
  description: "Give an agent access to specific databank information",
  parameters: {
    agent: {
      type: "Agent",
      description: "Agent to give access to"
    },
    query: {
      type: "string", 
      description: "What information to give access to",
      example: "all research papers about AI safety"
    }
  },
  execute: async (agent: Agent, query: string) => {
    const relevantData = await searchDatabank(query);
    agent.addKnowledge(relevantData);
    return agent;
  }
};
```

### How It Works in Practice

#### Example 1: Creating Agents from Real Profiles

**User**: "I want a panel like the one we discussed with Sarah Chen and Michael Park"

**LLM orchestrates**:
```typescript
// Search for the profiles
const sarahProfile = await searchDatabank("Sarah Chen", { type: "profile" });
const michaelProfile = await searchDatabank("Michael Park", { type: "profile" });

// Create agents based on real profiles
const sarah = await createAgentFromProfile("Sarah Chen McKinsey consultant");
const michael = await createAgentFromProfile("Michael Park venture capitalist");

// Give them their historical context
await giveAgentMemory(sarah, "sarah-previous-discussions");
await giveAgentMemory(michael, "michael-previous-discussions");

// Run panel
await runDiscussion([sarah, michael], "Continue our investment discussion");
```

#### Example 2: Research-Informed Discussion

**User**: "What would leading AI researchers think about AGI timelines?"

**LLM orchestrates**:
```typescript
// Search for researcher profiles and papers
const researcherProfiles = await searchDatabank("AI researcher", { type: "profile" });
const agiPapers = await searchDatabank("AGI timeline predictions", { type: "research" });

// Create researchers based on real profiles
const researchers = await Promise.all(
  researcherProfiles.slice(0, 5).map(profile => 
    createAgentFromProfile(profile.metadata.name)
  )
);

// Give them access to research
for (const researcher of researchers) {
  await giveAgentDatabank(researcher, "AGI research papers");
}

// Have informed discussion
await runDiscussion(researchers, "AGI timeline predictions based on current research");
```

#### Example 3: Company-Specific Analysis

**User**: "How would our team react to this reorganization?"

**LLM orchestrates**:
```typescript
// Search for team profiles
const teamProfiles = await searchDatabank("", { 
  type: "profile", 
  tags: ["internal", "team"] 
});

// Create team members
const team = await Promise.all(
  teamProfiles.map(profile => 
    createAgentFromProfile(profile.metadata.name, "focus on org change impact")
  )
);

// Give them company context
for (const member of team) {
  await giveAgentDatabank(member, "company culture docs");
  await giveAgentDatabank(member, "previous reorg history");
}

// Get reactions
const responses = await gatherIndependentResponses(team, reorganizationPlan);
```

### Database Schema Update

```sql
-- User's personal databank
CREATE TABLE databank (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB, -- type, source, tags, name, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for fast retrieval
  INDEX idx_databank_user (user_id),
  INDEX idx_databank_type (user_id, metadata->>'type'),
  INDEX idx_databank_embedding (embedding)
);

-- Full text search
CREATE INDEX idx_databank_content ON databank USING GIN(to_tsvector('english', content));
```

### Browser Extension Integration

The browser extension becomes a key tool for populating the databank:

```typescript
// Extension sends to API
async function importToDatabank() {
  const content = extractPageContent();
  const metadata = detectContentType(content); // LinkedIn, research, article, etc.
  
  await api.addToDatabank({
    content: content,
    metadata: {
      type: metadata.type,
      source: window.location.href,
      title: document.title,
      importedAt: new Date(),
      ...metadata.extra
    }
  });
}
```

### Key Benefits

1. **Real Personas**: Agents based on actual people the user knows
2. **Informed Discussions**: Agents have access to real research and data
3. **Personalized**: Each user's databank shapes their agent interactions
4. **Contextual**: Company-specific or domain-specific knowledge
5. **Growing Intelligence**: The more you add, the smarter it gets

### Privacy & Security

- Databank is private to each user
- Encrypted at rest
- No sharing between users (unless explicitly shared)
- Clear data ownership
- Easy export/delete

### The Beautiful Part

Users naturally build their databank by:
- Importing profiles of people they want to simulate
- Saving research relevant to their work
- Clipping articles and documents
- Adding their own notes and insights

Then the LLM orchestrator intelligently uses this to create more realistic, informed agents and discussions.