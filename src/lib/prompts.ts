/**
 * Centralized prompt management system
 * Provides consistent, customizable prompts across all chat routes
 */

// Base prompt templates
export const FEYNMAN_PROMPT = `Apply the Feynman Technique to ALL explanations:
1. Use only simple words a 12-year-old would know
2. When you must use a complex term, immediately explain it
3. Build knowledge step-by-step from basics
4. Test understanding with "If you understand X, you can explain Y"

Start every explanation with the simplest possible version.`

export const BASE_ASSISTANT_PROMPT = `You are a helpful AI assistant. Be concise, accurate, and friendly in your responses.`


// Prompt configuration interface
export interface PromptConfig {
  mode?: 'assistant' | 'feynman'
  includeDate?: boolean
  includeWebSearch?: boolean
  includeFileContext?: boolean
  customInstructions?: string
  currentDate?: string
}

/**
 * Generate a system prompt based on configuration
 */
export function generateSystemPrompt(config: PromptConfig = {}): string {
  const {
    mode = 'assistant',
    includeDate = true,
    includeWebSearch = false,
    includeFileContext = false,
    customInstructions = '',
    currentDate
  } = config

  let systemPrompt = ''

  // Add base prompt based on mode
  switch (mode) {
    case 'feynman':
      systemPrompt = FEYNMAN_PROMPT
      break
    case 'assistant':
    default:
      systemPrompt = BASE_ASSISTANT_PROMPT
      break
  }

  // Add date context if requested
  if (includeDate) {
    const dateString = currentDate || new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    systemPrompt += `\n\nCurrent date: ${dateString}`
  }

  // Add web search context if enabled
  if (includeWebSearch) {
    systemPrompt += `\n\nYou have access to web search capabilities. When users ask questions that would benefit from current information, you can search for relevant, up-to-date data.`
  }

  // Add file attachment context if enabled
  if (includeFileContext) {
    systemPrompt += `\n\nYou can process and analyze uploaded files including documents, images, and other attachments. Reference uploaded content when relevant to the conversation.`
  }

  // Add custom instructions
  if (customInstructions.trim()) {
    systemPrompt += `\n\n${customInstructions.trim()}`
  }

  return systemPrompt.trim()
}

/**
 * Quick preset generators for common use cases
 */
export const PromptPresets = {
  /**
   * Standard assistant mode
   */
  assistant: (customInstructions?: string): string => 
    generateSystemPrompt({ 
      mode: 'assistant', 
      customInstructions 
    }),


  /**
   * Feynman teaching mode - explains everything simply
   */
  feynman: (customInstructions?: string): string => 
    generateSystemPrompt({ 
      mode: 'feynman', 
      customInstructions 
    }),

  /**
   * Full-featured mode with all capabilities
   */
  enhanced: (customInstructions?: string): string => 
    generateSystemPrompt({ 
      mode: 'assistant',
      includeWebSearch: true,
      includeFileContext: true,
      customInstructions 
    })
}

/**
 * Legacy compatibility - maps old prompt patterns to new system
 */
export function getLegacyPrompt(isWebSearchEnabled: boolean = false): string {
  return isWebSearchEnabled 
    ? PromptPresets.enhanced()
    : PromptPresets.assistant()
}

/**
 * Validate and sanitize custom instructions
 */
export function sanitizeCustomInstructions(instructions: string): string {
  // Basic sanitization - remove potentially harmful content
  return instructions
    .trim()
    .replace(/\n{3,}/g, '\n\n') // Limit excessive newlines
    .slice(0, 1000) // Limit length
}

/**
 * Get appropriate prompt mode from request parameters
 */
export function getPromptModeFromRequest(
  isWebSearchEnabled?: boolean, 
  requestedMode?: string,
  isFeynmanMode?: boolean
): PromptConfig['mode'] {
  // Check for explicit Feynman mode first
  if (isFeynmanMode) {
    return 'feynman'
  }
  
  if (requestedMode && ['assistant', 'feynman'].includes(requestedMode)) {
    return requestedMode as PromptConfig['mode']
  }
  
  return 'assistant'
}