import type { PipelineRun } from './model.js'
import { pipelineRunSchema } from './model.js'
import type { PipelineRunStore } from './store.js'

export class InMemoryPipelineRunStore implements PipelineRunStore {
  private readonly byId = new Map<string, PipelineRun>()
  private readonly byIdempotencyKey = new Map<string, string>()

  async findByIdempotencyKey(idempotencyKey: string): Promise<PipelineRun | null> {
    const id = this.byIdempotencyKey.get(idempotencyKey)
    if (!id) {
      return null
    }
    return this.byId.get(id) ?? null
  }

  async findById(id: string): Promise<PipelineRun | null> {
    return this.byId.get(id) ?? null
  }

  async save(run: PipelineRun): Promise<PipelineRun> {
    const parsed = pipelineRunSchema.parse(run)
    const existingId = this.byIdempotencyKey.get(parsed.idempotencyKey)
    if (existingId && existingId !== parsed.id) {
      throw new Error(`Idempotency key "${parsed.idempotencyKey}" is already used by run ${existingId}`)
    }

    this.byId.set(parsed.id, parsed)
    this.byIdempotencyKey.set(parsed.idempotencyKey, parsed.id)
    return parsed
  }
}
