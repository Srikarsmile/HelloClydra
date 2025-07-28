/**
 * Content filter to detect and block inappropriate AI responses
 */

// Only truly inappropriate patterns - keep this minimal
const INAPPROPRIATE_PATTERNS = [
  // Only catch very inappropriate flirtatious terms in greetings
  /\b(hey\s+cutie|hello\s+cutie|hi\s+cutie|what's up\s+cutie)\b/i,
  /\b(hey\s+gorgeous|hello\s+gorgeous|hi\s+gorgeous)\b/i,
  /\b(hey\s+beautiful|hello\s+beautiful|hi\s+beautiful)\b/i,
  
  // Overly romantic/sexual terms in context that's clearly inappropriate
  /\b(my love|beloved|sweetheart|darling)\s+(user|human|person)\b/i,
  
  // Only very explicit inappropriate content
  /\b(sexy|seductive)\s+(user|human|person)\b/i,
]

// Professional alternatives for common greetings
const PROFESSIONAL_ALTERNATIVES = {
  greeting: "Hello! How can I help you today?",
  help: "I'm here to assist you. What would you like to know?",
  welcome: "Welcome! I'm ready to help with any questions you have.",
  default: "I'm here to help. What can I assist you with?"
}

export interface ContentFilterResult {
  isAppropriate: boolean
  blockedPatterns: string[]
  suggestedReplacement?: string
}

/**
 * Check if a response contains inappropriate content
 */
export function filterResponse(response: string): ContentFilterResult {
  const blockedPatterns: string[] = []
  
  // Check against all inappropriate patterns
  for (const pattern of INAPPROPRIATE_PATTERNS) {
    if (pattern.test(response)) {
      blockedPatterns.push(pattern.source)
    }
  }
  
  const isAppropriate = blockedPatterns.length === 0
  
  // If inappropriate, suggest a professional alternative
  let suggestedReplacement: string | undefined
  if (!isAppropriate) {
    // If it's a simple greeting that got corrupted, replace with professional greeting
    if (response.length < 50 && /\b(hi|hello|hey|greetings)\b/i.test(response)) {
      suggestedReplacement = PROFESSIONAL_ALTERNATIVES.greeting
    } else {
      suggestedReplacement = PROFESSIONAL_ALTERNATIVES.default
    }
  }
  
  return {
    isAppropriate,
    blockedPatterns,
    suggestedReplacement
  }
}

/**
 * Clean a response by replacing inappropriate content with professional alternatives
 */
export function cleanResponse(response: string): string {
  const filterResult = filterResponse(response)
  
  if (!filterResult.isAppropriate && filterResult.suggestedReplacement) {
    console.warn('⚠️ Blocked inappropriate response:', {
      original: response.substring(0, 100),
      blockedPatterns: filterResult.blockedPatterns,
      replacement: filterResult.suggestedReplacement
    })
    return filterResult.suggestedReplacement
  }
  
  return response
}

/**
 * Log inappropriate responses for monitoring
 */
export function logInappropriateResponse(
  originalResponse: string, 
  blockedPatterns: string[], 
  userId?: string, 
  conversationId?: string
) {
  console.warn('🚨 INAPPROPRIATE RESPONSE DETECTED', {
    timestamp: new Date().toISOString(),
    userId: userId || 'anonymous',
    conversationId: conversationId || 'unknown',
    responsePreview: originalResponse.substring(0, 200),
    blockedPatterns,
    responseLength: originalResponse.length
  })
  
  // In production, you might want to send this to a monitoring service
  // or save to a database for analysis
}