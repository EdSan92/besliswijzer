import type { PipelineStepHandler } from './types.js'

export class PipelineStepRegistry {
  private readonly handlers: Map<string, PipelineStepHandler>

  constructor(handlers: PipelineStepHandler[]) {
    this.handlers = new Map(handlers.map((handler) => [handler.stepKey, handler]))
  }

  get(stepKey: string): PipelineStepHandler {
    const handler = this.handlers.get(stepKey)
    if (!handler) {
      throw new Error(`No pipeline step handler registered for "${stepKey}"`)
    }
    return handler
  }

  has(stepKey: string): boolean {
    return this.handlers.has(stepKey)
  }

  keys(): string[] {
    return [...this.handlers.keys()]
  }
}

export function assertRegistryCoversSteps(stepKeys: string[], registry: PipelineStepRegistry): void {
  for (const stepKey of stepKeys) {
    if (!registry.has(stepKey)) {
      throw new Error(`Pipeline registry missing handler for step "${stepKey}"`)
    }
  }
}
