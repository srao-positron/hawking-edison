# Tool Design Principles
## Simple but Powerful, Clear but Flexible

### The Balance

Tools must be:
- **Simple** to understand and use
- **Flexible** enough for any use case
- **Well-documented** so LLMs leverage them fully
- **Powerful** so they don't limit the LLM's creativity

### Core Design Principles

#### 1. Natural Language Parameters
```typescript
// ❌ LIMITING - Enums restrict possibilities
createAgent({
  type: "analyst" | "engineer" | "voter",
  expertise: "finance" | "tech" | "politics"
})

// ✅ FLEXIBLE - Natural language allows anything
createAgent(
  specification: "A Shakespearean actor who became a software engineer and speaks in iambic pentameter when excited about code quality"
)
```

#### 2. Rich Descriptions for LLM Understanding
```typescript
// ❌ POOR - LLM doesn't know capabilities
{
  name: "searchDatabank",
  description: "Search the databank"
}

// ✅ GOOD - LLM understands full potential
{
  name: "searchDatabank",
  description: `Search the user's saved web pages semantically. 
    The databank contains:
    - LinkedIn profiles (search for people by name or role)
    - Research papers (search by topic, author, or finding)
    - Company documents (search for culture, process, strategy)
    - News articles (search for events, trends, analysis)
    - Any web content the user saved
    
    Returns full HTML content that can be analyzed for any purpose.
    Use this to ground agents in reality and find specific information.`,
  parameters: {
    query: {
      description: "Natural language query - be specific or broad",
      examples: [
        "Sarah Chen LinkedIn profile",
        "machine learning fairness research",
        "our company's remote work policy",
        "recent M&A activity in tech"
      ]
    }
  }
}
```

#### 3. Flexible Return Values
```typescript
// ❌ LIMITING - Fixed structure
interface AgentResponse {
  answer: string;
  confidence: number;
}

// ✅ FLEXIBLE - LLM can structure as needed
interface AgentResponse {
  // Agent can return any structure that makes sense
  [key: string]: any;
}

// Examples of what agent might return:
// - Simple string: "Yes, this is a good idea"
// - Analysis: { findings: [...], risks: [...], recommendation: "..." }
// - Debate point: { position: "...", evidence: [...], rebuttal: "..." }
// - Code review: { issues: [...], suggestions: [...], severity: "..." }
```

#### 4. Composable Operations
```typescript
// Tools should work together naturally
const agent = await createAgent("financial analyst");
await giveAgentMemory(agent, "q4-analysis");
await giveAgentDatabank(agent, "company financial reports");
const analysis = await agent.analyze(newData);
await saveAgentMemory("q4-analysis", analysis);

// Each tool enhances the agent's capabilities
```

#### 5. No Hidden Constraints
```typescript
// ❌ BAD - Artificial limits
createMultipleAgents({
  count: number, // max 100
  type: string   // must be predefined type
})

// ✅ GOOD - LLM decides limits
createMultipleAgents({
  count: number, // LLM can create 1 or 10,000
  populationDescription: string // Any description works
})
```

### Tool Documentation Strategy

Each tool needs:

#### 1. Clear Purpose
```
What the tool does in one sentence
```

#### 2. Detailed Description
```
- What it's capable of
- When to use it
- What it returns
- How it interacts with other tools
```

#### 3. Rich Examples
```typescript
examples: [
  // Show simple usage
  'searchDatabank("Sarah Chen")',
  
  // Show complex usage
  'searchDatabank("machine learning researchers who published on AI safety between 2020-2024")',
  
  // Show creative usage
  'searchDatabank("company culture from employee testimonials and about pages")'
]
```

#### 4. Parameter Flexibility
```typescript
parameters: {
  query: {
    type: "string",
    description: "Natural language query of any complexity",
    // Not: "Search term (max 50 chars)"
    // But: "Describe what you're looking for in detail"
  }
}
```

### Example: The createAgent Tool Done Right

```typescript
const createAgent = {
  name: "createAgent",
  description: "Create an agent with any persona, expertise, perspective, or combination thereof",
  
  detailedDescription: `
    Creates an intelligent agent that can think, analyze, and respond from a specific perspective.
    
    Capabilities:
    - Can embody real people (if found in databank)
    - Can represent fictional personas
    - Can combine multiple perspectives
    - Can have any expertise level
    - Can adopt any communication style
    - Can hold any worldview or bias
    - Can simulate any profession or background
    
    The specification is interpreted by an LLM, so be creative:
    - "5-year-old who loves dinosaurs"
    - "Cynical venture capitalist who failed 3 startups"  
    - "Marie Curie if she lived in 2024"
    - "Composite of all Fortune 500 CEOs"
    - "Someone who thinks everything is a conspiracy"
    
    The agent will maintain consistency with their persona throughout interactions.
  `,
  
  parameters: {
    specification: {
      type: "string",
      description: `Complete natural language description of who this agent is. 
                    Include personality, expertise, background, quirks, perspectives.
                    The more detail, the more realistic the agent.`,
      minLength: 1,
      maxLength: 10000, // Plenty of room for detail
    },
    name: {
      type: "string",
      description: "Optional name for the agent (can also be specified in description)",
      optional: true
    }
  },
  
  returns: {
    description: `An Agent object with methods:
      - respond(input): Generate response from this persona
      - analyze(data): Analyze data from this perspective  
      - debate(topic): Take a position based on persona
      - interview(questions): Answer as this persona would
      - collaborate(task): Work on task from this viewpoint
      
      Agent maintains personality across all interactions.`,
    type: "Agent"
  },
  
  examples: [
    // Simple
    'createAgent("software engineer")',
    
    // Detailed
    'createAgent("Sarah Chen, senior M&A analyst at McKinsey with 15 years experience in tech acquisitions, Harvard MBA, known for conservative valuations and emphasis on cultural fit")',
    
    // Creative
    'createAgent("A medieval knight transported to modern times who evaluates everything through the lens of chivalry and honor")',
    
    // Based on databank
    'createAgent("Based on the LinkedIn profile for John Smith I just found, but make him more optimistic about emerging technologies")',
    
    // Composite
    'createAgent("Combination of Warren Buffett\'s investment philosophy and Elon Musk\'s risk tolerance")'
  ],
  
  bestPractices: `
    - Search databank first for real people
    - Include specific details for realism
    - Mention biases or perspectives explicitly
    - Describe communication style if important
    - Can reference found profiles for base
  `
};
```

### The Result

With well-designed tools:
1. **LLM has freedom** to use tools creatively
2. **No artificial limits** constrain solutions
3. **Clear documentation** enables full usage
4. **Natural language** allows any possibility
5. **Rich returns** enable tool composition

### Testing Tool Flexibility

A tool is flexible enough when:
- LLM uses it in ways you didn't anticipate
- No use case requires tool modification
- Parameters accept any reasonable input
- Returns can be used by other tools
- Documentation sparks creative usage

### The Key Insight

Tools should be:
- **Simple in interface** (few, clear methods)
- **Rich in capability** (handle any use case)
- **Clear in documentation** (LLM knows all possibilities)
- **Flexible in usage** (no artificial constraints)

This enables the LLM to orchestrate complex behaviors from simple, powerful building blocks.