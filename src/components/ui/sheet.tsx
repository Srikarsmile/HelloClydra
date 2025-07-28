'use client'

import { useEffect, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

interface SheetContentProps {
  side?: 'left' | 'right'
  className?: string
  children: ReactNode
}

export function Sheet({ open, onOpenChange, children }: SheetProps) {
  // Enhanced mobile body scroll lock
  useEffect(() => {
    if (open) {
      // Prevent body scroll and handle iOS viewport issues
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      document.body.style.height = '100%'
      
      // Prevent touch scrolling on iOS
      const preventScroll = (e: TouchEvent) => {
        if (e.target && (e.target as Element).closest('.sheet-content')) {
          return // Allow scrolling within sheet content
        }
        e.preventDefault()
      }
      
      document.addEventListener('touchmove', preventScroll, { passive: false })
      
      return () => {
        document.removeEventListener('touchmove', preventScroll)
      }
    } else {
      // Restore body scroll
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.height = ''
    }

    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.height = ''
    }
  }, [open])

  if (!open) return null

  return (
    <>
      {/* Enhanced backdrop with better touch handling */}
      <div
        className="fixed inset-0 bg-black/50 z-40 touch-manipulation"
        onClick={() => onOpenChange(false)}
        onTouchStart={(e) => {
          // Immediate visual feedback
          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)'
        }}
        onTouchEnd={() => {
          onOpenChange(false)
        }}
        style={{ 
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'none'
        }}
      />
      {children}
    </>
  )
}

export function SheetContent({ side = 'left', className, children }: SheetContentProps) {
  return (
    <div
      className={cn(
        'sheet-content fixed top-0 z-50 h-full bg-[var(--card)] shadow-xl transition-transform duration-300 ease-out',
        side === 'left' ? 'left-0' : 'right-0',
        className
      )}
      style={{
        WebkitOverflowScrolling: 'touch',
        overflowY: 'auto',
        touchAction: 'pan-y'
      }}
    >
      {children}
    </div>
  )
}
