import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { metrics } from '@/lib/metrics'

interface HealthCheck {
  service: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  latency?: number
  error?: string
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  uptime: number
  checks: HealthCheck[]
}

const startTime = Date.now()

async function checkSupabase(): Promise<HealthCheck> {
  const start = Date.now()
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    
    // Simple query to verify database connectivity
    const { error } = await supabase
      .from('interactions')
      .select('id')
      .limit(1)
    
    const latency = Date.now() - start
    
    if (error) {
      return {
        service: 'supabase',
        status: 'unhealthy',
        latency,
        error: error.message
      }
    }
    
    return {
      service: 'supabase',
      status: 'healthy',
      latency
    }
  } catch (error) {
    return {
      service: 'supabase',
      status: 'unhealthy',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function checkEdgeFunctions(): Promise<HealthCheck> {
  const start = Date.now()
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        service: 'edge-functions',
        status: 'unhealthy',
        error: 'Missing configuration'
      }
    }
    
    // Check if Edge Functions are accessible (OPTIONS request doesn't require auth)
    const response = await fetch(`${supabaseUrl}/functions/v1/interact`, {
      method: 'OPTIONS',
      headers: {
        'apikey': supabaseAnonKey
      }
    })
    
    const latency = Date.now() - start
    
    if (response.ok) {
      return {
        service: 'edge-functions',
        status: 'healthy',
        latency
      }
    }
    
    return {
      service: 'edge-functions',
      status: 'degraded',
      latency,
      error: `HTTP ${response.status}`
    }
  } catch (error) {
    return {
      service: 'edge-functions',
      status: 'unhealthy',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function checkAWSServices(): Promise<HealthCheck> {
  // Only check if AWS is configured
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    return {
      service: 'aws',
      status: 'healthy', // Not configured is OK
      error: 'Not configured'
    }
  }
  
  try {
    // In production, you might want to check SNS/SQS connectivity
    // For now, we'll just verify configuration
    return {
      service: 'aws',
      status: 'healthy'
    }
  } catch (error) {
    return {
      service: 'aws',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function GET(request: NextRequest) {
  const start = Date.now()
  
  try {
    // Run health checks in parallel
    const [supabaseCheck, edgeFunctionsCheck, awsCheck] = await Promise.all([
      checkSupabase(),
      checkEdgeFunctions(),
      checkAWSServices()
    ])
    
    const checks = [supabaseCheck, edgeFunctionsCheck, awsCheck]
    
    // Determine overall status
    const hasUnhealthy = checks.some(c => c.status === 'unhealthy')
    const hasDegraded = checks.some(c => c.status === 'degraded')
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    if (hasUnhealthy) overallStatus = 'unhealthy'
    else if (hasDegraded) overallStatus = 'degraded'
    
    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      uptime: Date.now() - startTime,
      checks
    }
    
    // Record metrics
    metrics.gauge({
      name: 'health.status',
      value: overallStatus === 'healthy' ? 1 : 0,
      tags: { status: overallStatus }
    })
    
    checks.forEach(check => {
      if (check.latency) {
        metrics.gauge({
          name: 'health.check.latency',
          value: check.latency,
          tags: { service: check.service }
        })
      }
    })
    
    const statusCode = overallStatus === 'healthy' ? 200 : 503
    
    return NextResponse.json(healthStatus, { status: statusCode })
  } catch (error) {
    // If health check itself fails, return unhealthy
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '0.1.0',
        uptime: Date.now() - startTime,
        checks: [],
        error: error instanceof Error ? error.message : 'Health check failed'
      },
      { status: 503 }
    )
  }
}