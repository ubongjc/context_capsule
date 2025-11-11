'use client'

import { useEffect } from 'react'
import { Brain } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to error reporting service (e.g., Sentry)
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-4 inline-flex items-center justify-center">
          <Brain className="h-12 w-12 text-blue-600" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-gray-900">
          Something went wrong
        </h2>
        <p className="mb-6 text-gray-600">
          We encountered an unexpected error. Please try again or contact support if the problem persists.
        </p>
        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-left">
            <p className="font-mono text-sm text-red-800">{error.message}</p>
          </div>
        )}
        <button
          onClick={reset}
          className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
