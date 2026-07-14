import { describe, expect, it, vi } from 'vitest'
import { keywordMetricsHash } from '../utils/score-cache.js'
import { OpportunityScorer } from './opportunity-scorer.service.js'
import { PromptBuilder } from './prompt-builder.service.js'

describe('OpportunityScorer.scoreKeywords', () => {
  it('uses cached scores when still valid', async () => {
    const keyword = {
      id: 'kw-1',
      term: 'airfryer',
      searchVolume: 5000,
      competition: 0.5,
    }
    const cachedScore = {
      keyword: 'airfryer',
      category: 'Keuken',
      score: 80,
      reasons: ['Sterke vraag'],
      estimatedCommission: 20,
      confidence: 0.85,
    }

    const keywordRepo = {
      findById: vi.fn().mockResolvedValue({
        lastScoredAt: new Date(),
        metricsHash: keywordMetricsHash(keyword),
        cachedScore,
      }),
      saveCachedScore: vi.fn(),
    }
    const aiProvider = { generateObject: vi.fn() }
    const scorer = new OpportunityScorer(aiProvider as never, new PromptBuilder('Veraio'), keywordRepo as never)

    const result = await scorer.scoreKeywords([keyword])

    expect(result.fromCache).toBe(1)
    expect(result.fromApi).toBe(0)
    expect(result.scores).toEqual([cachedScore])
    expect(aiProvider.generateObject).not.toHaveBeenCalled()
  })

  it('filters scores below minimum threshold', async () => {
    const keyword = { id: 'single', term: 'monitor', searchVolume: 1000 }
    const aiProvider = {
      generateObject: vi.fn().mockResolvedValue({
        data: {
          keyword: 'monitor',
          category: 'Tech',
          score: 10,
          reasons: ['Laag'],
          estimatedCommission: 5,
          confidence: 0.5,
        },
      }),
    }
    const keywordRepo = {
      findById: vi.fn(),
      saveCachedScore: vi.fn(),
    }
    const scorer = new OpportunityScorer(aiProvider as never, new PromptBuilder('Veraio'), keywordRepo as never)

    const result = await scorer.scoreKeywords([keyword])
    expect(result.scores).toEqual([])
    expect(result.fromApi).toBe(0)
  })

  it('skips excluded high-consideration products', async () => {
    const keyword = { id: 'single', term: 'warmtepomp kopen', searchVolume: 1000 }
    const aiProvider = { generateObject: vi.fn() }
    const keywordRepo = {
      findById: vi.fn(),
      saveCachedScore: vi.fn(),
    }
    const scorer = new OpportunityScorer(aiProvider as never, new PromptBuilder('Veraio'), keywordRepo as never)

    const result = await scorer.scoreKeywords([keyword])
    expect(result.scores).toEqual([])
    expect(aiProvider.generateObject).not.toHaveBeenCalled()
  })
})
