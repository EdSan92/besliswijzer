import { describe, expect, it, vi } from 'vitest'
import { logCmsProviderMetrics } from './provider-metrics.js'

describe('logCmsProviderMetrics', () => {
  it('logs structured cms call metrics without secrets', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})

    logCmsProviderMetrics({
      provider: 'besliswijzer_cms',
      operation: 'upsert_flow',
      resourceType: 'flow',
      status: 'success',
      httpStatus: 200,
      latencyMs: 42,
    })

    expect(info).toHaveBeenCalledOnce()
    const payload = JSON.parse(String(info.mock.calls[0]?.[0]))
    expect(payload).toEqual({
      event: 'pipeline.cms_call',
      provider: 'besliswijzer_cms',
      operation: 'upsert_flow',
      resourceType: 'flow',
      status: 'success',
      httpStatus: 200,
      latencyMs: 42,
    })
    expect(JSON.stringify(payload)).not.toMatch(/admin|api[_-]?key|secret/i)

    info.mockRestore()
  })
})
