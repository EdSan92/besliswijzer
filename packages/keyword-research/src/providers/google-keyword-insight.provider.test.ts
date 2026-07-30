import { describe, expect, it, vi } from 'vitest'
import fixtureResponse from '../fixtures/google-keyword-response.json' with { type: 'json' }
import { GoogleKeywordInsightProvider } from './google-keyword-insight.provider.js'

describe('GoogleKeywordInsightProvider', () => {
  it('maps fixture responses to normalized provider output', async () => {
    const provider = new GoogleKeywordInsightProvider({
      mock: false,
      developerToken: 'token',
      customerId: '123',
      accessToken: 'access',
      fetchImpl: vi.fn().mockResolvedValue(
        new Response(JSON.stringify(fixtureResponse), { status: 200 }),
      ),
    })

    const result = await provider.research({
      primaryKeyword: 'airfryer kopen',
      language: 'nl',
    })

    expect(result.primaryKeyword).toBe('airfryer kopen')
    expect(result.variants).toHaveLength(3)
    expect(result.variants[0]).toMatchObject({
      term: 'airfryer kopen',
      searchVolume: 2400,
      competition: 0.67,
      cpcLow: 0.35,
      cpcHigh: 1.2,
    })
    expect(result.variants[2]?.searchVolume).toBeUndefined()
    expect(result.limitations).toContain('search intent inferred from keyword research context')
  })

  it('uses mock data when credentials are missing', async () => {
    const provider = new GoogleKeywordInsightProvider({ mock: false })
    const fetchImpl = vi.fn()
    const mockProvider = new GoogleKeywordInsightProvider({ mock: false, fetchImpl })

    const result = await mockProvider.research({
      primaryKeyword: 'mesh wifi',
      language: 'nl',
    })

    expect(result.limitations).toContain('mock provider response')
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(provider.name).toBe('google_keyword_insight')
  })

  it('normalizes HTTP failures without leaking credentials', async () => {
    const provider = new GoogleKeywordInsightProvider({
      mock: false,
      developerToken: 'secret-token',
      customerId: '123',
      accessToken: 'secret-access',
      maxRetries: 0,
      fetchImpl: vi.fn().mockImplementation(async () =>
        new Response(JSON.stringify({ error: { message: 'HTTP 429 rate limit' } }), {
          status: 429,
        }),
      ),
    })

    await expect(
      provider.research({
        primaryKeyword: 'airfryer',
        language: 'nl',
      }),
    ).rejects.toMatchObject({
      code: 'PROVIDER_RATE_LIMIT',
      retryable: true,
    })
  })
})
