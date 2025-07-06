# Hawking Edison Tools Specification
## Complete Tool Definitions for LLM Orchestration

### Overview
These tools are given to the LLM orchestrator. The LLM decides which tools to use, in what order, and with what parameters to fulfill any user request.

---

## Core Tools

### 1. Agent Management

#### createAgent
```typescript
{
  name: "createAgent",
  description: "Create an agent with any persona, expertise, or perspective. The agent can think, respond, and participate in interactions.",
  parameters: {
    specification: {
      type: "string",
      description: "Natural language description of who this agent is, what they know, and how they think",
      example: "A senior security architect with 20 years experience who is cautious about new technologies"
    },
    name: {
      type: "string", 
      description: "Optional name for the agent",
      optional: true
    }
  },
  returns: "Agent object that can be used in other tools",
  examples: [
    'createAgent("5 year old who loves dinosaurs")',
    'createAgent("McKinsey consultant specializing in M&A", "Alexandra Chen")',
    'createAgent("Voter in Seattle, progressive, works in tech, age 28-35")'
  ]
}
```

#### createMultipleAgents
```typescript
{
  name: "createMultipleAgents",
  description: "Create multiple agents at once, useful for simulations or diverse panels",
  parameters: {
    count: {
      type: "number",
      description: "How many agents to create"
    },
    populationDescription: {
      type: "string",
      description: "Description of the population to create",
      example: "Diverse Seattle voters representing actual demographics"
    },
    variations: {
      type: "array",
      description: "Optional specific variations to ensure",
      optional: true,
      example: ["age", "political leaning", "neighborhood"]
    }
  },
  returns: "Array of Agent objects",
  examples: [
    'createMultipleAgents(100, "Tech conference attendees")',
    'createMultipleAgents(1000, "US voters in swing states", ["state", "age", "education"])'
  ]
}
```

### 2. Interaction Tools

#### runDiscussion
```typescript
{
  name: "runDiscussion",
  description: "Have agents discuss a topic together. They take turns speaking and can respond to each other.",
  parameters: {
    agents: {
      type: "Agent[]",
      description: "Array of agents who will participate"
    },
    topic: {
      type: "string",
      description: "What they should discuss"
    },
    style: {
      type: "string",
      description: "Discussion style",
      optional: true,
      default: "collaborative",
      examples: ["debate", "brainstorm", "analysis", "negotiation"]
    },
    rounds: {
      type: "number",
      description: "How many rounds of discussion",
      optional: true,
      default: 3
    }
  },
  returns: "Array of discussion exchanges",
  examples: [
    'runDiscussion([ceo, cfo, cto], "Should we go public?", "debate")',
    'runDiscussion(reviewers, "Code quality issues in PR #347")'
  ]
}
```

#### gatherIndependentResponses
```typescript
{
  name: "gatherIndependentResponses",
  description: "Get responses from many agents independently (they don't see each other's responses)",
  parameters: {
    agents: {
      type: "Agent[]",
      description: "Array of agents to respond"
    },
    prompt: {
      type: "string",
      description: "What each agent should respond to"
    },
    structured: {
      type: "boolean",
      description: "Whether to ask for structured responses",
      optional: true,
      default: false
    }
  },
  returns: "Array of individual responses",
  examples: [
    'gatherIndependentResponses(voters, "How do you feel about the new climate policy?")',
    'gatherIndependentResponses(customers, productAnnouncement, true)'
  ]
}
```

#### conductInterview
```typescript
{
  name: "conductInterview",
  description: "Have one agent interview another with follow-up questions",
  parameters: {
    interviewer: {
      type: "Agent",
      description: "Agent conducting the interview"
    },
    interviewee: {
      type: "Agent",
      description: "Agent being interviewed"
    },
    topic: {
      type: "string",
      description: "Interview topic"
    },
    depth: {
      type: "number",
      description: "How many follow-up questions",
      optional: true,
      default: 3
    }
  },
  returns: "Interview transcript",
  examples: [
    'conductInterview(journalist, ceo, "Company's AI strategy")',
    'conductInterview(userResearcher, customer, "Experience with our product")'
  ]
}
```

### 3. Memory Tools

#### giveAgentMemory
```typescript
{
  name: "giveAgentMemory",
  description: "Give an agent memory of previous interactions. The agent will have context from past conversations.",
  parameters: {
    agent: {
      type: "Agent",
      description: "The agent to give memory to"
    },
    memoryKey: {
      type: "string",
      description: "Unique identifier for this memory stream",
      example: "sarah-analyst-project-alpha"
    },
    scope: {
      type: "string",
      description: "What memories to include",
      optional: true,
      default: "all",
      examples: ["recent", "all", "specific-topic"]
    }
  },
  returns: "Agent with memory context added",
  examples: [
    'giveAgentMemory(analyst, "acquisition-analysis")',
    'giveAgentMemory(sarah, "sarah-personal-history", "recent")'
  ]
}
```

#### saveAgentMemory
```typescript
{
  name: "saveAgentMemory",
  description: "Save an interaction or insight for future recall",
  parameters: {
    memoryKey: {
      type: "string",
      description: "Where to store this memory",
      example: "project-alpha-discussions"
    },
    content: {
      type: "any",
      description: "What to remember (discussion, insights, decisions, etc)"
    },
    metadata: {
      type: "object",
      description: "Optional metadata about this memory",
      optional: true,
      example: '{ participants: ["Sarah", "John"], topic: "Q4 strategy" }'
    }
  },
  returns: "Confirmation of memory saved",
  examples: [
    'saveAgentMemory("acquisition-analysis", discussionResults)',
    'saveAgentMemory("sarah-interactions", { date: "2024-01-15", insights: [...] })'
  ]
}
```

#### searchMemories
```typescript
{
  name: "searchMemories",
  description: "Search across all saved memories semantically",
  parameters: {
    query: {
      type: "string",
      description: "What to search for"
    },
    memoryKeys: {
      type: "string[]",
      description: "Optional: search only specific memory streams",
      optional: true
    },
    limit: {
      type: "number",
      description: "Maximum results to return",
      optional: true,
      default: 10
    }
  },
  returns: "Array of relevant memories with context",
  examples: [
    'searchMemories("regulatory concerns about acquisition")',
    'searchMemories("Sarah\'s recommendations", ["sarah-interactions"])'
  ]
}
```

#### listMemoryStreams
```typescript
{
  name: "listMemoryStreams",
  description: "List all available memory streams/conversations",
  parameters: {
    pattern: {
      type: "string",
      description: "Optional pattern to filter streams",
      optional: true
    }
  },
  returns: "Array of memory stream identifiers with metadata",
  examples: [
    'listMemoryStreams()',
    'listMemoryStreams("project-*")'
  ]
}
```

#### forgetMemory
```typescript
{
  name: "forgetMemory",
  description: "Delete specific memories or entire memory streams",
  parameters: {
    memoryKey: {
      type: "string",
      description: "Memory stream to forget"
    },
    beforeDate: {
      type: "string",
      description: "Optional: only forget memories before this date",
      optional: true
    }
  },
  returns: "Confirmation of memories deleted",
  examples: [
    'forgetMemory("old-project-discussions")',
    'forgetMemory("sarah-temp-memory", "2024-01-01")'
  ]
}
```

### 4. Analysis Tools

#### analyzeResponses
```typescript
{
  name: "analyzeResponses",
  description: "Analyze patterns, sentiment, and insights from agent responses",
  parameters: {
    responses: {
      type: "any[]",
      description: "Responses to analyze"
    },
    focusAreas: {
      type: "string[]",
      description: "What to look for in analysis",
      optional: true,
      examples: ["sentiment", "demographics", "key concerns", "consensus"]
    },
    groupBy: {
      type: "string",
      description: "How to group analysis",
      optional: true,
      example: "agent.demographics.age"
    }
  },
  returns: "Analysis object with insights, patterns, and statistics",
  examples: [
    'analyzeResponses(voterResponses, ["sentiment", "key concerns"], "demographics.neighborhood")',
    'analyzeResponses(discussionTranscript, ["consensus", "disagreements"])'
  ]
}
```

#### findConsensus
```typescript
{
  name: "findConsensus",
  description: "Find areas of agreement and disagreement among agents",
  parameters: {
    discussion: {
      type: "any",
      description: "Discussion or responses to analyze"
    },
    threshold: {
      type: "number",
      description: "Agreement threshold (0-1)",
      optional: true,
      default: 0.7
    }
  },
  returns: "Consensus analysis with agreements, disagreements, and nuanced positions"
}
```

### 4. Visualization Tools

#### createVisualization
```typescript
{
  name: "createVisualization",
  description: "Create appropriate visualization for any data using Markdown and SVG",
  parameters: {
    data: {
      type: "any",
      description: "Data to visualize"
    },
    goal: {
      type: "string",
      description: "What insight to convey",
      example: "Show demographic breakdown of support"
    },
    style: {
      type: "string",
      description: "Visualization style preference",
      optional: true,
      examples: ["dashboard", "report", "presentation"]
    }
  },
  returns: "Markdown string with embedded SVG visualizations",
  examples: [
    'createVisualization(surveyResults, "Show support by age group")',
    'createVisualization(financialAnalysis, "Highlight key risks", "report")'
  ]
}
```

#### generateReport
```typescript
{
  name: "generateReport",
  description: "Generate a comprehensive report from analysis results",
  parameters: {
    title: {
      type: "string",
      description: "Report title"
    },
    sections: {
      type: "object[]",
      description: "Report sections with data",
      example: '[{title: "Executive Summary", data: summary}, {title: "Detailed Analysis", data: analysis}]'
    },
    format: {
      type: "string",
      description: "Report format",
      optional: true,
      default: "markdown",
      options: ["markdown", "html", "text"]
    }
  },
  returns: "Formatted report"
}
```

### 5. Databank Tools

#### searchDatabank
```typescript
{
  name: "searchDatabank",
  description: "Search the user's saved web pages for relevant information",
  parameters: {
    query: {
      type: "string",
      description: "What to search for",
      examples: ["Sarah Chen LinkedIn", "climate change research", "company culture"]
    },
    limit: {
      type: "number",
      description: "Maximum results to return",
      optional: true,
      default: 10
    }
  },
  returns: "Array of relevant web pages with content and URLs",
  examples: [
    'searchDatabank("Sarah Chen")',
    'searchDatabank("machine learning papers")',
    'searchDatabank("our company values")'
  ]
}
```

#### addToDatabank
```typescript
{
  name: "addToDatabank",
  description: "Store a web page in the user's databank (usually called by browser extension)",
  parameters: {
    content: {
      type: "string",
      description: "Raw HTML content of the web page"
    },
    url: {
      type: "string",
      description: "URL of the web page"
    }
  },
  returns: "Confirmation of storage",
  examples: [
    'addToDatabank(documentHTML, "https://linkedin.com/in/sarahchen")',
    'addToDatabank(pageContent, "https://arxiv.org/paper123")'
  ]
}
```

### 6. External Tools

#### fetchWebData
```typescript
{
  name: "fetchWebData",
  description: "Fetch and parse data from a URL",
  parameters: {
    url: {
      type: "string",
      description: "URL to fetch"
    },
    extractionGoal: {
      type: "string",
      description: "What to extract from the page",
      optional: true,
      example: "Extract the main article content"
    }
  },
  returns: "Extracted data from the URL",
  examples: [
    'fetchWebData("https://github.com/org/repo/pull/123")',
    'fetchWebData("https://news.com/article", "Extract key points")'
  ]
}
```

#### generateCapability
```typescript
{
  name: "generateCapability",
  description: "Generate a new capability/tool when needed",
  parameters: {
    need: {
      type: "string",
      description: "What capability is needed",
      example: "Calculate compound interest over time"
    },
    constraints: {
      type: "string[]",
      description: "Any constraints or requirements",
      optional: true
    }
  },
  returns: "New executable capability"
}
```

### 7. Utility Tools

#### think
```typescript
{
  name: "think",
  description: "Think through a problem step by step",
  parameters: {
    problem: {
      type: "string",
      description: "What to think about"
    },
    approach: {
      type: "string",
      description: "How to think about it",
      optional: true,
      examples: ["step_by_step", "pros_and_cons", "hypothetical"]
    }
  },
  returns: "Structured thinking process and conclusions",
  examples: [
    'think("What kind of agents would best analyze this business decision?")',
    'think("How should I structure this simulation?", "step_by_step")'
  ]
}
```

#### validateResults
```typescript
{
  name: "validateResults",
  description: "Validate that results make sense and are accurate",
  parameters: {
    results: {
      type: "any",
      description: "Results to validate"
    },
    expectations: {
      type: "string",
      description: "What valid results should look like",
      optional: true
    },
    withAgents: {
      type: "Agent[]",
      description: "Optional agents to help validate",
      optional: true
    }
  },
  returns: "Validation report with any issues found"
}
```

---

## Tool Composition Examples

### Example 1: Code Review
```typescript
// LLM might compose these tools:
const pr = await fetchWebData("github.com/org/repo/pull/123");
const reviewers = await Promise.all([
  createAgent("Senior security engineer focused on vulnerabilities"),
  createAgent("Performance expert who optimizes databases"),
  createAgent("API designer who values consistency"),
  createAgent("DevOps engineer concerned with deployment")
]);
const discussion = await runDiscussion(reviewers, `Review this code: ${pr}`, "analytical");
const consensus = await findConsensus(discussion);
const report = await createVisualization(consensus, "Show review findings as actionable items");
```

### Example 2: Market Research
```typescript
// LLM might compose these tools:
const customers = await createMultipleAgents(200, "Target demographic: millennials interested in sustainable products");
const message = "Introducing EcoClean: Premium sustainable cleaning products";
const responses = await gatherIndependentResponses(customers, message);
const analysis = await analyzeResponses(responses, ["sentiment", "purchase intent", "concerns"], "demographics.income");
const insights = await createVisualization(analysis, "Show market opportunity and segments");
await addToKnowledge(insights, {type: "market_research", product: "EcoClean"});
```

### Example 3: Strategic Decision
```typescript
// LLM might compose these tools:
await think("What expertise would help analyze this acquisition?");
const panel = await Promise.all([
  createAgent("M&A specialist from top consulting firm"),
  createAgent("Industry analyst covering both companies"),
  createAgent("Financial expert focused on valuations"),
  createAgent("Regulatory lawyer specializing in antitrust")
]);
const research = await searchKnowledge("previous acquisition analyses");
const discussion = await runDiscussion(panel, "Should Company A acquire Company B?", "debate", 5);
const report = await generateReport("Acquisition Analysis", [
  {title: "Executive Summary", data: await findConsensus(discussion)},
  {title: "Financial Analysis", data: financials},
  {title: "Risk Assessment", data: risks},
  {title: "Recommendation", data: recommendation}
]);
```

---

## Implementation Notes

### Tool Design Principles
1. **Single Purpose**: Each tool does one thing well
2. **Composable**: Tools can be combined in any order
3. **Flexible Parameters**: Natural language descriptions, not enums
4. **Return Useful Data**: Output that other tools can use
5. **No Hidden Logic**: Tools execute what they say, nothing more

### What Tools DON'T Do
- No routing or decision making
- No type checking beyond basic parameter validation
- No workflow assumptions
- No hidden agent types or templates
- No special cases based on content

The LLM orchestrates everything. Tools just execute.