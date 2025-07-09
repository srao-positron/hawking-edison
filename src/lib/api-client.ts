// API Client - Centralized API communication with auth, retries, and rate limiting
import { getBrowserClient } from './supabase-browser'

export interface ApiClientConfig {
  maxRetries?: number
  retryDelay?: number
  timeout?: number
}

export interface ApiRequestOptions extends RequestInit {
  retries?: number
  requireAuth?: boolean
}

class ApiClient {
  private config: Required<ApiClientConfig>
  private requestQueue: Promise<any> = Promise.resolve()
  private requestCount = 0
  private resetTime = Date.now() + 60000 // 1 minute window

  constructor(config: ApiClientConfig = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      timeout: config.timeout ?? 30000
    }
  }

  async getAuthHeaders(): Promise<HeadersInit> {
    const supabase = getBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      throw new Error('Not authenticated')
    }

    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    }
  }

  private async rateLimit(): Promise<void> {
    // Simple rate limiting: 60 requests per minute
    const now = Date.now()
    
    if (now > this.resetTime) {
      this.requestCount = 0
      this.resetTime = now + 60000
    }

    if (this.requestCount >= 60) {
      const waitTime = this.resetTime - now
      await new Promise(resolve => setTimeout(resolve, waitTime))
      this.requestCount = 0
      this.resetTime = Date.now() + 60000
    }

    this.requestCount++
  }

  private async executeWithRetry<T>(
    url: string,
    options: ApiRequestOptions,
    retryCount = 0
  ): Promise<T> {
    try {
      // Add timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
        
        // Don't retry auth errors
        if (response.status === 401 || response.status === 403) {
          throw new Error(errorData.error?.message || 'Authentication failed')
        }

        // Retry on 5xx errors or rate limit
        if (response.status >= 500 || response.status === 429) {
          throw new Error(errorData.error?.message || `HTTP ${response.status}`)
        }

        throw new Error(errorData.error?.message || `Request failed: ${response.status}`)
      }

      return await response.json()
    } catch (error: any) {
      // Retry logic
      if (retryCount < this.config.maxRetries && 
          (error.name === 'AbortError' || error.message.includes('HTTP 5'))) {
        const delay = this.config.retryDelay * Math.pow(2, retryCount) // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.executeWithRetry(url, options, retryCount + 1)
      }

      throw error
    }
  }

  async request<T>(
    url: string,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    const { requireAuth = true, ...fetchOptions } = options

    // Queue requests to respect rate limits
    return this.requestQueue = this.requestQueue.then(async () => {
      await this.rateLimit()

      // Add auth headers if required
      if (requireAuth) {
        const authHeaders = await this.getAuthHeaders()
        fetchOptions.headers = {
          ...authHeaders,
          ...fetchOptions.headers
        }
      }

      return this.executeWithRetry<T>(url, fetchOptions)
    })
  }

  // Convenience methods
  async get<T>(url: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(url, { ...options, method: 'GET' })
  }

  async post<T>(url: string, data: any, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async put<T>(url: string, data: any, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async delete<T>(url: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(url, { ...options, method: 'DELETE' })
  }

  async patch<T>(url: string, data: any, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data)
    })
  }
}

// Export singleton instance
export const apiClient = new ApiClient()

// Export specific API methods
export const api = {
  // Interact endpoint
  interact: async (input: string, options?: { provider?: string; sessionId?: string }) => {
    const response = await apiClient.post<{
      data: { interactionId: string; threadId: string; response: string; usage?: any }
    }>('/api/interact', { 
      input, 
      provider: options?.provider,
      context: options?.sessionId ? { sessionId: options.sessionId } : undefined
    })
    return response.data
  },

  // Chat threads endpoints
  threads: {
    list: async (limit = 50, offset = 0) => {
      const response = await apiClient.get<{
        data: { threads: any[]; total: number }
      }>(`/api/chat-threads?limit=${limit}&offset=${offset}`)
      return response.data
    },

    get: async (threadId: string) => {
      const response = await apiClient.get<{
        data: { thread: any; messages: any[] }
      }>(`/api/chat-threads/${threadId}`)
      return response.data
    },

    create: async (title?: string, metadata?: any) => {
      const response = await apiClient.post<{
        data: { thread: any }
      }>('/api/chat-threads', { title, metadata })
      return response.data
    },

    update: async (threadId: string, updates: { title?: string; metadata?: any }) => {
      const response = await apiClient.put<{
        data: { thread: any }
      }>(`/api/chat-threads/${threadId}`, updates)
      return response.data
    },

    delete: async (threadId: string) => {
      const response = await apiClient.delete<{
        data: {}
      }>(`/api/chat-threads/${threadId}`)
      return response.data
    }
  },

  // Databank endpoints
  databank: {
    add: async (content: string, url: string, metadata?: any) => {
      const response = await apiClient.post<{ data: { id: string } }>(
        '/api/databank/add',
        { content, url, metadata }
      )
      return response.data
    },
    
    search: async (query: string, limit?: number) => {
      const response = await apiClient.post<{ data: { results: any[] } }>(
        '/api/databank/search',
        { query, limit }
      )
      return response.data
    },
    
    list: async () => {
      const response = await apiClient.get<{ data: { items: any[] } }>(
        '/api/databank/list'
      )
      return response.data
    }
  },

  // Memory endpoints
  memories: {
    save: async (streamName: string, content: any, interactionId?: string) => {
      const response = await apiClient.post<{ data: { id: string } }>(
        '/api/memories/save',
        { streamName, content, interactionId }
      )
      return response.data
    },
    
    search: async (query: string, streamName?: string, limit?: number) => {
      const response = await apiClient.post<{ data: { results: any[] } }>(
        '/api/memories/search',
        { query, streamName, limit }
      )
      return response.data
    },
    
    get: async (streamName: string, limit?: number) => {
      const response = await apiClient.post<{ data: { memories: any[] } }>(
        '/api/memories/get',
        { streamName, limit }
      )
      return response.data
    },
    
    listStreams: async () => {
      const response = await apiClient.get<{ data: { streams: string[] } }>(
        '/api/memories/streams'
      )
      return response.data
    }
  },

  // API Key endpoints - Call Edge Functions directly
  apiKeys: {
    list: async () => {
      const supabase = getBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/auth-api-keys`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to fetch API keys')
      }
      
      const result = await response.json()
      return result.data
    },
    
    create: async (name: string, expiresInDays?: number, environment: 'live' | 'test' = 'live') => {
      const supabase = getBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/auth-api-keys`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, expiresInDays, environment })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to create API key')
      }
      
      const result = await response.json()
      return result.data
    },
    
    revoke: async (id: string) => {
      const supabase = getBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/auth-api-keys`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id, action: 'revoke' })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to revoke API key')
      }
      
      const result = await response.json()
      return result.data
    },
    
    delete: async (id: string) => {
      const supabase = getBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/auth-api-keys`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to delete API key')
      }
      
      const result = await response.json()
      return result.data
    }
  }
}