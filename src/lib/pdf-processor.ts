// Server-side PDF processing utility

export async function processPdfBuffer(buffer: Buffer): Promise<{
  text: string
  numPages: number
  metadata?: any
}> {
  try {
    // Dynamic import to avoid build-time issues
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer)
    
    return {
      text: data.text,
      numPages: data.numpages,
      metadata: data.info
    }
  } catch (error) {
    throw new Error(`PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export function formatPdfContent(text: string, fileName: string, numPages: number): string {
  // Sanitize text to prevent XSS or injection vulnerabilities
  const sanitizedText = text
    .replace(/[<>&"']/g, (match) => {
      const escapeMap: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#x27;'
      }
      return escapeMap[match] || match
    })
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
  
  // Sanitize fileName as well
  const sanitizedFileName = fileName
    .replace(/[<>&"']/g, (match) => {
      const escapeMap: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#x27;'
      }
      return escapeMap[match] || match
    })

  return `PDF Document: ${sanitizedFileName} (${numPages} pages)\n\nContent:\n${sanitizedText}`
}