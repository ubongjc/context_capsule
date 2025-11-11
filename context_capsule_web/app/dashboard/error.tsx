'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Brain, ArrowLeft } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    // Log error to error reporting service
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push('/')}
              className="rounded-lg p-2 hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <Brain className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-900">
            Unable to load dashboard
          </h2>
          <p className="mb-6 text-gray-600">
            We encountered an error loading your dashboard. Please try again.
          </p>
          {process.env.NODE_ENV === 'development' && error.message && (
            <div className="mx-auto mb-6 max-w-2xl rounded-lg bg-red-50 p-4 text-left">
              <p className="font-mono text-sm text-red-800">{error.message}</p>
            </div>
          )}
          <div className="flex justify-center space-x-3">
            <button
              onClick={reset}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Try again
            </button>
            <button
              onClick={() => router.push('/')}
              className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Go home
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
