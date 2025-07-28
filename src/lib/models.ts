export interface LLMModel {
  id: string;
  label: string;
  provider: 'openrouter' | 'google' | 'anthropic' | 'xai' | 'deepinfra';
  maxTokens: number;
  cost: {
    prompt: number;  // $ per million tokens
    completion: number;  // $ per million tokens
  };
  speedLabel: string;
  description?: string;
  icon?: string;
  tooltip?: string;
  deepinfraModel?: string;  // DeepInfra specific model ID if different
}

export const models: Record<string, LLMModel> = {
  // Fixed model IDs - key should match the id field
  'x-ai/grok-4': {
    id: 'x-ai/grok-4',
    label: 'Grok 4',
    provider: 'xai',
    maxTokens: 8192,
    cost: {
      prompt: 15.0,
      completion: 60.0
    },
    speedLabel: '⚡ Fast',
    description: 'X.AI\'s fastest model',
    icon: '🤖'
  },
  
  'google/gemini-2.5-flash': {
    id: 'google/gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    provider: 'google',
    maxTokens: 1000000,
    cost: {
      prompt: 0.075,
      completion: 0.30
    },
    speedLabel: '⚡ Fast',
    description: 'Google\'s multimodal model with vision capabilities',
    icon: '👁️',
    tooltip: 'Gemini 2.5 Flash – 1M ctx, supports images'
  },
  
  'google/gemini-2.5-pro': {
    id: 'google/gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    provider: 'google',
    maxTokens: 2000000,
    cost: {
      prompt: 1.25,
      completion: 5.00
    },
    speedLabel: '🧠 Smart',
    description: 'Google\'s most capable multimodal model with vision',
    icon: '🔬',
    tooltip: 'Gemini 2.5 Pro – 2M ctx, advanced vision & reasoning'
  },
  
  'anthropic/claude-sonnet-4': {
    id: 'anthropic/claude-sonnet-4',
    label: 'Claude Sonnet 4',
    provider: 'anthropic',
    maxTokens: 200000,
    cost: {
      prompt: 3.0,
      completion: 15.0
    },
    speedLabel: '🪽 Balanced',
    description: 'Anthropic\'s balanced model',
    icon: '🪽',
    tooltip: 'Sonnet 4 – 200k ctx'
  },
  
  'moonshotai/kimi-k2': {
    id: 'moonshotai/kimi-k2',
    label: 'Kimi K2',
    provider: 'deepinfra',  // Use DeepInfra instead of OpenRouter
    deepinfraModel: 'moonshotai/Kimi-K2-Instruct',  // DeepInfra model ID
    maxTokens: 63000, // Context window
    cost: {
      prompt: 0.27,  // DeepInfra pricing: $0.27 per million tokens
      completion: 0.27  // DeepInfra pricing: $0.27 per million tokens
    },
    speedLabel: '🚀 Fast',
    description: 'Advanced Chinese & English reasoning with 63k context',
    icon: '🌙',
    tooltip: 'Kimi K2 via DeepInfra – 63k ctx, optimized parameters'
  },

  'qwen/qwen3-235b-a22b-thinking-2507': {
    id: 'qwen/qwen3-235b-a22b-thinking-2507',
    label: 'Qwen3 235B Think',
    provider: 'deepinfra',
    deepinfraModel: 'Qwen/Qwen3-235B-A22B-Thinking-2507',
    maxTokens: 128000,
    cost: {
      prompt: 2.0,
      completion: 6.0
    },
    speedLabel: '🧠 Smart',
    description: 'Advanced reasoning model with thinking capabilities',
    icon: '🎯',
    tooltip: 'Qwen3 235B – 128k ctx, enhanced reasoning'
  },

  'deepseek-ai/deepseek-r1-0528-turbo': {
    id: 'deepseek-ai/deepseek-r1-0528-turbo',
    label: 'DeepSeek R1 Turbo',
    provider: 'deepinfra',
    deepinfraModel: 'deepseek-ai/DeepSeek-R1-0528-Turbo',
    maxTokens: 64000,
    cost: {
      prompt: 0.27,
      completion: 1.10
    },
    speedLabel: '🚀 Fast',
    description: 'DeepSeek R1 with advanced reasoning capabilities',
    icon: '🔍',
    tooltip: 'DeepSeek R1 Turbo – 64k ctx, reasoning model'
  }
};

// Changed from 'moonshotai/kimi-k2' due to inappropriate responses
export const defaultModel = 'google/gemini-2.5-flash';

export function getModel(modelId: string): LLMModel | undefined {
  return models[modelId];
}

export function getAvailableModels(): LLMModel[] {
  return Object.values(models);
}

export function isModelAvailable(modelId: string): boolean {
  if (!(modelId in models)) return false;
  
  const model = models[modelId];
  if (model.provider === 'deepinfra') {
    return !!process.env.DEEPINFRA_API_KEY;
  }
  
  return !!process.env.OPENROUTER_API_KEY;
}

export function getModelById(modelId: string): LLMModel | undefined {
  // Check if it's a short id first (like 'kimi-k2')
  if (models[modelId]) {
    return models[modelId];
  }
  
  // Otherwise check by full OpenRouter ID (like 'moonshotai/kimi-k2')
  return Object.values(models).find(model => model.id === modelId);
}
