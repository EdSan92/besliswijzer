import { describe, expect, it, vi } from 'vitest'
import { logKeywordProviderMetrics } from './provider-metrics.js'

describe('logKeywordProviderMetrics', () => {
  it('logs structured metrics without credentials or keyword payloads', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)

    logKeywordProviderMetrics({
      provider: 'google_keyword_insight',
      operation: 'research',
      primaryKeywordLength: 14,
      variantCount: 3,
      latencyMs: 1200,
      retryCount: 1,
    })

    const payload = JSON.parse(String(info.mock.calls[0]?.[0]))
    expect(payload).toMatchObject({
      event: 'pipeline.keyword_call',
      provider: 'google_keyword_insight',
      variantCount: 3,
      latencyMs: 1200,
      retryCount: 1,
    })
    expect(JSON.stringify(payload)).not.toContain('secret-token')
    expect(JSON.stringify(payload)).not.toContain('airfryer kopen')

    info.mockRestore()
  })
})
