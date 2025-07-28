'use client'

import { useState } from 'react'
import { Message } from '@/lib/supabase'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { CitationChip } from './CitationChip'
import { CopyButton } from './ui/copy-button'

interface MessageBubbleProps {
  message: Message
  isLatestAiMessage?: boolean
  disableAnimation?: boolean
}

export function MessageBubble({ message, disableAnimation }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  // User bubble (right aligned)
  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[78%] sm:max-w-[80%] md:max-w-[82%] lg:max-w-[85%] xl:max-w-[88%] 2xl:max-w-[90%] group">
          <div className={`px-5 py-3 text-white bg-gradient-to-br from-[#F6B63E] to-[#E98E00] shadow-md dark:shadow-none rounded-xl md:rounded-[18px] ml-auto relative ${!disableAnimation ? 'animate-slide-in-right' : ''}`}>
            {message.image_url && (
              <div className="mb-3">
                <img
                  src={message.image_url}
                  alt="Uploaded image"
                  className="max-w-full h-auto rounded-lg shadow-sm"
                />
              </div>
            )}
            <div>
              {message.content}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 px-1 justify-end">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {formatTimestamp(message.created_at)}
            </span>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <CopyButton content={message.content} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Assistant message with animated accent bar
  return (
    <div className="flex justify-start [&+&]:mt-1">
      <div className="w-full max-w-prose sm:max-w-[85ch] md:max-w-[90ch] lg:max-w-[110ch] xl:max-w-[130ch] 2xl:max-w-[150ch] group relative">
        <article className={`relative pl-4 my-2 prose prose-zinc dark:prose-invert ${!disableAnimation ? 'animate-slide-in-left' : ''}`}>
          <span className={`absolute left-0 top-0 h-full w-[3px] rounded-full bg-[#F5A623]/80 ${!disableAnimation ? 'animate-draw' : ''}`} />
          <AssistantMessage content={message.content} />

          {/* Citations */}
          {message.content.includes('[') && (
            <div className="mt-3 flex flex-wrap gap-2">
              {Array.from(message.content.matchAll(/\[(\d+)\]/g)).map(([, num], index) => (
                <CitationChip key={index} number={parseInt(num)} />
              ))}
            </div>
          )}
        </article>

        {/* Timestamp and model info */}
        <div className="flex items-center gap-2 mt-2 px-1">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {formatTimestamp(message.created_at)}
          </span>
          {message.model && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
              {message.model}
            </span>
          )}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <CopyButton content={message.content} />
          </div>
        </div>
      </div>
    </div>
  )
}

// Assistant message renderer with flat text and bubble code blocks
function AssistantMessage({ content }: { content: string }) {
  const processedContent = content
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$')
    .replace(/\\\[/g, '$$')
    .replace(/\\\]/g, '$$')

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[
        [rehypeKatex, {
          strict: false,
          trust: true,
          throwOnError: false,
          errorColor: '#cc0000',
          macros: {
            "\\RR": "\\mathbb{R}",
            "\\NN": "\\mathbb{N}",
            "\\ZZ": "\\mathbb{Z}",
            "\\QQ": "\\mathbb{Q}",
            "\\CC": "\\mathbb{C}"
          }
        }]
      ]}
      components={{
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '')
          
          if (!inline && match) {
            return (
              <CodeBlock className={className} language={match[1]}>
                {String(children).replace(/\n$/, '')}
              </CodeBlock>
            )
          }
          
          return (
            <code 
              className="bg-[var(--accent-soft)] px-1.5 py-0.5 rounded text-sm font-mono text-[var(--text-primary)]" 
              {...props}
            >
              {children}
            </code>
          )
        },
        
        h1: ({ children }) => (
          <h1 className="text-xl font-bold mb-3 mt-4 first:mt-0">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-lg font-bold mb-2 mt-4 first:mt-0">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-base font-bold mb-2 mt-3 first:mt-0">
            {children}
          </h3>
        ),
        
        p: ({ children }) => (
          <p className="mb-3 last:mb-0 leading-relaxed">
            {children}
          </p>
        ),
        
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-3 space-y-1">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-3 space-y-1">
            {children}
          </ol>
        ),
        
        a: ({ href, children }) => (
          <a 
            href={href} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[var(--brand-primary)] hover:underline font-medium"
          >
            {children}
          </a>
        ),
        
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-[var(--brand-primary)] pl-4 py-2 bg-[var(--accent-soft)] rounded-r-lg mb-3 italic">
            {children}
          </blockquote>
        ),
        
        table: ({ children }) => (
          <div className="overflow-x-auto mb-3">
            <table className="min-w-full border border-[var(--outline)] rounded-lg">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-[var(--accent-soft)]">
            {children}
          </thead>
        ),
        th: ({ children }) => (
          <th className="px-4 py-2 text-left font-semibold border-b border-[var(--outline)]">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-4 py-2 border-b border-[var(--outline)] last:border-b-0">
            {children}
          </td>
        ),
        
        hr: () => (
          <hr className="border-[var(--outline)] my-4" />
        )
      }}
    >
      {processedContent}
    </ReactMarkdown>
  )
}

// Bubble code block component
function CodeBlock({ children, className, language }: { children: string; className?: string; language: string }) {
  return (
    <div className="my-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-700/60 rounded-xl overflow-hidden relative">
      {/* Language label header */}
      <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 px-4 py-2 border-b border-zinc-200/70 dark:border-zinc-700/60">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
          {language || 'Code'}
        </span>
      </div>
      <pre className="p-4 overflow-x-auto text-sm leading-6 font-mono whitespace-pre">
        <code className={`text-zinc-800 dark:text-zinc-200 ${className}`}>
          {children}
        </code>
      </pre>
    </div>
  )
}