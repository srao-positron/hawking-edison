#!/bin/bash
# Check Edge Function logs using Supabase CLI

echo "🔍 Fetching Edge Function logs..."
echo "Make sure you have Supabase CLI installed and linked to your project"
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it:"
    echo "   brew install supabase/tap/supabase"
    exit 1
fi

# Fetch function logs
echo "📡 Fetching logs for 'interact' function..."
supabase functions logs interact --limit 20

echo ""
echo "💡 Tip: To see real-time logs, run:"
echo "   supabase functions logs interact --tail"
echo ""
echo "📊 View logs in dashboard:"
echo "   https://supabase.com/dashboard/project/bknpldydmkzupsfagnva/logs/edge-functions"