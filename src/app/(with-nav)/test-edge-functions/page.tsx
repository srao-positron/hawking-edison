'use client'

import { useState, useEffect } from 'react'
import { getBrowserClient } from '@/lib/supabase-browser'
import { api } from '@/lib/api-client'

export default function TestEdgeFunctionsPage() {
  const [user, setUser] = useState<any>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('test@hawkingedison.com')
  const [password, setPassword] = useState('test123456')

  const supabase = getBrowserClient()

  useEffect(() => {
    checkUser()
  }, [])

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toISOString()
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : '📝'
    setLogs(prev => [...prev, `${timestamp} ${prefix} ${message}`])
  }

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    if (user) {
      addLog(`Already logged in as ${user.email}`, 'success')
    }
  }

  const handleSignIn = async () => {
    setLoading(true)
    addLog(`Attempting to sign in as ${email}...`)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      addLog(`Sign in error: ${error.message}`, 'error')
      setLoading(false)
      return
    }

    addLog('Sign in successful!', 'success')
    setUser(data.user)
    
    // Check session
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      addLog(`Session token: ${session.access_token.substring(0, 50)}...`)
      addLog(`Token expires at: ${new Date(session.expires_at! * 1000).toISOString()}`)
    }

    // Check cookies
    addLog('Checking cookies...')
    const cookies = document.cookie.split('; ')
    const authCookies = cookies.filter(c => c.startsWith('sb-'))
    authCookies.forEach(cookie => {
      const [name] = cookie.split('=')
      addLog(`Cookie found: ${name}`)
    })

    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setLogs([])
    addLog('Signed out', 'success')
  }

  const testDirectCall = async () => {
    setLoading(true)
    addLog('Testing direct Edge Function call...')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        addLog('No session available', 'error')
        setLoading(false)
        return
      }

      addLog(`Making request to: ${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/auth-api-keys`)
      addLog(`With token: Bearer ${session.access_token.substring(0, 50)}...`)

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/auth-api-keys`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      addLog(`Response status: ${response.status} ${response.statusText}`)
      
      const data = await response.json()
      addLog(`Response data: ${JSON.stringify(data, null, 2)}`, response.ok ? 'success' : 'error')

    } catch (error: any) {
      addLog(`Error: ${error.message}`, 'error')
    }

    setLoading(false)
  }

  const testApiClient = async () => {
    setLoading(true)
    addLog('Testing API client (api.apiKeys.list)...')

    try {
      const keys = await api.apiKeys.list()
      addLog(`Success! Found ${keys.length} API keys`, 'success')
      keys.forEach((key: any) => {
        addLog(`- ${key.name} (${key.id}) - Created: ${key.created_at}`)
      })
    } catch (error: any) {
      addLog(`API client error: ${error.message}`, 'error')
    }

    setLoading(false)
  }

  const createApiKey = async () => {
    setLoading(true)
    addLog('Creating new API key...')

    try {
      const result = await api.apiKeys.create('Test Key ' + Date.now(), 30, 'test')
      addLog(`Created API key: ${result.key}`, 'success')
      addLog(`Key ID: ${result.id}`)
      addLog(`Name: ${result.name}`)
    } catch (error: any) {
      addLog(`Create error: ${error.message}`, 'error')
    }

    setLoading(false)
  }

  return (
    <div className="container max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Edge Functions Test</h1>

      <div className="space-y-6">
        {/* Auth Section */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Authentication</h2>
          
          {!user ? (
            <div className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-3 py-2 border rounded"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-3 py-2 border rounded"
              />
              <button
                onClick={handleSignIn}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
              >
                Sign In
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p>Logged in as: <strong>{user.email}</strong></p>
              <p className="text-sm text-gray-600">User ID: {user.id}</p>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-gray-500 text-white rounded"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>

        {/* Test Actions */}
        {user && (
          <div className="border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">Test Actions</h2>
            <div className="space-x-2">
              <button
                onClick={testDirectCall}
                disabled={loading}
                className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
              >
                Test Direct Call
              </button>
              <button
                onClick={testApiClient}
                disabled={loading}
                className="px-4 py-2 bg-purple-500 text-white rounded disabled:opacity-50"
              >
                Test API Client
              </button>
              <button
                onClick={createApiKey}
                disabled={loading}
                className="px-4 py-2 bg-yellow-500 text-white rounded disabled:opacity-50"
              >
                Create API Key
              </button>
            </div>
          </div>
        )}

        {/* Logs */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Logs</h2>
          <div className="bg-black text-green-400 p-4 rounded font-mono text-xs h-96 overflow-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet...</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="mb-1">{log}</div>
              ))
            )}
          </div>
          <button
            onClick={() => setLogs([])}
            className="mt-2 px-4 py-2 bg-gray-500 text-white rounded text-sm"
          >
            Clear Logs
          </button>
        </div>
      </div>
    </div>
  )
}