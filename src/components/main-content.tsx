'use client'

import Image from 'next/image'
import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import { Message } from '@/lib/supabase'
// ChatHistory import removed - component not found
import { useToast } from './ui/toast'
import { SupermemoryFile } from '@/lib/supermemory-file-processor'
import MultimodalFileUpload from './file-upload/multimodal-file-upload'
import { SearchResults } from './search/SearchResults'
// useChat import removed - hook not found
import { useThreadMessages, useSetThreadMessages, useAppendMessage, useUpdateMessage, useRemoveMessage, useMigrateThread, useReplaceMessageId } from '@/lib/stores/chatStore'
// ModelPicker import removed - component not found
import { defaultModel } from '@/lib/models'
import { useInitialChat } from '@/hooks/useInitialChat'

const suggestedCases = [
  {
    icon: '🚀',
    text: 'Write me a Python script to analyze CSV data',
    href: '#'
  },
  {
    icon: '💡',
    text: 'Explain quantum computing like I\'m 10 years old',
    href: '#'
  },
  {
    icon: '📚',
    text: 'Help me write a compelling cover letter',
    href: '#'
  }
]

interface MainContentProps {
  conversationId?: string
  onConversationStart: (conversationId: string) => void
  onToggleSidebar?: () => void
  sidebarOpen?: boolean
  sidebarCollapsed?: boolean
}

const MainContent = memo(function MainContent({ conversationId, onConversationStart, onToggleSidebar, sidebarOpen, sidebarCollapsed }: MainContentProps) {
  const { showToast } = useToast()
  const [message, setMessage] = useState('')
  const [isResearcherMode, setIsResearcherMode] = useState(false)
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false)
  const [searchResults, setSearchResults] = useState<Array<{
    url: string;
    title: string;
    content: string;
    published_date?: string;
  }> | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  
  const shouldUseStreaming = useCallback((message: string, isResearchMode: boolean, isWebSearch: boolean) => {
    if (isResearchMode || isWebSearch) return true
    
    const complexIndicators = [
      'explain', 'describe', 'analyze', 'compare', 'write', 'create', 'generate',
      'tell me about', 'how does', 'what is', 'why does', 'help me understand',
      'step by step', 'tutorial', 'guide', 'example', 'code', 'function'
    ]
    
    const lowerMessage = message.toLowerCase()
    const hasComplexIndicators = complexIndicators.some(indicator => 
      lowerMessage.includes(indicator)
    )
    
    const isLongMessage = message.length > 100
    const hasMultipleQuestions = (message.match(/\?/g) || []).length > 1
    
    const simpleGreetings = ['hi', 'hello', 'hey', 'thanks', 'thank you', 'ok', 'okay', 'yes', 'no']
    const isSimpleGreeting = simpleGreetings.some(greeting => 
      lowerMessage.trim() === greeting || lowerMessage.trim() === greeting + '!'
    )
    
    if (isSimpleGreeting && message.length < 20) return false
    
    return hasComplexIndicators || isLongMessage || hasMultipleQuestions
  }, [])
  
  // Use centralized store for messages
  const messages = useThreadMessages(conversationId || null)
  
  // Use initial chat hook for hydration
  const { isLoading: isInitialLoading, error: initialError, refresh: refreshInitialChat } = useInitialChat(conversationId || null)
  
  // Use individual stable selectors to prevent recreation
  const setThreadMessages = useSetThreadMessages()
  const appendMessage = useAppendMessage()
  const updateMessage = useUpdateMessage()
  const removeMessage = useRemoveMessage()
  const migrateThread = useMigrateThread()
  const replaceMessageId = useReplaceMessageId()
  const [isLoading, setIsLoading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [attachedFiles, setAttachedFiles] = useState<SupermemoryFile[]>([])
  const [isProcessingFiles, setIsProcessingFiles] = useState(false)
  const [showNewChatFeedback, setShowNewChatFeedback] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [hasOptimisticMessages, setHasOptimisticMessages] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isCreatingConversation, setIsCreatingConversation] = useState(false)
  const [selectedModel, setSelectedModel] = useState(defaultModel)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const activeRequestRef = useRef<string | null>(null)
  const handleSendMessageRef = useRef<(() => void) | null>(null)
  const activeThreadIdRef = useRef<string | null>(null)

  // KEY FIX: Include isLoading and hasOptimisticMessages to prevent input jumping
  const isInChatMode = useMemo(() => {
    const hasMessages = messages.length > 0
    const hasConversation = !!conversationId
    const isProcessing = isLoading || hasOptimisticMessages || isInitialLoading
    
    console.log('🎯 Chat mode calculation:', {
      hasMessages,
      hasConversation,
      isProcessing,
      result: hasMessages || hasConversation || isProcessing
    })
    
    return hasMessages || hasConversation || isProcessing
  }, [messages.length, conversationId, isLoading, hasOptimisticMessages, isInitialLoading])

  // Handle conversation changes and state management
  useEffect(() => {
    console.log('📥 Conversation ID effect triggered:', {
      conversationId,
      hasOptimisticMessages,
      isLoading,
      messagesLength: messages.length,
      isInitialLoading
    })
    
    if (conversationId) {
      console.log('📥 Conversation ID changed to:', conversationId)
      // Reset error state when switching conversations
      setError(null)
      
      // Clear optimistic messages flag when switching to a real conversation
      // The useInitialChat hook will handle loading the messages
      if (hasOptimisticMessages) {
        console.log('🧹 Clearing optimistic messages flag for conversation switch')
        setHasOptimisticMessages(false)
      }
    } else {
      console.log('🧹 Clearing conversation state - switching to new chat')
      // Only show new chat feedback if we're not in the middle of an operation
      if (!hasOptimisticMessages && !isLoading && !isInitialLoading) {
        setShowNewChatFeedback(true)
        setTimeout(() => setShowNewChatFeedback(false), 2000)
      }
    }
  }, [conversationId, hasOptimisticMessages, isLoading, isInitialLoading, messages.length])

  // Handle initial error states
  useEffect(() => {
    if (initialError && conversationId) {
      console.warn('⚠️ Initial chat loading error:', initialError)
      // Don't show error for missing conversations, just log it
      if (!initialError.message?.includes('404')) {
        setError('Failed to load conversation. Please try refreshing.')
      }
    }
  }, [initialError, conversationId])

  useEffect(() => {
    setMessage('')
    setIsResearcherMode(false)
    setIsWebSearchEnabled(false)
    setImageFile(null)
    setImagePreview(null)
    setAttachedFiles([])
    setIsProcessingFiles(false)
    setSearchResults(null)
    setSearchQuery('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const removeImage = useCallback(() => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleFilesProcessed = useCallback((files: SupermemoryFile[]) => {
    setAttachedFiles(files)
    setIsProcessingFiles(false)
    console.log('Files processed:', files)
  }, [])

  const handleFilesRemoved = useCallback(() => {
    setAttachedFiles([])
    setIsProcessingFiles(false)
  }, [])

  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`
    }
  }, [])

  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setMessage(value)
    setError(null)
    adjustTextareaHeight()
  }, [adjustTextareaHeight])

  const [shouldRetry, setShouldRetry] = useState(false)

  const validateMessageInput = useCallback(() => {
    return message.trim() || imageFile || attachedFiles.length > 0
  }, [message, imageFile, attachedFiles])

  const createOptimisticUserMessage = useCallback((currentMessage: string, currentImageUrl: string, threadId: string) => {
    return {
      id: `temp-${Date.now()}`,
      conversation_id: threadId,
      role: 'user' as const,
      content: currentMessage,
      image_url: currentImageUrl || undefined,
      has_attachments: attachedFiles.length > 0,
      file_attachments: attachedFiles.length > 0 ? JSON.stringify(attachedFiles) : undefined,
      created_at: new Date().toISOString()
    }
  }, [attachedFiles])

  const processStreamingResponse = useCallback(async (
    response: Response, 
    assistantTempId: string, 
    newConversationId: string | undefined,
    onConversationStart: (id: string) => void
  ) => {
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let fullResponse = ''
    let hasReceivedFirstContent = false

    // Remove typing animation that updates message content

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log('📡 Stream reading completed on frontend')
          break
        }

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(line => line.trim())

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              console.log('🏁 Frontend received [DONE], full response length:', fullResponse.length)
              
              if (!conversationId && newConversationId) {
                console.log('🆔 Starting conversation with ID:', newConversationId)
                // Migrate temporary thread messages to the real conversation
                if (activeThreadIdRef.current && activeThreadIdRef.current.startsWith('temp-')) {
                  migrateThread(activeThreadIdRef.current, newConversationId)
                }
                onConversationStart(newConversationId)
              }
              
              // Don't clear optimistic messages flag - let the conversation fetch handle it
              console.log('🏁 Stream completed, keeping optimistic messages until conversation loads')
              
              return
            }

            try {
              const parsed = JSON.parse(data)

              if (parsed.isThinking) {
                // Skip thinking state - don't show as message content
                continue
              }

              if (parsed.isProcessing) {
                // Skip processing state - don't show as message content
                continue
              }

              if (parsed.content) {
                fullResponse += parsed.content

                if (!hasReceivedFirstContent) {
                  hasReceivedFirstContent = true
                  console.log('🎬 First content received')
                }

                // Always update in the active thread until migration is complete
                // This ensures the message is found and updated correctly during streaming
                const activeThread = conversationId || activeThreadIdRef.current!
                updateMessage(activeThread, assistantTempId, { 
                  content: fullResponse, 
                  conversation_id: newConversationId || conversationId || activeThread
                })
              }

              if (parsed.conversationId && !conversationId) {
                newConversationId = parsed.conversationId
              }
              
              // Handle model information from the final metadata
              if (parsed.model) {
                const activeThread = conversationId || activeThreadIdRef.current!
                updateMessage(activeThread, assistantTempId, { model: parsed.model })
              }
            } catch (e) {
              console.warn('⚠️ Failed to parse JSON:', data.slice(0, 100))
            }
          }
        }
      }
    } catch (streamError) {
      console.error('❌ Frontend streaming error:', streamError)
      const activeThread = conversationId || activeThreadIdRef.current!
      if (activeThread) {
        removeMessage(activeThread, assistantTempId)
      }
      throw streamError
    }
  }, [conversationId, updateMessage, removeMessage, migrateThread, appendMessage, setHasOptimisticMessages])

  const handleRetry = useCallback((originalMessage: string, originalImageUrl?: string) => {
    if (retryCount >= 3) {
      setError('Maximum retry attempts reached. Please try again later.')
      return
    }

    setError(null)
    setMessage(originalMessage)
    if (originalImageUrl) {
      setImagePreview(originalImageUrl)
    }
    
    setShouldRetry(true)
    setRetryCount(prev => prev + 1)
  }, [retryCount])

  useEffect(() => {
    if (shouldRetry && message.trim()) {
      setShouldRetry(false)
      if (handleSendMessageRef.current) {
        handleSendMessageRef.current()
      }
    }
  }, [shouldRetry, message])

  // KEY FIX: Immediate UI state changes to prevent jumping
  const handleSendMessage = useCallback(async () => {
    if (!validateMessageInput()) return
    
    if (isLoading || activeRequestRef.current) {
      console.log('🚫 BLOCKED: Request already in progress')
      return
    }

    const currentMessage = message.trim()
    const currentImageUrl = imagePreview || ''

    // Set active request immediately to prevent duplicate sends
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    activeRequestRef.current = requestId

    // IMMEDIATE UI CHANGES - This prevents the "nothing happening" feeling
    setIsLoading(true)
    setIsStreaming(true)
    setError(null)
    setHasOptimisticMessages(true)

    // For new conversations, create a temporary thread ID and store optimistic messages there
    const activeThreadId = conversationId || `temp-${Date.now()}`
    activeThreadIdRef.current = activeThreadId
    if (!conversationId) {
      console.log('🆕 Creating temporary thread for new conversation:', activeThreadId)
    }
    
    // Add optimistic user message immediately
    const optimisticUserMessage = createOptimisticUserMessage(currentMessage, currentImageUrl, activeThreadId)
    
    // Add AI response placeholder with unique temporary ID
    const assistantTempId = `assistant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const immediateAiMessage = {
      id: assistantTempId,
      conversation_id: activeThreadId,  // Use activeThreadId instead of conversationId
      role: 'assistant' as const,
      content: '',  // Start with empty content instead of "Thinking..."
      created_at: new Date().toISOString()
    }

    // Add both messages to the store
    appendMessage(activeThreadId, optimisticUserMessage)
    appendMessage(activeThreadId, immediateAiMessage)
    
    // Clear input immediately to prevent visual jumping
    setMessage('')
    removeImage()
    setAttachedFiles([])
    handleFilesRemoved()

    try {
      console.log('🚀 Sending message to API:', currentMessage.slice(0, 50))
      console.log('🔍 Request context:', {
        requestId,
        conversationId,
        activeThreadId,
        hasOptimisticMessages,
        messagesInStore: messages.length
      })
      const requestStart = Date.now()
      
      const useStreaming = shouldUseStreaming(currentMessage, isResearcherMode, isWebSearchEnabled)
      const apiEndpoint = useStreaming ? '/api/chat-stream' : '/api/chat-fast'
      
      console.log(`🤖 Dynamic choice: ${useStreaming ? 'STREAMING' : 'FAST'} for message: "${currentMessage.slice(0, 30)}..."`)
      console.log('📡 Sending request to:', apiEndpoint, {
        message: currentMessage,
        conversationId,
        isResearcherMode,
        isWebSearchEnabled
      })
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentMessage,
          conversationId,
          isResearcherMode,
          isWebSearchEnabled,
          imageUrl: currentImageUrl,
          modelId: selectedModel,
          fileAttachments: [
            ...attachedFiles,
            ...(imageFile ? [{
              fileName: imageFile.name,
              fileType: 'image',
              mimeType: imageFile.type,
              size: imageFile.size,
              metadata: {
                base64Content: currentImageUrl.includes(',') ? currentImageUrl.split(',')[1] : currentImageUrl
              }
            }] : [])
          ]
        }),
      })
      
      const requestTime = Date.now() - requestStart
      console.log(`📡 API request completed in ${requestTime}ms, status: ${response.status}`)

      if (response.ok) {
        setRetryCount(0)
        
        const contentType = response.headers.get('content-type')
        console.log('📋 Response content-type:', contentType)
        
        if (contentType?.includes('text/plain') && response.body) {
          console.log('🌊 Processing streaming response')
          await processStreamingResponse(response, assistantTempId, conversationId, onConversationStart)
        } else {
          console.log('📦 Processing JSON response')
          const data = await response.json()
          console.log('📦 Response data:', data)
          const assistantMessage = data.response
          
          // Handle search results
          if (data.searchResults && data.searchQuery) {
            setSearchResults(data.searchResults)
            setSearchQuery(data.searchQuery)
          } else {
            setSearchResults(null)
            setSearchQuery('')
          }
          
          if (assistantMessage) {
            console.log('📝 Updating AI message with response:', assistantMessage.slice(0, 100))
            if (conversationId || data.conversationId) {
              const threadId = data.conversationId || conversationId!
              updateMessage(threadId, assistantTempId, {
                content: assistantMessage,
                conversation_id: threadId,
                model: data.model || 'AI'
              })
              console.log('✅ Message updated in store')
            }
            
            if (!conversationId && data.conversationId) {
              console.log('🆔 Starting conversation with ID:', data.conversationId)
              // Migrate temporary thread messages to the real conversation
              if (activeThreadIdRef.current && activeThreadIdRef.current.startsWith('temp-')) {
                migrateThread(activeThreadIdRef.current, data.conversationId)
              }
              setIsCreatingConversation(true)
              onConversationStart(data.conversationId)
              
              // Don't clear optimistic messages - let the conversation switch handle it
              setTimeout(() => {
                console.log('⏰ Conversation established, clearing creation flag')
                setIsCreatingConversation(false)
              }, 500)
            }
            
            // Don't clear optimistic messages flag here - let the fetch handle it
            console.log('✅ Response received, keeping messages visible')
            
            console.log(`✅ Non-streaming response completed in ${data.performanceMs || requestTime}ms`)
          } else {
            console.error('❌ No response content in data:', data)
            // Remove the empty AI message if no response
            if (conversationId) {
              removeMessage(conversationId, assistantTempId)
            }
            throw new Error('No response content received')
          }
        }
      } else {
        const errorText = await response.text()
        console.error('Failed to send message:', response.status, errorText)

        if (response.status === 429) {
          setError('Too many requests. Please wait a moment before trying again.')
          showToast('Rate limit exceeded. Please wait before sending another message.', 'error')
        } else if (response.status >= 500) {
          setError('Server error. Please try again in a moment.')
          showToast('Server is experiencing issues. Please try again.', 'error')
        } else {
          setError('Failed to send message. Please try again.')
          showToast('Failed to send message. Please check your connection.', 'error')
        }

        setMessage(currentMessage)
        if (currentImageUrl) {
          setImagePreview(currentImageUrl)
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)

      if (error instanceof TypeError && error.message.includes('fetch')) {
        setError('Network error. Please check your connection and try again.')
      } else {
        setError('Something went wrong. Please try again.')
      }

      setMessage(currentMessage)
      if (currentImageUrl) {
        setImagePreview(currentImageUrl)
      }
    } finally {
      // Only clear the request if it matches our current request ID
      if (activeRequestRef.current === requestId) {
        activeRequestRef.current = null
      }
      setIsLoading(false)
      setIsStreaming(false)
    }
  }, [validateMessageInput, isLoading, message, imagePreview, conversationId, isResearcherMode, isWebSearchEnabled, shouldUseStreaming, attachedFiles, imageFile, createOptimisticUserMessage, removeImage, handleFilesRemoved, processStreamingResponse, onConversationStart, showToast, selectedModel, appendMessage])

  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage
  }, [handleSendMessage])

  // Create thread when user starts typing (better UX)
  const handleInputFocus = useCallback(async () => {
    if (!conversationId && !isCreatingConversation && !hasOptimisticMessages) {
      console.log('🎯 User focused input - preparing new conversation')
      setIsCreatingConversation(true)
      
      try {
        // Create a new conversation immediately when user focuses input
        const response = await fetch('/api/conversations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: 'New Chat'
          }),
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log('🆕 Pre-created conversation:', data.conversationId)
          onConversationStart(data.conversationId)
        }
      } catch (error) {
        console.error('Failed to pre-create conversation:', error)
      } finally {
        setIsCreatingConversation(false)
      }
    }
  }, [conversationId, isCreatingConversation, hasOptimisticMessages, onConversationStart])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
    if (e.key === 'Escape') {
      setMessage('')
      setError(null)
      if (textareaRef.current) {
        textareaRef.current.blur()
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    }
  }, [handleSendMessage])

  useEffect(() => {
    if (textareaRef.current && !conversationId) {
      textareaRef.current.focus()
    }
  }, [conversationId])

  return (
    <main className="main-content flex-1 flex flex-col">

      {/* FIXED LAYOUT: Always show both sections to prevent jumping */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Chat History - Show when in chat mode */}
        {isInChatMode && (
          <div className="flex-1 min-h-0">
            {/* ChatHistory component removed - not found */}
            <div className="p-4 text-gray-500">Chat history component not available</div>
            {/* Search Results */}
            {searchResults && searchResults.length > 0 && (
              <div className="px-4 pb-4">
                <SearchResults hits={searchResults} query={searchQuery} />
              </div>
            )}
          </div>
        )}

        {/* Enhanced Welcome Screen - Mobile-first design */}
        {!isInChatMode && (
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 overflow-y-auto">
            <div className="text-center mb-6 sm:mb-8 max-w-2xl px-4">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[var(--fg)] mb-4 leading-tight">
                Welcome to Clydra AI
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-[var(--fg)] opacity-70 leading-relaxed">
                Your intelligent AI assistant powered by advanced language models
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 w-full max-w-4xl mb-8 px-2">
              {suggestedCases.map((useCase, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setMessage(useCase.text)
                    if (textareaRef.current) {
                      textareaRef.current.focus()
                    }
                  }}
                  className="p-4 sm:p-5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-amber-300 rounded-xl text-left transition-all duration-300 hover:shadow-lg group transform hover:scale-[1.02] active:scale-[0.98] min-h-[80px] flex items-center"
                >
                  <div className="flex items-center gap-3 w-full">
                    <span className="text-2xl sm:text-3xl flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                      {useCase.icon}
                    </span>
                    <span className="text-slate-700 font-medium leading-relaxed text-sm sm:text-base">
                      {useCase.text}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ENHANCED FIXED INPUT: Mobile-optimized bottom input */}
        <div className="border-t border-[var(--outline)] bg-[var(--card)] safe-area-inset-bottom sticky bottom-0 z-10">
          <div className="max-w-4xl mx-auto p-3 sm:p-4 md:p-4">
            {imagePreview && (
              <div className="mb-3 sm:mb-4 relative inline-block">
                <Image
                  src={imagePreview}
                  alt="Preview"
                  width={96}
                  height={96}
                  className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-xl shadow-lg object-cover border-2 border-amber-200"
                />
                <button
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-sm font-bold transition-all shadow-lg transform hover:scale-110 active:scale-95 min-h-[48px] min-w-[48px]"
                >
                  ×
                </button>
              </div>
            )}

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 shadow-sm animate-fade-in">
                <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-red-500">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-red-700 text-sm font-medium mb-1">Something went wrong</p>
                  <p className="text-red-600 text-sm">{error}</p>
                  {retryCount < 3 && (
                    <button
                      onClick={() => handleRetry(message, imagePreview || undefined)}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded-lg transition-colors"
                    >
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                        <path d="M21 3v5h-5" />
                        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                        <path d="M3 21v-5h5" />
                      </svg>
                      Try again
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setError(null)}
                  className="flex-shrink-0 p-1 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-md transition-colors"
                  title="Dismiss error"
                >
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            )}

            {attachedFiles.length > 0 && (
              <div className="mb-3">
                <div className="text-xs font-medium text-slate-600 mb-2 flex items-center gap-1.5">
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                  {attachedFiles.length} file{attachedFiles.length > 1 ? 's' : ''} ready to send
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {attachedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                      <div className="flex-shrink-0 text-blue-600">
                        {file.fileType === 'image' ? (
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                            <circle cx="9" cy="9" r="2" />
                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                          </svg>
                        ) : (
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                            <polyline points="14,2 14,8 20,8" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-blue-900">{file.fileName}</p>
                        <p className="text-xs text-blue-600">
                          {((file.size || 0) / 1024).toFixed(1)} KB • {file.fileType?.toUpperCase() || 'FILE'}
                        </p>
                      </div>
                      {file.fileType === 'image' && file.metadata?.base64Content && (
                        <img
                          src={`data:${file.mimeType};base64,${file.metadata.base64Content}`}
                          alt={file.fileName}
                          className="w-8 h-8 rounded object-cover border border-blue-300"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="chat-input mobile-optimized enhanced-mobile-input">
              <div className="p-3 sm:p-4">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={handleMessageChange}
                  onKeyDown={handleKeyDown}
                  onFocus={handleInputFocus}
                  placeholder="Ask anything..."
                  className="w-full resize-none border-none outline-none text-base placeholder-slate-500 bg-transparent leading-relaxed min-h-[24px] max-h-24 sm:max-h-28 transition-all touch-manipulation"
                  rows={1}
                  disabled={isLoading}
                  style={{ 
                    fontSize: '16px',
                    WebkitTapHighlightColor: 'transparent',
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'text'
                  }}
                />
              </div>

              <div className="flex items-center justify-between gap-3 px-3 sm:px-4 pb-3 sm:pb-4">
                <div className="flex items-center gap-2">
                  {/* <ModelPicker
                    selectedModel={selectedModel}
                    onModelChange={setSelectedModel}
                    disabled={isLoading}
                  /> */}

                  <button
                    onClick={() => setIsResearcherMode(!isResearcherMode)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap touch-target touch-feedback no-select shadow-sm ${isResearcherMode
                      ? 'bg-amber-100 text-amber-700 border border-amber-300'
                      : 'text-slate-600 hover:bg-slate-100 border border-slate-200 hover:border-slate-300'
                      }`}
                  >
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M9 11H1v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6"/>
                      <path d="M9 7V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v3"/>
                      <path d="M15 11h4"/>
                      <path d="M12 11v8"/>
                    </svg>
                    <span className="hidden sm:inline">Research</span>
                  </button>

                  <button
                    onClick={() => setIsWebSearchEnabled(!isWebSearchEnabled)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap touch-target touch-feedback no-select shadow-sm ${isWebSearchEnabled
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'text-slate-600 hover:bg-slate-100 border border-slate-200 hover:border-slate-300'
                      }`}
                  >
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
                      <path d="M2 12h20"/>
                    </svg>
                    <span className="hidden sm:inline">Web</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <MultimodalFileUpload
                    onFilesProcessed={handleFilesProcessed}
                    onFilesRemoved={handleFilesRemoved}
                    disabled={isLoading}
                    maxFiles={3}
                  />

                  <button
                    onClick={handleSendMessage}
                    className={`p-3 rounded-xl transition-all duration-300 touch-target touch-feedback flex items-center justify-center shadow-lg no-select ${(message.trim() || imageFile || attachedFiles.length > 0) && !isLoading
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white hover:shadow-xl'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    disabled={(!message.trim() && !imageFile && attachedFiles.length === 0) || isLoading}
                    aria-label={isLoading ? 'Sending message' : 'Send message'}
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M22 2L11 13" />
                        <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                      </svg>
                    )}
                    {(message.trim() || imageFile || attachedFiles.length > 0) && !isLoading && (
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 opacity-30 animate-ping"></div>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
})

export default MainContent