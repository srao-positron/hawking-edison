export function formatDuration(milliseconds: number): string {
  if (!milliseconds || milliseconds < 0) return '0ms'
  
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    const remainingMinutes = minutes % 60
    const remainingSeconds = seconds % 60
    return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`
  }
  
  if (minutes > 0) {
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }
  
  if (seconds > 0) {
    const remainingMs = milliseconds % 1000
    if (seconds < 10) {
      // For short durations, show milliseconds too
      return `${seconds}.${Math.floor(remainingMs / 100)}s`
    }
    return `${seconds}s`
  }
  
  // For very short durations
  return `${milliseconds}ms`
}