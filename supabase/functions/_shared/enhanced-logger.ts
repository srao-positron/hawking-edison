// Enhanced logger that stores logs in a database table for debugging
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  data?: any
  error?: any
  timestamp: string
  function_name: string
  request_id?: string
}

export class EnhancedLogger {
  private functionName: string
  private requestId?: string
  private logs: LogEntry[] = []
  private supabase: any

  constructor(functionName: string, requestId?: string) {
    this.functionName = functionName
    this.requestId = requestId
    
    // Initialize Supabase client for logging
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
  }

  private createLogEntry(level: LogEntry['level'], message: string, data?: any, error?: any): LogEntry {
    return {
      level,
      message,
      data,
      error: error ? {
        message: error.message || String(error),
        stack: error.stack,
        name: error.name
      } : undefined,
      timestamp: new Date().toISOString(),
      function_name: this.functionName,
      request_id: this.requestId
    }
  }

  private async persistLog(entry: LogEntry) {
    try {
      // Try to insert into edge_function_logs table
      await this.supabase
        .from('edge_function_logs')
        .insert({
          function_name: entry.function_name,
          request_id: entry.request_id,
          level: entry.level,
          message: entry.message,
          data: entry.data,
          error: entry.error,
          created_at: entry.timestamp
        })
    } catch (e) {
      // If table doesn't exist, at least log to console
      console.error('Failed to persist log:', e)
    }
  }

  debug(message: string, data?: any) {
    const entry = this.createLogEntry('debug', message, data)
    this.logs.push(entry)
    console.log(`[DEBUG] ${message}`, data || '')
    this.persistLog(entry)
  }

  info(message: string, data?: any) {
    const entry = this.createLogEntry('info', message, data)
    this.logs.push(entry)
    console.log(`[INFO] ${message}`, data || '')
    this.persistLog(entry)
  }

  warn(message: string, data?: any) {
    const entry = this.createLogEntry('warn', message, data)
    this.logs.push(entry)
    console.warn(`[WARN] ${message}`, data || '')
    this.persistLog(entry)
  }

  error(message: string, error?: any, data?: any) {
    const entry = this.createLogEntry('error', message, data, error)
    this.logs.push(entry)
    console.error(`[ERROR] ${message}`, error || '', data || '')
    this.persistLog(entry)
  }

  // Get all logs for this request
  getLogs(): LogEntry[] {
    return this.logs
  }

  // Include logs in error response for debugging
  getDebugInfo() {
    return {
      request_id: this.requestId,
      function_name: this.functionName,
      logs: this.logs
    }
  }
}