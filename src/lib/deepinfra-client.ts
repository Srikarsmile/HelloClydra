type ChatMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string | Array<{
    type: 'text' | 'image_url'
    text?: string
    image_url?: { url: string }
  }>
}

interface DeepInfraConfig {
  apiKey: string
  model: string
  messages: ChatMessage[]
  stream?: boolean
  temperature?: number
  maxTokens?: number
  topP?: number
  topK?: number
  minP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  repetitionPenalty?: number
  stop?: string[]
  seed?: number
  userId?: string // For Supermemory integration
  signal?: AbortSignal // For timeout control
}

export async function callDeepInfraAPI({
  apiKey,
  model,
  messages,
  stream = false,
  temperature = 0.7,
  maxTokens = 4096,
  topP = 0.9,
  topK = 0,
  minP = 0,
  frequencyPenalty = 0,
  presencePenalty = 0,
  repetitionPenalty = 1,
  stop = undefined,
  seed = undefined,
  userId,
  signal
}: DeepInfraConfig) {
  return callDeepInfraAPIWithRetry({
    apiKey,
    model,
    messages,
    stream,
    temperature,
    maxTokens,
    topP,
    topK,
    minP,
    frequencyPenalty,
    presencePenalty,
    repetitionPenalty,
    stop,
    seed,
    userId,
    signal
  }, 0)
}

async function callDeepInfraAPIWithRetry(config: DeepInfraConfig, retryCount: number): Promise<Response> {
  const { apiKey, model, messages, stream, temperature, maxTokens, topP, topK, minP, 
          frequencyPenalty, presencePenalty, repetitionPenalty, stop, seed, userId, signal } = config
  
  const MAX_RETRIES = 2
  const isRetry = retryCount > 0
  
  // Map our internal model ID to DeepInfra's model ID
  const deepInfraModelId = getDeepInfraModelId(model)
  const logPrefix = isRetry ? `🔄 Retry ${retryCount}/${MAX_RETRIES}` : '🌌'
  // console.log(`${logPrefix} Calling DeepInfra API for model:`, model, '-> DeepInfra ID:', deepInfraModelId)
  
  // Use Supermemory proxy for infinite context (not memory features)
  const shouldUseSupermemory = !!(process.env.SUPERMEMORY_API_KEY && userId)
  const baseURL = shouldUseSupermemory 
    ? 'https://api.supermemory.ai/v3/https://api.deepinfra.com/v1/openai/chat/completions'
    : 'https://api.deepinfra.com/v1/openai/chat/completions'
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  }
  
  // Add Supermemory headers if using proxy for infinite context
  if (shouldUseSupermemory) {
    headers['x-api-key'] = process.env.SUPERMEMORY_API_KEY!
    headers['x-sm-user-id'] = userId!
    // console.log('🔄 Using Supermemory proxy for infinite context with user:', userId)
  }
  
  try {
    // For Supermemory proxy, use a shorter timeout to fail faster
    let fetchPromise = fetch(baseURL, {
      method: 'POST',
      headers,
      signal, // Add abort signal for timeout control
      body: JSON.stringify({
        model: deepInfraModelId,
        messages,
        stream,
        temperature,
        max_tokens: maxTokens,
        top_p: topP,
        top_k: (topK && topK > 0) ? topK : undefined,
        min_p: (minP && minP > 0) ? minP : undefined,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty,
        repetition_penalty: repetitionPenalty !== 1 ? repetitionPenalty : undefined,
        stop: stop?.length ? stop : undefined,
        seed: seed
      })
    })

    // If using Supermemory, add an additional faster timeout for quicker fallback
    if (shouldUseSupermemory) {
      const supermemoryTimeout = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Supermemory proxy timeout')), 30000) // 30 seconds for proxy
      )
      fetchPromise = Promise.race([fetchPromise, supermemoryTimeout])
    }

    const response = await fetchPromise

    if (!response.ok) {
      const errorText = await response.text()
      console.error('DeepInfra API error:', errorText)
      
      // If Supermemory proxy failed, try direct DeepInfra as fallback
      if (shouldUseSupermemory && (
        response.status >= 500 || 
        response.status === 502 || 
        response.status === 503 || 
        response.status === 504 ||
        errorText.includes('supermemory') ||
        errorText.includes('timeout') ||
        errorText.includes('gateway')
      )) {
        console.warn('Supermemory proxy failed, falling back to direct DeepInfra')
        return callDeepInfraAPIWithRetry({
          apiKey,
          model,
          messages,
          stream,
          temperature,
          maxTokens,
          topP,
          topK,
          minP,
          frequencyPenalty,
          presencePenalty,
          repetitionPenalty,
          stop,
          seed,
          signal
          // Note: userId is intentionally omitted to force direct connection
        }, 0)
      }
      
      throw new Error(`DeepInfra API error: ${response.status} ${errorText}`)
    }

    // console.log('✅ DeepInfra API call successful', shouldUseSupermemory ? '(with Supermemory infinite context)' : '(direct)')
    return response
  } catch (error: unknown) {
    // If network error and we were using Supermemory, try direct fallback
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (shouldUseSupermemory && (
      errorMessage.includes('fetch') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('network') ||
      errorMessage.includes('abort') ||
      errorMessage.includes('Supermemory proxy timeout') ||
      error instanceof DOMException && error.name === 'AbortError'
    )) {
      console.warn('Supermemory proxy network error, falling back to direct DeepInfra:', errorMessage)
      return callDeepInfraAPIWithRetry({
        apiKey,
        model,
        messages,
        stream,
        temperature,
        maxTokens,
        topP,
        topK,
        minP,
        frequencyPenalty,
        presencePenalty,
        repetitionPenalty,
        stop,
        seed,
        signal // Pass signal to network error fallback too
        // Note: userId is intentionally omitted to force direct connection
      }, 0)
    }
    
    // Check if we should retry for certain error types
    const shouldRetry = retryCount < MAX_RETRIES && (
      errorMessage.includes('fetch') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('network') ||
      errorMessage.includes('ECONNRESET') ||
      errorMessage.includes('502') ||
      errorMessage.includes('503') ||
      errorMessage.includes('504') ||
      (error instanceof DOMException && error.name === 'AbortError')
    )

    if (shouldRetry) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 5000) // Exponential backoff, max 5s
      console.warn(`🔄 Retrying DeepInfra call after ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`)
      
      await new Promise(resolve => setTimeout(resolve, delay))
      
      return callDeepInfraAPIWithRetry(config, retryCount + 1)
    }
    
    throw error
  }
}

function getDeepInfraModelId(modelId: string): string {
  // Map our internal model IDs to DeepInfra model IDs
  const modelMap: Record<string, string> = {
    'moonshotai/kimi-k2': 'moonshotai/Kimi-K2-Instruct',
    'kimi-k2': 'moonshotai/Kimi-K2-Instruct',
    'qwen/qwen3-235b-a22b-thinking-2507': 'Qwen/Qwen3-235B-A22B-Thinking-2507',
    'deepseek-ai/deepseek-r1-0528-turbo': 'deepseek-ai/DeepSeek-R1-0528-Turbo'
  }
  
  return modelMap[modelId] || modelId
}

export function isDeepInfraModel(modelId: string): boolean {
  // Check if this is a model that should use DeepInfra instead of OpenRouter
  return modelId === 'moonshotai/kimi-k2' || 
         modelId === 'kimi-k2' || 
         modelId === 'qwen/qwen3-235b-a22b-thinking-2507' ||
         modelId === 'deepseek-ai/deepseek-r1-0528-turbo'
}

/**
 * Check if Supermemory enhancement is available for DeepInfra
 */
export function isSupermemoryAvailableForDeepInfra(): boolean {
  return !!(process.env.SUPERMEMORY_API_KEY && process.env.DEEPINFRA_API_KEY)
}

/**
 * Get DeepInfra client configuration info
 */
export function getDeepInfraClientInfo(userId?: string) {
  return {
    hasSupermemory: !!process.env.SUPERMEMORY_API_KEY,
    hasDeepInfra: !!process.env.DEEPINFRA_API_KEY,
    willUseSupermemory: !!(process.env.SUPERMEMORY_API_KEY && userId),
    userId: userId || null
  }
}