import { runPipelineQualityChecks } from '@besliswijzer/pipeline-quality'
import { compileFlowBrief, flowBriefSchema } from '@besliswijzer/flow-compiler'
import { contentPackageSchema, sourcedClaimSchema } from '@besliswijzer/pipeline-quality'
import type { PipelineStepHandler } from '@besliswijzer/pipeline-schema'
import { createPipelineArtifact, findLatestArtifact } from '../artifact-envelope.js'
import { PIPELINE_STEP_KEYS } from '../step-keys.js'

export function createQualityGateHandler(): PipelineStepHandler<
  Record<string, unknown>,
  { qualityScore: number; hasBlockingErrors: boolean }
> {
  return {
    stepKey: PIPELINE_STEP_KEYS.QUALITY_GATE,
    execute: async ({ run, step }) => {
      const qualityInput: Parameters<typeof runPipelineQualityChecks>[0] = {}

      const flowBriefArtifact = findLatestArtifact(run, 'flow_brief')
      if (flowBriefArtifact) {
        const payload = flowBriefArtifact.payload as { brief?: unknown }
        const parsed = flowBriefSchema.safeParse(payload.brief ?? payload)
        if (parsed.success) {
          qualityInput.flowBrief = parsed.data
        }
      }

      const compiledArtifact = findLatestArtifact(run, 'compiled_flow')
      if (compiledArtifact?.payload && typeof compiledArtifact.payload === 'object') {
        const payload = compiledArtifact.payload as { flow?: unknown; kind?: string }
        if (payload.kind === 'compiled_flow') {
          qualityInput.compiledFlow = compiledArtifact.payload as never
        } else if (qualityInput.flowBrief) {
          const compiled = compileFlowBrief(qualityInput.flowBrief)
          if (compiled.ok) {
            qualityInput.compiledFlow = compiled.artefact
          }
        }
      }

      const contentArtifact = findLatestArtifact(run, 'content_package')
      if (contentArtifact) {
        const payload = contentArtifact.payload
        const candidate =
          payload && typeof payload === 'object' && 'content' in payload
            ? (payload as { content: unknown }).content
            : payload
        const parsed = contentPackageSchema.safeParse(candidate)
        if (parsed.success) {
          qualityInput.contentPackage = parsed.data
        }

        if (payload && typeof payload === 'object' && Array.isArray((payload as { claims?: unknown }).claims)) {
          qualityInput.claims = (payload as { claims: unknown[] }).claims
            .map((claim) => sourcedClaimSchema.safeParse(claim))
            .filter((result) => result.success)
            .map((result) => result.data)
        }
      }

      const report = runPipelineQualityChecks(qualityInput)

      return {
        output: {
          qualityScore: report.score,
          hasBlockingErrors: report.hasBlockingErrors,
        },
        artifacts: [
          createPipelineArtifact({
            run,
            stepId: step.id,
            kind: 'quality_report',
            payload: report as unknown as Record<string, unknown>,
          }),
        ],
      }
    },
  }
}
