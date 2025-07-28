'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'

interface WelcomeCardsProps {
  onPromptSelect: (prompt: string) => void
}

const promptCategories = {
  create: {
    icon: '✨',
    title: 'Create',
    description: 'Generate content & ideas',
    prompts: [
      'Write a professional email',
      'Create a marketing strategy',
      'Draft a blog post'
    ]
  },
  explore: {
    icon: '🔍',
    title: 'Explore',
    description: 'Research & discover',
    prompts: [
      'Research AI trends',
      'Compare investment options',
      'Analyze market data'
    ]
  },
  code: {
    icon: '💻',
    title: 'Code',
    description: 'Build & debug',
    prompts: [
      'Debug my Python script',
      'Write a JavaScript function',
      'Create a REST API'
    ]
  },
  learn: {
    icon: '📚',
    title: 'Learn',
    description: 'Understand & master',
    prompts: [
      'Explain quantum computing',
      'Teach me machine learning',
      'Financial investing basics'
    ]
  }
}

export function WelcomeCards({ onPromptSelect }: WelcomeCardsProps) {
  const { user } = useUser()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const handlePromptClick = (prompt: string) => {
    onPromptSelect(prompt)
    setActiveCategory(null) // Close tooltip after selection
  }

  const handleCategoryClick = (key: string) => {
    // For touch devices, toggle the tooltip
    if (activeCategory === key) {
      setActiveCategory(null)
    } else {
      setActiveCategory(key)
    }
  }

  const shouldShowTooltip = (key: string) => {
    return activeCategory === key
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      {/* Personalized Greeting */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-3">
          How can I help you, {user?.firstName || 'there'}?
        </h1>
        <p className="text-lg text-[var(--text-subtle)]">
          Choose a category below to get started
        </p>
      </div>

      {/* Simple Category Cards */}
      <div className="max-w-3xl mx-auto mb-8">
        {/* Card Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {Object.entries(promptCategories).map(([key, category]) => (
            <button
              key={key}
              onClick={() => handleCategoryClick(key)}
              className={`p-3 rounded-lg bg-[var(--card)] border border-[var(--outline)] hover:border-[var(--accent)] text-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 ${shouldShowTooltip(key) ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : ''}`}
            >
              <div className="text-xl mb-1">{category.icon}</div>
              <div className="font-semibold text-[var(--fg)] text-xs">{category.title}</div>
            </button>
          ))}
        </div>

        {/* Expanded Content Area */}
        {activeCategory && (
          <div className="mt-4">
            <div className="bg-[var(--card)] border border-[var(--outline)] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[var(--outline)]">
                <span className="text-lg">{promptCategories[activeCategory as keyof typeof promptCategories].icon}</span>
                <span className="font-semibold text-[var(--fg)]">{promptCategories[activeCategory as keyof typeof promptCategories].title}</span>
              </div>
              <div className="space-y-2">
                {promptCategories[activeCategory as keyof typeof promptCategories].prompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handlePromptClick(prompt)}
                    className="w-full text-left p-3 text-sm text-[var(--text-subtle)] hover:text-[var(--fg)] hover:bg-[var(--accent-soft)] rounded-lg transition-colors duration-200"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Helper Text */}
      <div className="text-center">
        <p className="text-sm text-[var(--text-subtle)]">
          Click a category above for quick prompts, or start typing below
        </p>
      </div>
    </div>
  )
}