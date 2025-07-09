# Tool Usage Examples
## Real Code Examples from Implementation

This document shows actual code examples of how the LLM orchestrator uses the tools to accomplish various tasks.

---

## Example 1: Code Review Panel

### User Request
"Review this PR: https://github.com/org/repo/pull/123"

### Orchestrator Code
```typescript
// 1. Fetch PR data (future tool)
const prData = await fetchWebData.execute({
  url: "https://github.com/org/repo/pull/123",
  extractionGoal: "Get code changes, description, and files"
})

// 2. Create specialized reviewers
const reviewers = await Promise.all([
  createAgent.execute({
    specification: "Senior security engineer focused on vulnerabilities, OWASP top 10 expert"
  }),
  createAgent.execute({
    specification: "Performance optimization expert, database query specialist"
  }),
  createAgent.execute({
    specification: "Clean code advocate, SOLID principles enforcer"
  }),
  createAgent.execute({
    specification: "DevOps engineer concerned with deployment and monitoring"
  })
])

// 3. Run the review discussion
const discussion = await runDiscussion.execute({
  agents: reviewers,
  topic: `Review this PR: ${prData.description}\n\nChanges:\n${prData.diff}`,
  style: "analytical review",
  rounds: 3
})

// 4. Find consensus on issues
const consensus = await findConsensus.execute({
  discussion: discussion,
  threshold: 0.6  // 60% agreement needed
})

// 5. Validate findings
const validation = await validateResults.execute({
  results: consensus,
  expectations: "Identify real issues, not nitpicks",
  withAgents: [reviewers[0]]  // Security expert validates
})

// Return structured review
return {
  summary: consensus.strongConsensus,
  criticalIssues: consensus.strongConsensus.filter(i => i.severity === 'high'),
  suggestions: consensus.partialConsensus,
  disagreements: consensus.disagreements
}
```

---

## Example 2: Market Research with Memory

### User Request
"Continue our analysis of the EcoClean product launch"

### Orchestrator Code
```typescript
// 1. Search for previous analysis
const previousWork = await searchMemories.execute({
  query: "EcoClean product launch analysis",
  limit: 5
})

// 2. Create analyst with memory
const analyst = await createAgent.execute({
  specification: "Market research analyst specializing in sustainable products",
  name: "Sarah Chen"
})

const analystWithMemory = await giveAgentMemory.execute({
  agent: analyst,
  memoryKey: "ecoclean-analysis",
  scope: "all"
})

// 3. Create target customer population
const customers = await createMultipleAgents.execute({
  count: 50,
  populationDescription: "Millennials interested in sustainable products, diverse income levels",
  variations: ["income", "environmental_commitment", "shopping_habits"]
})

// 4. Gather customer responses
const responses = await gatherIndependentResponses.execute({
  agents: customers,
  prompt: `Based on our previous findings: ${previousWork.results[0].content.summary}
           
           New question: Would you purchase EcoClean at a $15 price point?`,
  structured: true
})

// 5. Analyze responses
const analysis = await analyzeResponses.execute({
  responses: responses,
  focusAreas: ["purchase_intent", "price_sensitivity", "concerns"],
  groupBy: "income_level"
})

// 6. Save new findings
await saveAgentMemory.execute({
  memoryKey: "ecoclean-analysis",
  content: {
    phase: "pricing_validation",
    analysis: analysis,
    recommendation: "Consider tiered pricing based on income segments"
  },
  metadata: {
    sessionId: context.sessionId,
    analystName: "Sarah Chen"
  }
})

return analysis
```

---

## Example 3: Business Decision Simulation

### User Request
"Should OpenAI acquire Anthropic? Run a comprehensive analysis."

### Orchestrator Code
```typescript
// 1. Create expert panel
const experts = await Promise.all([
  createAgent.execute({
    specification: "M&A specialist from top consulting firm, 15 years experience in tech acquisitions"
  }),
  createAgent.execute({
    specification: "AI industry analyst who has covered both companies extensively"
  }),
  createAgent.execute({
    specification: "Antitrust lawyer specializing in big tech mergers"
  }),
  createAgent.execute({
    specification: "Financial analyst focused on AI company valuations"
  }),
  createAgent.execute({
    specification: "Former OpenAI employee with insider perspective"
  })
])

// 2. Give relevant experts memory if this is ongoing
if (hasMemory) {
  experts[0] = await giveAgentMemory.execute({
    agent: experts[0],
    memoryKey: "openai-anthropic-acquisition",
    scope: "recent"
  })
}

// 3. Run multi-round discussion
const discussion = await runDiscussion.execute({
  agents: experts,
  topic: "Should OpenAI acquire Anthropic? Consider strategic fit, regulatory challenges, financial implications, and impact on AI development.",
  style: "structured debate",
  rounds: 5
})

// 4. Gather independent final positions
const finalPositions = await gatherIndependentResponses.execute({
  agents: experts,
  prompt: "Given our discussion, what is your final recommendation?",
  structured: true
})

// 5. Analyze the discussion and positions
const analysisPromises = [
  analyzeResponses.execute({
    responses: discussion.discussion,
    focusAreas: ["key_arguments", "risk_factors", "opportunities"]
  }),
  findConsensus.execute({
    discussion: finalPositions,
    threshold: 0.7
  })
]

const [discussionAnalysis, positionConsensus] = await Promise.all(analysisPromises)

// 6. Validate with external perspective
const validator = await createAgent.execute({
  specification: "Neutral business strategy professor from Harvard Business School"
})

const validation = await validateResults.execute({
  results: {
    discussion: discussionAnalysis,
    consensus: positionConsensus
  },
  expectations: "Balanced analysis considering all stakeholder perspectives",
  withAgents: [validator]
})

// 7. Save if ongoing analysis
if (shouldSave) {
  await saveAgentMemory.execute({
    memoryKey: "openai-anthropic-acquisition",
    content: {
      discussion: discussion,
      analysis: discussionAnalysis,
      consensus: positionConsensus,
      validation: validation
    }
  })
}

return {
  recommendation: positionConsensus.strongConsensus[0],
  keyPoints: discussionAnalysis.analysis.keyInsights,
  risks: discussionAnalysis.analysis.riskFactors,
  disagreements: positionConsensus.disagreements,
  confidence: validation.validation.confidence
}
```

---

## Example 4: Simple Q&A (No Memory Needed)

### User Request
"What are the main benefits of microservices?"

### Orchestrator Code
```typescript
// Simple request - just create an expert and respond
const expert = await createAgent.execute({
  specification: "Software architect with extensive microservices experience"
})

// Direct response - no discussion or analysis needed
const response = await callLLMWithTools(
  [
    {
      role: 'system',
      content: `You are ${expert.specification}. Answer concisely.`
    },
    {
      role: 'user',
      content: "What are the main benefits of microservices?"
    }
  ],
  []  // No tools needed for simple response
)

return response.content
```

---

## Example 5: Interview with Memory

### User Request
"Interview our virtual CEO about Q4 plans"

### Orchestrator Code
```typescript
// 1. Create or retrieve CEO with memory
const ceo = await createAgent.execute({
  specification: "CEO of our company, visionary leader, 10 years at helm",
  name: "Alexandra Chen"
})

const ceoWithMemory = await giveAgentMemory.execute({
  agent: ceo,
  memoryKey: "alexandra-ceo-memory",
  scope: "all"
})

// 2. Create interviewer
const interviewer = await createAgent.execute({
  specification: "Business journalist from TechCrunch, incisive questioning style"
})

// 3. Conduct interview
const interview = await conductInterview.execute({
  interviewer: interviewer,
  interviewee: ceoWithMemory,
  topic: "Q4 plans and strategic priorities",
  depth: 5  // 5 follow-up questions
})

// 4. Save important points to CEO's memory
const keyPoints = await analyzeResponses.execute({
  responses: interview.transcript.filter(t => t.type === 'answer'),
  focusAreas: ["commitments", "strategic_priorities", "specific_goals"]
})

await saveAgentMemory.execute({
  memoryKey: "alexandra-ceo-memory",
  content: {
    interview: interview,
    commitments: keyPoints.analysis.commitments,
    date: new Date().toISOString()
  }
})

return interview
```

---

## Orchestrator Patterns

### Pattern 1: Progressive Enhancement
```typescript
// Start simple, add complexity as needed
let result = await simpleApproach()

if (!verification.goalAchieved) {
  // Add more agents
  const moreExperts = await createMultipleAgents(...)
  result = await deeperAnalysis(moreExperts)
}
```

### Pattern 2: Parallel Tool Execution
```typescript
// Run independent tools in parallel
const [agents, previousAnalysis, marketData] = await Promise.all([
  createMultipleAgents.execute({ count: 10, ... }),
  searchMemories.execute({ query: topic }),
  fetchWebData.execute({ url: dataSource })
])
```

### Pattern 3: Conditional Memory
```typescript
// Only use memory when needed
const isOngoing = input.includes("continue") || input.includes("previous")

if (isOngoing) {
  const memories = await searchMemories.execute({ query: extractTopic(input) })
  if (memories.results.length > 0) {
    agent = await giveAgentMemory.execute({ agent, memoryKey: memories.results[0].memory_key })
  }
}
```

### Pattern 4: Verification-Driven Retry
```typescript
let attempts = 0
let result = null

while (attempts < 3) {
  result = await executeTool(params)
  const verification = await verify(result, goal)
  
  if (verification.goalAchieved && verification.confidence > 0.8) {
    break
  }
  
  // Enhance params with verification feedback
  params._verificationFeedback = verification
  attempts++
}
```

---

## Key Observations

1. **Tools Compose Naturally**: Each tool's output feeds into the next
2. **Memory is Selective**: Only used when continuity adds value
3. **Verification Guides Quality**: Failed verifications lead to better approaches
4. **Parallel When Possible**: Independent operations run concurrently
5. **Simple Requests Stay Simple**: Not every request needs all tools

---

## Testing These Examples

```typescript
// Integration test for code review
describe('Code Review Flow', () => {
  it('creates reviewers, runs discussion, finds consensus', async () => {
    const mockPR = { url: 'test.com/pr/1', diff: 'mock diff' }
    
    // Test the flow
    const reviewers = await createMultipleAgents.execute({
      count: 4,
      populationDescription: "Code reviewers with different expertise"
    })
    
    const discussion = await runDiscussion.execute({
      agents: reviewers,
      topic: `Review: ${mockPR.diff}`,
      style: "analytical"
    })
    
    expect(discussion.discussion.length).toBeGreaterThan(0)
    expect(discussion.participants).toHaveLength(4)
  })
})
```