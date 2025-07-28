import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { FileAttachmentsDB } from '@/lib/file-attachments-db'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow cleanup for authenticated users
    // In production, you might want to restrict this to admin users
    console.log('🧹 Starting file cleanup for user:', userId)
    
    const deletedCount = await FileAttachmentsDB.cleanupOrphanedFiles()
    
    return NextResponse.json({ 
      success: true, 
      deletedCount,
      message: `Cleaned up ${deletedCount} orphaned files`
    })

  } catch (error) {
    console.error('File cleanup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}