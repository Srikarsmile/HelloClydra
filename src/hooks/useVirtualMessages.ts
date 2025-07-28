'use client'

import { useMemo } from 'react'
import { Message } from '@/lib/supabase'

interface VirtualizedMessage extends Message {
  height?: number
  index: number
}

export function useVirtualMessages(messages: Message[], threshold = 300) {
  const shouldVirtualize = messages.length > threshold

  const virtualizedMessages = useMemo((): VirtualizedMessage[] => {
    if (!shouldVirtualize) {
      return messages.map((message, index) => ({
        ...message,
        index
      }))
    }

    // For virtualization, we'd typically use react-window or similar
    // For now, we'll just return the messages with index
    return messages.map((message, index) => ({
      ...message,
      index,
      height: estimateMessageHeight(message)
    }))
  }, [messages, shouldVirtualize])

  return {
    messages: virtualizedMessages,
    shouldVirtualize,
    totalHeight: shouldVirtualize 
      ? virtualizedMessages.reduce((sum, msg) => sum + (msg.height || 100), 0)
      : undefined
  }
}

function estimateMessageHeight(message: Message): number {
  // Rough estimation based on content length
  const baseHeight = 80 // Base height for message bubble + padding
  const contentHeight = Math.ceil(message.content.length / 80) * 20 // ~80 chars per line, 20px per line
  const imageHeight = message.image_url ? 200 : 0
  
  return baseHeight + contentHeight + imageHeight
}