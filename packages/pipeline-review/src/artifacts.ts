import type { PipelineArtifactKind, PipelineRun, PipelineRunStatus } from '@besliswijzer/pipeline-schema'
import { flowBriefSchema } from '@besliswijzer/flow-compiler'
import { contentPackageSchema } from '@besliswijzer/pipeline-quality'
import { z } from 'zod'

export const reviewRecordPayloadSchema = z.object({
  action: z.enum(['approved', 'rejected', 'corrected']),
  actor: z.string().min(1),
  reason: z.string().optional(),
  artifactKind: z.string().optional(),
  previousVersion: z.number().int().positive().optional(),
  occurredAt: z.string().datetime(),
})

export type ReviewRecordPayload = z.infer<typeof reviewRecordPayloadSchema>

export function findLatestArtifactByKind(
  run: PipelineRun,
  kind: PipelineArtifactKind,
) {
  return [...run.artifacts]
    .filter((artifact) => artifact.kind === kind)
    .sort((left, right) => right.version - left.version)[0]
}

export function findArtifactVersionsByKind(run: PipelineRun, kind: PipelineArtifactKind) {
  return [...run.artifacts]
    .filter((artifact) => artifact.kind === kind)
    .sort((left, right) => left.version - right.version)
}

export function extractFlowBriefFromRun(run: PipelineRun) {
  const artifact = findLatestArtifactByKind(run, 'flow_brief')
  if (!artifact) {
    return null
  }

  const payload = artifact.payload as { brief?: unknown }
  const candidate = payload.brief ?? payload
  const parsed = flowBriefSchema.safeParse(candidate)
  return parsed.success ? parsed.data : null
}

export function extractContentPackageFromRun(run: PipelineRun) {
  const artifact = findLatestArtifactByKind(run, 'content_package')
  if (!artifact) {
    return null
  }

  const payload = artifact.payload
  const candidate =
    payload && typeof payload === 'object' && 'content' in payload
      ? (payload as { content: unknown }).content
      : payload

  const parsed = contentPackageSchema.safeParse(candidate)
  return parsed.success ? parsed.data : null
}

export function extractQualityReportFromRun(run: PipelineRun) {
  const artifact = findLatestArtifactByKind(run, 'quality_report')
  if (!artifact) {
    return null
  }
  return artifact.payload
}

export function extractReviewRecords(run: PipelineRun): ReviewRecordPayload[] {
  return run.artifacts
    .filter((artifact) => artifact.kind === 'review_record')
    .map((artifact) => reviewRecordPayloadSchema.parse(artifact.payload))
    .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt))
}

export type ArtifactDiffEntry = {
  path: string
  before: unknown
  after: unknown
}

export function diffJsonValues(before: unknown, after: unknown, path = ''): ArtifactDiffEntry[] {
  if (Object.is(before, after)) {
    return []
  }

  if (
    before === null ||
    after === null ||
    typeof before !== 'object' ||
    typeof after !== 'object' ||
    Array.isArray(before) !== Array.isArray(after)
  ) {
    return [{ path: path || 'root', before, after }]
  }

  const entries: ArtifactDiffEntry[] = []
  const beforeRecord = before as Record<string, unknown>
  const afterRecord = after as Record<string, unknown>
  const keys = new Set([...Object.keys(beforeRecord), ...Object.keys(afterRecord)])

  for (const key of keys) {
    const nextPath = path ? `${path}.${key}` : key
    entries.push(...diffJsonValues(beforeRecord[key], afterRecord[key], nextPath))
  }

  return entries
}

export function buildArtifactCorrectionDiff(
  run: PipelineRun,
  kind: PipelineArtifactKind,
): ArtifactDiffEntry[] {
  const versions = findArtifactVersionsByKind(run, kind)
  if (versions.length < 2) {
    return []
  }

  const previous = versions[versions.length - 2]!.payload
  const current = versions[versions.length - 1]!.payload
  return diffJsonValues(previous, current)
}

export type PipelineRunSummary = {
  id: string
  categorySlug: string
  language: string
  status: PipelineRunStatus
  pipelineVersion: string
  inputVersion: string
  updatedAt: string
  artifactKinds: PipelineArtifactKind[]
}

export function summarizePipelineRun(run: PipelineRun): PipelineRunSummary {
  return {
    id: run.id,
    categorySlug: run.categorySlug,
    language: run.language,
    status: run.status,
    pipelineVersion: run.pipelineVersion,
    inputVersion: run.inputVersion,
    updatedAt: run.updatedAt,
    artifactKinds: [...new Set(run.artifacts.map((artifact) => artifact.kind))],
  }
}
