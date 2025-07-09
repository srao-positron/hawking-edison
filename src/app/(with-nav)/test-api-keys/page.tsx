'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestApiKeysPage() {
  const [session, setSession] = useState<any>(null)
  const [apiResponse, setApiResponse] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        setError(`Auth error: ${error.message}`)
      } else {
        setSession(session)
      }
    } catch (err: any) {
      setError(`Exception: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const testApiCall = async () => {
    if (!session?.access_token) {
      setError('No access token available')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/keys', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const text = await response.text()
      let data
      try {
        data = JSON.parse(text)
      } catch {
        data = { raw: text }
      }

      setApiResponse({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data
      })

      if (!response.ok) {
        setError(`API returned ${response.status}: ${response.statusText}`)
      }
    } catch (err: any) {
      setError(`Fetch error: ${err.message}`)
      console.error('Full error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">API Keys Debug Page</h1>
      
      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded">
          <h2 className="font-semibold mb-2">Authentication Status</h2>
          {loading ? (
            <p>Loading...</p>
          ) : session ? (
            <div className="text-sm">
              <p className="text-green-600">✓ Authenticated</p>
              <p>User ID: {session.user.id}</p>
              <p>Email: {session.user.email}</p>
              <p>Token: {session.access_token.substring(0, 20)}...</p>
            </div>
          ) : (
            <p className="text-red-600">✗ Not authenticated</p>
          )}
        </div>

        {session && (
          <div>
            <button
              onClick={testApiCall}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test API Call'}
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {apiResponse && (
          <div className="p-4 bg-blue-50 rounded">
            <h2 className="font-semibold mb-2">API Response</h2>
            <pre className="text-xs overflow-x-auto">
              {JSON.stringify(apiResponse, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}