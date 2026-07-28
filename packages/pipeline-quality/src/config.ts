import { z } from 'zod'

export const pipelineQualityConfigSchema = z.object({
  maxNodeTitleLength: z.number().int().positive().default(120),
  maxNodeCount: z.number().int().positive().default(20),
  optionLabelOverlapThreshold: z.number().min(0).max(1).default(0.85),
  minMetadataTitleLength: z.number().int().positive().default(10),
  minMetadataDescriptionLength: z.number().int().positive().default(50),
  forbiddenPlaceholders: z
    .array(z.string())
    .default(['[todo]', 'lorem ipsum', 'xxx', 'placeholder', 'tbd']),
  pageSimilarityThreshold: z.number().min(0).max(1).default(0.75),
  warningScorePenalty: z.number().min(0).default(5),
  infoScorePenalty: z.number().min(0).default(1),
})

export type PipelineQualityConfig = z.infer<typeof pipelineQualityConfigSchema>

export const DEFAULT_PIPELINE_QUALITY_CONFIG = pipelineQualityConfigSchema.parse({})

export function mergePipelineQualityConfig(
  partial?: Partial<PipelineQualityConfig>,
): PipelineQualityConfig {
  return pipelineQualityConfigSchema.parse({
    ...DEFAULT_PIPELINE_QUALITY_CONFIG,
    ...partial,
  })
}
