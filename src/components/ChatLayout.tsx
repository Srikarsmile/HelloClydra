'use client'

import { useState, useEffect, ReactNode } from 'react'
import { useUser } from '@clerk/nextjs'
import { Sidebar } from './Sidebar'
import { ThemeToggle } from './ThemeToggle'
import { useThreadMessages } from '@/lib/stores/chatStore'

interface ChatLayoutProps {
  children: ReactNode
  currentConversationId?: string
  onConversationSelect: (conversationId: string) => void
  onNewChat: () => void
  onConversationStart: (conversationId: string) => void
  refreshTrigger?: number
}

export function ChatLayout({
  children,
  currentConversationId,
  onConversationSelect,
  onNewChat,
  onConversationStart,
  refreshTrigger
}: ChatLayoutProps) {
  
  // Mobile-first approach - detect mobile immediately and keep sidebar closed
  const [isMobile, setIsMobile] = useState(() => {
    // Server-side rendering safety check - default to mobile for better UX
    if (typeof window === 'undefined') return true
    // Immediate mobile detection to prevent flashing
    return window.innerWidth <= 768
  })
  
  // Sidebar should ALWAYS start closed - especially on mobile
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isManuallyCollapsed, setIsManuallyCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  // Get user state for auth-based sidebar management
  const { user, isLoaded } = useUser()
  
  // Get messages for insights
  const messages = useThreadMessages(currentConversationId || null)

  // Centralized mobile detection and sidebar management
  useEffect(() => {
    setMounted(true)
    
    const handleResize = () => {
      const mobile = window.innerWidth <= 768
      const wasMobile = isMobile
      setIsMobile(mobile)
      
      // Force close sidebar on mobile immediately
      if (mobile) {
        setSidebarOpen(false)
        document.body.classList.remove('sidebar-open')
        // Extra safety - force remove any potential stuck classes
        document.body.style.overflow = ''
        console.log('Mobile detected - sidebar force closed', { width: window.innerWidth })
      }
      
      // Clean up when switching from mobile to desktop
      if (wasMobile && !mobile) {
        document.body.classList.remove('sidebar-open')
        document.body.style.overflow = ''
      }
    }
    
    // Immediate initial check to ensure mobile sidebar is closed
    handleResize()
    
    // Additional safety check after a short delay
    const safetyTimeout = setTimeout(() => {
      if (window.innerWidth <= 768) {
        setSidebarOpen(false)
        document.body.classList.remove('sidebar-open')
        document.body.style.overflow = ''
      }
    }, 100)
    
    // Debounced resize listener
    let resizeTimeout: NodeJS.Timeout
    const debouncedResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(handleResize, 50) // Faster response
    }
    
    window.addEventListener('resize', debouncedResize)
    
    return () => {
      window.removeEventListener('resize', debouncedResize)
      clearTimeout(resizeTimeout)
      clearTimeout(safetyTimeout)
      document.body.classList.remove('sidebar-open')
      document.body.style.overflow = ''
    }
  }, [isMobile])

  // Load saved collapse state from localStorage (desktop only)
  useEffect(() => {
    if (!isMobile) {
      const savedCollapsedState = localStorage.getItem('sidebar-collapsed')
      if (savedCollapsedState !== null) {
        setIsManuallyCollapsed(JSON.parse(savedCollapsedState))
      }
    }
  }, [isMobile])

  // Save collapse state to localStorage (desktop only)
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem('sidebar-collapsed', JSON.stringify(isManuallyCollapsed))
    }
  }, [isManuallyCollapsed, isMobile])

  // Auto-close sidebar on conversation changes (mobile only) + safety check
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false)
      document.body.classList.remove('sidebar-open')
      document.body.style.overflow = ''
    }
  }, [currentConversationId, isMobile])

  // Additional safety effect to prevent sidebar from being stuck open on mobile
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      // Force close after 30 seconds as ultimate safety (increased from 10s)
      const emergencyClose = setTimeout(() => {
        setSidebarOpen(false)
        document.body.classList.remove('sidebar-open')
        document.body.style.overflow = ''
        console.log('Emergency mobile sidebar close triggered')
      }, 30000)
      
      return () => clearTimeout(emergencyClose)
    }
  }, [isMobile, sidebarOpen])

  // Toggle sidebar collapse (desktop only)
  const toggleSidebarCollapse = () => {
    if (!isMobile) {
      setIsManuallyCollapsed(!isManuallyCollapsed)
    }
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key closes mobile sidebar
      if (e.key === 'Escape' && isMobile && sidebarOpen) {
        e.preventDefault()
        setSidebarOpen(false)
        return
      }
      
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onNewChat()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'b' && !isMobile) {
        e.preventDefault()
        toggleSidebarCollapse()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onNewChat, isMobile, sidebarOpen, toggleSidebarCollapse])

  // Handle conversation selection with immediate sidebar close
  const handleConversationSelect = (conversationId: string) => {
    onConversationSelect(conversationId)
    // Immediate close on mobile for better UX
    if (isMobile) {
      setSidebarOpen(false)
      document.body.classList.remove('sidebar-open')
      document.body.style.overflow = ''
    }
  }

  const handleNewChat = () => {
    onNewChat()
    // Immediate close on mobile for better UX
    if (isMobile) {
      setSidebarOpen(false)
      document.body.classList.remove('sidebar-open')
      document.body.style.overflow = ''
    }
  }

  // Manage body scroll lock for mobile sidebar with enhanced safety
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      document.body.classList.add('sidebar-open')
      document.body.style.overflow = 'hidden'
      
      // Reduced safety timeout for better UX  
      const safetyTimeout = setTimeout(() => {
        setSidebarOpen(false)
        document.body.classList.remove('sidebar-open')
        document.body.style.overflow = ''
        console.log('Mobile sidebar safety timeout triggered')
      }, 25000) // 25 seconds safety timeout (increased from 8s)
      
      return () => {
        clearTimeout(safetyTimeout)
        document.body.classList.remove('sidebar-open')
        document.body.style.overflow = ''
      }
    } else {
      document.body.classList.remove('sidebar-open')
      document.body.style.overflow = ''
    }
  }, [sidebarOpen, isMobile])

  // Outside click detection for mobile sidebar
  useEffect(() => {
    if (!isMobile || !sidebarOpen) return

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Element
      const sidebar = document.querySelector('.sidebar')
      const menuButton = document.querySelector('[aria-label="Open sidebar"]')
      
      // Close sidebar if clicking outside of it and not on the menu button
      if (sidebar && !sidebar.contains(target) && !menuButton?.contains(target)) {
        setSidebarOpen(false)
        document.body.classList.remove('sidebar-open')
      }
    }

    // Small delay to prevent immediate closure when opening
    const timer = setTimeout(() => {
      document.addEventListener('click', handleOutsideClick, true)
    }, 150)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleOutsideClick, true)
    }
  }, [isMobile, sidebarOpen])

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return (
      <div className="chat-layout h-screen flex bg-[var(--bg-canvas)] overflow-hidden">
        {/* Mobile-first loading: No sidebar, full-screen content */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-x-hidden w-full">
          <header className="flex-shrink-0 bg-[var(--bg-card)] border-b border-[var(--outline)] px-4 flex items-center justify-between safe-area-inset-top">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <h1 className="font-bold text-lg text-[var(--text-primary)]">Clydra AI</h1>
            </div>
          </header>
          <main className="flex-1 min-h-0 relative overflow-hidden">
            <div className="flex items-center justify-center h-full">
              <div className="text-[var(--text-subtle)]">Loading...</div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className={`chat-layout h-screen flex bg-[var(--bg-canvas)] overflow-hidden ${isMobile ? 'mobile-layout' : ''}`}>
      <style jsx>{`
        .chat-layout {
          overflow-x: hidden !important;
        }
        .mobile-layout {
          width: 100vw !important;
          height: 100vh !important;
          height: 100dvh !important;
        }
      `}</style>
      {/* Mobile Sidebar Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[98] touch-manipulation"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setSidebarOpen(false)
            document.body.classList.remove('sidebar-open')
          }}
          onTouchEnd={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setSidebarOpen(false)
            document.body.classList.remove('sidebar-open')
          }}
          style={{ 
            willChange: 'opacity',
            backfaceVisibility: 'hidden',
            WebkitTapHighlightColor: 'transparent',
            pointerEvents: 'auto',
            cursor: 'pointer'
          }}
        />
      )}

      {/* Left Sidebar - Mobile: always render but position off-screen when closed */}
      <div className={`sidebar ${
        isMobile 
          ? `fixed left-0 top-0 h-full z-[97] w-80 max-w-[85vw] transform transition-transform duration-300 ease-out ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`
          : isManuallyCollapsed 
            ? 'w-16 flex-shrink-0'
            : 'w-[280px] md:w-16 lg:w-[280px] xl:w-[300px] 2xl:w-[320px] flex-shrink-0'
      } border-r border-[var(--outline)] bg-[var(--bg-card)] transition-all duration-300 ease-in-out`}
      style={isMobile ? { 
        willChange: 'transform',
        backfaceVisibility: 'hidden',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
        pointerEvents: sidebarOpen ? 'auto' : 'none'
      } : undefined}>
          <Sidebar
            currentConversationId={currentConversationId}
            onConversationSelect={handleConversationSelect}
            onNewChat={handleNewChat}
            refreshTrigger={refreshTrigger}
            onClose={isMobile ? () => {
              setSidebarOpen(false)
              document.body.classList.remove('sidebar-open')
              document.body.style.overflow = ''
            } : undefined}
            isManuallyCollapsed={!isMobile && isManuallyCollapsed}
            onToggleCollapse={!isMobile ? toggleSidebarCollapse : undefined}
          />
        </div>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 min-h-0 overflow-x-hidden ${isMobile ? 'w-full' : ''}`}>
        {/* Consistent Mobile Header */}
        <header className="flex-shrink-0 bg-[var(--bg-card)] border-b border-[var(--outline)] px-3 sm:px-4 py-2 flex items-center justify-between safe-area-inset-top min-h-[56px]">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Mobile Menu Button - Enhanced with better visibility */}
            {isMobile && (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('Mobile menu button clicked, isMobile:', isMobile, 'current width:', window.innerWidth)
                  // Force open sidebar on mobile
                  setSidebarOpen(true)
                  document.body.classList.add('sidebar-open')
                  document.body.style.overflow = 'hidden'
                }}
                className="p-2 bg-[var(--accent-soft)] hover:bg-[var(--accent-soft)]/80 text-[var(--text-primary)] rounded-lg transition-all duration-200 focus-brand flex-shrink-0 touch-target"
                aria-label="Open sidebar"
              >
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              </button>
            )}
            
            <h1 className="font-bold text-lg text-[var(--text-primary)] truncate">
              {currentConversationId ? 'Chat' : 'Clydra AI'}
            </h1>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Theme Toggle - Always visible */}
            <ThemeToggle />
            
            {/* Mobile-specific controls */}
            {isMobile && (
              <>
                {/* New Chat Button */}
                <button
                  onClick={handleNewChat}
                  className="p-2 hover:bg-[var(--accent-soft)] rounded-lg transition-colors duration-200 focus-brand touch-target"
                  aria-label="New chat"
                  title="New chat"
                >
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                </button>
              </>
            )}
            
            {/* Desktop-specific controls */}
            {!isMobile && (
              <>
                <button
                  onClick={toggleSidebarCollapse}
                  className="p-2 hover:bg-[var(--accent-soft)] rounded-lg transition-colors duration-200 focus-brand text-[var(--text-subtle)] hover:text-[var(--text-primary)]"
                  title={`${isManuallyCollapsed ? 'Expand' : 'Collapse'} Sidebar (⌘B)`}
                >
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    {isManuallyCollapsed ? (
                      <path d="M9 18l6-6-6-6" />
                    ) : (
                      <path d="M15 18l-6-6 6-6" />
                    )}
                  </svg>
                </button>
              </>
            )}
          </div>
        </header>

        {/* Main Chat Area */}
        <main className="flex-1 min-h-0 relative overflow-hidden">
          {children}
        </main>
      </div>

    </div>
  )
}