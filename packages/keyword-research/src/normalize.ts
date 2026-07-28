import { createKeywordResearchArtifact, type KeywordResearchArtifact } from './artifact.js'
import { toMetricValue } from './metric-value.js'
import type { KeywordResearchProviderResult } from './types.js'

type NormalizeContext = {
  provider: string
  retrievedAt: string
  language: string
}

export function normalizeProviderResult(
  result: KeywordResearchProviderResult,
  context: NormalizeContext,
): KeywordResearchArtifact {
  return createKeywordResearchArtifact({
    primaryKeyword: result.primaryKeyword,
    language: context.language,
    variants: result.variants.map((variant) => ({
      term: variant.term,
      searchVolume: toMetricValue(variant.searchVolume),
      cpcLow: toMetricValue(variant.cpcLow),
      cpcHigh: toMetricValue(variant.cpcHigh),
      competition: toMetricValue(variant.competition),
    })),
    questions: result.questions,
    searchIntent: result.searchIntent ?? 'unknown',
    source: {
      provider: context.provider,
      retrievedAt: context.retrievedAt,
      limitations: result.limitations,
    },
  })
}
