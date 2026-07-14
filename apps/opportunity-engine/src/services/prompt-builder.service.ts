import { buildDiscoverSeedPrompt } from '../prompts/discover-seed.prompt.js'
import { buildGenerateFlowPrompt } from '../prompts/generate-flow.prompt.js'
import { buildScoreKeywordPrompt } from '../prompts/score-keyword.prompt.js'
import { buildScoreKeywordsBatchPrompt } from '../prompts/score-keywords-batch.prompt.js'
import type { KeywordData } from '../models/schemas.js'

export type ScoreKeywordInput = Parameters<typeof buildScoreKeywordPrompt>[0]

export class PromptBuilder {
  constructor(private readonly platformName = 'Veraio') {}

  scoreKeyword(input: Omit<ScoreKeywordInput, 'platform'>): string {
    return buildScoreKeywordPrompt({ ...input, platform: this.platformName })
  }

  scoreKeywordsBatch(keywords: KeywordData[]): string {
    return buildScoreKeywordsBatchPrompt(keywords, this.platformName)
  }

  generateFlow(opportunity: Parameters<typeof buildGenerateFlowPrompt>[0]): string {
    return buildGenerateFlowPrompt(opportunity)
  }

  discoverSeed(categoryName: string): string {
    return buildDiscoverSeedPrompt(categoryName, this.platformName)
  }
}
