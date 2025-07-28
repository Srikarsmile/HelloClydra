import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const startTime = Date.now()
  
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { threadId } = await params
    // Fetching initial chat data

    // Get user from our database first
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!user) {
      // User not found
      return NextResponse.json({ 
        thread: null, 
        messages: [],
        error: 'User not found'
      }, { status: 404 })
    }

    // Check if the thread exists and belongs to the user
    const { data: thread, error: threadError } = await supabaseAdmin
      .from('conversations')
      .select('id, title, updated_at')
      .eq('id', threadId)
      .eq('user_id', user.id)
      .single()

    if (threadError || !thread) {
      // Thread not found or access denied
      return NextResponse.json({ 
        thread: null, 
        messages: [],
        threadNotFound: true
      })
    }

    // Thread found

    // Fetch messages for the thread with proper error handling
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('messages')
      .select('id, conversation_id, role, content, image_url, created_at, has_attachments, file_attachments, model')
      .eq('conversation_id', threadId)
      .order('created_at', { ascending: true })
      .limit(100) // Increased limit for better UX

    if (messagesError) {
      // Error fetching messages
      // Still return thread info even if messages fail
      return NextResponse.json({ 
        thread: {
          id: thread.id,
          title: thread.title,
          lastMessageAt: thread.updated_at
        }, 
        messages: [],
        messagesError: messagesError.message
      })
    }

    const responseTime = Date.now() - startTime
    // Initial chat fetch completed

    return NextResponse.json({
      thread: {
        id: thread.id,
        title: thread.title,
        lastMessageAt: thread.updated_at
      },
      messages: messages || [],
      performanceMs: responseTime
    })
  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error('❌ Error in initial thread fetch:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        thread: null,
        messages: [],
        performanceMs: responseTime
      },
      { status: 500 }
    )
  }
}
