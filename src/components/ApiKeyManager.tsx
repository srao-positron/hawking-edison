'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import { format } from 'date-fns'
import { Copy, Key, Trash2, Ban, Plus } from 'lucide-react'
import { Database } from '@/types/database.types'

// Use the generated type from the database
type ApiKeyRow = Database['public']['Tables']['api_keys']['Row']

// Extend with computed fields from the Edge Function
interface ApiKey extends ApiKeyRow {
  isActive: boolean
  isExpired: boolean
  isRevoked: boolean
  revoked_at: string | null // Added by Edge Function for compatibility
}

export default function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyExpiry, setNewKeyExpiry] = useState('')
  const [newKeyEnvironment, setNewKeyEnvironment] = useState<'live' | 'test'>('live')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadKeys()
  }, [])

  const loadKeys = async () => {
    try {
      setLoading(true)
      const data = await api.apiKeys.list()
      setKeys(data.keys)
    } catch (err: any) {
      console.error('Error loading API keys:', err)
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        response: err.response,
        status: err.status
      })
      
      // Set a more descriptive error message
      if (err.message?.includes('Not authenticated')) {
        setError('Authentication required. Please log in to manage API keys.')
      } else if (err.message?.includes('Network')) {
        setError('Network error. Please check your connection and try again.')
      } else {
        setError(`Failed to load API keys: ${err.message || 'Unknown error'}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const createKey = async () => {
    if (!newKeyName.trim()) {
      setError('Please enter a name for the API key')
      return
    }

    try {
      setCreating(true)
      setError(null)
      const expiresInDays = newKeyExpiry ? parseInt(newKeyExpiry) : undefined
      const data = await api.apiKeys.create(newKeyName, expiresInDays, newKeyEnvironment)
      setCreatedKey(data.key)
      setNewKeyName('')
      setNewKeyExpiry('')
      setNewKeyEnvironment('live')
      await loadKeys()
    } catch (err: any) {
      setError(err.message || 'Failed to create API key')
    } finally {
      setCreating(false)
    }
  }

  const revokeKey = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return
    }

    try {
      await api.apiKeys.revoke(id)
      await loadKeys()
    } catch (err) {
      setError('Failed to revoke API key')
    }
  }

  const deleteKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return
    }

    try {
      await api.apiKeys.delete(id)
      await loadKeys()
    } catch (err) {
      setError('Failed to delete API key')
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('Copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (loading) {
    return <div className="p-4">Loading API keys...</div>
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">API Keys</h2>
        <p className="text-gray-600">
          Manage your API keys for programmatic access to Hawking Edison.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      {createdKey && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="font-semibold text-green-800 mb-2">API Key Created Successfully!</p>
          <p className="text-sm text-green-700 mb-3">
            Make sure to copy your API key now. You won't be able to see it again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-2 bg-white border rounded font-mono text-sm">
              {createdKey}
            </code>
            <button
              onClick={() => copyToClipboard(createdKey)}
              className="p-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => setCreatedKey(null)}
            className="mt-3 text-sm text-green-700 hover:text-green-800"
          >
            Close
          </button>
        </div>
      )}

      <div className="mb-6">
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Create New API Key
        </button>
      </div>

      {showCreateForm && (
        <div className="mb-6 p-4 bg-gray-50 border rounded-md">
          <h3 className="font-semibold mb-4">Create New API Key</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., Production App"
                className="w-full px-3 py-2 border rounded-md"
                maxLength={100}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Expiration (days, optional)
              </label>
              <input
                type="number"
                value={newKeyExpiry}
                onChange={(e) => setNewKeyExpiry(e.target.value)}
                placeholder="e.g., 90"
                className="w-full px-3 py-2 border rounded-md"
                min="1"
                max="365"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Environment</label>
              <select
                value={newKeyEnvironment}
                onChange={(e) => setNewKeyEnvironment(e.target.value as 'live' | 'test')}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="live">Live</option>
                <option value="test">Test</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={createKey}
                disabled={creating}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Key'}
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  setNewKeyName('')
                  setNewKeyExpiry('')
                  setError(null)
                }}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {keys.length === 0 ? (
          <p className="text-gray-500">No API keys yet. Create one to get started.</p>
        ) : (
          keys.map((key) => (
            <div
              key={key.id}
              className={`p-4 border rounded-md ${
                key.isActive ? 'bg-white' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Key className="w-4 h-4 text-gray-500" />
                    <h4 className="font-semibold">{key.name}</h4>
                    {key.isActive && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                        Active
                      </span>
                    )}
                    {key.isExpired && (
                      <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">
                        Expired
                      </span>
                    )}
                    {key.isRevoked && (
                      <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                        Revoked
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    <code>{key.key_prefix}...</code>
                  </p>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>Created: {key.created_at && format(new Date(key.created_at), 'PPpp')}</p>
                    {key.last_used && (
                      <p>Last used: {format(new Date(key.last_used), 'PPpp')}</p>
                    )}
                    {key.expires_at && (
                      <p>Expires: {format(new Date(key.expires_at), 'PPpp')}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {key.isActive && (
                    <button
                      onClick={() => revokeKey(key.id)}
                      className="p-2 text-orange-600 hover:bg-orange-50 rounded"
                      title="Revoke key"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteKey(key.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Delete key"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="font-semibold text-blue-900 mb-2">Using API Keys</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>Include your API key in requests using one of these methods:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>
              Authorization header: <code className="bg-blue-100 px-1">Bearer hke_...</code>
            </li>
            <li>
              X-API-Key header: <code className="bg-blue-100 px-1">hke_...</code>
            </li>
            <li>
              Query parameter: <code className="bg-blue-100 px-1">?api_key=hke_...</code>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}