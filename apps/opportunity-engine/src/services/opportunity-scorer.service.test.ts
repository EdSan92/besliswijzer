import { describe, expect, it } from 'vitest'
import { buildScoreKeywordPrompt } from '../prompts/score-keyword.prompt.js'
import { PromptBuilder } from '../services/prompt-builder.service.js'
import { opportunityScoreSchema } from '../models/schemas.js'

describe('PromptBuilder', () => {
  it('builds score keyword prompt with platform name', () => {
    const builder = new PromptBuilder('Veraio')
    const prompt = builder.scoreKeyword({ keyword: 'warmtepomp' })
    expect(prompt).toContain('Veraio')
    expect(prompt).toContain('warmtepomp')
  })
})

describe('opportunityScoreSchema', () => {
  it('validates a correct opportunity score', () => {
    const result = opportunityScoreSchema.safeParse({
      keyword: 'robotgrasmaaier',
      category: 'Tuin',
      score: 85,
      reasons: ['Hoge koopintentie', 'Goede commissie'],
      estimatedCommission: 45,
      confidence: 0.9,
    })
    expect(result.success).toBe(true)
  })
})

describe('buildScoreKeywordPrompt', () => {
  it('includes keyword metrics', () => {
    const prompt = buildScoreKeywordPrompt({
      keyword: 'airfryer',
      searchVolume: 5000,
      competition: 0.6,
      platform: 'Veraio',
    })
    expect(prompt).toContain('5000')
    expect(prompt).toContain('airfryer')
  })
})
