// MCP-powered file processing
// This leverages MCP servers for robust file handling

export interface MCPProcessedFile {
    fileName: string
    fileType: 'image' | 'pdf' | 'excel' | 'word' | 'csv' | 'text' | 'unknown'
    mimeType: string
    size: number
    content?: string
    metadata?: Record<string, any>
    error?: string
    mcpProcessed: boolean
}

export async function processMCPFile(file: File): Promise<MCPProcessedFile> {
    const result: MCPProcessedFile = {
        fileName: file.name,
        fileType: determineFileType(file.type, file.name),
        mimeType: file.type,
        size: file.size,
        mcpProcessed: true
    }

    try {
        // For images, convert to base64 for Grok-4 vision
        if (result.fileType === 'image') {
            const base64 = await fileToBase64(file)
            result.metadata = {
                base64Content: base64.split(',')[1], // Remove data:image/...;base64, prefix
                dataUrl: base64,
                supportsVision: true
            }
            return result
        }

        // For other file types, we'll use MCP servers via API calls
        // This is cleaner than direct MCP calls from the frontend
        const formData = new FormData()
        formData.append('file', file)
        formData.append('fileType', result.fileType)

        const response = await fetch('/api/mcp-process-file', {
            method: 'POST',
            body: formData
        })

        if (!response.ok) {
            throw new Error(`MCP processing failed: ${response.statusText}`)
        }

        const mcpResult = await response.json()

        result.content = mcpResult.content
        result.metadata = mcpResult.metadata
        result.error = mcpResult.error

    } catch (error) {
        result.error = error instanceof Error ? error.message : 'MCP processing failed'
    }

    return result
}

function determineFileType(mimeType: string, fileName: string): MCPProcessedFile['fileType'] {
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

async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = error => reject(error)
    })
}

export function formatMCPFileContent(processedFile: MCPProcessedFile): string {
    if (processedFile.error) {
        return `Error processing ${processedFile.fileName}: ${processedFile.error}`
    }

    if (processedFile.fileType === 'image') {
        return `Image: ${processedFile.fileName} (${processedFile.size} bytes)`
    }

    if (!processedFile.content) {
        return `File: ${processedFile.fileName} (${processedFile.fileType}) - No content extracted`
    }

    let formatted = `File: ${processedFile.fileName} (${processedFile.fileType})\n`

    // Add metadata if available
    if (processedFile.metadata) {
        if (processedFile.metadata.pages) {
            formatted += `Pages: ${processedFile.metadata.pages}\n`
        }
        if (processedFile.metadata.sheets) {
            formatted += `Sheets: ${processedFile.metadata.sheets}\n`
        }
    }

    formatted += `\nContent:\n${processedFile.content}`

    return formatted
}