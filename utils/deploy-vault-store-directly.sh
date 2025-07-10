#!/bin/bash
# Deploy just the vault-store Edge Function

echo "🚀 Deploying vault-store Edge Function..."
echo ""

# Check if logged in
if ! SUPABASE_ACCESS_TOKEN=sbp_382fecfe61ed791a0aa623b9e72e131cfe26f816 npx supabase projects list > /dev/null 2>&1; then
  echo "❌ Not logged in to Supabase"
  exit 1
fi

# Deploy the function
echo "📦 Deploying function..."
SUPABASE_ACCESS_TOKEN=sbp_382fecfe61ed791a0aa623b9e72e131cfe26f816 npx supabase functions deploy vault-store --no-verify-jwt

# Check if deployed
echo ""
echo "🔍 Checking deployment..."
SUPABASE_ACCESS_TOKEN=sbp_382fecfe61ed791a0aa623b9e72e131cfe26f816 npx supabase functions list | grep vault-store

echo ""
echo "✅ Done!"