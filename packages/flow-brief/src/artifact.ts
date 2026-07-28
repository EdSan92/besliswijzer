import { z } from 'zod'
import { flowBriefSchema, type FlowBrief } from '@besliswijzer/flow-compiler'
import { flowBriefWarningSchema, type FlowBriefWarning } from './warnings.js'

export const FLOW_BRIEF_ARTIFACT_VERSION = '1.0.0' as const
export const FLOW_BRIEF_PROMPT_VERSION = '1.0.0' as const

export const flowBriefGenerationOutputSchema = z.object({
  brief: flowBriefSchema,
  warnings: z.array(flowBriefWarningSchema).default([]),
})

export type FlowBriefGenerationOutput = z.infer<typeof flowBriefGenerationOutputSchema>

export const flowBriefArtifactSchema = z.object({
  kind: z.literal('flow_brief'),
  version: z.literal(FLOW_BRIEF_ARTIFACT_VERSION),
  promptVersion: z.string().min(1),
  brief: flowBriefSchema,
  warnings: z.array(flowBriefWarningSchema).default([]),
  model: z.object({
    provider: z.string().min(1),
    name: z.string().min(1),
  }),
  generatedAt: z.string().datetime(),
})

export type FlowBriefArtifact = z.infer<typeof flowBriefArtifactSchema>

export type CreateFlowBriefArtifactInput = {
  promptVersion: string
  brief: FlowBrief
  warnings?: FlowBriefWarning[]
  model: {
    provider: string
    name: string
  }
  generatedAt: string
}

export function createFlowBriefArtifact(input: CreateFlowBriefArtifactInput): FlowBriefArtifact {
  return flowBriefArtifactSchema.parse({
    kind: 'flow_brief',
    version: FLOW_BRIEF_ARTIFACT_VERSION,
    warnings: [],
    ...input,
  })
}
