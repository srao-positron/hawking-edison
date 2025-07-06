// Basic metrics and telemetry foundation
import { logger } from './logger'

export interface MetricEvent {
  name: string
  value?: number
  tags?: Record<string, string>
  timestamp?: Date
}

export interface CounterMetric {
  name: string
  tags?: Record<string, string>
}

export interface GaugeMetric {
  name: string
  value: number
  tags?: Record<string, string>
}

export interface TimerMetric {
  name: string
  duration: number
  tags?: Record<string, string>
}

class MetricsCollector {
  private metrics: MetricEvent[] = []
  private counters: Map<string, number> = new Map()
  private gauges: Map<string, number> = new Map()
  private flushInterval: number = 60000 // 1 minute
  private flushTimer?: NodeJS.Timeout
  private enabled: boolean

  constructor() {
    this.enabled = process.env.METRICS_ENABLED === 'true'
    
    if (this.enabled) {
      this.startFlushTimer()
    }
  }

  private startFlushTimer() {
    this.flushTimer = setInterval(() => {
      this.flush()
    }, this.flushInterval)
  }

  private generateKey(name: string, tags?: Record<string, string>): string {
    if (!tags) return name
    
    const sortedTags = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(',')
    
    return `${name}#${sortedTags}`
  }

  increment(metric: CounterMetric) {
    if (!this.enabled) return

    const key = this.generateKey(metric.name, metric.tags)
    const current = this.counters.get(key) || 0
    this.counters.set(key, current + 1)

    logger.debug('Metric incremented', { 
      metric: metric.name, 
      value: current + 1,
      tags: metric.tags 
    })
  }

  gauge(metric: GaugeMetric) {
    if (!this.enabled) return

    const key = this.generateKey(metric.name, metric.tags)
    this.gauges.set(key, metric.value)

    logger.debug('Gauge recorded', { 
      metric: metric.name, 
      value: metric.value,
      tags: metric.tags 
    })
  }

  timer(metric: TimerMetric) {
    if (!this.enabled) return

    this.metrics.push({
      name: metric.name,
      value: metric.duration,
      tags: { ...metric.tags, type: 'timer' },
      timestamp: new Date()
    })

    logger.debug('Timer recorded', { 
      metric: metric.name, 
      duration: metric.duration,
      tags: metric.tags 
    })
  }

  async track<T>(name: string, fn: () => Promise<T>, tags?: Record<string, string>): Promise<T> {
    if (!this.enabled) return fn()

    const start = Date.now()
    try {
      const result = await fn()
      const duration = Date.now() - start
      
      this.timer({ name, duration, tags: { ...tags, status: 'success' } })
      
      return result
    } catch (error) {
      const duration = Date.now() - start
      
      this.timer({ name, duration, tags: { ...tags, status: 'error' } })
      this.increment({ name: `${name}.error`, tags })
      
      throw error
    }
  }

  private async flush() {
    if (!this.enabled || (this.metrics.length === 0 && this.counters.size === 0 && this.gauges.size === 0)) {
      return
    }

    try {
      const payload = {
        counters: Array.from(this.counters.entries()).map(([key, value]) => ({
          key,
          value
        })),
        gauges: Array.from(this.gauges.entries()).map(([key, value]) => ({
          key,
          value
        })),
        events: this.metrics
      }

      // In production, this would send to a metrics service
      // For now, we'll just log
      logger.info('Metrics flush', { 
        counters: payload.counters.length,
        gauges: payload.gauges.length,
        events: payload.events.length
      })

      // If we have a metrics endpoint configured, send the data
      if (process.env.METRICS_ENDPOINT) {
        await this.sendMetrics(payload)
      }

      // Clear the metrics after flush
      this.metrics = []
      this.counters.clear()
      this.gauges.clear()
    } catch (error) {
      logger.error('Failed to flush metrics', error as Error)
    }
  }

  private async sendMetrics(payload: any) {
    const response = await fetch(process.env.METRICS_ENDPOINT!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.METRICS_API_KEY}`
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`Metrics send failed: ${response.status}`)
    }
  }

  stop() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flush() // Final flush
    }
  }
}

// Export singleton instance
export const metrics = new MetricsCollector()

// Common metric helpers
export const recordApiCall = (endpoint: string, method: string, status: number, duration: number) => {
  metrics.timer({
    name: 'api.request',
    duration,
    tags: {
      endpoint,
      method,
      status: status.toString(),
      statusClass: `${Math.floor(status / 100)}xx`
    }
  })

  metrics.increment({
    name: 'api.request.count',
    tags: {
      endpoint,
      method,
      statusClass: `${Math.floor(status / 100)}xx`
    }
  })
}

export const recordLLMCall = (provider: string, model: string, tokens: number, duration: number, success: boolean) => {
  metrics.timer({
    name: 'llm.request',
    duration,
    tags: {
      provider,
      model,
      status: success ? 'success' : 'error'
    }
  })

  metrics.increment({
    name: 'llm.tokens',
    tags: { provider, model }
  })

  metrics.gauge({
    name: 'llm.tokens.total',
    value: tokens,
    tags: { provider, model }
  })
}

export const recordDatabaseQuery = (table: string, operation: string, duration: number, success: boolean) => {
  metrics.timer({
    name: 'db.query',
    duration,
    tags: {
      table,
      operation,
      status: success ? 'success' : 'error'
    }
  })
}

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.on('SIGINT', () => metrics.stop())
  process.on('SIGTERM', () => metrics.stop())
}