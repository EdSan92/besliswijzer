export type KeywordCallMetrics = {
  provider: string
  operation: 'research'
  primaryKeywordLength: number
  variantCount: number
  latencyMs: number
  retryCount: number
}

export function logKeywordProviderMetrics(metrics: KeywordCallMetrics): void {
  console.info(
    JSON.stringify({
      event: 'pipeline.keyword_call',
      provider: metrics.provider,
      operation: metrics.operation,
      primaryKeywordLength: metrics.primaryKeywordLength,
      variantCount: metrics.variantCount,
      latencyMs: metrics.latencyMs,
      retryCount: metrics.retryCount,
    }),
  )
}
