#!/bin/bash
# Deploy CDK stack with environment variables loaded

# Load environment variables from .env.local
if [ -f "../../.env.local" ]; then
  echo "Loading environment variables from .env.local..."
  export $(cat ../../.env.local | grep -v '^#' | xargs)
fi

# Map environment variables to expected names
export SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"

# Verify required environment variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ] || [ -z "$VAULT_STORE_SERVICE_KEY" ]; then
  echo "❌ Error: Required environment variables not found"
  echo "   SUPABASE_URL=$SUPABASE_URL"
  echo "   SUPABASE_SERVICE_ROLE_KEY is ${SUPABASE_SERVICE_ROLE_KEY:+set}"
  echo "   VAULT_STORE_SERVICE_KEY is ${VAULT_STORE_SERVICE_KEY:+set}"
  echo ""
  echo "Make sure .env.local contains:"
  echo "  NEXT_PUBLIC_SUPABASE_URL=..."
  echo "  SUPABASE_SERVICE_ROLE_KEY=..."
  echo "  VAULT_STORE_SERVICE_KEY=..."
  exit 1
fi

echo "✅ Environment variables loaded"
echo "   SUPABASE_URL=$SUPABASE_URL"
echo ""

# Deploy the CDK stack
echo "🚀 Deploying CDK stack..."
npx cdk deploy --require-approval never