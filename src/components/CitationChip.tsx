'use client'

interface CitationChipProps {
  number: number
  onClick?: () => void
}

export function CitationChip({ number, onClick }: CitationChipProps) {
  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      // Default behavior: scroll to citation reference
      const element = document.getElementById(`citation-${number}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center justify-center w-6 h-6 bg-[var(--brand-primary)] text-white text-xs font-medium rounded-full hover:bg-[var(--brand-primary)]/80 transition-colors focus-brand"
      title={`Go to citation ${number}`}
    >
      {number}
    </button>
  )
}