import { buildDiscoverSeedPrompt } from '../prompts/discover-seed.prompt.js'
import { buildGenerateFlowPrompt } from '../prompts/generate-flow.prompt.js'
import {
  buildGenerateProductFlowPrompt,
  type ProductFlowPromptInput,
} from '../prompts/generate-product-flow.prompt.js'
import {
  buildGenerateProductPagePrompt,
  type ProductPagePromptInput,
} from '../prompts/generate-product-page.prompt.js'
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

  generateProductPage(input: ProductPagePromptInput): string {
    return buildGenerateProductPagePrompt(input)
  }

  generateProductFlow(input: ProductFlowPromptInput): string {
    return buildGenerateProductFlowPrompt(input)
  }

  discoverSeed(categoryName: string): string {
    return buildDiscoverSeedPrompt(categoryName, this.platformName)
  }
}
