import { randomUUID } from 'node:crypto'
import type { PipelineArtifact, PipelineArtifactKind, PipelineRun } from '@besliswijzer/pipeline-schema'

export type CreatePipelineArtifactInput = {
  run: PipelineRun
  stepId: string
  kind: PipelineArtifactKind
  payload: Record<string, unknown>
  now?: () => string
}

export function nextArtifactVersion(
  run: PipelineRun,
  kind: PipelineArtifactKind,
): number {
  const versions = run.artifacts
    .filter((artifact) => artifact.kind === kind)
    .map((artifact) => artifact.version)

  if (versions.length === 0) {
    return 1
  }

  return Math.max(...versions) + 1
}

export function createPipelineArtifact(input: CreatePipelineArtifactInput): PipelineArtifact {
  const now = input.now ?? (() => new Date().toISOString())
  const version = nextArtifactVersion(input.run, input.kind)

  return {
    id: randomUUID(),
    runId: input.run.id,
    stepId: input.stepId,
    kind: input.kind,
    version,
    payload: input.payload,
    createdAt: now(),
  }
}

export function findLatestArtifact(
  run: PipelineRun,
  kind: PipelineArtifactKind,
): PipelineArtifact | undefined {
  return [...run.artifacts]
    .filter((artifact) => artifact.kind === kind)
    .sort((left, right) => right.version - left.version)[0]
}

export function unwrapContentPackagePayload(payload: Record<string, unknown>): Record<string, unknown> {
  if (payload.content && typeof payload.content === 'object') {
    return payload.content as Record<string, unknown>
  }
  return payload
}
