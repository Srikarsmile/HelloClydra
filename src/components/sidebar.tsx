'use client'

import { useState, useEffect } from 'react'
import { useUser, UserButton } from '@clerk/nextjs'
import { useThreads } from '@/lib/hooks/useThreads'
import { useChatStore } from '@/lib/stores/chatStore'
import { QuickPrompts } from './QuickPrompts'

interface SidebarProps {
  currentConversationId?: string
  onConversationSelect: (conversationId: string) => void
  onNewChat: () => void
  refreshTrigger?: number
  onClose?: () => void
  isManuallyCollapsed?: boolean
  onToggleCollapse?: () => void
}

export function Sidebar({ 
  currentConversationId, 
  onConversationSelect, 
  onNewChat, 
  refreshTrigger,
  onClose,
  isManuallyCollapsed = false,
  onToggleCollapse
}: SidebarProps) {
  const { user, isLoaded } = useUser()
  const { threads, isLoading, refetchThreads } = useThreads()
  const [newChatClicked, setNewChatClicked] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const ensureThreadLoaded = useChatStore((state) => state.ensureThreadLoaded)
  
  // Mobile swipe-to-close functionality
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null)
  
  // Check if we're in the collapsed state (responsive breakpoint or manual)
  useEffect(() => {
    const checkCollapsed = () => {
      const width = window.innerWidth
      const responsiveCollapsed = width >= 768 && width < 1024 // md to lg breakpoint
      setIsCollapsed(isManuallyCollapsed || responsiveCollapsed)
    }
    
    checkCollapsed()
    window.addEventListener('resize', checkCollapsed)
    return () => window.removeEventListener('resize', checkCollapsed)
  }, [isManuallyCollapsed])
  
  // Convert threads to conversations format
  const conversations = threads.map(thread => ({
    id: thread.id,
    title: thread.title,
    updated_at: thread.lastMessageAt,
    created_at: thread.lastMessageAt,
    messageCount: thread.messages?.length || 0
  }))

  useEffect(() => {
    setMounted(true)
  }, [])

  // Refresh conversations when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger && isLoaded && user) {
      refetchThreads()
    }
  }, [refreshTrigger, isLoaded, user, refetchThreads])

  const handleDeleteConversation = async (conversationId: string) => {
    if (!window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        refetchThreads()
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    }
  }

  const handleNewChatClick = () => {
    setNewChatClicked(true)
    onNewChat()
    setTimeout(() => setNewChatClicked(false), 300)
  }

  // Handle swipe-to-close on mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    setTouchStart({ x: touch.clientX, y: touch.clientY })
    setTouchEnd(null)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    setTouchEnd({ x: touch.clientX, y: touch.clientY })
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd || !onClose) return

    const deltaX = touchStart.x - touchEnd.x
    const deltaY = touchStart.y - touchEnd.y
    const minSwipeDistance = 50

    // Only trigger if horizontal swipe is greater than vertical (to avoid interfering with scrolling)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
      // Swipe left to close (deltaX > 0 means swipe left)
      if (deltaX > 0) {
        console.log('👈 Swipe left detected - closing sidebar')
        onClose()
      }
    }

    setTouchStart(null)
    setTouchEnd(null)
  }

  if (!mounted) {
    return (
      <div className="h-full bg-[var(--bg-card)] flex flex-col">
        <div className="animate-pulse p-4">
          <div className="h-8 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="space-y-3">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  // Collapsed rail view for medium screens or manual collapse
  if (isCollapsed) {
    return (
      <div className="h-full bg-[var(--bg-card)] flex flex-col w-16 items-center py-4 relative group">
        {/* Expand/Collapse Toggle - Only show if manual collapse is available */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="w-8 h-8 hover:bg-[var(--accent-soft)] text-[var(--text-subtle)] hover:text-[var(--text-primary)] rounded-lg transition-all duration-200 flex items-center justify-center mb-3"
            title="Expand Sidebar (⌘B)"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        )}
        
        {/* Collapsed New Chat Button */}
        <button 
          onClick={handleNewChatClick}
          className="w-8 h-8 bg-[#F5A623] hover:bg-[#E98E00] text-white rounded-lg transition-all duration-200 flex items-center justify-center mb-3 relative group/newchat"
          title="New Chat (⌘K)"
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 5v14M5 12h14"/>
          </svg>
          
          {/* Tooltip */}
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover/newchat:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 hidden xl:block">
            New Chat
          </div>
        </button>
        
        {/* Collapsed Recent Chats */}
        <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto">
          {conversations.slice(0, 8).map((conversation) => (
            <button
              key={conversation.id}
              onClick={async () => {
                await ensureThreadLoaded(conversation.id)
                onConversationSelect(conversation.id)
              }}
              className={`w-8 h-8 rounded-lg transition-all duration-200 flex items-center justify-center text-xs font-bold relative group/chat ${
                currentConversationId === conversation.id 
                  ? 'bg-[#F5A623] text-white' 
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {conversation.title.charAt(0).toUpperCase()}
              
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover/chat:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 max-w-xs hidden xl:block">
                {conversation.title}
              </div>
            </button>
          ))}
        </div>
        
        {/* Collapsed User Button */}
        {user && (
          <div className="mt-4 relative group/user">
            <UserButton 
              afterSignOutUrl="/" 
            />
            
            {/* User Tooltip */}
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover/user:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 hidden xl:block">
              {user.firstName || 'User'}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div 
      className="h-full bg-[var(--bg-card)] flex flex-col overflow-x-hidden min-w-0"
      onTouchStart={onClose ? handleTouchStart : undefined}
      onTouchMove={onClose ? handleTouchMove : undefined}
      onTouchEnd={onClose ? handleTouchEnd : undefined}
      style={{
        touchAction: 'pan-y', // Allow vertical scrolling but enable horizontal swipe detection
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {/* Enhanced Header */}
      <div className="p-4 border-b border-[var(--outline)] overflow-x-hidden">
        <div className="flex items-center justify-between mb-4 min-w-0">
          <h2 className="font-bold text-xl sm:text-2xl text-[var(--text-primary)] truncate">Clydra</h2>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Collapse Toggle for Desktop */}
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="hidden lg:flex p-2.5 hover:bg-[var(--accent-soft)] rounded-xl transition-all transform active:scale-95 focus-brand min-h-[44px] min-w-[44px] text-[var(--text-subtle)] hover:text-[var(--text-primary)] items-center justify-center"
                title="Collapse Sidebar (⌘B)"
              >
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            )}
            
            {/* Enhanced Close Button for Mobile */}
            {onClose && (
              <button
                onClick={onClose}
                className="flex items-center justify-center p-3 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-xl transition-all duration-200 touch-feedback focus-brand touch-target no-select lg:hidden"
                title="Close sidebar"
                aria-label="Close sidebar"
                style={{ minHeight: '48px', minWidth: '48px' }}
              >
                <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
        </div>
        
        {/* Enhanced New Chat Button */}
        <div className="overflow-hidden">
          <button 
            onClick={handleNewChatClick}
            className={`w-full flex items-center justify-center gap-3 px-4 py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-semibold transition-all duration-300 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-inset transform min-h-[56px] touch-target touch-feedback no-select ${
              newChatClicked ? 'scale-95' : 'hover:scale-[1.02]'
            }`}
            title="New Chat (⌘K)"
            style={{ minHeight: '56px' }}
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 5v14M5 12h14"/>
            </svg>
            <span className="text-base">New Chat</span>
            <div className="ml-auto hidden sm:flex items-center gap-1 text-xs text-white/80">
              <span className="px-2 py-1 bg-white/15 rounded-md text-xs font-medium">⌘K</span>
            </div>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Enhanced Recent Chats */}
        <div className="p-4 overflow-x-hidden min-w-0">
          <h3 className="text-xs font-bold text-[var(--text-subtle)] mb-4 tracking-wider">RECENT CHATS</h3>
          
          {!user ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-[var(--accent-soft)] rounded-full flex items-center justify-center mx-auto mb-3">
                <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="var(--brand-primary)" strokeWidth={2}>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <p className="text-sm text-[var(--text-subtle)] leading-relaxed">
                Sign in to sync your chat history across devices
              </p>
            </div>
          ) : isLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-[var(--accent-soft)] border-t-[var(--brand-primary)] rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm text-[var(--text-subtle)]">Loading conversations...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8">
              <QuickPrompts onPromptSelect={(prompt) => {
                // This will be handled by the parent component
                console.log('Selected prompt:', prompt)
              }} />
            </div>
          ) : (
            <div className="space-y-0.5 max-h-96 overflow-y-auto overflow-x-hidden">
              {conversations.map((conversation, index) => (
                <div
                  key={conversation.id}
                  className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-[1.02] active:scale-98 min-h-[48px] conversation-item overflow-hidden touch-target touch-feedback no-select ${
                    currentConversationId === conversation.id 
                      ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 text-amber-800 shadow-sm' 
                      : 'hover:bg-[var(--accent-soft)] text-[var(--text-primary)] hover:shadow-sm'
                  }`}
                  onClick={async () => {
                    await ensureThreadLoaded(conversation.id)
                    onConversationSelect(conversation.id)
                    // Close sidebar immediately on mobile after selection
                    if (onClose && window.innerWidth <= 768) {
                      setTimeout(() => onClose(), 100) // Small delay to ensure smooth transition
                    }
                  }}
                  style={{ animationDelay: `${index * 50}ms`, minHeight: '48px' }}
                >
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="text-sm font-semibold truncate mb-0.5 conversation-title">
                      {conversation.title}
                    </div>
                    <div className="text-xs text-[var(--text-subtle)] font-medium truncate">
                      {new Date(conversation.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="overflow-hidden flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteConversation(conversation.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-100 text-red-500 rounded-lg transition-all duration-200 focus-brand transform hover:scale-110 active:scale-95 min-h-[36px] min-w-[36px] touch-target touch-feedback no-select"
                      style={{ minHeight: '36px', minWidth: '36px' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M18 6L6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Footer */}
      <div className="p-4 border-t border-[var(--outline)] overflow-x-hidden">
        {user ? (
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 min-w-0 overflow-hidden">
            <UserButton 
              afterSignOutUrl="/" 
            />
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="text-sm font-bold text-[var(--text-primary)] truncate">
                {user.firstName || 'User'}
              </div>
              <div className="text-xs text-[var(--text-subtle)] truncate font-medium">
                {user.emailAddresses[0]?.emailAddress}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
            <div className="w-10 h-10 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Sign In</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">to sync chats</p>
          </div>
        )}
      </div>
    </div>
  )
}