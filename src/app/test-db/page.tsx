'use client'

import { useState } from 'react'
import { Button, Container, Paper, Text, Code, Stack } from '@mantine/core'
import { supabase } from '@/lib/supabase'

export default function TestDbPage() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testDatabase = async () => {
    setLoading(true)
    const output: string[] = []
    
    try {
      // 1. Check if user is authenticated
      output.push('1. Checking authentication...')
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        output.push(`❌ Auth error: ${authError.message}`)
        setResult(output.join('\n'))
        setLoading(false)
        return
      }
      
      if (!user) {
        output.push('❌ No user logged in')
        setResult(output.join('\n'))
        setLoading(false)
        return
      }
      
      output.push(`✅ User authenticated: ${user.email} (${user.id})`)
      
      // 2. Test database insert
      output.push('\n2. Testing database insert...')
      const { data: insertData, error: insertError } = await supabase
        .from('interactions')
        .insert({
          user_id: user.id,
          input: 'Test from UI',
          tool_calls: [],
          result: { test: true, timestamp: new Date().toISOString() }
        })
        .select()
        .single()
      
      if (insertError) {
        output.push(`❌ Insert error: ${insertError.message}`)
        output.push(`   Code: ${insertError.code}`)
        output.push(`   Details: ${JSON.stringify(insertError.details)}`)
        output.push(`   Hint: ${insertError.hint}`)
      } else {
        output.push(`✅ Insert successful: ${insertData.id}`)
        
        // 3. Test reading back
        output.push('\n3. Testing database read...')
        const { data: readData, error: readError } = await supabase
          .from('interactions')
          .select('*')
          .eq('id', insertData.id)
          .single()
        
        if (readError) {
          output.push(`❌ Read error: ${readError.message}`)
        } else {
          output.push(`✅ Read successful: ${JSON.stringify(readData, null, 2)}`)
        }
        
        // 4. Clean up
        output.push('\n4. Cleaning up...')
        const { error: deleteError } = await supabase
          .from('interactions')
          .delete()
          .eq('id', insertData.id)
        
        if (deleteError) {
          output.push(`❌ Delete error: ${deleteError.message}`)
        } else {
          output.push('✅ Cleanup successful')
        }
      }
      
      // 5. Check table structure
      output.push('\n5. Checking table structure...')
      const { data: tableInfo, error: tableError } = await supabase
        .from('interactions')
        .select('*')
        .limit(0)
      
      if (!tableError) {
        output.push('✅ Table exists and is accessible')
      } else {
        output.push(`❌ Table error: ${tableError.message}`)
      }
      
    } catch (error: any) {
      output.push(`\n❌ Unexpected error: ${error.message}`)
    }
    
    setResult(output.join('\n'))
    setLoading(false)
  }

  return (
    <Container size="lg" my={40}>
      <Paper p="xl">
        <Stack gap="md">
          <Text size="xl" fw={700}>Database Test Page</Text>
          <Text c="dimmed">
            This page tests database connectivity and RLS policies.
            You must be logged in for the tests to work.
          </Text>
          
          <Button onClick={testDatabase} loading={loading}>
            Run Database Tests
          </Button>
          
          {result && (
            <Code block style={{ whiteSpace: 'pre-wrap' }}>
              {result}
            </Code>
          )}
        </Stack>
      </Paper>
    </Container>
  )
}