'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Brain, ArrowLeft, Trash2, Edit, RefreshCw, Loader2, ExternalLink } from 'lucide-react'
import { decryptArtifactBlob } from '@/lib/encryption'

interface Artifact {
  id: string
  kind: string
  title: string | null
  encryptedBlob: string | null
  metadata: any
  storageUrl: string | null
  createdAt: string
}

interface Capsule {
  id: string
  title: string
  description: string | null
  snapshotMeta: any
  createdAt: string
  updatedAt: string
  artifacts: Artifact[]
}

export default function CapsuleDetailPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [capsule, setCapsule] = useState<Capsule | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in')
    }
  }, [isLoaded, user, router])

  useEffect(() => {
    if (user && id) {
      fetchCapsule()
    }
  }, [user, id])

  const fetchCapsule = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/capsule/${id}`)

      if (!response.ok) {
        if (response.status === 404) {
          setError('Capsule not found')
        } else {
          throw new Error('Failed to fetch capsule')
        }
        return
      }

      const data: Capsule = await response.json()
      setCapsule(data)
    } catch (error) {
      console.error('Error fetching capsule:', error)
      setError('Failed to load capsule')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this capsule? This action cannot be undone.')) {
      return
    }

    try {
      setDeleting(true)
      const response = await fetch(`/api/capsule/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete capsule')
      }

      router.push('/dashboard')
    } catch (error) {
      console.error('Error deleting capsule:', error)
      alert('Failed to delete capsule')
    } finally {
      setDeleting(false)
    }
  }

  const handleRestore = async () => {
    try {
      setRestoring(true)
      const response = await fetch(`/api/restore/${id}`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to restore capsule')
      }

      const data = await response.json()

      // Decrypt artifacts
      const decryptedArtifacts = await Promise.all(
        data.artifacts.map(async (artifact: Artifact) => {
          if (artifact.encryptedBlob) {
            try {
              const decrypted = await decryptArtifactBlob(artifact.encryptedBlob)
              return { ...artifact, decryptedContent: decrypted }
            } catch (error) {
              console.error('Failed to decrypt artifact:', error)
              return artifact
            }
          }
          return artifact
        })
      )

      // TODO: Implement actual restoration logic (open tabs, restore notes, etc.)
      console.log('Restored capsule with artifacts:', decryptedArtifacts)
      alert('Capsule restored! Check console for decrypted data.')
    } catch (error) {
      console.error('Error restoring capsule:', error)
      alert('Failed to restore capsule')
    } finally {
      setRestoring(false)
    }
  }

  const getArtifactIcon = (kind: string) => {
    switch (kind) {
      case 'TAB':
        return '🌐'
      case 'NOTE':
        return '📝'
      case 'FILE':
        return '📄'
      case 'SELECTION':
        return '✂️'
      case 'SCROLL_POSITION':
        return '📍'
      default:
        return '📦'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!isLoaded || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error || !capsule) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <button
            onClick={() => router.back()}
            className="mb-8 inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </button>
          <div className="rounded-lg bg-white p-8 text-center">
            <h2 className="mb-2 text-2xl font-bold text-gray-900">{error || 'Capsule not found'}</h2>
            <p className="text-gray-600">The capsule you're looking for doesn't exist or you don't have access to it.</p>
          </div>
        </div>
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
              <button
                onClick={() => router.back()}
                className="rounded-lg p-2 hover:bg-gray-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <Brain className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Capsule Details</h1>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRestore}
                disabled={restoring}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {restoring ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Restore
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Capsule Info */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-2xl font-bold text-gray-900">{capsule.title}</h2>
            {capsule.description && (
              <p className="mb-4 text-gray-600">{capsule.description}</p>
            )}
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <span>Created: {formatDate(capsule.createdAt)}</span>
              <span>•</span>
              <span>Last updated: {formatDate(capsule.updatedAt)}</span>
              <span>•</span>
              <span>{capsule.artifacts.length} artifacts</span>
            </div>
          </div>

          {/* Artifacts */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Artifacts</h3>
            {capsule.artifacts.length === 0 ? (
              <p className="text-center text-gray-500">No artifacts in this capsule</p>
            ) : (
              <div className="space-y-3">
                {capsule.artifacts.map((artifact) => (
                  <div
                    key={artifact.id}
                    className="flex items-start space-x-4 rounded-lg border border-gray-200 p-4"
                  >
                    <span className="text-2xl">{getArtifactIcon(artifact.kind)}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">
                          {artifact.title || artifact.kind}
                        </h4>
                        <span className="text-xs text-gray-500">{artifact.kind}</span>
                      </div>
                      {artifact.metadata?.url && (
                        <a
                          href={artifact.metadata.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
                        >
                          {artifact.metadata.url}
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      )}
                      {artifact.encryptedBlob && (
                        <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">
                          🔒 Encrypted
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
