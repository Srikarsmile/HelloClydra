'use client'

import React, { lazy, Suspense } from 'react'
import 'katex/dist/katex.min.css'

// Create a lazy-loaded markdown renderer component
const LazyMarkdownRenderer = lazy(() => 
  Promise.all([
    import('react-markdown'),
    import('remark-gfm'),
    import('remark-math'),
    import('rehype-katex')
  ]).then(([ReactMarkdown, remarkGfm, remarkMath, rehypeKatex]) => {
    return {
      default: ({ content, components }: { content: string, components: any }) => (
        <ReactMarkdown.default
          remarkPlugins={[remarkGfm.default, remarkMath.default]}
          rehypePlugins={[[rehypeKatex.default, {
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
          }]]}
          components={components}
        >
          {content}
        </ReactMarkdown.default>
      )
    }
  })
)

interface MDXMessageProps {
  content: string
}

interface CodeBlockProps {
  children: string
  className?: string
}

function CodeBlock({ children, className }: CodeBlockProps) {
  const language = className?.replace('language-', '') || 'text'

  return (
    <div className="relative group">
      <div className="flex items-center bg-[var(--accent-soft)] px-4 py-2 rounded-t-lg border-b border-[var(--outline)]">
        <span className="text-xs font-medium text-[var(--text-subtle)] uppercase">
          {language}
        </span>
      </div>
      <pre className="bg-[var(--bg-canvas)] p-4 rounded-b-lg overflow-x-auto">
        <code className={`text-sm ${className}`}>
          {children}
        </code>
      </pre>
    </div>
  )
}

export function MDXMessage({ content }: MDXMessageProps) {
  // Pre-process content to ensure proper LaTeX delimiters
  const processedContent = content
    .replace(/\\\(/g, '$')  // Convert \( to $
    .replace(/\\\)/g, '$')  // Convert \) to $
    .replace(/\\\[/g, '$$') // Convert \[ to $$
    .replace(/\\\]/g, '$$') // Convert \] to $$

  const markdownComponents = {
          // Code blocks
          code({ node, inline, className, children, ...props }: { 
            node?: any, 
            inline?: boolean, 
            className?: string, 
            children: React.ReactNode,
            [key: string]: any 
          }) {
            const match = /language-(\w+)/.exec(className || '')
            
            if (!inline && match) {
              return (
                <CodeBlock className={className}>
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
          
          // Headings
          h1: ({ children }: { children: React.ReactNode }) => (
            <h1 className="text-xl font-bold text-[var(--text-primary)] mb-3 mt-4 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }: { children: React.ReactNode }) => (
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2 mt-4 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }: { children: React.ReactNode }) => (
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-2 mt-3 first:mt-0">
              {children}
            </h3>
          ),
          
          // Paragraphs
          p: ({ children }: { children: React.ReactNode }) => (
            <p className="text-[var(--text-primary)] mb-3 last:mb-0 leading-relaxed">
              {children}
            </p>
          ),
          
          // Lists
          ul: ({ children }: { children: React.ReactNode }) => (
            <ul className="list-disc list-inside mb-3 space-y-1 text-[var(--text-primary)]">
              {children}
            </ul>
          ),
          ol: ({ children }: { children: React.ReactNode }) => (
            <ol className="list-decimal list-inside mb-3 space-y-1 text-[var(--text-primary)]">
              {children}
            </ol>
          ),
          li: ({ children }: { children: React.ReactNode }) => (
            <li className="text-[var(--text-primary)]">
              {children}
            </li>
          ),
          
          // Links
          a: ({ href, children }: { href?: string, children: React.ReactNode }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[var(--brand-primary)] hover:underline font-medium"
            >
              {children}
            </a>
          ),
          
          // Blockquotes
          blockquote: ({ children }: { children: React.ReactNode }) => (
            <blockquote className="border-l-4 border-[var(--brand-primary)] pl-4 py-2 bg-[var(--accent-soft)] rounded-r-lg mb-3 italic text-[var(--text-primary)]">
              {children}
            </blockquote>
          ),
          
          // Tables
          table: ({ children }: { children: React.ReactNode }) => (
            <div className="overflow-x-auto mb-3">
              <table className="min-w-full border border-[var(--outline)] rounded-lg">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }: { children: React.ReactNode }) => (
            <thead className="bg-[var(--accent-soft)]">
              {children}
            </thead>
          ),
          th: ({ children }: { children: React.ReactNode }) => (
            <th className="px-4 py-2 text-left font-semibold text-[var(--text-primary)] border-b border-[var(--outline)]">
              {children}
            </th>
          ),
          td: ({ children }: { children: React.ReactNode }) => (
            <td className="px-4 py-2 text-[var(--text-primary)] border-b border-[var(--outline)] last:border-b-0">
              {children}
            </td>
          ),
          
          // Horizontal rule
          hr: () => (
            <hr className="border-[var(--outline)] my-4" />
          ),
          
          // Strong/Bold
          strong: ({ children }: { children: React.ReactNode }) => (
            <strong className="font-bold text-[var(--text-primary)]">
              {children}
            </strong>
          ),
          
          // Emphasis/Italic
          em: ({ children }: { children: React.ReactNode }) => (
            <em className="italic text-[var(--text-primary)]">
              {children}
            </em>
          )
  }

  return (
    <div className="prose prose-sm max-w-none">
      <Suspense fallback={
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      }>
        <LazyMarkdownRenderer 
          content={processedContent} 
          components={markdownComponents}
        />
      </Suspense>
    </div>
  )
}