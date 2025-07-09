# Claude Code Helper - Local Code Generation with DeepSeek/CodeLlama

## Overview

The Claude Code Helper is a local development tool that allows Claude Code to generate code using DeepSeek Coder or CodeLlama, saving Opus tokens for higher-level architecture and design tasks.

**Enhanced Features (v2):**
- Automatically loads and includes development rules in every prompt
- Reads existing code patterns from the codebase
- Provides full project context to the local LLM
- Ensures generated code follows project standards

## Purpose

- **Save Opus tokens**: Use local DeepSeek/CodeLlama for repetitive code generation
- **Speed up development**: Generate boilerplate code instantly
- **Fix tests automatically**: Analyze and fix failing tests
- **Refactor code**: Improve existing code patterns
- **Full Context Awareness**: Generated code follows all development rules and patterns

## Installation

1. Install Ollama: https://ollama.ai
2. Pull one or both models:
   ```bash
   # DeepSeek Coder (faster, 3.8GB)
   ollama pull deepseek-coder:6.7b
   
   # CodeLlama 70B (more powerful, 38GB)
   ollama pull codellama:70b
   ```

## Usage

### Check Installation
```bash
npx tsx utils/claude-code-helper.ts check
```

### Generate Boilerplate Code
```bash
# Edge Function
npx tsx utils/claude-code-helper.ts generate edge-function processPayment

# React Component
npx tsx utils/claude-code-helper.ts generate react-component UserProfile

# Test File
npx tsx utils/claude-code-helper.ts generate test auth.spec

# API Endpoint
npx tsx utils/claude-code-helper.ts generate api-endpoint createUser
```

### Fix Failing Tests
```bash
npx tsx utils/claude-code-helper.ts fix-test "e2e/auth.spec.ts" "TimeoutError: waiting for navigation"
```

### Custom Code Generation
```bash
npx tsx utils/claude-code-helper.ts custom "Create a TypeScript function to validate email addresses"
```

### Generate with File Context
```bash
# Provide specific files as context
npx tsx utils/claude-code-helper.ts with-files "Add error handling" src/lib/api.ts src/lib/types.ts
```

## Examples

### Example 1: Generate Edge Function
```bash
npx tsx utils/claude-code-helper.ts generate edge-function sendEmail
```

Generates a complete Edge Function with:
- TypeScript types
- Dual authentication (session + API key)
- Error handling with our ErrorCodes
- CORS headers matching our patterns
- Consistent API response format

### Example 2: Fix Test Failure
```bash
npx tsx utils/claude-code-helper.ts fix-test "e2e/chat.spec.ts" "locator('text=\"Welcome\"') not found"
```

Analyzes the test and error, then:
- Updates selectors to match current UI
- Adds proper waits
- Uses our test patterns
- Follows development rules

### Example 3: Custom Generation
```bash
npx tsx utils/claude-code-helper.ts custom "Create a React hook for debouncing input"
```

### Example 4: Generate with File Context
```bash
npx tsx utils/claude-code-helper.ts with-files "Add retry logic" src/lib/api-client.ts src/lib/types.ts
```

Provides specific files as context for more accurate code generation.

## How Context Enhancement Works

1. **Development Rules**: Automatically loads DEVELOPMENT_RULES.md and includes relevant rules based on the task type
2. **Project Context**: Extracts key sections from CLAUDE.md (architecture, patterns, principles)
3. **Code Examples**: Finds similar existing code in the codebase to use as examples
4. **Smart Prompts**: Builds prompts that include all context, ensuring generated code follows project standards

## Benefits

1. **Token Efficiency**: Uses local models instead of Opus for routine tasks
2. **Speed**: Instant code generation without API calls
3. **Consistency**: Generates code following project patterns
4. **Model Choice**: Use DeepSeek for speed or CodeLlama for complexity
5. **Long Operations**: Handles code generation that takes several minutes
6. **Full Context**: Automatically includes development rules and project patterns
7. **Smart Generation**: Reads similar code from the codebase for better results

## Best Practices

1. Use for repetitive tasks and boilerplate
2. Review generated code before committing
3. Provide clear, specific prompts
4. Use for test fixes and refactoring
5. Keep Opus for architecture decisions
6. Use `with-files` when you need specific context

## Integration with Claude Code Workflow

1. **Architecture & Design**: Use Opus (Claude Code)
2. **Implementation**: Use DeepSeek/CodeLlama (Claude Code Helper)
3. **Review & Refinement**: Use Opus (Claude Code)

## Model Selection

- **DeepSeek Coder 6.7B**: Fast, good for simple tasks, smaller model
- **CodeLlama 70B**: More powerful, better for complex generation

The helper automatically detects and uses available models, preferring DeepSeek for speed.

## Advanced Usage

### Custom Generation with Multiple Files
```bash
# Generate code that needs to understand multiple files
npx tsx utils/claude-code-helper.ts with-files "Create a new API endpoint that calls these services" \
  src/lib/api-client.ts \
  src/lib/auth.ts \
  supabase/functions/interact/index.ts
```

### Fix Complex Test Failures
```bash
# The helper understands our test patterns and will fix accordingly
npx tsx utils/claude-code-helper.ts fix-test "e2e/local/chat-threads.spec.ts" \
  "locator.click: Target closed"
```

### Switch Models
```bash
# Use CodeLlama for complex tasks
npx tsx utils/claude-code-helper.ts model codellama:70b
npx tsx utils/claude-code-helper.ts custom "Implement a complex algorithm for..."

# Switch back to DeepSeek for speed
npx tsx utils/claude-code-helper.ts model deepseek-coder:6.7b
```

This tool is specifically for Claude Code's use during development sessions to maximize efficiency and token usage. The enhanced context ensures that generated code always follows project standards and patterns.