/**
 * TAX4US Error Handling System
 * Standardizes error handling across all API routes and services
 */

import { NextResponse } from 'next/server'
import { logger } from './logger'

// Standard error types for the application
export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly component: string
  public readonly context?: Record<string, any>

  constructor(
    message: string,
    statusCode: number = 500,
    component: string = 'Unknown',
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.component = component
    this.context = context
    
    Object.setPrototypeOf(this, AppError.prototype)
    Error.captureStackTrace(this, this.constructor)
  }
}

// Specific error classes
export class ValidationError extends AppError {
  constructor(message: string, component: string, context?: Record<string, any>) {
    super(message, 400, component, true, context)
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Unauthorized', component: string = 'Auth') {
    super(message, 401, component)
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Forbidden', component: string = 'Auth') {
    super(message, 403, component)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, component: string) {
    super(`${resource} not found`, 404, component)
  }
}

export class ConflictError extends AppError {
  constructor(message: string, component: string, context?: Record<string, any>) {
    super(message, 409, component, true, context)
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, component: string, context?: Record<string, any>) {
    super(`${service} service error: ${message}`, 502, component, true, context)
  }
}

export class RateLimitError extends AppError {
  constructor(component: string) {
    super('Rate limit exceeded', 429, component)
  }
}

// Error handling utilities
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational
  }
  return false
}

// Standard error response format
interface ErrorResponse {
  success: false
  error: {
    message: string
    code: string
    component: string
    timestamp: string
    requestId?: string
    details?: Record<string, any>
  }
}

// Create standardized error response
export function createErrorResponse(
  error: AppError | Error,
  requestId?: string
): NextResponse<ErrorResponse> {
  let statusCode = 500
  let component = 'Unknown'
  let context: Record<string, any> | undefined

  if (error instanceof AppError) {
    statusCode = error.statusCode
    component = error.component
    context = error.context
  }

  // Log the error
  logger.error(component, error.message, {
    stack: error.stack,
    context,
    requestId
  })

  // Create response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      message: error.message,
      code: error.constructor.name,
      component,
      timestamp: new Date().toISOString(),
      requestId,
      ...(context && { details: context })
    }
  }

  // Don't expose internal details in production
  if (process.env.NODE_ENV === 'production') {
    delete errorResponse.error.details
    if (statusCode >= 500) {
      errorResponse.error.message = 'Internal server error'
    }
  }

  return NextResponse.json(errorResponse, { status: statusCode })
}

// API Route wrapper for consistent error handling
export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<Response>,
  component: string = 'API'
) {
  return async (...args: T): Promise<Response> => {
    const requestId = Math.random().toString(36).substring(7)
    
    try {
      logger.debug(component, 'Request started', { requestId })
      const result = await handler(...args)
      logger.debug(component, 'Request completed successfully', { requestId })
      return result
    } catch (error) {
      // Handle different error types
      if (error instanceof AppError) {
        return createErrorResponse(error, requestId)
      }

      // Handle external service errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const externalError = new ExternalServiceError(
          'External API',
          error.message,
          component,
          { originalError: error.message }
        )
        return createErrorResponse(externalError, requestId)
      }

      // Handle unexpected errors
      const unexpectedError = new AppError(
        'An unexpected error occurred',
        500,
        component,
        false,
        { originalMessage: error instanceof Error ? error.message : String(error) }
      )
      
      return createErrorResponse(unexpectedError, requestId)
    }
  }
}

// Service operation wrapper
export async function safeServiceOperation<T>(
  operation: () => Promise<T>,
  component: string,
  operationName: string,
  fallback?: T
): Promise<T> {
  try {
    logger.debug(component, `Starting ${operationName}`)
    const result = await operation()
    logger.success(component, `Completed ${operationName}`)
    return result
  } catch (error) {
    logger.error(component, `Failed ${operationName}`, error)
    
    if (fallback !== undefined) {
      logger.warn(component, `Using fallback for ${operationName}`, fallback)
      return fallback
    }
    
    throw error instanceof AppError ? error : new AppError(
      `${operationName} failed: ${error instanceof Error ? error.message : String(error)}`,
      500,
      component
    )
  }
}

// Pipeline operation wrapper (for graceful degradation)
export async function pipelineOperation<T>(
  operation: () => Promise<T>,
  component: string,
  operationName: string,
  { required = false, fallback }: { required?: boolean; fallback?: T } = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    logger.pipeline(component, `Starting ${operationName}`)
    const data = await operation()
    logger.pipeline(component, `✅ Completed ${operationName}`)
    return { success: true, data }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.pipeline(component, `❌ Failed ${operationName}: ${errorMessage}`)

    if (required) {
      throw error instanceof AppError ? error : new AppError(
        `Required operation failed: ${operationName}`,
        500,
        component
      )
    }

    // For non-required operations, return graceful failure
    return {
      success: false,
      error: errorMessage,
      ...(fallback !== undefined && { data: fallback })
    }
  }
}

// Authentication middleware
export function requireAuth(validSecrets: string[]) {
  return (authHeader: string | null): void => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or invalid authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    if (!validSecrets.includes(token)) {
      throw new AuthenticationError('Invalid authorization token')
    }
  }
}

// Input validation helper
export function validateRequiredFields(
  data: Record<string, any>,
  requiredFields: string[],
  component: string
): void {
  const missing = requiredFields.filter(field => !data[field])
  
  if (missing.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missing.join(', ')}`,
      component,
      { missingFields: missing, received: Object.keys(data) }
    )
  }
}

export default {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  ExternalServiceError,
  RateLimitError,
  createErrorResponse,
  withErrorHandler,
  safeServiceOperation,
  pipelineOperation,
  requireAuth,
  validateRequiredFields
}