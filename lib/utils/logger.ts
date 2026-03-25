/**
 * TAX4US Logging System
 * Replaces scattered console.log calls with structured logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success'

interface LogEntry {
  timestamp: string
  level: LogLevel
  component: string
  message: string
  data?: any
  userId?: string
  sessionId?: string
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production'
  private isVerbose = process.env.VERBOSE_LOGS === 'true'

  private formatTimestamp(): string {
    return new Date().toISOString()
  }

  private shouldLog(level: LogLevel): boolean {
    // Always log errors and warnings
    if (level === 'error' || level === 'warn') return true
    
    // In production, only log info+ unless verbose
    if (!this.isDevelopment && !this.isVerbose) {
      return level === 'info' || level === 'success'
    }
    
    // In development, log everything
    return true
  }

  private formatMessage(entry: LogEntry): string {
    const emoji = {
      debug: '🔍',
      info: 'ℹ️ ',
      warn: '⚠️ ',
      error: '❌',
      success: '✅'
    }

    const prefix = `${emoji[entry.level]} [${entry.component}]`
    const timestamp = this.isDevelopment ? '' : ` ${entry.timestamp}`
    
    return `${prefix}${timestamp} ${entry.message}`
  }

  private log(level: LogLevel, component: string, message: string, data?: any): void {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      component,
      message,
      data
    }

    const formattedMessage = this.formatMessage(entry)

    // Use appropriate console method
    switch (level) {
      case 'debug':
        if (this.isDevelopment) {
          console.debug(formattedMessage, data || '')
        }
        break
      case 'info':
      case 'success':
        console.log(formattedMessage, data ? JSON.stringify(data, null, 2) : '')
        break
      case 'warn':
        console.warn(formattedMessage, data || '')
        break
      case 'error':
        console.error(formattedMessage, data || '')
        break
    }

    // In production, consider sending to external logging service
    if (!this.isDevelopment && (level === 'error' || level === 'warn')) {
      this.sendToExternalLogger(entry)
    }
  }

  private async sendToExternalLogger(entry: LogEntry): Promise<void> {
    // TODO: Implement external logging service integration
    // Could use services like LogRocket, Sentry, or DataDog
    try {
      // Example: Send to external service
      // await fetch(process.env.LOGGING_ENDPOINT, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(entry)
      // })
    } catch (error) {
      // Don't let logging errors break the application
      console.error('Failed to send log to external service:', error)
    }
  }

  // Public logging methods
  debug(component: string, message: string, data?: any): void {
    this.log('debug', component, message, data)
  }

  info(component: string, message: string, data?: any): void {
    this.log('info', component, message, data)
  }

  warn(component: string, message: string, data?: any): void {
    this.log('warn', component, message, data)
  }

  error(component: string, message: string, data?: any): void {
    this.log('error', component, message, data)
  }

  success(component: string, message: string, data?: any): void {
    this.log('success', component, message, data)
  }

  // Special methods for pipeline operations
  pipeline(stage: string, message: string, topicId?: string): void {
    const fullMessage = topicId ? `[${topicId}] ${message}` : message
    this.info('Pipeline', `${stage}: ${fullMessage}`)
  }

  agent(worker: string, message: string, topicId?: string): void {
    const fullMessage = topicId ? `[${topicId}] ${message}` : message
    this.info(worker, fullMessage)
  }

  api(endpoint: string, method: string, status: number, message?: string): void {
    const statusEmoji = status >= 400 ? '❌' : status >= 300 ? '⚠️' : '✅'
    const logMessage = `${method} ${endpoint} - ${status} ${statusEmoji} ${message || ''}`
    
    if (status >= 400) {
      this.error('API', logMessage)
    } else if (status >= 300) {
      this.warn('API', logMessage)
    } else {
      this.info('API', logMessage)
    }
  }

  // Performance timing
  time(label: string): void {
    if (this.isDevelopment) {
      console.time(`⏱️  [Timer] ${label}`)
    }
  }

  timeEnd(label: string): void {
    if (this.isDevelopment) {
      console.timeEnd(`⏱️  [Timer] ${label}`)
    }
  }
}

// Global logger instance
export const logger = new Logger()

// Legacy compatibility - gradually replace console.log calls
export const deprecatedConsole = {
  log: (component: string, message: string, data?: any) => {
    logger.info(component, message, data)
  },
  error: (component: string, message: string, data?: any) => {
    logger.error(component, message, data)
  },
  warn: (component: string, message: string, data?: any) => {
    logger.warn(component, message, data)
  }
}

export default logger