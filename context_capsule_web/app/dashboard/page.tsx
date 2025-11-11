'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Brain, Plus, Search, Filter, Loader2 } from 'lucide-react'

interface Capsule {
  id: string
  title: string
  description: string | null
  createdAt: string
  updatedAt: string
  artifacts?: Array<{
    id: string
    kind: string
    title: string | null
  }>
}

interface CapsuleListResponse {
  capsules: Capsule[]
  pagination: {
    total: number
    limit: number
    offset: number
  }
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()

  const [capsules, setCapsules] = useState<Capsule[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const pageSize = 12

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in')
    }
  }, [isLoaded, user, router])

  useEffect(() => {
    if (user) {
      fetchCapsules()
    }
  }, [user, page, searchQuery])

  const fetchCapsules = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: (page * pageSize).toString(),
        ...(searchQuery && { search: searchQuery }),
      })

      const response = await fetch(`/api/capsule?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch capsules')
      }

      const data: CapsuleListResponse = await response.json()
      setCapsules(data.capsules)
      setTotal(data.pagination.total)
    } catch (error) {
      console.error('Error fetching capsules:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setPage(0) // Reset to first page
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return `${Math.floor(diffDays / 365)} years ago`
  }

  if (!isLoaded || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Brain className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Context Capsule</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user.primaryEmailAddress?.emailAddress}
              </span>
              <button
                onClick={() => router.push('/dashboard/create')}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Capsule
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Search and Filters */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search capsules..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {total} {total === 1 ? 'capsule' : 'capsules'}
            </span>
          </div>
        </div>

        {/* Capsules Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : capsules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Brain className="mb-4 h-16 w-16 text-gray-300" />
            <h3 className="mb-2 text-lg font-semibold text-gray-900">No capsules yet</h3>
            <p className="mb-6 text-center text-gray-600">
              {searchQuery
                ? 'No capsules match your search.'
                : 'Save your brain state by creating your first capsule.'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => router.push('/dashboard/create')}
                className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Capsule
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {capsules.map((capsule) => (
                <div
                  key={capsule.id}
                  onClick={() => router.push(`/dashboard/capsule/${capsule.id}`)}
                  className="cursor-pointer rounded-lg border border-gray-200 bg-white p-6 transition-all hover:border-blue-500 hover:shadow-lg"
                >
                  <h3 className="mb-2 text-lg font-semibold text-gray-900 line-clamp-1">
                    {capsule.title}
                  </h3>
                  {capsule.description && (
                    <p className="mb-4 text-sm text-gray-600 line-clamp-2">
                      {capsule.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatDate(capsule.createdAt)}</span>
                    {capsule.artifacts && (
                      <span>{capsule.artifacts.length} items</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {total > pageSize && (
              <div className="mt-8 flex items-center justify-center space-x-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {page + 1} of {Math.ceil(total / pageSize)}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(total / pageSize) - 1}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
