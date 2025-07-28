'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Message } from '@/lib/supabase'
import { MessageBubble } from './MessageBubble'
import { Composer } from './Composer'
import { JumpToLatest } from './JumpToLatest'
import { WelcomeCards } from './WelcomeCards'
import { useToast } from './ui/toast'
import { SupermemoryFile } from '@/lib/supermemory-file-processor'
import MultimodalFileUpload from './file-upload/multimodal-file-upload'
import { SearchResults } from './search/SearchResults'
import { useThreadMessages, useSetThreadMessages, useAppendMessage, useUpdateMessage, useRemoveMessage, useMigrateThread, useReplaceMessageId } from '@/lib/stores/chatStore'
import { defaultModel, getModel } from '@/lib/models'
import { useInitialChat } from '@/hooks/useInitialChat'
import { useAutoScroll } from '@/hooks/useAutoScroll'

interface ChatContentProps {
  conversationId?: string
  onConversationStart: (conversationId: string) => void
}

export function ChatContent({ conversationId, onConversationStart }: ChatContentProps) {
  const { showToast } = useToast()
  const [message, setMessage] = useState('')
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false)
  const [searchResults, setSearchResults] = useState<Array<{
    url: string;
    title: string;
    content: string;
    published_date?: string;
  }> | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  
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
  const [isStreaming, setIsStreaming] = useState(false)
  const [hasOptimisticMessages, setHasOptimisticMessages] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isCreatingConversation, setIsCreatingConversation] = useState(false)
  const [selectedModel, setSelectedModel] = useState(defaultModel)
  
  const activeRequestRef = useRef<string | null>(null)
  const activeThreadIdRef = useRef<string | null>(null)

  // Auto-scroll functionality
  const { containerRef, showJumpToLatest, scrollToBottom, isNearBottom } = useAutoScroll(messages.length)

  // Determine if we're in chat mode
  const isInChatMode = useMemo(() => {
    const hasMessages = messages.length > 0
    const hasConversation = !!conversationId
    const isProcessing = isLoading || hasOptimisticMessages || isInitialLoading
    
    return hasMessages || hasConversation || isProcessing
  }, [messages.length, conversationId, isLoading, hasOptimisticMessages, isInitialLoading])

  // Handle conversation changes and state management
  useEffect(() => {
    if (conversationId) {
      // Reset error state when switching conversations
      setError(null)
      
      // Clear optimistic messages flag when switching to a real conversation
      if (hasOptimisticMessages) {
        setHasOptimisticMessages(false)
      }
    }
  }, [conversationId, hasOptimisticMessages])

  // Handle initial error states
  useEffect(() => {
    if (initialError && conversationId) {
      console.warn('⚠️ Initial chat loading error:', initialError)
      if (!initialError.message?.includes('404')) {
        setError('Failed to load conversation. Please try refreshing.')
      }
    }
  }, [initialError, conversationId])

  // Reset form state
  useEffect(() => {
    setMessage('')
    setIsWebSearchEnabled(false)
    setImageFile(null)
    setImagePreview(null)
    setAttachedFiles([])
    setIsProcessingFiles(false)
    setSearchResults(null)
    setSearchQuery('')
  }, [])

  const removeImage = useCallback(() => {
    setImageFile(null)
    setImagePreview(null)
  }, [])

  const handleFilesProcessed = useCallback((files: SupermemoryFile[]) => {
    setAttachedFiles(files)
    setIsProcessingFiles(false)
  }, [])

  const handleFilesRemoved = useCallback(() => {
    setAttachedFiles([])
    setIsProcessingFiles(false)
  }, [])

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
    onConversationStart: (id: string) => void,
    currentSelectedModel: string = selectedModel
  ) => {
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let fullResponse = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(line => line.trim())

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              // Check if we got any meaningful content
              if (!fullResponse.trim()) {
                const activeThread = conversationId || activeThreadIdRef.current!
                updateMessage(activeThread, assistantTempId, { 
                  content: 'I apologize, but I received an empty response. Please try again.',
                  conversation_id: newConversationId || conversationId || activeThread,
                  model: getModel(currentSelectedModel)?.label || 'AI'
                })
              }
              
              if (!conversationId && newConversationId) {
                if (activeThreadIdRef.current && activeThreadIdRef.current.startsWith('temp-')) {
                  migrateThread(activeThreadIdRef.current, newConversationId)
                }
                onConversationStart(newConversationId)
              }
              return
            }

            try {
              const parsed = JSON.parse(data)

              // Handle error responses from backend
              if (parsed.error) {
                console.warn('⚠️ Backend streaming error:', parsed.error)
                if (parsed.canRetry) {
                  console.log('🔄 Backend suggests retry available')
                  // Could implement auto-retry logic here
                }
                // Don't break - continue processing other chunks
                continue
              }

              if (parsed.isThinking || parsed.isProcessing) {
                continue
              }

              if (parsed.content) {
                fullResponse += parsed.content
                const activeThread = conversationId || activeThreadIdRef.current!
                updateMessage(activeThread, assistantTempId, { 
                  content: fullResponse, 
                  conversation_id: newConversationId || conversationId || activeThread
                })
              }

              if (parsed.conversationId && !conversationId) {
                newConversationId = parsed.conversationId
              }
              
              if (parsed.model) {
                const activeThread = conversationId || activeThreadIdRef.current!
                updateMessage(activeThread, assistantTempId, { model: parsed.model })
              }
            } catch (parseError) {
              console.warn('⚠️ Frontend failed to parse streaming JSON:', {
                data: data.slice(0, 100),
                error: parseError instanceof Error ? parseError.message : 'Unknown error',
                fullDataLength: data.length
              })
              // Don't break streaming for parse errors - backend handles recovery
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
  }, [conversationId, updateMessage, removeMessage, migrateThread, selectedModel])

  const handleSendMessage = useCallback(async () => {
    if (!validateMessageInput()) return
    
    if (isLoading || activeRequestRef.current) {
      return
    }

    const currentMessage = message.trim()
    const currentImageUrl = imagePreview || ''

    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    activeRequestRef.current = requestId

    setIsLoading(true)
    setIsStreaming(true)
    setError(null)
    setHasOptimisticMessages(true)

    const activeThreadId = conversationId || `temp-${Date.now()}`
    activeThreadIdRef.current = activeThreadId
    
    const optimisticUserMessage = createOptimisticUserMessage(currentMessage, currentImageUrl, activeThreadId)
    
    const assistantTempId = `assistant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const immediateAiMessage = {
      id: assistantTempId,
      conversation_id: activeThreadId,
      role: 'assistant' as const,
      content: '',
      model: getModel(selectedModel)?.label || 'AI',
      created_at: new Date().toISOString()
    }

    appendMessage(activeThreadId, optimisticUserMessage)
    appendMessage(activeThreadId, immediateAiMessage)
    
    setMessage('')
    removeImage()
    setAttachedFiles([])
    handleFilesRemoved()

    try {
      const useStreaming = shouldUseStreaming(currentMessage, false, isWebSearchEnabled)
      const apiEndpoint = useStreaming ? '/api/chat-stream' : '/api/chat-fast'
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentMessage,
          conversationId,
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

      if (response.ok) {
        setRetryCount(0)
        
        const contentType = response.headers.get('content-type')
        
        if (contentType?.includes('text/plain') && response.body) {
          await processStreamingResponse(response, assistantTempId, conversationId, onConversationStart, selectedModel)
        } else {
          const data = await response.json()
          const assistantMessage = data.response
          
          if (data.searchResults && data.searchQuery) {
            setSearchResults(data.searchResults)
            setSearchQuery(data.searchQuery)
          } else {
            setSearchResults(null)
            setSearchQuery('')
          }
          
          if (assistantMessage && assistantMessage.trim()) {
            if (conversationId || data.conversationId) {
              const threadId = data.conversationId || conversationId!
              updateMessage(threadId, assistantTempId, {
                content: assistantMessage,
                conversation_id: threadId,
                model: data.model || getModel(selectedModel)?.label || 'AI'
              })
            }
          } else {
            // Handle empty response
            if (conversationId || data.conversationId) {
              const threadId = data.conversationId || conversationId!
              updateMessage(threadId, assistantTempId, {
                content: 'I apologize, but I received an empty response. Please try again.',
                conversation_id: threadId,
                model: data.model || getModel(selectedModel)?.label || 'AI'
              })
            }
          }
          
          if (!conversationId && data.conversationId) {
            if (activeThreadIdRef.current && activeThreadIdRef.current.startsWith('temp-')) {
              migrateThread(activeThreadIdRef.current, data.conversationId)
            }
            setIsCreatingConversation(true)
            onConversationStart(data.conversationId)
            
            setTimeout(() => {
              setIsCreatingConversation(false)
            }, 500)
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
      if (activeRequestRef.current === requestId) {
        activeRequestRef.current = null
      }
      setIsLoading(false)
      setIsStreaming(false)
    }
  }, [validateMessageInput, isLoading, message, imagePreview, conversationId, isWebSearchEnabled, shouldUseStreaming, attachedFiles, imageFile, createOptimisticUserMessage, removeImage, handleFilesRemoved, processStreamingResponse, onConversationStart, showToast, selectedModel, appendMessage, updateMessage, removeMessage, migrateThread])

  const handleImageUpload = useCallback((file: File) => {
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const handlePromptSelect = useCallback((prompt: string) => {
    setMessage(prompt)
    // Auto-focus would happen here if we had a ref to the textarea
  }, [])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Chat Messages or Welcome Screen */}
      <div ref={containerRef} className="flex-1 overflow-y-auto">
        {isInChatMode ? (
          <div className="max-w-72ch sm:max-w-80ch md:max-w-96ch lg:max-w-120ch xl:max-w-140ch 2xl:max-w-160ch mx-auto px-4 py-4 pb-6">
            {/* Messages */}
            <div className="space-y-4">
              {messages.map((message, index) => {
                const latestAiMessageIndex = messages.map((msg, idx) => ({ msg, idx }))
                  .filter(({ msg }) => msg.role === 'assistant')
                  .pop()?.idx
                
                const isLatestAiMessage = message.role === 'assistant' && index === latestAiMessageIndex
                const isFirstMessage = index === 0 && messages.length === 1
                
                return (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isLatestAiMessage={isLatestAiMessage}
                    disableAnimation={isFirstMessage}
                  />
                )
              })}
            </div>

            {/* Search Results */}
            {searchResults && searchResults.length > 0 && (
              <div className="mt-6">
                <SearchResults hits={searchResults} query={searchQuery} />
              </div>
            )}

            {/* Loading indicator */}
            {(isLoading || isInitialLoading) && (
              <div className="flex justify-start mt-4">
                <div className="bg-white dark:bg-[var(--bg-card)] border-l-4 border-[var(--brand-primary)] rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-[var(--brand-primary)] rounded-full animate-bounce loading-dot"></div>
                      <div className="w-2 h-2 bg-[var(--brand-primary)] rounded-full animate-bounce loading-dot"></div>
                      <div className="w-2 h-2 bg-[var(--brand-primary)] rounded-full animate-bounce loading-dot"></div>
                    </div>
                    <span className="text-sm text-[var(--text-subtle)]">
                      {isStreaming ? 'AI is thinking...' : 'Loading...'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
            <WelcomeCards onPromptSelect={handlePromptSelect} />
          </div>
        )}
      </div>

      {/* Jump to Latest Button */}
      <JumpToLatest show={showJumpToLatest} onClick={() => scrollToBottom()} />

      {/* Fixed Bottom Section */}
      <div className="flex-shrink-0 bg-[var(--bg-card)] border-t border-[var(--outline)]">
        {/* Error Display */}
        {error && (
          <div className="mx-4 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 shadow-sm">
            <div className="flex-shrink-0 w-8 h-8 bg-red-100 dark:bg-red-800 rounded-full flex items-center justify-center">
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-red-500 dark:text-red-400">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-red-700 dark:text-red-300 text-sm font-medium mb-1">Something went wrong</p>
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="flex-shrink-0 p-1 text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-800 rounded-md transition-colors focus-brand min-h-[44px] min-w-[44px] touch-manipulation"
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}



        {/* Composer */}
        <Composer
          message={message}
          onMessageChange={setMessage}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          isWebSearchEnabled={isWebSearchEnabled}
          onWebSearchEnabledChange={setIsWebSearchEnabled}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          onImageUpload={handleImageUpload}
          imagePreview={imagePreview}
          onRemoveImage={removeImage}
          disabled={isLoading}
          attachedFiles={attachedFiles}
          onFilesProcessed={handleFilesProcessed}
          onFilesRemoved={handleFilesRemoved}
        />
      </div>
    </div>
  )
}