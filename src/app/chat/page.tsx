'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { ChatLayout } from '@/components/ChatLayout'
import { ChatContent } from '@/components/ChatContent'
import { ChatErrorBoundary } from '@/components/error-boundary'

export default function ChatPage() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(undefined)
  const [newChatKey, setNewChatKey] = useState(0)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleConversationSelect = (conversationId: string) => {
    setCurrentConversationId(conversationId)
    // Navigate to the specific conversation URL
    router.push(`/chat/${conversationId}`)
  }

  const handleNewChat = () => {
    setCurrentConversationId(undefined)
    setNewChatKey(prev => prev + 1)
    // Stay on the base chat page for new chats
    router.push('/chat')
  }

  const handleConversationStart = (conversationId: string) => {
    console.log('🆕 New conversation started:', conversationId)
    setCurrentConversationId(conversationId)
    // Navigate to the new conversation URL
    router.replace(`/chat/${conversationId}`)
    // Trigger sidebar refresh to show new conversation
    setRefreshTrigger(prev => prev + 1)
  }

  // Redirect unauthenticated users to landing page
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/')
    }
  }, [isLoaded, isSignedIn, router])

  // Only show loading if auth is not loaded yet
  if (!isLoaded) {
    return null
  }

  // If not signed in, user will be redirected, so return null to avoid flash
  if (!isSignedIn) {
    return null
  }

  return (
    <ChatErrorBoundary>
      <ChatLayout
        currentConversationId={currentConversationId}
        onConversationSelect={handleConversationSelect}
        onNewChat={handleNewChat}
        onConversationStart={handleConversationStart}
        refreshTrigger={refreshTrigger}
      >
        <ChatContent
          key={newChatKey}
          conversationId={currentConversationId}
          onConversationStart={handleConversationStart}
        />
      </ChatLayout>
    </ChatErrorBoundary>
  )
}