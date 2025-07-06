import { renderHook, waitFor } from '@testing-library/react'
import { useTaskSubscription } from '@/hooks/useTaskSubscription'
import { createClient } from '@/lib/supabase'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(),
}))

describe('useTaskSubscription', () => {
  let mockSupabase: any
  let mockChannel: any

  beforeEach(() => {
    mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnValue(mockChannel),
    }

    mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'test-task-1',
                  user_id: 'test-user',
                  type: 'simulation',
                  status: 'pending',
                  progress: 0,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
              ],
              error: null,
            }),
          }),
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
      channel: jest.fn().mockReturnValue(mockChannel),
      removeChannel: jest.fn(),
    }

    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch tasks on mount', async () => {
    const { result } = renderHook(() => useTaskSubscription())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(mockSupabase.from).toHaveBeenCalledWith('tasks')
    expect(result.current.tasks).toHaveLength(1)
    expect(result.current.tasks[0].id).toBe('test-task-1')
  })

  it('should subscribe to realtime updates', async () => {
    const { result } = renderHook(() => useTaskSubscription())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(mockSupabase.channel).toHaveBeenCalledWith('task-updates')
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: '*',
        schema: 'public',
        table: 'tasks',
      }),
      expect.any(Function)
    )
    expect(mockChannel.subscribe).toHaveBeenCalled()
  })

  it('should filter by taskId when provided', async () => {
    const taskId = 'specific-task-id'
    const { result } = renderHook(() => useTaskSubscription({ taskId }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        filter: `id=eq.${taskId}`,
      }),
      expect.any(Function)
    )
  })

  it('should call onComplete callback when task completes', async () => {
    const onComplete = jest.fn()
    const { result } = renderHook(() => useTaskSubscription({ onComplete }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Get the handler function that was passed to channel.on
    const handler = mockChannel.on.mock.calls[0][2]

    // Simulate a task completion update
    handler({
      eventType: 'UPDATE',
      new: {
        id: 'test-task-1',
        status: 'completed',
        result: { success: true },
      },
    })

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'test-task-1',
        status: 'completed',
      })
    )
  })

  it('should clean up subscription on unmount', async () => {
    const { unmount } = renderHook(() => useTaskSubscription())

    await waitFor(() => {
      expect(mockChannel.subscribe).toHaveBeenCalled()
    })

    unmount()

    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel)
  })
})