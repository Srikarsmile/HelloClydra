import { supabaseAdmin } from './supabase'

// Pre-warm the Supabase connection to reduce cold starts
export async function warmupSupabase() {
  try {
    // Simple query to establish connection
    await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1)
    
    console.log('✅ Supabase connection warmed up')
  } catch (error) {
    console.error('Failed to warm up Supabase:', error)
  }
}

// Call this at the top of your API routes
export async function initializeApiRoute() {
  // Run warmup in background, don't wait for it
  warmupSupabase().catch(() => {})
}
