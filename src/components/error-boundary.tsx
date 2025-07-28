'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      // You could integrate with Sentry, LogRocket, etc. here
      console.error('Production error:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      })
    }
  }

  render() {
    if (this.state.hasError) {
      // Render custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-red-50 border border-red-200 rounded-xl">
          <div className="text-red-600 mb-4">
            <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Something went wrong</h3>
          <p className="text-red-600 text-center mb-4">
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// Chat-specific error boundary with chat-relevant fallback
export function ChatErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex flex-col items-center justify-center p-8 bg-orange-50 border border-orange-200 rounded-xl">
          <div className="text-orange-600 mb-4">
            <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M8 12h8M8 8h8M8 16h6"/>
              <path d="M3 3v18l4-4h14V3z"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-orange-800 mb-2">Chat Error</h3>
          <p className="text-orange-600 text-center mb-4">
            There was a problem with the chat system. Your messages are safe.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              Reload Chat
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      }
      onError={(error, errorInfo) => {
        // Chat-specific error logging
        console.error('Chat system error:', {
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString()
        })
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

// Message-specific error boundary for individual message components
export function MessageErrorBoundary({ children, messageId }: { children: ReactNode; messageId?: string }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-500">
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Message Error</p>
            <p className="text-xs text-red-600">This message couldn&apos;t be displayed properly.</p>
          </div>
        </div>
      }
      onError={(error, errorInfo) => {
        console.error(`Message error (ID: ${messageId}):`, {
          messageId,
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack
        })
      }}
    >
      {children}
    </ErrorBoundary>
  )
}