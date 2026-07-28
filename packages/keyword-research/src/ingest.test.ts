import { describe, expect, it, vi } from 'vitest'
import { KeywordResearchCache } from './cache.js'
import { ingestKeywordResearch } from './ingest.js'
import type { KeywordResearchProvider } from './types.js'

describe('ingestKeywordResearch', () => {
  it('returns cached artifacts without calling the provider again', async () => {
    const research = vi.fn().mockResolvedValue({
      primaryKeyword: 'airfryer',
      variants: [{ term: 'airfryer', searchVolume: 1000 }],
      questions: ['Welke airfryer?'],
      searchIntent: 'commercial' as const,
    })

    const provider: KeywordResearchProvider = {
      name: 'fixture',
      research,
    }

    const cache = new KeywordResearchCache({ ttlMs: 60_000 })
    const request = { primaryKeyword: 'airfryer', language: 'nl' }

    const first = await ingestKeywordResearch({
      provider,
      request,
      cache,
      now: () => '2026-07-28T12:00:00.000Z',
    })
    const second = await ingestKeywordResearch({
      provider,
      request,
      cache,
      now: () => '2026-07-28T12:01:00.000Z',
    })

    expect(first.kind).toBe('keyword_data')
    expect(first.source.provider).toBe('fixture')
    expect(second).toEqual(first)
    expect(research).toHaveBeenCalledTimes(1)
  })

  it('normalizes provider failures', async () => {
    const provider: KeywordResearchProvider = {
      name: 'fixture',
      research: async () => {
        throw new Error('HTTP 429 rate limit')
      },
    }

    await expect(
      ingestKeywordResearch({
        provider,
        request: { primaryKeyword: 'airfryer', language: 'nl' },
      }),
    ).rejects.toMatchObject({
      code: 'PROVIDER_RATE_LIMIT',
      provider: 'fixture',
      retryable: true,
    })
  })
})
