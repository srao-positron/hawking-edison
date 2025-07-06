import { randomBytes, createHash } from 'crypto'

const API_KEY_PREFIX = 'hke'
const API_KEY_LENGTH = 32

export interface GeneratedApiKey {
  key: string
  hash: string
  prefix: string
}

export function generateApiKey(environment: 'live' | 'test' = 'live'): GeneratedApiKey {
  const randomPart = randomBytes(API_KEY_LENGTH).toString('base64url')
  const key = `${API_KEY_PREFIX}_${environment}_${randomPart}`
  
  const hash = createHash('sha256').update(key).digest('hex')
  
  const prefix = key.substring(0, 12)
  
  return {
    key,
    hash,
    prefix
  }
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

export function validateApiKeyFormat(key: string): boolean {
  const pattern = /^hke_(live|test)_[A-Za-z0-9_-]{43,}$/
  return pattern.test(key)
}

export function getApiKeyEnvironment(key: string): 'live' | 'test' | null {
  if (!validateApiKeyFormat(key)) {
    return null
  }
  
  const parts = key.split('_')
  return parts[1] as 'live' | 'test'
}