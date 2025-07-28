'use client'

import { useState } from 'react'

export function EnvStatus() {
  const [showKeys, setShowKeys] = useState(false)
  
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  const isValidClerkKey = clerkPublishableKey && 
    clerkPublishableKey.startsWith('pk_') && 
    clerkPublishableKey.length > 50 &&
    !clerkPublishableKey.includes('your_clerk_publishable_key_here')

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Environment Status</h2>
      
      <div className="space-y-3">
        <div className={`p-3 rounded-lg ${isValidClerkKey ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center gap-2">
            <span className={isValidClerkKey ? 'text-green-600' : 'text-red-600'}>
              {isValidClerkKey ? '✅' : '❌'}
            </span>
            <span className="font-medium">Clerk Publishable Key</span>
          </div>
          {showKeys && (
            <div className="mt-2 text-xs font-mono bg-gray-100 p-2 rounded break-all">
              {clerkPublishableKey || 'Not set'}
            </div>
          )}
          {!isValidClerkKey && (
            <div className="mt-2 text-sm text-red-600">
              Key appears to be missing or truncated. Should start with &apos;pk_&apos; and be much longer.
            </div>
          )}
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm">
            <strong>Key Length:</strong> {clerkPublishableKey?.length || 0} characters
          </div>
          <div className="text-sm">
            <strong>Starts with pk_:</strong> {clerkPublishableKey?.startsWith('pk_') ? 'Yes' : 'No'}
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowKeys(!showKeys)}
        className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
      >
        {showKeys ? 'Hide Keys' : 'Show Keys'}
      </button>

      {!isValidClerkKey && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">🔧 How to Fix:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-700">
            <li>Go to your Clerk Dashboard</li>
            <li>Navigate to API Keys section</li>
            <li>Copy the complete Publishable Key (starts with pk_test_ or pk_live_)</li>
            <li>Update your .env.local file with the complete key</li>
            <li>Restart your development server</li>
          </ol>
        </div>
      )}
    </div>
  )
}