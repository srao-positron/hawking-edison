import { createClient } from '@supabase/supabase-js'
import { api } from '@/lib/api-client'

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ 
        data: { 
          session: { 
            access_token: 'test-token',
            user: { id: 'test-user-id' }
          } 
        } 
      })
    }
  }
}))

// Mock fetch
global.fetch = jest.fn()

describe('Chat Threads API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockReset()
  })

  describe('threads.list', () => {
    it('should list user threads', async () => {
      const mockThreads = [
        {
          id: 'thread-1',
          title: 'Test Thread 1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          message_count: 5
        },
        {
          id: 'thread-2',
          title: 'Test Thread 2',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          message_count: 3
        }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { threads: mockThreads, total: 2 }
        })
      })

      const result = await api.threads.list()

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/chat-threads?limit=50&offset=0'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      )

      expect(result.threads).toEqual(mockThreads)
      expect(result.total).toBe(2)
    })

    it('should handle pagination', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { threads: [], total: 100 }
        })
      })

      await api.threads.list(10, 20)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/chat-threads?limit=10&offset=20'),
        expect.anything()
      )
    })
  })

  describe('threads.get', () => {
    it('should get thread with messages', async () => {
      const mockThread = {
        id: 'thread-1',
        title: 'Test Thread',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        message_count: 2
      }

      const mockMessages = [
        {
          id: 'msg-1',
          thread_id: 'thread-1',
          role: 'user',
          content: 'Hello',
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'msg-2',
          thread_id: 'thread-1',
          role: 'assistant',
          content: 'Hi there!',
          created_at: '2024-01-01T00:00:01Z'
        }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { thread: mockThread, messages: mockMessages }
        })
      })

      const result = await api.threads.get('thread-1')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/chat-threads/thread-1'),
        expect.objectContaining({ method: 'GET' })
      )

      expect(result.thread).toEqual(mockThread)
      expect(result.messages).toEqual(mockMessages)
    })
  })

  describe('threads.create', () => {
    it('should create new thread', async () => {
      const newThread = {
        id: 'new-thread',
        title: 'New Conversation',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        message_count: 0
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { thread: newThread }
        })
      })

      const result = await api.threads.create('New Conversation')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/chat-threads'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ title: 'New Conversation' })
        })
      )

      expect(result.thread).toEqual(newThread)
    })

    it('should create thread without title', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { thread: { id: 'new-thread', title: null } }
        })
      })

      await api.threads.create()

      expect(global.fetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          body: JSON.stringify({ title: undefined, metadata: undefined })
        })
      )
    })
  })

  describe('threads.update', () => {
    it('should update thread title', async () => {
      const updatedThread = {
        id: 'thread-1',
        title: 'Updated Title',
        updated_at: '2024-01-02T00:00:00Z'
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { thread: updatedThread }
        })
      })

      const result = await api.threads.update('thread-1', { title: 'Updated Title' })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/chat-threads/thread-1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ title: 'Updated Title' })
        })
      )

      expect(result.thread.title).toBe('Updated Title')
    })
  })

  describe('threads.delete', () => {
    it('should delete thread', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} })
      })

      await api.threads.delete('thread-1')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/chat-threads/thread-1'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  describe('error handling', () => {
    it('should handle authentication errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Unauthorized' } })
      })

      await expect(api.threads.list()).rejects.toThrow('Unauthorized')
    })

    it('should handle server errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Internal server error' } })
      })

      await expect(api.threads.list()).rejects.toThrow()
    })
  })
})