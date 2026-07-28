export type PipelineLogLevel = 'info' | 'warn' | 'error'

export type PipelineLogEvent = {
  level: PipelineLogLevel
  runId: string
  stepKey?: string
  stepId?: string
  event: string
  durationMs?: number
  retryable?: boolean
  modelProvider?: string
  modelName?: string
  inputTokens?: number
  outputTokens?: number
  message?: string
}

export type PipelineMetricsSnapshot = {
  runsStarted: number
  runsCompleted: number
  runsFailed: number
  stepExecutions: number
  stepFailures: number
  stepRetries: number
  totalDurationMs: number
}

export class PipelineObservability {
  private readonly events: PipelineLogEvent[] = []
  private metrics: PipelineMetricsSnapshot = {
    runsStarted: 0,
    runsCompleted: 0,
    runsFailed: 0,
    stepExecutions: 0,
    stepFailures: 0,
    stepRetries: 0,
    totalDurationMs: 0,
  }

  log(event: PipelineLogEvent): void {
    this.events.push(event)

    if (event.event === 'run.started') {
      this.metrics.runsStarted += 1
    }
    if (event.event === 'run.completed') {
      this.metrics.runsCompleted += 1
    }
    if (event.event === 'run.failed') {
      this.metrics.runsFailed += 1
    }
    if (event.event === 'step.completed') {
      this.metrics.stepExecutions += 1
      if (event.durationMs) {
        this.metrics.totalDurationMs += event.durationMs
      }
    }
    if (event.event === 'step.failed') {
      this.metrics.stepFailures += 1
    }
    if (event.event === 'step.retry') {
      this.metrics.stepRetries += 1
    }
  }

  getEvents(): PipelineLogEvent[] {
    return [...this.events]
  }

  getMetrics(): PipelineMetricsSnapshot {
    return { ...this.metrics }
  }

  reset(): void {
    this.events.length = 0
    this.metrics = {
      runsStarted: 0,
      runsCompleted: 0,
      runsFailed: 0,
      stepExecutions: 0,
      stepFailures: 0,
      stepRetries: 0,
      totalDurationMs: 0,
    }
  }
}

export function createStructuredPipelineLog(event: PipelineLogEvent): Record<string, unknown> {
  return {
    level: event.level,
    runId: event.runId,
    stepKey: event.stepKey,
    stepId: event.stepId,
    event: event.event,
    durationMs: event.durationMs,
    retryable: event.retryable,
    modelProvider: event.modelProvider,
    modelName: event.modelName,
    inputTokens: event.inputTokens,
    outputTokens: event.outputTokens,
    message: event.message,
  }
}
