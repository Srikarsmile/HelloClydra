"use client"

import { useState, useRef } from 'react'
import { Upload, File, Image, FileText, Table, X, AlertCircle, Paperclip } from 'lucide-react'
import { processFileWithSupermemory, SupermemoryFile, formatSupermemoryFileContent } from '@/lib/supermemory-file-processor'
import { useUser } from '@clerk/nextjs'

interface MultimodalFileUploadProps {
  onFilesProcessed: (files: SupermemoryFile[]) => void
  onFilesRemoved: () => void
  disabled?: boolean
  maxFiles?: number
}

export default function MultimodalFileUpload({ 
  onFilesProcessed, 
  onFilesRemoved, 
  disabled,
  maxFiles = 5 
}: MultimodalFileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<SupermemoryFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useUser()

  const handleFiles = async (files: FileList) => {
    if (files.length === 0) return
    
    const filesToProcess = Array.from(files).slice(0, maxFiles - uploadedFiles.length)
    setIsProcessing(true)
    
    try {
      const processedFiles: SupermemoryFile[] = []
      
      for (const file of filesToProcess) {
        try {
          const processedFile = await processFileWithSupermemory(file, user?.id || 'anonymous')
          processedFiles.push(processedFile)
        } catch (error) {
          console.error('Supermemory file processing error:', error)
          processedFiles.push({
            fileName: file.name,
            fileType: 'unknown',
            mimeType: file.type,
            size: file.size,
            error: 'Failed to process file',
            supermemoryStored: false
          })
        }
      }
      
      const newFiles = [...uploadedFiles, ...processedFiles]
      setUploadedFiles(newFiles)
      onFilesProcessed(newFiles)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (disabled) return
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (disabled) return
    
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }

  const handleRemoveFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index)
    setUploadedFiles(newFiles)
    
    if (newFiles.length === 0) {
      onFilesRemoved()
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } else {
      onFilesProcessed(newFiles)
    }
  }

  const handleRemoveAllFiles = () => {
    setUploadedFiles([])
    onFilesRemoved()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getFileIcon = (fileType: SupermemoryFile['fileType']) => {
    switch (fileType) {
      case 'image': return <Image className="w-4 h-4" />
      case 'pdf': return <FileText className="w-4 h-4" />
      case 'excel': return <Table className="w-4 h-4" />
      case 'word': return <FileText className="w-4 h-4" />
      case 'csv': return <Table className="w-4 h-4" />
      case 'text': return <FileText className="w-4 h-4" />
      default: return <File className="w-4 h-4" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Compact button mode for chat interface
  if (uploadedFiles.length === 0) {
    return (
      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleChange}
          accept="image/*,.pdf,.xlsx,.xls,.docx,.doc,.csv,.txt"
          multiple
          disabled={disabled}
        />
        <button
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`p-1.5 sm:p-2 hover:bg-slate-50 rounded-md sm:rounded-lg transition-all duration-200 touch-manipulation min-h-[32px] min-w-[32px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'
          }`}
          aria-label="Attach files"
          disabled={disabled}
          title="Attach files (images, PDFs, documents)"
        >
          <Paperclip className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors ${
            disabled ? 'text-slate-400' : 'text-slate-600 hover:text-slate-800'
          }`} />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleChange}
        accept="image/*,.pdf,.xlsx,.xls,.docx,.doc,.csv,.txt"
        multiple
        disabled={disabled}
      />
      
      {/* File List - Improved styling */}
      <div className="space-y-2">
        {uploadedFiles.map((file, index) => (
          <div key={index} className={`group flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 text-sm ${
            file.error 
              ? 'bg-red-50 border-red-200 hover:bg-red-100' 
              : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
          }`}>
            <div className={`flex-shrink-0 p-2 rounded-md ${
              file.error 
                ? 'bg-red-100 text-red-600' 
                : 'bg-white text-slate-600 shadow-sm'
            }`}>
              {file.error ? (
                <AlertCircle className="w-4 h-4" />
              ) : (
                getFileIcon(file.fileType)
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate text-slate-900">{file.fileName}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {formatFileSize(file.size)} • {file.fileType.toUpperCase()}
                {file.error && (
                  <span className="block mt-1 text-red-500">⚠️ {file.error}</span>
                )}
              </p>
              {file.content && !file.error && (
                <p className="text-xs text-green-600 mt-1">✓ Content processed</p>
              )}
            </div>

            {/* Image preview for image files */}
            {file.fileType === 'image' && file.metadata?.base64Content && !file.error && (
              <div className="flex-shrink-0">
                <img
                  src={`data:${file.mimeType};base64,${file.metadata.base64Content}`}
                  alt={file.fileName}
                  className="w-10 h-10 rounded object-cover border border-slate-200"
                />
              </div>
            )}

            <button
              onClick={() => handleRemoveFile(index)}
              className="flex-shrink-0 p-1.5 hover:bg-slate-200 rounded-md transition-colors opacity-60 group-hover:opacity-100"
              disabled={disabled}
              title="Remove file"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Actions - Improved styling */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {uploadedFiles.length < maxFiles && (
            <button
              onClick={() => !disabled && fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-all duration-200 font-medium hover:scale-105 active:scale-95"
              disabled={disabled || isProcessing}
            >
              <Upload className="w-3.5 h-3.5" />
              Add more
            </button>
          )}
          
          <button
            onClick={handleRemoveAllFiles}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-all duration-200 font-medium hover:scale-105 active:scale-95"
            disabled={disabled}
          >
            <X className="w-3.5 h-3.5" />
            Clear all
          </button>
        </div>

        {/* File count indicator */}
        <div className="text-xs text-slate-500 font-medium">
          {uploadedFiles.length}/{maxFiles} files
        </div>
      </div>

      {/* Processing indicator - Improved styling */}
      {isProcessing && (
        <div className="flex items-center gap-2 text-sm text-slate-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
          <span className="font-medium">Processing files...</span>
        </div>
      )}


    </div>
  )
}