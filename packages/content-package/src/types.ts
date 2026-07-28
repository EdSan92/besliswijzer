import type { FlowBrief } from '@besliswijzer/flow-compiler'
import type { KeywordResearchArtifact } from '@besliswijzer/keyword-research'

export type ContentPackageGenerationInput = {
  categorySlug: string
  categoryTitle: string
  language: string
  searchIntent?: string
  keywordVariants?: string[]
  questions?: string[]
  buyingCriteria?: string[]
  existingRoutes?: string[]
}

export type ContentPackageModelResponse = {
  raw: unknown
}

export interface ContentPackageModelProvider {
  readonly provider: string
  readonly model: string
  generateStructured(prompt: string): Promise<ContentPackageModelResponse>
  repairStructured?(
    prompt: string,
    invalidOutput: unknown,
    errors: string[],
  ): Promise<ContentPackageModelResponse>
}

export function mapKeywordArtifactToInput(
  artifact: KeywordResearchArtifact,
  categoryTitle: string,
): ContentPackageGenerationInput {
  return {
    categorySlug: artifact.primaryKeyword.trim().toLowerCase().replace(/\s+/g, '-'),
    categoryTitle,
    language: artifact.language,
    searchIntent: artifact.searchIntent,
    keywordVariants: artifact.variants.map((variant) => variant.term),
    questions: artifact.questions,
  }
}

export function mapFlowBriefToInput(
  brief: FlowBrief,
  base: ContentPackageGenerationInput,
): ContentPackageGenerationInput {
  return {
    ...base,
    categorySlug: brief.slug,
    categoryTitle: brief.title,
    buyingCriteria: brief.metadata.buyingCriteria,
    searchIntent: brief.metadata.searchIntent,
    questions: [...(base.questions ?? []), ...brief.questions.map((question) => question.title)],
  }
}
