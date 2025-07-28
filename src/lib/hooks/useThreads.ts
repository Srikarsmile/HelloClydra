'use client'

import { useEffect, useCallback } from 'react'
import { useChatStore } from '@/lib/stores/chatStore'

export function useThreads() {
  const { 
    threads, 
    setThreads, 
    setThreadMessages,
    isLoading,
    setLoading 
  } = useChatStore()

  const fetchThreads = useCallback(async () => {
    try {
      setLoading(true)
      console.log('🔄 Fetching conversation threads...')
      
      const response = await fetch('/api/conversations')
      if (!response.ok) {
        throw new Error(`Failed to fetch threads: ${response.status}`)
      }
      
      const data = await response.json()
      const conversations = data.conversations || []
      
      console.log('📦 Received', conversations.length, 'conversation threads')
      
      // Transform conversations to ChatThread format and populate store
      const threadsData = conversations.map((conv: any) => ({
        id: conv.id,
        title: conv.title || 'New Conversation',
        messages: conv.messages || [],
        lastMessageAt: conv.updated_at || conv.created_at
      }))
      
      console.log('📋 Processed thread data:', threadsData.map((t: any) => ({ 
        id: t.id, 
        title: t.title, 
        messageCount: t.messages.length 
      })))
      
      // Set threads in store - this will also populate messages for each thread
      setThreads(threadsData)
      
      // Ensure each thread's messages are populated in the store immediately
      threadsData.forEach((thread: any) => {
        setThreadMessages(thread.id, thread.messages)
      })
      
      console.log('✅ Threads and messages populated in store')
      
    } catch (error) {
      console.error('❌ Error fetching threads:', error)
    } finally {
      setLoading(false)
    }
  }, [setThreads, setThreadMessages, setLoading])

  // Auto-fetch on mount
  useEffect(() => {
    fetchThreads()
  }, [fetchThreads])

  const refetchThreads = useCallback(() => {
    return fetchThreads()
  }, [fetchThreads])

  return {
    threads,
    isLoading,
    refetchThreads,
    fetchThreads
  }
}