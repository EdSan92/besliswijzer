import { z } from 'zod'
import {
  contentPackageSchema,
  sourcedClaimSchema,
  type ContentPackage,
  type SourcedClaim,
} from '@besliswijzer/pipeline-quality'
import { contentPackageWarningSchema, type ContentPackageWarning } from './warnings.js'

export const CONTENT_PACKAGE_ARTIFACT_VERSION = '1.0.0' as const
export const CONTENT_PACKAGE_PROMPT_VERSION = '1.0.0' as const

export const internalLinkSuggestionSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  reason: z.string().min(1),
})

export type InternalLinkSuggestion = z.infer<typeof internalLinkSuggestionSchema>

export const contentPackageGenerationOutputSchema = z.object({
  content: contentPackageSchema,
  internalLinks: z.array(internalLinkSuggestionSchema).default([]),
  claims: z.array(sourcedClaimSchema).default([]),
  warnings: z.array(contentPackageWarningSchema).default([]),
})

export type ContentPackageGenerationOutput = z.infer<typeof contentPackageGenerationOutputSchema>

export const contentPackageArtifactSchema = z.object({
  kind: z.literal('content_package'),
  version: z.literal(CONTENT_PACKAGE_ARTIFACT_VERSION),
  promptVersion: z.string().min(1),
  status: z.literal('draft'),
  content: contentPackageSchema,
  internalLinks: z.array(internalLinkSuggestionSchema).default([]),
  claims: z.array(sourcedClaimSchema).default([]),
  warnings: z.array(contentPackageWarningSchema).default([]),
  model: z.object({
    provider: z.string().min(1),
    name: z.string().min(1),
  }),
  generatedAt: z.string().datetime(),
})

export type ContentPackageArtifact = z.infer<typeof contentPackageArtifactSchema>

export type CreateContentPackageArtifactInput = {
  promptVersion: string
  content: ContentPackage
  internalLinks?: InternalLinkSuggestion[]
  claims?: SourcedClaim[]
  warnings?: ContentPackageWarning[]
  model: {
    provider: string
    name: string
  }
  generatedAt: string
}

export function createContentPackageArtifact(
  input: CreateContentPackageArtifactInput,
): ContentPackageArtifact {
  return contentPackageArtifactSchema.parse({
    kind: 'content_package',
    version: CONTENT_PACKAGE_ARTIFACT_VERSION,
    status: 'draft',
    internalLinks: [],
    claims: [],
    warnings: [],
    ...input,
  })
}
