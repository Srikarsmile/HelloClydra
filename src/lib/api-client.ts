// Optimized API client with caching and performance monitoring

import { performanceMonitor } from './monitoring'

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

interface FetchOptions extends RequestInit {
  enableCache?: boolean
  cacheTTL?: number
}

class APIClient {
  private cache = new Map<string, CacheEntry<unknown>>()
  private pendingRequests = new Map<string, Promise<unknown>>()

  private getCacheKey(url: string, options?: RequestInit): string {
    // For POST requests, extract only relevant fields from body to avoid large cache keys
    if (options?.method === 'POST' && options?.body) {
      try {
        const body = JSON.parse(options.body as string)
        // Extract only key fields for cache key generation
        const relevantFields = {
          message: body.message?.slice(0, 100), // First 100 chars only
          conversationId: body.conversationId,
          isResearcherMode: body.isResearcherMode,
          isWebSearchEnabled: body.isWebSearchEnabled
        }
        return `${url}:${options.method}:${JSON.stringify(relevantFields)}`
      } catch {
        // Fallback for non-JSON bodies
        return `${url}:${options.method}:${String(options.body).slice(0, 100)}`
      }
    }
    
    // For other methods, use the original approach
    return `${url}:${options?.method || 'GET'}:${JSON.stringify(options?.body || {})}`
  }

  private isValidCache<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl
  }

  async fetch<T>(
    url: string, 
    options: FetchOptions = {}
  ): Promise<T> {
    const { enableCache = false, cacheTTL = 5 * 60 * 1000, ...fetchOptions } = options
    const cacheKey = this.getCacheKey(url, fetchOptions)

    // Return cached data if valid
    if (enableCache && this.cache.has(cacheKey)) {
      const entry = this.cache.get(cacheKey)!
      if (this.isValidCache(entry)) {
        return entry.data as T
      }
      this.cache.delete(cacheKey)
    }

    // Return pending request if exists
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)! as Promise<T>
    }

    // Create new request
    const requestPromise = performanceMonitor.measureAsync(
      `API:${url}`,
      async () => {
        const response = await fetch(url, {
          ...fetchOptions,
          headers: {
            'Content-Type': 'application/json',
            ...fetchOptions.headers,
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        
        // Cache successful responses
        if (enableCache && response.status === 200) {
          this.cache.set(cacheKey, {
            data,
            timestamp: Date.now(),
            ttl: cacheTTL,
          })
        }

        return data
      }
    )

    // Store pending request
    this.pendingRequests.set(cacheKey, requestPromise)

    try {
      const result = await requestPromise
      return result
    } finally {
      // Clean up pending request
      this.pendingRequests.delete(cacheKey)
    }
  }

  // Optimized methods for common operations
  async sendMessage(data: {
    message: string
    conversationId?: string
    isResearcherMode?: boolean
    isWebSearchEnabled?: boolean
    imageUrl?: string
  }) {
    return this.fetch<{ conversationId: string }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }



  async getMessages(conversationId: string) {
    return this.fetch<{ messages: unknown[] }>(
      `/api/conversations/${conversationId}/messages`,
      { enableCache: true, cacheTTL: 30 * 1000 } // Cache for 30 seconds
    )
  }

  async getConversations() {
    return this.fetch<{ conversations: unknown[] }>(
      '/api/conversations',
      { enableCache: true, cacheTTL: 60 * 1000 } // Cache for 1 minute
    )
  }

  // Clear cache
  clearCache() {
    this.cache.clear()
  }

  // Get cache stats
  getCacheStats() {
    const now = Date.now()
    let validEntries = 0
    let expiredEntries = 0

    for (const entry of this.cache.values()) {
      if (this.isValidCache(entry)) {
        validEntries++
      } else {
        expiredEntries++
      }
    }

    return {
      total: this.cache.size,
      valid: validEntries,
      expired: expiredEntries,
      hitRate: validEntries / (validEntries + expiredEntries) || 0,
    }
  }
}

export const apiClient = new APIClient()