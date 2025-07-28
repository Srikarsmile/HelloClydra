import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest } from 'next/server'
import { getModelById, defaultModel } from '@/lib/models'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Quick auth check
    const { userId } = await auth()
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Debug: Log user ID for Supermemory
    console.log('🔍 Debug - User ID for Supermemory:', userId)

    const body = await request.json()
    const { message, conversationId, isWebSearchEnabled = false, fileAttachments, modelId, isFeynmanMode = false } = body

    if (!message?.trim() && !fileAttachments?.length) {
      return new Response(
        JSON.stringify({ error: 'Message or file attachment is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Processing message...

    // Get or create user (simplified)
    const { data: user } = await supabaseAdmin
      .from('users')
      .upsert({
        clerk_user_id: userId,
        email: 'user@example.com'
      }, {
        onConflict: 'clerk_user_id'
      })
      .select('id')
      .single()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User creation failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    let currentConversationId = conversationId

    // Create conversation if needed
    if (!conversationId) {
      const { data: newConversation } = await supabaseAdmin
        .from('conversations')
        .insert({
          user_id: user.id,
          title: message.slice(0, 50) + '...'
        })
        .select('id')
        .single()

      if (newConversation) {
        currentConversationId = newConversation.id
      }
    }

    // Save user message
    const userMessage = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: currentConversationId,
        role: 'user',
        content: message,
        has_attachments: fileAttachments?.length > 0
      })
      .select('id')
      .single()

    // Save file attachments if any
    if (fileAttachments && fileAttachments.length > 0 && userMessage?.data?.id) {
      try {
        const { FileAttachmentsDB } = await import('@/lib/file-attachments-db')
        for (const file of fileAttachments) {
          await FileAttachmentsDB.saveFileAttachment(file, userMessage.data.id, currentConversationId, userId)
        }
        // File attachments saved
      } catch (error) {
        console.error('Error saving file attachments:', error)
      }
    }

    // Perform web search if enabled - return enhanced search results (but skip for simple queries)
    if (isWebSearchEnabled && process.env.EXA_API_KEY) {
      // Skip web search for simple queries that don't need current information
      const simpleQueries = [
        /^(what.*is.*today.*date|today.*date|todays.*date)$/i,
        /^(what.*time.*is.*it|current.*time)$/i,
        /^(hello|hi|hey|good morning|good afternoon|good evening)$/i,
        /^(how.*are.*you|what.*up|whats.*up)$/i,
        /^(thank.*you|thanks|bye|goodbye)$/i
      ]
      
      const shouldSkipSearch = simpleQueries.some(pattern => pattern.test(message.trim()))
      
      if (shouldSkipSearch) {
        // Continue with normal AI response without search
      } else {
        try {
          const searchPromise = (async () => {
            const Exa = (await import('exa-js')).default
            const exa = new Exa(process.env.EXA_API_KEY!)
            
            // Determine search parameters based on query type
            const isNewsQuery = /\b(news|breaking|update|announcement|development|happening)\b/i.test(message)
            const isCurrentEventsQuery = /\b(latest|recent|current|new|2024|2025)\b/i.test(message) && !simpleQueries.some(p => p.test(message))
            
            const searchParams: any = {
              type: 'auto',
              numResults: isNewsQuery ? 4 : 3,
              text: true,
              highlights: {
                numSentences: 2,
                highlightsPerUrl: 1,
                query: message
              }
            }
            
            // Add date filters for news and current events
            if (isNewsQuery || isCurrentEventsQuery) {
              const oneWeekAgo = new Date()
              oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
              searchParams.startPublishedDate = oneWeekAgo.toISOString()
              if (isNewsQuery) {
                searchParams.category = 'news'
              }
            }
            
            return await exa.searchAndContents(message, searchParams)
          })()

          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Web search timeout')), 10000)
          )

          const searchResponse = await Promise.race([searchPromise, timeoutPromise])

          if (searchResponse?.results && Array.isArray(searchResponse.results) && searchResponse.results.length > 0) {
            const currentDate = new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
            
            // Create enhanced search response for streaming
            let exaResponse = `# 🌐 Web Search Results\n\n`
            exaResponse += `**Query:** "${message}"\n`
            exaResponse += `**Search Date:** ${currentDate}\n`
            exaResponse += `**Results Found:** ${searchResponse.results.length}\n\n`
            
            searchResponse.results.forEach((result: any, index: number) => {
              exaResponse += `### ${index + 1}. ${result.title || 'Untitled'}\n`
              exaResponse += `🔗 ${result.url || 'Unknown source'}\n`
              
              if (result.publishedDate) {
                const pubDate = new Date(result.publishedDate)
                const isRecent = (Date.now() - pubDate.getTime()) < (7 * 24 * 60 * 60 * 1000)
                exaResponse += `📅 ${pubDate.toLocaleDateString()}${isRecent ? ' (Recent)' : ''}\n`
              }
              
              if (result.highlights && result.highlights.length > 0) {
                exaResponse += `🔍 ${result.highlights.join(' • ')}\n`
              }
              
              exaResponse += `\n---\n\n`
            })
            
            exaResponse += `*Search powered by Exa*`

            // Save the Exa response to database
            await supabaseAdmin
              .from('messages')
              .insert({
                conversation_id: currentConversationId,
                role: 'assistant',
                content: exaResponse
              })

            await supabaseAdmin
              .from('conversations')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', currentConversationId)

            const totalTime = Date.now() - startTime
            // EXA search completed

            // Stream the Exa response back to the client
            const encoder = new TextEncoder()
            const stream = new ReadableStream({
              start(controller) {
                try {
                  // Send metadata
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                    conversationId: currentConversationId,
                    isExaSearch: true 
                  })}\n\n`))

                  // Stream the response in chunks for better UX
                  const words = exaResponse.split(' ')
                  let currentChunk = ''
                  
                  words.forEach((word, index) => {
                    currentChunk += word + ' '
                    
                    // Send chunk every 8 words or at the end
                    if ((index + 1) % 8 === 0 || index === words.length - 1) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                        content: currentChunk 
                      })}\n\n`))
                      currentChunk = ''
                    }
                  })

                  // Send completion metadata
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                    conversationId: currentConversationId,
                    performanceMs: totalTime 
                  })}\n\n`))
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                  controller.close()
                } catch (error) {
                  console.error('Exa streaming error:', error)
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Streaming failed' })}\n\n`))
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                  controller.close()
                }
              }
            })

            return new Response(stream, {
              headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'Content-Type'
              }
            })
          }
        } catch (error) {
          console.warn('Web search failed:', error)
          // Fall through to regular Grok response
        }
      }
    }

    // Regular Grok response (no web search)
    const searchResults = ''

    // Process file attachments and prepare content
    let fileContent = ''
    if (fileAttachments && fileAttachments.length > 0) {
      fileContent = '\n\n**Attached Files:**\n'
      fileAttachments.forEach((file: any, index: number) => {
        fileContent += `\n${index + 1}. ${file.fileName} (${file.fileType})`
        if (file.supermemoryStored) {
          fileContent += ` [Stored in Memory]`
        }
        fileContent += '\n'
        
        if (file.content) {
          // For images, don't include base64 in text content
          if (file.fileType === 'image') {
            fileContent += `Image file ready for vision analysis\n`
          } else {
            fileContent += `Content: ${file.content.slice(0, 1000)}${file.content.length > 1000 ? '...' : ''}\n`
          }
        }
        if (file.error) {
          fileContent += `Error: ${file.error}\n`
        }
      })
    }

    // Create enhanced message with search results and file content
    const enhancedMessage = message + searchResults + fileContent

    // Get recent conversation context - let Supermemory handle infinite context
    let recentMessages: any[] = []
    const hasSupermemory = !!(process.env.SUPERMEMORY_API_KEY && userId)
    
    if (currentConversationId && !hasSupermemory) {
      // Only fetch manual context if Supermemory is NOT available
      try {
        const { data: previousMessages } = await supabaseAdmin
          .from('messages')
          .select('role, content, created_at')
          .eq('conversation_id', currentConversationId)
          .order('created_at', { ascending: false })
          .limit(8) // Fallback context when no Supermemory

        if (previousMessages && previousMessages.length > 0) {
          recentMessages = previousMessages
            .reverse()
            .map(msg => ({
              role: msg.role,
              content: msg.content
            }))
          console.log(`📚 Providing ${recentMessages.length} manual messages (no Supermemory available)`)
        }
      } catch (error) {
        console.warn('Failed to fetch recent messages for fallback context:', error)
      }
    } else if (hasSupermemory) {
      console.log('🧠 Using Supermemory for infinite context - no manual messages needed')
    }

    // Create streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        let isControllerClosed = false
        
        const safeEnqueue = (data: string) => {
          if (!isControllerClosed) {
            try {
              controller.enqueue(encoder.encode(data))
            } catch (error) {
              console.warn('Controller already closed, skipping enqueue')
              isControllerClosed = true
            }
          }
        }
        
        const safeClose = () => {
          if (!isControllerClosed) {
            try {
              controller.close()
              isControllerClosed = true
            } catch (error) {
              console.warn('Controller already closed')
            }
          }
        }
        
        try {
          // Send initial metadata
          const initialData = {
            conversationId: currentConversationId,
            isThinking: true
          }
          safeEnqueue(`data: ${JSON.stringify(initialData)}\n\n`)

          // Use the selected model or default
          const model = getModelById(modelId)
          const selectedModel = model?.id || defaultModel
          // Using selected model
          
          // Prepare message content with multimodal support
          const messageContent: Array<{
            type: 'text' | 'image_url'
            text?: string
            image_url?: { url: string }
          }> = []

          // Add text content
          if (enhancedMessage.trim()) {
            messageContent.push({
              type: 'text',
              text: enhancedMessage
            })
          }

          // Add image attachments from file uploads
          if (fileAttachments) {
            fileAttachments.forEach((file: any) => {
              if (file.fileType === 'image' && file.metadata?.base64Content) {
                messageContent.push({
                  type: 'image_url' as const,
                  image_url: {
                    url: `data:${file.mimeType};base64,${file.metadata.base64Content}`
                  }
                })
              }
            })
          }

          // Use multimodal content if we have images or complex content
          const userMessage = {
            role: 'user',
            content: messageContent.length === 1 && messageContent[0].type === 'text' 
              ? messageContent[0].text! 
              : messageContent
          }

          // Check if this model should use DeepInfra
          const { isDeepInfraModel, callDeepInfraAPI } = await import('@/lib/deepinfra-client')
          
          let apiResponse: Response
          let usesFallback = false
          let primaryProviderError: string | null = null
          
          try {
            if (isDeepInfraModel(selectedModel)) {
            // Using DeepInfra
            if (!process.env.DEEPINFRA_API_KEY) {
              throw new Error('DeepInfra API key not configured')
            }
            
            // Import centralized prompt system
            const { PromptPresets, getPromptModeFromRequest } = await import('@/lib/prompts')
            
            // Generate system prompt with context
            const promptMode = getPromptModeFromRequest(isWebSearchEnabled, undefined, isFeynmanMode)
            let systemMessage = PromptPresets[promptMode || 'assistant']()
            
            // Add context-specific instructions
            if (searchResults) {
              systemMessage += ' Use the provided web search results to enhance your response with current information.'
            }
            if (fileAttachments) {
              systemMessage += ' Use the provided file attachments to enhance your response.'
            }
            
            // Convert userMessage to text format for DeepInfra
            const userContent = typeof userMessage.content === 'string' 
              ? userMessage.content 
              : userMessage.content
                .filter((item: any) => item.type === 'text')
                .map((item: any) => item.text)
                .join(' ')
            
            // Debug: Check Supermemory configuration
            console.log('🧠 Supermemory Debug:', {
              hasSupermemoryKey: !!process.env.SUPERMEMORY_API_KEY,
              userId: userId,
              model: selectedModel
            })

            // Build messages with recent context for Supermemory
            const messagesForAI = [
              {
                role: 'system' as const,
                content: systemMessage
              },
              // Include recent conversation context
              ...recentMessages,
              {
                role: 'user' as const,
                content: userContent
              }
            ]

            apiResponse = await callDeepInfraAPI({
              apiKey: process.env.DEEPINFRA_API_KEY,
              model: selectedModel,
              messages: messagesForAI,
              temperature: 0.7,
              maxTokens: 4096, // Increased for streaming responses
              topP: 0.95,
              topK: 50,
              frequencyPenalty: 0.1,
              presencePenalty: 0.1,
              repetitionPenalty: 1.05,
              stream: true,
              userId: userId // Enable Supermemory infinite memory
            })
          } else {
            // Import centralized prompt system
            const { PromptPresets, getPromptModeFromRequest } = await import('@/lib/prompts')
            
            // Generate system prompt with context
            const promptMode = getPromptModeFromRequest(isWebSearchEnabled, undefined, isFeynmanMode)
            let systemMessage = PromptPresets[promptMode || 'assistant']()
            
            // Add context-specific instructions
            if (searchResults) {
              systemMessage += ' Use the provided web search results to enhance your response with current information.'
            }
            if (fileAttachments) {
              systemMessage += ' Use the provided file attachments to enhance your response.'
            }

            // Use OpenRouter with Supermemory headers for context injection
            const headers: Record<string, string> = {
              'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
              'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
              'X-Title': 'Clydra AI',
              'Content-Type': 'application/json'
            }

            // Add Supermemory headers if available
            let baseURL = 'https://openrouter.ai/api/v1/chat/completions'
            if (process.env.SUPERMEMORY_API_KEY && userId) {
              baseURL = 'https://api.supermemory.ai/v3/https://openrouter.ai/api/v1/chat/completions'
              headers['x-api-key'] = process.env.SUPERMEMORY_API_KEY
              headers['x-sm-user-id'] = userId
              console.log('🧠 Using Supermemory proxy for OpenRouter streaming')
            }

            // Build messages with recent context for OpenRouter + Supermemory
            const messagesForOpenRouter = [
              {
                role: 'system',
                content: systemMessage
              },
              // Include recent conversation context
              ...recentMessages,
              userMessage
            ]

            apiResponse = await fetch(baseURL, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                model: selectedModel,
                messages: messagesForOpenRouter,
                temperature: 0.7,
                max_tokens: 4000,
                stream: true, // Enable streaming
                top_p: 0.9
              })
            })
          }
          } catch (providerError) {
            primaryProviderError = providerError instanceof Error ? providerError.message : String(providerError)
            console.warn(`🔄 Primary provider failed: ${primaryProviderError}`)
            
            // Try fallback to OpenRouter for DeepInfra models if available
            if (isDeepInfraModel(selectedModel) && process.env.OPENROUTER_API_KEY) {
              console.log('🔄 Attempting fallback to OpenRouter...')
              usesFallback = true
              
              try {
                // Use a compatible OpenRouter model as fallback
                const fallbackModel = 'anthropic/claude-sonnet-4'
                
                const { PromptPresets, getPromptModeFromRequest } = await import('@/lib/prompts')
                const promptMode = getPromptModeFromRequest(isWebSearchEnabled, undefined, isFeynmanMode)
                let systemMessage = PromptPresets[promptMode || 'assistant']()
                
                if (searchResults) systemMessage += ' Use the provided web search results to enhance your response with current information.'
                if (fileAttachments) systemMessage += ' Use the provided file attachments to enhance your response.'

                // Convert userMessage to text format for OpenRouter fallback
                const userContentFallback = typeof userMessage.content === 'string' 
                  ? userMessage.content 
                  : userMessage.content
                    .filter((item: any) => item.type === 'text')
                    .map((item: any) => item.text)
                    .join(' ')

                const messagesForAI = [
                  { role: 'system' as const, content: systemMessage },
                  ...recentMessages,
                  { role: 'user' as const, content: userContentFallback }
                ]

                apiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
                    'X-Title': 'Clydra AI',
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    model: fallbackModel,
                    messages: messagesForAI,
                    temperature: 0.7,
                    max_tokens: 4096,
                    top_p: 0.95,
                    frequency_penalty: 0.1,
                    presence_penalty: 0.1,
                    stream: true
                  })
                })
                
                console.log('✅ Fallback to OpenRouter successful')
              } catch (fallbackError) {
                console.error('❌ Fallback also failed:', fallbackError)
                throw providerError
              }
            } else {
              throw providerError
            }
          }
          
          if (!apiResponse.ok) {
            const errorText = await apiResponse.text()
            const provider = usesFallback ? 'OpenRouter (fallback)' : (isDeepInfraModel(selectedModel) ? 'DeepInfra' : 'OpenRouter')
            console.error(`${provider} streaming error:`, errorText)
            safeEnqueue(`data: ${JSON.stringify({ error: 'AI service unavailable' })}\n\n`)
            safeEnqueue('data: [DONE]\n\n')
            safeClose()
            return
          }

          // Process streaming response (both DeepInfra and OpenRouter use same SSE format)
          const reader = apiResponse.body?.getReader()
          if (!reader) {
            safeEnqueue(`data: ${JSON.stringify({ error: 'No response stream' })}\n\n`)
            safeEnqueue('data: [DONE]\n\n')
            safeClose()
            return
          }

          const decoder = new TextDecoder()
          let fullResponse = ''
          let isFirstChunk = true
          let assistantMessageId: string | null = null
          
          // Create assistant message in database first to get the ID
          if (currentConversationId) {
            const { data: assistantMessage } = await supabaseAdmin
              .from('messages')
              .insert({
                conversation_id: currentConversationId,
                role: 'assistant',
                content: '', // Start with empty content
                model: model?.label || 'AI'
              })
              .select('id')
              .single()
            
            if (assistantMessage) {
              assistantMessageId = assistantMessage.id
              // Created assistant message
            }
          }

          try {
            let buffer = '' // Buffer for incomplete chunks
            let parseFailureCount = 0
            const MAX_PARSE_FAILURES = 5

            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              const chunk = decoder.decode(value, { stream: true })
              buffer += chunk

              // Process complete lines from buffer
              const lines = buffer.split('\n')
              // Keep the last (potentially incomplete) line in buffer
              buffer = lines.pop() || ''

              for (const line of lines) {
                if (line.trim() && line.startsWith('data: ')) {
                  const data = line.slice(6).trim()
                  if (data === '[DONE]') {
                    const provider = isDeepInfraModel(selectedModel) ? 'DeepInfra' : 'OpenRouter'
                    console.log(`✅ ${provider} streaming completed successfully`)
                    break
                  }

                  // Skip empty data
                  if (!data) continue

                  try {
                    const parsed = JSON.parse(data)
                    const content = parsed.choices?.[0]?.delta?.content

                    if (content) {
                      fullResponse += content

                      // Send processing indicator and message ID on first chunk
                      if (isFirstChunk) {
                        safeEnqueue(`data: ${JSON.stringify({ 
                          isProcessing: true,
                          messageId: assistantMessageId 
                        })}\n\n`)
                        isFirstChunk = false
                      }

                      // Stream the content chunk
                      safeEnqueue(`data: ${JSON.stringify({ content })}\n\n`)
                      parseFailureCount = 0 // Reset failure count on success
                    }
                  } catch (parseError) {
                    parseFailureCount++
                    const provider = isDeepInfraModel(selectedModel) ? 'DeepInfra' : 'OpenRouter'
                    
                    console.warn(`⚠️ Failed to parse ${provider} streaming chunk (${parseFailureCount}/${MAX_PARSE_FAILURES}):`, {
                      data: data.slice(0, 100),
                      error: parseError instanceof Error ? parseError.message : 'Unknown error',
                      model: selectedModel,
                      bufferLength: buffer.length
                    })

                    // If we hit max failures, try to recover gracefully
                    if (parseFailureCount >= MAX_PARSE_FAILURES) {
                      console.error(`❌ Too many parse failures (${MAX_PARSE_FAILURES}), attempting graceful recovery`)
                      
                      // Send error indication to client
                      safeEnqueue(`data: ${JSON.stringify({ 
                        error: 'Streaming parse errors detected, switching to fallback mode',
                        canRetry: true 
                      })}\n\n`)
                      
                      // Break out of streaming loop
                      break
                    }
                  }
                }
              }

              // If buffer gets too large, something is wrong - reset it
              if (buffer.length > 10000) {
                console.warn('⚠️ Streaming buffer too large, resetting:', buffer.slice(0, 100))
                buffer = ''
              }
            }

            // Update the assistant message with complete response
            if (fullResponse && assistantMessageId) {
              await supabaseAdmin
                .from('messages')
                .update({
                  content: fullResponse
                })
                .eq('id', assistantMessageId)

              // Update conversation timestamp
              await supabaseAdmin
                .from('conversations')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', currentConversationId)

              // Updated assistant message
            }

            const totalTime = Date.now() - startTime
            // Streaming completed

            // Send final metadata including model information
            safeEnqueue(`data: ${JSON.stringify({ 
              conversationId: currentConversationId,
              performanceMs: totalTime,
              model: model?.label || 'AI'
            })}\n\n`)
            safeEnqueue('data: [DONE]\n\n')

          } catch (streamError) {
            console.error('Streaming processing error:', streamError)
            safeEnqueue(`data: ${JSON.stringify({ error: 'Streaming failed' })}\n\n`)
            safeEnqueue('data: [DONE]\n\n')
          } finally {
            reader.releaseLock()
          }

        } catch (error) {
          console.error('Streaming API error:', error)
          safeEnqueue(`data: ${JSON.stringify({ error: 'Internal server error' })}\n\n`)
          safeEnqueue('data: [DONE]\n\n')
        } finally {
          safeClose()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })

  } catch (error) {
    console.error('Streaming chat API error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}