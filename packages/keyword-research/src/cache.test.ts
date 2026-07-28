import { describe, expect, it, vi } from 'vitest'
import { KeywordResearchCache } from './cache.js'
import { createKeywordResearchArtifact } from './artifact.js'

function sampleArtifact() {
  return createKeywordResearchArtifact({
    primaryKeyword: 'airfryer',
    language: 'nl',
    variants: [],
    questions: [],
    searchIntent: 'unknown',
    source: {
      provider: 'fixture',
      retrievedAt: '2026-07-28T12:00:00.000Z',
    },
  })
}

describe('KeywordResearchCache', () => {
  it('returns cached values within TTL', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000)
    const cache = new KeywordResearchCache({ ttlMs: 60_000 })
    const artifact = sampleArtifact()

    cache.set('airfryer:nl', artifact)
    expect(cache.get('airfryer:nl')).toEqual(artifact)

    now.mockReturnValue(30_000)
    expect(cache.get('airfryer:nl')).toEqual(artifact)
    now.mockRestore()
  })

  it('expires entries after TTL', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000)
    const cache = new KeywordResearchCache({ ttlMs: 5_000 })
    cache.set('airfryer:nl', sampleArtifact())

    now.mockReturnValue(7_000)
    expect(cache.get('airfryer:nl')).toBeNull()
    now.mockRestore()
  })
})
