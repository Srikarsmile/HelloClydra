'use client'

interface JumpToLatestProps {
  onClick: () => void
  show: boolean
}

export function JumpToLatest({ onClick, show }: JumpToLatestProps) {
  if (!show) return null

  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-6 bg-[#F5A623] hover:bg-[#E98E00] text-white w-12 h-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-40 transform hover:scale-105 active:scale-95"
      aria-label="Jump to latest message"
    >
      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M7 13l5 5 5-5" />
      </svg>
    </button>
  )
}