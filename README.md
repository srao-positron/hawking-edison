# Hawking Edison v2
## LLM-Orchestrated Multi-Agent Intelligence

[![Deploy All](https://github.com/srao-positron/hawking-edison/actions/workflows/deploy-all.yml/badge.svg)](https://github.com/srao-positron/hawking-edison/actions/workflows/deploy-all.yml)
[![Tests](https://github.com/srao-positron/hawking-edison/actions/workflows/test.yml/badge.svg)](https://github.com/srao-positron/hawking-edison/actions/workflows/test.yml)

### ⚠️ DEVELOPERS: Read DEVELOPMENT_RULES.md First!
Before contributing, you MUST read [DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md). It contains mandatory rules that apply to all development.

### What Is This?
A platform where users describe what they need in plain English, and an intelligent system automatically creates the right agents, tools, and visualizations to deliver insights. No configuration. No templates. Just intelligence.

### How It Works
```
User: "Should OpenAI buy Anthropic?"
System: [Creates business analysts, runs discussion, delivers recommendation]

User: "Review this GitHub PR"  
System: [Creates code reviewers, analyzes code, provides feedback]

User: "Test this message with Seattle voters"
System: [Creates 200 diverse personas, tests message, shows results]
```

The same system handles all requests - no special code for different use cases.

### Core Innovation
Instead of building features, we give an LLM powerful tools:
- `createAgent` - Create any kind of agent
- `runDiscussion` - Have agents discuss  
- `gatherResponses` - Get independent responses
- `analyzeResults` - Find patterns and insights
- `createVisualization` - Generate perfect dashboards

The LLM orchestrates these tools to solve any request.

### Key Documents
1. **[MASTER_PLAN_V2.md](MASTER_PLAN_V2.md)** - Complete development plan
2. **[TOOLS_SPECIFICATION.md](TOOLS_SPECIFICATION.md)** - All tool definitions
3. **[DEVELOPMENT_STANDARDS_V2.md](DEVELOPMENT_STANDARDS_V2.md)** - How to build
4. **[CLAUDE.md](CLAUDE.md)** - Quick reference for development

### Quick Start
```bash
# Clone the repo
git clone https://github.com/yourusername/hawking-edison-v2

# Install dependencies
npm install

# Set up Supabase locally
npm run supabase:start

# Start development
npm run dev
```

### Architecture
```
Input → LLM with Tools → Magic → Results
```

That's it. No parsing. No routing. No templates.

### For Developers
- **No Types**: Don't create AgentType, PanelType, etc.
- **No Templates**: Don't hardcode workflows
- **Just Tools**: Build simple, composable tools
- **Trust the LLM**: It's smarter than our categorizations

### Examples of What It Can Do
- Business strategy decisions
- Code reviews
- Message testing
- Market research
- "What would my dog think of this logo?"
- Literally anything you can describe

### Project Status
🚧 Under active development  
📅 Target launch: 12 weeks  
🎯 Goal: Replace complex multi-agent platforms with simple intelligence

### Contributing
Read [DEVELOPMENT_STANDARDS_V2.md](DEVELOPMENT_STANDARDS_V2.md) first. Remember:
1. Build tools, not features
2. No hidden logic in tools
3. Let the LLM orchestrate

### License
[License details]

---

*"We're building tools for intelligence, not encoding intelligence in tools."*

## Status

- ✅ Chat Interface: Live and working
- ✅ Authentication: Email-based auth with API keys
- ✅ Monitoring: Health checks and telemetry
- ✅ Testing: All tests passing (36/42, 6 skipped)
- ✅ Orchestration Infrastructure: Lambda, SNS, SQS deployed
- 🚧 Tool Implementation: In progress
- 🚧 Function Calling: Implementing for Claude and OpenAI