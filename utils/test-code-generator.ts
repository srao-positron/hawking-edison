#!/usr/bin/env node
/**
 * Test the code generator to ensure it follows project standards
 */

import { generateCode } from './code-generator'
import { readFileSync } from 'fs'

const tests = [
  {
    name: 'API Route Generation',
    task: 'Generate a Next.js API route at src/app/api/test/route.ts that accepts a "message" parameter and returns it in uppercase. Include proper authentication and error handling.',
    checks: [
      (code: string) => code.includes('authenticate(request)'),
      (code: string) => code.includes('NextResponse.json'),
      (code: string) => code.includes('success: true'),
      (code: string) => code.includes('success: false'),
      (code: string) => !code.includes('//'), // No comments
      (code: string) => !code.includes('enum'),
      (code: string) => !code.includes('interface') || code.includes('interface ComponentNameProps'), // Only props interfaces allowed
    ]
  },
  {
    name: 'Database Migration',
    task: 'Generate a Supabase migration to create a "notes" table with id, user_id, title, content, and timestamps. Include RLS policies.',
    checks: [
      (code: string) => code.includes('CREATE TABLE notes'),
      (code: string) => code.includes('user_id UUID NOT NULL REFERENCES auth.users(id)'),
      (code: string) => code.includes('ENABLE ROW LEVEL SECURITY'),
      (code: string) => code.includes('CREATE POLICY'),
      (code: string) => code.includes('auth.uid() = user_id'),
      (code: string) => !code.includes('--') || code.includes('-- supabase/migrations'), // SQL comments OK at top
    ]
  },
  {
    name: 'React Component',
    task: 'Generate a React component called NotesList that fetches and displays notes from the API. Use Mantine UI components.',
    checks: [
      (code: string) => code.includes("'use client'"),
      (code: string) => code.includes('import { api }'),
      (code: string) => code.includes('@mantine/core'),
      (code: string) => code.includes('useState'),
      (code: string) => code.includes('setLoading(true)'),
      (code: string) => !code.includes('//'), // No comments
      (code: string) => !code.includes('enum'),
    ]
  },
  {
    name: 'Tool Creation',
    task: 'Generate a tool called "summarizeText" that takes a text parameter and returns a summary. Follow the tool pattern exactly.',
    checks: [
      (code: string) => code.includes('export const summarizeText = {'),
      (code: string) => code.includes('name: \'summarizeText\''),
      (code: string) => code.includes('description:'),
      (code: string) => code.includes('parameters:'),
      (code: string) => code.includes('execute: async'),
      (code: string) => !code.includes('//'), // No comments
      (code: string) => !code.includes('class'),
      (code: string) => !code.includes('enum'),
    ]
  }
]

async function runTests() {
  console.log('🧪 Testing Code Generator Standards Compliance\n')
  
  let passed = 0
  let failed = 0
  
  for (const test of tests) {
    console.log(`📝 Test: ${test.name}`)
    console.log(`   Task: ${test.task}\n`)
    
    try {
      const code = await generateCode({ task: test.task })
      
      let testPassed = true
      const failedChecks: string[] = []
      
      test.checks.forEach((check, index) => {
        if (!check(code)) {
          testPassed = false
          failedChecks.push(`Check ${index + 1}`)
        }
      })
      
      if (testPassed) {
        console.log('   ✅ PASSED - All checks passed\n')
        passed++
      } else {
        console.log(`   ❌ FAILED - Failed checks: ${failedChecks.join(', ')}\n`)
        console.log('   Generated code:')
        console.log('   ---')
        console.log(code.split('\n').map(line => '   ' + line).join('\n'))
        console.log('   ---\n')
        failed++
      }
    } catch (error) {
      console.log(`   ❌ ERROR - ${error}\n`)
      failed++
    }
  }
  
  console.log('\n📊 Results:')
  console.log(`   Passed: ${passed}`)
  console.log(`   Failed: ${failed}`)
  console.log(`   Total: ${tests.length}`)
  
  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. The local LLM may need additional context or a different model.')
    console.log('Consider using a more capable model or adjusting the context in LOCAL_LLM_CONTEXT.md')
  } else {
    console.log('\n🎉 All tests passed! The code generator is following project standards.')
  }
}

if (require.main === module) {
  runTests().catch(console.error)
}