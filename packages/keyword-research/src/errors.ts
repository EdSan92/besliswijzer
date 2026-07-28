export type KeywordResearchErrorCode =
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_RATE_LIMIT'
  | 'PROVIDER_ERROR'
  | 'INVALID_RESPONSE'

export class KeywordResearchError extends Error {
  readonly code: KeywordResearchErrorCode
  readonly provider: string
  readonly retryable: boolean

  constructor(
    message: string,
    code: KeywordResearchErrorCode,
    provider: string,
    retryable = false,
  ) {
    super(message)
    this.name = 'KeywordResearchError'
    this.code = code
    this.provider = provider
    this.retryable = retryable
  }
}

export function normalizeProviderError(error: unknown, provider: string): KeywordResearchError {
  if (error instanceof KeywordResearchError) {
    return error
  }

  const message = error instanceof Error ? error.message : 'Unknown provider failure'
  const lower = message.toLowerCase()

  if (lower.includes('timed out') || lower.includes('timeout')) {
    return new KeywordResearchError(message, 'PROVIDER_TIMEOUT', provider, true)
  }

  if (lower.includes('429') || lower.includes('rate limit')) {
    return new KeywordResearchError(message, 'PROVIDER_RATE_LIMIT', provider, true)
  }

  if (lower.includes('503') || lower.includes('econnreset')) {
    return new KeywordResearchError(message, 'PROVIDER_ERROR', provider, true)
  }

  return new KeywordResearchError(message, 'PROVIDER_ERROR', provider, false)
}
