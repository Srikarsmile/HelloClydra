'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

interface CopyButtonProps {
  content: string
  className?: string
}

export function CopyButton({ content, className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text:', err)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${className}`}
      title={copied ? 'Copied!' : 'Copy message'}
      aria-label={copied ? 'Copied' : 'Copy message'}
    >
      {copied ? (
        <Check className="w-3 h-3 text-green-500" />
      ) : (
        <Copy className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
      )}
    </button>
  )
}