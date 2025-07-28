// Input validation utilities to prevent injection attacks

// Sanitize string input
export function sanitizeInput(input: string): string {
  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Limit length to prevent DoS
  const MAX_LENGTH = 10000;
  if (sanitized.length > MAX_LENGTH) {
    sanitized = sanitized.substring(0, MAX_LENGTH);
  }
  
  return sanitized;
}

// Validate and sanitize message content
export function validateMessage(message: any): { isValid: boolean; error?: string; sanitized?: string } {
  if (!message || typeof message !== 'string') {
    return { isValid: false, error: 'Message must be a non-empty string' };
  }
  
  const sanitized = sanitizeInput(message);
  
  if (sanitized.length === 0) {
    return { isValid: false, error: 'Message cannot be empty' };
  }
  
  if (sanitized.length > 5000) {
    return { isValid: false, error: 'Message is too long (max 5000 characters)' };
  }
  
  return { isValid: true, sanitized };
}

// Validate conversation ID (UUIDs only)
export function validateConversationId(id: any): boolean {
  if (!id || typeof id !== 'string') return false;
  
  // UUID v4 regex pattern
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// Validate file upload
export function validateFileUpload(file: File): { isValid: boolean; error?: string } {
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/csv'
  ];
  
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return { isValid: false, error: 'File too large (max 10MB)' };
  }
  
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { isValid: false, error: 'Unsupported file type' };
  }
  
  // Check file extension matches MIME type
  const fileName = file.name.toLowerCase();
  const hasValidExtension = 
    (file.type.includes('image') && /\.(jpg|jpeg|png|gif|webp)$/.test(fileName)) ||
    (file.type.includes('pdf') && /\.pdf$/.test(fileName)) ||
    (file.type.includes('excel') && /\.(xlsx|xls)$/.test(fileName)) ||
    (file.type.includes('word') && /\.(docx|doc)$/.test(fileName)) ||
    (file.type.includes('csv') && /\.csv$/.test(fileName));
  
  if (!hasValidExtension) {
    return { isValid: false, error: 'File extension does not match file type' };
  }
  
  return { isValid: true };
}

// Sanitize HTML content (for display)
export function sanitizeHtml(html: string): string {
  // Basic HTML sanitization - in production, use a library like DOMPurify
  return html
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Validate API key format
export function validateApiKey(key: any): boolean {
  if (!key || typeof key !== 'string') return false;
  
  // Basic API key format validation
  // Adjust regex based on your actual API key format
  const apiKeyRegex = /^[A-Za-z0-9_-]{20,}$/;
  return apiKeyRegex.test(key);
}

// Rate limiting helper
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string, 
  maxRequests: number = 100, 
  windowMs: number = 60000
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const userLimit = requestCounts.get(identifier);
  
  if (!userLimit || now > userLimit.resetTime) {
    requestCounts.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    });
    return { allowed: true, remaining: maxRequests - 1 };
  }
  
  if (userLimit.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }
  
  userLimit.count++;
  return { allowed: true, remaining: maxRequests - userLimit.count };
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of requestCounts.entries()) {
    if (now > value.resetTime) {
      requestCounts.delete(key);
    }
  }
}, 300000); // Clean up every 5 minutes
