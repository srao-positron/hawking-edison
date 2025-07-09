#!/bin/bash

# Generate TypeScript types from Supabase database
# Usage: ./scripts/generate-types.sh

set -e

echo "🔄 Generating TypeScript types from Supabase database..."

# Check if SUPABASE_ACCESS_TOKEN is set
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "❌ Error: SUPABASE_ACCESS_TOKEN not set"
    echo "Please set it in your .env.local file or environment"
    exit 1
fi

# Project ID from your Supabase project
PROJECT_ID="bknpldydmkzupsfagnva"

# Generate types
npx supabase gen types typescript \
    --project-id "$PROJECT_ID" \
    --schema public \
    > src/types/database.types.ts

echo "✅ Types generated successfully at src/types/database.types.ts"

# Optional: Run TypeScript compiler to check for type errors
echo "🔍 Checking for type errors..."
npx tsc --noEmit || echo "⚠️  Type errors found - please fix them"

echo "✨ Done!"