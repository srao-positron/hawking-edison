# Hawking Edison Developer Documentation

## Overview
This directory contains all technical documentation for the Hawking Edison project - an LLM-orchestrated multi-agent intelligence platform.

## Directory Structure

### 📁 [architecture/](./architecture/)
Core system architecture and design documents
- [COMPLETE_ARCHITECTURE.md](./architecture/COMPLETE_ARCHITECTURE.md) - Full system architecture
- [ABSTRACT_MULTIAGENT_ARCHITECTURE.md](./architecture/ABSTRACT_MULTIAGENT_ARCHITECTURE.md) - No types, pure intelligence
- [AGENT_MEMORY_ARCHITECTURE.md](./architecture/AGENT_MEMORY_ARCHITECTURE.md) - Memory system design
- [API_FIRST_ARCHITECTURE.md](./architecture/API_FIRST_ARCHITECTURE.md) - API-first design principles
- [ASYNC_ARCHITECTURE.md](./architecture/ASYNC_ARCHITECTURE.md) - Asynchronous processing with AWS
- [GOAL_VERIFICATION_ARCHITECTURE.md](./architecture/GOAL_VERIFICATION_ARCHITECTURE.md) - Verification system

### 📁 [tools/](./tools/)
Tool design and implementation documentation
- [TOOL_IMPLEMENTATION_GUIDE.md](./TOOL_IMPLEMENTATION_GUIDE.md) - How each tool was built ⭐
- [TOOLS_SPECIFICATION.md](./tools/TOOLS_SPECIFICATION.md) - Complete tool definitions
- [TOOL_DESIGN_PRINCIPLES.md](./tools/TOOL_DESIGN_PRINCIPLES.md) - Design philosophy
- [TOOL_PARAMETERIZATION_GUIDE.md](./tools/TOOL_PARAMETERIZATION_GUIDE.md) - Parameter design

### 📁 [demos/](./demos/)
Demo specifications and examples
- [KILLER_DEMO_SPECIFICATION.md](./demos/KILLER_DEMO_SPECIFICATION.md) - Three killer demos
- [CODE_REVIEW_DEMO_SPECIFICATION.md](./demos/CODE_REVIEW_DEMO_SPECIFICATION.md) - Code review example
- [POLITICAL_SPEECH_DEMO_SPECIFICATION.md](./demos/POLITICAL_SPEECH_DEMO_SPECIFICATION.md) - Speech testing

### 📁 [development/](./development/)
Development guides and standards
- [DEVELOPMENT_RULES.md](./development/DEVELOPMENT_RULES.md) - Immutable development rules
- [DEVELOPMENT_STANDARDS_V2.md](./development/DEVELOPMENT_STANDARDS_V2.md) - Coding standards
- [DEVELOPMENT_WORKFLOW.md](./development/DEVELOPMENT_WORKFLOW.md) - Development process
- [MASTER_PLAN_V3.md](./development/MASTER_PLAN_V3.md) - Overall development plan

## Key Documents

### 🔧 Tool Implementation Guide
The [TOOL_IMPLEMENTATION_GUIDE.md](./TOOL_IMPLEMENTATION_GUIDE.md) provides detailed documentation on how each tool was built, including:
- Agent creation tools
- Interaction tools (discussions, interviews)
- Analysis tools with verification
- Memory system implementation
- Architecture decisions and rationale

### 🏗️ System Architecture
Start with [COMPLETE_ARCHITECTURE.md](./architecture/COMPLETE_ARCHITECTURE.md) for an overview, then dive into specific areas:
- No types/templates approach
- Tool-based orchestration
- Verification at every level
- Memory as an optional tool

### 🚀 Getting Started
1. Read [DEVELOPMENT_RULES.md](./development/DEVELOPMENT_RULES.md) - these apply to every session
2. Review [TOOL_IMPLEMENTATION_GUIDE.md](./TOOL_IMPLEMENTATION_GUIDE.md) to understand the tools
3. Check [MASTER_PLAN_V3.md](./development/MASTER_PLAN_V3.md) for the development roadmap

## Quick Links

- **Main Project README**: [../README.md](../README.md)
- **Claude Instructions**: [../CLAUDE.md](../CLAUDE.md)
- **API Documentation**: [API on Postman](https://www.postman.com/your-workspace)
- **Production URL**: https://hawkingedison.com

## Core Principles

1. **No Types or Templates** - Pure natural language processing
2. **Tools, Not Features** - Simple, composable building blocks
3. **Verification Everywhere** - Every output is verified
4. **Memory is Optional** - Agents are ephemeral by default
5. **API-First** - All business logic in Edge Functions

## Recent Updates

- ✅ Implemented core orchestration tools (Jan 2025)
- ✅ Added goal verification system
- ✅ Created agent memory architecture
- ✅ Built Lambda orchestrator with AWS integration
- 🔄 Next: Visualization tools and real-time updates