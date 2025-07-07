#!/usr/bin/env node

import { config } from 'dotenv'
import { resolve } from 'path'
import fetch from 'node-fetch'

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') })

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const PROJECT_REF = 'bknpldydmkzupsfagnva'

async function applyMigration() {
  console.log('🚀 Applying telemetry migration to Supabase...\n')

  if (!SUPABASE_ACCESS_TOKEN) {
    console.error('❌ SUPABASE_ACCESS_TOKEN not found in environment')
    console.log('Please add it to your .env.local file')
    return
  }

  const migrationSQL = `
-- Create telemetry_events table for custom telemetry data
CREATE TABLE IF NOT EXISTS telemetry_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_telemetry_events_user_id ON telemetry_events(user_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_event_type ON telemetry_events(event_type);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_timestamp ON telemetry_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_created_at ON telemetry_events(created_at);

-- Enable RLS
ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop existing if they exist)
DROP POLICY IF EXISTS "Service role can manage telemetry" ON telemetry_events;
DROP POLICY IF EXISTS "Users can read own telemetry" ON telemetry_events;

-- Service role can insert/read all telemetry
CREATE POLICY "Service role can manage telemetry" ON telemetry_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can read their own telemetry
CREATE POLICY "Users can read own telemetry" ON telemetry_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create or replace the view for aggregated metrics
CREATE OR REPLACE VIEW telemetry_metrics AS
SELECT 
  event_type,
  DATE_TRUNC('hour', timestamp) as hour,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as unique_users,
  AVG((event_data->>'duration')::float) as avg_duration,
  SUM((event_data->>'tokens')::int) as total_tokens
FROM telemetry_events
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY event_type, hour
ORDER BY hour DESC, event_type;

-- Grant access to the view
GRANT SELECT ON telemetry_metrics TO authenticated;
GRANT SELECT ON telemetry_metrics TO service_role;
`

  try {
    // Use Supabase Management API to run the migration
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: migrationSQL
        })
      }
    )

    if (response.ok) {
      console.log('✅ Migration applied successfully!')
      console.log('\nCreated:')
      console.log('- telemetry_events table')
      console.log('- telemetry_metrics view')
      console.log('- RLS policies')
      console.log('- Indexes for performance')
    } else {
      const error = await response.text()
      console.error('❌ Failed to apply migration:', error)
      
      // Try alternative approach
      console.log('\n🔄 Trying alternative approach...')
      console.log('You can manually apply the migration by:')
      console.log('1. Go to https://supabase.com/dashboard/project/bknpldydmkzupsfagnva/sql/new')
      console.log('2. Paste the SQL from supabase/migrations/20240109_telemetry.sql')
      console.log('3. Click "Run"')
    }
  } catch (error) {
    console.error('❌ Error applying migration:', error)
  }
}

// Run the migration
applyMigration()