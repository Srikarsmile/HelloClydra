import OpenAI from 'openai';

// Create singleton client instances
let openRouterClient: OpenAI | null = null;
let supermemoryClient: OpenAI | null = null;

/**
 * Get or create the Supermemory-enhanced OpenRouter client instance
 * This client routes through Supermemory proxy for automatic memory injection
 */
export function getOpenRouterClient(userId?: string): OpenAI {
  // Use Supermemory proxy only for infinite context (not memory features)
  if (process.env.SUPERMEMORY_API_KEY && userId) {
    if (!supermemoryClient) {
      if (!process.env.OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY environment variable is not set');
      }

      supermemoryClient = new OpenAI({
        baseURL: 'https://api.supermemory.ai/v3/https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY,
        defaultHeaders: {
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
          'X-Title': process.env.NEXT_PUBLIC_SITE_NAME || 'Clydra AI',
          'x-api-key': process.env.SUPERMEMORY_API_KEY,
          'x-sm-user-id': userId,
        },
      });
    }
    return supermemoryClient;
  }

  // Fallback to direct OpenRouter
  if (!openRouterClient) {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY environment variable is not set');
    }

    openRouterClient = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': process.env.NEXT_PUBLIC_SITE_NAME || 'Clydra AI',
      },
    });
  }

  return openRouterClient;
}

/**
 * Example usage with Kimi K2 model
 */
export async function exampleKimiK2Chat(message: string, userId?: string) {
  const client = getOpenRouterClient(userId);
  
  const completion = await client.chat.completions.create({
    model: 'moonshotai/kimi-k2',
    messages: [
      {
        role: 'user',
        content: message,
      }
    ],
    temperature: 0.7,
    max_tokens: 2500,
  });

  return completion.choices[0]?.message?.content;
}

/**
 * Stream chat completion using OpenRouter with optional Supermemory enhancement
 */
export async function streamChatCompletion(
  model: string,
  messages: OpenAI.ChatCompletionMessageParam[],
  options?: Partial<OpenAI.ChatCompletionCreateParams> & { userId?: string }
) {
  const { userId, ...openAIOptions } = options || {};
  
  try {
    // Use Supermemory-enhanced client for infinite context
    const client = getOpenRouterClient(userId);
    
    const stream = await client.chat.completions.create({
      model,
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2500,
      ...openAIOptions,
    });

    return stream;
  } catch (error: unknown) {
    // If Supermemory fails, fallback to direct OpenRouter
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (userId && process.env.SUPERMEMORY_API_KEY && errorMessage.includes('supermemory')) {
      console.warn('Supermemory proxy failed, falling back to direct OpenRouter:', errorMessage);
      const directClient = getOpenRouterClient(); // Without userId to force direct connection
      
      const stream = await directClient.chat.completions.create({
        model,
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2500,
        ...openAIOptions,
      });

      return stream;
    }
    
    throw error;
  }
}

/**
 * Non-streaming chat completion using OpenRouter with infinite context
 */
export async function getChatCompletion(
  model: string,
  messages: OpenAI.ChatCompletionMessageParam[],
  options?: Partial<OpenAI.ChatCompletionCreateParams> & { userId?: string }
) {
  const { userId, ...openAIOptions } = options || {};
  
  try {
    // Use Supermemory-enhanced client for infinite context
    const client = getOpenRouterClient(userId);
    
    const completion = await client.chat.completions.create({
      model,
      messages,
      stream: false,
      temperature: 0.7,
      max_tokens: 2500,
      ...openAIOptions,
    }) as OpenAI.ChatCompletion;

    return completion.choices[0]?.message;
  } catch (error: unknown) {
    // If Supermemory fails, fallback to direct OpenRouter
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (userId && process.env.SUPERMEMORY_API_KEY && errorMessage.includes('supermemory')) {
      console.warn('Supermemory proxy failed, falling back to direct OpenRouter:', errorMessage);
      const directClient = getOpenRouterClient(); // Without userId to force direct connection
      
      const completion = await directClient.chat.completions.create({
        model,
        messages,
        stream: false,
        temperature: 0.7,
        max_tokens: 2500,
        ...openAIOptions,
      }) as OpenAI.ChatCompletion;

      return completion.choices[0]?.message;
    }
    
    throw error;
  }
}

/**
 * Check if Supermemory enhancement is available
 */
export function isSupermemoryAvailable(): boolean {
  return !!(process.env.SUPERMEMORY_API_KEY && process.env.OPENROUTER_API_KEY);
}

/**
 * Get client configuration info
 */
export function getClientInfo(userId?: string) {
  return {
    hasSupermemory: !!process.env.SUPERMEMORY_API_KEY,
    hasOpenRouter: !!process.env.OPENROUTER_API_KEY,
    willUseSupermemory: !!(process.env.SUPERMEMORY_API_KEY && userId),
    userId: userId || null
  };
}