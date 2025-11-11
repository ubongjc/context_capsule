/**
 * Structured logging utility
 * Replace console.log/error with proper logging for production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, any>
  error?: Error
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  private formatLog(entry: LogEntry): string {
    const { level, message, timestamp, context, error } = entry

    if (this.isDevelopment) {
      // Readable format for development
      const parts = [`[${timestamp}] ${level.toUpperCase()}: ${message}`]
      if (context && Object.keys(context).length > 0) {
        parts.push(`\nContext: ${JSON.stringify(context, null, 2)}`)
      }
      if (error) {
        parts.push(`\nError: ${error.message}`)
        if (error.stack) {
          parts.push(`Stack: ${error.stack}`)
        }
      }
      return parts.join('')
    } else {
      // JSON format for production (easier for log aggregation)
      return JSON.stringify({
        ...entry,
        error: error ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        } : undefined,
      })
    }
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
    }

    const formatted = this.formatLog(entry)

    switch (level) {
      case 'debug':
      case 'info':
        console.log(formatted)
        break
      case 'warn':
        console.warn(formatted)
        break
      case 'error':
        console.error(formatted)
        break
    }

    // In production, you could send to external logging service (Sentry, DataDog, etc.)
    if (!this.isDevelopment && (level === 'error' || level === 'warn')) {
      // TODO: Send to external logging service
      // Example: Sentry.captureException(error)
    }
  }

  debug(message: string, context?: Record<string, any>) {
    if (this.isDevelopment) {
      this.log('debug', message, context)
    }
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context)
  }

  warn(message: string, context?: Record<string, any>, error?: Error) {
    this.log('warn', message, context, error)
  }

  error(message: string, context?: Record<string, any>, error?: Error) {
    this.log('error', message, context, error)
  }
}

export const logger = new Logger()
