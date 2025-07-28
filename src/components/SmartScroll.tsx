'use client'

import { useEffect, useRef, useState } from 'react'
import { useThreadMessages } from '@/lib/stores/chatStore'

interface SmartScrollProps {
  conversationId: string | null
  containerRef: React.RefObject<HTMLDivElement>
}

export function SmartScroll({ conversationId, containerRef }: SmartScrollProps) {
  const [showNewMessagesChip, setShowNewMessagesChip] = useState(false)
  const messages = useThreadMessages(conversationId)
  const lastMessageCountRef = useRef(messages.length)
  const isNearBottomRef = useRef(true)

  // Check if scrolled near bottom (within 90% threshold)
  const checkIfNearBottom = () => {
    if (!containerRef.current) return true
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight
    return scrollPercentage >= 0.9
  }

  // Scroll to bottom smoothly
  const scrollToBottom = () => {
    if (!containerRef.current) return
    
    containerRef.current.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: 'smooth'
    })
    setShowNewMessagesChip(false)
  }

  // Monitor scroll position
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      isNearBottomRef.current = checkIfNearBottom()
      if (isNearBottomRef.current) {
        setShowNewMessagesChip(false)
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [containerRef])

  // Watch for new messages
  useEffect(() => {
    if (messages.length > lastMessageCountRef.current) {
      // New message arrived
      if (isNearBottomRef.current) {
        // Auto-scroll if near bottom
        setTimeout(() => scrollToBottom(), 100)
      } else {
        // Show chip if user has scrolled up
        setShowNewMessagesChip(true)
      }
    }
    lastMessageCountRef.current = messages.length
  }, [messages.length])

  if (!showNewMessagesChip) return null

  return (
    <button
      onClick={scrollToBottom}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-[var(--accent)] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 animate-bounce"
    >
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M7 13l5 5 5-5" />
        <path d="M12 3v15" />
      </svg>
      <span className="text-sm font-medium">New messages</span>
    </button>
  )
}
