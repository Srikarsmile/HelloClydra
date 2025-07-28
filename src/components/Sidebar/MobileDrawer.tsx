'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

export function MobileDrawer({ isOpen, onClose, children }: MobileDrawerProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.classList.add('sidebar-open')
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.classList.remove('sidebar-open')
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen && drawerRef.current) {
      drawerRef.current.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/50 z-[100] md:hidden transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
        style={{ 
          willChange: 'opacity',
          backfaceVisibility: 'hidden'
        }}
      />
      
      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed left-0 top-0 h-full w-80 max-w-[85vw] z-[101] md:hidden transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        style={{ 
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {children}
      </div>
    </>,
    document.body
  )
}
