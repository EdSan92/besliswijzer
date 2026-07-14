import { describe, expect, it, vi } from 'vitest'
import { isRetryableError, withRetry } from './retry.js'

describe('isRetryableError', () => {
  it('detects retryable API errors', () => {
    expect(isRetryableError(new Error('HTTP 429 Too Many Requests'))).toBe(true)
    expect(isRetryableError(new Error('Service unavailable 503'))).toBe(true)
    expect(isRetryableError(new Error('ECONNRESET'))).toBe(true)
    expect(isRetryableError(new Error('Request timeout'))).toBe(true)
  })

  it('rejects non-retryable errors', () => {
    expect(isRetryableError(new Error('Invalid API key'))).toBe(false)
    expect(isRetryableError('plain string')).toBe(false)
  })
})

describe('withRetry', () => {
  it('retries retryable failures and eventually succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('429 rate limit'))
      .mockResolvedValueOnce('ok')

    const result = await withRetry(fn, { maxRetries: 2, baseDelayMs: 1 })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('does not retry non-retryable failures', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('bad request'))
    await expect(withRetry(fn, { maxRetries: 3, baseDelayMs: 1 })).rejects.toThrow('bad request')
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
