// Telemetry integration with Supabase and custom metrics
import { createClient } from '@supabase/supabase-js'
import { metrics } from './metrics'
import { logger } from './logger'

interface TelemetryEvent {
  event_type: string
  event_data: any
  user_id?: string
  session_id?: string
  timestamp: string
}

class TelemetryService {
  private supabase: any
  private buffer: TelemetryEvent[] = []
  private flushInterval: number = 30000 // 30 seconds
  private flushTimer?: NodeJS.Timeout
  private maxBufferSize: number = 100

  constructor() {
    // Only initialize if we have the necessary config
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      this.supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
      this.startFlushTimer()
    }
  }

  private startFlushTimer() {
    this.flushTimer = setInterval(() => {
      this.flush()
    }, this.flushInterval)
  }

  // Track custom events
  track(event_type: string, event_data: any, user_id?: string, session_id?: string) {
    const event: TelemetryEvent = {
      event_type,
      event_data,
      user_id,
      session_id,
      timestamp: new Date().toISOString()
    }

    this.buffer.push(event)

    // Also send to our metrics system
    metrics.increment({
      name: 'telemetry.event',
      tags: { event_type }
    })

    // Flush if buffer is full
    if (this.buffer.length >= this.maxBufferSize) {
      this.flush()
    }
  }

  // Track API interactions
  trackInteraction(interaction: {
    id: string
    user_id: string
    input: string
    provider?: string
    tokens?: number
    duration?: number
    error?: string
  }) {
    this.track('interaction', {
      interaction_id: interaction.id,
      provider: interaction.provider || 'anthropic',
      input_length: interaction.input.length,
      tokens: interaction.tokens,
      duration: interaction.duration,
      has_error: !!interaction.error
    }, interaction.user_id)

    // Also record in metrics
    if (interaction.duration) {
      metrics.timer({
        name: 'interaction.duration',
        duration: interaction.duration,
        tags: {
          provider: interaction.provider || 'anthropic',
          status: interaction.error ? 'error' : 'success'
        }
      })
    }
  }

  // Track API key usage
  trackApiKeyUsage(apiKeyId: string, userId: string, endpoint: string, method: string) {
    this.track('api_key_usage', {
      api_key_id: apiKeyId,
      endpoint,
      method
    }, userId)

    metrics.increment({
      name: 'api_key.usage',
      tags: { endpoint, method }
    })
  }

  // Track Lambda task execution
  trackTaskExecution(task: {
    id: string
    user_id: string
    type: string
    status: 'started' | 'completed' | 'failed'
    duration?: number
    error?: string
  }) {
    this.track('task_execution', {
      task_id: task.id,
      task_type: task.type,
      status: task.status,
      duration: task.duration,
      has_error: !!task.error
    }, task.user_id)

    if (task.duration) {
      metrics.timer({
        name: 'task.execution',
        duration: task.duration,
        tags: {
          type: task.type,
          status: task.status
        }
      })
    }
  }

  // Track knowledge base operations
  trackKnowledgeOperation(operation: {
    user_id: string
    action: 'add' | 'search' | 'delete'
    success: boolean
    item_count?: number
    query?: string
  }) {
    this.track('knowledge_operation', {
      action: operation.action,
      success: operation.success,
      item_count: operation.item_count,
      has_query: !!operation.query
    }, operation.user_id)

    metrics.increment({
      name: 'knowledge.operation',
      tags: {
        action: operation.action,
        status: operation.success ? 'success' : 'error'
      }
    })
  }

  // Flush events to Supabase
  private async flush() {
    if (this.buffer.length === 0 || !this.supabase) {
      return
    }

    const eventsToFlush = [...this.buffer]
    this.buffer = []

    try {
      // Create a telemetry table if needed
      const { error } = await this.supabase
        .from('telemetry_events')
        .insert(eventsToFlush)

      if (error) {
        logger.error('Failed to flush telemetry events', error)
        // Put events back in buffer if failed
        this.buffer.unshift(...eventsToFlush)
      } else {
        logger.debug(`Flushed ${eventsToFlush.length} telemetry events`)
      }
    } catch (error) {
      logger.error('Telemetry flush error', error as Error)
      // Put events back in buffer if failed
      this.buffer.unshift(...eventsToFlush)
    }
  }

  // Get Supabase metrics endpoint data
  async getSupabaseMetrics(): Promise<any> {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing')
    }

    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL.split('.')[0].replace('https://', '')
    const metricsUrl = `https://${projectRef}.supabase.co/customer/v1/privileged/metrics`

    try {
      const response = await fetch(metricsUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.status}`)
      }

      return await response.text() // Prometheus format
    } catch (error) {
      logger.error('Failed to fetch Supabase metrics', error as Error)
      throw error
    }
  }

  // Parse Prometheus metrics to JSON
  parsePrometheusMetrics(prometheusText: string): Record<string, number> {
    const lines = prometheusText.split('\n')
    const metrics: Record<string, number> = {}

    for (const line of lines) {
      if (line.startsWith('#') || line.trim() === '') continue

      const match = line.match(/^(\w+)(?:{([^}]+)})?\s+(.+)$/)
      if (match) {
        const [, name, labels, value] = match
        const metricKey = labels ? `${name}{${labels}}` : name
        metrics[metricKey] = parseFloat(value)
      }
    }

    return metrics
  }

  stop() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flush() // Final flush
    }
  }
}

// Export singleton instance
export const telemetry = new TelemetryService()

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.on('SIGINT', () => telemetry.stop())
  process.on('SIGTERM', () => telemetry.stop())
}