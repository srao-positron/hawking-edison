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
CREATE INDEX idx_telemetry_events_user_id ON telemetry_events(user_id);
CREATE INDEX idx_telemetry_events_event_type ON telemetry_events(event_type);
CREATE INDEX idx_telemetry_events_timestamp ON telemetry_events(timestamp);
CREATE INDEX idx_telemetry_events_created_at ON telemetry_events(created_at);

-- Enable RLS
ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Create a view for aggregated metrics
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