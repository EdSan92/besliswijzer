import type { PipelineArtifact, PipelineRun, PipelineStep, SourceReference } from '../model.js'

export type PipelineStepContext<TInput = unknown> = {
  run: PipelineRun
  step: PipelineStep
  input: TInput
  stepIdempotencyKey: string
  abortSignal?: AbortSignal
}

export type PipelineStepResult<TOutput = unknown> = {
  output: TOutput
  artifacts?: PipelineArtifact[]
  sources?: SourceReference[]
}

export type PipelineStepHandler<TInput = unknown, TOutput = unknown> = {
  stepKey: string
  timeoutMs?: number
  execute(context: PipelineStepContext<TInput>): Promise<PipelineStepResult<TOutput>>
}

export class PipelineStepExecutionError extends Error {
  readonly stepKey: string
  readonly code: string
  readonly retryable: boolean

  constructor(message: string, stepKey: string, code: string, retryable = true) {
    super(message)
    this.name = 'PipelineStepExecutionError'
    this.stepKey = stepKey
    this.code = code
    this.retryable = retryable
  }
}

export function buildStepIdempotencyKey(run: PipelineRun, stepKey: string): string {
  return `${run.idempotencyKey}:${stepKey}`
}
