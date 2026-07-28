import { describe, expect, it } from 'vitest'
import {
  createKeywordResearchArtifact,
  keywordResearchArtifactSchema,
  KEYWORD_RESEARCH_ARTIFACT_VERSION,
} from './artifact.js'

describe('keywordResearchArtifactSchema', () => {
  it('accepts a valid artifact with unknown metrics', () => {
    const artifact = createKeywordResearchArtifact({
      primaryKeyword: 'airfryer kopen',
      language: 'nl',
      variants: [
        {
          term: 'airfryer kopen',
          searchVolume: { kind: 'known', value: 1200 },
          cpcLow: { kind: 'unknown' },
          cpcHigh: { kind: 'unknown' },
          competition: { kind: 'known', value: 0.42 },
        },
      ],
      questions: ['Welke airfryer is het beste?'],
      searchIntent: 'commercial',
      source: {
        provider: 'google_keyword_insight',
        retrievedAt: '2026-07-28T12:00:00.000Z',
        limitations: ['questions derived from related terms'],
      },
    })

    expect(keywordResearchArtifactSchema.parse(artifact)).toEqual(artifact)
    expect(artifact.version).toBe(KEYWORD_RESEARCH_ARTIFACT_VERSION)
    expect(artifact.kind).toBe('keyword_data')
  })

  it('rejects invented numeric fields outside metricValue schema', () => {
    expect(() =>
      keywordResearchArtifactSchema.parse({
        kind: 'keyword_data',
        version: KEYWORD_RESEARCH_ARTIFACT_VERSION,
        primaryKeyword: 'test',
        language: 'nl',
        variants: [
          {
            term: 'test',
            searchVolume: 100,
            cpcLow: { kind: 'unknown' },
            cpcHigh: { kind: 'unknown' },
            competition: { kind: 'unknown' },
          },
        ],
        questions: [],
        searchIntent: 'unknown',
        source: {
          provider: 'fixture',
          retrievedAt: '2026-07-28T12:00:00.000Z',
        },
      }),
    ).toThrow()
  })
})
