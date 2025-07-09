// API Key utilities for Edge Functions

const API_KEY_PREFIX = 'hke'
const API_KEY_LENGTH = 32

export interface GeneratedApiKey {
  key: string
  hash: string
  prefix: string
}

export function generateApiKey(environment: 'live' | 'test' = 'live'): GeneratedApiKey {
  // Generate random bytes using Web Crypto API
  const bytes = new Uint8Array(API_KEY_LENGTH)
  crypto.getRandomValues(bytes)
  
  // Convert to base64url
  const randomPart = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  
  const key = `${API_KEY_PREFIX}_${environment}_${randomPart}`
  
  // Hash the key
  const hash = hashApiKey(key)
  
  const prefix = key.substring(0, 12)
  
  return {
    key,
    hash,
    prefix
  }
}

export function hashApiKey(key: string): string {
  // Hash using Web Crypto API (synchronous for Deno)
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = crypto.subtle.digestSync('SHA-256', data)
  const hashArray = new Uint8Array(hashBuffer)
  
  // Convert to hex string
  return Array.from(hashArray)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
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