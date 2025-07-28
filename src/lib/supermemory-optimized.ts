import Supermemory from 'supermemory'

// Initialize Supermemory client only if API key is available
const client = process.env.NEXT_PUBLIC_SUPERMEMORY_API_KEY ? new Supermemory({
  apiKey: process.env.NEXT_PUBLIC_SUPERMEMORY_API_KEY,
}) : null

// Cache for search results
const searchCache = new Map<string, { data: any, timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Request deduplication
const pendingRequests = new Map<string, Promise<any>>()

// Batch operations queue
const batchQueue: Array<{ type: 'add' | 'search', data: any, resolve: (value: any) => void, reject: (reason?: any) => void }> = []
let batchTimeout: NodeJS.Timeout | null = null

export interface MemoryData {
  content: string
  userId?: string
  containerTags?: string[]
  metadata?: {
    source?: string
    category?: string
    messageType?: 'user' | 'assistant'
    timestamp?: string
    importance?: 'low' | 'medium' | 'high'
    conversationId?: string
    [key: string]: any
  }
}

export interface SearchOptions {
  query: string
  limit?: number
  userId?: string
  conversationId?: string
}

export class OptimizedSupermemoryManager {
  private static serviceHealthy = true
  private static lastHealthCheck = 0
  private static readonly HEALTH_CHECK_INTERVAL = 5 * 60 * 1000 // 5 minutes

  // Strategy 1: Caching with TTL
  private static getCacheKey(options: SearchOptions): string {
    return `${options.query}:${options.limit || 5}:${options.userId || ''}:${options.conversationId || ''}`
  }

  private static getCachedResult(key: string) {
    const cached = searchCache.get(key)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data
    }
    searchCache.delete(key)
    return null
  }

  private static setCachedResult(key: string, data: any) {
    searchCache.set(key, { data, timestamp: Date.now() })
    
    // Clean up old cache entries
    if (searchCache.size > 100) {
      const now = Date.now()
      for (const [k, v] of searchCache.entries()) {
        if (now - v.timestamp > CACHE_TTL) {
          searchCache.delete(k)
        }
      }
    }
  }

  // Strategy 2: Request Deduplication
  private static async deduplicateRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    if (pendingRequests.has(key)) {
      return pendingRequests.get(key) as Promise<T>
    }

    const promise = requestFn().finally(() => {
      pendingRequests.delete(key)
    })

    pendingRequests.set(key, promise)
    return promise
  }

  // Strategy 3: Batch Processing
  private static processBatch() {
    if (batchQueue.length === 0) return

    const currentBatch = [...batchQueue]
    batchQueue.length = 0

    // Group by operation type
    const addOperations = currentBatch.filter(op => op.type === 'add')
    const searchOperations = currentBatch.filter(op => op.type === 'search')

    // Process add operations in parallel (limited concurrency)
    if (addOperations.length > 0) {
      this.processBatchAdds(addOperations)
    }

    // Process search operations with deduplication
    if (searchOperations.length > 0) {
      this.processBatchSearches(searchOperations)
    }
  }

  private static async processBatchAdds(operations: any[]) {
    const BATCH_SIZE = 3 // Limit concurrent adds
    
    for (let i = 0; i < operations.length; i += BATCH_SIZE) {
      const batch = operations.slice(i, i + BATCH_SIZE)
      
      await Promise.allSettled(
        batch.map(async (op) => {
          try {
            const result = await this.directAddMemory(op.data)
            op.resolve(result)
          } catch (error) {
            op.reject(error)
          }
        })
      )
    }
  }

  private static async processBatchSearches(operations: any[]) {
    // Deduplicate similar searches
    const uniqueSearches = new Map<string, any[]>()
    
    operations.forEach(op => {
      const key = this.getCacheKey(op.data)
      if (!uniqueSearches.has(key)) {
        uniqueSearches.set(key, [])
      }
      uniqueSearches.get(key)!.push(op)
    })

    // Execute unique searches
    for (const [key, ops] of uniqueSearches.entries()) {
      try {
        const result = await this.directSearchMemories(ops[0].data)
        ops.forEach(op => op.resolve(result))
      } catch (error) {
        ops.forEach(op => op.reject(error))
      }
    }
  }

  // Strategy 4: Fast Search with Aggressive Caching
  static async fastSearchMemories(options: SearchOptions) {
    if (!client) {
      console.warn('Supermemory client not initialized - API key missing')
      return null
    }

    const cacheKey = this.getCacheKey(options)
    
    // Check cache first
    const cached = this.getCachedResult(cacheKey)
    if (cached) {
      return cached
    }

    // Use request deduplication
    return this.deduplicateRequest(cacheKey, async () => {
      try {
        const result = await Promise.race([
          this.directSearchMemories(options),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Search timeout')), 800) // Aggressive timeout
          )
        ])
        
        this.setCachedResult(cacheKey, result)
        return result
      } catch (error) {
        console.warn('Fast search failed:', error)
        return null
      }
    })
  }

  // Strategy 5: Background Batch Add
  static async batchAddMemory(data: MemoryData): Promise<boolean> {
    if (!client) {
      console.warn('Supermemory client not initialized - API key missing')
      return false
    }

    return new Promise((resolve, reject) => {
      batchQueue.push({
        type: 'add',
        data,
        resolve,
        reject
      })

      // Schedule batch processing
      if (batchTimeout) {
        clearTimeout(batchTimeout)
      }
      
      batchTimeout = setTimeout(() => {
        this.processBatch()
        batchTimeout = null
      }, 100) // Process batch after 100ms
    })
  }

  // Direct operations (used internally)
  private static async directSearchMemories(options: SearchOptions) {
    const basicParams = {
      q: options.query.slice(0, 100), // Limit query length
      limit: Math.min(options.limit || 3, 3) // Limit results for speed
    }

    return await client!.search.execute(basicParams)
  }

  private static async directAddMemory(data: MemoryData): Promise<boolean> {
    try {
      const payload: any = {
        content: data.content.slice(0, 1000) // Limit content length for speed
      }

      if (data.userId) {
        payload.userId = data.userId
      }

      if (data.containerTags && data.containerTags.length > 0) {
        payload.containerTags = data.containerTags.slice(0, 5) // Limit tags
      }

      if (data.metadata) {
        // Only include essential metadata
        payload.metadata = {
          source: data.metadata.source,
          category: data.metadata.category,
          importance: data.metadata.importance,
          timestamp: data.metadata.timestamp
        }
      }

      await client!.memories.add(payload)
      return true
    } catch (error) {
      console.error('Error adding memory:', error)
      return false
    }
  }

  // Strategy 6: Smart Context Retrieval (only when needed)
  static async getSmartContext(
    query: string,
    userId: string,
    importance: 'low' | 'medium' | 'high' = 'medium'
  ) {
    // Only search for context if query suggests it's needed
    const needsContext = this.queryNeedsContext(query)
    if (!needsContext) {
      return []
    }

    const memories = await this.fastSearchMemories({
      query: query.slice(0, 50), // Shorter query for speed
      userId,
      limit: 2 // Fewer results for speed
    })

    if (!memories || !memories.results) return []

    return memories.results
      .filter((memory: any) => memory.score > 0.3) // Only high-relevance results
      .slice(0, 2) // Maximum 2 results
      .map((memory: any) => ({
        content: memory.title || memory.summary || 'Context available',
        relevance: memory.score
      }))
  }

  private static queryNeedsContext(query: string): boolean {
    const contextKeywords = [
      'remember', 'recall', 'previous', 'before', 'earlier', 'last time',
      'you said', 'we discussed', 'my preference', 'as usual', 'like before'
    ]
    
    const lowerQuery = query.toLowerCase()
    return contextKeywords.some(keyword => lowerQuery.includes(keyword))
  }

  // Strategy 7: Optimized Conversation Memory
  static async addOptimizedConversationMemory(
    userMessage: string,
    aiResponse: string,
    conversationId: string,
    userId: string,
    importance: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<boolean> {
    // Only store important conversations to reduce load
    if (importance === 'low' && Math.random() > 0.3) {
      return true // Skip 70% of low importance memories
    }

    const memoryContent = `Q: ${userMessage.slice(0, 200)}\nA: ${aiResponse.slice(0, 300)}`

    return await this.batchAddMemory({
      content: memoryContent,
      userId,
      containerTags: [userId, conversationId, 'chat'],
      metadata: {
        conversationId,
        messageType: 'assistant',
        timestamp: new Date().toISOString(),
        importance,
        source: 'chat',
        category: 'conversation'
      }
    })
  }

  // Health check with caching
  static async isHealthy(): Promise<boolean> {
    const now = Date.now()
    if (now - this.lastHealthCheck < this.HEALTH_CHECK_INTERVAL) {
      return this.serviceHealthy
    }

    if (!client) {
      this.serviceHealthy = false
      this.lastHealthCheck = now
      return false
    }

    try {
      await Promise.race([
        client.search.execute({ q: 'health', limit: 1 }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), 2000)
        )
      ])
      this.serviceHealthy = true
    } catch (error) {
      console.warn('Supermemory health check failed:', error)
      this.serviceHealthy = false
    }

    this.lastHealthCheck = now
    return this.serviceHealthy
  }

  // Get cache statistics
  static getCacheStats() {
    return {
      cacheSize: searchCache.size,
      pendingRequests: pendingRequests.size,
      batchQueueSize: batchQueue.length,
      cacheHitRate: searchCache.size > 0 ? 'Available' : 'No data'
    }
  }

  // Clear cache (for testing)
  static clearCache() {
    searchCache.clear()
    pendingRequests.clear()
    batchQueue.length = 0
    if (batchTimeout) {
      clearTimeout(batchTimeout)
      batchTimeout = null
    }
  }

  // Get client status
  static getClientStatus(): { initialized: boolean, hasApiKey: boolean } {
    return {
      initialized: !!client,
      hasApiKey: !!process.env.NEXT_PUBLIC_SUPERMEMORY_API_KEY
    }
  }
}

export default OptimizedSupermemoryManager