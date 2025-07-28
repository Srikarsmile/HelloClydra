import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { processPdfBuffer } from '@/lib/pdf-processor'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
  'text/csv'
]

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const messageId = formData.get('messageId') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
    }

    // Get user from database
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Process file based on type
    let processedContent = ''
    let metadata: any = {}
    let processingStatus = 'completed'
    let processingError = null

    try {
      if (file.type === 'application/pdf') {
        const pdfResult = await processPdfBuffer(buffer)
        processedContent = pdfResult.text
        metadata = {
          numPages: pdfResult.numPages,
          pdfMetadata: pdfResult.metadata
        }
      } else if (file.type.startsWith('image/')) {
        // For images, we'll let Grok handle the processing
        metadata = {
          supportsVision: true,
          requiresVisionProcessing: true
        }
      } else if (file.type === 'text/csv') {
        processedContent = buffer.toString('utf-8')
        metadata = { 
          encoding: 'utf-8',
          lineCount: processedContent.split('\n').length
        }
      } else if (file.type.includes('excel') || file.type.includes('spreadsheet')) {
        // Excel file processing with ExcelJS
        const ExcelJS = await import('exceljs')
        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.load(buffer as any)
        
        let content = ''
        const sheets: string[] = []
        
        workbook.eachSheet((worksheet, sheetId) => {
          sheets.push(worksheet.name)
          content += `Sheet: ${worksheet.name}\n`
          
          // Convert worksheet to CSV-like format
          worksheet.eachRow((row, rowNumber) => {
            const values = row.values as any[]
            // Skip the first undefined value (ExcelJS quirk)
            const rowData = values.slice(1).map(val => 
              val?.toString() || ''
            ).join(',')
            content += `${rowData}\n`
          })
          content += '\n'
        })
        
        processedContent = content
        metadata = {
          sheets: sheets,
          sheetCount: sheets.length
        }
      } else if (file.type.includes('word') || file.type.includes('document')) {
        // Word document processing
        const mammoth = await import('mammoth')
        const result = await mammoth.extractRawText({ arrayBuffer: buffer.buffer })
        processedContent = result.value
        metadata = {
          hasImages: result.messages.some(msg => msg.type === 'warning' && msg.message.includes('image')),
          warnings: result.messages.map(msg => msg.message)
        }
      }
    } catch (error) {
      processingStatus = 'failed'
      processingError = error instanceof Error ? error.message : 'Processing failed'
    }

    // Generate unique storage path
    const fileExtension = file.name.split('.').pop()
    const storagePath = `uploads/${userId}/${uuidv4()}.${fileExtension}`

    // Upload file to Supabase Storage
    const { error: storageError } = await supabaseAdmin.storage
      .from('file-attachments')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (storageError) {
      console.error('Storage upload error:', storageError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Get public URL for the uploaded file
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('file-attachments')
      .getPublicUrl(storagePath)

    // Save file attachment to database
    const { data: attachment, error: attachmentError } = await supabaseAdmin
      .from('file_attachments')
      .insert({
        message_id: messageId || null,
        user_id: user.id,
        file_name: file.name,
        file_type: determineFileType(file.type, file.name),
        file_size: file.size,
        mime_type: file.type,
        storage_path: storagePath,
        file_url: publicUrl,
        processed_content: processedContent,
        metadata: {
          ...metadata,
          storageSize: buffer.length
        },
        processing_status: processingStatus,
        processing_error: processingError
      })
      .select()
      .single()

    if (attachmentError) {
      console.error('Error saving file attachment:', attachmentError)
      return NextResponse.json({ error: 'Failed to save file' }, { status: 500 })
    }

    // Update message to indicate it has attachments if messageId provided
    if (messageId) {
      await supabaseAdmin
        .from('messages')
        .update({ has_attachments: true })
        .eq('id', messageId)
    }

    return NextResponse.json({
      success: true,
      attachment: {
        id: attachment.id,
        fileName: attachment.file_name,
        fileType: attachment.file_type,
        size: attachment.file_size,
        processedContent: attachment.processed_content,
        metadata: attachment.metadata,
        processingStatus: attachment.processing_status
      }
    })

  } catch (error) {
    console.error('File upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function determineFileType(mimeType: string, fileName: string): string {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'excel'
  if (mimeType.includes('document') || mimeType.includes('word')) return 'word'
  if (mimeType === 'text/csv') return 'csv'
  return 'unknown'
}