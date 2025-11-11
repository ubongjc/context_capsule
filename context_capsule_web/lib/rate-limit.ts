import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory rate limiter for development
// In production, use Redis-based rate limiting (Upstash/Vercel KV)

interface RateLimitConfig {
  interval: number // Time window in milliseconds
  maxRequests: number // Max requests per window
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  })
}, 5 * 60 * 1000)

export function rateLimit(config: RateLimitConfig) {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    // Get IP address with proper proxy trust handling
    let ip = 'unknown'

    // Only trust proxy headers if explicitly configured
    const trustProxy = process.env.TRUST_PROXY === 'true'

    if (trustProxy) {
      // In production behind proxy, use forwarded headers
      ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
           req.headers.get('x-real-ip') ||
           'unknown'
    } else {
      // In development or direct access, use real-ip header if available
      ip = req.headers.get('x-real-ip') || 'unknown'
    }

    const key = `${ip}:${req.nextUrl.pathname}`
    const now = Date.now()

    if (!store[key] || store[key].resetTime < now) {
      // Create new entry
      store[key] = {
        count: 1,
        resetTime: now + config.interval
      }
      return null
    }

    store[key].count++

    if (store[key].count > config.maxRequests) {
      const retryAfter = Math.ceil((store[key].resetTime - now) / 1000)
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': store[key].resetTime.toString()
          }
        }
      )
    }

    return null
  }
}

// Preset configurations
export const rateLimitConfig = {
  // Standard API endpoints: 100 requests per minute
  standard: { interval: 60 * 1000, maxRequests: 100 },

  // Strict for auth endpoints: 10 requests per minute
  strict: { interval: 60 * 1000, maxRequests: 10 },

  // Upload endpoints: 20 requests per hour
  upload: { interval: 60 * 60 * 1000, maxRequests: 20 },

  // Create operations: 30 requests per minute
  create: { interval: 60 * 1000, maxRequests: 30 }
}

// Helper to add rate limit headers to responses
export function addRateLimitHeaders(response: NextResponse, config: RateLimitConfig, remaining: number): NextResponse {
  response.headers.set('X-RateLimit-Limit', config.maxRequests.toString())
  response.headers.set('X-RateLimit-Remaining', remaining.toString())
  return response
}
