import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

interface Task {
  id: string
  user_id: string
  type: string
  config: any
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  current_round?: number
  result?: any
  error?: string
  started_at?: string
  completed_at?: string
  failed_at?: string
  created_at: string
  updated_at: string
}

interface UseTaskSubscriptionOptions {
  taskId?: string
  userId?: string
  onUpdate?: (task: Task) => void
  onComplete?: (task: Task) => void
  onError?: (task: Task) => void
}

export function useTaskSubscription(options: UseTaskSubscriptionOptions = {}) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    let channel: RealtimeChannel | null = null

    const setupSubscription = async () => {
      try {
        // First, fetch existing tasks
        let query = supabase.from('tasks').select('*')
        
        if (options.taskId) {
          query = query.eq('id', options.taskId)
        }
        
        if (options.userId) {
          query = query.eq('user_id', options.userId)
        }
        
        query = query.order('created_at', { ascending: false })
        
        const { data, error: fetchError } = await query
        
        if (fetchError) throw fetchError
        
        setTasks(data || [])
        setLoading(false)

        // Set up realtime subscription
        let realtimeQuery = supabase
          .channel('task-updates')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'tasks',
              filter: options.taskId ? `id=eq.${options.taskId}` : undefined,
            },
            (payload) => {
              console.log('Task update:', payload)
              
              if (payload.eventType === 'INSERT') {
                setTasks((prev) => [payload.new as Task, ...prev])
              } else if (payload.eventType === 'UPDATE') {
                const updatedTask = payload.new as Task
                
                setTasks((prev) =>
                  prev.map((task) =>
                    task.id === updatedTask.id ? updatedTask : task
                  )
                )
                
                // Call callbacks based on status
                if (updatedTask.status === 'completed' && options.onComplete) {
                  options.onComplete(updatedTask)
                } else if (updatedTask.status === 'failed' && options.onError) {
                  options.onError(updatedTask)
                } else if (options.onUpdate) {
                  options.onUpdate(updatedTask)
                }
              } else if (payload.eventType === 'DELETE') {
                setTasks((prev) =>
                  prev.filter((task) => task.id !== (payload.old as Task).id)
                )
              }
            }
          )

        // If filtering by userId, add another subscription for user-specific updates
        if (options.userId && !options.taskId) {
          realtimeQuery = realtimeQuery.on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'tasks',
              filter: `user_id=eq.${options.userId}`,
            },
            (payload) => {
              // Same handler as above
              if (payload.eventType === 'INSERT') {
                setTasks((prev) => [payload.new as Task, ...prev])
              } else if (payload.eventType === 'UPDATE') {
                const updatedTask = payload.new as Task
                
                setTasks((prev) =>
                  prev.map((task) =>
                    task.id === updatedTask.id ? updatedTask : task
                  )
                )
                
                if (updatedTask.status === 'completed' && options.onComplete) {
                  options.onComplete(updatedTask)
                } else if (updatedTask.status === 'failed' && options.onError) {
                  options.onError(updatedTask)
                } else if (options.onUpdate) {
                  options.onUpdate(updatedTask)
                }
              }
            }
          )
        }

        channel = realtimeQuery.subscribe()
      } catch (err) {
        console.error('Error setting up task subscription:', err)
        setError(err as Error)
        setLoading(false)
      }
    }

    setupSubscription()

    // Cleanup
    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [options.taskId, options.userId, supabase])

  return {
    tasks,
    loading,
    error,
    refetch: async () => {
      setLoading(true)
      let query = supabase.from('tasks').select('*')
      
      if (options.taskId) {
        query = query.eq('id', options.taskId)
      }
      
      if (options.userId) {
        query = query.eq('user_id', options.userId)
      }
      
      query = query.order('created_at', { ascending: false })
      
      const { data, error: fetchError } = await query
      
      if (fetchError) {
        setError(fetchError)
      } else {
        setTasks(data || [])
      }
      
      setLoading(false)
    },
  }
}