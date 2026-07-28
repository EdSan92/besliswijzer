import { randomUUID } from 'node:crypto'
import type { PipelineRun } from '../model.js'
import { transitionPipelineRunStatus, updatePipelineStep, type PipelineRunStore } from '../store.js'
import { PipelineStepRegistry } from './registry.js'
import {
  buildStepIdempotencyKey,
  PipelineStepExecutionError,
  type PipelineStepHandler,
  type PipelineStepResult,
} from './types.js'

export type PipelineOrchestratorOptions = {
  store: PipelineRunStore
  handlers: PipelineStepHandler[]
  now?: () => string
}

export type StartPipelineRunOptions = {
  runId: string
  initialInput?: Record<string, unknown>
}

export type ResumePipelineRunOptions = {
  runId: string
}

export type RetryPipelineStepOptions = {
  runId: string
  stepKey: string
  input?: Record<string, unknown>
}

function defaultNow(): string {
  return new Date().toISOString()
}

function orderedSteps(run: PipelineRun) {
  return [...run.steps].sort((left, right) => left.sortOrder - right.sortOrder)
}

function resolveStepInput(
  run: PipelineRun,
  stepIndex: number,
  initialInput: Record<string, unknown>,
): Record<string, unknown> {
  if (stepIndex === 0) {
    return initialInput
  }

  const previous = orderedSteps(run)[stepIndex - 1]
  if (previous?.status === 'completed' && previous.output && typeof previous.output === 'object') {
    return previous.output as Record<string, unknown>
  }

  return initialInput
}

async function executeWithTimeout<T>(
  handler: PipelineStepHandler,
  execute: () => Promise<PipelineStepResult<T>>,
): Promise<PipelineStepResult<T>> {
  if (!handler.timeoutMs) {
    return execute()
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      execute(),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(
            new PipelineStepExecutionError(
              `Step "${handler.stepKey}" timed out after ${handler.timeoutMs}ms`,
              handler.stepKey,
              'STEP_TIMEOUT',
              true,
            ),
          )
        }, handler.timeoutMs)
      }),
    ])
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

export class PipelineOrchestrator {
  private readonly store: PipelineRunStore
  private readonly registry: PipelineStepRegistry
  private readonly now: () => string

  constructor(options: PipelineOrchestratorOptions) {
    this.store = options.store
    this.registry = new PipelineStepRegistry(options.handlers)
    this.now = options.now ?? defaultNow
  }

  async start(options: StartPipelineRunOptions): Promise<PipelineRun> {
    let run = await this.requireRun(options.runId)
    if (run.status === 'queued') {
      run = transitionPipelineRunStatus(run, 'running')
      run = await this.store.save(run)
    }

    return this.executeFromCheckpoint(run, options.initialInput ?? {})
  }

  async resume(options: ResumePipelineRunOptions): Promise<PipelineRun> {
    let run = await this.requireRun(options.runId)

    if (run.status === 'failed') {
      run = transitionPipelineRunStatus(run, 'queued')
      run = transitionPipelineRunStatus(run, 'running')
      run = await this.store.save(run)
    } else if (run.status === 'queued') {
      run = transitionPipelineRunStatus(run, 'running')
      run = await this.store.save(run)
    }

    const firstStep = orderedSteps(run)[0]
    const initialInput =
      firstStep?.input && typeof firstStep.input === 'object'
        ? (firstStep.input as Record<string, unknown>)
        : {}

    return this.executeFromCheckpoint(run, initialInput)
  }

  async retryStep(options: RetryPipelineStepOptions): Promise<PipelineRun> {
    let run = await this.requireRun(options.runId)
    const steps = orderedSteps(run)
    const targetIndex = steps.findIndex((step) => step.stepKey === options.stepKey)
    if (targetIndex === -1) {
      throw new Error(`Step "${options.stepKey}" not found on run ${run.id}`)
    }

    for (let index = targetIndex; index < steps.length; index += 1) {
      const step = steps[index]!
      run = updatePipelineStep(run, step.id, {
        status: 'pending',
        input: index === targetIndex ? (options.input ?? step.input ?? null) : null,
        output: null,
        errorMessage: null,
        startedAt: null,
        finishedAt: null,
      })
    }

    run = {
      ...run,
      errors: run.errors.filter((error) => error.stepId !== steps[targetIndex]!.id),
    }

    if (run.status === 'failed') {
      run = transitionPipelineRunStatus(run, 'queued')
    }
    if (run.status === 'queued') {
      run = transitionPipelineRunStatus(run, 'running')
    }

    run = await this.store.save(run)

    const initialInput =
      options.input ??
      (steps[targetIndex]?.input && typeof steps[targetIndex]?.input === 'object'
        ? (steps[targetIndex]!.input as Record<string, unknown>)
        : targetIndex > 0
          ? ((steps[targetIndex - 1]?.output as Record<string, unknown> | undefined) ?? {})
          : {})

    return this.executeFromCheckpoint(run, initialInput, targetIndex)
  }

  private async executeFromCheckpoint(
    run: PipelineRun,
    initialInput: Record<string, unknown>,
    startIndex = 0,
  ): Promise<PipelineRun> {
    const steps = orderedSteps(run)

    for (let index = startIndex; index < steps.length; index += 1) {
      const step = steps[index]!

      if (step.status === 'completed' || step.status === 'skipped') {
        continue
      }

      const handler = this.registry.get(step.stepKey)
      const input = resolveStepInput(run, index, initialInput)
      const startedAt = this.now()

      run = updatePipelineStep(run, step.id, {
        status: 'running',
        input,
        errorMessage: null,
        startedAt,
      })
      run = await this.store.save(run)

      try {
        const result = await executeWithTimeout(handler, () =>
          handler.execute({
            run,
            step: run.steps.find((candidate) => candidate.id === step.id)!,
            input,
            stepIdempotencyKey: buildStepIdempotencyKey(run, step.stepKey),
          }),
        )

        run = updatePipelineStep(run, step.id, {
          status: 'completed',
          output: result.output as Record<string, unknown>,
          finishedAt: this.now(),
        })

        if (result.artifacts?.length) {
          run = {
            ...run,
            artifacts: [...run.artifacts, ...result.artifacts],
          }
        }
        if (result.sources?.length) {
          run = {
            ...run,
            sources: [...run.sources, ...result.sources],
          }
        }

        run = await this.store.save(run)
      } catch (error) {
        const normalized =
          error instanceof PipelineStepExecutionError
            ? error
            : new PipelineStepExecutionError(
                error instanceof Error ? error.message : 'Unknown step failure',
                step.stepKey,
                'STEP_FAILED',
                true,
              )

        run = updatePipelineStep(run, step.id, {
          status: 'failed',
          errorMessage: normalized.message,
          finishedAt: this.now(),
        })

        run = {
          ...run,
          errors: [
            ...run.errors,
            {
              id: randomUUID(),
              runId: run.id,
              stepId: step.id,
              code: normalized.code,
              message: normalized.message,
              retryable: normalized.retryable,
              occurredAt: this.now(),
            },
          ],
        }

        if (run.status === 'running') {
          run = transitionPipelineRunStatus(run, 'failed')
        }

        return this.store.save(run)
      }
    }

    if (run.status === 'running') {
      run = transitionPipelineRunStatus(run, 'needs_review')
      run = await this.store.save(run)
    }

    return run
  }

  private async requireRun(runId: string): Promise<PipelineRun> {
    const run = await this.store.findById(runId)
    if (!run) {
      throw new Error(`Pipeline run "${runId}" not found`)
    }
    return run
  }
}
