import type { FlowBriefArtifact } from '@besliswijzer/flow-brief'
import {
  generateFlowBrief,
  mapKeywordArtifactToInput,
  type FlowBriefModelProvider,
} from '@besliswijzer/flow-brief'
import type { KeywordResearchArtifact } from '@besliswijzer/keyword-research'
import type { PipelineStepHandler } from '@besliswijzer/pipeline-schema'
import { createPipelineArtifact } from '../artifact-envelope.js'
import { PIPELINE_STEP_KEYS } from '../step-keys.js'

export type FlowBriefStepInput = {
  keywordArtifact: KeywordResearchArtifact
  categoryTitle?: string
}

export type FlowBriefHandlerDeps = {
  provider: FlowBriefModelProvider
  now?: () => string
}

export function createFlowBriefHandler(
  deps: FlowBriefHandlerDeps,
): PipelineStepHandler<FlowBriefStepInput, { flowBriefArtifact: FlowBriefArtifact }> {
  const now = deps.now ?? (() => new Date().toISOString())

  return {
    stepKey: PIPELINE_STEP_KEYS.FLOW_BRIEF,
    execute: async ({ run, step, input }) => {
      const generationInput = mapKeywordArtifactToInput(
        input.keywordArtifact,
        input.categoryTitle ?? run.categorySlug,
      )

      const artifact = await generateFlowBrief({
        provider: deps.provider,
        input: generationInput,
        now,
      })

      return {
        output: { flowBriefArtifact: artifact },
        artifacts: [
          createPipelineArtifact({
            run,
            stepId: step.id,
            kind: 'flow_brief',
            payload: artifact,
            now,
          }),
        ],
      }
    },
  }
}
