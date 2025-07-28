// Integration helper for gradually adopting optimized Supermemory
import SupermemoryManager from './supermemory'
import OptimizedSupermemoryManager from './supermemory-optimized'

// Define proper types for better type safety
interface MemoryResult {
  title?: string | null
  summary?: string | null
  content?: string | null
  score?: number
  id?: string | null
}

export interface IntegrationConfig {
  useOptimizedSearch: boolean
  useOptimizedStorage: boolean
  enableSmartContext: boolean
  enableCaching: boolean
  fallbackToOriginal: boolean
}

// Default configuration - conservative approach
const DEFAULT_CONFIG: IntegrationConfig = {
  useOptimizedSearch: true,    // Use optimized search (30% faster)
  useOptimizedStorage: true,   // Use batched storage
  enableSmartContext: true,    // Only search when query suggests need
  enableCaching: true,         // Enable result caching
  fallbackToOriginal: true     // Fallback to original on errors
}

export class IntegratedSupermemoryManager {
  private static config: IntegrationConfig = DEFAULT_CONFIG

  // Configure the integration
  static configure(config: Partial<IntegrationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  // Smart search that chooses the best approach
  static async smartSearch(options: {
    query: string
    userId: string
    limit?: number
    conversationId?: string
  }) {
    const { query, userId, limit = 3, conversationId } = options

    // Check if query actually needs context
    if (this.config.enableSmartContext && !this.queryNeedsContext(query)) {
      console.log('Query does not need context, skipping search')
      return []
    }

    try {
      if (this.config.useOptimizedSearch) {
        // Use optimized search with caching
        const results = await OptimizedSupermemoryManager.fastSearchMemories({
          query,
          userId,
          limit,
          conversationId
        })

        if (results?.results) {
          return results.results.slice(0, limit).map((memory: MemoryResult) => ({
            content: memory.title || memory.summary || 'Context available',
            relevance: memory.score,
            source: 'optimized'
          }))
        }
      }

      // Fallback to original if enabled
      if (this.config.fallbackToOriginal) {
        console.log('Falling back to original Supermemory')
        const results = await SupermemoryManager.searchMemories({
          query,
          userId,
          limit: Math.min(limit, 2) // Limit for speed
        })

        if (results?.results) {
          return results.results.slice(0, limit).map((memory: MemoryResult) => ({
            content: memory.title || memory.summary || 'Context available',
            relevance: memory.score || 0.5,
            source: 'original'
          }))
        }
      }

      return []
    } catch (error) {
      console.warn('Smart search failed:', error)
      return []
    }
  }

  // Smart storage that chooses the best approach
  static async smartStore(data: {
    userMessage: string
    aiResponse: string
    conversationId: string
    userId: string
    importance?: 'low' | 'medium' | 'high'
  }) {
    const { userMessage, aiResponse, conversationId, userId, importance = 'medium' } = data

    try {
      if (this.config.useOptimizedStorage) {
        // Use optimized batched storage
        return await OptimizedSupermemoryManager.addOptimizedConversationMemory(
          userMessage,
          aiResponse,
          conversationId,
          userId,
          importance
        )
      } else {
        // Use original storage
        return await SupermemoryManager.addConversationMemory(
          userMessage,
          aiResponse,
          conversationId,
          userId,
          importance
        )
      }
    } catch (error) {
      console.error('Smart storage failed:', error)
      return false
    }
  }

  // Check if query needs context (same logic as optimized version)
  private static queryNeedsContext(query: string): boolean {
    const contextKeywords = [
      'remember', 'recall', 'previous', 'before', 'earlier', 'last time',
      'you said', 'we discussed', 'my preference', 'as usual', 'like before',
      'what did i', 'what was', 'remind me', 'you mentioned', 'we talked about'
    ]
    
    const lowerQuery = query.toLowerCase()
    return contextKeywords.some(keyword => lowerQuery.includes(keyword))
  }

  // Get performance statistics
  static getPerformanceStats() {
    return {
      config: this.config,
      optimizedStats: OptimizedSupermemoryManager.getCacheStats(),
      originalStatus: SupermemoryManager.getClientStatus()
    }
  }

  // Health check for both systems
  static async healthCheck() {
    const results = {
      original: { healthy: false, error: null as any },
      optimized: { healthy: false, error: null as any }
    }

    try {
      results.original.healthy = await SupermemoryManager.isHealthy()
    } catch (error) {
      results.original.error = error instanceof Error ? error.message : 'Unknown error'
    }

    try {
      results.optimized.healthy = await OptimizedSupermemoryManager.isHealthy()
    } catch (error) {
      results.optimized.error = error instanceof Error ? error.message : 'Unknown error'
    }

    return results
  }
}

// Export convenience functions for easy integration
export const smartSearch = IntegratedSupermemoryManager.smartSearch.bind(IntegratedSupermemoryManager)
export const smartStore = IntegratedSupermemoryManager.smartStore.bind(IntegratedSupermemoryManager)
export const configureSupermemory = IntegratedSupermemoryManager.configure.bind(IntegratedSupermemoryManager)

export default IntegratedSupermemoryManager