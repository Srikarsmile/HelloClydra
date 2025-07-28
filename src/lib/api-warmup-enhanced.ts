import { supabaseAdmin } from './supabase'

// Global connection state
let isWarmedUp = false
let warmupPromise: Promise<void> | null = null

// Pre-warm the Supabase connection and keep it alive
export async function warmupSupabase() {
  if (isWarmedUp) return
  
  try {
    // Start multiple lightweight queries in parallel to establish connection pool
    await Promise.all([
      supabaseAdmin.from('users').select('id').limit(1),
      supabaseAdmin.from('conversations').select('id').limit(1),
      supabaseAdmin.from('messages').select('id').limit(1)
    ])
    
    isWarmedUp = true
    console.log('✅ Supabase connection pool warmed up')
    
    // Keep connection alive with periodic pings
    setInterval(async () => {
      try {
        await supabaseAdmin.from('users').select('id').limit(1)
      } catch (error) {
        console.error('Connection keep-alive failed:', error)
        isWarmedUp = false
      }
    }, 30000) // Ping every 30 seconds
    
  } catch (error) {
    console.error('Failed to warm up Supabase:', error)
    throw error
  }
}

// Ensure warmup happens only once
export async function initializeApiRoute() {
  if (!warmupPromise) {
    warmupPromise = warmupSupabase()
  }
  return warmupPromise
}

// Pre-warm OpenRouter connection
export async function warmupOpenRouter() {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      }
    })
    
    if (response.ok) {
      console.log('✅ OpenRouter connection warmed up')
    }
  } catch (error) {
    console.error('Failed to warm up OpenRouter:', error)
  }
}

// Initialize all connections on module load
if (typeof window === 'undefined') {
  // Server-side only
  Promise.all([
    initializeApiRoute(),
    warmupOpenRouter()
  ]).catch(console.error)
}
