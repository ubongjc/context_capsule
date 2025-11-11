import { NextResponse } from 'next/server'

export function setSecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com https://*.clerk.accounts.dev https://js.stripe.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.clerk.accounts.dev https://api.stripe.com https://*.r2.cloudflarestorage.com https://*.sentry.io",
    "frame-src 'self' https://challenges.cloudflare.com https://*.clerk.accounts.dev https://js.stripe.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ].join('; ')

  // Set all security headers
  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // Strict Transport Security (HSTS) - only in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }

  return response
}

// CORS headers for API routes
export function setCORSHeaders(response: NextResponse, allowedOrigins: string[] = []): NextResponse {
  const origin = response.headers.get('origin')

  // Default allowed origins
  const defaultOrigins = [
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  ]

  const allowed = [...defaultOrigins, ...allowedOrigins]

  if (origin && allowed.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  } else if (allowed.length > 0) {
    response.headers.set('Access-Control-Allow-Origin', allowed[0])
  }

  response.headers.set('Access-Control-Allow-Credentials', 'true')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Max-Age', '86400')

  return response
}
