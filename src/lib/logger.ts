// Structured logging implementation
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: any
}

class Logger {
  private name: string
  private level: LogLevel
  
  constructor(name: string) {
    this.name = name
    this.level = (process.env.LOG_LEVEL as LogLevel) || 'info'
  }
  
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    const currentLevelIndex = levels.indexOf(this.level)
    const messageLevelIndex = levels.indexOf(level)
    return messageLevelIndex >= currentLevelIndex
  }
  
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      logger: this.name,
      message,
      ...context
    }
    
    // In production, we'd send this to a logging service
    // For now, format for console
    if (process.env.NODE_ENV === 'production') {
      return JSON.stringify(logEntry)
    }
    
    // Development format
    return `[${timestamp}] ${level.toUpperCase()} [${this.name}] ${message} ${context ? JSON.stringify(context) : ''}`
  }
  
  debug(message: string, context?: LogContext) {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context))
    }
  }
  
  info(message: string, context?: LogContext) {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, context))
    }
  }
  
  warn(message: string, context?: LogContext) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context))
    }
  }
  
  error(message: string, error?: Error | unknown, context?: LogContext) {
    if (this.shouldLog('error')) {
      const errorContext = {
        ...context,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error
      }
      console.error(this.formatMessage('error', message, errorContext))
    }
  }
}

// Factory function to create loggers
export function createLogger(name: string): Logger {
  return new Logger(name)
}

// Default logger instance
export const logger = createLogger('app')