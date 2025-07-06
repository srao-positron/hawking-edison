#!/usr/bin/env node

// Test monitoring and telemetry endpoints
import 'dotenv/config'
import fetch from 'node-fetch'
import { createClient } from '@supabase/supabase-js'
import { generateApiKey, hashApiKey } from '../src/lib/api-key-utils'

const API_BASE_URL = process.env.API_BASE_URL || 'https://hawking-edison.vercel.app'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function testHealthEndpoint() {
  log('\n🏥 Testing Health Endpoint\n', 'blue')

  try {
    const response = await fetch(`${API_BASE_URL}/api/health`)
    const data = await response.json()

    log(`Status: ${response.status}`, response.ok ? 'green' : 'red')
    log(`Overall Health: ${data.status}`, data.status === 'healthy' ? 'green' : 'red')
    
    if (data.checks) {
      log('\nService Checks:', 'yellow')
      data.checks.forEach((check: any) => {
        const statusColor = check.status === 'healthy' ? 'green' : 'red'
        log(`  ${check.service}: ${check.status}${check.latency ? ` (${check.latency}ms)` : ''}`, statusColor)
        if (check.error) {
          log(`    Error: ${check.error}`, 'red')
        }
      })
    }

    log(`\nUptime: ${Math.round(data.uptime / 1000)}s`, 'blue')
    return response.ok
  } catch (error) {
    log(`Health check failed: ${error}`, 'red')
    return false
  }
}

async function testMonitoringEndpoint() {
  log('\n📊 Testing Monitoring Endpoints\n', 'blue')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Create test user and API key
  log('Creating test user...', 'yellow')
  const testEmail = `monitor-test-${Date.now()}@example.com`
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: 'test-password-123',
    email_confirm: true,
  })

  if (authError) {
    log(`Failed to create test user: ${authError.message}`, 'red')
    return false
  }

  const userId = authData.user.id

  try {
    // Generate API key
    const { key, hash, prefix } = generateApiKey('test')
    
    const { data: apiKeyData } = await supabase
      .from('api_keys')
      .insert({
        user_id: userId,
        name: 'Monitoring Test Key',
        key_hash: hash,
        key_prefix: prefix,
      })
      .select()
      .single()

    log(`✓ Created API key for testing`, 'green')

    // Test monitoring summary
    log('\n1. Testing monitoring summary...', 'yellow')
    const summaryResponse = await fetch(`${API_BASE_URL}/api/monitoring?type=summary&range=24h`, {
      headers: {
        'Authorization': `Bearer ${key}`,
      },
    })

    if (summaryResponse.ok) {
      log('✓ Monitoring summary accessible', 'green')
      const summaryData = await summaryResponse.json()
      log(`  Stats: ${JSON.stringify(summaryData.data.stats).substring(0, 100)}...`, 'blue')
    } else {
      log(`✗ Monitoring summary failed: ${summaryResponse.status}`, 'red')
    }

    // Test telemetry endpoint
    log('\n2. Testing telemetry data...', 'yellow')
    const telemetryResponse = await fetch(`${API_BASE_URL}/api/monitoring?type=telemetry&range=1h`, {
      headers: {
        'Authorization': `Bearer ${key}`,
      },
    })

    if (telemetryResponse.ok) {
      log('✓ Telemetry data accessible', 'green')
      const telemetryData = await telemetryResponse.json()
      log(`  Event types: ${telemetryData.data.statistics.length}`, 'blue')
    } else {
      log(`✗ Telemetry data failed: ${telemetryResponse.status}`, 'red')
    }

    // Test Supabase metrics (may not be available in all environments)
    log('\n3. Testing Supabase metrics...', 'yellow')
    const metricsResponse = await fetch(`${API_BASE_URL}/api/monitoring?type=supabase-metrics`, {
      headers: {
        'Authorization': `Bearer ${key}`,
      },
    })

    if (metricsResponse.ok) {
      log('✓ Supabase metrics accessible', 'green')
      const metricsData = await metricsResponse.json()
      log(`  Categories: ${Object.keys(metricsData.data.metrics).join(', ')}`, 'blue')
    } else if (metricsResponse.status === 503) {
      log('⚠ Supabase metrics not available (expected in some environments)', 'yellow')
    } else {
      log(`✗ Supabase metrics failed: ${metricsResponse.status}`, 'red')
    }

    // Test realtime stats
    log('\n4. Testing realtime stats...', 'yellow')
    const realtimeResponse = await fetch(`${API_BASE_URL}/api/monitoring?type=realtime`, {
      headers: {
        'Authorization': `Bearer ${key}`,
      },
    })

    if (realtimeResponse.ok) {
      log('✓ Realtime stats accessible', 'green')
      const realtimeData = await realtimeResponse.json()
      log(`  Active sessions: ${realtimeData.data.activeSessions}`, 'blue')
      log(`  Active API keys: ${realtimeData.data.activeApiKeys}`, 'blue')
    } else {
      log(`✗ Realtime stats failed: ${realtimeResponse.status}`, 'red')
    }

    return true
  } finally {
    // Cleanup
    log('\nCleaning up...', 'yellow')
    await supabase.from('api_keys').delete().eq('user_id', userId)
    await supabase.auth.admin.deleteUser(userId)
    log('✓ Cleanup complete', 'green')
  }
}

async function testTelemetryTracking() {
  log('\n📈 Testing Telemetry Tracking\n', 'blue')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Check if telemetry_events table exists
  const { data: tables } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'telemetry_events')

  if (!tables || tables.length === 0) {
    log('⚠ Telemetry events table not found - migrations may need to be applied', 'yellow')
    return false
  }

  log('✓ Telemetry events table exists', 'green')

  // Insert test telemetry event
  const testEvent = {
    event_type: 'test_monitoring',
    event_data: {
      test: true,
      timestamp: Date.now(),
      message: 'Monitoring system test'
    },
    timestamp: new Date().toISOString()
  }

  const { error: insertError } = await supabase
    .from('telemetry_events')
    .insert(testEvent)

  if (insertError) {
    log(`✗ Failed to insert telemetry event: ${insertError.message}`, 'red')
    return false
  }

  log('✓ Successfully tracked telemetry event', 'green')

  // Query recent events
  const { data: recentEvents, error: queryError } = await supabase
    .from('telemetry_events')
    .select('*')
    .eq('event_type', 'test_monitoring')
    .order('created_at', { ascending: false })
    .limit(5)

  if (queryError) {
    log(`✗ Failed to query telemetry events: ${queryError.message}`, 'red')
    return false
  }

  log(`✓ Found ${recentEvents?.length || 0} test events`, 'green')

  // Cleanup test events
  await supabase
    .from('telemetry_events')
    .delete()
    .eq('event_type', 'test_monitoring')

  return true
}

async function testMetricsLogging() {
  log('\n📝 Testing Metrics and Logging\n', 'blue')

  // This would test the actual metrics collection
  // For now, we'll verify the structure is in place
  
  try {
    // Import and test metrics module
    const { metrics } = await import('../src/lib/metrics')
    
    // Test basic operations
    metrics.increment({ name: 'test.counter', tags: { type: 'monitoring' } })
    metrics.gauge({ name: 'test.gauge', value: 42, tags: { type: 'monitoring' } })
    metrics.timer({ name: 'test.timer', duration: 123, tags: { type: 'monitoring' } })
    
    log('✓ Metrics module loaded and functional', 'green')
    
    // Test async tracking
    const result = await metrics.track('test.operation', async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
      return 'success'
    }, { type: 'monitoring' })
    
    log(`✓ Async tracking completed: ${result}`, 'green')
    
    return true
  } catch (error) {
    log(`✗ Metrics testing failed: ${error}`, 'red')
    return false
  }
}

async function runAllTests() {
  log('\n🚀 Hawking Edison Monitoring System Test\n', 'blue')

  const results = {
    health: await testHealthEndpoint(),
    monitoring: await testMonitoringEndpoint(),
    telemetry: await testTelemetryTracking(),
    metrics: await testMetricsLogging()
  }

  log('\n📋 Test Summary\n', 'blue')
  Object.entries(results).forEach(([test, passed]) => {
    log(`${test}: ${passed ? '✅ PASSED' : '❌ FAILED'}`, passed ? 'green' : 'red')
  })

  const allPassed = Object.values(results).every(r => r)
  log(`\n${allPassed ? '🎉 All tests passed!' : '⚠️ Some tests failed'}`, allPassed ? 'green' : 'red')

  if (!allPassed) {
    log('\nNext steps:', 'yellow')
    if (!results.telemetry) {
      log('  - Apply database migrations to create telemetry_events table', 'yellow')
    }
    if (!results.health || !results.monitoring) {
      log('  - Deploy the latest code to Vercel', 'yellow')
    }
  }
}

// Run tests
runAllTests().catch(error => {
  log(`\n❌ Test suite failed: ${error.message}`, 'red')
  process.exit(1)
})