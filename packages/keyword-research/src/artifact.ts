import { z } from 'zod'
import { metricValueSchema } from './metric-value.js'

export const KEYWORD_RESEARCH_ARTIFACT_VERSION = '1.0.0' as const

export const searchIntentSchema = z.enum([
  'informational',
  'commercial',
  'transactional',
  'navigational',
  'unknown',
])

export const keywordVariantSchema = z.object({
  term: z.string().min(1),
  searchVolume: metricValueSchema,
  cpcLow: metricValueSchema,
  cpcHigh: metricValueSchema,
  competition: metricValueSchema,
})

export const keywordResearchSourceSchema = z.object({
  provider: z.string().min(1),
  retrievedAt: z.string().datetime(),
  limitations: z.array(z.string()).optional(),
})

export const keywordResearchArtifactSchema = z.object({
  kind: z.literal('keyword_data'),
  version: z.literal(KEYWORD_RESEARCH_ARTIFACT_VERSION),
  primaryKeyword: z.string().min(1),
  language: z.string().min(2),
  variants: z.array(keywordVariantSchema),
  questions: z.array(z.string()),
  searchIntent: searchIntentSchema,
  source: keywordResearchSourceSchema,
})

export type SearchIntent = z.infer<typeof searchIntentSchema>
export type KeywordVariant = z.infer<typeof keywordVariantSchema>
export type KeywordResearchSource = z.infer<typeof keywordResearchSourceSchema>
export type KeywordResearchArtifact = z.infer<typeof keywordResearchArtifactSchema>

export type CreateKeywordResearchArtifactInput = Omit<
  KeywordResearchArtifact,
  'kind' | 'version'
>

export function createKeywordResearchArtifact(
  input: CreateKeywordResearchArtifactInput,
): KeywordResearchArtifact {
  return keywordResearchArtifactSchema.parse({
    kind: 'keyword_data',
    version: KEYWORD_RESEARCH_ARTIFACT_VERSION,
    ...input,
  })
}
