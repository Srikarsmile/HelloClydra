import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Invalid file type. Only PDF files are supported.' }, { status: 400 })
    }

    // Validate file size (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 })
    }

    try {
      // Use pdf-parse for server-side PDF processing
      const pdfParse = await import('pdf-parse')
      const buffer = Buffer.from(await file.arrayBuffer())
      
      const pdfData = await pdfParse.default(buffer)
      
      const result = {
        fileName: file.name,
        fileType: 'pdf',
        mimeType: file.type,
        size: file.size,
        content: `PDF Document: ${file.name}
Size: ${formatFileSize(file.size)}
Pages: ${pdfData.numpages}
Type: PDF Document

Content:
${pdfData.text.trim()}`,
        metadata: {
          pages: pdfData.numpages,
          info: pdfData.info,
          version: pdfData.version
        }
      }

      return NextResponse.json(result)
    } catch (pdfError) {
      console.error('PDF processing error:', pdfError)
      return NextResponse.json({ 
        error: 'Failed to process PDF content',
        details: pdfError instanceof Error ? pdfError.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('PDF processing API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}