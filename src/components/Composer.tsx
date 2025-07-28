'use client'

import { useRef, useCallback, useEffect, useState } from 'react'
import { PaperAirplaneIcon, GlobeAltIcon, PlusIcon, PhotoIcon, DocumentIcon } from '@heroicons/react/24/solid'
import { getAvailableModels } from '@/lib/models'
import MultimodalFileUpload from './file-upload/multimodal-file-upload'
import { SupermemoryFile } from '@/lib/supermemory-file-processor'
import { useUser } from '@clerk/nextjs'

interface ComposerProps {
  message: string
  onMessageChange: (message: string) => void
  onSendMessage: () => void
  isLoading?: boolean
  isWebSearchEnabled: boolean
  onWebSearchEnabledChange: (enabled: boolean) => void
  selectedModel: string
  onModelChange: (model: string) => void
  onImageUpload?: (file: File) => void
  imagePreview?: string | null
  onRemoveImage?: () => void
  disabled?: boolean
  // Multimodal file support
  attachedFiles?: SupermemoryFile[]
  onFilesProcessed?: (files: SupermemoryFile[]) => void
  onFilesRemoved?: () => void
}

function useAutosizeTextarea(value: string) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Use requestAnimationFrame for smoother resize
    requestAnimationFrame(() => {
      textarea.style.height = 'auto'
      const scrollHeight = textarea.scrollHeight
      const maxHeight = 24 * 8 // Increased to 8 rows for better UX
      const newHeight = Math.min(scrollHeight, maxHeight)
      
      // Smooth transition
      textarea.style.height = `${newHeight}px`
    })
  }, [value])

  return textareaRef
}

export function Composer({
  message,
  onMessageChange,
  onSendMessage,
  isLoading,
  isWebSearchEnabled,
  onWebSearchEnabledChange,
  selectedModel,
  onModelChange,
  onImageUpload,
  imagePreview,
  onRemoveImage,
  disabled,
  attachedFiles = [],
  onFilesProcessed,
  onFilesRemoved
}: ComposerProps) {
  const textareaRef = useAutosizeTextarea(message)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [keyboardVisible, setKeyboardVisible] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [showPlusMenu, setShowPlusMenu] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const { user } = useUser()
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  // Handle mobile keyboard visibility
  useEffect(() => {
    if (!isMobile) return
    
    const handleVisualViewportChange = () => {
      if (window.visualViewport) {
        const heightDifference = window.innerHeight - window.visualViewport.height
        setKeyboardVisible(heightDifference > 150) // Threshold for keyboard detection
      }
    }
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportChange)
      return () => {
        window.visualViewport?.removeEventListener('resize', handleVisualViewportChange)
      }
    }
  }, [isMobile])
  
  // Close menu when clicking outside
  useEffect(() => {
    if (!showPlusMenu) return
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('[data-plus-menu]')) {
        setShowPlusMenu(false)
      }
    }
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowPlusMenu(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showPlusMenu])

  const handleSend = useCallback(() => {
    if ((!message.trim() && attachedFiles.length === 0) || disabled || isLoading) return
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10)
    }
    
    setIsTyping(false)
    onSendMessage()
  }, [message, attachedFiles.length, disabled, isLoading, onSendMessage])
  
  const handleMessageChange = useCallback((value: string) => {
    onMessageChange(value)
    setIsTyping(value.length > 0)
  }, [onMessageChange])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    
    // Add Command/Ctrl+Enter for quick send on all platforms
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onImageUpload) {
      onImageUpload(file)
    }
  }

  const models = getAvailableModels()
  const currentModel = models.find(m => m.id === selectedModel) || models[0]

  return (
    <div className="composer-container">
      {/* Desktop Layout */}
      <div className="hidden md:block">
        <div className="composer-desktop">
          {/* Attachments and Previews */}
          {(imagePreview || attachedFiles.length > 0) && (
            <div className="composer-attachments">
              {/* Image Preview */}
              {imagePreview && (
                <div className="attachment-preview">
                  <img
                    src={imagePreview}
                    alt="Image preview"
                    className="attachment-image"
                  />
                  <button
                    onClick={onRemoveImage}
                    className="attachment-remove"
                    aria-label="Remove image"
                  >
                    ×
                  </button>
                </div>
              )}
              
              {/* File Attachments */}
              {attachedFiles.length > 0 && (
                <div className="file-attachments">
                  <MultimodalFileUpload
                    onFilesProcessed={onFilesProcessed || (() => {})}
                    onFilesRemoved={onFilesRemoved || (() => {})}
                    disabled={disabled}
                  />
                </div>
              )}
            </div>
          )}

          {/* Main Input Container */}
          <div className="composer-input-container desktop" data-composer>
            <div className="composer-input-wrapper">
              {/* Attachment Button */}
              <div className="composer-attachment-controls">
                <button
                  onClick={() => setShowPlusMenu(!showPlusMenu)}
                  className="composer-attachment-btn"
                  aria-label="Add attachments"
                  aria-expanded={showPlusMenu}
                >
                  <PlusIcon className={`w-5 h-5 transition-transform duration-200 ${showPlusMenu ? 'rotate-45' : ''}`} />
                </button>
                
                {/* Attachment Menu */}
                {showPlusMenu && (
                  <div className="attachment-menu desktop" data-plus-menu>
                    <button
                      onClick={() => {
                        fileInputRef.current?.click()
                        setShowPlusMenu(false)
                      }}
                      className="attachment-menu-item"
                    >
                      <PhotoIcon className="w-4 h-4" />
                      Add image
                    </button>
                    
                    {onFilesProcessed && (
                      <button
                        onClick={() => {
                          const tempInput = document.createElement('input')
                          tempInput.type = 'file'
                          tempInput.accept = 'image/*,.pdf,.xlsx,.xls,.docx,.doc,.csv,.txt'
                          tempInput.multiple = true
                          tempInput.onchange = async (e) => {
                            const files = (e.target as HTMLInputElement).files
                            if (files && files.length > 0) {
                              setIsProcessing(true)
                              try {
                                const { processFileWithSupermemory } = await import('@/lib/supermemory-file-processor')
                                const processedFiles = []
                                for (const file of Array.from(files)) {
                                  try {
                                    const processed = await processFileWithSupermemory(file, user?.id || 'anonymous')
                                    processedFiles.push(processed)
                                  } catch (error) {
                                    console.error('File processing error:', error)
                                    processedFiles.push({
                                      fileName: file.name,
                                      fileType: 'unknown' as const,
                                      mimeType: file.type,
                                      size: file.size,
                                      error: 'Failed to process file',
                                      supermemoryStored: false
                                    })
                                  }
                                }
                                onFilesProcessed([...attachedFiles, ...processedFiles])
                              } finally {
                                setIsProcessing(false)
                              }
                            }
                          }
                          tempInput.click()
                          setShowPlusMenu(false)
                        }}
                        className="attachment-menu-item"
                      >
                        <DocumentIcon className="w-4 h-4" />
                        Add files
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Main Textarea */}
              <div className="composer-textarea-wrapper">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => handleMessageChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message Clydra AI..."
                  disabled={disabled}
                  className="composer-textarea"
                  rows={1}
                  aria-label="Message input"
                />
                
                {/* Keyboard Hint */}
                {!isMobile && message.length === 0 && (
                  <div className="keyboard-hint">
                    <span className="hint-text">Press <kbd>Enter</kbd> to send, <kbd>Shift+Enter</kbd> for new line</span>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="composer-controls desktop">
                {/* Web Search Toggle */}
                <button
                  onClick={() => onWebSearchEnabledChange(!isWebSearchEnabled)}
                  className={`composer-control-btn ${isWebSearchEnabled ? 'active' : ''}`}
                  title={isWebSearchEnabled ? 'Web search enabled' : 'Enable web search'}
                  aria-label={isWebSearchEnabled ? 'Disable web search' : 'Enable web search'}
                >
                  <GlobeAltIcon className="w-4 h-4" />
                </button>

                {/* Send Button */}
                <button
                  onClick={handleSend}
                  disabled={(!message.trim() && attachedFiles.length === 0) || disabled || isLoading}
                  className="composer-send-btn"
                  aria-label="Send message"
                >
                  {isLoading ? (
                    <div className="loading-spinner" />
                  ) : (
                    <PaperAirplaneIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Model Selector */}
          <div className="composer-model-selector desktop">
            <select
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value)}
              disabled={disabled || isLoading}
              className="model-select"
              aria-label="Select AI model"
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden">
        <div className="composer-mobile">
          {/* Mobile Attachments */}
          {(imagePreview || attachedFiles.length > 0) && (
            <div className="composer-attachments mobile">
              {imagePreview && (
                <div className="attachment-preview mobile">
                  <img
                    src={imagePreview}
                    alt="Image preview"
                    className="attachment-image mobile"
                  />
                  <button
                    onClick={onRemoveImage}
                    className="attachment-remove mobile"
                    aria-label="Remove image"
                  >
                    ×
                  </button>
                </div>
              )}
              
              {attachedFiles.length > 0 && (
                <div className="file-attachments mobile">
                  <MultimodalFileUpload
                    onFilesProcessed={onFilesProcessed || (() => {})}
                    onFilesRemoved={onFilesRemoved || (() => {})}
                    disabled={disabled}
                  />
                </div>
              )}
            </div>
          )}

          {/* Mobile Input Container */}
          <div className="composer-input-container mobile">
            <div className="composer-input-wrapper mobile">
              {/* Mobile Controls Row */}
              <div className="mobile-controls-row">
                {/* Attachment Button */}
                <button
                  onClick={() => setShowPlusMenu(!showPlusMenu)}
                  className="composer-attachment-btn mobile"
                  aria-label="Add attachments"
                  aria-expanded={showPlusMenu}
                >
                  <PlusIcon className={`w-5 h-5 transition-transform duration-200 ${showPlusMenu ? 'rotate-45' : ''}`} />
                </button>

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => handleMessageChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message Clydra AI..."
                  disabled={disabled}
                  className="composer-textarea mobile"
                  rows={1}
                  aria-label="Message input"
                />

                {/* Web Search Toggle */}
                <button
                  onClick={() => onWebSearchEnabledChange(!isWebSearchEnabled)}
                  className={`composer-control-btn mobile ${isWebSearchEnabled ? 'active' : ''}`}
                  title={isWebSearchEnabled ? 'Web search enabled' : 'Enable web search'}
                  aria-label={isWebSearchEnabled ? 'Disable web search' : 'Enable web search'}
                >
                  <GlobeAltIcon className="w-4 h-4" />
                </button>

                {/* Send Button */}
                <button
                  onClick={handleSend}
                  disabled={(!message.trim() && attachedFiles.length === 0) || disabled || isLoading}
                  className="composer-send-btn mobile"
                  aria-label="Send message"
                >
                  {isLoading ? (
                    <div className="loading-spinner mobile" />
                  ) : (
                    <PaperAirplaneIcon className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Mobile Attachment Menu */}
              {showPlusMenu && (
                <div className="attachment-menu mobile" data-plus-menu>
                  <button
                    onClick={() => {
                      fileInputRef.current?.click()
                      setShowPlusMenu(false)
                    }}
                    className="attachment-menu-item mobile"
                  >
                    <PhotoIcon className="w-4 h-4" />
                    Add image
                  </button>
                  
                  {onFilesProcessed && (
                    <button
                      onClick={() => {
                        const tempInput = document.createElement('input')
                        tempInput.type = 'file'
                        tempInput.accept = 'image/*,.pdf,.xlsx,.xls,.docx,.doc,.csv,.txt'
                        tempInput.multiple = true
                        tempInput.onchange = async (e) => {
                          const files = (e.target as HTMLInputElement).files
                          if (files && files.length > 0) {
                            setIsProcessing(true)
                            try {
                              const { processFileWithSupermemory } = await import('@/lib/supermemory-file-processor')
                              const processedFiles = []
                              for (const file of Array.from(files)) {
                                try {
                                  const processed = await processFileWithSupermemory(file, user?.id || 'anonymous')
                                  processedFiles.push(processed)
                                } catch (error) {
                                  console.error('File processing error:', error)
                                  processedFiles.push({
                                    fileName: file.name,
                                    fileType: 'unknown' as const,
                                    mimeType: file.type,
                                    size: file.size,
                                    error: 'Failed to process file',
                                    supermemoryStored: false
                                  })
                                }
                              }
                              onFilesProcessed([...attachedFiles, ...processedFiles])
                            } finally {
                              setIsProcessing(false)
                            }
                          }
                        }
                        tempInput.click()
                        setShowPlusMenu(false)
                      }}
                      className="attachment-menu-item mobile"
                    >
                      <DocumentIcon className="w-4 h-4" />
                      Add files
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Mobile Model Selector */}
          <div className="composer-model-selector mobile">
            <select
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value)}
              disabled={disabled || isLoading}
              className="model-select mobile"
              aria-label="Select AI model"
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.icon} {model.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
    </div>
  )
}