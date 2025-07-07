import * as fs from 'fs'
import { join } from 'path'

export interface TestUser {
  email: string
  password: string
  userId?: string
}

export function getTestUser(): TestUser {
  // First try environment variables (for CI)
  if (process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD) {
    return {
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD
    }
  }

  // Then try local test user file
  const testUserPath = join(process.cwd(), '.test-user.json')
  try {
    const testUserData = JSON.parse(fs.readFileSync(testUserPath, 'utf-8'))
    return testUserData
  } catch (error) {
    // Fallback for development - should not reach here in CI
    console.warn('No test user found. Please set TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables.')
    throw new Error('Test user credentials not found')
  }
}