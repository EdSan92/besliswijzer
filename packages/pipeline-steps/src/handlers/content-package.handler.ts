import type { ContentPackageArtifact } from '@besliswijzer/content-package'
import {
  generateContentPackage,
  mapFlowBriefToInput,
  mapKeywordArtifactToInput,
  type ContentPackageModelProvider,
} from '@besliswijzer/content-package'
import { flowBriefSchema } from '@besliswijzer/flow-compiler'
import { keywordResearchArtifactSchema } from '@besliswijzer/keyword-research'
import type { PipelineStepHandler } from '@besliswijzer/pipeline-schema'
import { PipelineStepExecutionError } from '@besliswijzer/pipeline-schema'
import { createPipelineArtifact, findLatestArtifact } from '../artifact-envelope.js'
import { PIPELINE_STEP_KEYS } from '../step-keys.js'

export type ContentPackageHandlerDeps = {
  provider: ContentPackageModelProvider
  now?: () => string
}

export function createContentPackageHandler(
  deps: ContentPackageHandlerDeps,
): PipelineStepHandler<Record<string, unknown>, { contentPackageArtifact: ContentPackageArtifact }> {
  const now = deps.now ?? (() => new Date().toISOString())

  return {
    stepKey: PIPELINE_STEP_KEYS.CONTENT_PACKAGE,
    execute: async ({ run, step, input }) => {
      const keywordArtifactPayload = findLatestArtifact(run, 'keyword_data')?.payload
      const flowBriefPayload = findLatestArtifact(run, 'flow_brief')?.payload

      if (!keywordArtifactPayload || !flowBriefPayload) {
        throw new PipelineStepExecutionError(
          'Missing keyword_data or flow_brief artifacts',
          PIPELINE_STEP_KEYS.CONTENT_PACKAGE,
          'MISSING_ARTIFACT',
          false,
        )
      }

      const keywordParsed = keywordResearchArtifactSchema.safeParse(keywordArtifactPayload)
      const flowBriefWrapper = flowBriefPayload as { brief?: unknown }
      const flowBriefParsed = flowBriefSchema.safeParse(flowBriefWrapper.brief ?? flowBriefPayload)

      if (!keywordParsed.success || !flowBriefParsed.success) {
        throw new PipelineStepExecutionError(
          'Invalid upstream artifacts for content package generation',
          PIPELINE_STEP_KEYS.CONTENT_PACKAGE,
          'INVALID_ARTIFACT',
          false,
        )
      }

      const existingRoutes = Array.isArray(input.existingRoutes)
        ? input.existingRoutes.filter((route): route is string => typeof route === 'string')
        : undefined

      const baseInput = mapKeywordArtifactToInput(keywordParsed.data, run.categorySlug)
      const generationInput = mapFlowBriefToInput(flowBriefParsed.data, {
        ...baseInput,
        existingRoutes,
      })

      const artifact = await generateContentPackage({
        provider: deps.provider,
        input: generationInput,
        now,
      })

      return {
        output: { contentPackageArtifact: artifact },
        artifacts: [
          createPipelineArtifact({
            run,
            stepId: step.id,
            kind: 'content_package',
            payload: artifact as unknown as Record<string, unknown>,
            now,
          }),
        ],
      }
    },
  }
}
