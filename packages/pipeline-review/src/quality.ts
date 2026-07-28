import { compileFlowBrief, type CompiledFlowArtefact } from '@besliswijzer/flow-compiler'
import {
  assertPublishAllowed,
  runPipelineQualityChecks,
  type PipelineQualityInput,
  type QualityReport,
} from '@besliswijzer/pipeline-quality'
import type { PipelineRun } from '@besliswijzer/pipeline-schema'
import { sourcedClaimSchema } from '@besliswijzer/pipeline-quality'
import { z } from 'zod'
import {
  extractContentPackageFromRun,
  extractFlowBriefFromRun,
  findLatestArtifactByKind,
} from './artifacts.js'

export function buildQualityInputFromRun(run: PipelineRun): PipelineQualityInput {
  const flowBrief = extractFlowBriefFromRun(run)
  const contentPackage = extractContentPackageFromRun(run)

  const compiledArtifact = findLatestArtifactByKind(run, 'compiled_flow')
  let compiledFlow: CompiledFlowArtefact | undefined
  if (compiledArtifact) {
    const payload = compiledArtifact.payload as Partial<CompiledFlowArtefact>
    if (payload.flow) {
      compiledFlow = payload as CompiledFlowArtefact
    }
  }

  const contentArtifact = findLatestArtifactByKind(run, 'content_package')
  let claims: PipelineQualityInput['claims']
  if (contentArtifact?.payload && typeof contentArtifact.payload === 'object') {
    const payload = contentArtifact.payload as { claims?: unknown }
    if (Array.isArray(payload.claims)) {
      claims = payload.claims
        .map((claim) => sourcedClaimSchema.safeParse(claim))
        .filter((result) => result.success)
        .map((result) => result.data)
    }
  }

  return {
    flowBrief: flowBrief ?? undefined,
    compiledFlow,
    contentPackage: contentPackage ?? undefined,
    claims,
  }
}

export function buildQualityReportForRun(run: PipelineRun): QualityReport {
  return runPipelineQualityChecks(buildQualityInputFromRun(run))
}

export const storedQualityReportSchema = z.object({
  score: z.number(),
  hasBlockingErrors: z.boolean(),
  findings: z.array(
    z.object({
      ruleCode: z.string(),
      severity: z.enum(['error', 'warning', 'info']),
      artifactKind: z.string(),
      field: z.string(),
      message: z.string(),
    }),
  ),
})

export type StoredQualityReport = z.infer<typeof storedQualityReportSchema>

export function serializeQualityReport(report: QualityReport): StoredQualityReport {
  return storedQualityReportSchema.parse(report)
}

export function assertRunCanBeApproved(run: PipelineRun): QualityReport {
  const report = buildQualityReportForRun(run)

  if (run.status !== 'needs_review') {
    throw new Error(`Run must be in needs_review to approve (current: ${run.status})`)
  }

  assertPublishAllowed(report)
  return report
}

export function validateCompiledFlowBrief(input: unknown): CompiledFlowArtefact {
  const result = compileFlowBrief(input)
  if (!result.ok) {
    throw new Error(result.errors.join('; '))
  }
  return result.artefact
}
