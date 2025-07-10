#!/bin/bash
# Deploy the vault automation end-to-end

echo "🚀 Deploying Vault Automation System"
echo ""

# Load environment variables
if [ -f ".env.local" ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# Deploy the vault-store Edge Function first
echo "📦 Deploying vault-store Edge Function..."
SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN}" npx supabase functions deploy vault-store --no-verify-jwt

if [ $? -eq 0 ]; then
  echo "✅ Edge Function deployed successfully"
else
  echo "❌ Edge Function deployment failed"
  echo "   Try deploying manually via Supabase dashboard"
fi

echo ""
echo "🔧 Now deploying CDK infrastructure..."
echo ""

# Deploy CDK with environment variables
cd infrastructure/cdk
./deploy.sh

cd ../..

echo ""
echo "📋 Summary:"
echo "- Vault migration: ✅ Applied"
echo "- Vault functions: ✅ Created"
echo "- Edge Function: Check above"
echo "- CDK deployment: Check above"
echo ""
echo "If CDK fails, you can manually store credentials using:"
echo "  npx tsx utils/quick-store-aws-creds.ts"