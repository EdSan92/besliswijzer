import { describe, expect, it } from 'vitest'
import { normalizeProviderResult } from './normalize.js'
import type { KeywordResearchProviderResult } from './types.js'

describe('normalizeProviderResult', () => {
  it('maps missing metrics to explicit unknown values', () => {
    const input: KeywordResearchProviderResult = {
      primaryKeyword: 'robotstofzuiger',
      variants: [
        {
          term: 'robotstofzuiger',
          searchVolume: 800,
        },
        {
          term: 'robot stofzuiger kopen',
        },
      ],
      questions: ['Welke robotstofzuiger is het beste?'],
      searchIntent: 'commercial',
      limitations: ['partial provider response'],
    }

    const artifact = normalizeProviderResult(input, {
      provider: 'google_keyword_insight',
      retrievedAt: '2026-07-28T12:00:00.000Z',
      language: 'nl',
    })

    expect(artifact.primaryKeyword).toBe('robotstofzuiger')
    expect(artifact.variants[0]?.searchVolume).toEqual({ kind: 'known', value: 800 })
    expect(artifact.variants[1]?.searchVolume).toEqual({ kind: 'unknown', reason: 'not reported by provider' })
    expect(artifact.variants[1]?.competition).toEqual({ kind: 'unknown', reason: 'not reported by provider' })
    expect(artifact.source.limitations).toEqual(['partial provider response'])
  })

  it('defaults search intent to unknown when provider omits it', () => {
    const artifact = normalizeProviderResult(
      {
        primaryKeyword: 'mesh wifi',
        variants: [{ term: 'mesh wifi' }],
        questions: [],
      },
      {
        provider: 'fixture',
        retrievedAt: '2026-07-28T12:00:00.000Z',
        language: 'nl',
      },
    )

    expect(artifact.searchIntent).toBe('unknown')
  })
})
