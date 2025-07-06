#!/usr/bin/env node
/**
 * Simple LLM code generation interface for Claude to use
 * Ensures all context and standards are included
 */

import { generateCode } from './code-generator'

async function main() {
  const task = process.argv.slice(2).join(' ')
  
  if (!task) {
    console.error('Usage: llm-generate <task description>')
    process.exit(1)
  }
  
  try {
    const code = await generateCode({ task })
    console.log(code)
  } catch (error) {
    console.error('Generation failed:', error)
    process.exit(1)
  }
}

main().catch(console.error)