// Type declarations for file processing libraries

declare module 'mammoth' {
  interface ExtractRawTextResult {
    value: string
    messages: any[]
  }

  interface ExtractRawTextOptions {
    arrayBuffer: ArrayBuffer
  }

  export function extractRawText(options: ExtractRawTextOptions): Promise<ExtractRawTextResult>
}

declare module 'xlsx' {
  interface WorkBook {
    SheetNames: string[]
    Sheets: { [key: string]: WorkSheet }
  }

  interface WorkSheet {
    [key: string]: any
  }

  interface ReadOptions {
    type: 'array' | 'binary' | 'string' | 'buffer'
  }

  export function read(data: any, options?: ReadOptions): WorkBook
  export const utils: {
    sheet_to_csv(worksheet: WorkSheet): string
  }
}

declare module 'file-type' {
  interface FileTypeResult {
    ext: string
    mime: string
  }

  export function fileTypeFromBuffer(buffer: Uint8Array): Promise<FileTypeResult | undefined>
}