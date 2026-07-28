import { randomUUID } from 'node:crypto'
import type { IdempotencyKeyInput, PipelineRun } from './model.js'
import { buildIdempotencyKey, pipelineRunSchema, pipelineStepSchema } from './model.js'
import { assertValidRunStatusTransition } from './transitions.js'

export class DuplicatePipelineRunError extends Error {
  readonly idempotencyKey: string

  constructor(idempotencyKey: string) {
    super(`Pipeline run with idempotency key "${idempotencyKey}" already exists`)
    this.name = 'DuplicatePipelineRunError'
    this.idempotencyKey = idempotencyKey
  }
}

export type CreatePipelineRunInput = IdempotencyKeyInput & {
  id?: string
  stepKeys?: string[]
  now?: string
}

export type CreatePipelineRunResult =
  | { run: PipelineRun; created: true }
  | { run: PipelineRun; created: false }

export function createPipelineRun(input: CreatePipelineRunInput): PipelineRun {
  const now = input.now ?? new Date().toISOString()
  const idempotencyKey = buildIdempotencyKey(input)
  const runId = input.id ?? randomUUID()
  const stepKeys = input.stepKeys ?? []

  const run: PipelineRun = {
    id: runId,
    idempotencyKey,
    categorySlug: input.categorySlug,
    language: input.language ?? 'nl',
    pipelineVersion: input.pipelineVersion,
    inputVersion: input.inputVersion,
    status: 'queued',
    steps: stepKeys.map((stepKey, index) => ({
      id: randomUUID(),
      runId,
      stepKey,
      status: 'pending',
      sortOrder: index,
    })),
    artifacts: [],
    sources: [],
    errors: [],
    createdAt: now,
    updatedAt: now,
  }

  return pipelineRunSchema.parse(run)
}

export function transitionPipelineRunStatus(run: PipelineRun, toStatus: PipelineRun['status']): PipelineRun {
  assertValidRunStatusTransition(run.status, toStatus)
  return pipelineRunSchema.parse({
    ...run,
    status: toStatus,
    updatedAt: new Date().toISOString(),
  })
}

export interface PipelineRunStore {
  findByIdempotencyKey(idempotencyKey: string): Promise<PipelineRun | null>
  findById(id: string): Promise<PipelineRun | null>
  save(run: PipelineRun): Promise<PipelineRun>
}

export async function createOrGetPipelineRun(
  store: PipelineRunStore,
  input: CreatePipelineRunInput,
): Promise<CreatePipelineRunResult> {
  const idempotencyKey = buildIdempotencyKey(input)
  const existing = await store.findByIdempotencyKey(idempotencyKey)
  if (existing) {
    return { run: existing, created: false }
  }

  const run = createPipelineRun(input)
  const saved = await store.save(run)
  return { run: saved, created: true }
}

export async function createPipelineRunStrict(
  store: PipelineRunStore,
  input: CreatePipelineRunInput,
): Promise<PipelineRun> {
  const result = await createOrGetPipelineRun(store, input)
  if (!result.created) {
    throw new DuplicatePipelineRunError(result.run.idempotencyKey)
  }
  return result.run
}

export function updatePipelineStep(
  run: PipelineRun,
  stepId: string,
  patch: Partial<Pick<PipelineRun['steps'][number], 'status' | 'input' | 'output' | 'errorMessage' | 'startedAt' | 'finishedAt'>>,
): PipelineRun {
  const steps = run.steps.map((step) =>
    step.id === stepId ? pipelineStepSchema.parse({ ...step, ...patch }) : step,
  )

  return pipelineRunSchema.parse({
    ...run,
    steps,
    updatedAt: new Date().toISOString(),
  })
}
