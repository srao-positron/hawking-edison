# Tool Parameterization & Documentation Guide
## The Make-or-Break of LLM Tool Usage

### Why This Matters

The LLM can only use tools as well as:
1. The **parameters** allow
2. The **documentation** explains

Poor parameterization = Limited LLM capability
Poor documentation = Underutilized tools

### Parameterization Principles

#### 1. Natural Language Over Structures
```typescript
// ❌ POOR - Forces structure
runDiscussion({
  agents: Agent[],
  topic: string,
  format: "debate" | "brainstorm" | "analysis",
  rounds: 1 | 3 | 5,
  style: "formal" | "casual"
})

// ✅ EXCELLENT - Natural flexibility
runDiscussion({
  agents: Agent[],
  topic: string,
  instructions?: string // "Run this like a heated Senate debate with 5 rounds"
})
```

#### 2. Optional Parameters for Power Users
```typescript
// Base case simple, advanced case powerful
searchDatabank({
  query: string,                    // Required: "Sarah Chen"
  context?: string,                 // Optional: "looking for her thoughts on AI"
  recency?: string,                 // Optional: "from the last month"
  minRelevance?: number,           // Optional: 0.8 for high precision
  includeMetadata?: boolean        // Optional: return source URLs
})

// LLM can use simply: searchDatabank("Sarah Chen")
// Or powerfully: searchDatabank("Sarah Chen", "AI opinions", "recent", 0.9, true)
```

#### 3. Flexible Types
```typescript
// ❌ RESTRICTIVE
analyzeResults({
  data: ResponseArray, // Must be specific type
  metrics: ["sentiment" | "consensus" | "themes"], // Limited options
})

// ✅ FLEXIBLE  
analyzeResults({
  data: any, // Can analyze anything
  focusAreas?: string, // "Look for hidden concerns and unspoken assumptions"
  outputFormat?: string // "Present as a decision matrix"
})
```

#### 4. Semantic Parameters
```typescript
// Parameters that accept meaning, not just values
createVisualization({
  data: any,
  goal: string, // "Show how support varies by age in a way that highlights the generation gap"
  style?: string, // "Professional but accessible, like The Economist"
  emphasize?: string // "Make the tipping point obvious"
})
```

### Documentation Strategy

#### 1. The Three-Layer Approach

```typescript
{
  // Layer 1: Quick Understanding (for tool selection)
  name: "searchDatabank",
  description: "Search the user's saved web pages for any information",
  
  // Layer 2: Detailed Capabilities (for usage planning)
  detailedDescription: `
    Searches semantically through all web pages the user has saved.
    Uses vector similarity to find conceptually related content.
    
    The databank typically contains:
    - LinkedIn profiles (search by name, role, company, skills)
    - Research papers (search by topic, findings, methodology, authors)
    - News articles (search by event, date, subject, sentiment)
    - Company pages (search for culture, values, team, strategy)
    - Documentation (search for technical info, processes, guides)
    - Any web content (the user saves what matters to them)
    
    Returns full HTML content which can be:
    - Analyzed for specific information
    - Used to create realistic agent personas
    - Cited as sources in discussions
    - Extracted for data and facts
    
    Search works best when you:
    - Be specific when you know what you want
    - Be broad when exploring what's available
    - Include context about why you're searching
    - Try multiple queries if the first doesn't work
  `,
  
  // Layer 3: Examples & Patterns (for learning usage)
  examples: [
    {
      scenario: "Creating an agent based on a real person",
      query: 'searchDatabank("John Smith LinkedIn")',
      followUp: 'createAgent("Based on this profile: " + results[0].content)'
    },
    {
      scenario: "Finding research on a topic",
      query: 'searchDatabank("machine learning bias mitigation techniques")',
      note: "Can search for concepts, not just keywords"
    },
    {
      scenario: "Understanding company context",
      query: 'searchDatabank("our company remote work culture values")',
      note: "Searches understand relationships between terms"
    }
  ]
}
```

#### 2. Parameter Documentation

```typescript
parameters: {
  query: {
    type: "string",
    required: true,
    description: "Natural language description of what to search for",
    
    // This is crucial - show the LLM what's possible
    detailedUsage: `
      Can be:
      - Simple: "Sarah Chen"
      - Specific: "Sarah Chen's LinkedIn profile"
      - Conceptual: "arguments against remote work"
      - Complex: "research papers about AI safety from authors who worked at major tech companies"
      - Exploratory: "anything about our company culture"
      
      The search understands:
      - Synonyms (CEO = Chief Executive Officer)
      - Relationships (parent company includes subsidiaries)
      - Context (software engineer implies technical content)
      - Intent (looking for profiles vs looking for opinions)
    `,
    
    examples: [
      "John Smith",
      "machine learning researchers at Stanford",
      "criticisms of agile methodology",
      "our company's diversity initiatives",
      "recent thoughts on climate change from economists"
    ],
    
    tips: [
      "Include context if you're looking for something specific",
      "Use natural language, not keywords",
      "If too many results, add more detail",
      "If too few results, broaden the query"
    ]
  },
  
  options: {
    type: "object",
    required: false,
    description: "Optional parameters to refine the search",
    
    properties: {
      limit: {
        type: "number",
        default: 10,
        description: "Maximum results to return",
        usage: "Increase for broad exploration, decrease for precision"
      },
      
      minRelevance: {
        type: "number",
        default: 0.5,
        range: [0, 1],
        description: "Minimum semantic similarity score",
        usage: "Set higher (0.8+) for exact matches, lower for related content"
      },
      
      dateFilter: {
        type: "string",
        description: "Filter by when content was saved",
        examples: ["last week", "past month", "since 2024"],
        usage: "Useful for recent events or temporal analysis"
      }
    }
  }
}
```

#### 3. Return Value Documentation

```typescript
returns: {
  type: "Array<SearchResult>",
  description: "Ordered by relevance, most relevant first",
  
  structure: {
    content: "string - Full HTML of the saved page",
    url: "string - Original URL",
    relevance: "number - Similarity score 0-1",
    savedDate: "string - When user saved this"
  },
  
  usage: `
    Results can be:
    - Passed to agents for context: agent.addContext(results[0].content)
    - Analyzed for information: extractProfile(results[0].content)
    - Used to create agents: createAgent("Based on: " + results[0].content)
    - Combined for comprehensive view: combineInsights(results)
    - Cited in outputs: "According to " + results[0].url
  `,
  
  examples: [
    {
      scenario: "Creating agent from profile",
      code: `
        const profiles = await searchDatabank("Sarah Chen LinkedIn");
        const sarah = await createAgent(
          "Based on this LinkedIn profile: " + profiles[0].content +
          "Focus on her M&A expertise"
        );
      `
    }
  ]
}
```

### Best Practices for Documentation

#### 1. Explain the Why, Not Just the What
```typescript
// ❌ Minimal
"Search the databank"

// ✅ Contextual
"Search the user's saved web pages to ground agents in reality and find specific information the user has curated"
```

#### 2. Show Creative Possibilities
```typescript
examples: [
  // Don't just show basic usage
  'searchDatabank("climate change")',
  
  // Show creative applications
  'searchDatabank("profiles of people who switched careers after 40")',
  'searchDatabank("company culture from employee testimonials")',
  'searchDatabank("contrarian views on artificial intelligence")'
]
```

#### 3. Explain Parameter Interactions
```typescript
parameterInteractions: `
  - High minRelevance + specific query = Exact matches only
  - Low minRelevance + broad query = Exploratory search
  - Recent dateFilter + trending topic = Current perspectives
  - No options + clear query = Balanced, relevant results
`
```

#### 4. Include Failure Modes
```typescript
troubleshooting: {
  "No results": [
    "Try broadening the query",
    "Remove specific names/terms",
    "Check if content exists with listDatabank()"
  ],
  "Too many results": [
    "Add more specific context",
    "Increase minRelevance",
    "Use dateFilter for recency"
  ],
  "Wrong type of results": [
    "Add context about what you're looking for",
    "Specify the type (profile, research, article)"
  ]
}
```

### The Documentation Test

Good documentation enables the LLM to:
1. **Choose** the right tool for the task
2. **Understand** all capabilities
3. **Combine** tools creatively
4. **Recover** from failures
5. **Discover** non-obvious uses

### Real Example: Complete Tool Specification

```typescript
export const searchDatabank = {
  name: "searchDatabank",
  
  // One-line purpose
  description: "Search the user's saved web pages for any information",
  
  // Complete capability explanation
  detailedDescription: `
    Performs semantic search across all web pages the user has saved.
    Uses embeddings to find conceptually related content, not just keyword matches.
    
    The databank is the user's curated knowledge - they save what matters to them.
    This includes profiles of people, research papers, company information, articles,
    documentation, and any web content they found valuable.
    
    This tool is essential for:
    - Creating agents based on real people (search for profiles)
    - Grounding discussions in facts (search for research)
    - Understanding context (search for company/team info)
    - Finding specific information (search for anything)
    
    The search understands natural language, context, and relationships.
    It's better to over-explain what you're looking for than under-explain.
  `,
  
  // Rich parameter documentation
  parameters: {
    query: {
      type: "string",
      required: true,
      description: "What to search for, in natural language",
      guidance: `
        Be as natural as you would with a human librarian.
        Include context about why you're searching.
        Mention relationships, timeframes, or specific aspects.
        
        Good queries:
        - "Sarah Chen's background in mergers and acquisitions"
        - "recent research on AI alignment from safety researchers"
        - "our company's stance on remote work from official pages"
        - "critiques of blockchain technology from economists"
        
        The search understands:
        - Concepts (not just keywords)
        - Relationships between ideas
        - Context and intent
        - Synonyms and variations
      `
    },
    
    options: {
      type: "object",
      required: false,
      properties: {
        limit: {
          type: "number",
          default: 10,
          description: "Max results (increase for exploration)"
        },
        minRelevance: {
          type: "number",
          default: 0.5,
          range: [0, 1],
          description: "Minimum similarity (higher = stricter)"
        }
      }
    }
  },
  
  // Clear return documentation
  returns: {
    type: "Array<{content: string, url: string, relevance: number}>",
    description: "Relevant pages ordered by similarity",
    usage: "Extract information, create agents, provide context"
  },
  
  // Rich examples
  examples: [
    {
      intent: "Create agent from real person",
      code: 'searchDatabank("Michael Park LinkedIn profile")'
    },
    {
      intent: "Find research on topic",
      code: 'searchDatabank("transformer architecture improvements 2024")'
    },
    {
      intent: "Understand company culture",
      code: 'searchDatabank("our company values mission culture pages")'
    }
  ],
  
  // Usage patterns
  patterns: [
    "Search before creating agents to find real profiles",
    "Search when users mention specific people or companies",
    "Search to ground discussions in saved research",
    "Search when agents need factual information"
  ]
};
```

### The Bottom Line

**Parameterization** determines what's possible
**Documentation** determines what's discovered

Invest heavily in both. The LLM's effectiveness is bounded by how well you parameterize and document your tools.