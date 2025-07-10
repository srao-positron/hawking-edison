import { useEffect, useRef } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { getBrowserClient } from '@/lib/supabase-browser'

interface UseRealtimeSubscriptionOptions {
  channel: string
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  schema?: string
  table?: string
  filter?: string
  onInsert?: (payload: any) => void
  onUpdate?: (payload: any) => void
  onDelete?: (payload: any) => void
  onChange?: (payload: any) => void
}

export function useRealtimeSubscription(options: UseRealtimeSubscriptionOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabase = getBrowserClient()

  useEffect(() => {
    // Clean up any existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    // Create new channel
    const channel = supabase.channel(options.channel)

    // Set up postgres changes listener
    if (options.table) {
      const postgresChanges = channel.on(
        'postgres_changes' as any,
        {
          event: options.event || '*',
          schema: options.schema || 'public',
          table: options.table,
          filter: options.filter
        } as any,
        (payload: any) => {
          // Route to appropriate handler
          switch (payload.eventType) {
            case 'INSERT':
              options.onInsert?.(payload)
              options.onChange?.(payload)
              break
            case 'UPDATE':
              options.onUpdate?.(payload)
              options.onChange?.(payload)
              break
            case 'DELETE':
              options.onDelete?.(payload)
              options.onChange?.(payload)
              break
          }
        }
      )
    }

    // Subscribe to the channel
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Subscribed to channel: ${options.channel}`)
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`Error subscribing to channel: ${options.channel}`)
      }
    })

    channelRef.current = channel

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [
    options.channel,
    options.event,
    options.schema,
    options.table,
    options.filter
  ])

  return {
    unsubscribe: () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }
}