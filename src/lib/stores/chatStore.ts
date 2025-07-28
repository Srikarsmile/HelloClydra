'use client'

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { Message } from '@/lib/supabase'

// Performance monitoring utilities
const performance = globalThis.performance || {
  now: () => Date.now(),
  mark: () => {},
  measure: () => {}
}

interface PerformanceMetrics {
  operation: string
  duration: number
  timestamp: number
  metadata?: Record<string, unknown>
}

let performanceMetrics: PerformanceMetrics[] = []

const logPerformance = (operation: string, startTime: number, metadata?: Record<string, unknown>) => {
  const duration = performance.now() - startTime
  const metric: PerformanceMetrics = {
    operation,
    duration,
    timestamp: Date.now(),
    metadata
  }
  
  performanceMetrics.push(metric)
  
  // Keep only last 100 metrics to prevent memory leaks
  if (performanceMetrics.length > 100) {
    performanceMetrics = performanceMetrics.slice(-100)
  }
  
  // Log slow operations
  if (duration > 50) {
    console.warn(`🐌 Slow store operation: ${operation} took ${duration.toFixed(2)}ms`, metadata)
  } else if (duration > 10) {
    console.log(`⚠️ Store operation: ${operation} took ${duration.toFixed(2)}ms`)
  }
  
  return metric
}

export const getPerformanceMetrics = () => ({
  metrics: [...performanceMetrics],
  summary: {
    totalOperations: performanceMetrics.length,
    averageDuration: performanceMetrics.length > 0 
      ? performanceMetrics.reduce((sum, m) => sum + m.duration, 0) / performanceMetrics.length 
      : 0,
    slowOperations: performanceMetrics.filter(m => m.duration > 50).length,
    operationCounts: performanceMetrics.reduce((counts, m) => {
      counts[m.operation] = (counts[m.operation] || 0) + 1
      return counts
    }, {} as Record<string, number>)
  }
})

export interface ChatThread {
  id: string
  title: string
  messages: Message[]
  lastMessageAt: string
}

interface ChatStore {
  // Core state
  messagesByThread: Record<string, Message[]>
  threads: ChatThread[]
  currentThreadId: string | null
  isLoading: boolean
  isStreaming: boolean
  initialLoadComplete: Record<string, boolean>
  
  // Actions
  setThreadMessages: (threadId: string, messages: Message[]) => void
  appendMessage: (threadId: string, message: Message) => void
  updateMessage: (threadId: string, messageId: string, updates: Partial<Message>) => void
  removeMessage: (threadId: string, messageId: string) => void
  replaceMessageId: (threadId: string, oldId: string, newId: string) => void
  clearThread: (threadId: string) => void
  migrateThread: (fromThreadId: string, toThreadId: string) => void
  
  // Thread management
  setThreads: (threads: ChatThread[]) => void
  updateThread: (threadId: string, updates: Partial<ChatThread>) => void
  removeThread: (threadId: string) => void
  
  // Current thread
  setCurrentThread: (threadId: string | null) => void
  
  // Loading states
  setLoading: (loading: boolean) => void
  setStreaming: (streaming: boolean) => void
  setInitialLoadComplete: (threadId: string, complete: boolean) => void
  
  // Utilities
  getThreadMessages: (threadId: string) => Message[]
  hasMessages: (threadId: string) => boolean
  
  // Thread loading
  ensureThreadLoaded: (threadId: string) => Promise<void>
  hydrateFromServer: (threadId: string, messages: Message[]) => void
}

export const useChatStore = create<ChatStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    messagesByThread: {},
    threads: [],
    currentThreadId: null,
    isLoading: false,
    isStreaming: false,
    initialLoadComplete: {},

    // Message actions
    setThreadMessages: (threadId: string, messages: Message[]) => {
      const startTime = performance.now()
      
      set((state) => {
        // Race condition guard: if store already has messages and trying to set empty array, ignore
        const existingMessages = state.messagesByThread[threadId] || []
        if (messages.length === 0 && existingMessages.length > 0) {
          console.log('🛡️ Race guard: Ignoring empty message array for thread with existing messages', threadId)
          logPerformance('setThreadMessages_blocked', startTime, { threadId, messageCount: messages.length })
          return state
        }

        console.log('📦 Setting', messages.length, 'messages for thread', threadId, 'existing:', existingMessages.length)
        console.log('📦 Messages being set:', messages.map(m => ({ id: m.id, role: m.role, content: m.content.slice(0, 50) })))
        const result = {
          messagesByThread: {
            ...state.messagesByThread,
            [threadId]: messages.sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
          }
        }
        
        logPerformance('setThreadMessages', startTime, { threadId, messageCount: messages.length })
        return result
      })
    },

    appendMessage: (threadId: string, message: Message) => {
      const startTime = performance.now()
      
      set((state) => {
        const existing = state.messagesByThread[threadId] || []
        console.log('➕ Appending message to thread', threadId, message.role, message.content.slice(0, 50))
        
        const result = {
          messagesByThread: {
            ...state.messagesByThread,
            [threadId]: [...existing, message]
          }
        }
        
        logPerformance('appendMessage', startTime, { threadId, messageRole: message.role })
        return result
      })
    },

    updateMessage: (threadId: string, messageId: string, updates: Partial<Message>) => {
      const startTime = performance.now()
      
      set((state) => {
        const messages = state.messagesByThread[threadId] || []
        const updatedMessages = messages.map(msg => 
          msg.id === messageId ? { ...msg, ...updates } : msg
        )
        
        const result = {
          messagesByThread: {
            ...state.messagesByThread,
            [threadId]: updatedMessages
          }
        }
        
        logPerformance('updateMessage', startTime, { threadId, messageId, updateKeys: Object.keys(updates) })
        return result
      })
    },

    removeMessage: (threadId: string, messageId: string) => {
      const startTime = performance.now()
      
      set((state) => {
        const messages = state.messagesByThread[threadId] || []
        const filteredMessages = messages.filter(msg => msg.id !== messageId)
        
        const result = {
          messagesByThread: {
            ...state.messagesByThread,
            [threadId]: filteredMessages
          }
        }
        
        logPerformance('removeMessage', startTime, { threadId, messageId })
        return result
      })
    },

    replaceMessageId: (threadId: string, oldId: string, newId: string) => {
      const startTime = performance.now()
      
      set((state) => {
        const messages = state.messagesByThread[threadId] || []
        const messageIndex = messages.findIndex(msg => msg.id === oldId)
        
        if (messageIndex === -1) {
          console.warn('🔄 replaceMessageId: Message not found', { threadId, oldId, newId })
          logPerformance('replaceMessageId_notfound', startTime, { threadId, oldId, newId })
          return state
        }
        
        const updatedMessages = [...messages]
        updatedMessages[messageIndex] = { ...updatedMessages[messageIndex], id: newId }
        
        console.log('🔄 Replaced message ID', oldId, '→', newId, 'in thread', threadId)
        
        const result = {
          messagesByThread: {
            ...state.messagesByThread,
            [threadId]: updatedMessages
          }
        }
        
        logPerformance('replaceMessageId', startTime, { threadId, oldId, newId })
        return result
      })
    },

    clearThread: (threadId: string) => {
      const startTime = performance.now()
      
      set((state) => {
        const newMessagesByThread = { ...state.messagesByThread }
        delete newMessagesByThread[threadId]
        
        const result = {
          messagesByThread: newMessagesByThread
        }
        
        logPerformance('clearThread', startTime, { threadId })
        return result
      })
    },

    migrateThread: (fromThreadId: string, toThreadId: string) => {
      const startTime = performance.now()
      
      set((state) => {
        const messages = state.messagesByThread[fromThreadId] || []
        if (messages.length === 0) {
          logPerformance('migrateThread_empty', startTime, { fromThreadId, toThreadId })
          return state
        }
        
        console.log('🔄 Migrating', messages.length, 'messages from', fromThreadId, 'to', toThreadId)
        
        // Update conversation_id in all messages and move them to the new thread
        const updatedMessages = messages.map(msg => ({
          ...msg,
          conversation_id: toThreadId
        }))
        
        const newMessagesByThread = { ...state.messagesByThread }
        delete newMessagesByThread[fromThreadId] // Remove temporary thread
        newMessagesByThread[toThreadId] = updatedMessages // Add to real thread
        
        const result = {
          messagesByThread: newMessagesByThread
        }
        
        logPerformance('migrateThread', startTime, { fromThreadId, toThreadId, messageCount: messages.length })
        return result
      })
    },

    // Thread management
    setThreads: (threads: ChatThread[]) => {
      const startTime = performance.now()
      
      set({ threads })
      
      // Also populate messages for each thread
      threads.forEach(thread => {
        get().setThreadMessages(thread.id, thread.messages || [])
      })
      
      logPerformance('setThreads', startTime, { threadCount: threads.length })
    },

    updateThread: (threadId: string, updates: Partial<ChatThread>) => {
      const startTime = performance.now()
      
      set((state) => {
        const result = {
          threads: state.threads.map(thread =>
            thread.id === threadId ? { ...thread, ...updates } : thread
          )
        }
        
        logPerformance('updateThread', startTime, { threadId, updateKeys: Object.keys(updates) })
        return result
      })
    },

    removeThread: (threadId: string) => {
      const startTime = performance.now()
      
      set((state) => {
        const newMessagesByThread = { ...state.messagesByThread }
        delete newMessagesByThread[threadId]
        
        const result = {
          threads: state.threads.filter(thread => thread.id !== threadId),
          messagesByThread: newMessagesByThread,
          currentThreadId: state.currentThreadId === threadId ? null : state.currentThreadId
        }
        
        logPerformance('removeThread', startTime, { threadId })
        return result
      })
    },

    // Current thread
    setCurrentThread: (threadId: string | null) => {
      set({ currentThreadId: threadId })
    },

    // Loading states
    setLoading: (loading: boolean) => {
      set({ isLoading: loading })
    },

    setStreaming: (streaming: boolean) => {
      set({ isStreaming: streaming })
    },

    setInitialLoadComplete: (threadId: string, complete: boolean) => {
      set((state) => ({
        initialLoadComplete: {
          ...state.initialLoadComplete,
          [threadId]: complete
        }
      }))
    },

    // Utilities
    getThreadMessages: (threadId: string) => {
      return get().messagesByThread[threadId] || []
    },

    hasMessages: (threadId: string) => {
      const messages = get().messagesByThread[threadId] || []
      return messages.length > 0
    },
    
    // Thread loading
    ensureThreadLoaded: async (threadId: string) => {
      const state = get()
      
      // If already loaded, return early
      if (state.initialLoadComplete[threadId] || state.messagesByThread[threadId]?.length > 0) {
        console.log('📦 Thread already loaded:', threadId)
        return
      }
      
      console.log('🔄 Loading thread:', threadId)
      set({ isLoading: true })
      
      try {
        const response = await fetch(`/api/chat/${threadId}/initial`)
        if (response.ok) {
          const data = await response.json()
          
          // Update messages only if we got data
          if (data.messages && data.messages.length > 0) {
            get().setThreadMessages(threadId, data.messages)
          }
          
          // Mark as loaded
          set(state => ({
            initialLoadComplete: {
              ...state.initialLoadComplete,
              [threadId]: true
            }
          }))
        }
      } catch (error) {
        console.error('Failed to load thread:', error)
      } finally {
        set({ isLoading: false })
      }
    },
    
    hydrateFromServer: (threadId: string, messages: Message[]) => {
      const startTime = performance.now()
      
      set((state) => {
        // Check if we already have optimistic messages that shouldn't be overwritten
        const existingMessages = state.messagesByThread[threadId] || []
        const hasOptimisticMessages = existingMessages.some(msg => msg.id.startsWith('temp-') || msg.id.startsWith('assistant-'))
        
        // If we have optimistic messages and server returns empty, don't overwrite
        if (hasOptimisticMessages && messages.length === 0) {
          console.log('🛡️ Preserving optimistic messages - server returned empty array')
          logPerformance('hydrateFromServer_preserved', startTime, { threadId, messageCount: messages.length })
          return {
            ...state,
            initialLoadComplete: {
              ...state.initialLoadComplete,
              [threadId]: true
            }
          }
        }
        
        // If we already have the same number of non-optimistic messages, skip
        const nonOptimisticExisting = existingMessages.filter(msg => !msg.id.startsWith('temp-') && !msg.id.startsWith('assistant-'))
        if (nonOptimisticExisting.length > 0 && nonOptimisticExisting.length === messages.length) {
          console.log('🛡️ Skipping hydration - same number of messages already loaded')
          logPerformance('hydrateFromServer_skipped', startTime, { threadId, messageCount: messages.length })
          return {
            ...state,
            initialLoadComplete: {
              ...state.initialLoadComplete,
              [threadId]: true
            }
          }
        }
        
        console.log('💧 Hydrating thread with', messages.length, 'messages (existing:', existingMessages.length, ')')
        
        const sortedMessages = messages.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        
        const result = {
          messagesByThread: {
            ...state.messagesByThread,
            [threadId]: sortedMessages
          },
          initialLoadComplete: {
            ...state.initialLoadComplete,
            [threadId]: true
          }
        }
        
        logPerformance('hydrateFromServer', startTime, { threadId, messageCount: messages.length })
        return result
      })
    }
  }))
)

// Selectors for optimized re-renders with stable functions

// Cache for empty arrays to maintain referential equality
const EMPTY_MESSAGES: Message[] = []

// Stable selector function factory
const createThreadMessagesSelector = (threadId: string | null) => {
  return (state: ReturnType<typeof useChatStore.getState>) => {
    if (!threadId) return EMPTY_MESSAGES
    return state.messagesByThread[threadId] || EMPTY_MESSAGES
  }
}

// Cache for selector functions to prevent recreation
const selectorCache = new Map<string, (state: ReturnType<typeof useChatStore.getState>) => Message[]>()

export const useThreadMessages = (threadId: string | null) => {
  const cacheKey = threadId || 'null'
  
  // Get or create stable selector function
  let selector = selectorCache.get(cacheKey)
  if (!selector) {
    selector = createThreadMessagesSelector(threadId)
    selectorCache.set(cacheKey, selector)
  }
  
  return useChatStore(selector)
}

export const useThreads = () => 
  useChatStore(state => state.threads)

export const useCurrentThread = () => 
  useChatStore(state => state.currentThreadId)

// Stable loading state selectors - using separate selectors to avoid object creation
export const useIsLoading = () => useChatStore(state => state.isLoading)
export const useIsStreaming = () => useChatStore(state => state.isStreaming)

// Individual action hooks to avoid object creation in selectors
export const useSetCurrentThread = () => useChatStore(state => state.setCurrentThread)
export const useSetThreadMessages = () => useChatStore(state => state.setThreadMessages)
export const useAppendMessage = () => useChatStore(state => state.appendMessage)
export const useUpdateMessage = () => useChatStore(state => state.updateMessage)
export const useRemoveMessage = () => useChatStore(state => state.removeMessage)
export const useReplaceMessageId = () => useChatStore(state => state.replaceMessageId)
export const useMigrateThread = () => useChatStore(state => state.migrateThread)
export const useSetLoading = () => useChatStore(state => state.setLoading)
export const useSetStreaming = () => useChatStore(state => state.setStreaming)
export const useSetInitialLoadComplete = () => useChatStore(state => state.setInitialLoadComplete)
export const useIsInitialLoadComplete = () => useChatStore(state => state.initialLoadComplete)

