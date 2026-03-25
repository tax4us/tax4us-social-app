/**
 * Authentication Middleware for TAX4US
 * Provides standardized authentication across all API routes
 */

import { NextRequest } from 'next/server'
import { AuthenticationError, requireAuth } from '../utils/error-handler'
import { logger } from '../utils/logger'

// Authentication configuration
const AUTH_CONFIG = {
  // Admin routes require admin password
  admin: {
    secrets: [process.env.ADMIN_PASSWORD].filter(Boolean) as string[]
  },
  
  // Cron routes require cron secret
  cron: {
    secrets: [
      process.env.CRON_SECRET,
      // Remove test key in production
      ...(process.env.NODE_ENV !== 'production' ? ['tax4us_local_test_key'] : [])
    ].filter(Boolean) as string[]
  },

  // API routes require API key
  api: {
    secrets: [
      process.env.API_KEY,
      process.env.CRON_SECRET, // Allow cron secret for internal calls
    ].filter(Boolean) as string[]
  },

  // Public routes (no auth required)
  public: {
    secrets: [] as string[]
  }
}

export type AuthLevel = keyof typeof AUTH_CONFIG

// Extract auth header from request
function getAuthHeader(request: NextRequest): string | null {
  return request.headers.get('authorization')
}

// Check if route should be authenticated
export function requiresAuth(pathname: string): { required: boolean; level: AuthLevel } {
  // Admin routes
  if (pathname.startsWith('/api/admin/')) {
    return { required: true, level: 'admin' }
  }

  // Cron routes
  if (pathname.startsWith('/api/cron/')) {
    return { required: true, level: 'cron' }
  }

  // Pipeline management routes (internal)
  if (pathname.includes('/api/pipeline/')) {
    return { required: true, level: 'api' }
  }

  // Content generation (resource intensive)
  if (pathname.includes('/api/content/generate')) {
    return { required: true, level: 'api' }
  }

  // Social media operations
  if (pathname.includes('/api/social')) {
    return { required: true, level: 'api' }
  }

  // Video generation (resource intensive)
  if (pathname.includes('/api/video')) {
    return { required: true, level: 'api' }
  }

  // WordPress operations
  if (pathname.includes('/api/wordpress')) {
    return { required: true, level: 'api' }
  }

  // Default to public (but log for monitoring)
  logger.debug('AuthMiddleware', `Public route accessed: ${pathname}`)
  return { required: false, level: 'public' }
}

// Authenticate request based on route requirements
export function authenticateRequest(request: NextRequest, level: AuthLevel): void {
  const config = AUTH_CONFIG[level]
  
  // If no secrets configured for this level, allow through
  // (but log warning for admin/api levels)
  if (config.secrets.length === 0) {
    if (level === 'admin' || level === 'api') {
      logger.warn('AuthMiddleware', `No secrets configured for ${level} level - allowing through`)
    }
    return
  }

  const authHeader = getAuthHeader(request)
  const authValidator = requireAuth(config.secrets)
  
  try {
    authValidator(authHeader)
    logger.debug('AuthMiddleware', `Successfully authenticated for ${level} level`)
  } catch (error) {
    logger.warn('AuthMiddleware', `Authentication failed for ${level} level`, {
      hasHeader: !!authHeader,
      route: request.nextUrl.pathname
    })
    throw error
  }
}

// Middleware wrapper for API routes
export function withAuth<T extends any[]>(
  handler: (...args: T) => Promise<Response>,
  level: AuthLevel = 'api'
) {
  return async (...args: T): Promise<Response> => {
    // Assume first argument is NextRequest
    const request = args[0] as NextRequest
    
    try {
      const authInfo = requiresAuth(request.nextUrl.pathname)
      
      if (authInfo.required) {
        authenticateRequest(request, authInfo.level)
      }
      
      return await handler(...args)
    } catch (error) {
      if (error instanceof AuthenticationError) {
        logger.api(request.nextUrl.pathname, request.method, 401, error.message)
      }
      throw error
    }
  }
}

// Rate limiting configuration (basic implementation)
const RATE_LIMITS = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string, 
  limit: number = 100, 
  windowMs: number = 60 * 1000 // 1 minute
): void {
  const now = Date.now()
  const current = RATE_LIMITS.get(identifier)

  if (!current || now > current.resetTime) {
    RATE_LIMITS.set(identifier, { count: 1, resetTime: now + windowMs })
    return
  }

  if (current.count >= limit) {
    logger.warn('RateLimit', `Rate limit exceeded for ${identifier}`, {
      currentCount: current.count,
      limit,
      resetTime: new Date(current.resetTime).toISOString()
    })
    throw new AuthenticationError('Rate limit exceeded')
  }

  current.count++
}

// IP-based rate limiting
export function rateLimitByIP(request: NextRequest, limit: number = 100): void {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded ? forwarded.split(',')[0] : realIp || 'unknown'
  checkRateLimit(`ip:${ip}`, limit)
}

// Enhanced authentication middleware with rate limiting
export function withAuthAndRateLimit<T extends any[]>(
  handler: (...args: T) => Promise<Response>,
  level: AuthLevel = 'api',
  rateLimit: number = 100
) {
  return async (...args: T): Promise<Response> => {
    const request = args[0] as NextRequest
    
    try {
      // Apply rate limiting first
      if (rateLimit > 0) {
        rateLimitByIP(request, rateLimit)
      }

      // Then apply authentication
      const authInfo = requiresAuth(request.nextUrl.pathname)
      
      if (authInfo.required) {
        authenticateRequest(request, authInfo.level)
      }
      
      return await handler(...args)
    } catch (error) {
      if (error instanceof AuthenticationError) {
        logger.api(request.nextUrl.pathname, request.method, 401, error.message)
      }
      throw error
    }
  }
}

export default {
  requiresAuth,
  authenticateRequest,
  withAuth,
  withAuthAndRateLimit,
  rateLimitByIP,
  checkRateLimit
}