import type { PipelineRun, PipelineRunStore } from '@besliswijzer/pipeline-schema'
import { pipelineRunSchema } from '@besliswijzer/pipeline-schema'
import { eq } from 'drizzle-orm'
import type { Database } from './index.js'
import {
  pipelineArtifacts,
  pipelineErrors,
  pipelineRuns,
  pipelineSourceReferences,
  pipelineSteps,
} from './schema.js'

function toIso(value: Date | string | null | undefined): string | undefined {
  if (!value) {
    return undefined
  }
  return value instanceof Date ? value.toISOString() : value
}

function mapRunRow(
  run: typeof pipelineRuns.$inferSelect,
  steps: Array<typeof pipelineSteps.$inferSelect>,
  artifacts: Array<typeof pipelineArtifacts.$inferSelect>,
  sources: Array<typeof pipelineSourceReferences.$inferSelect>,
  errors: Array<typeof pipelineErrors.$inferSelect>,
): PipelineRun {
  return pipelineRunSchema.parse({
    id: run.id,
    idempotencyKey: run.idempotencyKey,
    categorySlug: run.categorySlug,
    language: run.language,
    pipelineVersion: run.pipelineVersion,
    inputVersion: run.inputVersion,
    status: run.status,
    steps: steps
      .filter((step) => step.runId === run.id)
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((step) => ({
        id: step.id,
        runId: step.runId,
        stepKey: step.stepKey,
        status: step.status,
        input: (step.input as Record<string, unknown> | null) ?? undefined,
        output: (step.output as Record<string, unknown> | null) ?? undefined,
        errorMessage: step.errorMessage,
        startedAt: toIso(step.startedAt) ?? null,
        finishedAt: toIso(step.finishedAt) ?? null,
        sortOrder: step.sortOrder,
      })),
    artifacts: artifacts
      .filter((artifact) => artifact.runId === run.id)
      .map((artifact) => ({
        id: artifact.id,
        runId: artifact.runId,
        stepId: artifact.stepId,
        kind: artifact.kind,
        version: artifact.version,
        payload: artifact.payload as Record<string, unknown>,
        createdAt: toIso(artifact.createdAt)!,
      })),
    sources: sources
      .filter((source) => source.runId === run.id)
      .map((source) => ({
        id: source.id,
        runId: source.runId,
        stepId: source.stepId,
        label: source.label,
        url: source.url ?? undefined,
        provider: source.provider ?? undefined,
        retrievedAt: toIso(source.retrievedAt)!,
        assumption: source.assumption,
      })),
    errors: errors
      .filter((error) => error.runId === run.id)
      .map((error) => ({
        id: error.id,
        runId: error.runId,
        stepId: error.stepId,
        code: error.code,
        message: error.message,
        retryable: error.retryable,
        occurredAt: toIso(error.occurredAt)!,
      })),
    createdAt: toIso(run.createdAt)!,
    updatedAt: toIso(run.updatedAt)!,
  })
}

export class DrizzlePipelineRunStore implements PipelineRunStore {
  constructor(private readonly db: Database) {}

  async findByIdempotencyKey(idempotencyKey: string): Promise<PipelineRun | null> {
    const [run] = await this.db.select().from(pipelineRuns).where(eq(pipelineRuns.idempotencyKey, idempotencyKey)).limit(1)
    if (!run) {
      return null
    }
    return this.loadRunGraph(run)
  }

  async findById(id: string): Promise<PipelineRun | null> {
    const [run] = await this.db.select().from(pipelineRuns).where(eq(pipelineRuns.id, id)).limit(1)
    if (!run) {
      return null
    }
    return this.loadRunGraph(run)
  }

  async save(run: PipelineRun): Promise<PipelineRun> {
    const parsed = pipelineRunSchema.parse(run)

    await this.db.transaction(async (tx) => {
      await tx
        .insert(pipelineRuns)
        .values({
          id: parsed.id,
          idempotencyKey: parsed.idempotencyKey,
          categorySlug: parsed.categorySlug,
          language: parsed.language,
          pipelineVersion: parsed.pipelineVersion,
          inputVersion: parsed.inputVersion,
          status: parsed.status,
          createdAt: new Date(parsed.createdAt),
          updatedAt: new Date(parsed.updatedAt),
        })
        .onConflictDoUpdate({
          target: pipelineRuns.id,
          set: {
            status: parsed.status,
            updatedAt: new Date(parsed.updatedAt),
          },
        })

      await tx.delete(pipelineSteps).where(eq(pipelineSteps.runId, parsed.id))
      await tx.delete(pipelineArtifacts).where(eq(pipelineArtifacts.runId, parsed.id))
      await tx.delete(pipelineSourceReferences).where(eq(pipelineSourceReferences.runId, parsed.id))
      await tx.delete(pipelineErrors).where(eq(pipelineErrors.runId, parsed.id))

      if (parsed.steps.length > 0) {
        await tx.insert(pipelineSteps).values(
          parsed.steps.map((step) => ({
            id: step.id,
            runId: parsed.id,
            stepKey: step.stepKey,
            status: step.status,
            input: step.input ?? null,
            output: step.output ?? null,
            errorMessage: step.errorMessage ?? null,
            startedAt: step.startedAt ? new Date(step.startedAt) : null,
            finishedAt: step.finishedAt ? new Date(step.finishedAt) : null,
            sortOrder: step.sortOrder,
          })),
        )
      }

      if (parsed.artifacts.length > 0) {
        await tx.insert(pipelineArtifacts).values(
          parsed.artifacts.map((artifact) => ({
            id: artifact.id,
            runId: parsed.id,
            stepId: artifact.stepId,
            kind: artifact.kind,
            version: artifact.version,
            payload: artifact.payload,
            createdAt: new Date(artifact.createdAt),
          })),
        )
      }

      if (parsed.sources.length > 0) {
        await tx.insert(pipelineSourceReferences).values(
          parsed.sources.map((source) => ({
            id: source.id,
            runId: parsed.id,
            stepId: source.stepId ?? null,
            label: source.label,
            url: source.url ?? null,
            provider: source.provider ?? null,
            retrievedAt: new Date(source.retrievedAt),
            assumption: source.assumption,
          })),
        )
      }

      if (parsed.errors.length > 0) {
        await tx.insert(pipelineErrors).values(
          parsed.errors.map((error) => ({
            id: error.id,
            runId: parsed.id,
            stepId: error.stepId ?? null,
            code: error.code,
            message: error.message,
            retryable: error.retryable,
            occurredAt: new Date(error.occurredAt),
          })),
        )
      }
    })

    const saved = await this.findById(parsed.id)
    if (!saved) {
      throw new Error(`Failed to persist pipeline run ${parsed.id}`)
    }
    return saved
  }

  private async loadRunGraph(run: typeof pipelineRuns.$inferSelect): Promise<PipelineRun> {
    const [steps, artifacts, sources, errors] = await Promise.all([
      this.db.select().from(pipelineSteps).where(eq(pipelineSteps.runId, run.id)),
      this.db.select().from(pipelineArtifacts).where(eq(pipelineArtifacts.runId, run.id)),
      this.db.select().from(pipelineSourceReferences).where(eq(pipelineSourceReferences.runId, run.id)),
      this.db.select().from(pipelineErrors).where(eq(pipelineErrors.runId, run.id)),
    ])

    return mapRunRow(run, steps, artifacts, sources, errors)
  }
}
