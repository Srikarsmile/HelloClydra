'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import SupermemoryManager from '@/lib/supermemory'

interface Memory {
  id: string
  title: string
  summary: string
  content: string
  score: number
  timestamp: string
  metadata?: any
}

export default function MemoriesPage() {
  const { isLoaded, isSignedIn, user } = useUser()
  const router = useRouter()
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Memory[]>([])

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/chat')
    }
  }, [isLoaded, isSignedIn, router])

  useEffect(() => {
    if (isSignedIn) {
      loadMemories()
    }
  }, [isSignedIn])

  const loadMemories = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Check if Supermemory is available
      const status = SupermemoryManager.getClientStatus()
      if (!status.initialized || !status.hasApiKey) {
        // If Supermemory is not configured, show empty state instead of error
        setMemories([])
        setLoading(false)
        // Don't set error - just show the empty state
        return
      }

      // Check if service is healthy with a timeout
      try {
        const healthCheckPromise = SupermemoryManager.isHealthy()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), 5000)
        )
        
        const isHealthy = await Promise.race([healthCheckPromise, timeoutPromise])
        if (!isHealthy) {
          setError('Memory service is currently unavailable. Please try again later.')
          setLoading(false)
          return
        }
      } catch (healthError) {
        setError('Unable to connect to memory service. Please check your connection.')
        setLoading(false)
        return
      }

      // Search for all memories (with a broad query)
      try {
        const results = await SupermemoryManager.searchMemories({
          query: '*',
          limit: 50
        })

        if (results && results.results) {
          const formattedMemories = results.results.map((result: any) => ({
            id: result.id || `memory-${Date.now()}-${Math.random()}`,
            title: result.title || 'Untitled Memory',
            summary: result.summary || 'No summary available',
            content: result.content || result.chunks?.[0]?.content || 'No content available',
            score: result.score || 0,
            timestamp: result.metadata?.timestamp || new Date().toISOString(),
            metadata: result.metadata
          }))
          setMemories(formattedMemories)
        } else {
          // If no results, just show empty state instead of error
          setMemories([])
        }
      } catch (searchError) {
        // For search errors, show empty state instead of error
        setMemories([])
      }
    } catch (err: any) {
      if (err.message?.includes('Connection error')) {
        setError('Unable to connect to memory service. Please check your internet connection and try again.')
      } else {
        setError('Failed to load memories. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const searchMemories = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    try {
      const results = await SupermemoryManager.searchMemories({
        query: searchQuery,
        limit: 20
      })

      if (results && results.results) {
        const formattedResults = results.results.map((result: any) => ({
          id: result.id || `search-${Date.now()}-${Math.random()}`,
          title: result.title || 'Untitled Memory',
          summary: result.summary || 'No summary available',
          content: result.content || result.chunks?.[0]?.content || 'No content available',
          score: result.score || 0,
          timestamp: result.metadata?.timestamp || new Date().toISOString(),
          metadata: result.metadata
        }))
        setSearchResults(formattedResults)
      }
    } catch (err) {
      setError('Failed to search memories. Please try again.')
    }
  }

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString()
    } catch {
      return 'Unknown date'
    }
  }

  const displayMemories = searchQuery.trim() ? searchResults : memories

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--accent)' }}></div>
      </div>
    )
  }

  if (!isSignedIn) {
    return null
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Mobile-optimized Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => router.push('/chat')}
              className="p-2 hover:bg-[var(--accent-soft)] rounded-lg transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
              style={{ color: 'var(--fg)' }}
            >
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M19 12H5m7-7l-7 7 7 7"/>
              </svg>
            </button>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold" style={{ color: 'var(--fg)' }}>Your Memories</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={loadMemories}
              disabled={loading}
              className="px-3 sm:px-4 py-2 text-white rounded-lg disabled:opacity-50 transition-colors text-sm sm:text-base touch-manipulation shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
              style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--accent)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D4881F'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent)'}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span className="hidden xs:inline">Refresh</span>
              )}
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="xs:hidden">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M3 21v-5h5" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-2xl">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchMemories()}
              placeholder="Search your memories..."
              className="w-full px-4 py-3 pr-12 border-2 rounded-xl focus:outline-none transition-all duration-300"
              style={{ 
                backgroundColor: 'var(--card)', 
                borderColor: 'var(--outline)',
                color: 'var(--fg)'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.boxShadow = '0 0 0 4px rgba(226, 154, 46, 0.1), 0 10px 15px -3px rgba(0, 0, 0, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--outline)';
                e.currentTarget.style.boxShadow = '';
              }}
            />
            <button
              onClick={searchMemories}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-[var(--accent-soft)] rounded-lg"
              style={{ color: 'var(--fg)' }}
              aria-label="Search memories"
            >
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl shadow-sm">
            <div className="flex items-center gap-2">
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-red-500">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent)' }}></div>
            <span className="ml-3" style={{ color: 'var(--fg)' }}>Loading memories...</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && displayMemories.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--accent-soft)' }}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={2}>
                <path d="M9 12l2 2 4-4"/>
                <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                <path d="M3 12c1 0 3 1 3 3s-2 3-3 3-3-1-3-3 2-3 3-3"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--fg)' }}>
              {searchQuery.trim() ? 'No memories found' : 'No memories yet'}
            </h3>
            <p className="mb-4" style={{ color: 'var(--fg)', opacity: 0.7 }}>
              {searchQuery.trim() 
                ? 'Try a different search term or check your spelling.'
                : SupermemoryManager.getClientStatus().hasApiKey 
                  ? 'Start chatting to create your first memory!'
                  : 'Memory feature requires Supermemory API key configuration.'
              }
            </p>
            <button
              onClick={() => router.push('/chat')}
              className="px-6 py-3 text-white rounded-xl transition-all duration-200 hover:shadow-xl transform hover:scale-105 active:scale-95"
              style={{ backgroundColor: 'var(--accent)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D4881F'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent)'}
            >
              Start Chatting
            </button>
          </div>
        )}

        {/* Memories Grid */}
        {!loading && !error && displayMemories.length > 0 && (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {displayMemories.map((memory) => (
              <div key={memory.id} className="rounded-xl shadow-sm border p-4 sm:p-6 hover:shadow-lg transition-all duration-300 touch-manipulation hover:transform hover:translateY-[-2px]" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--outline)' }}>
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-semibold truncate flex-1 mr-2" style={{ color: 'var(--fg)' }}>
                    {memory.title}
                  </h3>
                  <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}>
                    {Math.round(memory.score * 100)}% match
                  </span>
                </div>
                
                <p className="text-sm mb-4 line-clamp-3" style={{ color: 'var(--fg)', opacity: 0.8 }}>
                  {memory.summary}
                </p>
                
                <div className="flex items-center justify-between text-xs" style={{ color: 'var(--fg)', opacity: 0.6 }}>
                  <span>{formatTimestamp(memory.timestamp)}</span>
                  <div className="flex items-center gap-1">
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12,6 12,12 16,14"/>
                    </svg>
                    <span>Memory</span>
                  </div>
                </div>
                
                {memory.content && memory.content !== memory.summary && (
                  <details className="mt-4">
                    <summary className="text-sm cursor-pointer touch-manipulation py-2 hover:opacity-80 transition-opacity" style={{ color: 'var(--accent)' }}>
                      Show full content
                    </summary>
                    <div className="mt-2 p-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--fg)' }}>
                      {memory.content}
                    </div>
                  </details>
                )}
                
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to delete this memory? This action cannot be undone.')) {
                        try {
                          const response = await fetch(`/api/memories/${memory.id}`, {
                            method: 'DELETE',
                          })
                          if (response.ok) {
                            setMemories((prev) => prev.filter((mem) => mem.id !== memory.id))
                            setSearchResults((prev) => prev.filter((mem) => mem.id !== memory.id))
                          } else {
                            alert('Failed to delete memory. Please try again.')
                          }
                        } catch (error) {
                          alert('An error occurred while deleting the memory.')
                        }
                      }
                    }}
                    className="px-3 py-2 text-sm bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 touch-manipulation min-h-[44px] hover:shadow-md transform hover:scale-105 active:scale-95"
                  >
                    Delete Memory
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}