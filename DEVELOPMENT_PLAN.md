# Hawking Edison v2 Development Plan

## Executive Summary

Hawking Edison v2 is a complete reimagining of the multi-agent orchestration platform, built on Supabase with a focus on simplicity, flexibility, and user experience. The platform enables users to create AI-powered panels for decision support, code reviews, research, and message testing through natural language commands.

## Core Architecture

### Technology Stack
- **Frontend**: Next.js 15+ with TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Edge Functions, Realtime, Auth)
- **AI/LLM**: Claude Opus 4 (default), OpenAI, AWS Bedrock
- **Queue System**: Supabase Queues (pgmq)
- **Storage**: Supabase Storage (S3-compatible) + pgvector for embeddings
- **Real-time**: Supabase Realtime for live updates
- **Browser Extension**: Chrome/Edge extension for web content ingestion

### Key Design Principles
1. **Chat-First Interface**: Slack-style UI where users describe what they want in natural language
2. **Zero Configuration**: System automatically creates agents, tools, and configurations
3. **Unified Data Store**: Single embedding database per user for all content
4. **Tool Flexibility**: Auto-generate tools based on use cases
5. **Real-time Everything**: Streaming responses, live collaboration
6. **Progressive Disclosure**: Simple by default, powerful when needed

## Database Schema

### Core Tables

```sql
-- Users and Authentication (handled by Supabase Auth)

-- User Knowledge Base
CREATE TABLE user_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  metadata JSONB,
  source_url TEXT,
  source_type TEXT, -- 'linkedin', 'twitter', 'web', 'document', etc.
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Panels
CREATE TABLE panels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT, -- 'decision_support', 'code_review', 'research', 'message_testing'
  config JSONB,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Panel Participants (Agents)
CREATE TABLE panel_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id UUID REFERENCES panels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  personality_prompt TEXT,
  model TEXT DEFAULT 'claude-opus-4',
  model_config JSONB,
  tools TEXT[], -- Array of tool IDs
  memory_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Memory Store
CREATE TABLE agent_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES panel_participants(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  metadata JSONB,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Panel Discussions
CREATE TABLE panel_discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id UUID REFERENCES panels(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Panel Exchanges
CREATE TABLE panel_exchanges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID REFERENCES panel_discussions(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES panel_participants(id),
  content TEXT NOT NULL,
  tool_calls JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tools Registry
CREATE TABLE tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  code TEXT NOT NULL,
  language TEXT DEFAULT 'javascript', -- 'javascript', 'typescript', 'python'
  parameters JSONB,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Keys Management
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'anthropic', 'openai', 'aws', etc.
  encrypted_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Simulations
CREATE TABLE simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  audience_config JSONB,
  status TEXT DEFAULT 'pending',
  results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS on all tables
ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;
```

## Core Features Implementation

### 1. Chat Interface & Natural Language Processing

The main interface will be a chat where users can type commands like:
- "Create a code review panel for my GitHub PR #123"
- "Test this marketing message with 200 liberal voters aged 25-45"
- "Setup a decision support panel with 5 experts to help me decide whether to use React or Vue"

Implementation:
1. Parse user intent using Claude
2. Extract entities (panel type, participant count, attributes)
3. Auto-generate configuration
4. Create necessary tools if they don't exist
5. Start the panel/simulation

### 2. Intelligent Agent Creation

When users request agents with specific personalities:
1. Search user's knowledge base for matching content
2. Use pgvector similarity search to find relevant documents
3. Generate personality prompt using LLM summarization
4. Configure appropriate tools based on context

### 3. Dynamic Tool Generation

When a use case requires a non-existent tool:
1. Analyze the requirement
2. Generate tool code using Claude with comprehensive documentation
3. Validate and test the tool
4. Register it in the tools database
5. Make it available to agents

### 4. Real-time Panel Discussions

1. Create discussion in database
2. Queue panel execution via pgmq
3. Edge Function processes the panel:
   - Initialize all participants
   - Manage turn-taking
   - Execute tool calls
   - Stream responses via Supabase Realtime
4. Update UI in real-time
5. Store exchanges for future reference

### 5. Browser Extension

Simple extension that:
1. Extracts all text from current page
2. Sends to user's knowledge base
3. Processes and embeds for future use
4. One-click operation with visual feedback

## API Design

### RESTful Endpoints

```
POST   /api/panels                 - Create new panel
GET    /api/panels/:id            - Get panel details
POST   /api/panels/:id/discuss    - Start discussion
GET    /api/panels/:id/exchanges  - Get discussion history

POST   /api/tools                 - Create/register tool
GET    /api/tools                 - List available tools
POST   /api/tools/generate        - Auto-generate tool

POST   /api/knowledge             - Add to knowledge base
GET    /api/knowledge/search      - Search knowledge base

POST   /api/simulations           - Run simulation
GET    /api/simulations/:id       - Get simulation results

POST   /api/auth/keys             - Store API key
GET    /api/auth/keys             - List stored providers
```

### Webhook Support

```
POST   /api/webhooks/github       - GitHub integration
POST   /api/webhooks/slack        - Slack integration
POST   /api/webhooks/custom       - Custom webhooks
```

## User Experience Flow

### First-Time User

1. Sign up with Google/GitHub
2. See simple chat interface
3. Type: "Help me review my code"
4. System asks for GitHub repo access
5. Automatically creates code review panel
6. Shows live discussion in side panel
7. User realizes the power of the platform

### Power User

1. Has extensive knowledge base built up
2. Custom tools created for specific workflows
3. Saved panel configurations
4. API integration with CI/CD pipeline
5. Webhooks triggering automated panels

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Setup Next.js project with Supabase
- [ ] Implement authentication (Google, GitHub)
- [ ] Create database schema
- [ ] Basic chat UI
- [ ] Simple panel creation

### Phase 2: Core Features (Week 3-4)
- [ ] Natural language panel creation
- [ ] Agent personality system
- [ ] Basic tool registry
- [ ] Real-time streaming
- [ ] Panel execution engine

### Phase 3: Knowledge & Tools (Week 5-6)
- [ ] Knowledge base with embeddings
- [ ] Browser extension
- [ ] Tool auto-generation
- [ ] Agent memory system

### Phase 4: Advanced Features (Week 7-8)
- [ ] Simulation engine
- [ ] API endpoints
- [ ] Webhook support
- [ ] Collaboration features

### Phase 5: Polish & Launch (Week 9-10)
- [ ] UI/UX refinement
- [ ] Documentation site
- [ ] Performance optimization
- [ ] Security hardening
- [ ] Launch preparation

## Technical Implementation Details

### Edge Functions Structure

```typescript
// Panel Processor
export async function processPanelDiscussion(discussionId: string) {
  // 1. Load panel configuration
  // 2. Initialize participants with tools
  // 3. Run discussion rounds
  // 4. Stream updates via Realtime
  // 5. Store results
}

// Tool Executor
export async function executeTool(toolId: string, params: any) {
  // 1. Load tool code
  // 2. Create sandboxed environment
  // 3. Execute with timeout
  // 4. Return results
}

// Knowledge Processor
export async function processKnowledge(content: string, userId: string) {
  // 1. Extract text
  // 2. Generate embeddings
  // 3. Store in vector database
  // 4. Update user's available personalities
}
```

### Real-time Architecture

```typescript
// Client subscription
const channel = supabase
  .channel('panel-updates')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'panel_exchanges',
    filter: `discussion_id=eq.${discussionId}`
  }, (payload) => {
    // Update UI with new exchange
  })
  .subscribe()
```

### Security Model

1. **Row Level Security**: All data isolated by user_id
2. **API Key Encryption**: Using Supabase Vault
3. **Rate Limiting**: Via Supabase API Gateway
4. **Tool Sandboxing**: Isolated execution environment
5. **OAuth Flows**: For third-party integrations

## Success Metrics

1. **Time to First Value**: < 2 minutes from signup to first panel
2. **Panel Creation Success**: > 95% successful panel creations
3. **Response Time**: < 2s for panel initiation
4. **Streaming Latency**: < 500ms for updates
5. **Tool Generation Success**: > 90% working on first try

## Risk Mitigation

1. **LLM Rate Limits**: Queue system with retry logic
2. **Long Running Panels**: Background processing with status updates
3. **Tool Security**: Sandboxed execution, code review
4. **Data Privacy**: Encryption, isolation, audit logs
5. **Scaling**: Horizontal scaling via Supabase

## Future Enhancements

1. **Voice Interface**: Speak to create panels
2. **Mobile Apps**: Native iOS/Android
3. **Team Collaboration**: Shared panels and knowledge
4. **Custom Models**: Fine-tuned models for specific domains
5. **Analytics Dashboard**: Usage insights and optimization

This plan provides a solid foundation for building Hawking Edison v2 with focus on simplicity, flexibility, and powerful capabilities that users discover progressively.