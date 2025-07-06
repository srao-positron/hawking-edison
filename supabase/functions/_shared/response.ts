// Consistent API response format as per API_FIRST_ARCHITECTURE.md

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
  metadata?: {
    requestId: string
    timestamp: string
    version: string
  }
}

export function createResponse<T>(
  data?: T,
  error?: { code: string; message: string }
): Response {
  const response: ApiResponse<T> = {
    success: !error,
    ...(data && { data }),
    ...(error && { error }),
    metadata: {
      requestId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  }

  return new Response(JSON.stringify(response), {
    headers: { 
      'Content-Type': 'application/json',
      'X-Request-Id': response.metadata!.requestId
    },
    status: error ? 400 : 200
  })
}

export function createErrorResponse(
  code: string,
  message: string,
  status: number = 400
): Response {
  const response: ApiResponse = {
    success: false,
    error: { code, message },
    metadata: {
      requestId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  }

  return new Response(JSON.stringify(response), {
    headers: { 
      'Content-Type': 'application/json',
      'X-Request-Id': response.metadata!.requestId
    },
    status
  })
}