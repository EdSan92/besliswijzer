import { compileFlowBrief, flowBriefSchema } from '@besliswijzer/flow-compiler'
import type { PipelineStepHandler } from '@besliswijzer/pipeline-schema'
import { PipelineStepExecutionError } from '@besliswijzer/pipeline-schema'
import { createPipelineArtifact, findLatestArtifact } from '../artifact-envelope.js'
import { PIPELINE_STEP_KEYS } from '../step-keys.js'

export function createCompileFlowHandler(): PipelineStepHandler<
  Record<string, unknown>,
  { compiledFlowKind: 'compiled_flow' }
> {
  return {
    stepKey: PIPELINE_STEP_KEYS.COMPILE_FLOW,
    execute: async ({ run, step }) => {
      const flowBriefPayload = findLatestArtifact(run, 'flow_brief')?.payload
      if (!flowBriefPayload) {
        throw new PipelineStepExecutionError(
          'Missing flow_brief artifact',
          PIPELINE_STEP_KEYS.COMPILE_FLOW,
          'MISSING_ARTIFACT',
          false,
        )
      }

      const wrapper = flowBriefPayload as { brief?: unknown }
      const parsed = flowBriefSchema.safeParse(wrapper.brief ?? flowBriefPayload)
      if (!parsed.success) {
        throw new PipelineStepExecutionError(
          'Invalid flow_brief artifact payload',
          PIPELINE_STEP_KEYS.COMPILE_FLOW,
          'INVALID_ARTIFACT',
          false,
        )
      }

      const result = compileFlowBrief(parsed.data)
      if (!result.ok) {
        throw new PipelineStepExecutionError(
          result.errors.join('; '),
          PIPELINE_STEP_KEYS.COMPILE_FLOW,
          'COMPILE_FAILED',
          false,
        )
      }

      return {
        output: { compiledFlowKind: 'compiled_flow' as const },
        artifacts: [
          createPipelineArtifact({
            run,
            stepId: step.id,
            kind: 'compiled_flow',
            payload: result.artefact as unknown as Record<string, unknown>,
          }),
        ],
      }
    },
  }
}
