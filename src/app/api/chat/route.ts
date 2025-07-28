import { auth } from '@clerk/nextjs/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getModelById, defaultModel } from '@/lib/models'
import { getChatCompletion } from '@/lib/openrouter-client'
import { callDeepInfraAPI, isDeepInfraModel } from '@/lib/deepinfra-client'
import { filterResponse, cleanResponse, logInappropriateResponse } from '@/lib/content-filter'
// Supermemory integration is now automatic via proxy - no manual imports needed
// import { FileAttachmentsDB } from '@/lib/file-attachments-db'

// Define ChatMessage type
type ChatMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string | Array<{
    type: 'text' | 'image_url'
    text?: string
    image_url?: { url: string }
  }>
}

export const dynamic = 'force-dynamic'

// Memory categorization is now handled automatically by Supermemory proxy
// Legacy helper functions removed - Supermemory automatically detects importance, preferences, and context

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { message, conversationId, isWebSearchEnabled, imageUrl, useDeepResearch, fileAttachments, modelId, isFeynmanMode } = body

    if (!message && !fileAttachments?.length) {
      return NextResponse.json({ error: 'Message or file attachment is required' }, { status: 400 })
    }

    // Get or create user with upsert for better performance
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        clerk_user_id: userId,
        email: 'user@example.com'
      }, {
        onConflict: 'clerk_user_id',
        ignoreDuplicates: false
      })
      .select('id')
      .single()

    if (userError || !user) {
      console.error('User upsert error:', userError)
      return NextResponse.json({ error: 'Failed to handle user' }, { status: 500 })
    }

    let currentConversationId = conversationId

    if (!conversationId) {
      const { data: newConversation, error: conversationError } = await supabaseAdmin
        .from('conversations')
        .insert({
          user_id: user.id,
          title: message.slice(0, 50) + '...'
        })
        .select('id')
        .single()

      if (conversationError) {
        console.error('Error creating conversation:', conversationError)
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
      }
      currentConversationId = newConversation.id
    }

    // Save user message to database and get the message ID for file attachments
    const { data: userMessage, error: userMessageError } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: currentConversationId,
        role: 'user',
        content: message || 'File attachment',
        image_url: imageUrl,
        has_attachments: fileAttachments?.length > 0
      })
      .select('id')
      .single()

    if (userMessageError) {
      console.error('Error saving user message:', userMessageError)
      return NextResponse.json({ error: 'Failed to save user message' }, { status: 500 })
    }

    // Save file attachments to database (non-blocking for speed)
    if (fileAttachments && fileAttachments.length > 0 && userMessage) {
      setImmediate(async () => {
        try {
          const { FileAttachmentsDB } = await import('@/lib/file-attachments-db')
          for (const file of fileAttachments) {
            await FileAttachmentsDB.saveFileAttachment(
              file,
              userMessage.id,
              currentConversationId,
              user.id
            )
          }
          console.log(`Saved ${fileAttachments.length} file attachments to database`)
        } catch (error) {
          console.error('Error saving file attachments:', error)
        }
      })
    }

    // Enable memory context with Supermemory integration
    let memoryContext = ''
    
    // Try to get relevant memory context using Supermemory
    if (process.env.SUPERMEMORY_API_KEY && userId && message) {
      try {
        const { smartSearch } = await import('@/lib/supermemory-integration')
        const relevantMemories = await smartSearch({
          query: message,
          userId: userId,
          limit: 5,
          conversationId: currentConversationId
        })
        
        if (relevantMemories && relevantMemories.length > 0) {
          memoryContext = '\n\n**Relevant Context:**\n' + 
            relevantMemories.map((memory: any) => `- ${memory.content}`).join('\n') + '\n'
          console.log(`🧠 Added ${relevantMemories.length} memory contexts`)
        }
      } catch (error) {
        console.warn('Memory context retrieval failed:', error)
        // Continue without memory context if retrieval fails
      }
    }

    // Process Supermemory file attachments and prepare content
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

    // Prepare message for OpenRouter
    const messageContent: Array<{
      type: 'text' | 'image_url'
      text?: string
      image_url?: { url: string }
    }> = []

    // Add text content (message + file content + memory context)
    const textContent = (message || '') + fileContent + memoryContext
    if (textContent.trim()) {
      messageContent.push({
        type: 'text' as const,
        text: textContent
      })
    }

    // Add image URL if provided
    if (imageUrl) {
      messageContent.push({
        type: 'image_url' as const,
        image_url: {
          url: imageUrl
        }
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
    const chatMessage: ChatMessage = {
      role: 'user',
      content: messageContent.length === 1 && messageContent[0].type === 'text' 
        ? messageContent[0].text! 
        : messageContent
    }

    // Get conversation history for context (reduced to 4 messages for maximum speed)
    const { data } = await supabaseAdmin
      .from('messages')
      .select('role, content')
      .eq('conversation_id', currentConversationId)
      .order('created_at', { ascending: false })
      .limit(4)
    const messageHistory = (data || []).reverse()

    // Handle deep research mode (with improved timeout and error handling)
    if (useDeepResearch && isWebSearchEnabled && process.env.EXA_API_KEY) {
      try {
        const researchPromise = (async () => {
          const Exa = (await import('exa-js')).default
          const exa = new Exa(process.env.EXA_API_KEY!)
        
          // Use enhanced search with synthesis (optimized for speed)
          const searchResponse = await exa.searchAndContents(message, {
            type: 'auto',
            numResults: 3, // Reduced for speed
            text: true,
            highlights: {
              numSentences: 2,
              highlightsPerUrl: 1,
              query: message
            },
            summary: {
              query: `Provide a concise research analysis of: ${message}`
            }
          })

          if (searchResponse.results && searchResponse.results.length > 0) {
            return '\n\n**Deep Research Results:**\n\n' + 
              '## Executive Summary\n' +
              (searchResponse.results[0]?.summary || 'Research analysis completed.') + '\n\n' +
              '## Key Findings\n' +
              searchResponse.results.map((result, index: number) => {
                return `### ${index + 1}. ${result.title || 'Untitled'}\n` +
                  `**Source:** ${result.url || 'Unknown source'}\n` +
                  `${result.summary || 'No summary available'}\n` +
                  (result.highlights ? result.highlights.map((h: string) => `- ${h}`).join('\n') + '\n' : '') +
                  '\n'
              }).join('')
          }
          
          return 'Research completed but no results were generated.'
        })()

        const timeoutPromise = new Promise<string>((_, reject) => 
          setTimeout(() => reject(new Error('Deep research timeout')), 8000) // 8 second timeout
        )

        const researchResult = await Promise.race([researchPromise, timeoutPromise])

        // Save research result as assistant message
        const { error: assistantMessageError } = await supabaseAdmin
          .from('messages')
          .insert({
            conversation_id: currentConversationId,
            role: 'assistant',
            content: researchResult
          })

        if (assistantMessageError) {
          console.error('Error saving research result:', assistantMessageError)
        }

        // Update conversation
        await supabaseAdmin
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', currentConversationId)

        return NextResponse.json({
          response: researchResult,
          conversationId: currentConversationId,
          isDeepResearch: true
        })

      } catch (error) {
        console.warn('Deep research failed or timed out:', error)
        // Fall through to regular chat if research fails or times out
      }
    }

    // Perform web search if enabled - return pure Exa results
    if (isWebSearchEnabled && process.env.EXA_API_KEY) {
      try {
        const searchPromise = (async () => {
          const Exa = (await import('exa-js')).default
          const exa = new Exa(process.env.EXA_API_KEY!)
          
          // Smart summary - only for complex queries
          const isSimpleQuery = /^(what|when|where|who|how|today|current|now|time|date)\s+(is|are|was|were)?\s*/.test(message.toLowerCase()) || 
                               message.toLowerCase().includes('today') || 
                               message.toLowerCase().includes('current') ||
                               message.trim().split(' ').length <= 3
          
          const searchOptions: any = {
            type: 'auto',
            numResults: 5,
            text: true,
            highlights: {
              numSentences: 2,
              highlightsPerUrl: 2,
              query: message
            }
          }

          // Only add summary for complex queries
          if (!isSimpleQuery) {
            searchOptions.summary = {
              query: `Provide a comprehensive summary about: ${message}`
            }
          }

          return await exa.searchAndContents(message, searchOptions)
        })()

        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Web search timeout')), 5000) // Increased timeout for better results
        )

        const searchResponse = await Promise.race([searchPromise, timeoutPromise])

        if (searchResponse?.results && Array.isArray(searchResponse.results) && searchResponse.results.length > 0) {
          // Format search results for card display
          const formattedResults = searchResponse.results.map((result: any) => ({
            url: result.url || '',
            title: result.title || 'Untitled',
            content: result.text || result.summary || '',
            published_date: result.publishedDate ? new Date(result.publishedDate).toLocaleDateString() : undefined,
            author: result.author,
            highlights: result.highlights || []
          }))

          // Return pure Exa search results instead of passing to Grok
          let exaResponse = `# Web Search Results for: "${message}"\n\n`
          
          // Add executive summary only if available and not a simple query
          const isSimpleQuery = /^(what|when|where|who|how|today|current|now|time|date)\s+(is|are|was|were)?\s*/.test(message.toLowerCase()) || 
                               message.toLowerCase().includes('today') || 
                               message.toLowerCase().includes('current') ||
                               message.trim().split(' ').length <= 3
          
          if (!isSimpleQuery && (searchResponse.results[0] as any)?.summary) {
            exaResponse += `## Summary\n${(searchResponse.results[0] as any)?.summary}\n\n`
          }
          
          exaResponse += `## Search Results (${searchResponse.results.length} found)\n\n`
          
          searchResponse.results.forEach((result: any, index: number) => {
            exaResponse += `### ${index + 1}. ${result.title || 'Untitled'}\n`
            exaResponse += `**Source:** ${result.url || 'Unknown source'}\n`
            if (result.publishedDate) {
              exaResponse += `**Published:** ${new Date(result.publishedDate).toLocaleDateString()}\n`
            }
            if (result.author) {
              exaResponse += `**Author:** ${result.author}\n`
            }
            exaResponse += `\n`
            
            if (result.summary) {
              exaResponse += `**Summary:** ${result.summary}\n\n`
            }
            
            if (result.highlights && result.highlights.length > 0) {
              exaResponse += `**Key Highlights:**\n`
              result.highlights.forEach((highlight: string) => {
                exaResponse += `• ${highlight}\n`
              })
              exaResponse += `\n`
            }
            
            if (result.text) {
              const excerpt = result.text.substring(0, 300)
              exaResponse += `**Excerpt:** ${excerpt}${result.text.length > 300 ? '...' : ''}\n\n`
            }
            
            exaResponse += `---\n\n`
          })
          
          exaResponse += `*Results powered by Exa search engine*`
          
          // Save the Exa response directly to database
          const { error: assistantMessageError } = await supabaseAdmin
            .from('messages')
            .insert({
              conversation_id: currentConversationId,
              role: 'assistant',
              content: exaResponse
            })

          if (assistantMessageError) {
            console.error('Error saving Exa response:', assistantMessageError)
          }

          // Update conversation
          await supabaseAdmin
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', currentConversationId)

          const totalTime = Date.now() - startTime
          console.log(`⚡ EXA SEARCH completed in ${totalTime}ms`)

          return NextResponse.json({
            response: exaResponse,
            conversationId: currentConversationId,
            isExaSearch: true,
            searchResults: formattedResults,
            searchQuery: message,
            performanceMs: totalTime
          })
        }
      } catch (error) {
        console.warn('Web search failed or timed out:', error)
        // Fall through to regular Grok response if search fails
      }
    }

    // Import centralized prompt system
    const { PromptPresets, getPromptModeFromRequest } = await import('@/lib/prompts')
    
    // Generate system prompt
    const promptMode = getPromptModeFromRequest(isWebSearchEnabled, undefined, isFeynmanMode)
    const systemPrompt = PromptPresets[promptMode || 'assistant']()

    const messages: ChatMessage[] = [
      // Add system prompt
      {
        role: 'system',
        content: systemPrompt
      },
      // Add conversation history
      ...messageHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      // Add current user message with memory context
      {
        role: 'user',
        content: (message || '') + memoryContext
      }
    ]

    // Use the selected model or default
    const model = getModelById(modelId)
    const selectedModel = model?.id || defaultModel


    // Call OpenRouter API with timeout for better performance
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 45000) // 45 second timeout for longer responses
    
let assistantMessage: string = ''
    
    try {
      if (isDeepInfraModel(selectedModel)) {
        console.log('🌌 Using DeepInfra for model:', selectedModel)
        
        if (!process.env.DEEPINFRA_API_KEY) {
          throw new Error('DeepInfra API key not configured')
        }
        
        const response = await callDeepInfraAPI({
          apiKey: process.env.DEEPINFRA_API_KEY,
          model: model?.deepinfraModel || 'moonshotai/Kimi-K2-Instruct',
          messages: messages,
          temperature: 0.7,
          maxTokens: 4096, // Increased for Kimi K2's capabilities
          topP: 0.95, // Slightly higher for more diverse responses
          topK: 50, // Add top-k sampling for better quality
          frequencyPenalty: 0.1, // Small penalty to reduce repetition
          presencePenalty: 0.1, // Small penalty to encourage topic diversity
          repetitionPenalty: 1.05, // DeepInfra specific parameter for better output
          userId // Enable automatic memory injection via Supermemory proxy
        })

        const aiResponse = await response.json()
        console.log('🔍 DeepInfra Response structure:', JSON.stringify(aiResponse, null, 2))
        
        // Handle OpenAI-compatible format (used by both OpenRouter and DeepInfra)
        if (aiResponse.choices && Array.isArray(aiResponse.choices) && aiResponse.choices[0]) {
          assistantMessage = aiResponse.choices[0].message?.content
        }
        
        // Handle alternative response formats from DeepInfra
        if (!assistantMessage) {
          assistantMessage = aiResponse.content || 
                            aiResponse.message?.content ||
                            aiResponse.text ||
                            aiResponse.response ||
                            aiResponse.output ||
                            aiResponse.generated_text
        }
        
        if (!assistantMessage || typeof assistantMessage !== 'string') {
          console.error('❌ DeepInfra unexpected response structure:', aiResponse)
          throw new Error('No valid AI response content received from DeepInfra')
        }
        
        console.log('✅ DeepInfra response received, length:', assistantMessage?.length || 0)
      } else {
        // Use enhanced OpenRouter client with Supermemory integration
        // Convert ChatMessage[] to OpenAI ChatCompletionMessageParam[]
        const openAIMessages = messages as any // Type cast to work with OpenAI SDK
        
        const response = await getChatCompletion(
          selectedModel,
          openAIMessages,
          {
            temperature: 0.7,
            max_tokens: 2500,
            top_p: 0.9,
            frequency_penalty: 0,
            presence_penalty: 0,
            userId // Enable automatic memory injection via Supermemory proxy
          }
        )
        
        assistantMessage = response?.content || ''
      }

      clearTimeout(timeoutId)

      if (!assistantMessage) {
        return NextResponse.json({ error: 'No response from AI' }, { status: 500 })
      }

      // Filter response for inappropriate content
      const filterResult = filterResponse(assistantMessage)
      if (!filterResult.isAppropriate) {
        logInappropriateResponse(
          assistantMessage, 
          filterResult.blockedPatterns, 
          userId, 
          currentConversationId
        )
        assistantMessage = cleanResponse(assistantMessage)
        console.log('✅ Response cleaned by content filter')
      }

    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('AI API timeout')
        return NextResponse.json({ error: 'AI response timeout - please try again' }, { status: 408 })
      }
      
      const provider = isDeepInfraModel(selectedModel) ? 'DeepInfra' : 'OpenRouter'
      console.error(`${provider} API error:`, error)
      
      if (error instanceof Error && error.message.includes('API key not configured')) {
        return NextResponse.json({ error: `${provider} API key not configured` }, { status: 500 })
      }
      
      return NextResponse.json({ error: 'Failed to get AI response' }, { status: 500 })
    }

    // Batch final database operations
    const [assistantMessageResult] = await Promise.all([
      supabaseAdmin
        .from('messages')
        .insert({
          conversation_id: currentConversationId,
          role: 'assistant',
          content: assistantMessage,
          model: model?.label || 'AI' // Save the model label
        }),
      supabaseAdmin
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', currentConversationId)
    ])

    if (assistantMessageResult.error) {
      console.error('Error saving assistant message:', assistantMessageResult.error)
      return NextResponse.json({ error: 'Failed to save AI response' }, { status: 500 })
    }

    // Memory storage is now automatic via Supermemory proxy integration
    // The LLM API calls above automatically handle memory injection and storage
    console.log('🧠 Memory handling is now automatic via Supermemory proxy integration')

    const totalTime = Date.now() - startTime
    console.log(`⚡ REGULAR API completed in ${totalTime}ms`)

    return NextResponse.json({
      response: assistantMessage,
      conversationId: currentConversationId,
      performanceMs: totalTime,
      model: model?.label || 'AI' // Return the model label
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}