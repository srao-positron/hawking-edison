import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import { api } from '../../src/lib/api-client'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env.local') })

const TEST_EMAIL = 'sid+he-testing-chat@hawkingedison.com'
const TEST_PASSWORD = 'TestChat123!@#'

describe('Chat Flow', () => {
  let supabase: any
  let testUserId: string
  let testThreadId: string

  beforeAll(async () => {
    // Initialize Supabase client
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Create test user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true
    })

    if (authError) {
      throw new Error(`Failed to create test user: ${authError.message}`)
    }

    testUserId = authData.user.id

    // Sign in to get session
    const { data: session, error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    })

    if (signInError) {
      throw new Error(`Failed to sign in: ${signInError.message}`)
    }

    // Mock browser environment for API client
    global.window = {
      localStorage: {
        getItem: () => JSON.stringify({
          access_token: session.session.access_token,
          refresh_token: session.session.refresh_token
        }),
        setItem: () => {},
        removeItem: () => {}
      }
    } as any
  })

  afterAll(async () => {
    // Clean up test data
    if (testUserId) {
      await supabase.from('chat_messages').delete().eq('user_id', testUserId)
      await supabase.from('chat_threads').delete().eq('user_id', testUserId)
      await supabase.from('interactions').delete().eq('user_id', testUserId)
      await supabase.auth.admin.deleteUser(testUserId)
    }
  })

  test('should create a new thread on first message', async () => {
    const testMessage = 'Write me a haiku about testing'
    
    // Send first message without thread ID
    const response = await api.interact(testMessage)
    
    expect(response).toBeDefined()
    expect(response.threadId).toBeDefined()
    expect(response.response).toBeDefined()
    expect(response.interactionId).toBeDefined()
    
    testThreadId = response.threadId
  })

  test('should use existing thread for subsequent messages', async () => {
    const secondMessage = 'Make it about unit testing specifically'
    
    // Send message with existing thread ID
    const response = await api.interact(secondMessage, { 
      sessionId: testThreadId 
    })
    
    expect(response).toBeDefined()
    expect(response.threadId).toBe(testThreadId)
    expect(response.response).toBeDefined()
  })

  test('should list threads with proper titles', async () => {
    const threads = await api.threads.list()
    
    expect(threads).toBeDefined()
    expect(threads.threads).toBeInstanceOf(Array)
    
    const ourThread = threads.threads.find((t: any) => t.id === testThreadId)
    expect(ourThread).toBeDefined()
    expect(ourThread.title).toBe('Write me a haiku about testing')
    expect(ourThread.message_count).toBeGreaterThanOrEqual(2)
  })

  test('should retrieve thread messages', async () => {
    const threadData = await api.threads.get(testThreadId)
    
    expect(threadData).toBeDefined()
    expect(threadData.thread).toBeDefined()
    expect(threadData.messages).toBeInstanceOf(Array)
    expect(threadData.messages.length).toBeGreaterThanOrEqual(2)
    
    // Verify message order
    const messages = threadData.messages
    expect(messages[0].role).toBe('user')
    expect(messages[0].content).toContain('haiku')
    expect(messages[1].role).toBe('assistant')
  })

  test('should handle invalid thread ID gracefully', async () => {
    const invalidThreadId = '00000000-0000-0000-0000-000000000000'
    
    // API should create new thread when invalid ID provided
    const response = await api.interact('Test message', { 
      sessionId: invalidThreadId 
    })
    
    expect(response).toBeDefined()
    expect(response.threadId).toBeDefined()
    expect(response.threadId).not.toBe(invalidThreadId)
  })
})