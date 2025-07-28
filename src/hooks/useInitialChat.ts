'use client'

import useSWR from 'swr'
import { useChatStore } from '@/lib/stores/chatStore'
import { useEffect, useRef } from 'react'

interface InitialChatData {
  thread: {
    id: string
    title: string
    lastMessageAt: string
  } | null
  messages: any[]
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response.json()
}

export function useInitialChat(threadId: string | null) {
  const hydrateFromServer = useChatStore((state) => state.hydrateFromServer)
  const hasMessages = useChatStore((state) => state.hasMessages)
  const setInitialLoadComplete = useChatStore((state) => state.setInitialLoadComplete)
  const isInitialLoadComplete = useChatStore((state) => state.initialLoadComplete || {})
  
  // Track the last threadId we processed to avoid duplicate hydration
  const lastProcessedThreadId = useRef<string | null>(null)
  
  const { data, error, isLoading, mutate } = useSWR<InitialChatData>(
    threadId ? `/api/chat/${threadId}/initial` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000, // 30 seconds
      errorRetryCount: 2,
      errorRetryInterval: 1000,
      // Don't fetch if we already have messages for this thread
      shouldRetryOnError: (error) => {
        console.warn('🔄 Initial chat fetch error, retrying:', error.message)
        return true
      }
    }
  )

  useEffect(() => {
    if (!threadId) {
      lastProcessedThreadId.current = null
      return
    }

    // Skip if we already processed this thread
    if (lastProcessedThreadId.current === threadId) {
      return
    }

    // Skip if we already have messages and initial load is complete
    const loadCompleteMap = isInitialLoadComplete || {}
    const isThreadLoaded = loadCompleteMap[threadId]
    if (hasMessages(threadId) && isThreadLoaded) {
      console.log('⏭️ Skipping hydration - thread already loaded:', threadId)
      lastProcessedThreadId.current = threadId
      return
    }

    if (data && threadId) {
      console.log('🌊 Hydrating store with initial messages:', {
        threadId,
        messageCount: data.messages?.length || 0,
        hasThread: !!data.thread
      })
      
      // Always hydrate, even if messages array is empty
      // This ensures we mark the thread as loaded
      hydrateFromServer(threadId, data.messages || [])
      setInitialLoadComplete(threadId, true)
      lastProcessedThreadId.current = threadId
    }
  }, [data, threadId, hydrateFromServer, hasMessages, isInitialLoadComplete, setInitialLoadComplete])

  // Force refresh when threadId changes
  useEffect(() => {
    if (threadId && threadId !== lastProcessedThreadId.current) {
      console.log('🔄 Thread changed, refreshing data:', threadId)
      mutate()
    }
  }, [threadId, mutate])

  return {
    thread: data?.thread,
    messages: data?.messages || [],
    isLoading: isLoading && !!threadId, // Only show loading if we have a threadId
    error,
    refresh: mutate
  }
}
