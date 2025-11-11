import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { setSecurityHeaders } from '@/lib/security-headers'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/health',
  '/api/webhooks(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  // Apply authentication check
  if (!isPublicRoute(request)) {
    await auth.protect()
  }

  // Continue with the request
  const response = NextResponse.next()

  // Apply security headers to all responses
  return setSecurityHeaders(response)
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
