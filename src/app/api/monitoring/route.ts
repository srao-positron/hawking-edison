import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-unified'
import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { telemetry } from '@/lib/telemetry'
import { metrics } from '@/lib/metrics'

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(request)
    
    // Check if user is admin (you might want to add an admin check)
    // For now, we'll allow any authenticated user
    
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const dataType = searchParams.get('type') || 'summary'
    const timeRange = searchParams.get('range') || '24h'
    
    switch (dataType) {
      case 'summary':
        return await getMonitoringSummary(supabase, user.id, timeRange)
      
      case 'supabase-metrics':
        return await getSupabaseMetrics()
      
      case 'telemetry':
        return await getTelemetryData(supabase, user.id, timeRange)
      
      case 'realtime':
        return await getRealtimeStats(supabase)
      
      default:
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_TYPE', message: 'Invalid monitoring type' } },
          { status: 400 }
        )
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 }
    )
  }
}

async function getMonitoringSummary(supabase: any, userId: string, timeRange: string) {
  const timeFilter = getTimeFilter(timeRange)
  
  // Get various metrics in parallel
  const [
    interactionStats,
    apiKeyStats,
    taskStats,
    knowledgeStats,
    recentErrors
  ] = await Promise.all([
    // Interaction statistics
    supabase
      .from('interactions')
      .select('created_at, result')
      .gte('created_at', timeFilter)
      .order('created_at', { ascending: false }),
    
    // API key usage
    supabase
      .from('api_keys')
      .select('name, last_used_at, created_at')
      .eq('user_id', userId)
      .not('revoked_at', 'is', null),
    
    // Task statistics
    supabase
      .from('tasks')
      .select('type, status, created_at, completed_at')
      .gte('created_at', timeFilter),
    
    // Knowledge base stats
    supabase
      .from('knowledge')
      .select('created_at')
      .gte('created_at', timeFilter),
    
    // Recent errors from telemetry
    supabase
      .from('telemetry_events')
      .select('event_type, event_data, timestamp')
      .eq('event_type', 'error')
      .gte('timestamp', timeFilter)
      .order('timestamp', { ascending: false })
      .limit(10)
  ])
  
  // Calculate statistics
  const stats = {
    interactions: {
      total: interactionStats.data?.length || 0,
      avgTokens: calculateAvgTokens(interactionStats.data),
      successRate: calculateSuccessRate(interactionStats.data)
    },
    apiKeys: {
      active: apiKeyStats.data?.filter((k: any) => k.last_used_at).length || 0,
      total: apiKeyStats.data?.length || 0
    },
    tasks: {
      total: taskStats.data?.length || 0,
      byStatus: groupByStatus(taskStats.data),
      avgDuration: calculateAvgTaskDuration(taskStats.data)
    },
    knowledge: {
      itemsAdded: knowledgeStats.data?.length || 0
    },
    errors: {
      recent: recentErrors.data || []
    }
  }
  
  return NextResponse.json({
    success: true,
    data: {
      timeRange,
      stats,
      timestamp: new Date().toISOString()
    }
  })
}

async function getSupabaseMetrics() {
  try {
    const metricsText = await telemetry.getSupabaseMetrics()
    const parsedMetrics = telemetry.parsePrometheusMetrics(metricsText)
    
    // Group metrics by category
    const categorized: Record<string, Record<string, any>> = {
      database: {},
      auth: {},
      storage: {},
      realtime: {},
      other: {}
    }
    
    for (const [key, value] of Object.entries(parsedMetrics)) {
      if (key.includes('pg_') || key.includes('database_')) {
        categorized.database[key] = value
      } else if (key.includes('auth_')) {
        categorized.auth[key] = value
      } else if (key.includes('storage_')) {
        categorized.storage[key] = value
      } else if (key.includes('realtime_')) {
        categorized.realtime[key] = value
      } else {
        categorized.other[key] = value
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        metrics: categorized,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'METRICS_UNAVAILABLE', 
          message: 'Supabase metrics not available' 
        } 
      },
      { status: 503 }
    )
  }
}

async function getTelemetryData(supabase: any, userId: string, timeRange: string) {
  const timeFilter = getTimeFilter(timeRange)
  
  // Get telemetry events
  const { data: events, error } = await supabase
    .from('telemetry_events')
    .select('*')
    .gte('timestamp', timeFilter)
    .order('timestamp', { ascending: false })
    .limit(1000)
  
  if (error) {
    return NextResponse.json(
      { success: false, error: { code: 'DB_ERROR', message: 'Failed to fetch telemetry' } },
      { status: 500 }
    )
  }
  
  // Group events by type
  const eventsByType = events.reduce((acc: any, event: any) => {
    if (!acc[event.event_type]) {
      acc[event.event_type] = []
    }
    acc[event.event_type].push(event)
    return acc
  }, {})
  
  // Calculate statistics per event type
  const statistics = Object.entries(eventsByType).map(([type, events]: [string, any]) => ({
    event_type: type,
    count: events.length,
    unique_users: new Set(events.map((e: any) => e.user_id)).size,
    latest: events[0]?.timestamp,
    avg_duration: calculateAvgDuration(events)
  }))
  
  return NextResponse.json({
    success: true,
    data: {
      timeRange,
      statistics,
      recentEvents: events.slice(0, 50),
      timestamp: new Date().toISOString()
    }
  })
}

async function getRealtimeStats(supabase: any) {
  // This would connect to Supabase Realtime to get live stats
  // For now, return current snapshot
  
  const { data: activeSessions } = await supabase
    .from('interactions')
    .select('user_id, created_at')
    .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
  
  const { data: activeApiKeys } = await supabase
    .from('api_keys')
    .select('id, name, last_used_at')
    .gte('last_used_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
  
  return NextResponse.json({
    success: true,
    data: {
      activeSessions: activeSessions?.length || 0,
      activeApiKeys: activeApiKeys?.length || 0,
      timestamp: new Date().toISOString()
    }
  })
}

// Helper functions
function getTimeFilter(timeRange: string): string {
  const now = new Date()
  switch (timeRange) {
    case '1h':
      return new Date(now.getTime() - 60 * 60 * 1000).toISOString()
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  }
}

function calculateAvgTokens(interactions: any[]): number {
  if (!interactions || interactions.length === 0) return 0
  
  const totalTokens = interactions.reduce((sum, i) => {
    const tokens = i.result?.tokens?.totalTokens || 0
    return sum + tokens
  }, 0)
  
  return Math.round(totalTokens / interactions.length)
}

function calculateSuccessRate(interactions: any[]): number {
  if (!interactions || interactions.length === 0) return 0
  
  const successful = interactions.filter(i => !i.result?.error).length
  return Math.round((successful / interactions.length) * 100)
}

function groupByStatus(tasks: any[]): Record<string, number> {
  if (!tasks) return {}
  
  return tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1
    return acc
  }, {})
}

function calculateAvgTaskDuration(tasks: any[]): number {
  if (!tasks || tasks.length === 0) return 0
  
  const completedTasks = tasks.filter(t => t.completed_at)
  if (completedTasks.length === 0) return 0
  
  const totalDuration = completedTasks.reduce((sum, t) => {
    const duration = new Date(t.completed_at).getTime() - new Date(t.created_at).getTime()
    return sum + duration
  }, 0)
  
  return Math.round(totalDuration / completedTasks.length / 1000) // in seconds
}

function calculateAvgDuration(events: any[]): number {
  const eventsWithDuration = events.filter(e => e.event_data?.duration)
  if (eventsWithDuration.length === 0) return 0
  
  const totalDuration = eventsWithDuration.reduce((sum, e) => sum + e.event_data.duration, 0)
  return Math.round(totalDuration / eventsWithDuration.length)
}