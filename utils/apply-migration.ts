#!/usr/bin/env tsx
/**
 * Output migration SQL for manual application via Supabase Dashboard
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

const migrationFile = resolve(__dirname, '../supabase/migrations/20250111_thread_management.sql')
const migrationSQL = readFileSync(migrationFile, 'utf-8')

console.log(`
📝 Thread Management Migration
==============================

To apply this migration:

1. Go to the Supabase SQL Editor:
   https://supabase.com/dashboard/project/bknpldydmkzupsfagnva/sql/new

2. Copy and paste the following SQL:

${'-'.repeat(80)}
${migrationSQL}
${'-'.repeat(80)}

3. Click "Run" to execute the migration

4. After successful execution, run:
   npx tsx utils/sync-database-types.ts

5. Then continue with the implementation

Note: The migration includes:
- Thread management tables (threads, messages, etc.)
- Visualization storage
- RLS policies for security
- Realtime subscriptions
- Indexes for performance
`)