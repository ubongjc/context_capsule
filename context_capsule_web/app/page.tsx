import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { Brain, Shield, Zap, Lock } from 'lucide-react'

export default async function Home() {
  const { userId } = await auth()

  // Redirect authenticated users to dashboard
  if (userId) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-screen flex-col items-center justify-center text-center">
          <div className="mb-8 inline-flex items-center rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600">
            <Brain className="mr-2 h-4 w-4" />
            Context Capsule
          </div>

          <h1 className="mb-6 max-w-4xl text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Save Your Brain State,
            <br />
            <span className="text-blue-600">Switch Tasks Instantly</span>
          </h1>

          <p className="mb-10 max-w-2xl text-xl text-gray-600">
            Capture and restore your complete working context with one tap.
            Never lose your flow when switching between projects.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-8 py-3 text-base font-semibold text-white hover:bg-blue-700"
            >
              Get Started Free
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-8 py-3 text-base font-semibold text-gray-900 hover:bg-gray-50"
            >
              Sign In
            </Link>
          </div>

          {/* Features */}
          <div className="mt-20 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="mb-4 inline-flex rounded-lg bg-blue-50 p-3">
                <Brain className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="mb-2 font-semibold text-gray-900">Instant Capture</h3>
              <p className="text-sm text-gray-600">
                Save your entire working context with a single tap
              </p>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="mb-4 inline-flex rounded-lg bg-green-50 p-3">
                <Lock className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="mb-2 font-semibold text-gray-900">End-to-End Encrypted</h3>
              <p className="text-sm text-gray-600">
                All data encrypted client-side before leaving your device
              </p>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="mb-4 inline-flex rounded-lg bg-purple-50 p-3">
                <Zap className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="mb-2 font-semibold text-gray-900">Cross-Platform</h3>
              <p className="text-sm text-gray-600">
                Seamless sync between web and iOS devices
              </p>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="mb-4 inline-flex rounded-lg bg-orange-50 p-3">
                <Shield className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="mb-2 font-semibold text-gray-900">Privacy First</h3>
              <p className="text-sm text-gray-600">
                Zero-knowledge architecture. We can't read your data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
