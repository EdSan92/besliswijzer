export type RetryOptions = {
  maxRetries: number
  baseDelayMs?: number
  onRetry?: (attempt: number, error: unknown) => void
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return (
      msg.includes('429') ||
      msg.includes('503') ||
      msg.includes('high demand') ||
      msg.includes('rate limit') ||
      msg.includes('econnreset') ||
      msg.includes('timeout')
    )
  }
  return false
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const { maxRetries, baseDelayMs = 500, onRetry } = options
  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt >= maxRetries || !isRetryableError(error)) throw error
      onRetry?.(attempt + 1, error)
      await sleep(baseDelayMs * Math.pow(2, attempt))
    }
  }

  throw lastError
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
