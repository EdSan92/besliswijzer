import { describe, expect, it, vi } from 'vitest'
import { GeminiStructuredClient } from './gemini-structured-client.js'

describe('GeminiStructuredClient', () => {
  it('parses JSON responses and reports metrics without logging prompt content', () => {
    const onMetrics = vi.fn()
    const fetchImpl = vi.fn(async () =>
      Response.json({
        candidates: [{ content: { parts: [{ text: '{"brief":{"slug":"airfryers"}}' }] } }],
        usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 8 },
      }),
    )

    const client = new GeminiStructuredClient({
      apiKey: 'secret-key',
      model: 'gemini-test',
      fetchImpl,
      onMetrics,
    })

    return client.generateJson('prompt with secret content').then(({ raw, metrics }) => {
      expect(raw).toEqual({ brief: { slug: 'airfryers' } })
      expect(metrics.inputTokens).toBe(12)
      expect(metrics.outputTokens).toBe(8)
      expect(onMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-test',
          promptLength: 26,
        }),
      )
      expect(JSON.stringify(onMetrics.mock.calls)).not.toContain('secret content')
    })
  })

  it('retries transient failures', async () => {
    let attempts = 0
    const fetchImpl = vi.fn(async () => {
      attempts += 1
      if (attempts === 1) {
        throw new Error('429 rate limit')
      }
      return Response.json({
        candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }],
      })
    })

    const client = new GeminiStructuredClient({
      apiKey: 'secret-key',
      model: 'gemini-test',
      fetchImpl,
      maxRetries: 1,
      baseDelayMs: 0,
    })

    const result = await client.generateJson('prompt')
    expect(result.raw).toEqual({ ok: true })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })
})
