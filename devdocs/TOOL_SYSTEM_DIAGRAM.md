# Tool System Architecture Diagram

## Overview
This diagram shows how the LLM orchestrator uses tools to accomplish user goals.

```mermaid
graph TB
    User[User Request] --> Orchestrator[LLM Orchestrator]
    
    Orchestrator --> Tools{Available Tools}
    
    Tools --> AgentTools[Agent Tools]
    Tools --> InteractionTools[Interaction Tools]
    Tools --> AnalysisTools[Analysis Tools]
    Tools --> MemoryTools[Memory Tools]
    
    AgentTools --> createAgent[createAgent]
    AgentTools --> createMultiple[createMultipleAgents]
    
    InteractionTools --> runDiscussion[runDiscussion]
    InteractionTools --> gatherResponses[gatherIndependentResponses]
    InteractionTools --> interview[conductInterview]
    
    AnalysisTools --> analyze[analyzeResponses]
    AnalysisTools --> consensus[findConsensus]
    AnalysisTools --> validate[validateResults]
    
    MemoryTools --> giveMemory[giveAgentMemory]
    MemoryTools --> saveMemory[saveAgentMemory]
    MemoryTools --> searchMem[searchMemories]
    
    createAgent --> Verification{Goal Verification}
    runDiscussion --> Verification
    analyze --> Verification
    
    Verification -->|Pass| Response[Final Response]
    Verification -->|Fail| Retry[Retry with Feedback]
    
    Retry --> Orchestrator
    Response --> User
    
    style Orchestrator fill:#f9f,stroke:#333,stroke-width:4px
    style Verification fill:#ff9,stroke:#333,stroke-width:2px
```

## Tool Composition Flow

```mermaid
graph LR
    subgraph "Example: Business Decision"
        A[User: Should OpenAI buy Anthropic?] --> B[Orchestrator]
        B --> C[createMultipleAgents<br/>M&A experts, analysts]
        C --> D[giveAgentMemory<br/>Previous analysis context]
        D --> E[runDiscussion<br/>Debate acquisition]
        E --> F[analyzeResponses<br/>Extract key points]
        F --> G[findConsensus<br/>Identify agreements]
        G --> H[Verify & Respond]
    end
    
    style B fill:#f9f,stroke:#333,stroke-width:2px
```

## Memory Tool Flow

```mermaid
stateDiagram-v2
    [*] --> CreateAgent: User requests continuation
    CreateAgent --> CheckMemory: Agent created
    CheckMemory --> LoadMemory: Memory exists
    CheckMemory --> NoMemory: First interaction
    LoadMemory --> EnhanceAgent: Add context
    NoMemory --> UseAgent: Direct use
    EnhanceAgent --> UseAgent: Agent ready
    UseAgent --> SaveMemory: Interaction complete
    SaveMemory --> [*]: Memory persisted
```

## Verification System

```mermaid
graph TD
    subgraph "Verification Layers"
        ToolOutput[Tool Output] --> ToolVerify{Tool-Level<br/>Verification}
        ToolVerify -->|Pass| OrchestratorCollect[Orchestrator<br/>Collects Results]
        ToolVerify -->|Fail| ToolRetry[Tool Retry<br/>with Feedback]
        
        ToolRetry --> ToolOutput
        
        OrchestratorCollect --> FinalVerify{Orchestrator-Level<br/>Verification}
        FinalVerify -->|Pass| UserResponse[Return to User]
        FinalVerify -->|Fail| OrchestratorRetry[Orchestrator Retry<br/>with New Approach]
        
        OrchestratorRetry --> NewTools[Select Different Tools]
        NewTools --> ToolOutput
    end
    
    style ToolVerify fill:#ff9
    style FinalVerify fill:#ff9
```

## Data Flow Through Tools

```mermaid
flowchart TD
    subgraph "Data Transformation"
        Spec[Natural Language<br/>Specification] --> Agent[Agent Object]
        Agent --> Discussion[Discussion<br/>Transcript]
        Discussion --> Analysis[Analysis<br/>Results]
        Analysis --> Consensus[Consensus<br/>Findings]
        Consensus --> Report[Final Report]
    end
    
    subgraph "Memory Layer"
        Agent -.->|Optional| Memory[(Agent Memories<br/>Database)]
        Memory -.->|Load| Agent
        Discussion -.->|Save| Memory
    end
```

## Tool Categories and Capabilities

```mermaid
mindmap
  root((LLM<br/>Orchestrator))
    Agent Management
      createAgent
        Any persona
        Natural language spec
        Ephemeral by default
      createMultipleAgents
        Populations
        Simulations
        Diverse perspectives
    Interactions
      runDiscussion
        Multi-agent
        Various styles
        Turn-based
      gatherResponses
        Independent
        Parallel
        Survey-like
      conductInterview
        One-on-one
        Follow-ups
        Depth control
    Analysis
      analyzeResponses
        Patterns
        Themes
        Insights
      findConsensus
        Agreements
        Disagreements
        Nuances
      validateResults
        Accuracy
        Completeness
        Logic check
    Memory
      giveAgentMemory
        Load context
        Continuity
        Selective scope
      saveAgentMemory
        Persist state
        Future recall
        Metadata
      searchMemories
        Semantic
        Cross-session
        Pattern finding
```

## AWS Lambda Architecture

```mermaid
graph TB
    subgraph "Edge Functions"
        API[Supabase Edge Function<br/>/interact]
    end
    
    subgraph "AWS Infrastructure"
        API -->|Complex Request| SNS[SNS Topic]
        SNS --> SQS[SQS Queue]
        SQS --> Lambda[Orchestrator Lambda<br/>14 min timeout]
        
        Lambda --> Tools{Execute Tools}
        Tools --> LLM[LLM APIs<br/>Claude/OpenAI]
        
        Lambda --> DynamoDB[(Active Sessions<br/>DynamoDB)]
        Lambda --> Supabase[(Supabase<br/>Database)]
        
        Lambda -->|Timeout| Resumption[Resumption Lambda]
        Resumption -->|Resume| SNS
    end
    
    API -->|Simple Request| DirectResponse[Direct Response]
    Lambda -->|Complete| CompleteSession[Session Complete]
    
    style Lambda fill:#ff9,stroke:#333,stroke-width:2px
```

## Implementation Status

```mermaid
gantt
    title Tool Implementation Progress
    dateFormat  YYYY-MM-DD
    section Agent Tools
    createAgent           :done, 2025-01-09, 1d
    createMultipleAgents  :done, 2025-01-09, 1d
    
    section Interaction Tools
    runDiscussion         :done, 2025-01-09, 1d
    gatherResponses       :done, 2025-01-09, 1d
    conductInterview      :done, 2025-01-09, 1d
    
    section Analysis Tools
    analyzeResponses      :done, 2025-01-09, 1d
    findConsensus         :done, 2025-01-09, 1d
    validateResults       :done, 2025-01-09, 1d
    
    section Memory Tools
    giveAgentMemory       :done, 2025-01-09, 1d
    saveAgentMemory       :done, 2025-01-09, 1d
    searchMemories        :done, 2025-01-09, 1d
    
    section Pending Tools
    createVisualization   :active, 2025-01-10, 3d
    generateReport        :active, 2025-01-10, 3d
    fetchWebData          : 2025-01-13, 2d
```