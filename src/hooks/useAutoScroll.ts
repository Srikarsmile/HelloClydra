'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

// Debounce function to prevent rapid updates
function debounce<T extends (...args: unknown[]) => void>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null
  return ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }) as T
}

export function useAutoScroll(messageCount: number) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [showJumpToLatest, setShowJumpToLatest] = useState(false)
  const [isNearBottom, setIsNearBottom] = useState(true)
  const lastMessageCountRef = useRef(messageCount)
  const isScrollingRef = useRef(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Check if user is near bottom of scroll
  const checkScrollPosition = useCallback(() => {
    if (!containerRef.current || isScrollingRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    
    // Add small buffer to account for fractional pixels
    const distanceFromBottom = Math.ceil(scrollHeight - scrollTop - clientHeight)
    const nearBottom = distanceFromBottom <= 50 // Reduced threshold for better UX

    setIsNearBottom(nearBottom)
    setShowJumpToLatest(!nearBottom && messageCount > 0)
  }, [messageCount])

  // Scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    if (!containerRef.current) return

    isScrollingRef.current = true
    
    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    const container = containerRef.current
    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    })

    // Reset scrolling flag after animation completes
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false
      // Force a scroll position check after scrolling completes
      requestAnimationFrame(() => {
        if (containerRef.current) {
          checkScrollPosition()
        }
      })
    }, smooth ? 500 : 50)
  }, [checkScrollPosition])

  // Auto-scroll when new messages arrive (only if user is near bottom)
  useEffect(() => {
    const hasNewMessages = messageCount > lastMessageCountRef.current
    lastMessageCountRef.current = messageCount

    if (hasNewMessages && isNearBottom && messageCount > 0) {
      // Use requestAnimationFrame to ensure DOM is fully updated
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom(false) // Use instant scroll for new messages
        })
      })
    }
  }, [messageCount, isNearBottom, scrollToBottom])

  // Create debounced scroll check
  const debouncedCheckScrollPosition = useCallback(
    debounce(checkScrollPosition, 16), // ~60fps debouncing
    [checkScrollPosition]
  )

  // Set up scroll listener
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('scroll', debouncedCheckScrollPosition, { passive: true })
    
    // Initial check
    checkScrollPosition()

    return () => {
      container.removeEventListener('scroll', debouncedCheckScrollPosition)
      // Clean up any pending timeouts
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [debouncedCheckScrollPosition, checkScrollPosition])

  return {
    containerRef,
    showJumpToLatest,
    scrollToBottom,
    isNearBottom
  }
}