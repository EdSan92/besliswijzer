import { describe, expect, it } from 'vitest'
import {
  chunkArray,
  isScoreCacheValid,
  keywordMetricsHash,
  parseCachedScore,
} from '../utils/score-cache.js'

describe('score-cache', () => {
  it('chunks keywords into batches', () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })

  it('invalidates cache when metrics change', () => {
    const keyword = { term: 'airfryer', searchVolume: 1000 }
    const hash = keywordMetricsHash(keyword)
    const lastScoredAt = new Date()

    expect(isScoreCacheValid(lastScoredAt, hash, keyword, 30)).toBe(true)
    expect(
      isScoreCacheValid(lastScoredAt, hash, { ...keyword, searchVolume: 2000 }, 30),
    ).toBe(false)
  })

  it('parses cached score', () => {
    const score = parseCachedScore({
      keyword: 'monitor',
      category: 'Tech',
      score: 80,
      reasons: ['test'],
      estimatedCommission: 10,
      confidence: 0.9,
    })
    expect(score?.keyword).toBe('monitor')
  })
})
