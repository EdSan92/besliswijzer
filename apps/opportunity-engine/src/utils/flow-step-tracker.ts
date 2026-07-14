export type FlowStep = {
  id: string
  label: string
  status: 'pending' | 'active' | 'done' | 'error'
  detail?: string
  timestamp: string
  durationMs?: number
}

export class FlowStepTracker {
  private readonly steps = new Map<string, FlowStep>()
  private readonly startedAt = new Map<string, number>()

  start(id: string, label: string): void {
    const now = Date.now()
    this.startedAt.set(id, now)
    this.steps.set(id, {
      id,
      label,
      status: 'active',
      timestamp: new Date(now).toISOString(),
    })
  }

  complete(id: string, detail?: string): void {
    const step = this.steps.get(id)
    if (!step) return

    const started = this.startedAt.get(id)
    this.steps.set(id, {
      ...step,
      status: 'done',
      detail,
      durationMs: started != null ? Date.now() - started : undefined,
      timestamp: new Date().toISOString(),
    })
  }

  fail(id: string, detail: string): void {
    const step = this.steps.get(id)
    if (!step) return

    const started = this.startedAt.get(id)
    this.steps.set(id, {
      ...step,
      status: 'error',
      detail,
      durationMs: started != null ? Date.now() - started : undefined,
      timestamp: new Date().toISOString(),
    })
  }

  getSteps(): FlowStep[] {
    return Array.from(this.steps.values())
  }
}
