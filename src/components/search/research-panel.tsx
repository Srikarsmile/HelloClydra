'use client'

import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ResearchTask {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  result?: {
    report?: string
    sources?: Array<{
      id: number
      title: string
      url: string
      summary?: string
    }>
    summary?: string
  } & Record<string, unknown>
  error?: string
  createdAt: string
  completedAt?: string
}

interface ResearchPanelProps {
  taskId: string | null
  onClose: () => void
  isVisible: boolean
}

export function ResearchPanel({ taskId, onClose, isVisible }: ResearchPanelProps) {
  const [task, setTask] = useState<ResearchTask | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!taskId || !isVisible) {
      setTask(null)
      return
    }

    let pollInterval: NodeJS.Timeout | null = null

    const pollTask = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`/api/research?taskId=${taskId}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch task status')
        }

        setTask(data)

        // Stop polling if task is completed or failed
        if (data.status === 'completed' || data.status === 'failed') {
          if (pollInterval) {
            clearInterval(pollInterval)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        if (pollInterval) {
          clearInterval(pollInterval)
        }
      } finally {
        setLoading(false)
      }
    }

    // Initial fetch
    pollTask()

    // Set up polling for pending/running tasks
    pollInterval = setInterval(pollTask, 2000)

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [taskId, isVisible])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Research Task</h2>
              <p className="text-sm text-slate-600">
                {task ? `Task ID: ${task.id}` : 'Loading...'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-red-800">
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <span className="font-medium">Error</span>
              </div>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          )}

          {task && (
            <div className="space-y-6">
              {/* Status */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <StatusIcon status={task.status} />
                  <div>
                    <h3 className="font-medium text-slate-900 capitalize">
                      {task.status === 'running' ? 'Researching...' : task.status}
                    </h3>
                    <p className="text-sm text-slate-600">
                      Created: {new Date(task.createdAt).toLocaleString()}
                      {task.completedAt && (
                        <> • Completed: {new Date(task.completedAt).toLocaleString()}</>
                      )}
                    </p>
                  </div>
                </div>

                {task.status === 'running' && (
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full animate-pulse w-1/3"></div>
                  </div>
                )}
              </div>

              {/* Results */}
              {task.status === 'completed' && task.result && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Research Results</h3>
                  
                  {task.result.report ? (
                    // Markdown report
                    <div className="bg-white border border-slate-200 rounded-xl p-6">
                      <div className="prose prose-slate max-w-none">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({ children }) => (
                              <h1 className="text-2xl font-bold text-slate-900 mb-4">{children}</h1>
                            ),
                            h2: ({ children }) => (
                              <h2 className="text-xl font-semibold text-slate-800 mt-6 mb-3">{children}</h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="text-lg font-medium text-slate-700 mt-4 mb-2">{children}</h3>
                            ),
                            a: ({ href, children }) => (
                              <a 
                                href={href} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline"
                              >
                                {children}
                              </a>
                            ),
                            ul: ({ children }) => (
                              <ul className="list-disc pl-6 space-y-1">{children}</ul>
                            ),
                            li: ({ children }) => (
                              <li className="text-slate-700">{children}</li>
                            ),
                            p: ({ children }) => (
                              <p className="text-slate-700 leading-relaxed mb-3">{children}</p>
                            ),
                            hr: () => (
                              <hr className="border-slate-200 my-6" />
                            )
                          }}
                        >
                          {task.result.report}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    // Structured data
                    <div className="bg-white border border-slate-200 rounded-xl p-6">
                      <pre className="text-sm text-slate-700 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(task.result, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Sources */}
                  {task.result.sources && task.result.sources.length > 0 && (
                    <div className="bg-slate-50 rounded-xl p-4">
                      <h4 className="font-medium text-slate-900 mb-3">
                        Sources ({task.result.sources.length})
                      </h4>
                      <div className="space-y-2">
                        {task.result.sources.slice(0, 5).map((source, index: number) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
                            <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                              {source.id || index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="font-medium text-slate-900 truncate">
                                {source.title}
                              </h5>
                              {source.url && (
                                <a 
                                  href={source.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:text-blue-800 truncate block"
                                >
                                  {source.url}
                                </a>
                              )}
                              {source.summary && (
                                <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                                  {source.summary}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Error */}
              {task.status === 'failed' && task.error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <h3 className="font-medium text-red-800 mb-2">Task Failed</h3>
                  <p className="text-red-700">{task.error}</p>
                </div>
              )}
            </div>
          )}

          {loading && !task && (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3 text-slate-600">
                <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin"></div>
                <span>Loading research task...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'pending':
      return (
        <div className="w-6 h-6 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center">
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
        </div>
      )
    case 'running':
      return (
        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
        </div>
      )
    case 'completed':
      return (
        <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <polyline points="20,6 9,17 4,12"/>
          </svg>
        </div>
      )
    case 'failed':
      return (
        <div className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </div>
      )
    default:
      return null
  }
} 