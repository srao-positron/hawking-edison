// API Client - Centralized API communication with auth, retries, and rate limiting
import { getBrowserClient } from './supabase-browser'
import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js'

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
  // Interact endpoint - Call Edge Function directly
  interact: async (input: string, options?: { provider?: string; sessionId?: string }) => {
    const supabase = getBrowserClient()
    
    console.log('[Interact] Calling Edge Function with:', {
      input: input.substring(0, 100) + '...',
      provider: options?.provider,
      hasSessionId: !!options?.sessionId,
      mode: 'sync'
    })
    
    const { data, error } = await supabase.functions.invoke('interact', {
      body: { 
        input, 
        provider: options?.provider,
        context: options?.sessionId ? { sessionId: options.sessionId } : undefined,
        mode: 'sync' // Use synchronous mode to get immediate responses
      }
    })
    
    if (error) {
      if (error instanceof FunctionsHttpError) {
        const errorMessage = await error.context.json()
        console.error('[Interact] Edge Function HTTP error:', {
          status: error.context.status,
          statusText: error.context.statusText,
          error: errorMessage,
          headers: Object.fromEntries(error.context.headers.entries())
        })
        throw new Error(errorMessage.error?.message || errorMessage.message || 'Edge Function error')
      } else if (error instanceof FunctionsRelayError) {
        console.error('[Interact] Relay error:', error.message)
        throw new Error(`Relay error: ${error.message}`)
      } else if (error instanceof FunctionsFetchError) {
        console.error('[Interact] Fetch error:', error.message)
        throw new Error(`Fetch error: ${error.message}`)
      }
      console.error('[Interact] Unknown error:', error)
      throw error
    }
    
    console.log('[Interact] Edge Function response:', {
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : [],
      fullResponse: data
    })
    
    // The Edge Function returns { success, data, metadata }
    // We need to extract the data portion
    if (data && data.data) {
      return data.data
    }
    
    // If there's no nested data property, return the whole response
    if (data) {
      console.warn('[Interact] No data.data property, returning full response')
      return data
    }
    
    throw new Error('Invalid response from Edge Function')
  },

  // Streaming interact endpoint using Server-Sent Events
  interactStream: async (threadId: string, input: string): Promise<EventSource> => {
    const supabase = getBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      throw new Error('Not authenticated')
    }

    const url = `${process.env.NEXT_PUBLIC_EDGE_FUNCTIONS_URL || process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/interact-stream`
    
    // Create EventSource with auth token in query params (SSE doesn't support headers)
    const params = new URLSearchParams({
      authorization: session.access_token,
      threadId,
      input
    })

    // For SSE, we need to send data via POST body, so we'll use a different approach
    // First, initiate the stream with a POST request that returns a stream ID
    const initResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ threadId, input })
    })

    if (!initResponse.ok) {
      const error = await initResponse.json()
      throw new Error(error.error?.message || 'Failed to start streaming')
    }

    // Return the response as an EventSource-like object
    const reader = initResponse.body?.getReader()
    const decoder = new TextDecoder()

    // Create a custom EventSource-like object
    let readyState = 1 // OPEN
    const eventSource = {
      onmessage: null as ((event: MessageEvent) => void) | null,
      onerror: null as ((event: Event) => void) | null,
      get readyState() { return readyState },
      url: url,
      close: () => {
        readyState = 2 // CLOSED
        reader?.cancel()
      },
      addEventListener: (type: string, listener: EventListener) => {
        // Simple event listener implementation
        if (type === 'message') {
          eventSource.onmessage = listener as any
        } else if (type === 'error') {
          eventSource.onerror = listener
        } else {
          // Store custom event listeners
          if (!eventSource._customListeners) {
            eventSource._customListeners = {}
          }
          if (!eventSource._customListeners[type]) {
            eventSource._customListeners[type] = []
          }
          eventSource._customListeners[type].push(listener)
        }
      },
      _customListeners: {} as Record<string, EventListener[]>
    } as EventSource & { _customListeners: Record<string, EventListener[]> }

    // Start reading the stream
    const readStream = async () => {
      if (!reader) return

      try {
        let buffer = ''
        
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          
          // Process complete SSE messages
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              const eventType = line.slice(7).trim()
              const nextLine = lines[lines.indexOf(line) + 1]
              if (nextLine?.startsWith('data: ')) {
                const data = nextLine.slice(6)
                
                // Dispatch custom event
                if (eventSource._customListeners[eventType]) {
                  const event = new MessageEvent(eventType, { data })
                  eventSource._customListeners[eventType].forEach(listener => {
                    listener(event)
                  })
                }
              }
            } else if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (eventSource.onmessage) {
                eventSource.onmessage(new MessageEvent('message', { data }))
              }
            }
          }
        }
      } catch (error) {
        if (eventSource.onerror) {
          eventSource.onerror(new Event('error'))
        }
      }
    }

    // Start reading in background
    readStream()

    return eventSource as EventSource
  },

  // Chat threads endpoints - Direct REST API calls since the Edge Function uses REST routing
  threads: {
    list: async (limit = 50, offset = 0) => {
      const supabase = getBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/chat-threads?limit=${limit}&offset=${offset}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
        throw new Error(error.error?.message || 'Failed to list threads')
      }
      
      const result = await response.json()
      return result.data || { threads: [], total: 0 }
    },

    get: async (threadId: string) => {
      const supabase = getBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/chat-threads/${threadId}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
        throw new Error(error.error?.message || 'Failed to get thread')
      }
      
      const result = await response.json()
      return result.data
    },

    getMessages: async (threadId: string) => {
      // The get endpoint already returns messages
      const data = await api.threads.get(threadId)
      return data?.messages || []
    },

    create: async (title?: string, metadata?: any) => {
      const supabase = getBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/chat-threads`
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: title || 'New Chat', metadata })
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
        throw new Error(error.error?.message || 'Failed to create thread')
      }
      
      const result = await response.json()
      return result.data
    },

    update: async (threadId: string, updates: { title?: string; metadata?: any }) => {
      const supabase = getBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/chat-threads/${threadId}`
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
        throw new Error(error.error?.message || 'Failed to update thread')
      }
      
      const result = await response.json()
      return result.data
    },

    delete: async (threadId: string) => {
      const supabase = getBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/chat-threads/${threadId}`
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
        throw new Error(error.error?.message || 'Failed to delete thread')
      }
      
      const result = await response.json()
      return result.data
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
      
      const { data, error } = await supabase.functions.invoke('auth-api-keys', {
        body: { action: 'list' }
      })
      
      if (error) {
        if (error instanceof FunctionsHttpError) {
          const errorMessage = await error.context.json()
          throw new Error(errorMessage.error?.message || 'Failed to fetch API keys')
        }
        throw new Error(error.message || 'Failed to fetch API keys')
      }
      
      return data?.data || []
    },
    
    create: async (name: string, expiresInDays?: number, environment: 'live' | 'test' = 'live') => {
      const supabase = getBrowserClient()
      
      const { data, error } = await supabase.functions.invoke('auth-api-keys', {
        body: { action: 'create', name, expiresInDays, environment }
      })
      
      if (error) {
        if (error instanceof FunctionsHttpError) {
          const errorMessage = await error.context.json()
          throw new Error(errorMessage.error?.message || 'Failed to create API key')
        }
        throw new Error(error.message || 'Failed to create API key')
      }
      
      return data?.data
    },
    
    revoke: async (id: string) => {
      const supabase = getBrowserClient()
      
      const { data, error } = await supabase.functions.invoke('auth-api-keys', {
        body: { action: 'revoke', id }
      })
      
      if (error) {
        if (error instanceof FunctionsHttpError) {
          const errorMessage = await error.context.json()
          throw new Error(errorMessage.error?.message || 'Failed to revoke API key')
        }
        throw new Error(error.message || 'Failed to revoke API key')
      }
      
      return data?.data
    },
    
    delete: async (id: string) => {
      const supabase = getBrowserClient()
      
      const { data, error } = await supabase.functions.invoke('auth-api-keys', {
        body: { action: 'delete', id }
      })
      
      if (error) {
        if (error instanceof FunctionsHttpError) {
          const errorMessage = await error.context.json()
          throw new Error(errorMessage.error?.message || 'Failed to delete API key')
        }
        throw new Error(error.message || 'Failed to delete API key')
      }
      
      return data?.data
    }
  }
}