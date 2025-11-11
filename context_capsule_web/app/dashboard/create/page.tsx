'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Brain, ArrowLeft, Plus, X, Loader2 } from 'lucide-react'
import { encryptArtifactBlob } from '@/lib/encryption'

interface Artifact {
  kind: 'TAB' | 'NOTE' | 'FILE' | 'SELECTION' | 'SCROLL_POSITION'
  title: string
  content: string
  metadata?: Record<string, any>
}

export default function CreateCapsulePage() {
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // New artifact form
  const [showArtifactForm, setShowArtifactForm] = useState(false)
  const [newArtifact, setNewArtifact] = useState<Artifact>({
    kind: 'NOTE',
    title: '',
    content: '',
  })

  const handleAddArtifact = () => {
    if (!newArtifact.title || !newArtifact.content) {
      alert('Please fill in both title and content')
      return
    }

    setArtifacts([...artifacts, newArtifact])
    setNewArtifact({
      kind: 'NOTE',
      title: '',
      content: '',
    })
    setShowArtifactForm(false)
  }

  const handleRemoveArtifact = (index: number) => {
    setArtifacts(artifacts.filter((_, i) => i !== index))
  }

  const handleCaptureTabs = async () => {
    // In a real implementation, this would use a browser extension or API
    // For now, we'll add a sample tab artifact
    const tabs = [
      {
        kind: 'TAB' as const,
        title: 'Example Tab',
        content: window.location.href,
        metadata: {
          url: window.location.href,
          timestamp: new Date().toISOString(),
        },
      },
    ]

    setArtifacts([...artifacts, ...tabs])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title) {
      setError('Title is required')
      return
    }

    try {
      setCreating(true)
      setError(null)

      // Encrypt artifact blobs
      const encryptedArtifacts = await Promise.all(
        artifacts.map(async (artifact) => ({
          kind: artifact.kind,
          title: artifact.title,
          encryptedBlob: await encryptArtifactBlob(artifact.content),
          metadata: artifact.metadata || {},
        }))
      )

      const response = await fetch('/api/capsule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description: description || undefined,
          snapshotMeta: {
            browser: navigator.userAgent,
            timestamp: new Date().toISOString(),
          },
          artifacts: encryptedArtifacts,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create capsule')
      }

      const capsule = await response.json()
      router.push(`/dashboard/capsule/${capsule.id}`)
    } catch (error) {
      console.error('Error creating capsule:', error)
      setError(error instanceof Error ? error.message : 'Failed to create capsule')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.back()}
              className="rounded-lg p-2 hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <Brain className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Create New Capsule</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g., Work Session - Project X"
                  required
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description (optional)
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Add notes about this context..."
                />
              </div>
            </div>
          </div>

          {/* Capture Actions */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Quick Capture</h2>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleCaptureTabs}
                className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                🌐 Capture Open Tabs
              </button>
              <button
                type="button"
                onClick={() => setShowArtifactForm(true)}
                className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Artifact
              </button>
            </div>
          </div>

          {/* Artifacts */}
          {(artifacts.length > 0 || showArtifactForm) && (
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Artifacts ({artifacts.length})
              </h2>

              {/* New Artifact Form */}
              {showArtifactForm && (
                <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">New Artifact</h3>
                    <button
                      type="button"
                      onClick={() => setShowArtifactForm(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Type</label>
                      <select
                        value={newArtifact.kind}
                        onChange={(e) =>
                          setNewArtifact({ ...newArtifact, kind: e.target.value as any })
                        }
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                      >
                        <option value="NOTE">Note</option>
                        <option value="TAB">Tab/URL</option>
                        <option value="FILE">File</option>
                        <option value="SELECTION">Selection</option>
                        <option value="SCROLL_POSITION">Scroll Position</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Title</label>
                      <input
                        type="text"
                        value={newArtifact.title}
                        onChange={(e) => setNewArtifact({ ...newArtifact, title: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                        placeholder="e.g., Important meeting notes"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Content</label>
                      <textarea
                        value={newArtifact.content}
                        onChange={(e) =>
                          setNewArtifact({ ...newArtifact, content: e.target.value })
                        }
                        rows={4}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                        placeholder="Add your content here..."
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddArtifact}
                      className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Add Artifact
                    </button>
                  </div>
                </div>
              )}

              {/* Artifact List */}
              <div className="space-y-3">
                {artifacts.map((artifact, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between rounded-lg border border-gray-200 p-4"
                  >
                    <div className="flex-1">
                      <div className="mb-1 flex items-center space-x-2">
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                          {artifact.kind}
                        </span>
                        <h4 className="font-medium text-gray-900">{artifact.title}</h4>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{artifact.content}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveArtifact(index)}
                      className="ml-4 text-red-600 hover:text-red-700"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              disabled={creating}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !title}
              className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Capsule'
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
