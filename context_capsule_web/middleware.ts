import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { setSecurityHeaders } from '@/lib/security-headers'
import { randomBytes } from 'crypto'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/health',
  '/api/webhooks(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  // HTTPS redirect in production
  if (process.env.NODE_ENV === 'production' && request.headers.get('x-forwarded-proto') !== 'https') {
    const url = request.nextUrl.clone()
    url.protocol = 'https'
    return NextResponse.redirect(url, { status: 301 })
  }

  // Apply authentication check
  if (!isPublicRoute(request)) {
    await auth.protect()
  }

  // Continue with the request
  const response = NextResponse.next()

  // Generate request ID for tracing
  const requestId = randomBytes(16).toString('hex')
  response.headers.set('X-Request-ID', requestId)

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
