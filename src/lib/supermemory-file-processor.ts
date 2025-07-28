// Supermemory-powered file processing
// This leverages Supermemory for intelligent file content storage and retrieval

import SupermemoryManager from './supermemory'
import { smartStore } from './supermemory-integration'

export interface SupermemoryFile {
  fileName: string
  fileType: 'image' | 'pdf' | 'excel' | 'word' | 'csv' | 'text' | 'unknown'
  mimeType: string
  size: number
  content?: string
  metadata?: Record<string, any>
  error?: string
  supermemoryStored: boolean
  memoryId?: string
}

export async function processFileWithSupermemory(
  file: File, 
  userId: string, 
  conversationId?: string
): Promise<SupermemoryFile> {
  // Validate file size (10MB limit)
  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds 10MB limit. File is ${formatFileSize(file.size)}`)
  }

  const result: SupermemoryFile = {
    fileName: file.name,
    fileType: determineFileType(file.type, file.name),
    mimeType: file.type,
    size: file.size,
    supermemoryStored: false
  }

  try {
    // Extract content based on file type
    switch (result.fileType) {
      case 'image':
        result.content = await processImageFile(file)
        result.metadata = { 
          supportsVision: true,
          base64Content: result.content
        }
        break
      case 'pdf':
        result.content = await processPDFFile(file)
        break
      case 'excel':
        result.content = await processExcelFile(file)
        break
      case 'word':
        result.content = await processWordFile(file)
        break
      case 'csv':
        result.content = await processCSVFile(file)
        break
      case 'text':
        result.content = await processTextFile(file)
        break
      default:
        result.error = 'Unsupported file type'
        return result
    }

    // Store in Supermemory for future reference
    if (result.content && !result.error) {
      const stored = await storeFileInSupermemory(result, userId, conversationId)
      result.supermemoryStored = stored
    }

  } catch (error) {
    result.error = error instanceof Error ? error.message : 'File processing failed'
  }

  return result
}

// Store file content in Supermemory for intelligent retrieval
async function storeFileInSupermemory(
  file: SupermemoryFile, 
  userId: string, 
  conversationId?: string
): Promise<boolean> {
  try {
    const memoryContent = `File: ${file.fileName} (${file.fileType})
Size: ${formatFileSize(file.size)}
Content: ${file.content?.slice(0, 2000)}${file.content && file.content.length > 2000 ? '...' : ''}`

    const containerTags = [
      'file-attachment',
      file.fileType,
      userId,
      conversationId
    ].filter(Boolean) as string[]

    const stored = await SupermemoryManager.addMemory({
      content: memoryContent,
      userId,
      containerTags,
      metadata: {
        fileName: file.fileName,
        fileType: file.fileType,
        mimeType: file.mimeType,
        size: file.size,
        conversationId,
        timestamp: new Date().toISOString(),
        source: 'file-upload',
        category: 'attachment',
        importance: 'medium'
      }
    })

    if (stored) {
      // Generate a memory ID for database reference
      file.memoryId = `supermemory_${Date.now()}_${file.fileName.replace(/[^a-zA-Z0-9]/g, '_')}`
    }

    return stored
  } catch (error) {
    console.error('Error storing file in Supermemory:', error)
    return false
  }
}

// Search for similar files or content in Supermemory
export async function searchSimilarFiles(
  query: string, 
  userId: string, 
  fileType?: string
): Promise<any[]> {
  try {
    const searchQuery = fileType 
      ? `${query} file:${fileType}` 
      : `${query} file-attachment`

    const results = await SupermemoryManager.searchMemories({
      query: searchQuery,
      userId,
      limit: 5
    })

    if (!results?.results) return []

    return results.results
      .filter((memory: any) => memory.metadata?.source === 'file-upload')
      .map((memory: any) => ({
        fileName: memory.metadata?.fileName,
        fileType: memory.metadata?.fileType,
        content: memory.summary || memory.title,
        relevance: memory.score,
        timestamp: memory.metadata?.timestamp
      }))
  } catch (error) {
    console.error('Error searching similar files:', error)
    return []
  }
}

// File processing functions (simplified versions)
async function processImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const base64 = reader.result as string
      if (base64) {
        resolve(base64.split(',')[1]) // Return base64 without prefix
      } else {
        reject(new Error('Failed to read image file'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read image file'))
  })
}

async function processPDFFile(file: File): Promise<string> {
  try {
    // Use server-side PDF processing for better content extraction
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await fetch('/api/process-pdf', {
      method: 'POST',
      body: formData
    })
    
    if (response.ok) {
      const result = await response.json()
      return result.content
    } else {
      // Fallback to basic PDF info if server processing fails
      const errorData = await response.json().catch(() => ({}))
      console.warn('PDF server processing failed:', errorData)
      
      return `PDF Document: ${file.name}
Size: ${formatFileSize(file.size)}
Type: PDF Document
Note: Content extraction failed. The file has been prepared for AI analysis.
Error: ${errorData.error || 'Server processing unavailable'}`
    }
  } catch (error) {
    // Fallback to basic PDF info if server processing fails
    console.warn('PDF processing error:', error)
    
    return `PDF Document: ${file.name}
Size: ${formatFileSize(file.size)}
Type: PDF Document
Note: Content extraction failed due to processing error. The file has been prepared for AI analysis.
Error: ${error instanceof Error ? error.message : 'Unknown error'}`
  }
}

async function processExcelFile(file: File): Promise<string> {
  try {
    // Use ExcelJS for client-side Excel processing
    const ExcelJS = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    
    const arrayBuffer = await file.arrayBuffer()
    await workbook.xlsx.load(arrayBuffer)
    
    let content = `Excel Spreadsheet: ${file.name}\n`
    content += `Size: ${formatFileSize(file.size)}\n`
    content += `Worksheets: ${workbook.worksheets.length}\n\n`
    
    // Process each worksheet
    workbook.worksheets.forEach((worksheet, index) => {
      content += `Sheet ${index + 1}: ${worksheet.name}\n`
      content += `Rows: ${worksheet.rowCount}, Columns: ${worksheet.columnCount}\n`
      
      // Extract first few rows as sample data
      const maxRows = Math.min(10, worksheet.rowCount)
      const maxCols = Math.min(10, worksheet.columnCount)
      
      for (let row = 1; row <= maxRows; row++) {
        const rowData: string[] = []
        for (let col = 1; col <= maxCols; col++) {
          const cell = worksheet.getCell(row, col)
          const value = cell.value?.toString() || ''
          rowData.push(value.slice(0, 50)) // Limit cell content length
        }
        if (rowData.some(cell => cell.trim())) {
          content += `Row ${row}: ${rowData.join(' | ')}\n`
        }
      }
      
      if (worksheet.rowCount > maxRows) {
        content += `... (${worksheet.rowCount - maxRows} more rows)\n`
      }
      content += '\n'
    })
    
    return content
  } catch (error) {
    throw new Error(`Failed to process Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function processWordFile(file: File): Promise<string> {
  try {
    // Use mammoth for Word document processing
    const mammoth = await import('mammoth')
    
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    
    let content = `Word Document: ${file.name}\n`
    content += `Size: ${formatFileSize(file.size)}\n`
    content += `Type: Microsoft Word Document\n\n`
    
    if (result.value && result.value.trim()) {
      content += `Content:\n${result.value.trim()}`
    } else {
      content += `Content: [Document appears to be empty or content could not be extracted]`
    }
    
    // Include any warnings from mammoth
    if (result.messages && result.messages.length > 0) {
      content += `\n\nProcessing Notes:\n`
      result.messages.forEach(message => {
        content += `- ${message.message}\n`
      })
    }
    
    return content
  } catch (error) {
    throw new Error(`Failed to process Word document: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function processCSVFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsText(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read CSV file'))
  })
}

async function processTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsText(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read text file'))
  })
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function determineFileType(mimeType: string, fileName: string): SupermemoryFile['fileType'] {
  const extension = fileName.toLowerCase().split('.').pop()

  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType.includes('spreadsheet') || 
      mimeType.includes('excel') || 
      ['xlsx', 'xls'].includes(extension || '')) return 'excel'
  if (mimeType.includes('document') || 
      mimeType.includes('word') || 
      ['docx', 'doc'].includes(extension || '')) return 'word'
  if (mimeType === 'text/csv' || extension === 'csv') return 'csv'
  if (mimeType.startsWith('text/')) return 'text'

  return 'unknown'
}

export function formatSupermemoryFileContent(file: SupermemoryFile): string {
  if (file.error) {
    return `Error processing ${file.fileName}: ${file.error}`
  }

  let formatted = `File: ${file.fileName} (${file.fileType})`
  
  if (file.supermemoryStored) {
    formatted += ` [Stored in Memory]`
  }
  
  formatted += `\nSize: ${formatFileSize(file.size)}`
  
  if (file.fileType === 'image' && file.metadata?.supportsVision) {
    formatted += `\nImage ready for AI vision analysis`
  } else if (file.content) {
    formatted += `\nContent: ${file.content.slice(0, 500)}${file.content.length > 500 ? '...' : ''}`
  }

  return formatted
}