'use client'

import { useState, useEffect } from 'react'
import { getBrowserClient } from '@/lib/supabase-browser'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function TestApiKeysPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [user, setUser] = useState<any>(null)
  const [apiKeysResponse, setApiKeysResponse] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  const supabase = getBrowserClient()

  useEffect(() => {
    checkUser()
  }, [])

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`])
  }

  const checkUser = async () => {
    addLog('Checking current user...')
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    if (user) {
      addLog(`User found: ${user.email} (${user.id})`)
    } else {
      addLog('No user logged in')
    }
  }

  const handleSignIn = async () => {
    setLoading(true)
    addLog(`Attempting to sign in with ${email}...`)
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      addLog(`Sign in error: ${error.message}`)
    } else {
      addLog('Sign in successful!')
      setUser(data.user)
      
      // Check cookies
      addLog('Checking cookies...')
      const cookies = document.cookie.split('; ')
      const authCookies = cookies.filter(c => c.startsWith('sb-'))
      authCookies.forEach(cookie => {
        addLog(`Cookie: ${cookie.split('=')[0]}`)
      })
    }
    
    setLoading(false)
  }

  const handleSignOut = async () => {
    addLog('Signing out...')
    await supabase.auth.signOut()
    setUser(null)
    setApiKeysResponse(null)
    addLog('Signed out')
  }

  const testApiKeys = async () => {
    setLoading(true)
    addLog('Testing /api/api-keys endpoint...')
    
    try {
      const response = await fetch('/api/api-keys', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Important for cookies
      })

      addLog(`Response status: ${response.status} ${response.statusText}`)
      
      const data = await response.json()
      setApiKeysResponse(data)
      addLog(`Response: ${JSON.stringify(data, null, 2)}`)
      
    } catch (error: any) {
      addLog(`Error: ${error.message}`)
    }
    
    setLoading(false)
  }

  const testDirectEdgeFunction = async () => {
    setLoading(true)
    addLog('Testing direct Edge Function call...')
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        addLog('No session available')
        return
      }

      addLog(`Using access token: ${session.access_token.substring(0, 20)}...`)
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/auth-api-keys`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      addLog(`Direct response status: ${response.status} ${response.statusText}`)
      
      const data = await response.json()
      addLog(`Direct response: ${JSON.stringify(data, null, 2)}`)
      
    } catch (error: any) {
      addLog(`Direct error: ${error.message}`)
    }
    
    setLoading(false)
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">API Keys Authentication Test</h1>
      
      <div className="grid gap-6">
        {/* Authentication Card */}
        <Card>
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>
              {user ? `Logged in as ${user.email}` : 'Not logged in'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!user ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="test@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="password"
                  />
                </div>
                <Button onClick={handleSignIn} disabled={loading}>
                  Sign In
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  User ID: {user.id}
                </p>
                <Button onClick={handleSignOut} variant="outline">
                  Sign Out
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Testing Card */}
        {user && (
          <Card>
            <CardHeader>
              <CardTitle>API Testing</CardTitle>
              <CardDescription>Test the API keys endpoints</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button onClick={testApiKeys} disabled={loading}>
                  Test /api/api-keys
                </Button>
                <Button onClick={testDirectEdgeFunction} disabled={loading} variant="outline">
                  Test Direct Edge Function
                </Button>
              </div>
              
              {apiKeysResponse && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(apiKeysResponse, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Logs Card */}
        <Card>
          <CardHeader>
            <CardTitle>Debug Logs</CardTitle>
            <CardDescription>Real-time debugging information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-xs h-64 overflow-auto">
              {logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}