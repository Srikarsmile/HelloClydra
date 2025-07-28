import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import SupermemoryManager from '@/lib/supermemory'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: memoryId } = await params
    if (!memoryId) {
      return NextResponse.json({ error: 'Memory ID is required' }, { status: 400 })
    }

    // Delete the memory
    const success = await SupermemoryManager.deleteMemory(memoryId)
    
    if (success) {
      return NextResponse.json({ success: true, message: 'Memory deleted successfully' })
    } else {
      return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
