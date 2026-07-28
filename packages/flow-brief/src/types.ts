import type { KeywordResearchArtifact } from '@besliswijzer/keyword-research'

export type FlowBriefGenerationInput = {
  categorySlug: string
  categoryTitle: string
  language: string
  searchIntent?: string
  keywordVariants?: string[]
  questions?: string[]
  buyingCriteria?: string[]
}

export type FlowBriefModelResponse = {
  raw: unknown
}

export interface FlowBriefModelProvider {
  readonly provider: string
  readonly model: string
  generateStructured(prompt: string): Promise<FlowBriefModelResponse>
  repairStructured?(prompt: string, invalidOutput: unknown, errors: string[]): Promise<FlowBriefModelResponse>
}

export function mapKeywordArtifactToInput(
  artifact: KeywordResearchArtifact,
  categoryTitle: string,
): FlowBriefGenerationInput {
  return {
    categorySlug: artifact.primaryKeyword.trim().toLowerCase().replace(/\s+/g, '-'),
    categoryTitle,
    language: artifact.language,
    searchIntent: artifact.searchIntent,
    keywordVariants: artifact.variants.map((variant) => variant.term),
    questions: artifact.questions,
    buyingCriteria: [],
  }
}
