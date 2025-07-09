import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const edgeFunctionsUrl = process.env.NEXT_PUBLIC_EDGE_FUNCTIONS_URL || `${supabaseUrl}/functions/v1`

// Test user credentials
const testEmail = `sid+he-testing-threads-${Date.now()}@hawkingedison.com`
const testPassword = 'TestPassword123!'

describe('Threads API', () => {
  let supabase: any
  let authToken: string
  let userId: string
  let testThreadId: string

  beforeEach(async () => {
    // Create test client
    supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Sign up test user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    })

    if (signUpError) throw signUpError
    
    authToken = authData.session?.access_token!
    userId = authData.user?.id!
  })

  afterEach(async () => {
    // Clean up test data
    if (testThreadId) {
      await fetch(`${edgeFunctionsUrl}/threads/${testThreadId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      })
    }

    // Sign out
    await supabase.auth.signOut()
  })

  it('should create a thread with auto-generated name', async () => {
    const response = await fetch(`${edgeFunctionsUrl}/threads`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: 'Help me analyze my sales data for Q4 2024'
      }),
    })

    expect(response.ok).toBe(true)
    expect(response.status).toBe(201)

    const data = await response.json()
    expect(data.thread).toBeDefined()
    expect(data.thread.id).toBeDefined()
    expect(data.thread.user_id).toBe(userId)
    expect(data.thread.name).toBeDefined()
    expect(data.thread.name).not.toBe('New Conversation')
    expect(data.thread.auto_generated_name).toBe(data.thread.name)

    testThreadId = data.thread.id
  })

  it('should create a thread with custom name', async () => {
    const customName = 'My Custom Thread Name'
    
    const response = await fetch(`${edgeFunctionsUrl}/threads`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: customName,
        input: 'This is the first message'
      }),
    })

    expect(response.ok).toBe(true)
    
    const data = await response.json()
    expect(data.thread.name).toBe(customName)
    expect(data.thread.auto_generated_name).toBeNull()

    testThreadId = data.thread.id
  })

  it('should list user threads', async () => {
    // Create a thread first
    const createResponse = await fetch(`${edgeFunctionsUrl}/threads`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: 'Test thread for listing'
      }),
    })

    const { thread } = await createResponse.json()
    testThreadId = thread.id

    // List threads
    const listResponse = await fetch(`${edgeFunctionsUrl}/threads`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    })

    expect(listResponse.ok).toBe(true)
    
    const { threads } = await listResponse.json()
    expect(Array.isArray(threads)).toBe(true)
    expect(threads.length).toBeGreaterThan(0)
    expect(threads.some((t: any) => t.id === testThreadId)).toBe(true)
  })

  it('should get a specific thread', async () => {
    // Create a thread first
    const createResponse = await fetch(`${edgeFunctionsUrl}/threads`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: 'Test thread for retrieval'
      }),
    })

    const { thread } = await createResponse.json()
    testThreadId = thread.id

    // Get the thread
    const getResponse = await fetch(`${edgeFunctionsUrl}/threads/${testThreadId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    })

    expect(getResponse.ok).toBe(true)
    
    const data = await getResponse.json()
    expect(data.thread.id).toBe(testThreadId)
    expect(data.thread.messages).toBeDefined()
    expect(data.thread.visualizations).toBeDefined()
  })

  it('should update thread name', async () => {
    // Create a thread first
    const createResponse = await fetch(`${edgeFunctionsUrl}/threads`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: 'Original thread'
      }),
    })

    const { thread } = await createResponse.json()
    testThreadId = thread.id

    // Update the thread name
    const newName = 'Updated Thread Name'
    const updateResponse = await fetch(`${edgeFunctionsUrl}/threads/${testThreadId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: newName
      }),
    })

    expect(updateResponse.ok).toBe(true)
    
    // Verify the update
    const getResponse = await fetch(`${edgeFunctionsUrl}/threads/${testThreadId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    })

    const { thread: updatedThread } = await getResponse.json()
    expect(updatedThread.name).toBe(newName)
  })

  it('should delete a thread', async () => {
    // Create a thread first
    const createResponse = await fetch(`${edgeFunctionsUrl}/threads`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: 'Thread to delete'
      }),
    })

    const { thread } = await createResponse.json()
    const threadToDelete = thread.id

    // Delete the thread
    const deleteResponse = await fetch(`${edgeFunctionsUrl}/threads/${threadToDelete}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    })

    expect(deleteResponse.ok).toBe(true)
    
    // Verify deletion
    const getResponse = await fetch(`${edgeFunctionsUrl}/threads/${threadToDelete}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    })

    expect(getResponse.status).toBe(404)
  })

  it('should require authentication', async () => {
    const response = await fetch(`${edgeFunctionsUrl}/threads`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    expect(response.status).toBe(401)
  })

  it('should not allow access to other users threads', async () => {
    // Create a thread with one user
    const createResponse = await fetch(`${edgeFunctionsUrl}/threads`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: 'Private thread'
      }),
    })

    const { thread } = await createResponse.json()
    testThreadId = thread.id

    // Create another user
    const anotherEmail = `sid+he-testing-threads-other-${Date.now()}@hawkingedison.com`
    const { data: otherAuth } = await supabase.auth.signUp({
      email: anotherEmail,
      password: testPassword,
    })

    // Try to access the first user's thread
    const unauthorizedResponse = await fetch(`${edgeFunctionsUrl}/threads/${testThreadId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${otherAuth.session?.access_token}`,
      },
    })

    expect(unauthorizedResponse.status).toBe(404)
  })
})