import type { GeminiCallMetrics } from './gemini-structured-client.js'

export function logPipelineProviderMetrics(metrics: GeminiCallMetrics): void {
  console.info(
    JSON.stringify({
      event: 'pipeline.ai_call',
      provider: metrics.provider,
      model: metrics.model,
      operation: metrics.operation,
      inputTokens: metrics.inputTokens,
      outputTokens: metrics.outputTokens,
      latencyMs: metrics.latencyMs,
      retryCount: metrics.retryCount,
      promptLength: metrics.promptLength,
    }),
  )
}
