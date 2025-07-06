# Tool Documentation Formats: Research & Recommendations
## What Format Helps LLMs Use Tools Best?

### The Question
Should we document tools in:
1. Structured JSON/YAML
2. Natural language descriptions
3. Code with comments
4. Hybrid approaches

### Current LLM Tool Usage Patterns

#### OpenAI Function Calling Format
```json
{
  "name": "searchDatabank",
  "description": "Search the user's saved web pages",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "What to search for"
      }
    },
    "required": ["query"]
  }
}
```

#### Anthropic Tool Use Format
```json
{
  "name": "searchDatabank",
  "description": "Search the user's saved web pages semantically",
  "input_schema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Natural language search query"
      }
    },
    "required": ["query"]
  }
}
```

### Research Findings

#### 1. JSON Schema Benefits
- **Consistent structure** that LLMs are trained on
- **Type safety** for parameter validation
- **Clear requirements** (required vs optional)
- **Standardized** across platforms

#### 2. Natural Language Benefits
- **Richer context** about usage
- **Examples** in context
- **Nuanced explanations**
- **Creative usage patterns**

### Recommended Hybrid Approach

```typescript
// Core JSON structure for LLM parsing
const toolDefinition = {
  name: "searchDatabank",
  
  // Structured description with rich detail
  description: {
    brief: "Search the user's saved web pages for any information",
    detailed: `
      Performs semantic search across all web pages the user has saved.
      The databank contains LinkedIn profiles, research papers, articles,
      and any web content the user found valuable. Use this to:
      - Create agents based on real people
      - Find research and citations
      - Understand company/team context
    `,
    capabilities: [
      "Semantic search (finds related concepts, not just keywords)",
      "Full HTML content retrieval",
      "Relevance scoring",
      "Natural language queries"
    ]
  },
  
  // JSON Schema for parameters
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Natural language search query",
        examples: [
          "Sarah Chen LinkedIn",
          "AI safety research papers",
          "our company culture"
        ],
        tips: "Be specific for exact matches, broad for exploration"
      },
      options: {
        type: "object",
        description: "Optional search refinements",
        properties: {
          limit: {
            type: "integer",
            description: "Maximum results to return",
            default: 10,
            minimum: 1,
            maximum: 100
          },
          minRelevance: {
            type: "number",
            description: "Minimum similarity score (0-1)",
            default: 0.5,
            minimum: 0,
            maximum: 1
          }
        }
      }
    },
    required: ["query"]
  },
  
  // Structured examples
  examples: [
    {
      description: "Find a specific person's profile",
      input: { query: "John Smith LinkedIn profile" },
      output: "LinkedIn HTML for John Smith"
    },
    {
      description: "Research on a topic",
      input: { 
        query: "machine learning bias", 
        options: { minRelevance: 0.7 } 
      },
      output: "Relevant research papers"
    }
  ],
  
  // Usage patterns for the LLM
  usagePatterns: {
    "Creating realistic agents": [
      "Search for '{person name} LinkedIn'",
      "Use profile content in createAgent()"
    ],
    "Research-backed discussions": [
      "Search for '{topic} research'",
      "Have agents cite findings"
    ],
    "Company context": [
      "Search for 'company culture values'",
      "Use for team simulations"
    ]
  }
};
```

### Best Practices for LLM Tool Documentation

#### 1. Use JSON Schema for Structure
```json
{
  "parameters": {
    "type": "object",
    "properties": {
      "query": { "type": "string" }
    }
  }
}
```
LLMs understand this format well from training.

#### 2. Enhance with Natural Language
```json
{
  "description": {
    "brief": "One line summary",
    "detailed": "Complete explanation with context",
    "whenToUse": "Specific scenarios"
  }
}
```

#### 3. Provide Rich Examples
```json
{
  "examples": [
    {
      "scenario": "Finding someone's background",
      "input": { "query": "Sarah Chen experience" },
      "reasoning": "Looking for career history"
    }
  ]
}
```

#### 4. Include Usage Patterns
```json
{
  "patterns": {
    "searchThenCreate": [
      "searchDatabank(name)",
      "createAgent(based on results)"
    ]
  }
}
```

### Implementation Recommendation

```typescript
// Tool registry with hybrid documentation
export const tools = {
  searchDatabank: {
    // Standard JSON schema (for LLM parsing)
    schema: {
      name: "searchDatabank",
      description: "Search user's saved web pages",
      parameters: {
        type: "object",
        properties: {
          query: { 
            type: "string",
            description: "Search query"
          }
        },
        required: ["query"]
      }
    },
    
    // Rich documentation (for LLM understanding)
    documentation: {
      purpose: "Find information from user's curated web content",
      capabilities: [
        "Semantic search across saved pages",
        "Returns full HTML content",
        "Understands natural language queries"
      ],
      bestPractices: [
        "Search before creating agents",
        "Use for grounding in facts",
        "Be specific when needed"
      ],
      examples: [...],
      troubleshooting: {...}
    },
    
    // Actual implementation
    execute: async (params) => {...}
  }
};

// System prompt includes both
const systemPrompt = `
Available tools (JSON schemas):
${JSON.stringify(tools.map(t => t.schema))}

Tool documentation:
${tools.map(t => formatDocumentation(t.documentation)).join('\n')}
`;
```

### Testing Different Formats

To determine the best format:

1. **A/B Test** different documentation styles
2. **Measure**:
   - Tool selection accuracy
   - Parameter usage correctness
   - Creative tool combinations
   - Error recovery

3. **Iterate** based on what makes LLMs most effective

### Current Best Practice

Based on how modern LLMs are trained:

1. **Use JSON Schema** for tool structure (required)
2. **Add rich descriptions** in the schema
3. **Include examples** in structured format
4. **Provide usage patterns** for complex workflows
5. **Keep documentation close to schemas** (not separate)

### The Key Insight

LLMs work best with:
- **Structure** for parsing (JSON)
- **Context** for understanding (descriptions)
- **Examples** for learning (patterns)
- **Flexibility** for creativity (natural language)

The hybrid approach leverages LLM training on both structured data and natural language.