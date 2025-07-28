import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'edge' // Use edge runtime for faster cold starts
export const maxDuration = 120 // 2 minutes max duration for edge runtime

// Pre-create reusable headers
const AI_HEADERS = {
  'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
  'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  'X-Title': 'Clydra AI',
  'Content-Type': 'application/json'
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let userId: string | null = null
  
  try {
    // Start parsing body immediately
    const bodyPromise = request.json()
    
    // Quick auth check
    const authResult = await auth()
    userId = authResult.userId
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Debug: Log user ID for Supermemory
    console.log('🔍 Debug - User ID for Supermemory:', userId)

    const body = await bodyPromise
    const { message, conversationId, isWebSearchEnabled = false, modelId, isFeynmanMode = false } = body

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Processing message...

    // Start user operation first, then get conversation history and make AI request
    const userResult = await Promise.race([
      supabaseAdmin
        .from('users')
        .upsert({
          clerk_user_id: userId,
          email: 'user@example.com'
        }, {
          onConflict: 'clerk_user_id'
        })
        .select('id')
        .single(),
      new Promise<any>((_, reject) => 
        setTimeout(() => reject(new Error('User timeout')), 2000)
      )
    ])

    if (!userResult?.data) {
      console.error('User operation failed')
      return NextResponse.json({ error: 'User operation failed' }, { status: 500 })
    }

    const user = userResult.data

    // Get recent conversation context - let Supermemory handle infinite context
    let recentMessages: any[] = []
    const hasSupermemory = !!(process.env.SUPERMEMORY_API_KEY && userId)
    
    if (conversationId && !hasSupermemory) {
      // Only fetch manual context if Supermemory is NOT available
      try {
        const { data: previousMessages } = await supabaseAdmin
          .from('messages')
          .select('role, content, created_at')
          .eq('conversation_id', conversationId)
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

    // Make AI request with Supermemory and conversation context
    const aiResult = await Promise.race([
      makeAIRequest(message, isWebSearchEnabled, modelId, userId, recentMessages, isFeynmanMode),
      new Promise<any>((_, reject) => 
        setTimeout(() => reject(new Error('AI timeout')), 50000) // 50 seconds - reduced for faster failover
      )
    ]).catch(error => ({ status: 'rejected', reason: error }))

    // Handle AI result
    if (aiResult.status === 'rejected') {
      const error = aiResult.reason
      console.error('AI request failed:', {
        error: error.message || error,
        stack: error.stack,
        userId,
        modelId,
        messageLength: message.length,
        totalTime: Date.now() - startTime
      })
      
      // Return more specific error messages
      if (error.message?.includes('timeout') || 
          error.message?.includes('AI timeout') ||
          error.message?.includes('Supermemory proxy timeout') ||
          error.name === 'AbortError' ||
          error instanceof DOMException && error.name === 'AbortError') {
        return NextResponse.json({ 
          error: 'Request timeout - the AI model is taking too long to respond. Please try again.',
          details: 'timeout',
          suggestion: 'Try using a different model or simplifying your request.'
        }, { status: 504 })
      }

      // Handle specific API errors with helpful messages
      if (error.message?.includes('DeepInfra API error')) {
        return NextResponse.json({ 
          error: 'AI service temporarily unavailable. The model provider is experiencing issues.',
          details: 'provider_error',
          suggestion: 'Please try again in a few moments or switch to a different model.'
        }, { status: 503 })
      }
      
      return NextResponse.json({ 
        error: 'AI service temporarily unavailable. Please try again.',
        details: error.message || 'unknown'
      }, { status: 500 })
    }

    const { content: assistantMessage, model: modelLabel } = aiResult

    // Handle conversation operations
    let currentConversationId = conversationId
    if (!conversationId) {
      // Create conversation and wait for it to complete
      try {
        const conversationResult = await supabaseAdmin
          .from('conversations')
          .insert({
            user_id: user.id,
            title: message.slice(0, 50) + '...'
          })
          .select('id')
          .single()
        
        if (conversationResult.data) {
          currentConversationId = conversationResult.data.id
          // Created new conversation
          // Save messages after conversation is created
          saveMessages(conversationResult.data.id, message, assistantMessage, modelLabel)
            .catch(err => console.error('Message save error:', err))
        }
      } catch (err) {
        console.error('Conversation creation error:', err)
      }
    } else {
      // Save messages immediately for existing conversation
      saveMessages(conversationId, message, assistantMessage, modelLabel)
        .catch(err => console.error('Message save error:', err))
    }

    const totalTime = Date.now() - startTime
    // API completed

    return NextResponse.json({
      response: assistantMessage,
      conversationId: currentConversationId,
      performanceMs: totalTime,
      model: modelLabel
    })

  } catch (error) {
    const totalTime = Date.now() - startTime
    console.error('Fast chat API error:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      userId,
      totalTime,
      timestamp: new Date().toISOString()
    })
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'unknown'
    }, { status: 500 })
  }
}

async function makeAIRequest(message: string, isWebSearchEnabled: boolean, modelId?: string, userId?: string, recentMessages: any[] = [], isFeynmanMode: boolean = false): Promise<{content: string, model: string}> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 45000) // 45 second internal timeout
  
  // Import model functions and DeepInfra client
  const { getModelById, defaultModel } = await import('@/lib/models')
  const { callDeepInfraAPI, isDeepInfraModel } = await import('@/lib/deepinfra-client')
  
  // Use the selected model or default
  const model = modelId ? getModelById(modelId) : getModelById(defaultModel)
  const selectedModel = model?.id || defaultModel
  // Using selected model
  
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  
  // Import centralized prompt system
  const { PromptPresets, getPromptModeFromRequest } = await import('@/lib/prompts')
  
  // Get appropriate prompt mode and generate system prompt
  const promptMode = getPromptModeFromRequest(isWebSearchEnabled, undefined, isFeynmanMode)
  const systemPrompt = PromptPresets[promptMode || 'assistant']()

  try {
    let response: Response
    
    // Check if this model should use DeepInfra
    if (isDeepInfraModel(selectedModel)) {
      // Using DeepInfra with Supermemory
      if (!process.env.DEEPINFRA_API_KEY) {
        throw new Error('DeepInfra API key not configured')
      }
      
      // Debug: Check Supermemory configuration
      console.log('🧠 Supermemory Debug (DeepInfra):', {
        hasSupermemoryKey: !!process.env.SUPERMEMORY_API_KEY,
        userId: userId,
        model: selectedModel
      })

      // Build messages with recent context for Supermemory
      const messagesForAI = [
        {
          role: 'system',
          content: systemPrompt
        },
        // Include recent conversation context
        ...recentMessages,
        {
          role: 'user',
          content: message
        }
      ]

      response = await callDeepInfraAPI({
        apiKey: process.env.DEEPINFRA_API_KEY,
        model: selectedModel,
        messages: messagesForAI,
        temperature: 0.7,
        maxTokens: 2500, // Increased for Gemini models
        stream: false,
        userId: userId, // Enable Supermemory infinite memory
        signal: controller.signal // Pass abort signal for timeout control
      })
    } else {
      // Use OpenRouter with Supermemory integration
      try {
        const { getChatCompletion } = await import('@/lib/openrouter-client')
        
        // Build messages with recent context for Supermemory
        const messagesForAI = [
          {
            role: 'system',
            content: systemPrompt
          },
          // Include recent conversation context
          ...recentMessages,
          {
            role: 'user',
            content: message
          }
        ]

        const completion = await getChatCompletion(
          selectedModel,
          messagesForAI,
          {
            userId: userId, // Enable Supermemory infinite memory
            temperature: 0.7,
            max_tokens: 2500
          }
        )
        
        // Convert OpenAI completion to our expected format
        const aiResponse = {
          choices: [{
            message: completion
          }]
        }
        
        clearTimeout(timeoutId)
        
        let assistantMessage: string | undefined
        
        if (aiResponse.choices && Array.isArray(aiResponse.choices) && aiResponse.choices[0]) {
          assistantMessage = aiResponse.choices[0].message?.content || undefined
        }
        
        if (!assistantMessage || typeof assistantMessage !== 'string') {
          throw new Error('No valid AI response content received')
        }
        
        return { content: assistantMessage, model: model?.label || 'Unknown' }
        
      } catch (error) {
        console.warn('Supermemory OpenRouter failed, falling back to direct:', error)
        // Fallback to direct OpenRouter
        response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: AI_HEADERS,
          body: JSON.stringify({
            model: selectedModel,
            messages: [
              {
                role: 'system',
                content: systemPrompt
              },
              {
                role: 'user',
                content: message
              }
            ],
            temperature: 0.7,
            max_tokens: 2500,
            stream: false
          }),
          signal: controller.signal
        })
      }
    }
    
    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      const provider = isDeepInfraModel(selectedModel) ? 'DeepInfra' : 'OpenRouter'
      throw new Error(`${provider} error: ${errorText}`)
    }

    const aiResponse = await response.json()
    // AI response received
    
    let assistantMessage: string | undefined
    
    // Handle OpenAI-compatible format (used by both OpenRouter and DeepInfra)
    if (aiResponse.choices && Array.isArray(aiResponse.choices) && aiResponse.choices[0]) {
      assistantMessage = aiResponse.choices[0].message?.content
    }
    
    // Handle alternative response formats
    if (!assistantMessage) {
      assistantMessage = aiResponse.content || 
                        aiResponse.message?.content ||
                        aiResponse.text ||
                        aiResponse.response ||
                        aiResponse.output ||
                        aiResponse.generated_text
    }

    if (!assistantMessage || typeof assistantMessage !== 'string') {
      console.error('❌ Unexpected response structure:', aiResponse)
      console.error('❌ Parsed assistant message:', assistantMessage)
      throw new Error('No valid AI response content received')
    }
    
    // AI response parsed successfully

    clearTimeout(timeoutId)
    return { content: assistantMessage, model: model?.label || 'Unknown' }

  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('AI request timeout')
    }
    throw error
  } finally {
    // Ensure timeout is always cleared
    clearTimeout(timeoutId)
  }
}

async function saveMessages(conversationId: string, userMessage: string, assistantMessage: string, model: string) {
  // Batch insert both messages
  return supabaseAdmin
    .from('messages')
    .insert([
      {
        conversation_id: conversationId,
        role: 'user',
        content: userMessage
      },
      {
        conversation_id: conversationId,
        role: 'assistant',
        content: assistantMessage,
        model: model // Save the model information
      }
    ])
}
