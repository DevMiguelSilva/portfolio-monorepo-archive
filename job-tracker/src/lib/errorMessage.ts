/** Supabase can reject with a plain object rather than an Error instance. */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = error.message
    if (typeof message === 'string' && message.trim()) return message.trim()
  }
  return fallback
}
