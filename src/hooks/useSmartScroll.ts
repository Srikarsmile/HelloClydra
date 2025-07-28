import { useEffect, useRef, useState, useCallback } from 'react'

export function useSmartScroll(messagesLength: number) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [showNewMessagesChip, setShowNewMessagesChip] = useState(false)
  const lastMessageCountRef = useRef(messagesLength)
  const isNearBottomRef = useRef(true)

  // Check if scrolled near bottom (within 90% threshold)
  const checkIfNearBottom = useCallback(() => {
    if (!containerRef.current) return true
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight
    return scrollPercentage >= 0.9
  }, [])

  // Scroll to bottom smoothly
  const scrollToBottom = useCallback(() => {
    if (!containerRef.current) return
    
    containerRef.current.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: 'smooth'
    })
    setShowNewMessagesChip(false)
  }, [])

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
  }, [checkIfNearBottom])

  // Watch for new messages
  useEffect(() => {
    if (messagesLength > lastMessageCountRef.current) {
      // New message arrived
      if (isNearBottomRef.current) {
        // Auto-scroll if near bottom
        setTimeout(() => scrollToBottom(), 100)
      } else {
        // Show chip if user has scrolled up
        setShowNewMessagesChip(true)
      }
    }
    lastMessageCountRef.current = messagesLength
  }, [messagesLength, scrollToBottom])

  return {
    containerRef,
    showNewMessagesChip,
    scrollToBottom
  }
}
