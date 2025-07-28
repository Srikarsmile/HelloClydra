'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter, useParams } from 'next/navigation'
import { ChatLayout } from '@/components/ChatLayout'
import { ChatContent } from '@/components/ChatContent'
import { ChatErrorBoundary } from '@/components/error-boundary'

export default function ConversationPage() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const params = useParams()
  const conversationId = params.conversationId as string
  
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(conversationId)
  const [newChatKey, setNewChatKey] = useState(0)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Update state when URL parameter changes
  useEffect(() => {
    setCurrentConversationId(conversationId)
  }, [conversationId])

  const handleConversationSelect = (newConversationId: string) => {
    setCurrentConversationId(newConversationId)
    // Update URL to reflect the new conversation
    router.push(`/chat/${newConversationId}`)
  }

  const handleNewChat = () => {
    setCurrentConversationId(undefined)
    setNewChatKey(prev => prev + 1)
    // Navigate to the base chat page for new chats
    router.push('/chat')
  }

  const handleConversationStart = (newConversationId: string) => {
    console.log('🆕 New conversation started:', newConversationId)
    setCurrentConversationId(newConversationId)
    // Update URL to include the new conversation ID
    router.replace(`/chat/${newConversationId}`)
    // Trigger sidebar refresh to show new conversation
    setRefreshTrigger(prev => prev + 1)
  }

  // Handle invalid conversation IDs
  const handleConversationNotFound = () => {
    console.warn('⚠️ Conversation not found, redirecting to new chat')
    router.replace('/chat')
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
          key={`${newChatKey}-${conversationId}`}
          conversationId={currentConversationId}
          onConversationStart={handleConversationStart}
        />
      </ChatLayout>
    </ChatErrorBoundary>
  )
}