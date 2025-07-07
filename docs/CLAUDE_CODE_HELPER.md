# Claude Code Helper - Local Code Generation with DeepSeek/CodeLlama

## Overview

The Claude Code Helper is a local development tool that allows Claude Code to generate code using DeepSeek Coder or CodeLlama, saving Opus tokens for higher-level architecture and design tasks.

## Purpose

- **Save Opus tokens**: Use local DeepSeek/CodeLlama for repetitive code generation
- **Speed up development**: Generate boilerplate code instantly
- **Fix tests automatically**: Analyze and fix failing tests
- **Refactor code**: Improve existing code patterns

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

## Examples

### Example 1: Generate Edge Function
```bash
npx tsx utils/claude-code-helper.ts generate edge-function sendEmail
```

Generates a complete Edge Function with:
- TypeScript types
- Error handling
- Authentication checks
- CORS headers

### Example 2: Fix Test Failure
```bash
npx tsx utils/claude-code-helper.ts fix-test "e2e/chat.spec.ts" "locator('text=\"Welcome\"') not found"
```

Analyzes the test and error, then:
- Updates selectors
- Adds proper waits
- Fixes assertions

### Example 3: Custom Generation
```bash
npx tsx utils/claude-code-helper.ts custom "Create a React hook for debouncing input"
```

## Benefits

1. **Token Efficiency**: Uses local models instead of Opus for routine tasks
2. **Speed**: Instant code generation without API calls
3. **Consistency**: Generates code following project patterns
4. **Model Choice**: Use DeepSeek for speed or CodeLlama for complexity
5. **Long Operations**: Handles code generation that takes several minutes

## Best Practices

1. Use for repetitive tasks and boilerplate
2. Review generated code before committing
3. Provide clear, specific prompts
4. Use for test fixes and refactoring
5. Keep Opus for architecture decisions

## Integration with Claude Code Workflow

1. **Architecture & Design**: Use Opus (Claude Code)
2. **Implementation**: Use DeepSeek/CodeLlama (Claude Code Helper)
3. **Review & Refinement**: Use Opus (Claude Code)

## Model Selection

- **DeepSeek Coder 6.7B**: Fast, good for simple tasks, smaller model
- **CodeLlama 70B**: More powerful, better for complex generation

The helper automatically detects and uses available models, preferring DeepSeek for speed.

This tool is specifically for Claude Code's use during development sessions to maximize efficiency and token usage.