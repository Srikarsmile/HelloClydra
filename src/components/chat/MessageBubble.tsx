'use client'

import React, { memo } from 'react'
import clsx from 'clsx'

interface MessageBubbleProps {
  message: string
  isUser: boolean
  darkMode: boolean
}

const MessageBubble = memo(function MessageBubble({ message, isUser, darkMode }: MessageBubbleProps) {
  const userStyles = {
    background: darkMode ? 'linear-gradient(to right, #FFB847, #C47C00)' : 'linear-gradient(to right, #F8C76E, #F3A340)',
    color: darkMode ? '#1A1409' : '#FFFFFF',
  }

  const assistantStyles = {
    backgroundColor: darkMode ? '#2A2A2A' : '#FBEEDC',
    color: darkMode ? '#E2E8F0' : '#2D3748',
    borderLeft: darkMode ? '3px solid #C47C00' : '3px solid #F3A340',
  }

  return (
    <div
      style={isUser ? userStyles : assistantStyles}
      className={clsx(
        'overflow-hidden rounded-xl shadow-lg m-2 max-w-xs sm:max-w-md lg:max-w-lg p-4',
        {
          'ml-auto': isUser,
          'bg-white dark:bg-slate-800 shadow': !isUser,
        }
      )}
    >
      <p className="text-sm" style={{ marginBottom: 0 }}>{message}</p>
    </div>
  )
})

export default MessageBubble
