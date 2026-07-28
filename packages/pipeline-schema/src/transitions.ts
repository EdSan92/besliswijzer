import type { PipelineRunStatus } from './model.js'

/**
 * Allowed pipeline run status transitions.
 *
 * queued → running → needs_review → approved → published
 *                  ↘ failed ↗ (retry via queued)
 */
export const PIPELINE_RUN_TRANSITIONS: Record<PipelineRunStatus, readonly PipelineRunStatus[]> = {
  queued: ['running'],
  running: ['needs_review', 'failed'],
  needs_review: ['approved', 'failed'],
  approved: ['published', 'failed'],
  failed: ['queued'],
  published: [],
}

export function canTransitionRunStatus(
  from: PipelineRunStatus,
  to: PipelineRunStatus,
): boolean {
  return PIPELINE_RUN_TRANSITIONS[from].includes(to)
}

export function assertValidRunStatusTransition(
  from: PipelineRunStatus,
  to: PipelineRunStatus,
): void {
  if (!canTransitionRunStatus(from, to)) {
    throw new Error(`Invalid pipeline run status transition: ${from} → ${to}`)
  }
}

export function isTerminalRunStatus(status: PipelineRunStatus): boolean {
  return status === 'published'
}
