import { createClient } from '@supabase/supabase-js'

// Validate required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseAnonKey) {
  throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

if (!supabaseServiceKey) {
  throw new Error('Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY')
}

// Client for browser-side operations with RLS
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for server-side operations that bypass RLS
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export type Message = {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  image_url?: string
  has_attachments?: boolean
  file_attachments?: string // JSON string of file attachment metadata
  attachment_count?: number
  attachment_types?: string[]
  supermemory_file_ids?: string[]
  model?: string // Model name for AI responses (may not exist in DB yet)
  created_at: string
}

export type Conversation = {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export type User = {
  id: string
  clerk_user_id: string
  email: string
  created_at: string
}

export type FileAttachment = {
  id: string
  message_id?: string
  conversation_id?: string
  user_id?: string
  file_name: string
  file_type: 'image' | 'pdf' | 'excel' | 'word' | 'csv' | 'text' | 'unknown'
  file_size: number
  mime_type: string
  storage_path?: string
  processed_content?: string
  metadata?: Record<string, any>
  processing_status: 'pending' | 'processed' | 'failed'
  processing_error?: string
  created_at: string
  // Additional columns from actual database
  supermemory_stored?: boolean
  supermemory_memory_id?: string
  content_preview?: string
  error_message?: string
  storage_url?: string
  base64_content?: string
  updated_at?: string
  file_url?: string
}