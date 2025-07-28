// Optimized HTTP client with connection pooling
import { Agent } from 'https'

const httpsAgent = new Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 45000 // Reduced from 60s to 45s for faster failover
})

export const optimizedFetch = (url: string, options: RequestInit = {}) => {
  return fetch(url, {
    ...options,
    // @ts-expect-error - Legacy code compatibility - Node.js specific agent option
    agent: url.startsWith('https:') ? httpsAgent : undefined
  })
}

// Response cache for identical requests with size limits and user isolation
const responseCache = new Map<string, { data: unknown, timestamp: number, size: number }>()
const CACHE_TTL = 2 * 60 * 1000 // 2 minutes
const MAX_CACHE_SIZE = 100 // Maximum number of entries
const MAX_ENTRY_SIZE = 1024 * 1024 // 1MB per entry
const MAX_TOTAL_SIZE = 10 * 1024 * 1024 // 10MB total cache size

let totalCacheSize = 0

export function getCachedResponse(key: string, userId?: string) {
  // Include userId in cache key for user isolation
  const cacheKey = userId ? `${userId}:${key}` : key
  const cached = responseCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  if (cached) {
    // Remove expired entry
    totalCacheSize -= cached.size
    responseCache.delete(cacheKey)
  }
  return null
}

export function setCachedResponse(key: string, data: unknown, userId?: string) {
  // Include userId in cache key for user isolation
  const cacheKey = userId ? `${userId}:${key}` : key
  const dataSize = JSON.stringify(data).length
  
  // Check individual entry size limit
  if (dataSize > MAX_ENTRY_SIZE) {
    console.warn('Cache entry too large, skipping cache')
    return
  }
  
  // Remove existing entry if it exists
  const existing = responseCache.get(cacheKey)
  if (existing) {
    totalCacheSize -= existing.size
  }
  
  // Ensure we don't exceed total cache size
  while (totalCacheSize + dataSize > MAX_TOTAL_SIZE && responseCache.size > 0) {
    const entries = Array.from(responseCache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
    const [oldestKey, oldestEntry] = entries[0]
    totalCacheSize -= oldestEntry.size
    responseCache.delete(oldestKey)
  }
  
  responseCache.set(cacheKey, { data, timestamp: Date.now(), size: dataSize })
  totalCacheSize += dataSize
  
  // Cleanup old entries if we exceed max count
  if (responseCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(responseCache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
    const entriesToRemove = entries.slice(0, responseCache.size - MAX_CACHE_SIZE)
    entriesToRemove.forEach(([key, entry]) => {
      totalCacheSize -= entry.size
      responseCache.delete(key)
    })
  }
}

export function getCacheStats() {
  return {
    size: responseCache.size,
    entries: Array.from(responseCache.keys())
  }
}