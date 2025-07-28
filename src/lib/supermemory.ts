import Supermemory from 'supermemory'

// Initialize Supermemory client only if API key is available
// Check if we're in the browser or server environment
const getApiKey = () => {
  if (typeof window !== 'undefined') {
    // In browser, use the global env variable
    return process.env.NEXT_PUBLIC_SUPERMEMORY_API_KEY || null
  }
  // On server
  return process.env.NEXT_PUBLIC_SUPERMEMORY_API_KEY || null
}

const apiKey = getApiKey()
const client = apiKey ? new Supermemory({ apiKey }) : null

export interface MemoryData {
  content: string
  userId?: string // For partitioning by user
  containerTags?: string[] // For grouping memories
  metadata?: {
    source?: string
    category?: string
    messageType?: 'user' | 'assistant'
    timestamp?: string
    importance?: 'low' | 'medium' | 'high'
    conversationId?: string
    [key: string]: string | number | boolean | undefined // Allow custom fields
  }
}

export interface SearchOptions {
  query: string
  limit?: number
  userId?: string
  conversationId?: string
}

export class SupermemoryManager {
  private static serviceHealthy = true
  private static lastHealthCheck = 0
  private static readonly HEALTH_CHECK_INTERVAL = 5 * 60 * 1000 // 5 minutes

  // Check if service is healthy (with caching)
  private static async checkHealth(): Promise<boolean> {
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
      await client.search.execute({ q: 'health-check', limit: 1 })
      this.serviceHealthy = true
    } catch (error) {
      // Silently fail health check
      this.serviceHealthy = false
    }

    this.lastHealthCheck = now
    return this.serviceHealthy
  }
  // Add a memory to Supermemory
  static async addMemory(data: MemoryData): Promise<boolean> {
    if (!client) {
      // Client not initialized
      return false
    }

    // Check health before attempting to add memory
    if (!(await this.checkHealth())) {
      // Service unhealthy
      return false
    }

    try {
      interface SupermemoryPayload {
        content: string
        userId?: string
        containerTags?: string[]
        metadata?: Record<string, string | number | boolean>
      }

      const payload: SupermemoryPayload = {
        content: data.content
      }

      // Add userId for partitioning if provided
      if (data.userId) {
        payload.userId = data.userId
      }

      // Add containerTags for grouping if provided
      if (data.containerTags && data.containerTags.length > 0) {
        payload.containerTags = data.containerTags
      }

      // Add metadata if provided
      if (data.metadata) {
        // Filter out undefined values
        const filteredMetadata: Record<string, string | number | boolean> = {}
        for (const [key, value] of Object.entries(data.metadata)) {
          if (value !== undefined) {
            filteredMetadata[key] = value
          }
        }
        payload.metadata = filteredMetadata
      }

      await client.memories.add(payload)
      return true
    } catch (error) {
      // Error adding memory
      this.serviceHealthy = false // Mark as unhealthy on error
      return false
    }
  }

  // Delete a memory by ID
  static async deleteMemory(memoryId: string): Promise<boolean> {
    if (!client) {
      // Client not initialized
      return false;
    }

    try {
      await client.memories.delete(memoryId);
      return true;
    } catch (error) {
      // Error deleting memory
      return false;
    }
  }

  // Search memories with fallback strategies
  static async searchMemories(options: SearchOptions) {
    if (!client) {
      // Client not initialized
      return null
    }

    try {
      // Strategy 1: Try basic search first
      const basicParams = {
        q: options.query,
        limit: options.limit || 5
      }

      const results = await client.search.execute(basicParams)
      return results
    } catch (error) {
      // Error searching memories

      // Strategy 2: Try with different query format if basic search fails
      try {
        const fallbackResults = await client.search.execute({
          q: options.query.slice(0, 100), // Truncate query in case it's too long
          limit: Math.min(options.limit || 5, 3) // Reduce limit
        })
        return fallbackResults
      } catch (fallbackError) {
        // Fallback search failed
        return null
      }
    }
  }

  // Add important conversation moments
  static async addConversationMemory(
    userMessage: string,
    aiResponse: string,
    conversationId: string,
    userId: string,
    importance: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<boolean> {
    const memoryContent = `User: ${userMessage}\nAI: ${aiResponse}`

    return await this.addMemory({
      content: memoryContent,
      userId, // Use userId for partitioning
      containerTags: [userId, conversationId, 'conversation'], // Use containerTags for grouping
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

  // Add user preferences or important decisions
  static async addUserPreference(
    preference: string,
    userId: string,
    category?: string
  ): Promise<boolean> {
    const containerTags = ['preference', 'user-setting', userId, category].filter(Boolean) as string[]

    return await this.addMemory({
      content: `User preference: ${preference}`,
      userId, // Use userId for partitioning
      containerTags, // Use containerTags for grouping
      metadata: {
        importance: 'high',
        timestamp: new Date().toISOString(),
        source: 'user-input',
        category: 'preference'
      }
    })
  }

  // Get relevant context for new conversations
  static async getRelevantContext(
    query: string,
    userId: string,
    limit: number = 3
  ) {
    const memories = await this.searchMemories({
      query,
      userId,
      limit
    })

    if (!memories || !memories.results) return []

    interface MemoryChunk {
      content?: string
      isRelevant?: boolean
    }

    interface MemoryResult {
      summary?: string | null
      title?: string | null
      chunks?: MemoryChunk[]
      score?: number
      metadata?: Record<string, unknown> | null
    }

    return memories.results.map((memory: MemoryResult) => {
      // Extract content from chunks if available, otherwise use summary or title
      let content = memory.summary || memory.title || 'No content available'

      if (memory.chunks && memory.chunks.length > 0) {
        // Get the most relevant chunk
        const relevantChunk = memory.chunks.find((chunk: MemoryChunk) => chunk.isRelevant) || memory.chunks[0]
        content = relevantChunk.content || content
      }

      return {
        content,
        relevance: memory.score,
        metadata: memory.metadata,
        title: memory.title,
        summary: memory.summary
      }
    })
  }

  // Add project or coding context
  static async addProjectContext(
    projectInfo: string,
    userId: string,
    projectName?: string
  ): Promise<boolean> {
    const containerTags = ['project', 'coding', userId, projectName].filter(Boolean) as string[]

    return await this.addMemory({
      content: `Project context: ${projectInfo}`,
      userId, // Use userId for partitioning
      containerTags, // Use containerTags for grouping
      metadata: {
        importance: 'high',
        timestamp: new Date().toISOString(),
        source: 'code',
        category: 'project'
      }
    })
  }

  // Health check method to test connection
  static async isHealthy(): Promise<boolean> {
    if (!client) {
      return false
    }

    try {
      // Try a simple search to test connectivity
      await client.search.execute({
        q: 'test',
        limit: 1
      })
      return true
    } catch (error) {
      // Health check failed
      return false
    }
  }

  // Get client status
  static getClientStatus(): { initialized: boolean, hasApiKey: boolean } {
    return {
      initialized: !!client,
      hasApiKey: !!apiKey
    }
  }
}

export default SupermemoryManager