import * as fs from 'fs'
import { join } from 'path'

export interface TestUser {
  email: string
  password: string
  userId: string
  apiKey: string
  supabaseUrl: string
  supabaseAnonKey: string
}

export function getTestUser(): TestUser {
  const testUserPath = join(process.cwd(), '.test-user.json')
  if (!fs.existsSync(testUserPath)) {
    throw new Error('Test user not found. Run: npx tsx utils/setup-test-credentials.ts')
  }
  return JSON.parse(fs.readFileSync(testUserPath, 'utf-8'))
}
