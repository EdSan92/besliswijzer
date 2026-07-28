import { randomUUID } from 'node:crypto'
import type {
  PipelineArtifactKind,
  PipelineRun,
  PipelineRunStatus,
} from '@besliswijzer/pipeline-schema'
import {
  transitionPipelineRunStatus,
  type PipelineRunStore,
} from '@besliswijzer/pipeline-schema'
import { z } from 'zod'
import {
  buildArtifactCorrectionDiff,
  extractReviewRecords,
  summarizePipelineRun,
  type PipelineRunSummary,
  type ReviewRecordPayload,
} from './artifacts.js'
import { validateArtifactCorrectionPayload } from './artifact-validation.js'
import { PipelineReviewError } from './errors.js'
import {
  assertRunCanBeApproved,
  buildQualityReportForRun,
  serializeQualityReport,
} from './quality.js'

export interface PipelineRunListStore extends PipelineRunStore {
  list(options?: { status?: PipelineRunStatus; limit?: number }): Promise<PipelineRun[]>
}

export const updateArtifactBodySchema = z.object({
  kind: z.enum([
    'flow_brief',
    'content_package',
    'compiled_flow',
  ]),
  payload: z.record(z.unknown()),
  actor: z.string().min(1),
  reason: z.string().min(1).optional(),
})

export type UpdateArtifactBody = z.infer<typeof updateArtifactBodySchema>

export const rejectRunBodySchema = z.object({
  actor: z.string().min(1),
  reason: z.string().min(1),
})

export type RejectRunBody = z.infer<typeof rejectRunBodySchema>

export const approveRunBodySchema = z.object({
  actor: z.string().min(1),
})

export type ApproveRunBody = z.infer<typeof approveRunBodySchema>

export type PipelineRunDetail = {
  run: PipelineRun
  summary: PipelineRunSummary
  qualityReport: ReturnType<typeof serializeQualityReport>
  reviewRecords: ReviewRecordPayload[]
  corrections: Array<{
    kind: PipelineArtifactKind
    diff: ReturnType<typeof buildArtifactCorrectionDiff>
  }>
}

function defaultNow(): string {
  return new Date().toISOString()
}

function appendReviewRecord(
  run: PipelineRun,
  stepId: string,
  record: ReviewRecordPayload,
  now: string,
): PipelineRun {
  const version =
    run.artifacts.filter((artifact) => artifact.kind === 'review_record').length + 1

  return {
    ...run,
    artifacts: [
      ...run.artifacts,
      {
        id: randomUUID(),
        runId: run.id,
        stepId,
        kind: 'review_record',
        version,
        payload: record,
        createdAt: now,
      },
    ],
    updatedAt: now,
  }
}

function resolveReviewStepId(run: PipelineRun): string {
  const lastCompleted = [...run.steps]
    .filter((step) => step.status === 'completed')
    .sort((left, right) => right.sortOrder - left.sortOrder)[0]

  return lastCompleted?.id ?? run.steps[0]?.id ?? randomUUID()
}

export async function listPipelineRuns(
  store: PipelineRunListStore,
  options?: { status?: PipelineRunStatus; limit?: number },
): Promise<PipelineRunSummary[]> {
  const runs = await store.list(options)
  return runs.map(summarizePipelineRun)
}

export async function getPipelineRunDetail(
  store: PipelineRunStore,
  runId: string,
): Promise<PipelineRunDetail> {
  const run = await store.findById(runId)
  if (!run) {
    throw new PipelineReviewError(`Pipeline run "${runId}" not found`, 'NOT_FOUND')
  }

  const qualityReport = serializeQualityReport(buildQualityReportForRun(run))
  const reviewRecords = extractReviewRecords(run)
  const correctionKinds: PipelineArtifactKind[] = ['flow_brief', 'content_package', 'compiled_flow']

  return {
    run,
    summary: summarizePipelineRun(run),
    qualityReport,
    reviewRecords,
    corrections: correctionKinds
      .map((kind) => ({
        kind,
        diff: buildArtifactCorrectionDiff(run, kind),
      }))
      .filter((entry) => entry.diff.length > 0),
  }
}

export async function updatePipelineRunArtifact(
  store: PipelineRunStore,
  runId: string,
  body: UpdateArtifactBody,
  now: () => string = defaultNow,
): Promise<PipelineRunDetail> {
  const run = await store.findById(runId)
  if (!run) {
    throw new PipelineReviewError(`Pipeline run "${runId}" not found`, 'NOT_FOUND')
  }

  if (run.status !== 'needs_review') {
    throw new PipelineReviewError(
      `Artifacts can only be corrected while run is needs_review (current: ${run.status})`,
      'INVALID_STATUS',
    )
  }

  const validation = validateArtifactCorrectionPayload(body.kind, body.payload)
  if (!validation.ok) {
    throw new PipelineReviewError(
      `Invalid ${body.kind} payload: ${validation.errors.join('; ')}`,
      'INVALID_PAYLOAD',
    )
  }

  const latest = [...run.artifacts]
    .filter((artifact) => artifact.kind === body.kind)
    .sort((left, right) => right.version - left.version)[0]

  const stepId = latest?.stepId ?? resolveReviewStepId(run)
  const version = (latest?.version ?? 0) + 1
  const timestamp = now()

  let saved = {
    ...run,
    artifacts: [
      ...run.artifacts,
      {
        id: randomUUID(),
        runId: run.id,
        stepId,
        kind: body.kind,
        version,
        payload: body.payload,
        createdAt: timestamp,
      },
    ],
    updatedAt: timestamp,
  }

  saved = appendReviewRecord(
    saved,
    stepId,
    {
      action: 'corrected',
      actor: body.actor,
      reason: body.reason,
      artifactKind: body.kind,
      previousVersion: latest?.version,
      occurredAt: timestamp,
    },
    timestamp,
  )

  await store.save(saved)
  return getPipelineRunDetail(store, runId)
}

export async function approvePipelineRun(
  store: PipelineRunStore,
  runId: string,
  body: ApproveRunBody,
  now: () => string = defaultNow,
): Promise<PipelineRunDetail> {
  const run = await store.findById(runId)
  if (!run) {
    throw new PipelineReviewError(`Pipeline run "${runId}" not found`, 'NOT_FOUND')
  }

  if (run.status !== 'needs_review') {
    throw new PipelineReviewError(
      `Run must be needs_review to approve (current: ${run.status})`,
      'INVALID_STATUS',
    )
  }

  try {
    assertRunCanBeApproved(run)
  } catch (error) {
    throw new PipelineReviewError(
      error instanceof Error ? error.message : 'Quality gate blocked approval',
      'BLOCKING_QUALITY',
    )
  }

  const timestamp = now()
  const stepId = resolveReviewStepId(run)
  let saved = transitionPipelineRunStatus(run, 'approved')
  saved = appendReviewRecord(
    saved,
    stepId,
    {
      action: 'approved',
      actor: body.actor,
      occurredAt: timestamp,
    },
    timestamp,
  )

  await store.save(saved)
  return getPipelineRunDetail(store, runId)
}

export async function rejectPipelineRun(
  store: PipelineRunStore,
  runId: string,
  body: RejectRunBody,
  now: () => string = defaultNow,
): Promise<PipelineRunDetail> {
  const run = await store.findById(runId)
  if (!run) {
    throw new PipelineReviewError(`Pipeline run "${runId}" not found`, 'NOT_FOUND')
  }

  if (run.status !== 'needs_review') {
    throw new PipelineReviewError(
      `Run must be needs_review to reject (current: ${run.status})`,
      'INVALID_STATUS',
    )
  }

  if (!body.reason.trim()) {
    throw new PipelineReviewError('Reject reason is required', 'REASON_REQUIRED')
  }

  const timestamp = now()
  const stepId = resolveReviewStepId(run)
  let saved = transitionPipelineRunStatus(run, 'failed')
  saved = appendReviewRecord(
    saved,
    stepId,
    {
      action: 'rejected',
      actor: body.actor,
      reason: body.reason,
      occurredAt: timestamp,
    },
    timestamp,
  )

  await store.save(saved)
  return getPipelineRunDetail(store, runId)
}
