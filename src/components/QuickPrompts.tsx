'use client'

interface QuickPromptsProps {
  onPromptSelect: (prompt: string) => void
}

const quickPrompts = [
  {
    icon: '🚀',
    title: 'Code Helper',
    prompt: 'Help me write a Python script to analyze CSV data'
  },
  {
    icon: '💡',
    title: 'Explain Simply',
    prompt: 'Explain quantum computing like I\'m 10 years old'
  },
  {
    icon: '📚',
    title: 'Writing Assistant',
    prompt: 'Help me write a compelling cover letter'
  },
  {
    icon: '🔍',
    title: 'Research Helper',
    prompt: 'Research the latest trends in artificial intelligence'
  }
]

export function QuickPrompts({ onPromptSelect }: QuickPromptsProps) {
  return (
    <div className="space-y-3">
      <div className="text-center mb-4">
        <div className="w-12 h-12 bg-[var(--brand-primary)]/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="var(--brand-primary)" strokeWidth={2}>
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
        </div>
        <h3 className="font-semibold text-[var(--text-primary)] mb-1">Quick Prompts</h3>
        <p className="text-xs text-[var(--text-subtle)]">Get started with these suggestions</p>
      </div>
      
      <div className="grid grid-cols-1 gap-2">
        {quickPrompts.map((prompt, index) => (
          <button
            key={index}
            onClick={() => onPromptSelect(prompt.prompt)}
            className="flex items-center gap-3 p-3 text-left bg-white dark:bg-gray-800 hover:bg-[var(--accent-soft)] dark:hover:bg-gray-700 border border-[var(--outline)] dark:border-gray-600 hover:border-[var(--brand-primary)]/20 rounded-lg transition-all duration-200 hover:shadow-sm focus-brand group"
          >
            <span className="text-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
              {prompt.icon}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[var(--text-primary)] mb-1">
                {prompt.title}
              </div>
              <div className="text-xs text-[var(--text-subtle)] line-clamp-2">
                {prompt.prompt}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}