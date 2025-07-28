import { auth } from '@clerk/nextjs/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from our database
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get conversations with their latest messages for this user
    const { data: conversations, error } = await supabaseAdmin
      .from('conversations')
      .select(`
        id, 
        title, 
        created_at, 
        updated_at,
        messages (
          id,
          role,
          content,
          created_at,
          image_url,
          has_attachments,
          model
        )
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching conversations:', error)
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
    }

    // Transform the data to match our expected format
    const formattedConversations = (conversations || []).map(conv => ({
      id: conv.id,
      title: conv.title,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      // Sort messages by creation time and include them
      messages: (conv.messages || [])
        .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    }))

    return NextResponse.json({ conversations: formattedConversations })

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title = 'New Chat' } = body

    // Get user from our database
    const { data: user } = await supabaseAdmin
      .from('users')
      .upsert({
        clerk_user_id: userId,
        email: 'user@example.com' // This will be updated when we have proper user data
      }, {
        onConflict: 'clerk_user_id'
      })
      .select('id')
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User creation failed' }, { status: 500 })
    }

    // Create new conversation
    const { data: conversation, error } = await supabaseAdmin
      .from('conversations')
      .insert({
        user_id: user.id,
        title: title
      })
      .select('id, title, created_at, updated_at')
      .single()

    if (error) {
      console.error('Error creating conversation:', error)
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
    }

    console.log('✅ Created new conversation:', conversation.id)

    return NextResponse.json({ 
      conversationId: conversation.id,
      conversation: conversation
    })

  } catch (error) {
    console.error('POST conversations error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

