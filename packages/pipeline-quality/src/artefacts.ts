import type { CompiledFlowArtefact, FlowBrief } from '@besliswijzer/flow-compiler'
import { z } from 'zod'

export const contentPackageSchema = z.object({
  slug: z.string().min(2),
  intro: z.string(),
  buyingGuide: z.string(),
  faq: z.array(
    z.object({
      question: z.string(),
      answer: z.string(),
    }),
  ),
  metadata: z.object({
    title: z.string(),
    description: z.string(),
  }),
})

export type ContentPackage = z.infer<typeof contentPackageSchema>

export const sourcedClaimSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  sourceId: z.string().optional(),
  requiresSource: z.boolean().default(false),
})

export type SourcedClaim = z.infer<typeof sourcedClaimSchema>

export type PipelineQualityInput = {
  flowBrief?: FlowBrief
  compiledFlow?: CompiledFlowArtefact
  contentPackage?: ContentPackage
  claims?: SourcedClaim[]
  existingPages?: Array<{ slug: string; title: string; text: string }>
}
